"""
Loan Repository and High-Performance Portfolio Data Loader.
Supports database queries and accelerated Parquet/CSV memory loading for risk calculations.
"""

import os
from typing import Dict, List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.db.models.loan import Loan


class LoanRepository:

    def __init__(self, db: Optional[Session] = None):
        self.db = db
        self._cached_df: Optional[pd.DataFrame] = None

    def get_by_id(self, loan_id: str) -> Optional[Loan]:
        if not self.db:
            return None
        return self.db.query(Loan).filter(Loan.loan_id == loan_id).first()

    def list_loans(self, skip: int = 0, limit: int = 100) -> List[Loan]:
        if not self.db:
            return []
        return self.db.query(Loan).offset(skip).limit(limit).all()

    def get_portfolio_dataframe(self, max_records: Optional[int] = None) -> pd.DataFrame:
        """
        Retrieves portfolio dataframe for the quantitative risk engine.
        Reads from high-performance Parquet cache or CSV if DB is empty or during fast risk sweeps.
        """
        if self._cached_df is not None:
            if max_records and len(self._cached_df) > max_records:
                return self._cached_df.iloc[:max_records]
            return self._cached_df

        # Try Parquet first
        parquet_path = os.path.join(settings.DATA_DIR, "processed", "loans.parquet")
        csv_path = os.path.join(settings.DATA_DIR, "synthetic", "loans.csv")

        if os.path.exists(parquet_path):
            try:
                df = pd.read_parquet(parquet_path)
                self._cached_df = df
                if max_records:
                    return df.iloc[:max_records]
                return df
            except Exception as e:
                logger.warning(f"Failed to read parquet loans: {e}")

        if os.path.exists(csv_path):
            df = pd.read_csv(csv_path)
            self._cached_df = df
            if max_records:
                return df.iloc[:max_records]
            return df

        # Fallback to DB
        if self.db:
            loans = self.db.query(Loan).all()
            if loans:
                data = [{
                    "loan_id": l.loan_id,
                    "borrower_id": l.borrower_id,
                    "facility_type": l.facility_type,
                    "seniority": l.seniority,
                    "credit_rating": l.credit_rating,
                    "sector": l.sector,
                    "geography": l.geography,
                    "credit_limit": l.credit_limit,
                    "drawn_balance": l.drawn_balance,
                    "utilization_rate": l.utilization_rate,
                    "ccf": l.ccf,
                    "ead": l.ead,
                    "pd": l.pd,
                    "lgd": l.lgd,
                    "expected_loss": l.expected_loss,
                    "interest_rate": l.interest_rate,
                } for l in loans]
                df = pd.DataFrame(data)
                self._cached_df = df
                return df

        return pd.DataFrame()
