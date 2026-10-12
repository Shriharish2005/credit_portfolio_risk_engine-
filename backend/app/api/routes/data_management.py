"""
Data Management API Endpoints
===============================
Comprehensive CRUD-style data access for all customer-facing data categories:
  - Customer Information
  - Loan Information
  - Income & Financials
  - Credit History
  - Existing Liabilities
  - Repayment History
"""

import os
import math
import random
from typing import List, Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, ConfigDict

from backend.app.core.config import settings

router = APIRouter(prefix="/data-management", tags=["Data Management"])

# ---------------------------------------------------------------------------
# Helper – load borrower and loan CSVs once and cache
# ---------------------------------------------------------------------------

_borrowers_cache: Optional[list] = None
_loans_cache: Optional[list] = None


def _load_borrowers() -> list:
    global _borrowers_cache
    if _borrowers_cache is not None:
        return _borrowers_cache
    import pandas as pd
    csv_p = os.path.join(settings.DATA_DIR, "synthetic", "borrowers.csv")
    parquet_p = os.path.join(settings.DATA_DIR, "processed", "borrowers.parquet")
    p = parquet_p if os.path.exists(parquet_p) else csv_p
    if os.path.exists(p):
        df = pd.read_parquet(p) if p.endswith(".parquet") else pd.read_csv(p)
        _borrowers_cache = df.to_dict(orient="records")
        return _borrowers_cache
    return []


def _load_loans() -> list:
    global _loans_cache
    if _loans_cache is not None:
        return _loans_cache
    import pandas as pd
    parquet_p = os.path.join(settings.DATA_DIR, "processed", "loans.parquet")
    csv_p = os.path.join(settings.DATA_DIR, "synthetic", "loans.csv")
    p = parquet_p if os.path.exists(parquet_p) else csv_p
    if os.path.exists(p):
        df = pd.read_parquet(p) if p.endswith(".parquet") else pd.read_csv(p)
        _loans_cache = df.to_dict(orient="records")
        return _loans_cache
    return []


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CustomerInfo(BaseModel):
    customer_id: str
    legal_name: str
    sector: str
    geography: str
    country: str
    credit_rating: str
    established_year: Optional[int] = None
    is_active: bool = True
    model_config = ConfigDict(from_attributes=True)


class LoanInfo(BaseModel):
    loan_id: str
    borrower_id: str
    facility_type: str
    seniority: str
    credit_rating: str
    sector: str
    geography: str
    credit_limit: float
    drawn_balance: float
    utilization_rate: float
    ead: float
    pd: float
    lgd: float
    expected_loss: float
    interest_rate: float
    origination_date: Optional[str] = None
    maturity_date: Optional[str] = None
    status: Optional[str] = "ACTIVE"
    model_config = ConfigDict(from_attributes=True)


class IncomeRecord(BaseModel):
    customer_id: str
    legal_name: str
    annual_revenue: float
    total_assets: float
    profitability: float
    liquidity: float
    interest_coverage: float
    income_tier: str
    model_config = ConfigDict(from_attributes=True)


class CreditHistoryRecord(BaseModel):
    customer_id: str
    legal_name: str
    credit_rating: str
    pd: float
    leverage: float
    debt_ratio: float
    interest_coverage: float
    credit_tier: str
    num_facilities: int
    model_config = ConfigDict(from_attributes=True)


class LiabilityRecord(BaseModel):
    customer_id: str
    legal_name: str
    total_drawn: float
    total_credit_limit: float
    overall_utilization: float
    num_facilities: int
    avg_pd: float
    avg_lgd: float
    total_ead: float
    total_expected_loss: float
    model_config = ConfigDict(from_attributes=True)


class RepaymentRecord(BaseModel):
    loan_id: str
    borrower_id: str
    facility_type: str
    credit_rating: str
    pd: float
    utilization_rate: float
    on_time_pct: float
    missed_payments: int
    days_past_due: int
    repayment_status: str
    model_config = ConfigDict(from_attributes=True)


