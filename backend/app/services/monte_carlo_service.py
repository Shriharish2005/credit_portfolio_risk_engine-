"""
Monte Carlo Simulation Service.
Coordinates vectorized loss simulation runs, run ID persistence, and caching.
"""

import time
import uuid
from typing import Dict, Optional
from backend.app.core.cache import cache
from backend.app.core.logging import logger
from backend.app.core.metrics import MONTE_CARLO_SIMULATION_DURATION_SECONDS
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.app.db.repositories.simulation_repo import SimulationRepository
from backend.risk_engine.monte_carlo.simulation import MonteCarloSimulationEngine


class MonteCarloService:

    def __init__(
        self,
        loan_repo: Optional[LoanRepository] = None,
        sim_repo: Optional[SimulationRepository] = None,
    ):
        self.loan_repo = loan_repo or LoanRepository()
        self.sim_repo = sim_repo or SimulationRepository()

    def run_simulation(
        self,
        n_simulations: int = 10000,
        random_seed: int = 42,
        asset_correlation: float = 0.18,
        stochastic_lgd: bool = False,
        sample_size: Optional[int] = 5000,
    ) -> Dict:
        """
        Executes reproducible Monte Carlo simulation over the loan portfolio.
        For snappy response times on 50,000 loans, samples 5,000 representative loans
        and scales results to the total portfolio exposure.
        """
        start_t = time.time()
        df = self.loan_repo.get_portfolio_dataframe()

        if df.empty:
            empty_engine = MonteCarloSimulationEngine(random_seed=random_seed)
            res = empty_engine._empty_result([0.90, 0.95, 0.99, 0.999])
            res["run_id"] = str(uuid.uuid4())
            res["execution_time_seconds"] = 0.0
            return res

        total_portfolio_ead = float(df["ead"].sum())

        if sample_size and len(df) > sample_size:
            # Stratified representative sample across ratings
            sampled_df = df.groupby("credit_rating", group_keys=False).apply(
                lambda x: x.sample(frac=min(1.0, sample_size / len(df)), random_state=random_seed),
                include_groups=False
            )
            sample_ead = float(sampled_df["ead"].sum())
            scale_factor = total_portfolio_ead / sample_ead if sample_ead > 0 else 1.0
            pd_vec = sampled_df["pd"].values
            lgd_vec = sampled_df["lgd"].values
            ead_vec = sampled_df["ead"].values
        else:
            scale_factor = 1.0
            pd_vec = df["pd"].values
            lgd_vec = df["lgd"].values
            ead_vec = df["ead"].values

        engine = MonteCarloSimulationEngine(random_seed=random_seed)
        sim_results = engine.run_simulation(
            pd_array=pd_vec,
            lgd_array=lgd_vec,
            ead_array=ead_vec,
            n_simulations=n_simulations,
            asset_correlation=asset_correlation,
            stochastic_lgd=stochastic_lgd,
        )

        # Scale loss metrics if representative sampling was utilized
        if scale_factor != 1.0:
            sim_results["total_ead"] = round(total_portfolio_ead, 2)
            sim_results["mean_loss"] = round(sim_results["mean_loss"] * scale_factor, 2)
            sim_results["std_loss"] = round(sim_results["std_loss"] * scale_factor, 2)
            sim_results["min_loss"] = round(sim_results["min_loss"] * scale_factor, 2)
            sim_results["max_loss"] = round(sim_results["max_loss"] * scale_factor, 2)
            sim_results["var_95"] = round(sim_results["var_95"] * scale_factor, 2)
            sim_results["var_99"] = round(sim_results["var_99"] * scale_factor, 2)
            sim_results["es_95"] = round(sim_results["es_95"] * scale_factor, 2)
            sim_results["es_99"] = round(sim_results["es_99"] * scale_factor, 2)
            sim_results["unexpected_loss_99"] = round(sim_results["unexpected_loss_99"] * scale_factor, 2)
            sim_results["var_metrics"] = {k: round(v * scale_factor, 2) for k, v in sim_results["var_metrics"].items()}
            sim_results["es_metrics"] = {k: round(v * scale_factor, 2) for k, v in sim_results["es_metrics"].items()}
            sim_results["percentiles"] = {k: round(v * scale_factor, 2) for k, v in sim_results["percentiles"].items()}
            for item in sim_results["distribution"]:
                item["bin_start"] = round(item["bin_start"] * scale_factor, 2)
                item["bin_end"] = round(item["bin_end"] * scale_factor, 2)

        exec_time = round(time.time() - start_t, 3)
        sim_results["execution_time_seconds"] = exec_time
        run_id = f"mc-{uuid.uuid4().hex[:12]}"
        sim_results["run_id"] = run_id

        # Observe prometheus histogram
        MONTE_CARLO_SIMULATION_DURATION_SECONDS.labels(
            n_simulations=str(n_simulations)
        ).observe(exec_time)

        # Persist run
        self.sim_repo.save_run(sim_results)

        # Cache default run for fast dashboard display
        cache.set("monte_carlo:latest", sim_results, ttl_seconds=1800)

        logger.info(f"Monte Carlo simulation {run_id} completed: {n_simulations} runs in {exec_time}s")
        return sim_results

    def get_run_by_id(self, run_id: str) -> Optional[Dict]:
        """Fetch historical simulation run results."""
        return self.sim_repo.get_run(run_id)

    def get_latest_or_default_run(self) -> Dict:
        """Fetch cached latest run or generate fresh 10,000 run."""
        cached = cache.get("monte_carlo:latest")
        if cached:
            return cached
        return self.run_simulation(n_simulations=10000, random_seed=42)
