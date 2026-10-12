"""
Financial Statements, Payments, and Defaults Database Models
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class FinancialStatement(Base):
    __tablename__ = "financial_statements"

    statement_id = Column(String(100), primary_key=True, index=True)
    borrower_id = Column(String(50), ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    fiscal_year = Column(Integer, nullable=False)
    period_end_date = Column(String(20), nullable=False)
    revenue = Column(Float, default=0.0)
    ebitda = Column(Float, default=0.0)
    interest_expense = Column(Float, default=0.0)
    total_assets = Column(Float, default=0.0)
    total_debt = Column(Float, default=0.0)
    total_equity = Column(Float, default=0.0)
    current_assets = Column(Float, default=0.0)
    current_liabilities = Column(Float, default=0.0)
    operating_cash_flow = Column(Float, default=0.0)
    audit_opinion = Column(String(100), default="UNQUALIFIED")
    created_at = Column(DateTime, default=datetime.utcnow)

    borrower = relationship("Borrower", back_populates="financial_statements")


class Payment(Base):
    __tablename__ = "payments"

    payment_id = Column(String(50), primary_key=True, index=True)
    loan_id = Column(String(50), ForeignKey("loans.loan_id", ondelete="CASCADE"), nullable=False, index=True)
    borrower_id = Column(String(50), ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    due_date = Column(String(20), nullable=False)
    payment_date = Column(String(20), nullable=True)
    scheduled_amount = Column(Float, default=0.0)
    actual_amount_paid = Column(Float, default=0.0)
    days_past_due = Column(Integer, default=0)
    status = Column(String(30), default="PAID")  # PAID, DELINQUENT, DEFAULTED
    created_at = Column(DateTime, default=datetime.utcnow)

    loan = relationship("Loan", back_populates="payments")


class DefaultRecord(Base):
    __tablename__ = "defaults"

    default_id = Column(String(50), primary_key=True, index=True)
    loan_id = Column(String(50), nullable=False, index=True)
    borrower_id = Column(String(50), nullable=False, index=True)
    default_date = Column(String(20), nullable=False)
    default_trigger = Column(String(100), nullable=False)
    exposure_at_default = Column(Float, nullable=False, default=0.0)
    recovery_amount = Column(Float, default=0.0)
    realized_loss = Column(Float, default=0.0)
    recovery_rate = Column(Float, default=0.0)
    resolution_status = Column(String(50), default="RESOLVED")
    created_at = Column(DateTime, default=datetime.utcnow)