class PaginatedResponse(BaseModel):
    total: int
    page: int
    page_size: int
    data: list
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Helper derivations
# ---------------------------------------------------------------------------

def _income_tier(revenue: float) -> str:
    if revenue >= 5e9:   return "Large Corporate"
    if revenue >= 1e9:   return "Upper Mid-Market"
    if revenue >= 2e8:   return "Mid-Market"
    if revenue >= 5e7:   return "Lower Mid-Market"
    return "SME"


def _credit_tier(rating: str) -> str:
    if rating in ("AAA", "AA"):  return "Investment Grade – Prime"
    if rating in ("A", "BBB"):   return "Investment Grade"
    if rating in ("BB", "B"):    return "Sub-Investment Grade"
    if rating in ("CCC", "CC"):  return "Distressed"
    return "Default"


def _repayment_status(pd: float, util: float) -> str:
    if pd < 0.01 and util < 0.6:  return "Excellent"
    if pd < 0.03 and util < 0.8:  return "Good"
    if pd < 0.06:                 return "Fair"
    if pd < 0.12:                 return "Watchlist"
    return "Non-Performing"


# ---------------------------------------------------------------------------
# 1. Customer Information
# ---------------------------------------------------------------------------

@router.get("/customers", response_model=PaginatedResponse, summary="Customer Information")
def get_customers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    rating: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
):
    """Return paginated customer (borrower) information."""
    rows = _load_borrowers()
    if not rows:
        raise HTTPException(status_code=503, detail="Borrower data not available")

    # Filters
    if search:
        s = search.lower()
        rows = [r for r in rows if s in str(r.get("borrower_id","")).lower()
                               or s in str(r.get("legal_name","")).lower()]
    if sector:
        rows = [r for r in rows if str(r.get("sector","")).lower() == sector.lower()]
    if rating:
        rows = [r for r in rows if str(r.get("credit_rating","")).upper() == rating.upper()]
    if country:
        rows = [r for r in rows if str(r.get("country","")).lower() == country.lower()]

    total = len(rows)
    skip = (page - 1) * page_size
    sliced = rows[skip: skip + page_size]

    data = [
        CustomerInfo(
            customer_id=str(r.get("borrower_id", "")),
            legal_name=str(r.get("legal_name", "")),
            sector=str(r.get("sector", "")),
            geography=str(r.get("geography", "")),
            country=str(r.get("country", "")),
            credit_rating=str(r.get("credit_rating", "")),
            established_year=r.get("established_year"),
            is_active=bool(r.get("is_active", True)),
        )
        for r in sliced
    ]
    return PaginatedResponse(total=total, page=page, page_size=page_size, data=[d.model_dump() for d in data])


# ---------------------------------------------------------------------------
# 2. Loan Information
# ---------------------------------------------------------------------------

