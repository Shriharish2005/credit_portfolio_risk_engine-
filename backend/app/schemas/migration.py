"""
Credit Rating Migration Schemas
"""

from typing import Dict, List
from pydantic import BaseModel, Field


class RatingAnalysisItem(BaseModel):
    rating: str
    unchanged: float
    upgrade: float
    downgrade: float
    default_prob: float


class MigrationAnalysisResponse(BaseModel):
    periods: int = Field(default=1, description="Number of years / forecast periods")
    ratings: List[str]
    transition_matrix: List[List[float]]
    rating_analysis: List[RatingAnalysisItem]
    overall_avg_upgrade: float
    overall_avg_downgrade: float
    overall_avg_unchanged: float
    overall_avg_default: float
