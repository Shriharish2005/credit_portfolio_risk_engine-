"""
Monte Carlo Credit Portfolio Loss Simulation Engine.
Implements one-factor Gaussian Copula (Vasicek / Merton framework)
with correlated defaults, systematic macro factors, Credit VaR, and Expected Shortfall.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from scipy.stats import norm


class MonteCarloSimulationEngine:
    """
    Simulates portfolio credit losses using a Gaussian Copula latent factor model:
    Y_i = sqrt(rho_i) * Z + sqrt(1 - rho_i) * epsilon_i
    where:
      Z ~ N(0, 1) is the systematic market/economic shock.
      epsilon_i ~ N(0, 1) is the obligor-specific idiosyncratic shock.
      rho_i is asset correlation (typically 0.12 - 0.24 per Basel corporate/retail rules).
    Obligor i defaults if Y_i < Phi^-1(PD_i).
    """

    def __init__(self, random_seed: Optional[int] = 42):
        self.random_seed = random_seed

    def run_simulation(
        self,
        pd_array: np.ndarray,
        lgd_array: np.ndarray,
        ead_array: np.ndarray,
        n_simulations: int = 10000,
        asset_correlation: float = 0.18,
        stochastic_lgd: bool = False,
        confidence_levels: Optional[List[float]] = None,
        n_bins: int = 40,
    ) -> Dict[str, Union[float, int, List[float], Dict[str, float], List[Dict]]]:
        """
        Executes Monte Carlo credit loss simulation.
        Fully vectorized with NumPy for maximum performance.
        """
        if confidence_levels is None:
            confidence_levels = [0.90, 0.95, 0.99, 0.999]

        rng = np.random.default_rng(self.random_seed)

        pd_vec = np.clip(np.asarray(pd_array, dtype=float), 1e-6, 1.0 - 1e-6)
        lgd_vec = np.clip(np.asarray(lgd_array, dtype=float), 0.0, 1.0)
        ead_vec = np.maximum(np.asarray(ead_array, dtype=float), 0.0)

        n_assets = len(pd_vec)
        if n_assets == 0 or np.sum(ead_vec) == 0:
            return self._empty_result(confidence_levels)

        # Vasicek default thresholds
        thresholds = norm.ppf(pd_vec)  # Shape: (n_assets,)

        # Correlation weights
        rho = max(0.01, min(0.95, asset_correlation))
        sqrt_rho = np.sqrt(rho)
        sqrt_one_minus_rho = np.sqrt(1.0 - rho)

        # Batch processing to optimize memory footprint if n_assets * n_simulations is large
        batch_size = min(n_simulations, 2000)
        n_batches = int(np.ceil(n_simulations / batch_size))

        portfolio_losses = np.empty(n_simulations, dtype=np.float64)
        total_defaults = np.empty(n_simulations, dtype=np.int32)
        total_loss_per_asset = np.zeros(n_assets, dtype=np.float64)

        loss_given_default = lgd_vec * ead_vec  # Shape: (n_assets,)

        curr_idx = 0
        for b in range(n_batches):
            actual_batch_size = min(batch_size, n_simulations - curr_idx)
            if actual_batch_size <= 0:
                break

            # Systematic factor Z: Shape (actual_batch_size, 1)
            z = rng.standard_normal((actual_batch_size, 1))

            # Idiosyncratic factor epsilon: Shape (actual_batch_size, n_assets)
            eps = rng.standard_normal((actual_batch_size, n_assets))

            # Latent returns: Shape (actual_batch_size, n_assets)
            y = sqrt_rho * z + sqrt_one_minus_rho * eps

            # Default indicator: default occurred if latent return < threshold
            default_matrix = (y < thresholds)  # boolean shape (actual_batch_size, n_assets)

            if stochastic_lgd:
                # Modulate LGD with systematic factor: during bad Z (Z < 0), LGD increases
                stressed_lgd = np.clip(lgd_vec * (1.0 - 0.20 * z), 0.05, 1.0)
                batch_losses = np.sum(default_matrix * (stressed_lgd * ead_vec), axis=1)
            else:
                batch_losses = np.dot(default_matrix, loss_given_default)

            portfolio_losses[curr_idx : curr_idx + actual_batch_size] = batch_losses
            total_defaults[curr_idx : curr_idx + actual_batch_size] = np.sum(default_matrix, axis=1)
            total_loss_per_asset += np.sum(default_matrix * loss_given_default, axis=0)

            curr_idx += actual_batch_size

        # Summary statistics
        mean_loss = float(np.mean(portfolio_losses))
        std_loss = float(np.std(portfolio_losses))
        min_loss = float(np.min(portfolio_losses))
        max_loss = float(np.max(portfolio_losses))
        total_ead = float(np.sum(ead_vec))

        # Value at Risk (VaR) and Expected Shortfall (ES / CVaR)
        sorted_losses = np.sort(portfolio_losses)
        var_dict: Dict[str, float] = {}
        es_dict: Dict[str, float] = {}

        for alpha in confidence_levels:
            idx = int(np.floor(alpha * (n_simulations - 1)))
            var_val = float(sorted_losses[idx])
            var_dict[f"{int(alpha * 100)}%"] = var_val

            # Expected Shortfall: average loss beyond VaR
            tail_losses = sorted_losses[idx:]
            es_val = float(np.mean(tail_losses)) if len(tail_losses) > 0 else var_val
            es_dict[f"{int(alpha * 100)}%"] = es_val

        # Loss distribution histogram for Apache ECharts
        hist_counts, bin_edges = np.histogram(portfolio_losses, bins=n_bins)
        distribution = []
        for i in range(len(hist_counts)):
            distribution.append({
                "bin_start": round(float(bin_edges[i]), 2),
                "bin_end": round(float(bin_edges[i + 1]), 2),
                "frequency": int(hist_counts[i]),
                "probability": round(float(hist_counts[i] / n_simulations), 5),
            })

        percentile_targets = [50, 75, 90, 95, 99, 99.5, 99.9]
        percentiles = {
            f"p{p}": round(float(np.percentile(portfolio_losses, p)), 2)
            for p in percentile_targets
        }

        # Unexpected Loss (UL) at 99%
        ul_99 = max(0.0, var_dict.get("99%", 0.0) - mean_loss)

        return {
            "n_simulations": n_simulations,
            "random_seed": self.random_seed,
            "total_ead": round(total_ead, 2),
            "mean_loss": round(mean_loss, 2),
            "std_loss": round(std_loss, 2),
            "min_loss": round(min_loss, 2),
            "max_loss": round(max_loss, 2),
            "expected_loss_pct": round(mean_loss / total_ead * 100.0, 4) if total_ead > 0 else 0.0,
            "var_95": round(var_dict.get("95%", 0.0), 2),
            "var_99": round(var_dict.get("99%", 0.0), 2),
            "es_95": round(es_dict.get("95%", 0.0), 2),
            "es_99": round(es_dict.get("99%", 0.0), 2),
            "unexpected_loss_99": round(ul_99, 2),
            "var_metrics": {k: round(v, 2) for k, v in var_dict.items()},
            "es_metrics": {k: round(v, 2) for k, v in es_dict.items()},
            "percentiles": percentiles,
            "distribution": distribution,
            "mean_defaults_count": round(float(np.mean(total_defaults)), 1),
        }

    def _empty_result(self, confidence_levels: List[float]) -> Dict:
        return {
            "n_simulations": 0,
            "random_seed": self.random_seed,
            "total_ead": 0.0,
            "mean_loss": 0.0,
            "std_loss": 0.0,
            "min_loss": 0.0,
            "max_loss": 0.0,
            "expected_loss_pct": 0.0,
            "var_95": 0.0,
            "var_99": 0.0,
            "es_95": 0.0,
            "es_99": 0.0,
            "unexpected_loss_99": 0.0,
            "var_metrics": {f"{int(c*100)}%": 0.0 for c in confidence_levels},
            "es_metrics": {f"{int(c*100)}%": 0.0 for c in confidence_levels},
            "percentiles": {},
            "distribution": [],
            "mean_defaults_count": 0.0,
        }
