"""
Reports and Model Validation API Endpoints
"""

from typing import Dict
from fastapi import APIRouter, Body
from backend.app.services.portfolio_service import PortfolioService
from backend.app.services.concentration_service import ConcentrationService
from backend.app.services.stress_test_service import StressTestService
from backend.app.services.monte_carlo_service import MonteCarloService
from backend.app.services.validation_service import ValidationService
from backend.app.schemas.validation import ValidationRunRequest, ValidationResponse

router = APIRouter(tags=["Reports & Model Validation"])


@router.get("/reports/portfolio")
def get_comprehensive_portfolio_report() -> Dict:
    """
    Generates a consolidated portfolio risk report combining:
    - Executive summary
    - Exposure breakdowns
    - Concentration audit (HHI)
    - Stress testing baseline vs severe
    - Monte Carlo VaR & Expected Shortfall
    """
    p_service = PortfolioService()
    c_service = ConcentrationService()
    s_service = StressTestService()
    m_service = MonteCarloService()

    summary = p_service.get_portfolio_summary()
    breakdowns = p_service.get_portfolio_exposure_breakdowns()
    concentration = c_service.get_concentration_analysis()
    stress = s_service.run_stress_test()
    monte_carlo = m_service.get_latest_or_default_run()

    return {
        "report_title": "Credit Portfolio Risk & Capital Adequacy Report",
        "generated_at": "2026-09-30T12:00:00Z",
        "regulatory_framework": "Basel III Internal Ratings-Based (IRB) Analytics",
        "executive_summary": summary,
        "exposure_breakdowns": breakdowns,
        "concentration_metrics": {
            "hhi_borrower": concentration.get("hhi_borrower"),
            "effective_obligors": concentration.get("effective_obligors"),
            "top_10_share": concentration.get("top_10_share"),
            "hhi_sector_bps": concentration.get("hhi_sector_bps"),
            "hhi_geography_bps": concentration.get("hhi_geography_bps"),
        },
        "stress_test_overview": stress.get("scenarios"),
        "capital_and_tail_risk": {
            "var_95": monte_carlo.get("var_95"),
            "var_99": monte_carlo.get("var_99"),
            "expected_shortfall_99": monte_carlo.get("es_99"),
            "unexpected_loss_99": monte_carlo.get("unexpected_loss_99"),
        },
    }


@router.post("/models/validate", response_model=ValidationResponse)
def validate_credit_models(payload: ValidationRunRequest = Body(ValidationRunRequest())):
    """
    Executes model validation suite:
    - ROC Curve and AUC
    - Gini Coefficient (Accuracy Ratio)
    - Kolmogorov-Smirnov (KS) statistic
    - Brier Calibration Score and Decile Calibration Curve
    - Population Stability Index (PSI)
    """
    service = ValidationService()
    result = service.run_model_validation(
        sample_size=payload.sample_size,
        n_bins=payload.n_bins,
    )
    return ValidationResponse(**result)
