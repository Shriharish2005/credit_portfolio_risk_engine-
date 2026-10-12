"""
Rating-based Probability of Default (PD) mapping and TTC/PIT adjustments.
"""

from typing import Dict, List, Optional
import numpy as np


class RatingPDMapper:
    """
    Standard credit rating scale mapping to annualized 1-year Through-The-Cycle (TTC) PDs.
    Scale includes: AAA, AA, A, BBB, BB, B, CCC, Default
    """

    DEFAULT_RATING_SCALE: Dict[str, float] = {
        "AAA": 0.0003,  # 0.03%
        "AA": 0.0010,   # 0.10%
        "A": 0.0035,    # 0.35%
        "BBB": 0.0120,  # 1.20%
        "BB": 0.0380,   # 3.80%
        "B": 0.0950,    # 9.50%
        "CCC": 0.2400,  # 24.00%
        "DEFAULT": 1.0  # 100.00%
    }

    RATING_ORDER: List[str] = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "DEFAULT"]

    def __init__(self, custom_scale: Optional[Dict[str, float]] = None):
        if custom_scale is not None:
            self.scale = {k.strip().upper(): v for k, v in custom_scale.items()}
        else:
            self.scale = self.DEFAULT_RATING_SCALE.copy()
        # Verify valid bounds [0, 1]
        for rating, pd_val in self.scale.items():
            if not 0.0 <= pd_val <= 1.0:
                raise ValueError(f"PD for rating {rating} must be in [0, 1], got {pd_val}")

    def get_pd(self, rating: str) -> float:
        """Return 1-year annualized PD for a given credit rating."""
        cleaned = rating.strip().upper()
        if cleaned in self.scale:
            return float(self.scale[cleaned])
        if cleaned in ["D", "DF", "DEF"]:
            return float(self.scale["DEFAULT"])
        raise KeyError(f"Unknown credit rating: {rating}. Valid ratings: {list(self.scale.keys())}")

    def ttc_to_pit(self, ttc_pd: float, macro_factor: float, sensitivity: float = 0.5) -> float:
        """
        Adjust Through-The-Cycle (TTC) PD to Point-In-Time (PIT) PD based on a macroeconomic factor Z.
        Uses the Vasicek conditional default probability formulation:
        PIT_PD = Phi((Phi^-1(TTC_PD) - sqrt(rho) * Z) / sqrt(1 - rho))
        where Z is systematic macro factor (Z > 0 is good economy, Z < 0 is stress).
        """
        if ttc_pd <= 0.0:
            return 0.0
        if ttc_pd >= 1.0:
            return 1.0

        from scipy.stats import norm
        rho = max(0.01, min(0.99, sensitivity))
        threshold = norm.ppf(ttc_pd)
        # In Vasicek formula, negative macro factor implies recession -> shifts threshold up
        pit_norm = (threshold - np.sqrt(rho) * macro_factor) / np.sqrt(1.0 - rho)
        pit_pd = float(norm.cdf(pit_norm))
        return float(np.clip(pit_pd, 0.0001, 0.9999))
