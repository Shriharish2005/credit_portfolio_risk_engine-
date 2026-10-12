"""
Pricing & RAROC Schemas
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class RAROCRequest(BaseModel):
    credit_limit: float = Field(..., gt=0, description="Total committed credit facility limit")
    drawn_balance: float = Field(..., ge=0, description="Initially drawn balance")
    interest_spread_bps: float = Field(250.0, description="Credit margin over benchmark in basis points")
    pd: float = Field(0.02, ge=0.0001, le=1.0, description="Probability of Default")
    lgd: float = Field(0.40, ge=0.0, le=1.0, description="Loss Given Default")
    maturity_years: float = Field(3.0, ge=0.5, le=10.0, description="Facility tenor in years")
    upfront_fee_pct: float = Field(0.005, ge=0.0, description="Upfront facility origination fee ratio")
    ccf: float = Field(0.50, ge=0.0, le=1.0, description="Credit Conversion Factor for undrawn limit")


class SpreadSensitivityPoint(BaseModel):
    spread_bps: float
    raroc_pct: float
    is_approved: bool
    eva: float


class RAROCResponse(BaseModel):
    credit_limit: float
    drawn_balance: float
    ead: float
    spread_bps: float
    total_annual_revenue: float
    expected_loss: float
    operating_expense: float
    net_risk_adjusted_income: float
    economic_capital: float
    raroc_pct: float
    hurdle_rate_pct: float
    economic_value_added_eva: float
    breakeven_spread_bps: float
    is_approved: bool
    recommendation: str
    rwa: float
    rwa_density_pct: float
    sensitivity_curve: List[SpreadSensitivityPoint]
