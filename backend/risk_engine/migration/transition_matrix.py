"""
Credit rating migration and transition matrix engine.
Supports empirical matrix estimation, multi-period transitions P(n) = P^n,
and upgrade/downgrade/default decomposition.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd


class CreditMigrationEngine:
    """
    Credit Rating Migration Transition Matrix Engine.
    Handles transition matrices, absorbing default states, matrix powers P^n,
    and migration analytics.
    """

    RATING_ORDER: List[str] = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "Default"]

    # Benchmark 1-Year Global Corporate Transition Matrix (S&P / Moody's historical benchmark)
    BENCHMARK_1Y_MATRIX: np.ndarray = np.array([
        # AAA      AA       A       BBB      BB       B       CCC    Default
        [0.8980, 0.0910, 0.0075, 0.0030, 0.0003, 0.0001, 0.0000, 0.0001],  # AAA
        [0.0060, 0.9020, 0.0820, 0.0070, 0.0018, 0.0007, 0.0002, 0.0003],  # AA
        [0.0005, 0.0210, 0.9100, 0.0590, 0.0065, 0.0018, 0.0002, 0.0010],  # A
        [0.0002, 0.0020, 0.0450, 0.8850, 0.0540, 0.0090, 0.0018, 0.0030],  # BBB
        [0.0001, 0.0005, 0.0040, 0.0620, 0.8350, 0.0780, 0.0104, 0.0100],  # BB
        [0.0000, 0.0001, 0.0012, 0.0045, 0.0650, 0.8250, 0.0662, 0.0380],  # B
        [0.0000, 0.0000, 0.0005, 0.0025, 0.0120, 0.1100, 0.6550, 0.2200],  # CCC
        [0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 1.0000],  # Default (Absorbing)
    ])

    def __init__(
        self,
        matrix: Optional[np.ndarray] = None,
        rating_labels: Optional[List[str]] = None,
    ):
        self.labels = rating_labels if rating_labels is not None else self.RATING_ORDER.copy()
        if matrix is not None:
            self.matrix = self._validate_and_normalize(matrix)
        else:
            self.matrix = self.BENCHMARK_1Y_MATRIX.copy()

    def _validate_and_normalize(self, mat: np.ndarray) -> np.ndarray:
        """Ensure rows sum to 1.0 and Default is strictly absorbing."""
        m = np.asarray(mat, dtype=float).copy()
        if m.shape[0] != m.shape[1]:
            raise ValueError(f"Transition matrix must be square, got shape {m.shape}")
        if m.shape[0] != len(self.labels):
            raise ValueError(f"Matrix dimension {m.shape[0]} does not match labels count {len(self.labels)}")

        # Clip negative probabilities
        m = np.maximum(m, 0.0)

        # Force absorbing state for last class (Default)
        m[-1, :] = 0.0
        m[-1, -1] = 1.0

        # Row normalization
        row_sums = m.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1.0
        m = m / row_sums
        return m

    def multi_period_matrix(self, n_periods: int) -> np.ndarray:
        """Compute P(n) = P^n using matrix exponentiation."""
        if n_periods < 1:
            raise ValueError("n_periods must be at least 1")
        return np.linalg.matrix_power(self.matrix, n_periods)

    def analyze_migrations(self, n_periods: int = 1) -> Dict[str, Union[float, List[Dict]]]:
        """
        Decompose matrix into upgrade probability, downgrade probability,
        unchanged probability, and default probability for each starting rating.
        """
        mat = self.multi_period_matrix(n_periods) if n_periods > 1 else self.matrix
        n = len(self.labels)
        analysis_by_rating = []

        total_upgrades = 0.0
        total_downgrades = 0.0
        total_unchanged = 0.0
        total_defaults = 0.0

        for i, start_rating in enumerate(self.labels):
            if start_rating == "Default":
                analysis_by_rating.append({
                    "rating": start_rating,
                    "unchanged": 1.0,
                    "upgrade": 0.0,
                    "downgrade": 0.0,
                    "default_prob": 1.0
                })
                continue

            # Upgrades: moving to higher creditworthiness (lower index i)
            upgrade_prob = float(np.sum(mat[i, :i])) if i > 0 else 0.0
            # Unchanged: staying on diagonal
            unchanged_prob = float(mat[i, i])
            # Downgrades: moving to lower creditworthiness (higher index, excluding terminal default)
            downgrade_prob = float(np.sum(mat[i, i+1:-1])) if i < n - 2 else 0.0
            # Default probability: transition into terminal Default (last column)
            def_prob = float(mat[i, -1])

            total_upgrades += upgrade_prob
            total_downgrades += downgrade_prob
            total_unchanged += unchanged_prob
            total_defaults += def_prob

            analysis_by_rating.append({
                "rating": start_rating,
                "unchanged": round(unchanged_prob, 5),
                "upgrade": round(upgrade_prob, 5),
                "downgrade": round(downgrade_prob, 5),
                "default_prob": round(def_prob, 5),
            })

        non_def_count = max(1, n - 1)
        return {
            "periods": n_periods,
            "ratings": self.labels,
            "transition_matrix": mat.round(5).tolist(),
            "rating_analysis": analysis_by_rating,
            "overall_avg_upgrade": round(total_upgrades / non_def_count, 5),
            "overall_avg_downgrade": round(total_downgrades / non_def_count, 5),
            "overall_avg_unchanged": round(total_unchanged / non_def_count, 5),
            "overall_avg_default": round(total_defaults / non_def_count, 5),
        }

    @classmethod
    def estimate_from_transitions(
        cls,
        history_df: pd.DataFrame,
        from_col: str = "initial_rating",
        to_col: str = "final_rating",
    ) -> "CreditMigrationEngine":
        """
        Estimate empirical cohort transition matrix from historical migration records.
        """
        ratings = cls.RATING_ORDER.copy()
        n = len(ratings)
        idx_map = {r: i for i, r in enumerate(ratings)}

        counts = np.zeros((n, n), dtype=float)

        for _, row in history_df.iterrows():
            f = str(row[from_col]).strip().upper()
            t = str(row[to_col]).strip().upper()
            if f in idx_map and t in idx_map:
                counts[idx_map[f], idx_map[t]] += 1.0

        # Laplace smoothing (small prior) to avoid zero-division for sparse transitions
        counts += 1e-4

        # Absorbing state for Default
        counts[-1, :] = 0.0
        counts[-1, -1] = 1.0

        row_sums = counts.sum(axis=1, keepdims=True)
        row_sums[row_sums == 0] = 1.0
        prob_matrix = counts / row_sums

        return cls(matrix=prob_matrix, rating_labels=ratings)
