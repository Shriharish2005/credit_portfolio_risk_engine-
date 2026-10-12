"""
Unit tests for Basel III/IV IRB Capital Engine
"""

import pytest
import numpy as np
from backend.risk_engine.regulatory.basel_rwa import BaselCapitalEngine


def test_asset_correlation_bounds():
    engine = BaselCapitalEngine()
    # For corporate exposures, R is strictly between 0.12 and 0.24
    low_pd_r = engine.calculate_asset_correlation(0.0003)
    high_pd_r = engine.calculate_asset_correlation(0.30)

    assert 0.12 <= low_pd_r <= 0.24
    assert 0.12 <= high_pd_r <= 0.24
    # Lower PD should have higher systemic correlation R
    assert low_pd_r > high_pd_r


def test_maturity_adjustment_monotonicity():
    engine = BaselCapitalEngine()
    pd = 0.02
    mult_1y = engine.calculate_maturity_adjustment(pd, 1.0)
    mult_3y = engine.calculate_maturity_adjustment(pd, 3.0)
    mult_5y = engine.calculate_maturity_adjustment(pd, 5.0)

    assert mult_1y < mult_3y < mult_5y


def test_capital_factor_k_and_rwa_positive():
    engine = BaselCapitalEngine()
    res = engine.calculate_facility_rwa(pd=0.015, lgd=0.45, ead=1_000_000.0, maturity_years=2.5)

    assert res["capital_factor_k"] > 0
    assert res["rwa"] > 0
    assert res["min_capital_8pct"] == pytest.approx(res["rwa"] * 0.08, rel=1e-3)
    assert res["total_capital_with_ccb"] == pytest.approx(res["rwa"] * 0.105, rel=1e-3)


def test_portfolio_rwa_aggregation():
    engine = BaselCapitalEngine()
    pds = np.array([0.001, 0.01, 0.05])
    lgds = np.array([0.30, 0.40, 0.50])
    eads = np.array([1_000_000.0, 2_000_000.0, 500_000.0])

    port = engine.calculate_portfolio_rwa(pds, lgds, eads)

    assert port["total_ead"] == 3_500_000.0
    assert port["total_rwa"] > 0
    assert port["pillar_1_minimum_capital"] == pytest.approx(port["total_rwa"] * 0.08, rel=1e-3)
