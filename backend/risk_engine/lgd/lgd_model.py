"""
Loss Given Default (LGD) calculation engine.
Incorporates collateral valuation, haircuts, seniority tiers, and recovery rates.
"""

from typing import Dict, Optional, Union
import numpy as np


class LGDModel:
    """
    Computes Loss Given Default (LGD) where LGD = 1 - Recovery Rate.
    
    Recovery consists of:
    1. Secured recovery from liquidated collateral post-haircut:
       secured_recovery = min(exposure, collateral_value * (1 - haircut))
    2. Unsecured recovery from remaining uncollateralized exposure based on seniority:
       unsecured_exposure = max(0, exposure - secured_recovery)
       unsecured_recovery = unsecured_exposure * base_unsecured_recovery_rate
    
    Total Recovery = (secured_recovery + unsecured_recovery) / exposure
    LGD = 1 - Total Recovery
    Boundary guaranteed: 0.0 <= LGD <= 1.0
    """

    # Baseline unsecured recovery rates by facility seniority (Basel / ISDA standards)
    BASE_UNSECURED_RECOVERIES: Dict[str, float] = {
        "SENIOR_SECURED": 0.65,
        "SENIOR_UNSECURED": 0.40,
        "SUBORDINATED": 0.20,
        "JUNIOR": 0.10,
    }

    # Standard haircut parameters by collateral asset type
    DEFAULT_HAIRCUTS: Dict[str, float] = {
        "CASH": 0.00,
        "GOVERNMENT_BONDS": 0.05,
        "COMMERCIAL_REAL_ESTATE": 0.25,
        "RESIDENTIAL_REAL_ESTATE": 0.20,
        "EQUIPMENT": 0.35,
        "RECEIVABLES": 0.30,
        "INVENTORY": 0.45,
        "UNSECURED": 1.00,
    }

    def __init__(
        self,
        custom_haircuts: Optional[Dict[str, float]] = None,
        custom_recoveries: Optional[Dict[str, float]] = None,
    ):
        self.haircuts = custom_haircuts if custom_haircuts is not None else self.DEFAULT_HAIRCUTS.copy()
        self.seniority_recoveries = (
            custom_recoveries if custom_recoveries is not None else self.BASE_UNSECURED_RECOVERIES.copy()
        )

    def calculate_single_lgd(
        self,
        exposure: float,
        collateral_value: float = 0.0,
        collateral_type: str = "UNSECURED",
        seniority: str = "SENIOR_UNSECURED",
        haircut_override: Optional[float] = None,
        downturn_multiplier: float = 1.0,
    ) -> float:
        """
        Calculate LGD for an individual loan or exposure.
        All inputs guaranteed to return a float bounded in [0.0, 1.0].
        """
        if exposure <= 0:
            return 0.0

        # Collateral haircut determination
        if haircut_override is not None:
            haircut = max(0.0, min(1.0, haircut_override))
        else:
            col_type = collateral_type.strip().upper()
            haircut = self.haircuts.get(col_type, 0.40)

        # Apply stress / downturn multiplier to haircut if applicable
        effective_haircut = min(1.0, haircut * downturn_multiplier)

        # Post-haircut effective collateral
        effective_collateral = max(0.0, collateral_value) * (1.0 - effective_haircut)
        secured_amount = min(exposure, effective_collateral)
        unsecured_amount = max(0.0, exposure - secured_amount)

        # Seniority recovery rate
        sen_key = seniority.strip().upper()
        base_rec_rate = self.seniority_recoveries.get(sen_key, 0.35)
        # In downturn, unsecured recovery drops
        effective_unsecured_rec = max(0.0, min(1.0, base_rec_rate / downturn_multiplier))

        unsecured_recovery = unsecured_amount * effective_unsecured_rec
        total_recovery = secured_amount + unsecured_recovery
        recovery_rate = total_recovery / exposure

        lgd = 1.0 - recovery_rate
        return float(np.clip(lgd, 0.0, 1.0))

    def calculate_portfolio_lgd(
        self,
        exposures: np.ndarray,
        collateral_values: np.ndarray,
        haircuts: np.ndarray,
        base_recovery_rates: np.ndarray,
        downturn_multiplier: float = 1.0,
    ) -> np.ndarray:
        """Vectorized portfolio LGD computation."""
        exposures = np.maximum(exposures, 1e-8)
        effective_collateral = np.maximum(collateral_values, 0.0) * (1.0 - np.clip(haircuts * downturn_multiplier, 0.0, 1.0))
        secured = np.minimum(exposures, effective_collateral)
        unsecured = np.maximum(0.0, exposures - secured)
        unsec_rec = np.clip(base_recovery_rates / downturn_multiplier, 0.0, 1.0)
        
        total_rec = secured + (unsecured * unsec_rec)
        rec_rate = total_rec / exposures
        lgd = 1.0 - rec_rate
        return np.clip(lgd, 0.0, 1.0)
