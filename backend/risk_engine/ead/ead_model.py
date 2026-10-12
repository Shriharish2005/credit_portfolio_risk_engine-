"""
Exposure at Default (EAD) calculation engine.
Calculates drawn balance + Credit Conversion Factor (CCF) * undrawn commitment.
"""

from typing import Dict, Optional, Union
import numpy as np


class EADModel:
    """
    Computes Exposure at Default:
    EAD = Drawn Balance + CCF * Undrawn Commitment
    where Undrawn Commitment = max(0.0, Credit Limit - Drawn Balance)
    and CCF in [0.0, 1.0] reflects Basel standard regulatory and internal conversion rates.
    Guaranteed: EAD >= 0.0
    """

    # Basel standard Credit Conversion Factors (CCF) by facility product type
    DEFAULT_CCF_MAP: Dict[str, float] = {
        "TERM_LOAN": 0.0,               # Non-revolving, fully drawn
        "MORTGAGE": 0.0,                # Fixed balance
        "REVOLVING_CREDIT": 0.50,       # Credit cards, overdrafts
        "COMMERCIAL_LINE": 0.75,        # Committed corporate credit lines
        "LETTER_OF_CREDIT": 0.20,       # Trade finance guarantees
        "STANDBY_FACILITY": 0.40,       # Liquidity backstop
    }

    def __init__(self, custom_ccf_map: Optional[Dict[str, float]] = None):
        self.ccf_map = custom_ccf_map if custom_ccf_map is not None else self.DEFAULT_CCF_MAP.copy()

    def get_ccf(self, facility_type: str) -> float:
        """Retrieve CCF for given loan product."""
        clean_type = facility_type.strip().upper().replace(" ", "_")
        return self.ccf_map.get(clean_type, 0.50)

    def calculate_single_ead(
        self,
        drawn_balance: float,
        credit_limit: float,
        facility_type: str = "TERM_LOAN",
        ccf_override: Optional[float] = None,
    ) -> float:
        """
        Calculate EAD for single loan or credit facility.
        Guarantees non-negative result.
        """
        drawn = max(0.0, float(drawn_balance))
        limit = max(drawn, float(credit_limit))

        if ccf_override is not None:
            ccf = max(0.0, min(1.0, float(ccf_override)))
        else:
            ccf = self.get_ccf(facility_type)

        undrawn = max(0.0, limit - drawn)
        ead = drawn + (ccf * undrawn)
        return float(max(0.0, ead))

    def calculate_portfolio_ead(
        self,
        drawn_balances: np.ndarray,
        credit_limits: np.ndarray,
        ccf_values: np.ndarray,
    ) -> np.ndarray:
        """Vectorized computation for high performance over 50,000+ facilities."""
        drawn = np.maximum(drawn_balances, 0.0)
        limits = np.maximum(credit_limits, drawn)
        ccf = np.clip(ccf_values, 0.0, 1.0)
        undrawn = np.maximum(0.0, limits - drawn)
        ead = drawn + (ccf * undrawn)
        return np.maximum(0.0, ead)
