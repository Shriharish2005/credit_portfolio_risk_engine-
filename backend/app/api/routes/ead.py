"""
Exposure at Default (EAD) API Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.risk_service import RiskService
from backend.app.schemas.risk import EADResponse

router = APIRouter(prefix="/risk/ead", tags=["Credit Risk - EAD"])


@router.get("", response_model=EADResponse)
def calculate_ead(
    drawn_balance: float = Query(750000.0, ge=0, description="Current outstanding drawn balance"),
    credit_limit: float = Query(1000000.0, ge=0, description="Total committed credit facility limit"),
    facility_type: str = Query("REVOLVING_CREDIT", description="Facility product category"),
    ccf_override: Optional[float] = Query(None, ge=0, le=1, description="Custom Credit Conversion Factor"),
):
    """
    Computes Exposure at Default:
    EAD = Drawn Balance + CCF * max(0, Credit Limit - Drawn Balance)
    Guaranteed bounds: EAD >= 0.0
    """
    service = RiskService()
    result = service.calculate_ead(
        drawn_balance=drawn_balance,
        credit_limit=credit_limit,
        facility_type=facility_type,
        ccf_override=ccf_override,
    )
    return EADResponse(**result)
