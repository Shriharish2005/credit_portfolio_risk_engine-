"""
Unit Tests for Concentration Risk and Herfindahl-Hirschman Index (HHI).
Verifies known theoretical benchmarks and Gini coefficient calculations.
"""

import pytest
import numpy as np
import pandas as pd
from backend.risk_engine.concentration.hhi_calculator import ConcentrationEngine


def test_hhi_known_theoretical_benchmarks():
    # 1. Monopoly / Single Obligor: 100% share => HHI = 1.0
    shares_monopoly = [1.0]
    hhi_single = ConcentrationEngine.calculate_hhi(shares_monopoly)
    assert hhi_single == pytest.approx(1.0, rel=1e-5)

    # 2. Quad-equal obligors: 4 entities at 25% each => HHI = 4 * 0.0625 = 0.25 (2,500 bps)
    shares_four = [0.25, 0.25, 0.25, 0.25]
    hhi_four = ConcentrationEngine.calculate_hhi(shares_four)
    assert hhi_four == pytest.approx(0.25, rel=1e-5)

    # 3. 100 perfectly granular obligors at 1% each => HHI = 100 * (0.01^2) = 0.01 (100 bps)
    shares_100 = [0.01] * 100
    hhi_100 = ConcentrationEngine.calculate_hhi(shares_100)
    assert hhi_100 == pytest.approx(0.01, rel=1e-5)


def test_gini_coefficient():
    # Equal distribution -> Gini = 0.0
    equal_exp = [100.0] * 50
    assert ConcentrationEngine.calculate_gini(equal_exp) == pytest.approx(0.0, abs=1e-3)

    # Highly unequal distribution (one obligor has 99.9% of portfolio)
    skewed_exp = [1.0] * 99 + [100_000.0]
    assert ConcentrationEngine.calculate_gini(skewed_exp) > 0.90


def test_portfolio_concentration_audit():
    df = pd.DataFrame({
        "borrower_id": ["B1", "B2", "B3", "B4"],
        "ead": [400_000.0, 300_000.0, 200_000.0, 100_000.0],
        "sector": ["Tech", "Tech", "Energy", "Energy"],
        "geography": ["US", "US", "US", "EU"],
    })
    # Total EAD = 1,000,000
    # Borrower shares: 0.40, 0.30, 0.20, 0.10
    # Borrower HHI = 0.16 + 0.09 + 0.04 + 0.01 = 0.30 (3,000 bps)
    # Sector shares: Tech = 700k (0.70), Energy = 300k (0.30) => Sector HHI = 0.49 + 0.09 = 0.58
    # Geography shares: US = 900k (0.90), EU = 100k (0.10) => Geo HHI = 0.81 + 0.01 = 0.82

    res = ConcentrationEngine.analyze_portfolio_concentration(df)
    assert res["total_exposure"] == 1_000_000.0
    assert res["hhi_borrower"] == pytest.approx(0.30, rel=1e-4)
    assert res["hhi_borrower_bps"] == pytest.approx(3000.0, rel=1e-3)
    assert res["effective_obligors"] == pytest.approx(1.0 / 0.30, abs=0.1)
    assert res["hhi_sector"] == pytest.approx(0.58, rel=1e-4)
    assert res["hhi_geography"] == pytest.approx(0.82, rel=1e-4)
