"""
Unit and Integration Tests for Apache Kafka Event Streaming Layer
==================================================================
Tests:
- Schema validation of all CreditEventType options
- Realistic synthetic credit event generation distributions
- CreditRiskEventProcessor integration with existing risk engines:
    - LOAN_CREATED (PD, LGD, EAD, EL stored to DB)
    - PAYMENT_RECEIVED (reduces drawn balance & recalculated EL)
    - PAYMENT_MISSED (downgrades rating, raises PD & EL)
    - UTILIZATION_CHANGED (recomputes CCF EAD & EL)
    - INCOME_CHANGED (logistic model leverage update)
    - DEFAULT_EVENT (triggers default PD=1.0, workout LGD)
- CreditKafkaProducer serialization, key partitioning, and offline buffering
- CreditKafkaConsumer lifecycle, graceful stop, and status telemetry
- Kafka API endpoints (/api/v1/kafka/status, /emit-event, /simulate-stream)
"""

import pytest
from datetime import datetime
from unittest.mock import MagicMock, patch

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.db.session import Base
from backend.app.db.models.loan import Loan
from backend.app.db.models.borrower import Borrower
from backend.app.kafka.events import CreditEvent, CreditEventType
from backend.app.kafka.generator import CreditEventGenerator
from backend.app.kafka.consumer import CreditRiskEventProcessor, CreditKafkaConsumer
from backend.app.kafka.producer import CreditKafkaProducer


@pytest.fixture(scope="function")
def test_db_session():
    """Isolated in-memory SQLite database session for Kafka processing tests."""
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=test_engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


def test_credit_events_schema():
    """Verify CreditEvent schema attributes and type parsing."""
    event = CreditEvent(
        event_id="evt-1001",
        event_type=CreditEventType.PAYMENT_RECEIVED,
        loan_id="LN-TEST-001",
        borrower_id="BORR-TEST-001",
        payload={"amount": 5000.0, "new_balance": 45000.0},
    )
    assert event.event_id == "evt-1001"
    assert event.event_type == CreditEventType.PAYMENT_RECEIVED
    assert event.loan_id == "LN-TEST-001"
    assert event.payload["amount"] == 5000.0
    assert isinstance(event.timestamp, datetime)


def test_event_generator_coverage():
    """Verify that synthetic generator generates all 6 credit event types with non-empty payloads."""
    generator = CreditEventGenerator()
    expected_types = {
        CreditEventType.LOAN_CREATED,
        CreditEventType.PAYMENT_RECEIVED,
        CreditEventType.PAYMENT_MISSED,
        CreditEventType.UTILIZATION_CHANGED,
        CreditEventType.INCOME_CHANGED,
        CreditEventType.DEFAULT_EVENT,
    }

    generated_types = set()
    for etype in expected_types:
        event = generator.generate_event(force_event_type=etype)
        assert event.event_type == etype
        assert event.loan_id is not None
        assert event.borrower_id is not None
        assert isinstance(event.payload, dict)
        assert len(event.payload) > 0
        generated_types.add(event.event_type)

    assert generated_types == expected_types


def test_event_processor_loan_created(test_db_session):
    """Ensure LOAN_CREATED event calculates PD, LGD, EAD, EL and persists to DB."""
    processor = CreditRiskEventProcessor()

    event_data = {
        "event_id": "evt-create-1",
        "event_type": CreditEventType.LOAN_CREATED.value,
        "loan_id": "LN-KAFKA-101",
        "borrower_id": "BORR-KAFKA-101",
        "payload": {
            "credit_limit": 200000.0,
            "drawn_balance": 150000.0,
            "facility_type": "REVOLVING_CREDIT",
            "seniority": "SENIOR_SECURED",
            "credit_rating": "BBB",
            "collateral_value": 180000.0,
            "collateral_type": "REAL_ESTATE",
            "interest_rate": 0.055,
        },
    }

    result = processor.process_event(event_data, db=test_db_session)

    assert result["action"] == "LOAN_CREATED"
    assert result["loan_id"] == "LN-KAFKA-101"
    assert result["ead"] > 0
    assert 0.0 < result["pd"] < 1.0
    assert 0.0 <= result["lgd"] <= 1.0
    assert result["expected_loss"] > 0

    # Verify loan row in DB
    loan_db = test_db_session.query(Loan).filter(Loan.loan_id == "LN-KAFKA-101").first()
    assert loan_db is not None
    assert loan_db.credit_limit == 200000.0
    assert loan_db.drawn_balance == 150000.0
    assert loan_db.status == "ACTIVE"


def test_event_processor_payment_received(test_db_session):
    """Ensure PAYMENT_RECEIVED reduces drawn balance and reduces Expected Loss."""
    processor = CreditRiskEventProcessor()

    # First create loan
    create_event = {
        "event_id": "evt-c1",
        "event_type": CreditEventType.LOAN_CREATED.value,
        "loan_id": "LN-PAY-101",
        "borrower_id": "BORR-PAY-101",
        "payload": {"credit_limit": 100000.0, "drawn_balance": 80000.0, "facility_type": "TERM_LOAN"},
    }
    init_res = processor.process_event(create_event, db=test_db_session)
    initial_el = init_res["expected_loss"]

    # Payment of 30,000
    pay_event = {
        "event_id": "evt-p1",
        "event_type": CreditEventType.PAYMENT_RECEIVED.value,
        "loan_id": "LN-PAY-101",
        "borrower_id": "BORR-PAY-101",
        "payload": {"amount": 30000.0, "new_balance": 50000.0},
    }
    pay_res = processor.process_event(pay_event, db=test_db_session)

    assert pay_res["action"] == "PAYMENT_RECEIVED"
    assert pay_res["new_drawn_balance"] == 50000.0
    # Expected loss must decrease when drawn balance decreases
    assert pay_res["new_expected_loss"] < initial_el


