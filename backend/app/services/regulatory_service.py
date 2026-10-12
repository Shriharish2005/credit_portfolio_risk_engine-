"""
Regulatory Capital and IFRS 9 Service Layer
===========================================
Orchestrates Basel III/IV IRB RWA metrics and IFRS 9 multi-stage impairment.
"""

import os
from typing import Dict, Optional
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.app.core.cache import cache
from backend.risk_engine.regulatory.basel_rwa import BaselCapitalEngine
from backend.risk_engine.regulatory.ifrs9_staging import IFRS9StagingEngine


class RegulatoryService:
    """
    Coordinates regulatory capital calculations and IFRS 9 staging analytics.
    """

    def __init__(self):
        self.basel_engine = BaselCapitalEngine()
        self.ifrs9_engine = IFRS9StagingEngine()

    def _load_loans_dataframe(self, max_rows: Optional[int] = None) -> pd.DataFrame:
        """Helper to load loan dataset efficiently."""
        parquet_p = os.path.join(settings.DATA_DIR, "processed", "loans.parquet")
        csv_p = os.path.join(settings.DATA_DIR, "synthetic", "loans.csv")
        p = parquet_p if os.path.exists(parquet_p) else csv_p

        if not os.path.exists(p):
            # Create a small synthetic dataframe fallback
            return pd.DataFrame({
                "loan_id": [f"LN-{i:05d}" for i in range(100)],
                "borrower_id": [f"BW-{i:04d}" for i in range(100)],
                "credit_rating": ["BBB"] * 100,
                "origination_rating": ["BBB"] * 100,
                "pd": [0.02] * 100,
                "origination_pd": [0.018] * 100,
                "lgd": [0.40] * 100,
                "ead": [500000.0] * 100,
                "days_past_due": [0] * 100,
                "tenor_years": [3.0] * 100,
            })

        if p.endswith(".parquet"):
            df = pd.read_parquet(p)
        else:
            df = pd.read_csv(p)

        if max_rows and len(df) > max_rows:
            df = df.sample(n=max_rows, random_state=42)

        return df

    def get_basel_capital_analysis(self, max_sample: int = 50000) -> Dict:
        """
        Calculates Basel III / IV IRB Risk-Weighted Assets and capital buffers over full portfolio.
        """
        cache_key = f"regulatory:basel_rwa:{max_sample}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        df = self._load_loans_dataframe(max_rows=max_sample if max_sample < 50000 else None)

        pds = df["pd"].to_numpy(dtype=float)
        lgds = df["lgd"].to_numpy(dtype=float)
        eads = df["ead"].to_numpy(dtype=float)

        res = self.basel_engine.calculate_portfolio_rwa(pds=pds, lgds=lgds, eads=eads)

        # Scale up only if explicitly sampled with a smaller sample size
        total_portfolio_size = 50000
        sample_ratio = total_portfolio_size / len(df) if len(df) < total_portfolio_size else 1.0

        if sample_ratio > 1.05:
            res["total_ead"] = round(res["total_ead"] * sample_ratio, 2)
            res["total_rwa"] = round(res["total_rwa"] * sample_ratio, 2)
            res["pillar_1_minimum_capital"] = round(res["pillar_1_minimum_capital"] * sample_ratio, 2)
            res["capital_conservation_buffer"] = round(res["capital_conservation_buffer"] * sample_ratio, 2)
            res["total_regulatory_capital"] = round(res["total_regulatory_capital"] * sample_ratio, 2)
            res["tier_1_requirement_6pct"] = round(res["tier_1_requirement_6pct"] * sample_ratio, 2)
            res["cet1_requirement_4_5pct"] = round(res["cet1_requirement_4_5pct"] * sample_ratio, 2)

        # RWA by Rating Bucket
        rating_breakdown = []
        for rating, group in df.groupby("credit_rating"):
            grp_pds = group["pd"].to_numpy(dtype=float)
            grp_lgds = group["lgd"].to_numpy(dtype=float)
            grp_eads = group["ead"].to_numpy(dtype=float)
            grp_res = self.basel_engine.calculate_portfolio_rwa(grp_pds, grp_lgds, grp_eads)
            rating_breakdown.append({
                "rating": str(rating),
                "count": len(group),
                "ead": round(float(grp_res["total_ead"] * sample_ratio), 2),
                "rwa": round(float(grp_res["total_rwa"] * sample_ratio), 2),
                "rwa_density_pct": grp_res["rwa_density_pct"],
                "min_capital": round(float(grp_res["pillar_1_minimum_capital"] * sample_ratio), 2),
            })

        # Order by standard rating order
        rating_order = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"]
        rating_breakdown.sort(key=lambda x: rating_order.index(x["rating"]) if x["rating"] in rating_order else 99)

        res["by_rating"] = rating_breakdown
        res["regulatory_standards"] = {
            "minimum_car": "8.0% (Pillar 1)",
            "capital_conservation_buffer": "2.5% (Basel III)",
            "tier_1_minimum": "6.0%",
            "cet1_minimum": "4.5%",
            "framework": "Basel III / IV Advanced Internal Ratings-Based (A-IRB)",
        }

        cache.set(cache_key, res, ttl_seconds=300)
        return res

    def get_ifrs9_staging_analysis(self, max_sample: int = 50000) -> Dict:
        """
        Performs IFRS 9 3-stage classification and provision calculation over full portfolio.
        """
        cache_key = f"regulatory:ifrs9:{max_sample}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        df = self._load_loans_dataframe(max_rows=max_sample if max_sample < 50000 else None)
        staging_res = self.ifrs9_engine.stage_portfolio(df)

        total_portfolio_size = 50000
        sample_ratio = total_portfolio_size / len(df) if len(df) < total_portfolio_size else 1.0

        if sample_ratio > 1.05:
            staging_res["total_facilities"] = int(staging_res["total_facilities"] * sample_ratio)
            staging_res["total_exposure"] = round(staging_res["total_exposure"] * sample_ratio, 2)
            staging_res["total_ecl_provisions"] = round(staging_res["total_ecl_provisions"] * sample_ratio, 2)
            for s in staging_res["stages"]:
                stg = staging_res["stages"][s]
                stg["facility_count"] = int(stg["facility_count"] * sample_ratio)
                stg["total_exposure"] = round(stg["total_exposure"] * sample_ratio, 2)
                stg["total_ecl"] = round(stg["total_ecl"] * sample_ratio, 2)

        cache.set(cache_key, staging_res, ttl_seconds=300)
        return staging_res
