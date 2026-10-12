"""
Pricing & RAROC API Routes
==========================
Exposes deal underwriting and RAROC hurdle rate analysis.
"""

from fastapi import APIRouter, Body
from backend.app.services.pricing_service import PricingService
from backend.app.schemas.pricing import RAROCRequest, RAROCResponse

router = APIRouter(prefix="/pricing", tags=["Loan Pricing & RAROC"])


@router.post("/raroc", response_model=RAROCResponse)
def calculate_facility_raroc(payload: RAROCRequest = Body(...)):
    """
    Evaluates loan pricing, Economic Capital consumption,
    and Risk-Adjusted Return on Capital (RAROC) against institutional hurdle rates.
    """
    service = PricingService()
    result = service.price_facility(
        credit_limit=payload.credit_limit,
        drawn_balance=payload.drawn_balance,
        interest_spread_bps=payload.interest_spread_bps,
        pd=payload.pd,
        lgd=payload.lgd,
        maturity_years=payload.maturity_years,
        upfront_fee_pct=payload.upfront_fee_pct,
        ccf=payload.ccf,
    )
    return RAROCResponse(**result)