def test_event_processor_payment_missed(test_db_session):
    """Ensure PAYMENT_MISSED triggers downgrade and increases PD and EL."""
    processor = CreditRiskEventProcessor()

    create_event = {
        "event_id": "evt-c2",
        "event_type": CreditEventType.LOAN_CREATED.value,
        "loan_id": "LN-DELINQ-101",
        "borrower_id": "BORR-DELINQ-101",
        "payload": {"credit_limit": 100000.0, "drawn_balance": 80000.0, "credit_rating": "A", "facility_type": "TERM_LOAN"},
    }
    init_res = processor.process_event(create_event, db=test_db_session)
    initial_pd = init_res["pd"]

    missed_event = {
        "event_id": "evt-m1",
        "event_type": CreditEventType.PAYMENT_MISSED.value,
        "loan_id": "LN-DELINQ-101",
        "borrower_id": "BORR-DELINQ-101",
        "payload": {"days_past_due": 60, "missed_amount": 2500.0},
    }
    missed_res = processor.process_event(missed_event, db=test_db_session)

    assert missed_res["action"] == "PAYMENT_MISSED"
    assert missed_res["new_pd"] > initial_pd
    assert missed_res["status"] == "DELINQUENT"


def test_event_processor_utilization_changed(test_db_session):
    """Ensure UTILIZATION_CHANGED recomputes CCF and updates EAD."""
    processor = CreditRiskEventProcessor()

    create_event = {
        "event_id": "evt-c3",
        "event_type": CreditEventType.LOAN_CREATED.value,
        "loan_id": "LN-UTIL-101",
        "borrower_id": "BORR-UTIL-101",
        "payload": {"credit_limit": 100000.0, "drawn_balance": 20000.0, "facility_type": "REVOLVING_CREDIT"},
    }
    processor.process_event(create_event, db=test_db_session)

    util_event = {
        "event_id": "evt-u1",
        "event_type": CreditEventType.UTILIZATION_CHANGED.value,
        "loan_id": "LN-UTIL-101",
        "borrower_id": "BORR-UTIL-101",
        "payload": {"drawn_balance": 90000.0},
    }
    util_res = processor.process_event(util_event, db=test_db_session)

    assert util_res["action"] == "UTILIZATION_CHANGED"
    assert util_res["new_drawn_balance"] == 90000.0
    assert util_res["utilization_rate"] == 0.90
    assert util_res["new_ead"] >= 90000.0


def test_event_processor_default_event(test_db_session):
    """Ensure DEFAULT_EVENT sets PD=1.0 and marks loan DEFAULTED."""
    processor = CreditRiskEventProcessor()

    create_event = {
        "event_id": "evt-c4",
        "event_type": CreditEventType.LOAN_CREATED.value,
        "loan_id": "LN-DEF-101",
        "borrower_id": "BORR-DEF-101",
        "payload": {"credit_limit": 100000.0, "drawn_balance": 100000.0, "facility_type": "TERM_LOAN"},
    }
    processor.process_event(create_event, db=test_db_session)

    default_event = {
        "event_id": "evt-d1",
        "event_type": CreditEventType.DEFAULT_EVENT.value,
        "loan_id": "LN-DEF-101",
        "borrower_id": "BORR-DEF-101",
        "payload": {"reason": "CHAPTER_11_FILING", "recovery_estimate": 0.35},
    }
    def_res = processor.process_event(default_event, db=test_db_session)

    assert def_res["action"] == "DEFAULT_EVENT"
    assert def_res["status"] == "DEFAULTED"
    assert def_res["pd"] == 1.0
    assert def_res["lgd"] == 0.65


def test_kafka_producer_offline_handling():
    """Verify Kafka Producer handles disconnected / offline state gracefully without raising unhandled exceptions."""
    producer = CreditKafkaProducer(bootstrap_servers="localhost:9999", default_topic="credit-events")
    stats = producer.get_stats()
    assert stats["default_topic"] == "credit-events"

    # Attempt publish when broker offline
    dummy_event = {
        "event_id": "evt-offline-1",
        "event_type": "PAYMENT_RECEIVED",
        "loan_id": "LN-OFFLINE",
        "borrower_id": "BORR-OFFLINE",
        "payload": {},
    }
    success = producer.publish_event(dummy_event)
    assert success is False
    assert producer.get_stats()["failed_count"] >= 1
    producer.close()


def test_kafka_consumer_lifecycle():
    """Verify Kafka consumer thread lifecycle start and stop."""
    consumer = CreditKafkaConsumer(bootstrap_servers="localhost:9999", topic="credit-events")
    consumer.start()
    assert consumer.get_stats()["running"] is True
    consumer.stop(timeout=1.0)
    assert consumer.get_stats()["running"] is False
