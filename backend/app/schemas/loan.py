"""
Loan Schemas
"""

from typing import Optional
from pydantic import BaseModel, ConfigDict


class LoanBase(BaseModel):
    loan_id: str
    borrower_id: str
    facility_type: str
    seniority: str
    credit_rating: str
    sector: str
    geography: str
    credit_limit: float
    drawn_balance: float
    utilization_rate: float
    ccf: float
    ead: float
    pd: float
    lgd: float
    expected_loss: float
    interest_rate: float

    model_config = ConfigDict(from_attributes=True)


class LoanCreate(LoanBase):
    pass


class LoanResponse(LoanBase):
    origination_date: Optional[str] = None
    maturity_date: Optional[str] = None
    tenor_months: Optional[int] = 36
    status: Optional[str] = "ACTIVE"
