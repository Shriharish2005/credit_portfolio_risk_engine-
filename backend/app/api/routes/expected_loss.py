"""
Expected Loss, VaR, and Expected Shortfall API Endpoints
"""

from typing import Dict, Optional
from fastapi import APIRouter, Query, Body
from backend.app.services.risk_service import RiskService
from backend.app.schemas.risk import (
    SingleELRequest, SingleELResponse,
    VaRResponse, ExpectedShortfallResponse
)

router = APIRouter(prefix="/risk", tags=["Credit Risk - Expected Loss, VaR & ES"])


@router.post("/expected-loss", response_model=SingleELResponse)
def calculate_expected_loss(payload: SingleELRequest = Body(...)):
    """
    Computes Expected Loss for an individual facility:
    EL = PD * LGD * EAD
    """
    service = RiskService()
    result = service.calculate_expected_loss(
        pd_val=payload.pd,
        lgd_val=payload.lgd,
        ead_val=payload.ead,
    )
    return SingleELResponse(**result)


@router.get("/distributions")
def get_risk_distributions() -> Dict:
    """Returns histogram distributions of PD, LGD, and EAD across the active loan portfolio."""
    service = RiskService()
    return service.get_portfolio_risk_metrics()


@router.get("/var", response_model=VaRResponse)
def get_credit_var(
    confidence: float = Query(0.99, ge=0.50, le=0.999, description="Confidence quantile (e.g. 0.95 or 0.99)")
):
    """
    Calculates Credit Value at Risk (Credit VaR) from the simulated/ASRF loss distribution.
    Supports configurable 95%, 99%, or custom percentiles.
    """
    service = RiskService()
    result = service.get_var(confidence=confidence)
    return VaRResponse(**result)


@router.get("/expected-shortfall", response_model=ExpectedShortfallResponse)
def get_expected_shortfall(
    confidence: float = Query(0.99, ge=0.50, le=0.999, description="Confidence quantile (e.g. 0.95 or 0.99)")
):
    """
    Calculates Expected Shortfall (Conditional VaR):
    ES = E[Loss | Loss >= VaR]
    Quantifies the average loss incurred during extreme tail events beyond the VaR threshold.
    """
    service = RiskService()
    result = service.get_expected_shortfall(confidence=confidence)
    return ExpectedShortfallResponse(**result)
