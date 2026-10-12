"""
Borrower Repository for database access and portfolio slicing.
"""

from typing import List, Optional
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.db.models.borrower import Borrower


class BorrowerRepository:

    def __init__(self, db: Optional[Session] = None):
        self.db = db

    def get_by_id(self, borrower_id: str) -> Optional[Borrower]:
        if not self.db:
            return None
        return self.db.query(Borrower).filter(Borrower.borrower_id == borrower_id).first()

    def list_borrowers(self, skip: int = 0, limit: int = 100) -> List[Borrower]:
        if not self.db:
            return []
        return self.db.query(Borrower).offset(skip).limit(limit).all()

    def count(self) -> int:
        if not self.db:
            return 0
        return self.db.query(Borrower).count()
