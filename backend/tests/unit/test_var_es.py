"""
Unit Tests for Credit Value at Risk (VaR) and Expected Shortfall (ES).
Verifies percentile properties and coherent risk measure axioms.
"""

import pytest
import numpy as np
from backend.risk_engine.monte_carlo.simulation import MonteCarloSimulationEngine


def test_var_and_expected_shortfall_coherence():
    # Construct synthetic portfolio
    pds = np.array([0.01] * 100)
    lgds = np.array([0.40] * 100)
    eads = np.array([100_000.0] * 100)

    engine = MonteCarloSimulationEngine(random_seed=42)
    res = engine.run_simulation(pds, lgds, eads, n_simulations=5000, asset_correlation=0.15)

    var_95 = res["var_95"]
    var_99 = res["var_99"]
    es_95 = res["es_95"]
    es_99 = res["es_99"]

    # 1. Monotonicity of quantiles: VaR_99 >= VaR_95
    assert var_99 >= var_95, f"Expected VaR 99% ({var_99}) >= VaR 95% ({var_95})"

    # 2. Sub-additivity / Tail condition: Expected Shortfall is average in the tail beyond VaR
    # Hence ES_alpha >= VaR_alpha
    assert es_95 >= var_95, f"Expected ES 95% ({es_95}) >= VaR 95% ({var_95})"
    assert es_99 >= var_99, f"Expected ES 99% ({es_99}) >= VaR 99% ({var_99})"
    assert es_99 >= es_95


def test_known_uniform_tail_distribution():
    # If loss is uniformly distributed over [0, 100],
    # VaR_95 is 95, and ES_95 is average of [95, 100] = 97.5
    # VaR_99 is 99, and ES_99 is average of [99, 100] = 99.5
    losses = np.linspace(0, 100, 10001)

    var_95 = float(np.percentile(losses, 95))
    var_99 = float(np.percentile(losses, 99))
    es_95 = float(np.mean(losses[losses >= var_95]))
    es_99 = float(np.mean(losses[losses >= var_99]))

    assert var_95 == pytest.approx(95.0, abs=0.1)
    assert var_99 == pytest.approx(99.0, abs=0.1)
    assert es_95 == pytest.approx(97.5, abs=0.1)
    assert es_99 == pytest.approx(99.5, abs=0.1)
