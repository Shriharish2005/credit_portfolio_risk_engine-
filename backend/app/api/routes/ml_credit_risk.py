"""
Machine Learning for Credit Risk - API Route
=============================================
Simulates ML model comparison (Traditional vs XGBoost vs LightGBM vs Neural Network)
for PD prediction, SHAP feature importance, and workflow diagnostics.
"""
import random
import math
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter(prefix="/ml", tags=["Machine Learning Credit Risk"])


# ─── Response Models ───────────────────────────────────────────────────────────

class ModelMetrics(BaseModel):
    model_name: str
    model_type: str          # "Traditional" | "ML Challenger"
    roc_auc: float
    gini: float
    ks_statistic: float
    brier_score: float
    log_loss: float
    precision: float
    recall: float
    f1_score: float
    training_time_s: float
    explainability: str      # "High" | "Medium" | "Low"
    regulatory_approval: str # "Approved" | "Challenger" | "Research"
    color: str               # hex accent color

class SHAPFeature(BaseModel):
    feature: str
    shap_value: float        # mean |SHAP|
    direction: str           # "risk_increasing" | "risk_reducing"
    category: str            # "Financial" | "Behavioral" | "Macroeconomic" | "Structural"

class WorkflowStep(BaseModel):
    step: int
    title: str
    description: str
    tools: List[str]
    status: str              # "input" | "process" | "output" | "governance"

class ModelComparison(BaseModel):
    feature: str
    logistic_regression: float
    random_forest: float
    xgboost: float
    lightgbm: float
    neural_network: float

class MLResponse(BaseModel):
    models: List[ModelMetrics]
    shap_features: List[SHAPFeature]
    workflow: List[WorkflowStep]
    performance_comparison: List[ModelComparison]
    summary: dict


# ─── Endpoint ──────────────────────────────────────────────────────────────────

