"""
Logistic Regression Probability of Default (PD) scoring and calibration model.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline


class LogisticPDModel:
    """
    Multivariate Logistic Regression PD model utilizing borrower financials and macro variables:
    - leverage (Total Debt / Equity)
    - debt_ratio (Total Debt / Total Assets)
    - interest_coverage (EBIT / Interest Expense)
    - profitability (Return on Assets / EBITDA margin)
    - liquidity (Current Assets / Current Liabilities)
    - unemployment_rate (%)
    - interest_rate (%)
    """

    FEATURE_NAMES = [
        "leverage",
        "debt_ratio",
        "interest_coverage",
        "profitability",
        "liquidity",
        "unemployment_rate",
        "interest_rate",
    ]

    def __init__(self, calibrate: bool = True, random_state: int = 42):
        self.calibrate = calibrate
        self.random_state = random_state
        self.pipeline: Optional[Pipeline] = None
        self.is_fitted: bool = False
        self._init_default_model()

    def _init_default_model(self):
        """
        Pre-fit with empirically grounded baseline weights so the model is immediately usable,
        even before training on custom historical datasets.
        """
        # Baseline coefficients reflecting credit risk literature:
        # High leverage (+), high debt_ratio (+), high interest_rate (+), high unemployment (+)
        # High interest coverage (-), high profitability (-), high liquidity (-)
        scaler = StandardScaler()
        # Synthetic baseline anchor data to calibrate initial coefficients
        np.random.seed(self.random_state)
        n_samples = 2000
        
        # Generate representative feature domain
        leverage = np.random.exponential(scale=1.5, size=n_samples) + 0.5
        debt_ratio = np.clip(np.random.normal(0.45, 0.2, size=n_samples), 0.05, 0.95)
        interest_coverage = np.clip(np.random.exponential(scale=3.5, size=n_samples) + 0.5, 0.1, 20.0)
        profitability = np.clip(np.random.normal(0.10, 0.08, size=n_samples), -0.2, 0.4)
        liquidity = np.clip(np.random.normal(1.8, 0.8, size=n_samples), 0.3, 5.0)
        unemployment = np.clip(np.random.normal(5.5, 1.8, size=n_samples), 2.5, 15.0)
        interest_rate = np.clip(np.random.normal(5.0, 1.5, size=n_samples), 1.0, 12.0)

        X_synth = np.column_stack([
            leverage, debt_ratio, interest_coverage, profitability,
            liquidity, unemployment, interest_rate
        ])

        # Underlying latent log-odds
        z = (
            -4.5
            + 0.55 * leverage
            + 1.80 * debt_ratio
            - 0.35 * interest_coverage
            - 2.40 * profitability
            - 0.45 * liquidity
            + 0.18 * unemployment
            + 0.12 * interest_rate
        )
        probs = 1.0 / (1.0 + np.exp(-z))
        y_synth = (np.random.rand(n_samples) < probs).astype(int)

        base_lr = LogisticRegression(penalty="l2", C=1.0, random_state=self.random_state, max_iter=1000)
        self.pipeline = Pipeline([
            ("scaler", scaler),
            ("classifier", base_lr)
        ])
        self.pipeline.fit(X_synth, y_synth)
        self.is_fitted = True

    def fit(self, X: Union[pd.DataFrame, np.ndarray], y: Union[pd.Series, np.ndarray]) -> "LogisticPDModel":
        """Fit model on empirical borrower and macro financial history."""
        if isinstance(X, pd.DataFrame):
            X_arr = X[self.FEATURE_NAMES].values
        else:
            X_arr = np.asarray(X)
        y_arr = np.asarray(y)

        scaler = StandardScaler()
        base_lr = LogisticRegression(penalty="l2", C=1.0, random_state=self.random_state, max_iter=1000)
        if self.calibrate:
            calibrated = CalibratedClassifierCV(estimator=base_lr, method="sigmoid", cv=3)
            self.pipeline = Pipeline([
                ("scaler", scaler),
                ("classifier", calibrated)
            ])
        else:
            self.pipeline = Pipeline([
                ("scaler", scaler),
                ("classifier", base_lr)
            ])

        self.pipeline.fit(X_arr, y_arr)
        self.is_fitted = True
        return self

    def predict_pd(self, X: Union[pd.DataFrame, np.ndarray, Dict[str, float]]) -> np.ndarray:
        """
        Predict 1-year default probabilities for one or many borrowers.
        Returns array of probabilities bounded in [0.0001, 0.9999].
        """
        if not self.is_fitted or self.pipeline is None:
            raise RuntimeError("LogisticPDModel is not fitted.")

        if isinstance(X, dict):
            row = [X.get(col, 0.0) for col in self.FEATURE_NAMES]
            X_arr = np.array([row], dtype=float)
        elif isinstance(X, pd.DataFrame):
            X_arr = X[self.FEATURE_NAMES].values.astype(float)
        else:
            X_arr = np.asarray(X, dtype=float)

        probs = self.pipeline.predict_proba(X_arr)[:, 1]
        return np.clip(probs, 0.0001, 0.9999)

    def get_feature_importances(self) -> Dict[str, float]:
        """Return standardized coefficients showing relative risk contribution."""
        if not self.is_fitted or self.pipeline is None:
            return {}
        classifier = self.pipeline.named_steps["classifier"]
        if hasattr(classifier, "coef_"):
            coefs = classifier.coef_[0]
        elif hasattr(classifier, "calibrated_classifiers_"):
            coefs = np.mean([clf.estimator.coef_[0] for clf in classifier.calibrated_classifiers_], axis=0)
        else:
            coefs = np.zeros(len(self.FEATURE_NAMES))
        return dict(zip(self.FEATURE_NAMES, [float(c) for c in coefs]))
