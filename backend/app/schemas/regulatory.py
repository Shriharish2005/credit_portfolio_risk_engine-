"""
Regulatory Capital & IFRS 9 Schemas
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class RatingRWABreakdown(BaseModel):
    rating: str
    count: int
    ead: float
    rwa: float
    rwa_density_pct: float
    min_capital: float


class BaselCapitalResponse(BaseModel):
    total_ead: float
    total_rwa: float
    average_k: float
    rwa_density_pct: float
    pillar_1_minimum_capital: float
    capital_conservation_buffer: float
    total_regulatory_capital: float
    tier_1_requirement_6pct: float
    cet1_requirement_4_5pct: float
    by_rating: List[RatingRWABreakdown]
    regulatory_standards: Dict[str, str]


class StageDetail(BaseModel):
    stage: int
    name: str
    facility_count: int
    percentage_facilities: float
    total_exposure: float
    exposure_share_pct: float
    total_ecl: float
    coverage_ratio_pct: float


class IFRS9StagingResponse(BaseModel):
    total_facilities: int
    total_exposure: float
    total_ecl_provisions: float
    blended_coverage_ratio_pct: float
    stages: Dict[str, StageDetail]
