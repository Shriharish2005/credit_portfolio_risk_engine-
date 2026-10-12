"""
Expected Loss (EL) calculator.
Calculates individual and portfolio-level Expected Loss:
EL = PD * LGD * EAD
Portfolio EL = sum(PD * LGD * EAD)
"""

from typing import Dict, List, Optional, Union
import numpy as np
import pandas as pd


class ExpectedLossCalculator:
    """
    Core Expected Loss computation engine.
    Calculates expected loss and exposure-weighted portfolio metrics.
    """

    @staticmethod
    def calculate_single_el(pd: float, lgd: float, ead: float) -> float:
        """
        Calculate expected loss for a single exposure.
        EL = PD * LGD * EAD
        """
        pd_clean = max(0.0, min(1.0, float(pd)))
        lgd_clean = max(0.0, min(1.0, float(lgd)))
        ead_clean = max(0.0, float(ead))
        return float(pd_clean * lgd_clean * ead_clean)

    @staticmethod
    def calculate_portfolio_el(
        pd_array: Union[np.ndarray, List[float]],
        lgd_array: Union[np.ndarray, List[float]],
        ead_array: Union[np.ndarray, List[float]],
    ) -> Dict[str, float]:
        """
        Calculate portfolio expected loss and exposure-weighted metrics.
        Returns:
            total_ead: sum(EAD)
            total_expected_loss: sum(PD * LGD * EAD)
            weighted_pd: sum(PD * EAD) / sum(EAD)
            weighted_lgd: sum(LGD * EAD) / sum(EAD)
            el_rate: total_expected_loss / total_ead
            facility_count: number of loans
        """
        pd_v = np.clip(np.asarray(pd_array, dtype=float), 0.0, 1.0)
        lgd_v = np.clip(np.asarray(lgd_array, dtype=float), 0.0, 1.0)
        ead_v = np.maximum(np.asarray(ead_array, dtype=float), 0.0)

        total_ead = float(np.sum(ead_v))
        individual_el = pd_v * lgd_v * ead_v
        total_el = float(np.sum(individual_el))

        if total_ead > 0:
            weighted_pd = float(np.sum(pd_v * ead_v) / total_ead)
            weighted_lgd = float(np.sum(lgd_v * ead_v) / total_ead)
            el_rate = float(total_el / total_ead)
        else:
            weighted_pd = 0.0
            weighted_lgd = 0.0
            el_rate = 0.0

        return {
            "total_ead": total_ead,
            "total_expected_loss": total_el,
            "weighted_pd": weighted_pd,
            "weighted_lgd": weighted_lgd,
            "el_rate": el_rate,
            "facility_count": int(len(ead_v)),
        }

    @staticmethod
    def calculate_from_dataframe(df: pd.DataFrame) -> Dict[str, float]:
        """Convenience method to compute EL directly from a pandas DataFrame with pd, lgd, ead columns."""
        for col in ["pd", "lgd", "ead"]:
            if col not in df.columns:
                raise ValueError(f"DataFrame must contain column: {col}")
        return ExpectedLossCalculator.calculate_portfolio_el(
            df["pd"].values, df["lgd"].values, df["ead"].values
        )
