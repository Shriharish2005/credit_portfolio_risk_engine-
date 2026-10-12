"""
Concentration Risk Service.
Computes obligor HHI, sector HHI, geography HHI, Gini, and top concentrations.
"""

from typing import Dict, Optional
from backend.app.core.cache import cache
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.risk_engine.concentration.hhi_calculator import ConcentrationEngine


class ConcentrationService:

    def __init__(self, loan_repo: Optional[LoanRepository] = None):
        self.loan_repo = loan_repo or LoanRepository()

    def get_concentration_analysis(self) -> Dict:
        cache_key = "concentration:analysis"
        cached = cache.get(cache_key)
        if cached:
            return cached

        df = self.loan_repo.get_portfolio_dataframe()
        result = ConcentrationEngine.analyze_portfolio_concentration(
            df=df,
            borrower_col="borrower_id",
            exposure_col="ead",
            sector_col="sector",
            geography_col="geography",
        )

        cache.set(cache_key, result, ttl_seconds=600)
        return result
