"""
Regulatory Capital & IFRS 9 Routes
==================================
Exposes endpoints for Basel III/IV IRB RWA and IFRS 9 multi-stage impairment.
"""

from fastapi import APIRouter, Query
from backend.app.services.regulatory_service import RegulatoryService
from backend.app.schemas.regulatory import BaselCapitalResponse, IFRS9StagingResponse

router = APIRouter(prefix="/regulatory", tags=["Regulatory Capital & IFRS 9"])


@router.get("/capital", response_model=BaselCapitalResponse)
def get_basel_capital_analysis(
    sample_size: int = Query(50000, ge=500, le=50000, description="Loan sample size for aggregation")
):
    """
    Computes Basel III / IV Advanced Internal Ratings-Based (A-IRB)
    Risk-Weighted Assets (RWA), Capital Conservation Buffer, and Tier 1 Capital.
    """
    service = RegulatoryService()
    return service.get_basel_capital_analysis(max_sample=sample_size)


@router.get("/ifrs9", response_model=IFRS9StagingResponse)
def get_ifrs9_staging_analysis(
    sample_size: int = Query(50000, ge=500, le=50000, description="Loan sample size for staging")
):
    """
    Computes IFRS 9 / CECL three-stage classification, SICR migration,
    and Expected Credit Loss (ECL) provisions.
    """
    service = RegulatoryService()
    return service.get_ifrs9_staging_analysis(max_sample=sample_size)
