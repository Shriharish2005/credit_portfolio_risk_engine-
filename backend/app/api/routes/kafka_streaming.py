"""
Kafka Streaming Control & Monitoring API Endpoints
===================================================
Provides endpoints for monitoring Kafka connection, checking credit-events metrics,
triggering synthetic event simulations, and checking consumer health.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.kafka.events import CreditEvent, CreditEventType
from backend.app.kafka.producer import get_kafka_producer
from backend.app.kafka.consumer import get_kafka_consumer, CreditRiskEventProcessor
from backend.app.kafka.generator import CreditEventGenerator

router = APIRouter(prefix="/kafka", tags=["Kafka Event Streaming"])


class KafkaStatusResponse(BaseModel):
    kafka_enabled: bool
    bootstrap_servers: str
    topic: str
    consumer_group: str
    producer_status: Dict[str, Any]
    consumer_status: Dict[str, Any]


class EmitEventRequest(BaseModel):
    event_type: Optional[CreditEventType] = None
    loan_id: Optional[str] = None
    borrower_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)


class SimulationBatchRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=100)
    interval_seconds: float = Field(default=0.2, ge=0.0, le=5.0)


@router.get("/status", response_model=KafkaStatusResponse)
def get_kafka_status():
    """Returns Kafka broker status, producer metrics, and consumer telemetry."""
    producer = get_kafka_producer()
    consumer = get_kafka_consumer()

    return KafkaStatusResponse(
        kafka_enabled=settings.KAFKA_ENABLED,
        bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
        topic=settings.KAFKA_TOPIC_CREDIT_EVENTS,
        consumer_group=settings.KAFKA_CONSUMER_GROUP_ID,
        producer_status=producer.get_stats(),
        consumer_status=consumer.get_stats(),
    )


# In-memory circular buffer of recent processed events for the live UI stream feed
_recent_events_log: List[Dict[str, Any]] = []


@router.get("/events")
def get_recent_events(limit: int = Query(30, ge=1, le=100)):
    """Returns the most recent credit events processed with their quantitative risk engine results."""
    return _recent_events_log[:limit]


@router.post("/emit-event")
def emit_credit_event(request: EmitEventRequest):
    """
    Manually injects or tests an individual credit event into the real-time pipeline.
    If Kafka is connected, publishes via Producer; also processes via risk engine.
    """
    generator = CreditEventGenerator()
    if request.event_type:
        event = generator.generate_event(force_event_type=request.event_type)
    else:
        event = generator.generate_event()

    if request.loan_id:
        event.loan_id = request.loan_id
    if request.borrower_id:
        event.borrower_id = request.borrower_id
    if request.payload:
        event.payload.update(request.payload)

    producer = get_kafka_producer()
    published_to_kafka = producer.publish_event(event)

    # Process via existing risk engine models
    processor = CreditRiskEventProcessor()
    calculation_result = processor.process_event(event.model_dump())

    record = {
        "event_id": event.event_id,
        "timestamp": event.timestamp.isoformat(),
        "event_type": event.event_type.value,
        "loan_id": event.loan_id,
        "borrower_id": event.borrower_id,
        "published_to_kafka": published_to_kafka,
        "payload": event.payload,
        "risk_impact": calculation_result,
    }
    _recent_events_log.insert(0, record)
    if len(_recent_events_log) > 100:
        _recent_events_log.pop()

    return {
        "status": "success",
        "published_to_kafka": published_to_kafka,
        "event": event.model_dump(),
        "risk_engine_result": calculation_result,
    }


@router.post("/simulate-stream")
def trigger_event_simulation(
    request: SimulationBatchRequest,
    background_tasks: BackgroundTasks,
):
    """
    Triggers synthetic credit event generation in the background to simulate live market streaming.
    """
    generator = CreditEventGenerator()

    def run_batch():
        import time
        producer = get_kafka_producer()
        processor = CreditRiskEventProcessor()
        for _ in range(request.count):
            evt = generator.generate_event()
            published = producer.publish_event(evt)
            calc_res = processor.process_event(evt.model_dump())
            record = {
                "event_id": evt.event_id,
                "timestamp": evt.timestamp.isoformat(),
                "event_type": evt.event_type.value,
                "loan_id": evt.loan_id,
                "borrower_id": evt.borrower_id,
                "published_to_kafka": published,
                "payload": evt.payload,
                "risk_impact": calc_res,
            }
            _recent_events_log.insert(0, record)
            if len(_recent_events_log) > 100:
                _recent_events_log.pop()
            if request.interval_seconds > 0:
                time.sleep(request.interval_seconds)

    background_tasks.add_task(run_batch)

    return {
        "message": f"Triggered simulation of {request.count} credit events.",
        "interval_seconds": request.interval_seconds,
        "topic": settings.KAFKA_TOPIC_CREDIT_EVENTS,
    }
