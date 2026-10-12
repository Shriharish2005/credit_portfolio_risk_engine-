"""
Borrower API Endpoints
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.repositories.borrower_repo import BorrowerRepository
from backend.app.schemas.borrower import BorrowerResponse

router = APIRouter(prefix="/borrowers", tags=["Borrowers"])


@router.get("", response_model=List[BorrowerResponse])
def get_borrowers(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
):
    """Retrieve list of obligors / borrowers."""
    repo = BorrowerRepository(db)
    borrowers = repo.list_borrowers(skip=skip, limit=limit)
    if not borrowers:
        # Fallback to reading from synthetic CSV if DB empty
        import os
        import pandas as pd
        from backend.app.core.config import settings
        csv_p = os.path.join(settings.DATA_DIR, "synthetic", "borrowers.csv")
        if os.path.exists(csv_p):
            df = pd.read_csv(csv_p).iloc[skip : skip + limit]
            return [BorrowerResponse(**row.to_dict()) for _, row in df.iterrows()]
    return borrowers


@router.get("/{borrower_id}", response_model=BorrowerResponse)
def get_borrower(borrower_id: str, db: Session = Depends(get_db)):
    """Retrieve single borrower details."""
    repo = BorrowerRepository(db)
    borrower = repo.get_by_id(borrower_id)
    if not borrower:
        import os
        import pandas as pd
        from backend.app.core.config import settings
        csv_p = os.path.join(settings.DATA_DIR, "synthetic", "borrowers.csv")
        if os.path.exists(csv_p):
            df = pd.read_csv(csv_p)
            match = df[df["borrower_id"] == borrower_id]
            if not match.empty:
                return BorrowerResponse(**match.iloc[0].to_dict())
        raise HTTPException(status_code=404, detail=f"Borrower {borrower_id} not found")
    return borrower
