"""
Portfolio Aggregation Service.
Computes portfolio summary, exposure breakdowns, and risk summaries.
Integrates Redis caching for sub-millisecond responses.
"""

import os
from typing import Dict, List, Optional
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.cache import cache
from backend.app.core.logging import logger
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.risk_engine.expected_loss.el_calculator import ExpectedLossCalculator


class PortfolioService:

    def __init__(self, loan_repo: Optional[LoanRepository] = None):
        self.loan_repo = loan_repo or LoanRepository()
        self._borrowers_dict: Optional[Dict[str, dict]] = None

    def _get_borrowers_dict(self) -> Dict[str, dict]:
        """Loads borrowers dataframe to map legal_name, segment, and financials."""
        if self._borrowers_dict is not None:
            return self._borrowers_dict
        p_parquet = os.path.join(settings.DATA_DIR, "processed", "borrowers.parquet")
        p_csv = os.path.join(settings.DATA_DIR, "synthetic", "borrowers.csv")
        p = p_parquet if os.path.exists(p_parquet) else p_csv
        if not os.path.exists(p):
            self._borrowers_dict = {}
            return self._borrowers_dict
        try:
            bdf = pd.read_parquet(p) if p.endswith(".parquet") else pd.read_csv(p)
            def derive_segment(rev):
                if rev >= 1e9:   return "Large Corporate"
                if rev >= 2.5e8: return "Upper Mid-Market"
                if rev >= 5e7:   return "Mid-Market"
                if rev >= 1e7:   return "Lower Mid-Market"
                return "SME"
            if "annual_revenue" in bdf.columns:
                bdf["segment"] = bdf["annual_revenue"].apply(derive_segment)
            else:
                bdf["segment"] = "Mid-Market"
            self._borrowers_dict = bdf.set_index("borrower_id").to_dict(orient="index")
        except Exception as e:
            logger.warning(f"Failed to load borrowers for segment mapping: {e}")
            self._borrowers_dict = {}
        return self._borrowers_dict

    def get_portfolio_summary(self) -> Dict:
        """Computes executive portfolio risk KPIs: Total Exposure, EL, Weighted PD/LGD, VaR, ES."""
        cache_key = "portfolio:summary"
        cached = cache.get(cache_key)
        if cached:
            return cached

        df = self.loan_repo.get_portfolio_dataframe()
        if df.empty:
            return {
                "total_exposure": 0.0,
                "total_loans": 0,
                "total_expected_loss": 0.0,
                "weighted_pd": 0.0,
                "weighted_lgd": 0.0,
                "expected_loss_rate": 0.0,
                "var_95": 0.0,
                "var_99": 0.0,
                "expected_shortfall_99": 0.0,
            }

        el_metrics = ExpectedLossCalculator.calculate_from_dataframe(df)

        # Baseline analytical VaR and ES using Vasicek distribution approximation for portfolio summary
        from scipy.stats import norm
        rho = 0.18
        w_pd = max(0.0001, min(0.999, el_metrics["weighted_pd"]))
        w_lgd = el_metrics["weighted_lgd"]
        total_ead = el_metrics["total_ead"]

        inv_pd = norm.ppf(w_pd)
        cond_pd_95 = norm.cdf((inv_pd + (rho ** 0.5) * norm.ppf(0.95)) / ((1 - rho) ** 0.5))
        cond_pd_99 = norm.cdf((inv_pd + (rho ** 0.5) * norm.ppf(0.99)) / ((1 - rho) ** 0.5))

        var_95 = float(cond_pd_95 * w_lgd * total_ead)
        var_99 = float(cond_pd_99 * w_lgd * total_ead)
        # ES 99: tail average beyond 99%
        es_99 = float(var_99 * 1.14)

        result = {
            "total_exposure": round(total_ead, 2),
            "total_loans": int(len(df)),
            "total_expected_loss": round(el_metrics["total_expected_loss"], 2),
            "weighted_pd": round(el_metrics["weighted_pd"], 5),
            "weighted_lgd": round(el_metrics["weighted_lgd"], 5),
            "expected_loss_rate": round(el_metrics["el_rate"] * 100.0, 4),
            "var_95": round(var_95, 2),
            "var_99": round(var_99, 2),
            "expected_shortfall_99": round(es_99, 2),
        }

        cache.set(cache_key, result, ttl_seconds=600)
        return result

    def get_portfolio_exposure_breakdowns(self) -> Dict:
        """Breakdowns by rating, sector, geography, product, customer segment, and high-risk borrowers."""
        cache_key = "portfolio:exposure_breakdowns_v2"
        cached = cache.get(cache_key)
        if cached:
            return cached

        df = self.loan_repo.get_portfolio_dataframe()
        if df.empty:
            return {
                "total_exposure": 0.0,
                "total_expected_loss": 0.0,
                "default_rate": 0.0,
                "expected_loss_rate": 0.0,
                "by_rating": [],
                "by_sector": [],
                "by_geography": [],
                "by_product": [],
                "by_segment": [],
                "high_risk_borrowers": [],
                "top_borrowers": [],
            }

        total_ead = float(df["ead"].sum()) if df["ead"].sum() > 0 else 1.0
        total_el = float(df["expected_loss"].sum()) if "expected_loss" in df.columns else 0.0
        weighted_pd = float((df["pd"] * df["ead"]).sum() / total_ead) if "pd" in df.columns else 0.0
        el_rate = float((total_el / total_ead) * 100.0) if total_ead > 0 else 0.0

        b_map = self._get_borrowers_dict()

        # By Rating
        rating_order = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "Default"]
        r_grp = df.groupby("credit_rating")["ead"].agg(["sum", "count"]).reset_index()
        by_rating = []
        for r in rating_order:
            row = r_grp[r_grp["credit_rating"] == r]
            if not row.empty:
                exp = float(row["sum"].iloc[0])
                cnt = int(row["count"].iloc[0])
                by_rating.append({
                    "rating": r,
                    "exposure": round(exp, 2),
                    "share": round(exp / total_ead, 4),
                    "loan_count": cnt,
                })

        # By Sector
        s_grp = df.groupby("sector")["ead"].agg(["sum", "count"]).sort_values(by="sum", ascending=False).reset_index()
        by_sector = [
            {
                "sector": row["sector"],
                "exposure": round(float(row["sum"]), 2),
                "share": round(float(row["sum"]) / total_ead, 4),
                "loan_count": int(row["count"]),
            }
            for _, row in s_grp.iterrows()
        ]

        # By Geography with enriched risk metrics (weighted PD, EL)
        by_geography = []
        for geo, g_df in df.groupby("geography"):
            g_exp = float(g_df["ead"].sum())
            g_el = float(g_df["expected_loss"].sum()) if "expected_loss" in g_df.columns else 0.0
            g_pd = float((g_df["pd"] * g_df["ead"]).sum() / g_exp) if g_exp > 0 else 0.0
            by_geography.append({
                "geography": str(geo),
                "exposure": round(g_exp, 2),
                "share": round(g_exp / total_ead, 4),
                "loan_count": int(len(g_df)),
                "weighted_pd": round(g_pd, 5),
                "expected_loss": round(g_el, 2),
            })
        by_geography.sort(key=lambda x: x["exposure"], reverse=True)

        # By Product (facility_type)
        by_product = []
        for ptype, p_df in df.groupby("facility_type"):
            p_exp = float(p_df["ead"].sum())
            p_el = float(p_df["expected_loss"].sum()) if "expected_loss" in p_df.columns else 0.0
            p_pd = float((p_df["pd"] * p_df["ead"]).sum() / p_exp) if p_exp > 0 else 0.0
            p_lgd = float((p_df["lgd"] * p_df["ead"]).sum() / p_exp) if "lgd" in p_df.columns and p_exp > 0 else 0.0
            # Friendly product label
            p_name = str(ptype).replace("_", " ").title()
            by_product.append({
                "product": p_name,
                "facility_type": str(ptype),
                "exposure": round(p_exp, 2),
                "share": round(p_exp / total_ead, 4),
                "loan_count": int(len(p_df)),
                "weighted_pd": round(p_pd, 5),
                "weighted_lgd": round(p_lgd, 5),
                "expected_loss": round(p_el, 2),
            })
        by_product.sort(key=lambda x: x["exposure"], reverse=True)

        # By Customer Segment
        segment_order = ["Large Corporate", "Upper Mid-Market", "Mid-Market", "Lower Mid-Market", "SME"]
        # Map segment onto loans
        df["segment"] = df["borrower_id"].map(lambda b: b_map.get(b, {}).get("segment", "Mid-Market"))
        by_segment = []
        for seg in segment_order:
            seg_df = df[df["segment"] == seg]
            if not seg_df.empty:
                s_exp = float(seg_df["ead"].sum())
                s_el = float(seg_df["expected_loss"].sum()) if "expected_loss" in seg_df.columns else 0.0
                s_pd = float((seg_df["pd"] * seg_df["ead"]).sum() / s_exp) if s_exp > 0 else 0.0
                by_segment.append({
                    "segment": seg,
                    "exposure": round(s_exp, 2),
                    "share": round(s_exp / total_ead, 4),
                    "loan_count": int(len(seg_df)),
                    "obligor_count": int(seg_df["borrower_id"].nunique()),
                    "weighted_pd": round(s_pd, 5),
                    "expected_loss": round(s_el, 2),
                })

        # High-Risk Borrowers (ratings CCC, CC, Default or PD >= 0.035, sorted by expected loss)
        hr_mask = df["credit_rating"].isin(["CCC", "CC", "D", "Default"]) | (df["pd"] >= 0.035)
        hr_loans = df[hr_mask]
        high_risk_borrowers = []
        if not hr_loans.empty:
            hr_grp = hr_loans.groupby("borrower_id")
            for b_id, grp in hr_grp:
                b_exp = float(grp["ead"].sum())
                b_el = float(grp["expected_loss"].sum()) if "expected_loss" in grp.columns else 0.0
                b_pd = float((grp["pd"] * grp["ead"]).sum() / b_exp) if b_exp > 0 else 0.0
                meta = b_map.get(str(b_id), {})
                rating = str(meta.get("credit_rating") or grp["credit_rating"].iloc[0])
                tier = "Distressed" if rating in ["CCC", "CC", "D", "Default"] else ("Critical" if b_pd >= 0.06 else "Watchlist")
                high_risk_borrowers.append({
                    "borrower_id": str(b_id),
                    "legal_name": str(meta.get("legal_name") or f"Borrower {b_id}"),
                    "credit_rating": rating,
                    "exposure": round(b_exp, 2),
                    "share": round(b_exp / total_ead, 6),
                    "loan_count": int(len(grp)),
                    "pd": round(b_pd, 5),
                    "expected_loss": round(b_el, 2),
                    "risk_tier": tier,
                })
            # Sort top 20 by Expected Loss
            high_risk_borrowers.sort(key=lambda x: x["expected_loss"], reverse=True)
            high_risk_borrowers = high_risk_borrowers[:20]

        # Top Borrowers (by size, for backward compatibility)
        b_grp = df.groupby("borrower_id")["ead"].agg(["sum", "count"]).sort_values(by="sum", ascending=False).head(15).reset_index()
        top_borrowers = [
            {
                "borrower_id": row["borrower_id"],
                "exposure": round(float(row["sum"]), 2),
                "share": round(float(row["sum"]) / total_ead, 4),
                "loan_count": int(row["count"]),
            }
            for _, row in b_grp.iterrows()
        ]

        result = {
            "total_exposure": round(total_ead, 2),
            "total_expected_loss": round(total_el, 2),
            "default_rate": round(weighted_pd, 5),
            "expected_loss_rate": round(el_rate, 4),
            "by_rating": by_rating,
            "by_sector": by_sector,
            "by_geography": by_geography,
            "by_product": by_product,
            "by_segment": by_segment,
            "high_risk_borrowers": high_risk_borrowers,
            "top_borrowers": top_borrowers,
        }

        cache.set(cache_key, result, ttl_seconds=600)
        return result
