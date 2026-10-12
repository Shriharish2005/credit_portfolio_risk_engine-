"""
Credit Portfolio Risk Engine - Main FastAPI Application
=======================================================
Quantitative Credit Risk Analytics Platform.
"""

from datetime import datetime, timezone
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.metrics import prometheus_middleware
from backend.app.db.session import engine, Base
import backend.app.db.models  # Register all models for create_all

# API Routes
from backend.app.api.routes import (
    borrowers,
    loans,
    portfolio,
    pd,
    lgd,
    ead,
    expected_loss,
    migration,
    concentration,
    stress_testing,
    monte_carlo,
    reports,
    regulatory,
    pricing,
    ml_credit_risk,
    data_management,
    pipeline,
    kafka_streaming,
)
from backend.app.kafka.producer import get_kafka_producer
from backend.app.kafka.consumer import get_kafka_consumer

# Initialize database schema tables
try:
    Base.metadata.create_all(bind=engine)
    logger.info("Database schema validated and tables verified.")
except Exception as e:
    logger.warning(f"Could not verify database schema automatically: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Quantitative Credit Risk Analytics Platform (PD, LGD, EAD, EL, VaR, Migration, Concentration, Stress Testing, Monte Carlo)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

@app.on_event("startup")
def startup_event():
    """Initializes Kafka streaming if enabled or available."""
    if settings.KAFKA_ENABLED:
        logger.info("Kafka streaming enabled in config. Connecting producer and consumer...")
        producer = get_kafka_producer()
        producer.connect()
        consumer = get_kafka_consumer()
        consumer.start()
    else:
        logger.info("Kafka disabled in configuration (KAFKA_ENABLED=false).")

@app.on_event("shutdown")
def shutdown_event():
    """Graceful shutdown of Kafka producer and consumer connections."""
    logger.info("Shutting down Kafka resources...")
    try:
        consumer = get_kafka_consumer()
        consumer.stop()
    except Exception as e:
        logger.warning(f"Error closing Kafka consumer: {e}")
    try:
        producer = get_kafka_producer()
        producer.close()
    except Exception as e:
        logger.warning(f"Error closing Kafka producer: {e}")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Prometheus Metrics Middleware
app.middleware("http")(prometheus_middleware)


@app.get("/health", tags=["Health & Diagnostics"])
def health_check():
    """Health check endpoint confirming engine operational readiness."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
    }


@app.get("/metrics", tags=["Health & Diagnostics"])
def get_prometheus_metrics():
    """Prometheus metrics scrape target."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Include API v1 Routes
api_v1_prefix = settings.API_V1_PREFIX

app.include_router(borrowers.router, prefix=api_v1_prefix)
app.include_router(loans.router, prefix=api_v1_prefix)
app.include_router(portfolio.router, prefix=api_v1_prefix)
app.include_router(pd.router, prefix=api_v1_prefix)
app.include_router(lgd.router, prefix=api_v1_prefix)
app.include_router(ead.router, prefix=api_v1_prefix)
app.include_router(expected_loss.router, prefix=api_v1_prefix)
app.include_router(migration.router, prefix=api_v1_prefix)
app.include_router(concentration.router, prefix=api_v1_prefix)
app.include_router(stress_testing.router, prefix=api_v1_prefix)
app.include_router(monte_carlo.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)
app.include_router(regulatory.router, prefix=api_v1_prefix)
app.include_router(pricing.router, prefix=api_v1_prefix)
app.include_router(ml_credit_risk.router, prefix=api_v1_prefix)
app.include_router(data_management.router, prefix=api_v1_prefix)
app.include_router(pipeline.router, prefix=api_v1_prefix)
app.include_router(kafka_streaming.router, prefix=api_v1_prefix)

logger.info(f"{settings.PROJECT_NAME} initialized with API prefix {api_v1_prefix}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