@router.get("/loans", response_model=PaginatedResponse, summary="Loan Information")
def get_loan_data(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    facility_type: Optional[str] = Query(None),
    rating: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
):
    """Return paginated loan / credit facility information."""
    rows = _load_loans()
    if not rows:
        raise HTTPException(status_code=503, detail="Loan data not available")

    if search:
        s = search.lower()
        rows = [r for r in rows if s in str(r.get("loan_id","")).lower()
                               or s in str(r.get("borrower_id","")).lower()]
    if facility_type:
        rows = [r for r in rows if str(r.get("facility_type","")).lower() == facility_type.lower()]
    if rating:
        rows = [r for r in rows if str(r.get("credit_rating","")).upper() == rating.upper()]
    if status:
        rows = [r for r in rows if str(r.get("status","")).lower() == status.lower()]

    total = len(rows)
    skip = (page - 1) * page_size
    sliced = rows[skip: skip + page_size]

    data = [
        LoanInfo(
            loan_id=str(r.get("loan_id","")),
            borrower_id=str(r.get("borrower_id","")),
            facility_type=str(r.get("facility_type","")),
            seniority=str(r.get("seniority","")),
            credit_rating=str(r.get("credit_rating","")),
            sector=str(r.get("sector","")),
            geography=str(r.get("geography","")),
            credit_limit=float(r.get("credit_limit",0)),
            drawn_balance=float(r.get("drawn_balance",0)),
            utilization_rate=float(r.get("utilization_rate",0)),
            ead=float(r.get("ead",0)),
            pd=float(r.get("pd",0)),
            lgd=float(r.get("lgd",0)),
            expected_loss=float(r.get("expected_loss",0)),
            interest_rate=float(r.get("interest_rate",0)),
            origination_date=str(r.get("origination_date","")) if r.get("origination_date") else None,
            maturity_date=str(r.get("maturity_date","")) if r.get("maturity_date") else None,
            status=str(r.get("status","ACTIVE")),
        )
        for r in sliced
    ]
    return PaginatedResponse(total=total, page=page, page_size=page_size, data=[d.model_dump() for d in data])


# ---------------------------------------------------------------------------
# 3. Income & Financials
# ---------------------------------------------------------------------------

@router.get("/income", response_model=PaginatedResponse, summary="Income & Financial Data")
def get_income_data(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    income_tier: Optional[str] = Query(None),
):
    """Return income and financial profile for each borrower."""
    rows = _load_borrowers()
    if not rows:
        raise HTTPException(status_code=503, detail="Borrower data not available")

    if search:
        s = search.lower()
        rows = [r for r in rows if s in str(r.get("borrower_id","")).lower()
                               or s in str(r.get("legal_name","")).lower()]

    records = [
        IncomeRecord(
            customer_id=str(r.get("borrower_id","")),
            legal_name=str(r.get("legal_name","")),
            annual_revenue=float(r.get("annual_revenue",0)),
            total_assets=float(r.get("total_assets",0)),
            profitability=float(r.get("profitability",0)),
            liquidity=float(r.get("liquidity",0)),
            interest_coverage=float(r.get("interest_coverage",0)),
            income_tier=_income_tier(float(r.get("annual_revenue",0))),
        )
        for r in rows
    ]

    if income_tier:
        records = [rec for rec in records if rec.income_tier.lower() == income_tier.lower()]

    total = len(records)
    skip = (page - 1) * page_size
    sliced = records[skip: skip + page_size]
    return PaginatedResponse(total=total, page=page, page_size=page_size, data=[d.model_dump() for d in sliced])


# ---------------------------------------------------------------------------
# 4. Credit History
# ---------------------------------------------------------------------------

@router.get("/credit-history", response_model=PaginatedResponse, summary="Credit History")
def get_credit_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    credit_tier: Optional[str] = Query(None),
    rating: Optional[str] = Query(None),
):
    """Return credit history and scoring profile per borrower."""
    borrowers = _load_borrowers()
    loans = _load_loans()
    if not borrowers:
        raise HTTPException(status_code=503, detail="Data not available")

    # Count facilities per borrower
    facility_count: dict = {}
    for ln in loans:
        bid = str(ln.get("borrower_id",""))
        facility_count[bid] = facility_count.get(bid, 0) + 1

    if search:
        s = search.lower()
        borrowers = [r for r in borrowers if s in str(r.get("borrower_id","")).lower()
                                          or s in str(r.get("legal_name","")).lower()]
    if rating:
        borrowers = [r for r in borrowers if str(r.get("credit_rating","")).upper() == rating.upper()]

    records = [
        CreditHistoryRecord(
            customer_id=str(r.get("borrower_id","")),
            legal_name=str(r.get("legal_name","")),
            credit_rating=str(r.get("credit_rating","")),
            pd=float(r.get("pd", 0) if "pd" in r else 0.02),
            leverage=float(r.get("leverage",0)),
            debt_ratio=float(r.get("debt_ratio",0)),
            interest_coverage=float(r.get("interest_coverage",0)),
            credit_tier=_credit_tier(str(r.get("credit_rating","B"))),
            num_facilities=facility_count.get(str(r.get("borrower_id","")), 0),
        )
        for r in borrowers
    ]

    if credit_tier:
        records = [rec for rec in records if credit_tier.lower() in rec.credit_tier.lower()]

    total = len(records)
    skip = (page - 1) * page_size
    sliced = records[skip: skip + page_size]
    return PaginatedResponse(total=total, page=page, page_size=page_size, data=[d.model_dump() for d in sliced])


