"""
Loans and Credit Facilities API Endpoints
"""

from typing import List, Optional
import os
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from backend.app.db.session import get_db
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.app.schemas.loan import LoanResponse
from backend.app.core.config import settings

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.get("", response_model=List[LoanResponse])
def get_loans(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    search: Optional[str] = Query(None, description="Search by loan_id or borrower_id"),
    rating: Optional[str] = Query(None, description="Filter by Basel credit rating"),
    facility_type: Optional[str] = Query(None, description="Filter by facility type"),
    sort_by: Optional[str] = Query("ead", description="Column to sort by: ead, expected_loss, pd, interest_rate"),
    order: Optional[str] = Query("desc", description="asc or desc"),
    db: Session = Depends(get_db),
):
    """Retrieve list of credit facilities with search, filter, and sorting capabilities."""
    parquet_p = os.path.join(settings.DATA_DIR, "processed", "loans.parquet")
    csv_p = os.path.join(settings.DATA_DIR, "synthetic", "loans.csv")
    p = parquet_p if os.path.exists(parquet_p) else csv_p

    if os.path.exists(p):
        df = pd.read_parquet(p) if p.endswith(".parquet") else pd.read_csv(p)

        # Filters
        if search:
            s = search.strip().lower()
            df = df[
                df["loan_id"].astype(str).str.lower().str.contains(s)
                | df["borrower_id"].astype(str).str.lower().str.contains(s)
            ]

        if rating:
            df = df[df["credit_rating"] == rating.strip().upper()]

        if facility_type:
            df = df[df["facility_type"].str.lower() == facility_type.strip().lower()]

        # Sorting
        if sort_by in df.columns:
            ascending = (order.lower() == "asc")
            df = df.sort_values(by=sort_by, ascending=ascending)

        sliced = df.iloc[skip : skip + limit]
        return [LoanResponse(**row.to_dict()) for _, row in sliced.iterrows()]

    repo = LoanRepository(db)
    return repo.list_loans(skip=skip, limit=limit)


@router.get("/{loan_id}", response_model=LoanResponse)
def get_loan(loan_id: str, db: Session = Depends(get_db)):
    """Retrieve single loan facility details."""
    parquet_p = os.path.join(settings.DATA_DIR, "processed", "loans.parquet")
    csv_p = os.path.join(settings.DATA_DIR, "synthetic", "loans.csv")
    p = parquet_p if os.path.exists(parquet_p) else csv_p

    if os.path.exists(p):
        df = pd.read_parquet(p) if p.endswith(".parquet") else pd.read_csv(p)
        match = df[df["loan_id"] == loan_id]
        if not match.empty:
            return LoanResponse(**match.iloc[0].to_dict())

    repo = LoanRepository(db)
    loan = repo.get_by_id(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail=f"Loan {loan_id} not found")
    return loan
