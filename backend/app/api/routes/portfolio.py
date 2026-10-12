"""
Portfolio API Endpoints
"""

from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/summary")
def get_portfolio_summary(db: Session = Depends(get_db)) -> Dict:
    """
    Returns executive portfolio risk summary:
    - Total Exposure (EAD)
    - Expected Loss (EL)
    - Weighted Average PD and LGD
    - 95% and 99% Value at Risk (VaR)
    - Expected Shortfall (ES)
    """
    repo = LoanRepository(db)
    service = PortfolioService(repo)
    return service.get_portfolio_summary()


@router.get("/exposure")
def get_portfolio_exposure(db: Session = Depends(get_db)) -> Dict:
    """
    Returns multi-dimensional portfolio exposure breakdowns:
    - Exposure by Credit Rating
    - Exposure by Sector / Industry
    - Exposure by Geography / Region
    - Top Borrowers
    """
    repo = LoanRepository(db)
    service = PortfolioService(repo)
    return service.get_portfolio_exposure_breakdowns()
