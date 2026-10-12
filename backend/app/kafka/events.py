from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime

class CreditEventType(str, Enum):
    LOAN_CREATED = "LOAN_CREATED"
    PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
    PAYMENT_MISSED = "PAYMENT_MISSED"
    UTILIZATION_CHANGED = "UTILIZATION_CHANGED"
    INCOME_CHANGED = "INCOME_CHANGED"
    DEFAULT_EVENT = "DEFAULT_EVENT"

class CreditEvent(BaseModel):
    event_id: str
    event_type: CreditEventType
    loan_id: str
    borrower_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    payload: dict = Field(default_factory=dict)
    
    # Examples of payload contents based on event_type:
    # PAYMENT_RECEIVED: {"amount": 1500.0, "new_balance": 98500.0}
    # PAYMENT_MISSED: {"days_past_due": 30, "missed_amount": 1500.0}
    # UTILIZATION_CHANGED: {"new_utilization_rate": 0.85, "drawn_balance": 8500.0}
    # DEFAULT_EVENT: {"reason": "90_DAYS_PAST_DUE", "recovery_estimate": 0.4}
    # INCOME_CHANGED: {"new_annual_revenue": 1200000.0}
    # LOAN_CREATED: {"credit_limit": 100000.0, "interest_rate": 0.05}
