# Credit Portfolio Risk Engine — REST API Documentation

Base URL: `http://localhost:8000/api/v1`

Interactive Swagger UI: `http://localhost:8000/docs`  
ReDoc: `http://localhost:8000/redoc`

---

## 1. System Diagnostics

### Health Check
`GET /health`
```json
{
  "status": "healthy",
  "service": "Credit Portfolio Risk Engine",
  "environment": "development",
  "timestamp": "2026-09-30T12:00:00Z",
  "version": "1.0.0"
}
```

### Prometheus Metrics
`GET /metrics`
Returns raw Prometheus scraping metrics for request counts, latencies, and calculation durations.

---

## 2. Portfolio Endpoints

### Portfolio Executive Summary
`GET /api/v1/portfolio/summary`

Response:
```json
{
  "total_exposure": 850000000.0,
  "total_loans": 50000,
  "total_expected_loss": 12500000.0,
  "weighted_pd": 0.0245,
  "weighted_lgd": 0.432,
  "expected_loss_rate": 1.47,
  "var_95": 38500000.0,
  "var_99": 65200000.0,
  "expected_shortfall_99": 74300000.0
}
```

### Portfolio Exposure Breakdowns
`GET /api/v1/portfolio/exposure`

Returns exposure breakdown by credit rating, sector, geography, and top obligors.

---

## 3. Quantitative Risk Calculations

### Calculate Probability of Default (PD)
`GET /api/v1/risk/pd`

Query Parameters:
- `rating`: string (default "BBB")
- `leverage`: float (default 2.5)
- `debt_ratio`: float (default 0.45)
- `interest_coverage`: float (default 3.5)
- `profitability`: float (default 0.12)
- `liquidity`: float (default 1.8)
- `unemployment_rate`: float (default 5.0)
- `interest_rate`: float (default 6.0)

### Calculate Loss Given Default (LGD)
`GET /api/v1/risk/lgd`

Query Parameters:
- `exposure`: float
- `collateral_value`: float
- `collateral_type`: string (`COMMERCIAL_REAL_ESTATE`, `EQUIPMENT`, etc.)
- `seniority`: string (`SENIOR_SECURED`, `SENIOR_UNSECURED`, etc.)
- `haircut_override`: float (optional)
- `downturn_multiplier`: float (default 1.0)

### Calculate Exposure at Default (EAD)
`GET /api/v1/risk/ead`

Query Parameters:
- `drawn_balance`: float
- `credit_limit`: float
- `facility_type`: string (`TERM_LOAN`, `REVOLVING_CREDIT`, `COMMERCIAL_LINE`, etc.)
- `ccf_override`: float (optional)

### Single Loan Expected Loss
`POST /api/v1/risk/expected-loss`

Request Body:
```json
{
  "pd": 0.02,
  "lgd": 0.45,
  "ead": 1000000.0
}
```

---

## 4. Migration & Concentration

### Credit Rating Migration
`GET /api/v1/risk/migration?periods=1`

Returns transition matrix $P^n$, upgrade probabilities, downgrade probabilities, and default rates.

### Concentration Risk
`GET /api/v1/risk/concentration`

Returns HHI for obligors, sectors, and geographies, Gini coefficient, and top-5/10/20 shares.

---

## 5. Stress Testing

### Execute Standard Scenarios
`GET /api/v1/stress-tests`

Compares Base, Moderate, and Severe macroeconomic scenarios.

### Execute Custom Macro Scenario
`POST /api/v1/stress-tests`

Request Body:
```json
{
  "name": "CustomStagflation",
  "description": "High interest rates and severe economic contraction",
  "gdp_growth": -3.0,
  "interest_rate": 11.0,
  "unemployment_rate": 13.5,
  "collateral_haircut_shock": 0.20
}
```

---

## 6. Monte Carlo Loss Simulation

### Run Simulation
`POST /api/v1/monte-carlo/run`

Request Body:
```json
{
  "n_simulations": 10000,
  "random_seed": 42,
  "asset_correlation": 0.18,
  "stochastic_lgd": false,
  "sample_size": 5000
}
```

### Retrieve Run Results by ID
`GET /api/v1/monte-carlo/{run_id}`

---

## 7. Model Validation & Reporting

### Validate Credit Models
`POST /api/v1/models/validate`

Request Body:
```json
{
  "sample_size": 5000,
  "n_bins": 10
}
```

### Portfolio Report
`GET /api/v1/reports/portfolio`
