"""
Loan and Facility Database Model
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Loan(Base):
    __tablename__ = "loans"

    loan_id = Column(String(50), primary_key=True, index=True)
    borrower_id = Column(String(50), ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    facility_type = Column(String(50), nullable=False)  # TERM_LOAN, REVOLVING_CREDIT, etc.
    seniority = Column(String(50), nullable=False)      # SENIOR_SECURED, SENIOR_UNSECURED, etc.
    credit_rating = Column(String(20), nullable=False, index=True)
    sector = Column(String(100), nullable=False, index=True)
    geography = Column(String(100), nullable=False, index=True)
    credit_limit = Column(Float, nullable=False, default=0.0)
    drawn_balance = Column(Float, nullable=False, default=0.0)
    utilization_rate = Column(Float, default=0.0)
    ccf = Column(Float, default=0.5)
    ead = Column(Float, nullable=False, default=0.0)
    pd = Column(Float, nullable=False, default=0.01)
    lgd = Column(Float, nullable=False, default=0.45)
    expected_loss = Column(Float, nullable=False, default=0.0)
    interest_rate = Column(Float, default=0.05)
    origination_date = Column(String(20), nullable=True)
    maturity_date = Column(String(20), nullable=True)
    tenor_months = Column(Integer, default=36)
    status = Column(String(30), default="ACTIVE", index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    borrower = relationship("Borrower", back_populates="loans")
    collateral = relationship("Collateral", back_populates="loan", uselist=False)
    payments = relationship("Payment", back_populates="loan")
