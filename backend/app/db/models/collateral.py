"""
Collateral Database Model
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Collateral(Base):
    __tablename__ = "collateral"

    collateral_id = Column(String(50), primary_key=True, index=True)
    loan_id = Column(String(50), ForeignKey("loans.loan_id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    collateral_type = Column(String(50), nullable=False)
    valuation_amount = Column(Float, nullable=False, default=0.0)
    valuation_currency = Column(String(10), default="USD")
    haircut = Column(Float, nullable=False, default=0.25)
    valuation_date = Column(String(20), nullable=True)
    is_perfected = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    loan = relationship("Loan", back_populates="collateral")
