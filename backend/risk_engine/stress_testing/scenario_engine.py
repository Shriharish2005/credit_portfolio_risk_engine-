"""
Macroeconomic Stress Testing and Scenario Engine.
Translates macro shifts (GDP growth, interest rate, unemployment, market shocks)
into conditional adjustments on PD, LGD, Expected Loss, and Capital/VaR.
"""

from typing import Dict, List, Optional, Union
import numpy as np
import pandas as pd
from backend.risk_engine.expected_loss.el_calculator import ExpectedLossCalculator


class StressScenario:
    """Definition of a macroeconomic stress scenario."""

    def __init__(
        self,
        name: str,
        description: str,
        gdp_growth: float,
        interest_rate: float,
        unemployment_rate: float,
        collateral_haircut_shock: float = 0.0,
    ):
        self.name = name
        self.description = description
        self.gdp_growth = gdp_growth
        self.interest_rate = interest_rate
        self.unemployment_rate = unemployment_rate
        self.collateral_haircut_shock = collateral_haircut_shock

    def to_dict(self) -> Dict[str, Union[str, float]]:
        return {
            "name": self.name,
            "description": self.description,
            "gdp_growth": self.gdp_growth,
            "interest_rate": self.interest_rate,
            "unemployment_rate": self.unemployment_rate,
            "collateral_haircut_shock": self.collateral_haircut_shock,
        }


