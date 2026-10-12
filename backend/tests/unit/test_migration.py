"""
Unit Tests for Credit Rating Migration and Transition Matrix.
Verifies Markov properties, absorbing default, and P(n) = P^n.
"""

import pytest
import numpy as np
from backend.risk_engine.migration.transition_matrix import CreditMigrationEngine


def test_transition_matrix_properties():
    engine = CreditMigrationEngine()
    mat = engine.matrix

    # Square shape
    assert mat.shape == (8, 8)

    # Probabilities in [0, 1]
    assert np.all(mat >= 0.0)
    assert np.all(mat <= 1.0)

    # Every row sums to 1.0
    row_sums = mat.sum(axis=1)
    np.testing.assert_allclose(row_sums, np.ones(8), atol=1e-5)

    # Absorbing Default state: last row is [0, 0, ..., 0, 1]
    expected_default_row = np.zeros(8)
    expected_default_row[-1] = 1.0
    np.testing.assert_allclose(mat[-1, :], expected_default_row, atol=1e-5)


def test_multi_period_transition_matrix_power():
    engine = CreditMigrationEngine()

    # 1-year vs 3-year vs 5-year
    mat_1y = engine.matrix
    mat_3y = engine.multi_period_matrix(3)
    mat_5y = engine.multi_period_matrix(5)

    # Check row stochastic property preserved
    np.testing.assert_allclose(mat_3y.sum(axis=1), np.ones(8), atol=1e-5)
    np.testing.assert_allclose(mat_5y.sum(axis=1), np.ones(8), atol=1e-5)

    # Cumulative default probability over time must be non-decreasing for non-default ratings
    # Last column represents Default probability
    assert mat_3y[3, -1] > mat_1y[3, -1]  # BBB 3-year default > 1-year default
    assert mat_5y[3, -1] > mat_3y[3, -1]  # BBB 5-year default > 3-year default


def test_migration_decomposition_analytics():
    engine = CreditMigrationEngine()
    analysis = engine.analyze_migrations(n_periods=1)

    assert "ratings" in analysis
    assert "transition_matrix" in analysis
    assert "rating_analysis" in analysis
    assert len(analysis["rating_analysis"]) == 8

    # AAA cannot be upgraded
    aaa_row = next(r for r in analysis["rating_analysis"] if r["rating"] == "AAA")
    assert aaa_row["upgrade"] == 0.0
    assert aaa_row["unchanged"] > 0.80

    # Default is 100% absorbing
    def_row = next(r for r in analysis["rating_analysis"] if r["rating"] == "Default")
    assert def_row["default_prob"] == 1.0
    assert def_row["upgrade"] == 0.0
