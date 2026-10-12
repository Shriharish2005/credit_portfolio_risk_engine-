"""
User Authentication, Role-Based Access Control, and Audit Logging Models
"""

from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text, JSON
from backend.app.db.session import Base


class Role(Base):
    __tablename__ = "roles"

    role_id = Column(String(50), primary_key=True, index=True)
    role_name = Column(String(50), nullable=False, unique=True)
    description = Column(String(255), nullable=True)
    permissions = Column(JSON, default=list)


class User(Base):
    __tablename__ = "users"

    user_id = Column(String(50), primary_key=True, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    email = Column(String(255), nullable=False, unique=True, index=True)
    hashed_password = Column(String(255), nullable=False)
    role_id = Column(String(50), default="RISK_ANALYST")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    log_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(50), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # RECALCULATE_RISK, TRIGGER_MONTE_CARLO, etc.
    entity_type = Column(String(50), nullable=True)
    entity_id = Column(String(50), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
