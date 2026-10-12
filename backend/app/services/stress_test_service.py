"""
Stress Testing Service.
Executes macroeconomic stress scenarios on portfolio loans.
"""

from typing import Dict, Optional
from backend.app.core.cache import cache
from backend.app.core.events import event_bus
from backend.app.db.repositories.loan_repo import LoanRepository
from backend.risk_engine.stress_testing.scenario_engine import StressScenario, StressTestingEngine


class StressTestService:

    def __init__(self, loan_repo: Optional[LoanRepository] = None):
        self.loan_repo = loan_repo or LoanRepository()
        self.engine = StressTestingEngine()

    def run_stress_test(
        self,
        custom_scenario: Optional[Dict] = None,
    ) -> Dict:
        """Run Base, Moderate, Severe, and custom scenarios against active portfolio."""
        custom_scen_obj = None
        if custom_scenario:
            custom_scen_obj = StressScenario(
                name=custom_scenario.get("name", "Custom"),
                description=custom_scenario.get("description", "Custom macroeconomic stress scenario"),
                gdp_growth=float(custom_scenario.get("gdp_growth", 0.0)),
                interest_rate=float(custom_scenario.get("interest_rate", 9.0)),
                unemployment_rate=float(custom_scenario.get("unemployment_rate", 10.0)),
                collateral_haircut_shock=float(custom_scenario.get("collateral_haircut_shock", 0.15)),
            )

        df = self.loan_repo.get_portfolio_dataframe()
        if df.empty:
            return {"total_exposure": 0.0, "scenarios": [], "comparison": {}}

        results = self.engine.run_stress_test(
            pd_array=df["pd"].values,
            lgd_array=df["lgd"].values,
            ead_array=df["ead"].values,
            custom_scenario=custom_scen_obj,
        )

        event_bus.publish("stress_test.completed", {
            "total_exposure": results["total_exposure"],
            "scenario_count": len(results["scenarios"]),
        })

        return results
