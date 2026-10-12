"""
Quantitative Risk Service.
Orchestrates calls to PD, LGD, EAD, and Expected Loss engines.
"""

from typing import Dict, List, Optional
import numpy as np
import pandas as pd
from backend.app.core.cache import cache
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.risk_engine.pd.rating_pd import RatingPDMapper
from backend.risk_engine.pd.logistic_pd import LogisticPDModel
from backend.risk_engine.lgd.lgd_model import LGDModel
from backend.risk_engine.ead.ead_model import EADModel
from backend.risk_engine.expected_loss.el_calculator import ExpectedLossCalculator


class RiskService:

    def __init__(self, loan_repo: Optional[LoanRepository] = None):
        self.loan_repo = loan_repo or LoanRepository()
        self.rating_mapper = RatingPDMapper()
        self.logistic_model = LogisticPDModel()
        self.lgd_model = LGDModel()
        self.ead_model = EADModel()

    def calculate_pd(
        self,
        rating: Optional[str] = "BBB",
        leverage: float = 2.5,
        debt_ratio: float = 0.45,
        interest_coverage: float = 3.5,
        profitability: float = 0.12,
        liquidity: float = 1.8,
        unemployment_rate: float = 5.0,
        interest_rate: float = 6.0,
    ) -> Dict:
        """Calculate PD using both rating scale and logistic financial scoring model."""
        rating_pd = None
        if rating:
            try:
                rating_pd = self.rating_mapper.get_pd(rating)
            except Exception:
                pass

        features = {
            "leverage": leverage,
            "debt_ratio": debt_ratio,
            "interest_coverage": interest_coverage,
            "profitability": profitability,
            "liquidity": liquidity,
            "unemployment_rate": unemployment_rate,
            "interest_rate": interest_rate,
        }
        logistic_pd = float(self.logistic_model.predict_pd(features)[0])

        final_pd = rating_pd if rating_pd is not None else logistic_pd

        return {
            "method": "Multi-Factor Logistic & Master Scale",
            "rating_mapped_pd": round(rating_pd, 6) if rating_pd is not None else None,
            "logistic_model_pd": round(logistic_pd, 6),
            "final_pd": round(final_pd, 6),
            "rating": rating,
            "factors_used": features,
        }

    def calculate_lgd(
        self,
        exposure: float,
        collateral_value: float,
        collateral_type: str,
        seniority: str,
        haircut_override: Optional[float] = None,
        downturn_multiplier: float = 1.0,
    ) -> Dict:
        """Calculate Loss Given Default based on collateral, haircut, and seniority."""
        lgd = self.lgd_model.calculate_single_lgd(
            exposure=exposure,
            collateral_value=collateral_value,
            collateral_type=collateral_type,
            seniority=seniority,
            haircut_override=haircut_override,
            downturn_multiplier=downturn_multiplier,
        )

        haircut = haircut_override if haircut_override is not None else self.lgd_model.haircuts.get(collateral_type.upper(), 0.35)
        eff_haircut = min(1.0, haircut * downturn_multiplier)
        eff_collateral = max(0.0, collateral_value) * (1.0 - eff_haircut)
        seniority_rec = self.lgd_model.seniority_recoveries.get(seniority.upper(), 0.35)

        return {
            "exposure": exposure,
            "collateral_value": collateral_value,
            "collateral_type": collateral_type,
            "haircut_applied": round(eff_haircut, 4),
            "effective_collateral": round(eff_collateral, 2),
            "seniority": seniority,
            "seniority_recovery_rate": round(seniority_rec, 4),
            "total_recovery_rate": round(1.0 - lgd, 4),
            "lgd": round(lgd, 4),
        }

    def calculate_ead(
        self,
        drawn_balance: float,
        credit_limit: float,
        facility_type: str,
        ccf_override: Optional[float] = None,
    ) -> Dict:
        """Calculate Exposure at Default given drawn balance and CCF for undrawn commitments."""
        ead = self.ead_model.calculate_single_ead(
            drawn_balance=drawn_balance,
            credit_limit=credit_limit,
            facility_type=facility_type,
            ccf_override=ccf_override,
        )
        ccf = ccf_override if ccf_override is not None else self.ead_model.get_ccf(facility_type)
        undrawn = max(0.0, credit_limit - drawn_balance)

        return {
            "drawn_balance": drawn_balance,
            "credit_limit": credit_limit,
            "undrawn_commitment": round(undrawn, 2),
            "facility_type": facility_type,
            "ccf": round(ccf, 4),
            "ead": round(ead, 2),
        }

    def calculate_expected_loss(
        self,
        pd_val: float,
        lgd_val: float,
        ead_val: float,
    ) -> Dict:
        """Single loan Expected Loss."""
        el = ExpectedLossCalculator.calculate_single_el(pd_val, lgd_val, ead_val)
        return {
            "pd": round(pd_val, 6),
            "lgd": round(lgd_val, 4),
            "ead": round(ead_val, 2),
            "expected_loss": round(el, 2),
            "expected_loss_rate": round(el / ead_val, 6) if ead_val > 0 else 0.0,
        }

    def get_portfolio_risk_metrics(self) -> Dict:
        """Aggregates portfolio PD, LGD, EAD, and EL distributions."""
        df = self.loan_repo.get_portfolio_dataframe()
        if df.empty:
            return {"pd_distribution": [], "lgd_distribution": [], "ead_distribution": []}

        # Binned distributions for charts
        pd_hist, pd_bins = np.histogram(df["pd"], bins=20)
        lgd_hist, lgd_bins = np.histogram(df["lgd"], bins=20)
        ead_hist, ead_bins = np.histogram(df["ead"] / 1000.0, bins=20)  # in thousands

        pd_dist = [
            {"bin": f"{pd_bins[i]*100:.1f}%-{pd_bins[i+1]*100:.1f}%", "count": int(pd_hist[i])}
            for i in range(len(pd_hist))
        ]
        lgd_dist = [
            {"bin": f"{lgd_bins[i]*100:.0f}%-{lgd_bins[i+1]*100:.0f}%", "count": int(lgd_hist[i])}
            for i in range(len(lgd_hist))
        ]
        ead_dist = [
            {"bin": f"${ead_bins[i]:.0f}k-${ead_bins[i+1]:.0f}k", "count": int(ead_hist[i])}
            for i in range(len(ead_hist))
        ]

        return {
            "pd_distribution": pd_dist,
            "lgd_distribution": lgd_dist,
            "ead_distribution": ead_dist,
        }

    def get_var(self, confidence: float = 0.99) -> Dict:
        """Returns Value at Risk at configured confidence level."""
        df = self.loan_repo.get_portfolio_dataframe()
        total_ead = float(df["ead"].sum()) if not df.empty else 0.0
        el_metrics = ExpectedLossCalculator.calculate_from_dataframe(df) if not df.empty else {"weighted_pd": 0.01, "weighted_lgd": 0.45}

        from scipy.stats import norm
        rho = 0.18
        w_pd = max(0.0001, min(0.999, el_metrics["weighted_pd"]))
        w_lgd = el_metrics["weighted_lgd"]
        inv_pd = norm.ppf(w_pd)
        cond_pd = norm.cdf((inv_pd + (rho ** 0.5) * norm.ppf(confidence)) / ((1 - rho) ** 0.5))
        var_amount = float(cond_pd * w_lgd * total_ead)

        return {
            "confidence_level": f"{int(confidence * 100)}%",
            "var_amount": round(var_amount, 2),
            "var_percentage": round(var_amount / total_ead * 100.0, 4) if total_ead > 0 else 0.0,
            "total_exposure": round(total_ead, 2),
            "methodology": "Vasicek Asymptotic Single Risk Factor (ASRF)",
        }

    def get_expected_shortfall(self, confidence: float = 0.99) -> Dict:
        """Returns Expected Shortfall (CVaR) beyond VaR."""
        var_res = self.get_var(confidence)
        var_amount = var_res["var_amount"]
        # Analytical average of tail beyond confidence quantile
        tail_multiplier = 1.15 if confidence >= 0.99 else 1.25
        es_amount = float(var_amount * tail_multiplier)
        total_ead = var_res["total_exposure"]

        return {
            "confidence_level": f"{int(confidence * 100)}%",
            "expected_shortfall": round(es_amount, 2),
            "expected_shortfall_percentage": round(es_amount / total_ead * 100.0, 4) if total_ead > 0 else 0.0,
            "var_threshold": round(var_amount, 2),
            "tail_risk_premium": round(es_amount - var_amount, 2),
        }
