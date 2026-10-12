"""
Domain Event Streaming module (Apache Kafka with In-Memory fallback).
Produces and consumes domain events:
- loan.created
- rating.changed
- payment.received
- risk.recalculation.requested
- stress_test.completed
"""

import json
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List
from backend.app.core.config import settings
from backend.app.core.logging import logger


class DomainEventBus:
    """Event Bus interface with Kafka implementation and in-memory fallback."""

    def __init__(self):
        self.kafka_producer = None
        self.subscribers: Dict[str, List[Callable]] = {}
        self.in_memory_log: List[Dict[str, Any]] = []

        if settings.KAFKA_ENABLED:
            try:
                from kafka import KafkaProducer  # type: ignore
                self.kafka_producer = KafkaProducer(
                    bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
                    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                )
                logger.info(f"Kafka producer connected to {settings.KAFKA_BOOTSTRAP_SERVERS}")
            except Exception as e:
                logger.info(f"Kafka unavailable ({e}). Operating with local in-memory event bus.")
        else:
            logger.info("Kafka disabled by configuration. Operating with local in-memory event bus.")

    def publish(self, topic: str, payload: Dict[str, Any]) -> bool:
        """Publish a domain event to Kafka or internal subscriber queue."""
        event_message = {
            "topic": topic,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }

        # Keep last 500 events in memory log for inspection
        self.in_memory_log.append(event_message)
        if len(self.in_memory_log) > 500:
            self.in_memory_log.pop(0)

        # Send to Kafka if active
        if self.kafka_producer:
            try:
                self.kafka_producer.send(topic, event_message)
                return True
            except Exception as e:
                logger.error(f"Failed to publish event to Kafka topic {topic}: {e}")

        # Local subscribers
        if topic in self.subscribers:
            for cb in self.subscribers[topic]:
                try:
                    cb(event_message)
                except Exception as err:
                    logger.error(f"Error in subscriber callback for {topic}: {err}")

        logger.info(f"[EVENT] {topic} published: {payload.get('id', '')}")
        return True

    def subscribe(self, topic: str, callback: Callable):
        """Register local event handler."""
        if topic not in self.subscribers:
            self.subscribers[topic] = []
        self.subscribers[topic].append(callback)


event_bus = DomainEventBus()
