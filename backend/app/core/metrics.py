"""
Prometheus Metrics Instrumentation for Credit Portfolio Risk Engine.
Tracks:
- API request counts & latencies
- Risk calculation durations
- Monte Carlo execution time
- Calculation errors
"""

import time
from typing import Callable
from fastapi import Request, Response
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

# Prometheus Metric Definitions
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total HTTP Requests received",
    ["method", "endpoint", "status_code"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP Request Latency in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
)

RISK_CALCULATION_DURATION_SECONDS = Histogram(
    "risk_calculation_duration_seconds",
    "Time spent running quantitative risk calculations",
    ["calculation_type"],
    buckets=[0.01, 0.05, 0.2, 0.5, 1.0, 2.0, 5.0, 15.0, 30.0]
)

MONTE_CARLO_SIMULATION_DURATION_SECONDS = Histogram(
    "monte_carlo_simulation_duration_seconds",
    "Execution duration for Monte Carlo loss simulations",
    ["n_simulations"],
    buckets=[0.05, 0.1, 0.5, 1.0, 3.0, 5.0, 10.0, 30.0]
)

CALCULATION_ERRORS_TOTAL = Counter(
    "risk_calculation_errors_total",
    "Count of exceptions during risk calculations",
    ["calculation_type"]
)

PORTFOLIO_EXPOSURE_GAUGE = Gauge(
    "portfolio_total_exposure_dollars",
    "Current total active exposure (EAD) in dollars"
)

PORTFOLIO_EXPECTED_LOSS_GAUGE = Gauge(
    "portfolio_total_expected_loss_dollars",
    "Current aggregate Expected Loss in dollars"
)


async def prometheus_middleware(request: Request, call_next: Callable) -> Response:
    """FastAPI Middleware to measure request latency and count requests."""
    start_time = time.time()
    try:
        response = await call_next(request)
        status_code = response.status_code
    except Exception as exc:
        status_code = 500
        raise exc from None
    finally:
        duration = time.time() - start_time
        endpoint = request.url.path
        # Collapse dynamic path params to prevent high-cardinality metrics
        if endpoint.startswith("/api/v1/monte-carlo/") and len(endpoint.split("/")) > 4:
            endpoint = "/api/v1/monte-carlo/{run_id}"
        elif endpoint.startswith("/api/v1/borrowers/") and len(endpoint.split("/")) > 4:
            endpoint = "/api/v1/borrowers/{borrower_id}"
        elif endpoint.startswith("/api/v1/loans/") and len(endpoint.split("/")) > 4:
            endpoint = "/api/v1/loans/{loan_id}"

        HTTP_REQUESTS_TOTAL.labels(
            method=request.method,
            endpoint=endpoint,
            status_code=status_code
        ).inc()

        HTTP_REQUEST_DURATION_SECONDS.labels(
            method=request.method,
            endpoint=endpoint
        ).observe(duration)

    return response
