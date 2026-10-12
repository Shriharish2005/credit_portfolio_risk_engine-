"""
Concentration Risk Schemas
"""

from typing import Dict, List, Optional
from pydantic import BaseModel


class ConcentrationBreakdownItem(BaseModel):
    sector: Optional[str] = None
    geography: Optional[str] = None
    exposure: float
    share: float


class TopBorrowerItem(BaseModel):
    borrower_id: str
    exposure: float
    share: float


class ConcentrationResponse(BaseModel):
    total_exposure: float
    obligor_count: int
    hhi_borrower: float
    hhi_borrower_bps: float
    effective_obligors: float
    gini_coefficient: float
    top_5_share: float
    top_10_share: float
    top_20_share: float
    hhi_sector: float
    hhi_sector_bps: float
    hhi_geography: float
    hhi_geography_bps: float
    sector_breakdown: List[Dict]
    geography_breakdown: List[Dict]
    top_borrowers: List[TopBorrowerItem]
