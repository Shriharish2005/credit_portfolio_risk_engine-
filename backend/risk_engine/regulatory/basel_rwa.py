"""
Regulatory Capital & Basel Framework Risk-Weighted Assets (RWA)
==============================================================
Implements Basel II / III / IV Internal Ratings-Based (IRB) formula
for wholesale / corporate exposures.

Formulas:
---------
Asset Correlation R:
    R = 0.12 * (1 - exp(-50*PD)) / (1 - exp(-50)) + 0.24 * [1 - (1 - exp(-50*PD)) / (1 - exp(-50))]
    (For SME firm-size adjustments or large financial institutions, multipliers apply).

Maturity Adjustment Factor b:
    b = (0.11852 - 0.05478 * ln(PD))^2

Capital Requirement K (Pillar 1 IRB):
    K = [ LGD * Phi( (Phi^-1(PD) + sqrt(R) * Phi^-1(0.999)) / sqrt(1 - R) ) - (PD * LGD) ]
        * [ (1 + (M - 2.5) * b) / (1 - 1.5 * b) ]

Risk-Weighted Assets (RWA):
    RWA = K * 12.5 * EAD

Minimum Regulatory Capital (Pillar 1):
    Min_Capital = 0.08 * RWA
"""

from typing import Dict, List, Union
import numpy as np
from scipy.stats import norm


class BaselCapitalEngine:
    """
    Basel III / IV IRB Risk-Weighted Asset (RWA) and Capital Engine.
    """

    def __init__(self, target_car: float = 0.08, capital_conservation_buffer: float = 0.025):
        self.target_car = target_car  # Standard 8% Basel minimum Pillar 1
        self.ccb = capital_conservation_buffer  # 2.5% Capital Conservation Buffer
        self.total_target_ratio = self.target_car + self.ccb  # 10.5% total

    def calculate_asset_correlation(self, pd: Union[float, np.ndarray]) -> Union[float, np.ndarray]:
        """
        Basel Corporate asset correlation R(PD) between 12% and 24%.
        R = 0.12 * (1 - e^(-50*PD))/(1 - e^(-50)) + 0.24 * [1 - (1 - e^(-50*PD))/(1 - e^(-50))]
        """
        pd_clipped = np.clip(pd, 0.0003, 0.9999)  # Basel minimum PD floor: 3 bps
        exp_factor = (1.0 - np.exp(-50.0 * pd_clipped)) / (1.0 - np.exp(-50.0))
        r = 0.12 * exp_factor + 0.24 * (1.0 - exp_factor)
        return r

    def calculate_maturity_adjustment(self, pd: Union[float, np.ndarray], maturity_years: Union[float, np.ndarray] = 2.5) -> Union[float, np.ndarray]:
        """
        Maturity adjustment factor b(PD):
        b = (0.11852 - 0.05478 * ln(PD))^2
        Multiplier = (1 + (M - 2.5) * b) / (1 - 1.5 * b)
        """
        pd_clipped = np.clip(pd, 0.0003, 0.9999)
        m = np.clip(maturity_years, 1.0, 5.0)  # Basel standard bounds 1 to 5 years
        b = np.square(0.11852 - 0.05478 * np.log(pd_clipped))
        mult = (1.0 + (m - 2.5) * b) / (1.0 - 1.5 * b)
        return mult

    def calculate_capital_requirement_k(
        self,
        pd: Union[float, np.ndarray],
        lgd: Union[float, np.ndarray],
        maturity_years: Union[float, np.ndarray] = 2.5,
    ) -> Union[float, np.ndarray]:
        """
        Computes Pillar 1 capital requirement K (fraction of EAD).
        """
        pd_c = np.clip(pd, 0.0003, 0.9999)
        lgd_c = np.clip(lgd, 0.0, 1.0)
        r = self.calculate_asset_correlation(pd_c)
        m_adj = self.calculate_maturity_adjustment(pd_c, maturity_years)

        # Vasicek 99.9% conditional default probability
        norm_inv_pd = norm.ppf(pd_c)
        norm_inv_999 = norm.ppf(0.999)
        conditional_pd = norm.cdf((norm_inv_pd + np.sqrt(r) * norm_inv_999) / np.sqrt(1.0 - r))

        # Unexpected loss capital factor
        k_pre = lgd_c * conditional_pd - (pd_c * lgd_c)
        k = np.maximum(0.0, k_pre) * m_adj
        return k

    def calculate_facility_rwa(
        self,
        pd: float,
        lgd: float,
        ead: float,
        maturity_years: float = 2.5,
    ) -> Dict[str, float]:
        """
        Calculates RWA and regulatory capital for an individual credit facility.
        """
        k = float(self.calculate_capital_requirement_k(pd, lgd, maturity_years))
        rwa = k * 12.5 * ead
        min_capital = rwa * self.target_car
        total_buffer_capital = rwa * self.total_target_ratio
        rwa_density = (rwa / ead) if ead > 0 else 0.0

        return {
            "pd": float(pd),
            "lgd": float(lgd),
            "ead": float(ead),
            "maturity_years": float(maturity_years),
            "capital_factor_k": round(k, 6),
            "rwa": round(rwa, 2),
            "rwa_density_pct": round(rwa_density * 100, 2),
            "min_capital_8pct": round(min_capital, 2),
            "total_capital_with_ccb": round(total_buffer_capital, 2),
        }

    def calculate_portfolio_rwa(
        self,
        pds: np.ndarray,
        lgds: np.ndarray,
        eads: np.ndarray,
        maturities: np.ndarray = None,
    ) -> Dict[str, float]:
        """
        Vectorized portfolio-wide RWA and Basel Capital aggregation.
        """
        n = len(pds)
        if maturities is None:
            maturities = np.full(n, 2.5)

        k_vec = self.calculate_capital_requirement_k(pds, lgds, maturities)
        rwa_vec = k_vec * 12.5 * eads
        total_ead = float(np.sum(eads))
        total_rwa = float(np.sum(rwa_vec))

        rwa_density = (total_rwa / total_ead) if total_ead > 0 else 0.0
        min_cap = total_rwa * self.target_car
        total_cap = total_rwa * self.total_target_ratio

        return {
            "total_ead": round(total_ead, 2),
            "total_rwa": round(total_rwa, 2),
            "average_k": round(float(np.mean(k_vec)), 6),
            "rwa_density_pct": round(rwa_density * 100, 2),
            "pillar_1_minimum_capital": round(min_cap, 2),
            "capital_conservation_buffer": round(total_rwa * self.ccb, 2),
            "total_regulatory_capital": round(total_cap, 2),
            "tier_1_requirement_6pct": round(total_rwa * 0.06, 2),
            "cet1_requirement_4_5pct": round(total_rwa * 0.045, 2),
        }
