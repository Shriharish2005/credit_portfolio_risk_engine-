"""
Concentration risk analysis engine.
Calculates Herfindahl-Hirschman Index (HHI), Top-N concentration ratios,
Gini concentration index, and breakdowns by obligor, sector, and geography.
"""

from typing import Dict, List, Optional, Union
import numpy as np
import pandas as pd


class ConcentrationEngine:
    """
    Computes portfolio concentration metrics:
    - Herfindahl-Hirschman Index: HHI = sum(s_i^2)
    - Effective Number of Counterparties: N_eff = 1 / HHI
    - Top-N Obligor Concentration Ratios (Top 5, Top 10, Top 20)
    - Gini Coefficient of Exposure Distribution
    - Sector & Geographic Concentration Breakdown
    """

    @staticmethod
    def calculate_hhi(shares: Union[np.ndarray, List[float]]) -> float:
        """
        Calculate HHI from portfolio shares s_i in [0, 1] where sum(s_i) == 1.
        Returns HHI bounded in [0.0, 1.0].
        (Multiply by 10,000 for standard DOJ basis-point index).
        """
        arr = np.asarray(shares, dtype=float)
        total = np.sum(arr)
        if total <= 0:
            return 0.0
        normalized_shares = arr / total
        return float(np.sum(normalized_shares ** 2))

    @staticmethod
    def calculate_gini(exposures: Union[np.ndarray, List[float]]) -> float:
        """
        Calculate Gini coefficient of inequality for credit exposures.
        0 = perfectly equal exposure distribution, 1 = maximum single borrower concentration.
        """
        arr = np.sort(np.maximum(np.asarray(exposures, dtype=float), 0.0))
        n = len(arr)
        if n == 0 or np.sum(arr) == 0:
            return 0.0
        cum_arr = np.cumsum(arr)
        sum_arr = cum_arr[-1]
        gini = (2.0 * np.sum((np.arange(1, n + 1)) * arr) / (n * sum_arr)) - (n + 1.0) / n
        return float(np.clip(gini, 0.0, 1.0))

    @classmethod
    def analyze_portfolio_concentration(
        cls,
        df: pd.DataFrame,
        borrower_col: str = "borrower_id",
        exposure_col: str = "ead",
        sector_col: str = "sector",
        geography_col: str = "geography",
    ) -> Dict[str, Union[float, int, List[Dict], Dict[str, float]]]:
        """
        Full portfolio concentration audit across obligor, industry, and geography dimensions.
        """
        if df.empty:
            return {
                "total_exposure": 0.0,
                "obligor_count": 0,
                "hhi_borrower": 0.0,
                "hhi_borrower_bps": 0.0,
                "effective_obligors": 0.0,
                "gini_coefficient": 0.0,
                "top_5_share": 0.0,
                "top_10_share": 0.0,
                "top_20_share": 0.0,
                "hhi_sector": 0.0,
                "hhi_sector_bps": 0.0,
                "hhi_geography": 0.0,
                "hhi_geography_bps": 0.0,
                "sector_breakdown": [],
                "geography_breakdown": [],
                "top_borrowers": [],
            }

        # Aggregate by borrower
        borrower_exp = df.groupby(borrower_col)[exposure_col].sum()
        total_exp = float(borrower_exp.sum())
        if total_exp <= 0:
            total_exp = 1e-8

        # Obligor HHI
        b_shares = (borrower_exp / total_exp).values
        hhi_borrower = cls.calculate_hhi(b_shares)
        n_eff = float(1.0 / hhi_borrower) if hhi_borrower > 0 else 0.0
        gini = cls.calculate_gini(borrower_exp.values)

        # Top N borrowers
        sorted_borrowers = borrower_exp.sort_values(ascending=False)
        top_5_share = float(sorted_borrowers.iloc[:5].sum() / total_exp) if len(sorted_borrowers) >= 1 else 0.0
        top_10_share = float(sorted_borrowers.iloc[:10].sum() / total_exp) if len(sorted_borrowers) >= 1 else 0.0
        top_20_share = float(sorted_borrowers.iloc[:20].sum() / total_exp) if len(sorted_borrowers) >= 1 else 0.0

        top_borrowers_list = []
        for b_id, exp in sorted_borrowers.iloc[:10].items():
            top_borrowers_list.append({
                "borrower_id": str(b_id),
                "exposure": float(exp),
                "share": float(exp / total_exp),
            })

        # Sector breakdown & HHI
        sector_breakdown = []
        hhi_sector = 0.0
        if sector_col in df.columns:
            sec_grp = df.groupby(sector_col)[exposure_col].sum()
            sec_shares = (sec_grp / total_exp).values
            hhi_sector = cls.calculate_hhi(sec_shares)
            for s_name, exp in sec_grp.sort_values(ascending=False).items():
                sector_breakdown.append({
                    "sector": str(s_name),
                    "exposure": round(float(exp), 2),
                    "share": round(float(exp / total_exp), 4),
                })

        # Geography breakdown & HHI
        geo_breakdown = []
        hhi_geo = 0.0
        if geography_col in df.columns:
            geo_grp = df.groupby(geography_col)[exposure_col].sum()
            geo_shares = (geo_grp / total_exp).values
            hhi_geo = cls.calculate_hhi(geo_shares)
            for g_name, exp in geo_grp.sort_values(ascending=False).items():
                geo_breakdown.append({
                    "geography": str(g_name),
                    "exposure": round(float(exp), 2),
                    "share": round(float(exp / total_exp), 4),
                })

        return {
            "total_exposure": round(total_exp, 2),
            "obligor_count": int(len(borrower_exp)),
            "hhi_borrower": round(hhi_borrower, 6),
            "hhi_borrower_bps": round(hhi_borrower * 10000.0, 2),
            "effective_obligors": round(n_eff, 1),
            "gini_coefficient": round(gini, 4),
            "top_5_share": round(top_5_share, 4),
            "top_10_share": round(top_10_share, 4),
            "top_20_share": round(top_20_share, 4),
            "hhi_sector": round(hhi_sector, 6),
            "hhi_sector_bps": round(hhi_sector * 10000.0, 2),
            "hhi_geography": round(hhi_geo, 6),
            "hhi_geography_bps": round(hhi_geo * 10000.0, 2),
            "sector_breakdown": sector_breakdown,
            "geography_breakdown": geo_breakdown,
            "top_borrowers": top_borrowers_list,
        }
