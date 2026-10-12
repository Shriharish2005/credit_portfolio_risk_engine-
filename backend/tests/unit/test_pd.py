"""
Unit Tests for Probability of Default (PD) Models.
Verifies monotonicity and risk sensitivity.
"""

import pytest
from backend.risk_engine.pd.rating_pd import RatingPDMapper
from backend.risk_engine.pd.logistic_pd import LogisticPDModel


def test_rating_scale_monotonicity():
    mapper = RatingPDMapper()
    ratings = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "Default"]
    pds = [mapper.get_pd(r) for r in ratings]

    # Strictly monotonically increasing default risk
    for i in range(len(pds) - 1):
        assert pds[i] < pds[i + 1], f"Expected PD({ratings[i]}) < PD({ratings[i+1]}), got {pds[i]} >= {pds[i+1]}"

    assert mapper.get_pd("Default") == 1.0


def test_ttc_to_pit_adjustment():
    mapper = RatingPDMapper()
    ttc_pd = 0.02
    # Favorable economic climate (macro_factor = +1.5 standard deviations) -> PIT PD decreases
    pit_good = mapper.ttc_to_pit(ttc_pd, macro_factor=1.5, sensitivity=0.20)
    assert pit_good < ttc_pd

    # Recessionary stress (macro_factor = -2.0 standard deviations) -> PIT PD increases
    pit_bad = mapper.ttc_to_pit(ttc_pd, macro_factor=-2.0, sensitivity=0.20)
    assert pit_bad > ttc_pd


def test_logistic_pd_risk_factor_sensitivity():
    model = LogisticPDModel(calibrate=False, random_state=42)

    base_obligor = {
        "leverage": 1.5,
        "debt_ratio": 0.35,
        "interest_coverage": 6.0,
        "profitability": 0.15,
        "liquidity": 2.5,
        "unemployment_rate": 4.5,
        "interest_rate": 5.0,
    }

    high_risk_obligor = {
        "leverage": 6.5,               # Elevated leverage
        "debt_ratio": 0.85,            # High debt burden
        "interest_coverage": 0.8,      # Strained coverage
        "profitability": -0.08,        # Negative profitability
        "liquidity": 0.7,              # Depleted liquidity
        "unemployment_rate": 11.0,     # Recessionary unemployment
        "interest_rate": 9.5,          # High interest rate
    }

    base_pd = float(model.predict_pd(base_obligor)[0])
    high_risk_pd = float(model.predict_pd(high_risk_obligor)[0])

    assert high_risk_pd > base_pd, f"Expected high risk PD ({high_risk_pd}) > base PD ({base_pd})"
    assert 0.0001 <= base_pd <= 0.9999
    assert 0.0001 <= high_risk_pd <= 0.9999
