"""
Simulation and Risk Results Repository.
"""

from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from backend.app.db.models.risk import SimulationRun, SimulationResult


class SimulationRepository:
    _in_memory_runs: Dict[str, Dict] = {}

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def save_run(self, run_data: Dict) -> str:
        run_id = run_data["run_id"]
        self._in_memory_runs[run_id] = run_data

        if self.db:
            try:
                run_obj = SimulationRun(
                    run_id=run_id,
                    run_type=run_data.get("run_type", "MONTE_CARLO"),
                    status="COMPLETED",
                    n_simulations=run_data.get("n_simulations", 10000),
                    random_seed=run_data.get("random_seed", 42),
                    portfolio_total_ead=run_data.get("total_ead", 0.0),
                    mean_loss=run_data.get("mean_loss", 0.0),
                    std_loss=run_data.get("std_loss", 0.0),
                    var_95=run_data.get("var_95", 0.0),
                    var_99=run_data.get("var_99", 0.0),
                    es_95=run_data.get("es_95", 0.0),
                    es_99=run_data.get("es_99", 0.0),
                    unexpected_loss_99=run_data.get("unexpected_loss_99", 0.0),
                    execution_time_seconds=run_data.get("execution_time_seconds", 0.0),
                )
                self.db.merge(run_obj)

                result_obj = SimulationResult(
                    run_id=run_id,
                    metrics_json=run_data,
                )
                self.db.add(result_obj)
                self.db.commit()
            except Exception:
                self.db.rollback()

        return run_id

    def get_run(self, run_id: str) -> Optional[Dict]:
        if run_id in self._in_memory_runs:
            return self._in_memory_runs[run_id]

        if self.db:
            res = self.db.query(SimulationResult).filter(SimulationResult.run_id == run_id).first()
            if res:
                return res.metrics_json
        return None
