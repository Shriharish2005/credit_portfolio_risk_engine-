"""
Model Validation Schemas
"""

from typing import Dict, List, Optional
from pydantic import BaseModel


class ValidationRunRequest(BaseModel):
    model_name: str = "LOGISTIC_PD_V1"
    sample_size: int = 5000
    n_bins: int = 10


class ValidationResponse(BaseModel):
    disclaimer: str
    discrimination: Dict
    calibration: Dict
    stability: Dict
