"""
Unit Tests for Model Validation Engine.
Verifies discrimination (ROC, Gini, KS), calibration (Brier), and PSI.
"""

import pytest
import numpy as np
from backend.risk_engine.validation.model_validator import ModelValidationEngine


def test_discrimination_metrics():
    # Synthetic ground truth and scores
    rng = np.random.default_rng(42)
    n = 1000
    # Good model: higher scores have much higher probability of default
    y_pred = rng.beta(1.0, 5.0, size=n)
    # Default event: odds correlate with predicted probability
    y_true = (rng.random(n) < (y_pred * 2.5)).astype(int)

    disc = ModelValidationEngine.calculate_discrimination(y_true, y_pred)

    assert "roc_auc" in disc
    assert "gini" in disc
    assert "ks_statistic" in disc
    assert "roc_curve" in disc

    assert 0.5 <= disc["roc_auc"] <= 1.0
    # Gini = 2 * AUC - 1
    assert disc["gini"] == pytest.approx(2.0 * disc["roc_auc"] - 1.0, rel=1e-3)
    assert 0.0 <= disc["ks_statistic"] <= 1.0


def test_calibration_and_brier():
    y_true = np.array([0, 0, 0, 1, 0, 1, 1, 1])
    y_pred = np.array([0.1, 0.2, 0.15, 0.8, 0.25, 0.85, 0.9, 0.75])

    cal = ModelValidationEngine.calculate_calibration(y_true, y_pred, n_bins=4)

    assert "brier_score" in cal
    assert 0.0 <= cal["brier_score"] <= 1.0
    assert "calibration_curve" in cal
    assert len(cal["calibration_curve"]) > 0


def test_population_stability_index_identical():
    # Two identical distributions should yield PSI = 0.0
    rng = np.random.default_rng(42)
    sample = rng.normal(0.05, 0.02, size=1000)

    psi_res = ModelValidationEngine.calculate_psi(sample, sample)
    assert psi_res["total_psi"] == pytest.approx(0.0, abs=1e-3)
    assert psi_res["traffic_light"] == "GREEN"
