"""
Pricing & Underwriting Service Layer
====================================
Orchestrates facility deal pricing, RAROC hurdle calculations,
and sensitivity curves.
"""

from typing import Dict, List, Optional
from backend.risk_engine.pricing.raroc import RAROCEngine


class PricingService:
    """
    Facility deal underwriting and RAROC service.
    """

    def __init__(self):
        self.engine = RAROCEngine()

    def price_facility(
        self,
        credit_limit: float,
        drawn_balance: float,
        interest_spread_bps: float,
        pd: float,
        lgd: float,
        maturity_years: float = 3.0,
        upfront_fee_pct: float = 0.0050,
        ccf: float = 0.50,
    ) -> Dict:
        """
        Calculates deal pricing and RAROC decision.
        """
        result = self.engine.price_facility(
            credit_limit=credit_limit,
            drawn_balance=drawn_balance,
            interest_spread_bps=interest_spread_bps,
            pd=pd,
            lgd=lgd,
            maturity_years=maturity_years,
            upfront_fee_pct=upfront_fee_pct,
            ccf=ccf,
        )

        # Generate sensitivity curve across spreads (100 to 500 bps)
        spread_sensitivities = []
        for test_spread in [100, 150, 200, 250, 300, 350, 400, 450, 500]:
            sens = self.engine.price_facility(
                credit_limit=credit_limit,
                drawn_balance=drawn_balance,
                interest_spread_bps=test_spread,
                pd=pd,
                lgd=lgd,
                maturity_years=maturity_years,
                upfront_fee_pct=upfront_fee_pct,
                ccf=ccf,
            )
            spread_sensitivities.append({
                "spread_bps": test_spread,
                "raroc_pct": sens["raroc_pct"],
                "is_approved": sens["is_approved"],
                "eva": sens["economic_value_added_eva"],
            })

        result["sensitivity_curve"] = spread_sensitivities
        return result
