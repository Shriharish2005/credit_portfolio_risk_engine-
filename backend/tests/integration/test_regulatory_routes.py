"""
Integration tests for Regulatory Capital & Pricing endpoints
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_basel_capital_endpoint():
    res = client.get("/api/v1/regulatory/capital?sample_size=1000")
    assert res.status_code == 200
    data = res.json()
    assert "total_rwa" in data
    assert "pillar_1_minimum_capital" in data
    assert "rwa_density_pct" in data
    assert len(data["by_rating"]) > 0


def test_ifrs9_staging_endpoint():
    res = client.get("/api/v1/regulatory/ifrs9?sample_size=1000")
    assert res.status_code == 200
    data = res.json()
    assert "total_facilities" in data
    assert "stages" in data
    assert "stage_1" in data["stages"]
    assert "stage_2" in data["stages"]
    assert "stage_3" in data["stages"]


def test_raroc_pricing_endpoint():
    payload = {
        "credit_limit": 1000000,
        "drawn_balance": 800000,
        "interest_spread_bps": 300,
        "pd": 0.015,
        "lgd": 0.40,
        "maturity_years": 3.0,
        "upfront_fee_pct": 0.005,
        "ccf": 0.50,
    }
    res = client.post("/api/v1/pricing/raroc", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "raroc_pct" in data
    assert "economic_capital" in data
    assert "recommendation" in data
    assert len(data["sensitivity_curve"]) > 0


def test_enhanced_loans_search_and_filters():
    res = client.get("/api/v1/loans?rating=AAA&limit=5")
    assert res.status_code == 200
    loans = res.json()
    assert isinstance(loans, list)
    if loans:
        for ln in loans:
            assert ln["credit_rating"] == "AAA"
