"""
Quantitative Credit Risk Model Validation Engine.
Computes ROC-AUC, Gini (Accuracy Ratio), Kolmogorov-Smirnov (KS) statistic,
Brier Score, Calibration Curves, and Population Stability Index (PSI).
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
from sklearn.metrics import roc_auc_score, roc_curve, brier_score_loss


class ModelValidationEngine:
    """
    Validation and diagnostic framework for credit rating and PD scoring models.
    Provides discrimination (ROC, Gini, KS), calibration (Brier, decile curves),
    and population stability (PSI) metrics.
    """

    @staticmethod
    def calculate_discrimination(
        y_true: Union[np.ndarray, List[int]],
        y_pred_proba: Union[np.ndarray, List[float]],
    ) -> Dict[str, Union[float, List[Dict]]]:
        """
        Evaluate discriminative power:
        - ROC-AUC
        - Gini Coefficient = 2 * AUC - 1 (Accuracy Ratio)
        - KS Statistic = max |Cumulative Defaults% - Cumulative Non-Defaults%|
        - ROC curve points for plotting
        """
        y_t = np.asarray(y_true, dtype=int)
        y_p = np.clip(np.asarray(y_pred_proba, dtype=float), 0.0, 1.0)

        if len(np.unique(y_t)) < 2:
            return {
                "roc_auc": 0.5,
                "gini": 0.0,
                "ks_statistic": 0.0,
                "roc_curve": [],
                "interpretation": "Insufficient class diversity (requires at least 1 default and 1 non-default)",
            }

        auc = float(roc_auc_score(y_t, y_p))
        gini = float(2.0 * auc - 1.0)

        # ROC Curve points
        fpr, tpr, thresholds = roc_curve(y_t, y_p)
        
        # KS Statistic
        ks_stat = float(np.max(np.abs(tpr - fpr)))
        ks_idx = int(np.argmax(np.abs(tpr - fpr)))
        ks_threshold = float(thresholds[ks_idx]) if ks_idx < len(thresholds) else 0.5

        # Downsample ROC curve for clean frontend visualization (max 50 points)
        step = max(1, len(fpr) // 50)
        roc_points = [
            {"fpr": round(float(fpr[i]), 4), "tpr": round(float(tpr[i]), 4)}
            for i in range(0, len(fpr), step)
        ]
        if roc_points[-1]["fpr"] != 1.0:
            roc_points.append({"fpr": 1.0, "tpr": 1.0})

        return {
            "roc_auc": round(auc, 4),
            "gini": round(gini, 4),
            "ks_statistic": round(ks_stat, 4),
            "ks_threshold": round(ks_threshold, 4),
            "roc_curve": roc_points,
            "sample_size": len(y_t),
            "default_count": int(np.sum(y_t)),
        }

    @staticmethod
    def calculate_calibration(
        y_true: Union[np.ndarray, List[int]],
        y_pred_proba: Union[np.ndarray, List[float]],
        n_bins: int = 10,
    ) -> Dict[str, Union[float, List[Dict]]]:
        """
        Evaluate model calibration:
        - Brier Score = mean((y_pred - y_true)^2)
        - Decile-based calibration table comparing predicted PD vs empirical default rate.
        """
        y_t = np.asarray(y_true, dtype=int)
        y_p = np.clip(np.asarray(y_pred_proba, dtype=float), 0.0, 1.0)

        brier = float(brier_score_loss(y_t, y_p))

        # Quantile binning for calibration curve
        sorted_indices = np.argsort(y_p)
        bin_size = len(sorted_indices) // n_bins
        calibration_curve = []

        for b in range(n_bins):
            start = b * bin_size
            end = len(sorted_indices) if b == n_bins - 1 else (b + 1) * bin_size
            idx_chunk = sorted_indices[start:end]

            if len(idx_chunk) == 0:
                continue

            chunk_pred = y_p[idx_chunk]
            chunk_true = y_t[idx_chunk]

            mean_pred = float(np.mean(chunk_pred))
            obs_rate = float(np.mean(chunk_true))

            calibration_curve.append({
                "decile": b + 1,
                "count": int(len(idx_chunk)),
                "predicted_pd": round(mean_pred, 5),
                "observed_default_rate": round(obs_rate, 5),
                "diff": round(obs_rate - mean_pred, 5),
            })

        return {
            "brier_score": round(brier, 5),
            "calibration_curve": calibration_curve,
        }

    @staticmethod
    def calculate_psi(
        baseline_scores: Union[np.ndarray, List[float]],
        target_scores: Union[np.ndarray, List[float]],
        n_bins: int = 10,
    ) -> Dict[str, Union[float, str, List[Dict]]]:
        """
        Population Stability Index (PSI):
        PSI = sum((Target% - Baseline%) * ln(Target% / Baseline%))
        Rule of thumb:
          PSI < 0.10: Insignificant shift / Stable
          0.10 <= PSI < 0.25: Moderate shift / Monitoring required
          PSI >= 0.25: Significant shift / Model recalibration required
        """
        base = np.asarray(baseline_scores, dtype=float)
        target = np.asarray(target_scores, dtype=float)

        # Establish bin edges from baseline
        quantiles = np.linspace(0, 100, n_bins + 1)
        bin_edges = np.percentile(base, quantiles)
        bin_edges[0] -= 1e-6
        bin_edges[-1] += 1e-6

        base_counts, _ = np.histogram(base, bins=bin_edges)
        target_counts, _ = np.histogram(target, bins=bin_edges)

        base_pct = np.maximum(base_counts / len(base), 1e-6)
        target_pct = np.maximum(target_counts / len(target), 1e-6)

        bin_psi = (target_pct - base_pct) * np.log(target_pct / base_pct)
        total_psi = float(np.sum(bin_psi))

        if total_psi < 0.10:
            traffic_light = "GREEN"
            status = "Stable (PSI < 0.10)"
        elif total_psi < 0.25:
            traffic_light = "AMBER"
            status = "Moderate Shift (0.10 <= PSI < 0.25)"
        else:
            traffic_light = "RED"
            status = "Significant Degradation / Shift (PSI >= 0.25)"

        breakdown = []
        for i in range(len(bin_psi)):
            breakdown.append({
                "bin": i + 1,
                "lower_edge": round(float(bin_edges[i]), 4),
                "upper_edge": round(float(bin_edges[i + 1]), 4),
                "baseline_share": round(float(base_pct[i]), 4),
                "target_share": round(float(target_pct[i]), 4),
                "psi_contribution": round(float(bin_psi[i]), 5),
            })

        return {
            "total_psi": round(total_psi, 4),
            "traffic_light": traffic_light,
            "status": status,
            "bin_breakdown": breakdown,
        }

    @classmethod
    def validate_model_suite(
        cls,
        y_true: Union[np.ndarray, List[int]],
        y_pred_proba: Union[np.ndarray, List[float]],
        baseline_proba: Optional[Union[np.ndarray, List[float]]] = None,
    ) -> Dict[str, Union[Dict, str]]:
        """
        Complete model validation diagnostic suite.
        Note: Educational / Quantitative engineering risk analytics platform.
        """
        disc = cls.calculate_discrimination(y_true, y_pred_proba)
        cal = cls.calculate_calibration(y_true, y_pred_proba)
        
        base_scores = baseline_proba if baseline_proba is not None else y_pred_proba
        psi = cls.calculate_psi(base_scores, y_pred_proba)

        return {
            "disclaimer": "Educational / Quantitative Engineering Risk Platform - Not a certified regulatory submission.",
            "discrimination": disc,
            "calibration": cal,
            "stability": psi,
        }