# ---------------------------------------------------------------------------
# 5. Existing Liabilities
# ---------------------------------------------------------------------------

@router.get("/liabilities", response_model=PaginatedResponse, summary="Existing Liabilities")
def get_liabilities(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    min_ead: Optional[float] = Query(None),
    max_ead: Optional[float] = Query(None),
):
    """Return aggregate liability exposure per borrower across all facilities."""
    borrowers = _load_borrowers()
    loans = _load_loans()
    if not borrowers or not loans:
        raise HTTPException(status_code=503, detail="Data not available")

    # Aggregate loans by borrower
    from collections import defaultdict
    agg: dict = defaultdict(lambda: {
        "total_drawn": 0.0, "total_credit_limit": 0.0,
        "total_ead": 0.0, "total_el": 0.0,
        "pd_sum": 0.0, "lgd_sum": 0.0, "count": 0
    })

    borrower_names: dict = {str(r.get("borrower_id","")): str(r.get("legal_name","")) for r in borrowers}

    for ln in loans:
        bid = str(ln.get("borrower_id",""))
        a = agg[bid]
        a["total_drawn"]        += float(ln.get("drawn_balance", 0))
        a["total_credit_limit"] += float(ln.get("credit_limit", 0))
        a["total_ead"]          += float(ln.get("ead", 0))
        a["total_el"]           += float(ln.get("expected_loss", 0))
        a["pd_sum"]             += float(ln.get("pd", 0))
        a["lgd_sum"]            += float(ln.get("lgd", 0))
        a["count"]              += 1

    records = []
    for bid, a in agg.items():
        n = a["count"]
        util = a["total_drawn"] / a["total_credit_limit"] if a["total_credit_limit"] > 0 else 0.0
        rec = LiabilityRecord(
            customer_id=bid,
            legal_name=borrower_names.get(bid, bid),
            total_drawn=a["total_drawn"],
            total_credit_limit=a["total_credit_limit"],
            overall_utilization=round(util, 4),
            num_facilities=n,
            avg_pd=round(a["pd_sum"] / n, 4) if n else 0.0,
            avg_lgd=round(a["lgd_sum"] / n, 4) if n else 0.0,
            total_ead=a["total_ead"],
            total_expected_loss=a["total_el"],
        )
        records.append(rec)

    if search:
        s = search.lower()
        records = [r for r in records if s in r.customer_id.lower() or s in r.legal_name.lower()]
    if min_ead is not None:
        records = [r for r in records if r.total_ead >= min_ead]
    if max_ead is not None:
        records = [r for r in records if r.total_ead <= max_ead]

    # Sort by EAD descending
    records.sort(key=lambda r: r.total_ead, reverse=True)

    total = len(records)
    skip = (page - 1) * page_size
    sliced = records[skip: skip + page_size]
    return PaginatedResponse(total=total, page=page, page_size=page_size, data=[d.model_dump() for d in sliced])


# ---------------------------------------------------------------------------
# 6. Repayment History
# ---------------------------------------------------------------------------

