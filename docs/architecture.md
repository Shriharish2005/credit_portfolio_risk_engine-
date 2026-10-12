# Credit Portfolio Risk Engine — Architecture Documentation

## 1. Overview
The **Credit Portfolio Risk Engine** is an institutional quantitative credit risk analytics and capital adequacy platform. It is engineered as a **Modular Monolith** designed for high numerical performance, strict mathematical correctness, deterministic simulation reproducibility, and regulatory compliance with Basel III/IV Internal Ratings-Based (IRB) standards.

```
+-----------------------------------------------------------------------------------+
|                                React / Vite Frontend                              |
|   (TypeScript, Tailwind CSS, Apache ECharts, Executive Dashboard, Stress Testing) |
+-----------------------------------------+-----------------------------------------+
                                          | JSON over REST API (/api/v1)
                                          v
+-----------------------------------------------------------------------------------+
|                              FastAPI Application Layer                            |
|             (Pydantic Schemas, Dependency Injection, Prometheus Middleware)       |
+-----------------------------------------+-----------------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                                                   |
        v                                                                   v
+-----------------------------+                           +---------------------------------+
|       Service Layer         |                           |      Independent Risk Engine    |
| - PortfolioService          |                           | - Rating & Logistic PD Engine   |
| - RiskService               |                           | - Workout LGD & Haircut Engine  |
| - MigrationService          |                           | - CCF EAD Engine                |
| - ConcentrationService      |                           | - Expected Loss Calculator      |
| - StressTestService         |                           | - Markov Transition Engine      |
| - MonteCarloService         |                           | - HHI & Concentration Engine    |
| - ValidationService         |                           | - Macroeconomic Stress Engine   |
+--------------+--------------+                           | - Vasicek Gaussian Copula MC    |
               |                                          | - Model Validation Diagnostics  |
               +----------------------------------------> +---------------------------------+
                                          |
        +---------------------------------+---------------------------------+
        |                                 |                                 |
        v                                 v                                 v
+------------------+             +------------------+             +--------------------+
| Database Layer   |             | Cache Layer      |             | Event Bus Layer    |
| - PostgreSQL     |             | - Redis          |             | - Apache Kafka     |
| - SQLite Dev     |             | - Local Memory   |             | - In-Memory Queue  |
| - SQLAlchemy 2.0 |             |   Fallback       |             |   Fallback         |
| - Alembic        |             +------------------+             +--------------------+
+------------------+
```

---

## 2. Core Architecture Principles

### 2.1 Decoupled Risk Engine
All financial, quantitative, and statistical algorithms reside in `backend/risk_engine/`.
- Zero FastAPI or HTTP dependencies.
- Can be imported as an independent Python library or executed inside Jupyter notebooks and batch risk pipelines.
- Vectorized operations using **NumPy**, **SciPy**, and **Pandas** for sub-second execution on large loan portfolios (50,000+ facilities).

### 2.2 Modular Monolith Design
The system avoids microservice operational overhead and distributed network latency:
- Direct in-memory method invocations between Services and the Risk Engine.
- Clean layer separation: `api/routes` &rarr; `services` &rarr; `risk_engine` & `db/repositories`.

### 2.3 Resilient Infrastructure Fallbacks
To enable immediate execution and demonstration without Docker, local PostgreSQL, Redis, or Kafka instances:
- **Database**: Defaults to PostgreSQL (`DATABASE_URL`), seamlessly falling back to local SQLite (`credit_risk.db`).
- **Cache**: Tries Redis (`REDIS_URL`) with sub-millisecond in-memory dictionary caching fallback.
- **Events**: Supports Apache Kafka brokers with internal event bus fallback.

---

## 3. Directory Layout & Boundaries

- `backend/app/api/routes/`: Thin HTTP adapters validating Pydantic models.
- `backend/app/core/`: Configuration, logging, Prometheus metrics, cache, and event bus.
- `backend/app/db/`: SQLAlchemy ORM models, Alembic migrations, and data access repositories.
- `backend/app/schemas/`: Pydantic V2 data contracts.
- `backend/app/services/`: Business logic, aggregation caching, and transaction boundaries.
- `backend/risk_engine/`: Mathematical, actuarial, and copula loss simulation algorithms.
- `frontend/`: Single Page Application (SPA) with React, TypeScript, and Apache ECharts.
- `data/`: Raw, synthetic, and processed high-performance Parquet dataset files.
- `monitoring/`: Prometheus scrape configuration and Grafana dashboards.
