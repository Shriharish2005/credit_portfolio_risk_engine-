# Credit Portfolio Risk Engine

An institutional **quantitative credit-risk platform** and capital adequacy simulation engine. Designed for quantitative risk analysts, credit portfolio managers, and model validation engineers.

> **NOT AN AI PROJECT**: This platform is powered entirely by quantitative finance models, actuarial methods, and statistical algorithms (NumPy, SciPy, Pandas, Statsmodels, Scikit-learn, and one-factor Gaussian copula Monte Carlo simulations). No LLMs or AI chatbots are used.

---

## Table of Contents
1. [Core Features & Quantitative Capabilities](#core-features--quantitative-capabilities)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Project Structure](#project-structure)
5. [Prerequisites](#prerequisites)
6. [Quick Start & Setup Instructions](#quick-start--setup-instructions)
   - [1. Backend Setup](#1-backend-setup)
   - [2. Synthetic Data Generation](#2-synthetic-data-generation)
   - [3. Database Setup & Migrations](#3-database-setup--migrations)
   - [4. Frontend Setup](#4-frontend-setup)
7. [Running the Application](#running-the-application)
8. [Executing the Test Suite](#executing-the-test-suite)
9. [Quantitative Risk Methodology](#quantitative-risk-methodology)
10. [Infrastructure Integrations](#infrastructure-integrations)
    - [PostgreSQL](#postgresql-setup)
    - [Redis Caching](#redis-caching)
    - [Apache Kafka](#apache-kafka-streaming)
    - [Prometheus & Grafana Monitoring](#prometheus--grafana-monitoring)
11. [Limitations & Model Validation Disclaimer](#limitations--model-validation-disclaimer)

---

## Core Features & Quantitative Capabilities

- **Probability of Default (PD)**:
  - Annualized 1-year Through-The-Cycle (TTC) rating master scale (`AAA` to `CCC`, `Default`).
  - Vasicek Point-In-Time (PIT) conditional macroeconomic adjustment.
  - Multivariate calibrated Logistic Regression scoring model incorporating leverage, debt ratios, interest coverage, liquidity, unemployment, and benchmark interest rates.
- **Loss Given Default (LGD)**:
  - Workout recovery engine incorporating collateral haircuts by asset class (`Cash`, `Commercial Real Estate`, `Equipment`, `Receivables`).
  - Facility seniority recovery tiering (`Senior Secured`, `Senior Unsecured`, `Subordinated`, `Junior`).
  - Strict mathematical boundary guarantees: $0.0 \le \text{LGD} \le 1.0$.
- **Exposure at Default (EAD)**:
  - Basel standard Credit Conversion Factors ($\text{CCF}$) for revolving commitments and letters of credit: $\text{EAD} = \text{Drawn} + \text{CCF} \times \text{Undrawn}$.
  - Strict guarantee: $\text{EAD} \ge 0$.
- **Expected Loss (EL)**:
  - Single loan and aggregated portfolio EL: $\text{Portfolio EL} = \sum (\text{PD} \times \text{LGD} \times \text{EAD})$.
  - Exposure-weighted average PD and LGD.
- **Credit Rating Migration**:
  - Empirical and benchmark Markov transition matrices.
  - Multi-period transitions via matrix exponentiation: $P(n) = P^n$.
  - Absorbing default state dynamics, upgrade, downgrade, and stability distributions.
- **Concentration Risk**:
  - Herfindahl-Hirschman Index (HHI) across obligors, sectors, and geographies.
  - Effective number of counterparties ($N_{\text{eff}} = 1 / \text{HHI}$).
  - Gini concentration inequality coefficient.
  - Top-5, Top-10, and Top-20 borrower concentration shares.
- **Macroeconomic Stress Testing**:
  - Predefined regulatory scenarios: **Base** (GDP +6%, IR 6.5%, Unemp 5%), **Moderate** (GDP +3%, IR 8%, Unemp 8%), **Severe** (GDP -2%, IR 10%, Unemp 14%).
  - Custom macroeconomic scenario simulator with collateral haircut stress shocks.
- **Monte Carlo Loss Simulation**:
  - Vectorized Vasicek one-factor Gaussian copula simulation ($Y_i = \sqrt{\rho} Z + \sqrt{1-\rho} \epsilon_i$).
  - Correlated defaults with systematic macro factor $Z \sim \mathcal{N}(0, 1)$ and idiosyncratic shocks $\epsilon_i \sim \mathcal{N}(0, 1)$.
  - 10,000 reproducible iterations using random seeds.
  - 95% and 99% Credit VaR, Expected Shortfall (CVaR), and Unexpected Loss (UL).
- **Model Validation & Diagnostics**:
  - Discrimination: ROC Curve, ROC-AUC, Gini accuracy ratio ($2 \times \text{AUC} - 1$), Kolmogorov-Smirnov (KS) statistic.
  - Calibration: Brier score, Hosmer-Lemeshow decile calibration curve.
  - Stability: Population Stability Index (PSI) with traffic-light indicators.
- **Basel III / IV IRB Regulatory Capital & Risk-Weighted Assets (RWA)**:
  - Advanced Internal Ratings-Based (A-IRB) capital requirement formula $K(PD, LGD, M)$ incorporating systemic asset correlation $R(PD)$ and maturity adjustments $b(PD)$.
  - Vectorized portfolio RWA calculation: $\text{RWA} = K \times 12.5 \times \text{EAD}$.
  - Statutory minimum Pillar 1 capital (8.0%), Capital Conservation Buffer (2.5%), CET1 (4.5%), and Tier 1 (6.0%) solvency schedules.
  - Interactive maturity and downturn stress sensitivity simulator.
- **IFRS 9 / CECL Multi-Stage Provisioning & SICR Engine**:
  - Three-stage impairment architecture: Stage 1 (Performing - 12m ECL), Stage 2 (Underperforming / SICR - Lifetime ECL), and Stage 3 (Credit-Impaired / Default).
  - Objective Significant Increase in Credit Risk (SICR) triggers ($\ge 2$ rating notches downgrade, PD doubling ratio $\ge 2.0$, and 30+ Days Past Due backstop).
  - Multi-stage coverage ratios ($ECL / EAD$) and what-if Stage 1 to Stage 2 migration stress shocks.
- **Risk-Adjusted Return on Capital (RAROC) & Deal Underwriting Desk**:
  - Commercial facility deal authorization desk balancing margin revenues against Expected Loss, operating costs, and Basel Economic Capital hurdle rates.
  - Calculation of Economic Value Added (EVA = $\text{Net Income} - \text{Capital} \times \text{Hurdle}$) and Breakeven Spread.
  - Real-time spread sensitivity curve matrix (100 to 500 bps).
- **Granular 50,000 Facility Explorer**:
  - Interactive data grid with search, Basel rating filters, facility type selectors, and pagination.
  - Single-facility trade slip inspection modal displaying full borrower metrics, LGD workout breakdowns, CCF, EAD, and EL.
- **Consolidated Portfolio Reports**:
  - Comprehensive institutional risk report exportable to JSON and printable format.

---

## Technology Stack

| Domain | Technologies |
| :--- | :--- |
| **Backend & APIs** | Python 3.11+, FastAPI, Pydantic V2, Uvicorn |
| **Quantitative Engine** | NumPy, SciPy, Pandas, Polars, Statsmodels, Scikit-learn, PyArrow |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Apache ECharts, Lucide Icons |
| **Database & ORM** | PostgreSQL, SQLite (local development fallback), SQLAlchemy 2.0, Alembic |
| **Cache** | Redis, In-Memory TTL Cache fallback |
| **Streaming** | Apache Kafka, Domain Event Bus fallback |
| **Monitoring** | Prometheus Client, Grafana Provisioning |
| **Testing & CI/CD** | Pytest, Pytest-Cov, GitHub Actions |

---

## Architecture Overview

The system is architected as a **Modular Monolith**:
- **Quantitative Engine Independence**: The risk engine (`backend/risk_engine/`) has **zero web or framework dependencies**. It can be imported directly into Python scripts, batch workers, or Jupyter notebooks.
- **FastAPI Layer**: Thin HTTP adapters that validate request schemas and call application services.
- **Zero-Friction Local Execution**: Automatic local fallbacks (SQLite, in-memory cache, in-memory event bus) allow the engine to execute without requiring external daemon infrastructure or containers.

---

## Project Structure

```text
credit-portfolio-risk-engine/
├── backend/
│   ├── app/
│   │   ├── api/routes/          # FastAPI route controllers
│   │   ├── core/                # Config, logging, cache, events, metrics
│   │   ├── db/
│   │   │   ├── models/          # SQLAlchemy ORM models (17 entities)
│   │   │   ├── repositories/    # Data access layer
│   │   │   └── session.py       # Engine & session management
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # Business & risk orchestration services
│   │   └── main.py              # Application entry point & middleware
│   ├── risk_engine/             # Standalone Quantitative Engine
│   │   ├── pd/                  # Rating scale & logistic regression PD
│   │   ├── lgd/                 # Workout LGD with haircuts & seniority
│   │   ├── ead/                 # CCF & undrawn line exposure model
│   │   ├── expected_loss/       # EL & portfolio aggregation
│   │   ├── migration/           # Markov transition matrix & P^n powers
│   │   ├── concentration/       # HHI & Gini calculation
│   │   ├── stress_testing/      # CCAR / EBA macro scenario engine
│   │   ├── monte_carlo/         # Gaussian copula portfolio simulation
│   │   └── validation/          # ROC-AUC, KS, Brier, PSI diagnostics
│   ├── tests/
│   │   ├── unit/                # Unit tests for all financial formulas
│   │   └── integration/         # FastAPI endpoint integration tests
│   ├── migrations/              # Alembic database migrations
│   ├── pyproject.toml           # Python packaging configuration
│   ├── requirements.txt         # Pinned backend dependencies
│   ├── alembic.ini              # Alembic migration configuration
│   └── .env.example             # Example environment variables
├── frontend/
│   ├── src/
│   │   ├── components/          # Navbar, Sidebar, MetricCard, Spinner
│   │   ├── pages/               # 9 Risk analytics pages
│   │   ├── charts/              # Apache ECharts components
│   │   ├── services/api.ts      # Typed REST API client
│   │   └── types/index.ts       # TypeScript interface contracts
│   ├── package.json             # Node dependencies
│   ├── vite.config.ts           # Vite proxy & build configuration
│   └── tailwind.config.js       # Institutional dark financial styling
├── data/
│   ├── raw/
│   ├── synthetic/               # 9 generated CSV datasets (10k obligors, 50k loans)
│   └── processed/               # High-performance Parquet caches
├── notebooks/                   # Jupyter analysis & quantitative exploration
│   ├── pd_analysis.ipynb
│   ├── credit_migration.ipynb
│   ├── stress_testing.ipynb
│   └── monte_carlo.ipynb
├── scripts/
│   └── generate_synthetic_data.py # Reproducible portfolio data generator
├── docs/
│   ├── architecture.md          # Architecture & data flow documentation
│   ├── methodology.md           # Mathematical formulas & proofs
│   └── api.md                   # REST API documentation & schemas
├── monitoring/
│   ├── prometheus.yml           # Prometheus scrape configuration
│   └── grafana/                 # Grafana datasource & dashboard JSON
├── .github/workflows/
│   └── ci.yml                   # GitHub Actions automated test & build workflow
├── README.md
└── .gitignore
```

---

## Prerequisites

- **Python**: Version 3.11 or higher
- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher

---

## Quick Start & Setup Instructions

### 1. Backend Setup

```bash
# Clone / navigate into project
cd credit-portfolio-risk-engine

# Optional: Create and activate virtual environment
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
# source venv/bin/activate

# Install Python dependencies
pip install -r backend/requirements.txt
```

### 2. Synthetic Data Generation

Generate the realistic synthetic portfolio (10,000 obligors, 50,000 facilities, collateral, payment history, and macro data):

```bash
python scripts/generate_synthetic_data.py --borrowers 10000 --loans 50000 --seed 42
```

This creates:
- `data/synthetic/borrowers.csv` (10,000 corporate obligors)
- `data/synthetic/loans.csv` (50,000 credit facilities with PD, LGD, EAD, EL)
- `data/synthetic/collateral.csv` (Pledged assets with haircuts)
- `data/synthetic/ratings_history.csv` (Multi-year rating transitions)
- `data/synthetic/defaults.csv` (Historical defaults and recovery workouts)
- `data/synthetic/payments.csv` (Monthly repayment histories)
- `data/synthetic/financial_statements.csv` (Balance sheets & income statements)
- `data/synthetic/macroeconomic_data.csv` (Quarterly GDP, rates, unemployment)
- `data/synthetic/scenarios.csv` (Benchmark stress scenarios)
- `data/processed/*.parquet` (High-speed columnar analytics cache)

### 3. Database Setup & Migrations

Configure your `.env` file from the example template:

```bash
copy backend\.env.example backend\.env
```

If PostgreSQL is running, specify `DATABASE_URL=postgresql://user:password@localhost:5432/credit_risk_db`.  
If PostgreSQL is not running, the application **automatically uses SQLite (`sqlite:///./credit_risk.db`)** so you can develop immediately.

Run database migrations:
```bash
# Optional when using PostgreSQL:
python -m alembic upgrade head
```

### 4. Frontend Setup

```bash
cd frontend
npm install
cd ..
```

---

## Running the Application

### Start the Backend Server

In your terminal:
```bash
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

- API Base URL: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`
- Prometheus Metrics: `http://127.0.0.1:8000/metrics`

### Start the Frontend Dev Server

In a second terminal:
```bash
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## Executing the Test Suite

Execute the complete Pytest test suite covering unit formulas and API integration:

```bash
python -m pytest backend/tests -v
```

All 42 tests pass with 100% test success across:
- Expected Loss formula verification ($EL = PD \times LGD \times EAD$)
- Monotonic rating scale order and PIT Vasicek adjustment
- LGD boundary proofs ($0 \le LGD \le 1$) and seniority hierarchy
- EAD Credit Conversion Factor ($CCF$) calculations
- Markov transition matrix stochasticity and multi-period powers ($P^n$)
- Herfindahl-Hirschman Index ($HHI$) theoretical benchmarks
- Monte Carlo random seed reproducibility and convergence
- Macroeconomic stress scenario progression (Base < Moderate < Severe)
- Model validation discrimination (ROC, Gini, KS) and calibration
- FastAPI REST endpoint contracts and Prometheus metrics

---

## Quantitative Risk Methodology

| Metric / Model | Mathematical Formulation | Regulatory Benchmark |
| :--- | :--- | :--- |
| **Expected Loss (EL)** | $\text{EL} = \text{PD} \times \text{LGD} \times \text{EAD}$ | IFRS 9 / CECL Stage 1 Provisioning |
| **Point-in-Time PD** | $\Phi\left(\frac{\Phi^{-1}(\text{PD}_{\text{TTC}}) - \sqrt{\rho} Z}{\sqrt{1 - \rho}}\right)$ | Vasicek Portfolio Credit Loss Model |
| **Workout LGD** | $1 - \frac{\min(\text{EAD}, \text{Col} \cdot (1 - h)) + \text{Unsec} \cdot R}{\text{EAD}}$ | Basel Foundation IRB Haircut Framework |
| **Credit Conversion** | $\text{EAD} = \text{Drawn} + \text{CCF} \cdot (\text{Limit} - \text{Drawn})$ | Basel Framework CRE20 |
| **Transition Matrix** | $P(n) = P^n$ | CreditMetrics Markov Framework |
| **Concentration (HHI)**| $\text{HHI} = \sum s_i^2, \quad N_{\text{eff}} = 1 / \text{HHI}$ | DOJ / FTC / Basel Concentration |
| **Credit VaR** | $\text{VaR}_\alpha = \text{Percentile}_\alpha(\text{Simulated Losses})$ | Basel Pillar 1 IRB (99.9% VaR) |
| **Expected Shortfall**| $\text{ES}_\alpha = \mathbb{E}[L \mid L \ge \text{VaR}_\alpha]$ | Basel Fundamental Review of Trading Book (FRTB) |

---

## Infrastructure Integrations

### PostgreSQL Setup
To connect to an external PostgreSQL instance:
```bash
set DATABASE_URL=postgresql://postgres:postgres@localhost:5432/credit_risk_db
```
The application uses SQLAlchemy connection pooling with automatic reconnection verification (`pool_pre_ping=True`).

### Redis Caching
Set `REDIS_URL=redis://localhost:6379/0`.  
Expensive analytical aggregations (portfolio summaries, concentration matrices, migration tables) are cached with TTLs. If Redis is unavailable, the application operates using a thread-safe local memory cache.

### Apache Kafka Streaming (KRaft Mode Real-Time Pipeline)

The engine features an enterprise event-driven streaming layer powered by **Apache Kafka in KRaft mode** (no ZooKeeper required):

```
Event Generator → Kafka Producer → Topic ('credit-events') → Kafka Consumer → Existing Risk Engine → PostgreSQL → Dashboard / REST APIs
```

#### 1. Start Kafka Broker via Docker Compose (KRaft Mode)
To launch the KRaft-mode Kafka cluster and automatically create the `credit-events` topic:
```bash
docker compose up -d
```
Check cluster readiness:
```bash
docker compose ps
docker logs credit-risk-kafka-init
```

To list or inspect topics directly:
```bash
docker exec -it credit-risk-kafka /opt/bitnami/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 --list
```

#### 2. Configure Environment for Real-Time Streaming
Enable Kafka in `.env` or set environment variables:
```bash
# Windows PowerShell
$env:KAFKA_ENABLED="true"
$env:KAFKA_BOOTSTRAP_SERVERS="localhost:9092"
$env:KAFKA_TOPIC_CREDIT_EVENTS="credit-events"
$env:KAFKA_CONSUMER_GROUP_ID="credit-risk-consumer-group"

# Linux / macOS / Bash
export KAFKA_ENABLED=true
export KAFKA_BOOTSTRAP_SERVERS=localhost:9092
export KAFKA_TOPIC_CREDIT_EVENTS=credit-events
export KAFKA_CONSUMER_GROUP_ID=credit-risk-consumer-group
```

#### 3. Run the Real-Time Synthetic Credit Event Generator
Generate and stream live financial credit events into Kafka:
```bash
# Continuous event generation (1 event per second)
python backend/app/kafka/generator.py --count 50 --interval 1.0

# Infinite continuous streaming stream
python backend/app/kafka/generator.py --interval 0.5
```
Supported event types dispatched into Kafka:
1. `LOAN_CREATED`: Origination with initial PD, LGD, EAD, and Expected Loss calculations.
2. `PAYMENT_RECEIVED`: Principal pay-down reducing drawn balance, EAD, and Expected Loss.
3. `PAYMENT_MISSED`: Delinquencies (30/60/90 DPD) triggering notch downgrade and PD escalation.
4. `UTILIZATION_CHANGED`: Line draws and CCF commitment recalculations.
5. `INCOME_CHANGED`: Financial statement EBITDA revisions updating obligor leverage and logistic score.
6. `DEFAULT_EVENT`: Insolvency filing shifting facility to Stage 3 default (PD = 1.0) and workout recovery.

#### 4. Automated Risk Recalculation & Consumer Processing
The background `CreditKafkaConsumer` worker continuously listens to `credit-events`, evaluates incoming transactions against the quantitative models (`RatingPDMapper`, `LogisticPDModel`, `LGDModel`, `EADModel`, and `ExpectedLossCalculator`), commits changes directly to PostgreSQL / SQLite, and invalidates cache layers so the dashboard reflects updated portfolio exposures in real time.

Interactive stream simulation and live telemetry can also be monitored via:
- Dashboard: Navigate to **Overview** -> **Kafka Live Stream** tab
- REST API: `GET /api/v1/kafka/status` and `POST /api/v1/kafka/simulate-stream`

### Prometheus & Grafana Monitoring
- Metrics are exposed at `/metrics`.
- Prometheus configuration is located at `monitoring/prometheus.yml`.
- Pre-built Grafana dashboard JSON is located at `monitoring/grafana/provisioning/dashboards/credit_risk_dashboard.json`.

---

## Limitations & Model Validation Disclaimer

1. **Educational & Quantitative Engineering Platform**: This software is intended for institutional quantitative credit risk research, portfolio stress testing, and software demonstration. It is **not** a certified regulatory submission under national supervisory authorities (e.g. Federal Reserve CCAR, ECB SREP).
2. **Synthetic Data**: All default histories, financial statements, and counterparty records are synthetically generated and explicitly labeled as **SYNTHETIC DATA — NOT REAL CUSTOMER/BANK DATA**.
3. **One-Factor Latent Variable Assumptions**: The Monte Carlo copula utilizes an asymptotic single risk factor (ASRF) assumption. High-dimensional multi-factor correlations or non-linear contagion dependencies should be validated prior to production deployment.
#   c r e d i t _ p o r t f o l i o _ r i s k _ e n g i n e -  
 