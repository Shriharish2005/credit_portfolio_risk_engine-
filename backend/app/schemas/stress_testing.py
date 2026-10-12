"""
Stress Testing Schemas
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CustomScenarioRequest(BaseModel):
    name: str = "Custom"
    description: str = "User customized stress scenario"
    gdp_growth: float = Field(default=0.0, description="GDP Growth rate (%)")
    interest_rate: float = Field(default=9.0, description="Central bank policy rate (%)")
    unemployment_rate: float = Field(default=10.0, description="Unemployment rate (%)")
    collateral_haircut_shock: float = Field(default=0.15, description="Additional collateral haircut (0-1)")


class ScenarioResultItem(BaseModel):
    scenario_name: str
    description: str
    macro_inputs: Dict[str, Any]
    weighted_pd: float
    weighted_lgd: float
    total_expected_loss: float
    el_rate: float
    estimated_var_99: float
    estimated_es_99: float
    el_delta_vs_base: float
    el_pct_change: float


class StressTestResponse(BaseModel):
    total_exposure: float
    scenarios: List[ScenarioResultItem]
    comparison: Dict[str, ScenarioResultItem]
