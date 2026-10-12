"""
Application Configuration and Environment Variables
"""

import os
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Credit Portfolio Risk Engine"
    API_V1_PREFIX: str = "/api/v1"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    SECRET_KEY: str = "credit-risk-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # Database: PostgreSQL with SQLite fallback for frictionless local execution
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./credit_risk.db")

    # Redis Cache
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CACHE_EXPIRATION_SECONDS: int = 3600

    # Event Streaming: Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
    KAFKA_ENABLED: bool = os.getenv("KAFKA_ENABLED", "false").lower() == "true"
    KAFKA_TOPIC_CREDIT_EVENTS: str = os.getenv("KAFKA_TOPIC_CREDIT_EVENTS", "credit-events")
    KAFKA_CONSUMER_GROUP_ID: str = os.getenv("KAFKA_CONSUMER_GROUP_ID", "credit-risk-consumer-group")

    # Data paths
    DATA_DIR: str = os.getenv("DATA_DIR", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data"))

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")


settings = Settings()
