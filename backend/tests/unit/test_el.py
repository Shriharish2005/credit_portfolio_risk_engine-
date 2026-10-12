"""
Unit Tests for Expected Loss (EL) calculations.
Formula: EL = PD * LGD * EAD
Portfolio EL: sum(PD * LGD * EAD)
"""

import pytest
import numpy as np
from backend.risk_engine.expected_loss.el_calculator import ExpectedLossCalculator


def test_single_expected_loss():
    # 2% PD, 40% LGD, $1,000,000 EAD => EL = 0.02 * 0.40 * 1,000,000 = $8,000
    el = ExpectedLossCalculator.calculate_single_el(pd=0.02, lgd=0.40, ead=1_000_000.0)
    assert el == pytest.approx(8000.0, rel=1e-5)


def test_single_expected_loss_boundary_values():
    # Zero PD -> Zero EL
    assert ExpectedLossCalculator.calculate_single_el(pd=0.0, lgd=0.45, ead=500_000.0) == 0.0
    # Zero LGD -> Zero EL
    assert ExpectedLossCalculator.calculate_single_el(pd=0.05, lgd=0.0, ead=500_000.0) == 0.0
    # 100% PD, 100% LGD -> EL = EAD
    assert ExpectedLossCalculator.calculate_single_el(pd=1.0, lgd=1.0, ead=250_000.0) == 250_000.0


def test_portfolio_expected_loss():
    # 3 facilities
    pds = [0.01, 0.03, 0.05]
    lgds = [0.30, 0.45, 0.60]
    eads = [1_000_000.0, 2_000_000.0, 500_000.0]

    # Individual EL:
    # 1: 0.01 * 0.30 * 1,000,000 = 3,000
    # 2: 0.03 * 0.45 * 2,000,000 = 27,000
    # 3: 0.05 * 0.60 * 500,000   = 15,000
    # Total EL = 45,000
    # Total EAD = 3,500,000
    # Weighted PD = (0.01*1M + 0.03*2M + 0.05*0.5M) / 3.5M = 95,000 / 3,500,000 = ~0.02714
    # Weighted LGD = (0.30*1M + 0.45*2M + 0.60*0.5M) / 3.5M = 1,500,000 / 3,500,000 = ~0.42857

    res = ExpectedLossCalculator.calculate_portfolio_el(pds, lgds, eads)
    assert res["total_expected_loss"] == pytest.approx(45000.0, rel=1e-5)
    assert res["total_ead"] == pytest.approx(3_500_000.0, rel=1e-5)
    assert res["weighted_pd"] == pytest.approx(0.0271428, rel=1e-3)
    assert res["weighted_lgd"] == pytest.approx(0.4285714, rel=1e-3)
    assert res["el_rate"] == pytest.approx(45000.0 / 3_500_000.0, rel=1e-5)
    assert res["facility_count"] == 3
