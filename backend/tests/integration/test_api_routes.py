"""
Integration Tests for FastAPI Endpoints.
Verifies response status codes, payload structures, and mathematical integrity.
"""

import pytest


def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_prometheus_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "http_requests_total" in res.text


def test_portfolio_summary_endpoint(client):
    res = client.get("/api/v1/portfolio/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_exposure" in data
    assert "total_expected_loss" in data
    assert "weighted_pd" in data
    assert "weighted_lgd" in data
    assert "var_99" in data
    assert "expected_shortfall_99" in data
    assert data["total_exposure"] > 0


def test_portfolio_exposure_breakdowns_endpoint(client):
    res = client.get("/api/v1/portfolio/exposure")
    assert res.status_code == 200
    data = res.json()
    assert "by_rating" in data
    assert "by_sector" in data
    assert "by_geography" in data
    assert "top_borrowers" in data
    assert len(data["by_rating"]) > 0


def test_pd_endpoint(client):
    res = client.get("/api/v1/risk/pd?rating=BBB&leverage=2.5&unemployment_rate=5.0")
    assert res.status_code == 200
    data = res.json()
    assert "final_pd" in data
    assert 0.0 <= data["final_pd"] <= 1.0


def test_lgd_endpoint(client):
    res = client.get("/api/v1/risk/lgd?exposure=1000000&collateral_value=600000&seniority=SENIOR_SECURED")
    assert res.status_code == 200
    data = res.json()
    assert "lgd" in data
    assert 0.0 <= data["lgd"] <= 1.0


def test_ead_endpoint(client):
    res = client.get("/api/v1/risk/ead?drawn_balance=500000&credit_limit=1000000&facility_type=REVOLVING_CREDIT")
    assert res.status_code == 200
    data = res.json()
    assert "ead" in data
    assert data["ead"] >= 500000.0


def test_single_expected_loss_endpoint(client):
    payload = {"pd": 0.02, "lgd": 0.45, "ead": 1000000.0}
    res = client.post("/api/v1/risk/expected-loss", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["expected_loss"] == pytest.approx(9000.0, rel=1e-5)


def test_migration_endpoint(client):
    res = client.get("/api/v1/risk/migration?periods=1")
    assert res.status_code == 200
    data = res.json()
    assert "transition_matrix" in data
    assert "rating_analysis" in data
    assert len(data["transition_matrix"]) == 8


def test_concentration_endpoint(client):
    res = client.get("/api/v1/risk/concentration")
    assert res.status_code == 200
    data = res.json()
    assert "hhi_borrower" in data
    assert "hhi_sector" in data
    assert "top_10_share" in data
    assert "effective_obligors" in data


def test_stress_testing_endpoints(client):
    # Standard scenarios
    res_get = client.get("/api/v1/stress-tests")
    assert res_get.status_code == 200
    data_get = res_get.json()
    assert "scenarios" in data_get
    assert len(data_get["scenarios"]) >= 3

    # Custom scenario
    custom_payload = {
        "name": "CustomStagflation",
        "description": "High rates with deep recession",
        "gdp_growth": -3.5,
        "interest_rate": 12.0,
        "unemployment_rate": 15.0,
        "collateral_haircut_shock": 0.30,
    }
    res_post = client.post("/api/v1/stress-tests", json=custom_payload)
    assert res_post.status_code == 200
    data_post = res_post.json()
    assert "CustomStagflation" in data_post["comparison"]


def test_monte_carlo_endpoints(client):
    # Run simulation
    payload = {
        "n_simulations": 1000,
        "random_seed": 777,
        "asset_correlation": 0.18,
        "sample_size": 1000,
    }
    res_run = client.post("/api/v1/monte-carlo/run", json=payload)
    assert res_run.status_code == 200
    run_data = res_run.json()
    assert "run_id" in run_data
    assert "var_95" in run_data
    assert "var_99" in run_data
    assert "es_99" in run_data
    assert len(run_data["distribution"]) > 0

    run_id = run_data["run_id"]
    # Fetch by run_id
    res_get = client.get(f"/api/v1/monte-carlo/{run_id}")
    assert res_get.status_code == 200
    assert res_get.json()["run_id"] == run_id


def test_var_and_es_endpoints(client):
    res_var = client.get("/api/v1/risk/var?confidence=0.99")
    assert res_var.status_code == 200
    assert res_var.json()["var_amount"] > 0

    res_es = client.get("/api/v1/risk/expected-shortfall?confidence=0.99")
    assert res_es.status_code == 200
    assert res_es.json()["expected_shortfall"] >= res_var.json()["var_amount"]


def test_model_validation_endpoint(client):
    res = client.post("/api/v1/models/validate", json={"sample_size": 1000, "n_bins": 10})
    assert res.status_code == 200
    data = res.json()
    assert "discrimination" in data
    assert "calibration" in data
    assert "stability" in data
    assert "disclaimer" in data


def test_comprehensive_portfolio_report_endpoint(client):
    res = client.get("/api/v1/reports/portfolio")
    assert res.status_code == 200
    data = res.json()
    assert data["report_title"] == "Credit Portfolio Risk & Capital Adequacy Report"
    assert "executive_summary" in data
    assert "capital_and_tail_risk" in data


def test_kafka_api_routes(client):
    # Status endpoint
    res_status = client.get("/api/v1/kafka/status")
    assert res_status.status_code == 200
    status_data = res_status.json()
    assert "topic" in status_data
    assert status_data["topic"] == "credit-events"
    assert "producer_status" in status_data
    assert "consumer_status" in status_data

    # Emit event endpoint
    res_emit = client.post(
        "/api/v1/kafka/emit-event",
        json={
            "event_type": "PAYMENT_RECEIVED",
            "loan_id": "LN-API-TEST-1",
            "borrower_id": "BORR-API-TEST-1",
            "payload": {"amount": 5000.0, "new_balance": 45000.0},
        },
    )
    assert res_emit.status_code == 200
    emit_data = res_emit.json()
    assert emit_data["status"] == "success"
    assert "risk_engine_result" in emit_data
    assert emit_data["risk_engine_result"]["action"] == "PAYMENT_RECEIVED"

    # Simulate batch stream endpoint
    res_sim = client.post(
        "/api/v1/kafka/simulate-stream",
        json={"count": 3, "interval_seconds": 0.05},
    )
    assert res_sim.status_code == 200
    assert "Triggered simulation" in res_sim.json()["message"]