@router.get("/repayment-history", response_model=PaginatedResponse, summary="Repayment History")
def get_repayment_history(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    rating: Optional[str] = Query(None),
):
    """Return simulated repayment performance history per loan."""
    rows = _load_loans()
    if not rows:
        raise HTTPException(status_code=503, detail="Loan data not available")

    rng = random.Random(42)

    def _simulate_repayment(r: dict) -> RepaymentRecord:
        pd_val = float(r.get("pd", 0.02))
        util   = float(r.get("utilization_rate", 0.5))
        # Derive repayment quality from PD and utilization
        base_on_time = max(0.0, min(1.0, 1.0 - pd_val * 6 - util * 0.15 + rng.gauss(0, 0.03)))
        missed = max(0, int(rng.gauss(pd_val * 18, 1.5)))
        dpd    = max(0, int(rng.gauss(pd_val * 120, 10)))
        status = _repayment_status(pd_val, util)
        return RepaymentRecord(
            loan_id=str(r.get("loan_id","")),
            borrower_id=str(r.get("borrower_id","")),
            facility_type=str(r.get("facility_type","")),
            credit_rating=str(r.get("credit_rating","")),
            pd=pd_val,
            utilization_rate=util,
            on_time_pct=round(base_on_time * 100, 1),
            missed_payments=missed,
            days_past_due=dpd,
            repayment_status=status,
        )

    records = [_simulate_repayment(r) for r in rows]

    if search:
        s = search.lower()
        records = [r for r in records if s in r.loan_id.lower() or s in r.borrower_id.lower()]
    if rating:
        records = [r for r in records if r.credit_rating.upper() == rating.upper()]
    if status:
        records = [r for r in records if r.repayment_status.lower() == status.lower()]

    total = len(records)
    skip = (page - 1) * page_size
    sliced = records[skip: skip + page_size]
    return PaginatedResponse(total=total, page=page, page_size=page_size, data=[d.model_dump() for d in sliced])


# ---------------------------------------------------------------------------
# Summary endpoint (overview stats for all 6 categories)
# ---------------------------------------------------------------------------

@router.get("/summary", summary="Data Management Summary")
def get_data_summary():
    """Return counts and key stats across all 6 data management categories."""
    borrowers = _load_borrowers()
    loans = _load_loans()
    return {
        "customers": {
            "total": len(borrowers),
            "sectors": len(set(str(r.get("sector","")) for r in borrowers)),
            "countries": len(set(str(r.get("country","")) for r in borrowers)),
            "active": sum(1 for r in borrowers if r.get("is_active", True)),
        },
        "loans": {
            "total": len(loans),
            "facility_types": len(set(str(r.get("facility_type","")) for r in loans)),
            "total_exposure": sum(float(r.get("ead",0)) for r in loans),
            "total_expected_loss": sum(float(r.get("expected_loss",0)) for r in loans),
        },
        "income": {
            "total_records": len(borrowers),
            "avg_revenue": round(sum(float(r.get("annual_revenue",0)) for r in borrowers) / max(len(borrowers),1), 2),
            "avg_profitability": round(sum(float(r.get("profitability",0)) for r in borrowers) / max(len(borrowers),1), 4),
        },
        "credit_history": {
            "total_records": len(borrowers),
            "avg_pd": round(sum(float(r.get("pd",0.02)) for r in borrowers) / max(len(borrowers),1), 4) if borrowers else 0,
            "ratings_distribution": {
                rating: sum(1 for r in borrowers if str(r.get("credit_rating","")) == rating)
                for rating in ["AAA","AA","A","BBB","BB","B","CCC","CC","D"]
            },
        },
        "liabilities": {
            "total_borrowers_with_loans": len(set(str(r.get("borrower_id","")) for r in loans)),
            "total_drawn": sum(float(r.get("drawn_balance",0)) for r in loans),
            "total_credit_limit": sum(float(r.get("credit_limit",0)) for r in loans),
        },
        "repayment": {
            "total_loan_records": len(loans),
            "avg_pd": round(sum(float(r.get("pd",0)) for r in loans) / max(len(loans),1), 4) if loans else 0,
        },
    }
