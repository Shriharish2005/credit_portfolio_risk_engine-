"""
Unit Tests for Loss Given Default (LGD) calculations.
Verifies boundary conditions and collateral / seniority logic.
"""

import pytest
from backend.risk_engine.lgd.lgd_model import LGDModel


def test_lgd_boundary_guarantees():
    model = LGDModel()

    # Extreme high collateral (10x exposure)
    lgd_low = model.calculate_single_lgd(
        exposure=100_000.0,
        collateral_value=1_000_000.0,
        collateral_type="CASH",
        seniority="SENIOR_SECURED",
    )
    assert 0.0 <= lgd_low <= 1.0
    assert lgd_low == 0.0  # Fully secured by cash with 0 haircut => 100% recovery

    # Zero collateral unsecured junior debt
    lgd_high = model.calculate_single_lgd(
        exposure=100_000.0,
        collateral_value=0.0,
        collateral_type="UNSECURED",
        seniority="JUNIOR",
    )
    assert 0.0 <= lgd_high <= 1.0
    assert lgd_high == pytest.approx(0.90, rel=1e-3)  # 10% junior recovery => 90% LGD


def test_higher_collateral_produces_lower_lgd():
    model = LGDModel()
    exposure = 1_000_000.0

    lgd_no_collateral = model.calculate_single_lgd(
        exposure=exposure, collateral_value=0.0, seniority="SENIOR_UNSECURED"
    )
    lgd_partial_collateral = model.calculate_single_lgd(
        exposure=exposure, collateral_value=500_000.0, collateral_type="EQUIPMENT", seniority="SENIOR_UNSECURED"
    )
    lgd_full_collateral = model.calculate_single_lgd(
        exposure=exposure, collateral_value=1_500_000.0, collateral_type="EQUIPMENT", seniority="SENIOR_UNSECURED"
    )

    assert lgd_no_collateral > lgd_partial_collateral > lgd_full_collateral


def test_seniority_hierarchy_lgd():
    model = LGDModel()
    exposure = 1_000_000.0

    lgd_secured = model.calculate_single_lgd(exposure, collateral_value=0, seniority="SENIOR_SECURED")
    lgd_unsecured = model.calculate_single_lgd(exposure, collateral_value=0, seniority="SENIOR_UNSECURED")
    lgd_subordinated = model.calculate_single_lgd(exposure, collateral_value=0, seniority="SUBORDINATED")

    assert lgd_secured < lgd_unsecured < lgd_subordinated
