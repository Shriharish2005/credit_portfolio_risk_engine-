"""
Borrower Schemas
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict


class BorrowerBase(BaseModel):
    borrower_id: str
    legal_name: str
    sector: str
    geography: str
    country: str
    credit_rating: str
    annual_revenue: float
    total_assets: float
    leverage: float
    debt_ratio: float
    interest_coverage: float
    profitability: float
    liquidity: float
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class BorrowerCreate(BorrowerBase):
    pass


class BorrowerResponse(BorrowerBase):
    established_year: Optional[int] = None