@router.get("/overview", response_model=MLResponse)
def get_ml_overview():
    """
    Returns simulated ML model comparison, SHAP importance, and workflow data
    for the Machine Learning Credit Risk dashboard.
    """
    models = [
        ModelMetrics(
            model_name="Logistic Regression",
            model_type="Traditional",
            roc_auc=0.742,
            gini=0.484,
            ks_statistic=0.381,
            brier_score=0.0812,
            log_loss=0.2741,
            precision=0.681,
            recall=0.594,
            f1_score=0.635,
            training_time_s=0.8,
            explainability="High",
            regulatory_approval="Approved",
            color="#6366f1",
        ),
        ModelMetrics(
            model_name="Random Forest",
            model_type="ML Challenger",
            roc_auc=0.791,
            gini=0.582,
            ks_statistic=0.443,
            brier_score=0.0718,
            log_loss=0.2413,
            precision=0.726,
            recall=0.638,
            f1_score=0.679,
            training_time_s=14.2,
            explainability="Medium",
            regulatory_approval="Challenger",
            color="#10b981",
        ),
        ModelMetrics(
            model_name="XGBoost",
            model_type="ML Challenger",
            roc_auc=0.823,
            gini=0.646,
            ks_statistic=0.489,
            brier_score=0.0651,
            log_loss=0.2184,
            precision=0.758,
            recall=0.671,
            f1_score=0.712,
            training_time_s=6.4,
            explainability="Medium",
            regulatory_approval="Challenger",
            color="#f59e0b",
        ),
        ModelMetrics(
            model_name="LightGBM",
            model_type="ML Challenger",
            roc_auc=0.831,
            gini=0.662,
            ks_statistic=0.497,
            brier_score=0.0638,
            log_loss=0.2147,
            precision=0.763,
            recall=0.679,
            f1_score=0.719,
            training_time_s=3.1,
            explainability="Medium",
            regulatory_approval="Challenger",
            color="#0ea5e9",
        ),
        ModelMetrics(
            model_name="Neural Network",
            model_type="ML Challenger",
            roc_auc=0.818,
            gini=0.636,
            ks_statistic=0.481,
            brier_score=0.0672,
            log_loss=0.2263,
            precision=0.741,
            recall=0.660,
            f1_score=0.698,
            training_time_s=87.3,
            explainability="Low",
            regulatory_approval="Research",
            color="#f43f5e",
        ),
    ]

    shap_features = [
        SHAPFeature(feature="Debt-to-Income Ratio",        shap_value=0.1842, direction="risk_increasing",  category="Financial"),
        SHAPFeature(feature="Days Past Due (Last 12M)",    shap_value=0.1631, direction="risk_increasing",  category="Behavioral"),
        SHAPFeature(feature="Credit Utilization Rate",     shap_value=0.1274, direction="risk_increasing",  category="Behavioral"),
        SHAPFeature(feature="Interest Coverage Ratio",     shap_value=0.1183, direction="risk_reducing",    category="Financial"),
        SHAPFeature(feature="Loan-to-Value Ratio (LTV)",   shap_value=0.0971, direction="risk_increasing",  category="Structural"),
        SHAPFeature(feature="Current Ratio (Liquidity)",   shap_value=0.0844, direction="risk_reducing",    category="Financial"),
        SHAPFeature(feature="Unemployment Rate (Macro)",   shap_value=0.0712, direction="risk_increasing",  category="Macroeconomic"),
        SHAPFeature(feature="Years Since Last Default",    shap_value=0.0638, direction="risk_reducing",    category="Behavioral"),
        SHAPFeature(feature="GDP Growth Rate",             shap_value=0.0541, direction="risk_reducing",    category="Macroeconomic"),
        SHAPFeature(feature="Facility Seniority Rank",     shap_value=0.0364, direction="risk_reducing",    category="Structural"),
    ]

    workflow = [
        WorkflowStep(step=1, title="Data Ingestion", description="Collect borrower financials, transaction history, credit bureau data, and macroeconomic indicators.", tools=["SQL", "Apache Spark", "Data Lake"], status="input"),
        WorkflowStep(step=2, title="Feature Engineering", description="Derive ratio features (DTI, LTV, ICR), encode categorical variables, create lagged macro indicators.", tools=["pandas", "Feature Store", "SMOTE"], status="process"),
        WorkflowStep(step=3, title="Imbalance Handling", description="Apply SMOTE oversampling or class weighting to handle the rare default event (typically 1-5% prevalence).", tools=["SMOTE", "Class Weights", "Undersampling"], status="process"),
        WorkflowStep(step=4, title="Model Training", description="Train ensemble (XGBoost, LightGBM) and baseline (LR) models with cross-validation and hyperparameter tuning.", tools=["XGBoost", "LightGBM", "scikit-learn", "Optuna"], status="process"),
        WorkflowStep(step=5, title="Discrimination & Calibration", description="Evaluate AUC-ROC, Gini, KS statistic. Calibrate probability outputs with Platt Scaling or Isotonic Regression.", tools=["ROC-AUC", "KS Test", "Platt Scaling"], status="output"),
        WorkflowStep(step=6, title="Explainability (SHAP)", description="Generate SHAP values to explain individual predictions. Required for adverse action notices and regulatory review.", tools=["SHAP", "LIME", "PDPs"], status="output"),
        WorkflowStep(step=7, title="Monitoring & PSI", description="Track Population Stability Index (PSI), concept drift, and model performance degradation monthly.", tools=["PSI", "Evidently AI", "MLflow"], status="governance"),
    ]

    performance_comparison = [
        ModelComparison(feature="ROC-AUC",       logistic_regression=0.742, random_forest=0.791, xgboost=0.823, lightgbm=0.831, neural_network=0.818),
        ModelComparison(feature="Gini (AR)",     logistic_regression=0.484, random_forest=0.582, xgboost=0.646, lightgbm=0.662, neural_network=0.636),
        ModelComparison(feature="KS Statistic",  logistic_regression=0.381, random_forest=0.443, xgboost=0.489, lightgbm=0.497, neural_network=0.481),
        ModelComparison(feature="F1 Score",      logistic_regression=0.635, random_forest=0.679, xgboost=0.712, lightgbm=0.719, neural_network=0.698),
        ModelComparison(feature="Precision",     logistic_regression=0.681, random_forest=0.726, xgboost=0.758, lightgbm=0.763, neural_network=0.741),
        ModelComparison(feature="Recall",        logistic_regression=0.594, random_forest=0.638, xgboost=0.671, lightgbm=0.679, neural_network=0.660),
    ]

    summary = {
        "best_model": "LightGBM",
        "best_auc": 0.831,
        "auc_improvement_over_baseline": "+11.9%",
        "champion_model": "Logistic Regression",
        "champion_status": "Production (Pillar 1 Approved)",
        "challenger_status": "Challenger A/B Test (LightGBM)",
        "data_points_trained": 185000,
        "features_used": 47,
        "default_rate": "2.8%",
        "monitoring_cadence": "Monthly PSI + Quarterly Refit",
    }

    return MLResponse(
        models=models,
        shap_features=shap_features,
        workflow=workflow,
        performance_comparison=performance_comparison,
        summary=summary,
    )
