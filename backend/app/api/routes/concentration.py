"""
Concentration Risk API Endpoints
"""

from fastapi import APIRouter
from backend.app.services.concentration_service import ConcentrationService
from backend.app.schemas.concentration import ConcentrationResponse

router = APIRouter(prefix="/risk/concentration", tags=["Credit Risk - Concentration"])


@router.get("", response_model=ConcentrationResponse)
def get_concentration_risk():
    """
    Computes portfolio concentration indices:
    - Herfindahl-Hirschman Index (HHI) for obligors, sectors, and geographies
    - Effective Number of Obligors (N_eff = 1 / HHI)
    - Top-5, Top-10, Top-20 borrower concentration shares
    - Gini Coefficient of exposure distribution
    - Sector and geographic exposure breakdowns
    """
    service = ConcentrationService()
    result = service.get_concentration_analysis()
    return ConcentrationResponse(**result)
