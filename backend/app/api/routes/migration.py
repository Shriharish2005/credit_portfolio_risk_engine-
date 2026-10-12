"""
Credit Rating Migration API Endpoints
"""

from fastapi import APIRouter, Query
from backend.app.services.migration_service import MigrationService
from backend.app.schemas.migration import MigrationAnalysisResponse

router = APIRouter(prefix="/risk/migration", tags=["Credit Risk - Migration"])


@router.get("", response_model=MigrationAnalysisResponse)
def get_credit_migration(
    periods: int = Query(1, ge=1, le=10, description="Forecast horizons / matrix power periods P(n) = P^n"),
):
    """
    Computes Rating Transition Matrix and multi-period migration dynamics:
    P(n) = P^n
    Provides upgrade, downgrade, stability, and cumulative default probabilities.
    """
    service = MigrationService()
    result = service.get_migration_analysis(periods=periods)
    return MigrationAnalysisResponse(**result)
