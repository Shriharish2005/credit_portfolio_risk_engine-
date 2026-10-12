"""
Quantitative Credit Risk Request and Response Schemas
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


# --- PD SCHEMAS ---
class PDCalculateRequest(BaseModel):
    rating: Optional[str] = "BBB"
    leverage: Optional[float] = 2.5
    debt_ratio: Optional[float] = 0.45
    interest_coverage: Optional[float] = 3.5
    profitability: Optional[float] = 0.12
    liquidity: Optional[float] = 1.8
    unemployment_rate: Optional[float] = 5.0
    interest_rate: Optional[float] = 6.0


class PDResponse(BaseModel):
    method: str
    rating_mapped_pd: Optional[float] = None
    logistic_model_pd: Optional[float] = None
    final_pd: float
    rating: Optional[str] = None
    factors_used: Dict[str, float]


# --- LGD SCHEMAS ---
class LGDCalculateRequest(BaseModel):
    exposure: float = Field(gt=0, default=1000000.0)
    collateral_value: float = Field(ge=0, default=500000.0)
    collateral_type: str = "COMMERCIAL_REAL_ESTATE"
    seniority: str = "SENIOR_SECURED"
    haircut_override: Optional[float] = None
    downturn_multiplier: float = 1.0


class LGDResponse(BaseModel):
    exposure: float
    collateral_value: float
    collateral_type: str
    haircut_applied: float
    effective_collateral: float
    seniority: str
    seniority_recovery_rate: float
    total_recovery_rate: float
    lgd: float


# --- EAD SCHEMAS ---
class EADCalculateRequest(BaseModel):
    drawn_balance: float = Field(ge=0, default=750000.0)
    credit_limit: float = Field(ge=0, default=1000000.0)
    facility_type: str = "REVOLVING_CREDIT"
    ccf_override: Optional[float] = None


class EADResponse(BaseModel):
    drawn_balance: float
    credit_limit: float
    undrawn_commitment: float
    facility_type: str
    ccf: float
    ead: float


# --- EXPECTED LOSS SCHEMAS ---
class SingleELRequest(BaseModel):
    pd: float = Field(ge=0, le=1, default=0.015)
    lgd: float = Field(ge=0, le=1, default=0.45)
    ead: float = Field(ge=0, default=1000000.0)


class SingleELResponse(BaseModel):
    pd: float
    lgd: float
    ead: float
    expected_loss: float
    expected_loss_rate: float


class PortfolioELResponse(BaseModel):
    total_ead: float
    total_expected_loss: float
    weighted_pd: float
    weighted_lgd: float
    el_rate: float
    facility_count: int


# --- VAR & EXPECTED SHORTFALL SCHEMAS ---
class VaRResponse(BaseModel):
    confidence_level: str
    var_amount: float
    var_percentage: float
    total_exposure: float
    methodology: str = "Vasicek / Monte Carlo Loss Distribution"


class ExpectedShortfallResponse(BaseModel):
    confidence_level: str
    expected_shortfall: float
    expected_shortfall_percentage: float
    var_threshold: float
    tail_risk_premium: float
