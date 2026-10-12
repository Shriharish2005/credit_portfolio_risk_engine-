"""
Unit tests for RAROC and Deal Underwriting Engine
"""

import pytest
from backend.risk_engine.pricing.raroc import RAROCEngine


def test_raroc_pricing_and_decision():
    engine = RAROCEngine(hurdle_rate=0.15)

    # High quality obligor with wide spread -> Approved
    res_good = engine.price_facility(
        credit_limit=2_000_000,
        drawn_balance=1_500_000,
        interest_spread_bps=350,
        pd=0.005,
        lgd=0.35,
        maturity_years=3.0,
    )
    assert res_good["raroc_pct"] > 15.0
    assert res_good["is_approved"] is True
    assert res_good["economic_value_added_eva"] > 0

    # Risky obligor with tight spread -> Declined
    res_poor = engine.price_facility(
        credit_limit=2_000_000,
        drawn_balance=1_500_000,
        interest_spread_bps=50,
        pd=0.08,
        lgd=0.60,
        maturity_years=5.0,
    )
    assert res_poor["raroc_pct"] < 15.0
    assert res_poor["is_approved"] is False
    assert res_poor["economic_value_added_eva"] < 0
