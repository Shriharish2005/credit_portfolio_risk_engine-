"""
IFRS 9 / CECL Multi-Stage Expected Credit Loss (ECL) Provisioning Engine
========================================================================
Implements IFRS 9 impairment standard with three stages:
- Stage 1: Performing (12-month ECL)
- Stage 2: Underperforming / Significant Increase in Credit Risk (SICR) (Lifetime ECL)
- Stage 3: Credit-Impaired / Non-Performing (Lifetime ECL with default)

SICR Criteria:
--------------
- Rating Downgrade: >= 2 rating notches deterioration from origination
- PD Relative Deterioration: Current PD >= 2.0 * Origination PD
- Backstop: Days Past Due (DPD) >= 30 days
- Stage 3 Trigger: DPD >= 90 days OR Rating is 'D' (Default)
"""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd


class IFRS9StagingEngine:
    """
    IFRS 9 / CECL 3-Stage Classification and Provisioning Engine.
    """

    RATING_HIERARCHY = {
        "AAA": 1,
        "AA": 2,
        "A": 3,
        "BBB": 4,
        "BB": 5,
        "B": 6,
        "CCC": 7,
        "D": 8,
    }

    def __init__(self, sicr_downgrade_threshold: int = 2, sicr_pd_ratio: float = 2.0):
        self.sicr_downgrade_threshold = sicr_downgrade_threshold
        self.sicr_pd_ratio = sicr_pd_ratio

    def evaluate_facility_stage(
        self,
        current_rating: str,
        origination_rating: str,
        current_pd: float,
        origination_pd: float,
        dpd: int = 0,
    ) -> int:
        """
        Evaluates stage (1, 2, or 3) for a single facility according to IFRS 9 SICR rules.
        """
        # Stage 3: Objective evidence of impairment (default or >= 90 DPD)
        if current_rating == "D" or dpd >= 90:
            return 3

        curr_rank = self.RATING_HIERARCHY.get(current_rating, 4)
        orig_rank = self.RATING_HIERARCHY.get(origination_rating, 4)
        notch_deterioration = curr_rank - orig_rank

        # Stage 2: Significant Increase in Credit Risk (SICR)
        is_downgraded = notch_deterioration >= self.sicr_downgrade_threshold
        is_pd_escalated = (current_pd / max(origination_pd, 1e-4)) >= self.sicr_pd_ratio
        is_past_due_backstop = dpd >= 30

        if is_downgraded or is_pd_escalated or is_past_due_backstop:
            return 2

        # Stage 1: Performing
        return 1

    def calculate_lifetime_pd(self, pd_1y: float, tenor_years: float = 3.0) -> float:
        """
        Estimates cumulative multi-year lifetime PD:
        PD_Lifetime = 1 - (1 - PD_1y)^tenor
        """
        p = np.clip(pd_1y, 0.0, 1.0)
        t = max(1.0, tenor_years)
        return float(np.clip(1.0 - np.power(1.0 - p, t), 0.0, 1.0))

    def calculate_facility_ecl(
        self,
        ead: float,
        lgd: float,
        pd_1y: float,
        stage: int,
        tenor_years: float = 3.0,
    ) -> Dict[str, float]:
        """
        Calculates IFRS 9 provision based on assigned stage.
        """
        if stage == 1:
            effective_pd = pd_1y
            ecl = effective_pd * lgd * ead
            metric_type = "12-Month ECL"
        elif stage == 2:
            effective_pd = self.calculate_lifetime_pd(pd_1y, tenor_years)
            ecl = effective_pd * lgd * ead
            metric_type = "Lifetime ECL (SICR)"
        else:  # Stage 3
            effective_pd = 1.0
            ecl = lgd * ead
            metric_type = "Lifetime ECL (Impaired)"

        coverage = (ecl / ead) if ead > 0 else 0.0

        return {
            "stage": stage,
            "metric_type": metric_type,
            "effective_pd": round(effective_pd, 6),
            "lgd": round(lgd, 4),
            "ead": round(ead, 2),
            "provision_ecl": round(ecl, 2),
            "coverage_ratio_pct": round(coverage * 100, 2),
        }

    def stage_portfolio(self, loans_df: pd.DataFrame) -> Dict:
        """
        Runs portfolio-wide IFRS 9 staging classification and provision aggregation.
        """
        # Determine stages
        stages = []
        ecl_list = []

        for _, row in loans_df.iterrows():
            curr_rating = str(row.get("credit_rating", "BBB"))
            # Estimate origination rating if not explicit (assumes slight seasoning)
            curr_pd = float(row.get("pd", 0.02))
            orig_pd = float(row.get("origination_pd", curr_pd * 0.85))
            orig_rating = str(row.get("origination_rating", curr_rating))
            dpd = int(row.get("days_past_due", 0))

            ead = float(row.get("ead", row.get("drawn_balance", 100000)))
            lgd = float(row.get("lgd", 0.40))
            tenor = float(row.get("tenor_years", 3.0))

            stage = self.evaluate_facility_stage(
                curr_rating, orig_rating, curr_pd, orig_pd, dpd
            )
            stages.append(stage)

            res = self.calculate_facility_ecl(ead, lgd, curr_pd, stage, tenor)
            ecl_list.append(res["provision_ecl"])

        df = loans_df.copy()
        df["stage"] = stages
        df["ecl"] = ecl_list
        total_ead = float(df["ead"].sum())

        stage_summary = {}
        for s in [1, 2, 3]:
            sub = df[df["stage"] == s]
            s_ead = float(sub["ead"].sum())
            s_ecl = float(sub["ecl"].sum())
            count = len(sub)
            share_ead = (s_ead / total_ead) if total_ead > 0 else 0.0
            coverage = (s_ecl / s_ead) if s_ead > 0 else 0.0

            stage_summary[f"stage_{s}"] = {
                "stage": s,
                "name": "Stage 1 (Performing)" if s == 1 else "Stage 2 (Underperforming - SICR)" if s == 2 else "Stage 3 (Credit-Impaired)",
                "facility_count": count,
                "percentage_facilities": round((count / len(df)) * 100, 2) if len(df) > 0 else 0.0,
                "total_exposure": round(s_ead, 2),
                "exposure_share_pct": round(share_ead * 100, 2),
                "total_ecl": round(s_ecl, 2),
                "coverage_ratio_pct": round(coverage * 100, 2),
            }

        total_provisions = float(df["ecl"].sum())
        blended_coverage = (total_provisions / total_ead) if total_ead > 0 else 0.0

        return {
            "total_facilities": len(df),
            "total_exposure": round(total_ead, 2),
            "total_ecl_provisions": round(total_provisions, 2),
            "blended_coverage_ratio_pct": round(blended_coverage * 100, 2),
            "stages": stage_summary,
        }
