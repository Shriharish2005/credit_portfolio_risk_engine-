"""
Credit Rating Scale and History Models
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, ForeignKey, DateTime
from backend.app.db.session import Base


class Rating(Base):
    __tablename__ = "ratings"

    rating_code = Column(String(20), primary_key=True, index=True)  # AAA, AA, A, BBB, etc.
    ordinal_rank = Column(Integer, nullable=False, unique=True)
    baseline_pd = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    is_investment_grade = Column(Boolean, default=True)


class RatingHistory(Base):
    __tablename__ = "ratings_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    borrower_id = Column(String(50), ForeignKey("borrowers.borrower_id", ondelete="CASCADE"), nullable=False, index=True)
    review_date = Column(String(20), nullable=False)
    initial_rating = Column(String(20), nullable=False)
    final_rating = Column(String(20), nullable=False)
    is_upgrade = Column(Boolean, default=False)
    is_downgrade = Column(Boolean, default=False)
    is_unchanged = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
