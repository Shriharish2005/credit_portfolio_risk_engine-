"""
Unit Tests for Exposure at Default (EAD) calculations.
Verifies CCF multipliers and non-negativity guarantees.
"""

import pytest
from backend.risk_engine.ead.ead_model import EADModel


def test_term_loan_ead():
    model = EADModel()
    # Term loan has CCF = 0.0 -> EAD is strictly the drawn balance
    ead = model.calculate_single_ead(
        drawn_balance=400_000.0,
        credit_limit=500_000.0,
        facility_type="TERM_LOAN",
    )
    assert ead == 400_000.0


def test_revolving_credit_ead():
    model = EADModel()
    # Revolving credit has default CCF = 0.50
    # Drawn = 600,000, Limit = 1,000,000, Undrawn = 400,000
    # EAD = 600,000 + 0.50 * 400,000 = 800,000
    ead = model.calculate_single_ead(
        drawn_balance=600_000.0,
        credit_limit=1_000_000.0,
        facility_type="REVOLVING_CREDIT",
    )
    assert ead == pytest.approx(800_000.0, rel=1e-5)


def test_ead_non_negativity_and_overdrawn():
    model = EADModel()
    # Drawn balance exceeds limit (overdraft)
    ead = model.calculate_single_ead(
        drawn_balance=1_200_000.0,
        credit_limit=1_000_000.0,
        facility_type="COMMERCIAL_LINE",
    )
    assert ead == 1_200_000.0
    assert ead >= 0.0
