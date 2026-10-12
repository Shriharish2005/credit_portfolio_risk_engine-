"""
Borrower Database Model
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Borrower(Base):
    __tablename__ = "borrowers"

    borrower_id = Column(String(50), primary_key=True, index=True)
    legal_name = Column(String(255), nullable=False)
    sector = Column(String(100), nullable=False, index=True)
    geography = Column(String(100), nullable=False, index=True)
    country = Column(String(100), nullable=False)
    credit_rating = Column(String(20), nullable=False, index=True)
    annual_revenue = Column(Float, default=0.0)
    total_assets = Column(Float, default=0.0)
    leverage = Column(Float, default=0.0)
    debt_ratio = Column(Float, default=0.0)
    interest_coverage = Column(Float, default=0.0)
    profitability = Column(Float, default=0.0)
    liquidity = Column(Float, default=0.0)
    established_year = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    loans = relationship("Loan", back_populates="borrower", cascade="all, delete-orphan")
    financial_statements = relationship("FinancialStatement", back_populates="borrower")
