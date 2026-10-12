"""
Risk Calculation, Simulation, Scenarios, and Model Validation Database Models
"""

from datetime import datetime
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, DateTime, JSON
from backend.app.db.session import Base


class RiskParameter(Base):
    __tablename__ = "risk_parameters"

    param_id = Column(String(50), primary_key=True, index=True)
    param_category = Column(String(50), nullable=False, index=True)  # PD, LGD, EAD, CORRELATION
    param_name = Column(String(100), nullable=False)
    param_value = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    effective_date = Column(String(20), nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    scenario_id = Column(String(50), primary_key=True, index=True)
    scenario_name = Column(String(100), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    gdp_growth = Column(Float, nullable=False)
    interest_rate = Column(Float, nullable=False)
    unemployment_rate = Column(Float, nullable=False)
    collateral_haircut_shock = Column(Float, default=0.0)
    is_standard = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    run_id = Column(String(50), primary_key=True, index=True)
    run_type = Column(String(50), default="MONTE_CARLO")  # MONTE_CARLO, STRESS_TEST
    status = Column(String(30), default="COMPLETED", index=True)  # PENDING, RUNNING, COMPLETED, FAILED
    n_simulations = Column(Integer, default=10000)
    random_seed = Column(Integer, default=42)
    portfolio_total_ead = Column(Float, default=0.0)
    mean_loss = Column(Float, default=0.0)
    std_loss = Column(Float, default=0.0)
    var_95 = Column(Float, default=0.0)
    var_99 = Column(Float, default=0.0)
    es_95 = Column(Float, default=0.0)
    es_99 = Column(Float, default=0.0)
    unexpected_loss_99 = Column(Float, default=0.0)
    execution_time_seconds = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_id = Column(String(50), index=True, nullable=False)
    metrics_json = Column(JSON, nullable=False)  # full percentiles, distributions, bin metrics
    created_at = Column(DateTime, default=datetime.utcnow)


class RiskResult(Base):
    __tablename__ = "risk_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    as_of_date = Column(String(20), nullable=False, index=True)
    calculation_type = Column(String(50), nullable=False)  # EL, CONCENTRATION, MIGRATION
    total_exposure = Column(Float, default=0.0)
    total_expected_loss = Column(Float, default=0.0)
    weighted_pd = Column(Float, default=0.0)
    weighted_lgd = Column(Float, default=0.0)
    hhi_borrower = Column(Float, default=0.0)
    hhi_sector = Column(Float, default=0.0)
    hhi_geography = Column(Float, default=0.0)
    metrics_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelVersion(Base):
    __tablename__ = "model_versions"

    model_id = Column(String(50), primary_key=True, index=True)
    model_name = Column(String(100), nullable=False)
    version = Column(String(20), nullable=False)
    model_type = Column(String(50), nullable=False)  # LOGISTIC_PD, WORKOUT_LGD, GAUSSIAN_COPULA
    status = Column(String(30), default="ACTIVE")
    hyperparameters = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ModelValidation(Base):
    __tablename__ = "model_validation"

    validation_id = Column(String(50), primary_key=True, index=True)
    model_id = Column(String(50), nullable=False, index=True)
    as_of_date = Column(String(20), nullable=False)
    roc_auc = Column(Float, default=0.0)
    gini = Column(Float, default=0.0)
    ks_statistic = Column(Float, default=0.0)
    brier_score = Column(Float, default=0.0)
    psi = Column(Float, default=0.0)
    status = Column(String(30), default="PASSED")
    validation_report_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
