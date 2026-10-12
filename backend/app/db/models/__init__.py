"""
Database models export package.
Registers all SQLAlchemy models for Alembic and application queries.
"""

from backend.app.db.session import Base
from backend.app.db.models.borrower import Borrower
from backend.app.db.models.loan import Loan
from backend.app.db.models.collateral import Collateral
from backend.app.db.models.rating import Rating, RatingHistory
from backend.app.db.models.financial import FinancialStatement, Payment, DefaultRecord
from backend.app.db.models.risk import (
    RiskParameter,
    Scenario,
    SimulationRun,
    SimulationResult,
    RiskResult,
    ModelVersion,
    ModelValidation,
)
from backend.app.db.models.auth import User, Role, AuditLog

__all__ = [
    "Base",
    "Borrower",
    "Loan",
    "Collateral",
    "Rating",
    "RatingHistory",
    "FinancialStatement",
    "Payment",
    "DefaultRecord",
    "RiskParameter",
    "Scenario",
    "SimulationRun",
    "SimulationResult",
    "RiskResult",
    "ModelVersion",
    "ModelValidation",
    "User",
    "Role",
    "AuditLog",
]
