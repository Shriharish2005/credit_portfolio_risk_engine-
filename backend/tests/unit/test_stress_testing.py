"""
Unit Tests for Macroeconomic Stress Testing Engine.
Verifies scenario progression: Base < Moderate < Severe.
"""

import pytest
import numpy as np
from backend.risk_engine.stress_testing.scenario_engine import StressTestingEngine, StressScenario


def test_stress_scenario_progression():
    pds = np.array([0.015, 0.030, 0.050, 0.080])
    lgds = np.array([0.35, 0.40, 0.45, 0.50])
    eads = np.array([1_000_000.0, 2_000_000.0, 1_500_000.0, 500_000.0])

    engine = StressTestingEngine()
    res = engine.run_stress_test(pds, lgds, eads)

    base = res["comparison"]["Base"]
    moderate = res["comparison"]["Moderate"]
    severe = res["comparison"]["Severe"]

    # 1. Expected Loss should increase monotonically with scenario severity
    assert base["total_expected_loss"] < moderate["total_expected_loss"] < severe["total_expected_loss"]

    # 2. Weighted PD should increase
    assert base["weighted_pd"] < moderate["weighted_pd"] < severe["weighted_pd"]

    # 3. Deltas should be positive
    assert moderate["el_delta_vs_base"] > 0
    assert severe["el_delta_vs_base"] > moderate["el_delta_vs_base"]


def test_custom_scenario():
    pds = np.array([0.02, 0.04])
    lgds = np.array([0.40, 0.45])
    eads = np.array([1_000_000.0, 1_000_000.0])

    engine = StressTestingEngine()
    custom_scen = StressScenario(
        name="HyperInflationCrisis",
        description="Crisis with 15% interest rate and 20% unemployment",
        gdp_growth=-4.0,
        interest_rate=15.0,
        unemployment_rate=20.0,
        collateral_haircut_shock=0.35,
    )

    res = engine.run_stress_test(pds, lgds, eads, custom_scenario=custom_scen)
    assert "HyperInflationCrisis" in res["comparison"]
    custom_res = res["comparison"]["HyperInflationCrisis"]
    base_res = res["comparison"]["Base"]
    assert custom_res["total_expected_loss"] > base_res["total_expected_loss"] * 2.0
