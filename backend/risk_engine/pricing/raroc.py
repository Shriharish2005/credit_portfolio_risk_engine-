"""
Risk-Adjusted Return on Capital (RAROC) & Deal Underwriting Engine
==================================================================
Implements institutional deal pricing and economic value added (EVA)
hurdle rate analytics.

Formulas:
---------
Revenues:
    Interest Margin = Drawn Balance * (Interest Rate Spread)
    Commitment Fee = Undrawn Balance * Undrawn Fee Rate
    Upfront Fee = Credit Limit * (Upfront Fee Rate / Maturity Years)
    Total Revenue = Interest Margin + Commitment Fee + Upfront Fee

Costs:
    Operating Expense = EAD * Operating Expense Ratio (default 0.35%)
    Expected Loss (EL) = PD * LGD * EAD

Economic Capital (EC):
    Calculated via Basel IRB Pillar 1 Capital (RWA * 8%) or 99.9% VaR allocation.

RAROC:
    RAROC = (Total Revenue - Operating Expense - Expected Loss) / Economic Capital

Economic Value Added (EVA):
    EVA = Net Income - (Economic Capital * Hurdle Rate)
"""

from typing import Dict, Optional, Union
from backend.risk_engine.regulatory.basel_rwa import BaselCapitalEngine


class RAROCEngine:
    """
    Facility deal pricing and RAROC underwriting engine.
    """

    def __init__(
        self,
        hurdle_rate: float = 0.15,  # 15% standard equity hurdle rate
        operating_cost_ratio: float = 0.0035,  # 35 bps servicing overhead
        undrawn_fee_rate: float = 0.0030,  # 30 bps facility commitment fee
    ):
        self.hurdle_rate = hurdle_rate
        self.operating_cost_ratio = operating_cost_ratio
        self.undrawn_fee_rate = undrawn_fee_rate
        self.capital_engine = BaselCapitalEngine()

    def price_facility(
        self,
        credit_limit: float,
        drawn_balance: float,
        interest_spread_bps: float,
        pd: float,
        lgd: float,
        maturity_years: float = 3.0,
        upfront_fee_pct: float = 0.0050,  # 50 bps upfront fee
        ccf: float = 0.50,
    ) -> Dict[str, Union[float, str, bool]]:
        """
        Underwrites an individual credit facility and calculates RAROC.
        """
        drawn = max(0.0, drawn_balance)
        limit = max(drawn, credit_limit)
        undrawn = max(0.0, limit - drawn)
        ead = drawn + (ccf * undrawn)

        # 1. Revenues
        spread_rate = interest_spread_bps / 10000.0
        interest_income = drawn * spread_rate
        commitment_income = undrawn * self.undrawn_fee_rate
        annual_upfront_fee = (limit * upfront_fee_pct) / max(1.0, maturity_years)
        total_revenue = interest_income + commitment_income + annual_upfront_fee

        # 2. Costs
        expected_loss = pd * lgd * ead
        operating_expense = ead * self.operating_cost_ratio
        total_costs = expected_loss + operating_expense

        # 3. Capital (Basel Pillar 1 8% RWA as Economic Capital proxy)
        rwa_res = self.capital_engine.calculate_facility_rwa(
            pd=pd, lgd=lgd, ead=ead, maturity_years=maturity_years
        )
        economic_capital = max(1000.0, rwa_res["min_capital_8pct"])

        # 4. Net Income & RAROC
        net_risk_adjusted_income = total_revenue - total_costs
        raroc = net_risk_adjusted_income / economic_capital
        eva = net_risk_adjusted_income - (economic_capital * self.hurdle_rate)

        # 5. Breakeven Spread (Spread required to exactly hit hurdle rate)
        # Required Net Income = Economic Capital * Hurdle Rate
        # Required Revenue = Required Net Income + Expected Loss + OpEx
        # Required Interest Income = Required Revenue - Commitment Fee - Annual Upfront
        required_interest = (economic_capital * self.hurdle_rate) + total_costs - commitment_income - annual_upfront_fee
        breakeven_spread_bps = (required_interest / drawn * 10000.0) if drawn > 0 else 0.0

        is_approved = raroc >= self.hurdle_rate

        if is_approved:
            recommendation = "APPROVED: Deal exceeds institutional hurdle rate."
        elif raroc >= (self.hurdle_rate * 0.8):
            recommendation = f"CONDITIONAL: Below target. Reprice to at least {breakeven_spread_bps:.0f} bps or require collateral."
        else:
            recommendation = f"DECLINE: Sub-hurdle return. Substantial risk relative to margin."

        return {
            "credit_limit": round(limit, 2),
            "drawn_balance": round(drawn, 2),
            "ead": round(ead, 2),
            "spread_bps": interest_spread_bps,
            "total_annual_revenue": round(total_revenue, 2),
            "expected_loss": round(expected_loss, 2),
            "operating_expense": round(operating_expense, 2),
            "net_risk_adjusted_income": round(net_risk_adjusted_income, 2),
            "economic_capital": round(economic_capital, 2),
            "raroc_pct": round(raroc * 100, 2),
            "hurdle_rate_pct": round(self.hurdle_rate * 100, 2),
            "economic_value_added_eva": round(eva, 2),
            "breakeven_spread_bps": round(breakeven_spread_bps, 1),
            "is_approved": is_approved,
            "recommendation": recommendation,
            "rwa": rwa_res["rwa"],
            "rwa_density_pct": rwa_res["rwa_density_pct"],
        }
