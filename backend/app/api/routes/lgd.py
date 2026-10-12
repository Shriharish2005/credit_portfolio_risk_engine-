"""
Loss Given Default (LGD) API Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Query
from backend.app.services.risk_service import RiskService
from backend.app.schemas.risk import LGDResponse

router = APIRouter(prefix="/risk/lgd", tags=["Credit Risk - LGD"])


@router.get("", response_model=LGDResponse)
def calculate_lgd(
    exposure: float = Query(1000000.0, gt=0, description="Gross facility exposure in dollars"),
    collateral_value: float = Query(500000.0, ge=0, description="Pledged collateral market value"),
    collateral_type: str = Query("COMMERCIAL_REAL_ESTATE", description="Collateral asset class"),
    seniority: str = Query("SENIOR_SECURED", description="Debt seniority tier"),
    haircut_override: Optional[float] = Query(None, ge=0, le=1, description="Custom haircut (0-1)"),
    downturn_multiplier: float = Query(1.0, ge=0.5, le=3.0, description="Economic downturn haircut stress multiplier"),
):
    """
    Computes Loss Given Default (LGD = 1 - Recovery Rate):
    Incorporate collateral haircut, liquidation haircut, and seniority tier recovery.
    Guaranteed bounds: 0.0 <= LGD <= 1.0
    """
    service = RiskService()
    result = service.calculate_lgd(
        exposure=exposure,
        collateral_value=collateral_value,
        collateral_type=collateral_type,
        seniority=seniority,
        haircut_override=haircut_override,
        downturn_multiplier=downturn_multiplier,
    )
    return LGDResponse(**result)
