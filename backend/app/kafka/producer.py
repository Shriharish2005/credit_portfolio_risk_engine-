"""
Kafka Producer and Event Publisher for Credit Risk Events
==========================================================
Publishes real-time credit events (loan creation, payments, utilization, income shifts, defaults)
to Apache Kafka (KRaft mode topic: credit-events).
Includes retry logic, batching, thread safety, and graceful lifecycle shutdown.
"""

import json
import logging
import threading
import time
from typing import Any, Dict, Optional, Union

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.kafka.events import CreditEvent, CreditEventType

# Global singleton producer
_kafka_producer_instance = None
_producer_lock = threading.Lock()


class CreditKafkaProducer:
    """
    Robust Apache Kafka Producer wrapper tailored for Credit Events.
    Connects to Kafka in KRaft mode, handles serialization, delivery callbacks, and retries.
    """

    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        default_topic: Optional[str] = None,
        retries: int = 5,
    ):
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.default_topic = default_topic or settings.KAFKA_TOPIC_CREDIT_EVENTS
        self.retries = retries
        self._producer = None
        self._is_connected = False
        self._connect_lock = threading.Lock()
        self._published_count = 0
        self._failed_count = 0

    def connect(self) -> bool:
        """Establishes connection to the Kafka cluster."""
        with self._connect_lock:
            if self._is_connected and self._producer is not None:
                return True

            try:
                from kafka import KafkaProducer
                from kafka.errors import NoBrokersAvailable

                logger.info(f"Connecting Kafka Producer to bootstrap servers: {self.bootstrap_servers}...")
                self._producer = KafkaProducer(
                    bootstrap_servers=self.bootstrap_servers.split(",") if isinstance(self.bootstrap_servers, str) else self.bootstrap_servers,
                    value_serializer=lambda v: json.dumps(v, default=str).encode("utf-8"),
                    key_serializer=lambda k: str(k).encode("utf-8") if k is not None else None,
                    retries=self.retries,
                    acks="all",  # Strongest durability guarantee for financial credit events
                    request_timeout_ms=10000,
                    max_block_ms=10000,
                )
                self._is_connected = True
                logger.info(f"Kafka Producer connected successfully to {self.bootstrap_servers}")
                return True
            except Exception as e:
                self._is_connected = False
                self._producer = None
                logger.warning(f"Kafka Producer could not connect to {self.bootstrap_servers}: {e}")
                return False

    @property
    def is_connected(self) -> bool:
        return self._is_connected and self._producer is not None

    def publish_event(
        self,
        event: Union[CreditEvent, Dict[str, Any]],
        topic: Optional[str] = None,
        key: Optional[str] = None,
        sync: bool = False,
    ) -> bool:
        """
        Publishes a credit event to the specified Kafka topic.
        Partition key defaults to borrower_id / loan_id to ensure causal ordering per loan.
        """
        target_topic = topic or self.default_topic

        # Normalize event dict
        if isinstance(event, CreditEvent):
            event_dict = event.model_dump()
            event_key = key or event.loan_id or event.borrower_id
        elif isinstance(event, dict):
            event_dict = event
            event_key = key or event.get("loan_id") or event.get("borrower_id")
        else:
            raise ValueError(f"Unsupported event type: {type(event)}")

        # Auto-connect if not connected
        if not self.is_connected:
            connected = self.connect()
            if not connected:
                logger.debug(f"Kafka broker offline; event {event_dict.get('event_id')} cannot be published via Kafka.")
                self._failed_count += 1
                return False

        try:
            future = self._producer.send(
                target_topic,
                value=event_dict,
                key=event_key,
            )

            def on_send_success(record_metadata):
                self._published_count += 1
                logger.debug(
                    f"Event published to {record_metadata.topic} "
                    f"partition={record_metadata.partition} offset={record_metadata.offset}"
                )

            def on_send_error(excp):
                self._failed_count += 1
                logger.error(f"Failed to deliver credit event: {excp}")

            future.add_callback(on_send_success)
            future.add_errback(on_send_error)

            if sync:
                # Wait for broker acknowledgment
                future.get(timeout=10.0)

            return True
        except Exception as e:
            self._failed_count += 1
            logger.error(f"Error publishing event to Kafka topic {target_topic}: {e}")
            return False

    def flush(self, timeout: float = 5.0):
        """Flushes buffered records."""
        if self._producer:
            try:
                self._producer.flush(timeout=timeout)
            except Exception as e:
                logger.warning(f"Error flushing Kafka producer: {e}")

    def close(self):
        """Gracefully closes the Kafka Producer connection."""
        with self._connect_lock:
            if self._producer:
                try:
                    logger.info("Closing Kafka Producer...")
                    self._producer.flush(timeout=5.0)
                    self._producer.close(timeout=5.0)
                except Exception as e:
                    logger.warning(f"Error closing Kafka producer: {e}")
                finally:
                    self._producer = None
                    self._is_connected = False
                    logger.info("Kafka Producer shutdown complete.")

    def get_stats(self) -> Dict[str, Any]:
        """Returns delivery statistics."""
        return {
            "connected": self.is_connected,
            "bootstrap_servers": self.bootstrap_servers,
            "default_topic": self.default_topic,
            "published_count": self._published_count,
            "failed_count": self._failed_count,
        }


def get_kafka_producer() -> CreditKafkaProducer:
    """Singleton getter for CreditKafkaProducer."""
    global _kafka_producer_instance
    with _producer_lock:
        if _kafka_producer_instance is None:
            _kafka_producer_instance = CreditKafkaProducer()
        return _kafka_producer_instance