class StressTestingEngine:
    """
    Executes stress testing against benchmark and custom economic scenarios:
    - Base: GDP +6.0%, IR 6.5%, Unemployment 5.0%
    - Moderate: GDP +3.0%, IR 8.0%, Unemployment 8.0%
    - Severe: GDP -2.0%, IR 10.0%, Unemployment 14.0%
    """

    PREDEFINED_SCENARIOS: Dict[str, StressScenario] = {
        "Base": StressScenario(
            name="Base",
            description="Baseline steady-state economic environment",
            gdp_growth=6.0,
            interest_rate=6.5,
            unemployment_rate=5.0,
            collateral_haircut_shock=0.0,
        ),
        "Moderate": StressScenario(
            name="Moderate",
            description="Moderate stagflationary slowdown",
            gdp_growth=3.0,
            interest_rate=8.0,
            unemployment_rate=8.0,
            collateral_haircut_shock=0.10,
        ),
        "Severe": StressScenario(
            name="Severe",
            description="Severe recessionary crisis with acute liquidity stress",
            gdp_growth=-2.0,
            interest_rate=10.0,
            unemployment_rate=14.0,
            collateral_haircut_shock=0.25,
        ),
    }

    # Sensitivity elasticities (based on standard CCAR / EBA stress testing methodology)
    # Log-odds shift: delta_logit = beta_unemp * dUnemp + beta_ir * dIR - beta_gdp * dGDP
    BETA_UNEMP = 0.08    # Each +1% unemployment increases log-odds by 0.08
    BETA_IR = 0.06       # Each +1% interest rate increases log-odds by 0.06
    BETA_GDP = 0.07      # Each -1% GDP growth increases log-odds by 0.07

    def stress_pd(
        self,
        base_pd: np.ndarray,
        scenario: StressScenario,
        base_scenario: Optional[StressScenario] = None,
    ) -> np.ndarray:
        """
        Adjust PD using log-odds elasticity to macro variable differentials.
        logit(stressed_PD) = logit(base_PD) + delta_logit
        """
        base = base_scenario or self.PREDEFINED_SCENARIOS["Base"]
        delta_unemp = scenario.unemployment_rate - base.unemployment_rate
        delta_ir = scenario.interest_rate - base.interest_rate
        delta_gdp = scenario.gdp_growth - base.gdp_growth

        delta_logit = (
            (self.BETA_UNEMP * delta_unemp)
            + (self.BETA_IR * delta_ir)
            - (self.BETA_GDP * delta_gdp)
        )

        p = np.clip(np.asarray(base_pd, dtype=float), 1e-5, 1.0 - 1e-5)
        logit_p = np.log(p / (1.0 - p))
        stressed_logit = logit_p + delta_logit
        stressed_p = 1.0 / (1.0 + np.exp(-stressed_logit))
        return np.clip(stressed_p, 1e-4, 0.9999)

    def stress_lgd(
        self,
        base_lgd: np.ndarray,
        scenario: StressScenario,
    ) -> np.ndarray:
        """
        Stress LGD reflecting downturn collateral devaluation and liquidity constraints.
        """
        lgd = np.clip(np.asarray(base_lgd, dtype=float), 0.0, 1.0)
        # Haircut shock directly reduces recovery, increasing LGD
        shock = scenario.collateral_haircut_shock
        # Severe GDP contraction also lowers general workout recovery
        gdp_factor = max(0.0, -scenario.gdp_growth * 0.03)
        total_lgd_multiplier = 1.0 + (shock * 0.6) + gdp_factor
        stressed_lgd = lgd * total_lgd_multiplier
        return np.clip(stressed_lgd, 0.0, 1.0)

    def run_stress_test(
        self,
        pd_array: np.ndarray,
        lgd_array: np.ndarray,
        ead_array: np.ndarray,
        custom_scenario: Optional[StressScenario] = None,
    ) -> Dict[str, Union[Dict, List[Dict]]]:
        """
        Run Base, Moderate, Severe, and optional Custom scenarios, returning comparison matrix.
        """
        scenarios_to_run = list(self.PREDEFINED_SCENARIOS.values())
        if custom_scenario is not None:
            scenarios_to_run.append(custom_scenario)

        base_scenario = self.PREDEFINED_SCENARIOS["Base"]
        base_metrics = None
        results = []

        ead_v = np.maximum(np.asarray(ead_array, dtype=float), 0.0)
        total_ead = float(np.sum(ead_v))

        for sc in scenarios_to_run:
            stressed_p = self.stress_pd(pd_array, sc, base_scenario)
            stressed_l = self.stress_lgd(lgd_array, sc)

            el_metrics = ExpectedLossCalculator.calculate_portfolio_el(
                stressed_p, stressed_l, ead_v
            )

            # Approximate Basel capital / 99.9% VaR under Vasicek formula for speed & precision
            # K = [LGD * N((N^-1(PD) + sqrt(R)*N^-1(0.999))/sqrt(1-R)) - PD * LGD]
            rho = 0.18
            from scipy.stats import norm
            inv_pd = norm.ppf(np.clip(el_metrics["weighted_pd"], 0.0001, 0.999))
            cond_pd_99 = norm.cdf((inv_pd + np.sqrt(rho) * norm.ppf(0.99)) / np.sqrt(1.0 - rho))
            est_var_99 = float(cond_pd_99 * el_metrics["weighted_lgd"] * total_ead)
            est_es_99 = float(est_var_99 * 1.15)  # Expected shortfall approx beyond 99%

            record = {
                "scenario_name": sc.name,
                "description": sc.description,
                "macro_inputs": sc.to_dict(),
                "weighted_pd": round(el_metrics["weighted_pd"], 5),
                "weighted_lgd": round(el_metrics["weighted_lgd"], 5),
                "total_expected_loss": round(el_metrics["total_expected_loss"], 2),
                "el_rate": round(el_metrics["el_rate"], 5),
                "estimated_var_99": round(est_var_99, 2),
                "estimated_es_99": round(est_es_99, 2),
            }

            if sc.name == "Base":
                base_metrics = record
                record["el_delta_vs_base"] = 0.0
                record["el_pct_change"] = 0.0
            else:
                base_el = base_metrics["total_expected_loss"] if base_metrics else el_metrics["total_expected_loss"]
                delta = record["total_expected_loss"] - base_el
                pct_change = (delta / base_el * 100.0) if base_el > 0 else 0.0
                record["el_delta_vs_base"] = round(delta, 2)
                record["el_pct_change"] = round(pct_change, 2)

            results.append(record)

        return {
            "total_exposure": round(total_ead, 2),
            "scenarios": results,
            "comparison": {r["scenario_name"]: r for r in results},
        }
