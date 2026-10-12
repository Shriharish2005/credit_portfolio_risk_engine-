"""
Probability of Default (PD) API Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.risk_service import RiskService
from backend.app.schemas.risk import PDResponse

router = APIRouter(prefix="/risk/pd", tags=["Credit Risk - PD"])


@router.get("", response_model=PDResponse)
def calculate_pd(
    rating: Optional[str] = Query("BBB", description="Credit Rating (AAA to CCC, Default)"),
    leverage: float = Query(2.5, description="Total Debt / Equity"),
    debt_ratio: float = Query(0.45, description="Total Debt / Total Assets"),
    interest_coverage: float = Query(3.5, description="EBIT / Interest Expense"),
    profitability: float = Query(0.12, description="ROA / EBITDA Margin"),
    liquidity: float = Query(1.8, description="Current Ratio"),
    unemployment_rate: float = Query(5.0, description="Macro Unemployment Rate (%)"),
    interest_rate: float = Query(6.0, description="Benchmark Interest Rate (%)"),
):
    """
    Computes Probability of Default (PD) using:
    1. Standardized Credit Rating Master Scale (TTC PD)
    2. Multivariate Calibrated Logistic PD Scoring Model
    """
    service = RiskService()
    result = service.calculate_pd(
        rating=rating,
        leverage=leverage,
        debt_ratio=debt_ratio,
        interest_coverage=interest_coverage,
        profitability=profitability,
        liquidity=liquidity,
        unemployment_rate=unemployment_rate,
        interest_rate=interest_rate,
    )
    return PDResponse(**result)
