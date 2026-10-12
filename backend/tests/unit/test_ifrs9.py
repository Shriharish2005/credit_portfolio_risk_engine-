"""
Unit tests for IFRS 9 / CECL Staging Engine
"""

import pytest
import pandas as pd
from backend.risk_engine.regulatory.ifrs9_staging import IFRS9StagingEngine


def test_ifrs9_staging_logic():
    engine = IFRS9StagingEngine()

    # Stage 1: No deterioration
    s1 = engine.evaluate_facility_stage("BBB", "BBB", 0.015, 0.015, dpd=0)
    assert s1 == 1

    # Stage 2: 2-notch downgrade
    s2_notch = engine.evaluate_facility_stage("B", "BBB", 0.05, 0.015, dpd=0)
    assert s2_notch == 2

    # Stage 2: 30 DPD backstop
    s2_dpd = engine.evaluate_facility_stage("BBB", "BBB", 0.015, 0.015, dpd=35)
    assert s2_dpd == 2

    # Stage 3: Default rating
    s3_rating = engine.evaluate_facility_stage("D", "BBB", 1.0, 0.015, dpd=0)
    assert s3_rating == 3

    # Stage 3: 90+ DPD
    s3_dpd = engine.evaluate_facility_stage("CCC", "BBB", 0.15, 0.015, dpd=95)
    assert s3_dpd == 3


def test_ifrs9_ecl_calculation():
    engine = IFRS9StagingEngine()
    ead = 1_000_000.0
    lgd = 0.40
    pd_1y = 0.02

    # Stage 1: 12-month ECL = PD * LGD * EAD
    res_s1 = engine.calculate_facility_ecl(ead, lgd, pd_1y, stage=1)
    assert res_s1["provision_ecl"] == pytest.approx(pd_1y * lgd * ead)

    # Stage 2: Lifetime ECL > 12-Month ECL
    res_s2 = engine.calculate_facility_ecl(ead, lgd, pd_1y, stage=2, tenor_years=3.0)
    assert res_s2["provision_ecl"] > res_s1["provision_ecl"]

    # Stage 3: Impaired ECL = 1.0 * LGD * EAD
    res_s3 = engine.calculate_facility_ecl(ead, lgd, pd_1y, stage=3)
    assert res_s3["provision_ecl"] == pytest.approx(1.0 * lgd * ead)
