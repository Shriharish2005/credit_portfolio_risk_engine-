"""
Monte Carlo Simulation Schemas
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class MonteCarloRunRequest(BaseModel):
    n_simulations: int = Field(default=10000, ge=100, le=50000, description="Number of Monte Carlo iterations")
    random_seed: int = Field(default=42, description="Random seed for reproducibility")
    asset_correlation: float = Field(default=0.18, ge=0.01, le=0.95, description="Vasicek systemic asset correlation rho")
    stochastic_lgd: bool = Field(default=False, description="Whether to simulate systematic downturn LGD volatility")
    sample_size: Optional[int] = Field(default=5000, description="Max loans to simulate (None for full portfolio)")


class DistributionBin(BaseModel):
    bin_start: float
    bin_end: float
    frequency: int
    probability: float


class MonteCarloResponse(BaseModel):
    run_id: str
    n_simulations: int
    random_seed: int
    total_ead: float
    mean_loss: float
    std_loss: float
    min_loss: float
    max_loss: float
    expected_loss_pct: float
    var_95: float
    var_99: float
    es_95: float
    es_99: float
    unexpected_loss_99: float
    var_metrics: Dict[str, float]
    es_metrics: Dict[str, float]
    percentiles: Dict[str, float]
    distribution: List[DistributionBin]
    mean_defaults_count: float
    execution_time_seconds: float
