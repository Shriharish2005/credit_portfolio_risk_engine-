"""
Unit Tests for Monte Carlo Credit Portfolio Loss Simulation.
Verifies seed reproducibility and convergence to expected loss.
"""

import pytest
import numpy as np
from backend.risk_engine.monte_carlo.simulation import MonteCarloSimulationEngine


def test_monte_carlo_reproducibility_with_seed():
    pds = np.array([0.02, 0.04, 0.01, 0.08, 0.03])
    lgds = np.array([0.45, 0.40, 0.35, 0.50, 0.42])
    eads = np.array([1_000_000.0, 500_000.0, 2_000_000.0, 300_000.0, 800_000.0])

    engine1 = MonteCarloSimulationEngine(random_seed=12345)
    run1 = engine1.run_simulation(pds, lgds, eads, n_simulations=2000, asset_correlation=0.18)

    engine2 = MonteCarloSimulationEngine(random_seed=12345)
    run2 = engine2.run_simulation(pds, lgds, eads, n_simulations=2000, asset_correlation=0.18)

    # Must be 100% deterministic with identical seed
    assert run1["mean_loss"] == run2["mean_loss"]
    assert run1["std_loss"] == run2["std_loss"]
    assert run1["var_95"] == run2["var_95"]
    assert run1["var_99"] == run2["var_99"]
    assert run1["es_99"] == run2["es_99"]


def test_monte_carlo_convergence_to_analytical_expected_loss():
    # Large number of uncorrelated or weakly correlated assets
    rng = np.random.default_rng(99)
    n_assets = 500
    pds = rng.uniform(0.01, 0.05, size=n_assets)
    lgds = rng.uniform(0.30, 0.50, size=n_assets)
    eads = np.array([100_000.0] * n_assets)

    theoretical_el = np.sum(pds * lgds * eads)

    # Run Monte Carlo
    engine = MonteCarloSimulationEngine(random_seed=42)
    sim = engine.run_simulation(pds, lgds, eads, n_simulations=10000, asset_correlation=0.10)

    # Simulated mean loss should be within 3% of theoretical expected loss
    assert sim["mean_loss"] == pytest.approx(theoretical_el, rel=0.03)
