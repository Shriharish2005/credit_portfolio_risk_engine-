"""
Stress Testing API Endpoints
"""

from typing import Optional
from fastapi import APIRouter, Body
from backend.app.services.stress_test_service import StressTestService
from backend.app.schemas.stress_testing import CustomScenarioRequest, StressTestResponse

router = APIRouter(prefix="/stress-tests", tags=["Stress Testing"])


@router.get("", response_model=StressTestResponse)
def get_standard_stress_tests():
    """
    Executes standard stress tests:
    - Base: GDP +6.0%, IR 6.5%, Unemployment 5.0%
    - Moderate: GDP +3.0%, IR 8.0%, Unemployment 8.0%
    - Severe: GDP -2.0%, IR 10.0%, Unemployment 14.0%
    """
    service = StressTestService()
    result = service.run_stress_test(custom_scenario=None)
    return StressTestResponse(**result)


@router.post("", response_model=StressTestResponse)
def run_custom_stress_test(custom_scenario: Optional[CustomScenarioRequest] = Body(None)):
    """
    Executes benchmark stress tests alongside a user-defined custom scenario.
    Translates macro shocks into stressed PD, LGD, EL, and Credit VaR.
    """
    service = StressTestService()
    scen_dict = custom_scenario.model_dump() if custom_scenario else None
    result = service.run_stress_test(custom_scenario=scen_dict)
    return StressTestResponse(**result)
