"""
Synthetic Credit Event Generator
=================================
Generates high-fidelity, realistic credit lifecycle events:
- LOAN_CREATED: New corporate / commercial facilities originated
- PAYMENT_RECEIVED: Regular amortizations or principal pay-downs
- PAYMENT_MISSED: Delinquencies (30, 60, 90 DPD)
- UTILIZATION_CHANGED: Revolver draws or facility expansions
- INCOME_CHANGED: Borrower financial statement revisions & EBITDA shifts
- DEFAULT_EVENT: Insolvency filings or unrecoverable default transitions

Can emit events to:
1. Apache Kafka broker (via CreditKafkaProducer)
2. Direct callback / In-memory event bus
3. Command-line stream runner
"""

import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pandas as pd

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.kafka.events import CreditEvent, CreditEventType
from backend.app.kafka.producer import get_kafka_producer

SECTORS = ["Technology", "Healthcare", "Manufacturing", "Energy", "Financial Services", "Retail", "Real Estate"]
GEOGRAPHIES = ["North America", "Europe", "Asia-Pacific", "Latin America"]
RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC"]
FACILITIES = ["TERM_LOAN", "REVOLVING_CREDIT", "LETTER_OF_CREDIT", "BRIDGE_FACILITY"]
SENIORITIES = ["SENIOR_SECURED", "SENIOR_UNSECURED", "SUBORDINATED"]
COLLATERAL_TYPES = ["REAL_ESTATE", "EQUIPMENT", "CASH", "INVENTORY", "ACCOUNTS_RECEIVABLE", "UNSECURED"]


class CreditEventGenerator:
    """
    Realistic credit event generator that derives context from active loans or creates new synthetic loans.
    """

    def __init__(self, data_dir: Optional[str] = None):
        self.data_dir = data_dir or settings.DATA_DIR
        self._loans_cache: List[Dict[str, Any]] = []
        self._load_reference_data()

    def _load_reference_data(self):
        """Loads reference loan IDs and borrower IDs for realism."""
        csv_path = os.path.join(self.data_dir, "synthetic", "loans.csv")
        parquet_path = os.path.join(self.data_dir, "processed", "loans.parquet")
        target_path = parquet_path if os.path.exists(parquet_path) else csv_path

        if os.path.exists(target_path):
            try:
                df = pd.read_parquet(target_path) if target_path.endswith(".parquet") else pd.read_csv(target_path)
                self._loans_cache = df.head(500).to_dict(orient="records")
            except Exception as e:
                logger.warning(f"Could not load reference loans: {e}")

    def generate_event(self, force_event_type: Optional[CreditEventType] = None) -> CreditEvent:
        """Generates a single realistic credit event."""
        event_types_weights = [
            (CreditEventType.PAYMENT_RECEIVED, 0.40),
            (CreditEventType.UTILIZATION_CHANGED, 0.25),
            (CreditEventType.PAYMENT_MISSED, 0.15),
            (CreditEventType.INCOME_CHANGED, 0.10),
            (CreditEventType.LOAN_CREATED, 0.07),
            (CreditEventType.DEFAULT_EVENT, 0.03),
        ]

        if force_event_type:
            event_type = force_event_type
        else:
            types, weights = zip(*event_types_weights)
            event_type = random.choices(types, weights=weights, k=1)[0]

        event_id = f"evt_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        # Pick from cache or synthesize
        if self._loans_cache and event_type != CreditEventType.LOAN_CREATED:
            loan_ref = random.choice(self._loans_cache)
            loan_id = str(loan_ref.get("loan_id"))
            borrower_id = str(loan_ref.get("borrower_id"))
            current_limit = float(loan_ref.get("credit_limit", 100000.0))
            current_drawn = float(loan_ref.get("drawn_balance", 80000.0))
            current_rating = str(loan_ref.get("credit_rating", "BBB"))
        else:
            loan_id = f"LN-{uuid.uuid4().hex[:8].upper()}"
            borrower_id = f"BORR-{uuid.uuid4().hex[:8].upper()}"
            current_limit = float(random.choice([50000, 100000, 250000, 500000, 1000000]))
            current_drawn = float(current_limit * random.uniform(0.4, 0.9))
            current_rating = random.choice(RATINGS)

        payload = {}

        if event_type == CreditEventType.LOAN_CREATED:
            loan_id = f"LN-{uuid.uuid4().hex[:8].upper()}"
            borrower_id = f"BORR-{uuid.uuid4().hex[:8].upper()}"
            limit = float(random.choice([50000, 100000, 250000, 500000, 1000000]))
            drawn = float(limit * random.uniform(0.3, 0.8))
            payload = {
                "credit_limit": limit,
                "drawn_balance": round(drawn, 2),
                "facility_type": random.choice(FACILITIES),
                "seniority": random.choice(SENIORITIES),
                "credit_rating": random.choice(RATINGS),
                "sector": random.choice(SECTORS),
                "geography": random.choice(GEOGRAPHIES),
                "collateral_value": round(limit * random.uniform(0.2, 1.2), 2),
                "collateral_type": random.choice(COLLATERAL_TYPES),
                "interest_rate": round(random.uniform(0.04, 0.09), 4),
                "borrower_name": f"Corporate Entity {borrower_id}",
                "annual_revenue": round(limit * random.uniform(5.0, 20.0), 2),
                "total_assets": round(limit * random.uniform(8.0, 30.0), 2),
                "leverage": round(random.uniform(1.5, 4.0), 2),
                "debt_ratio": round(random.uniform(0.3, 0.65), 2),
                "interest_coverage": round(random.uniform(2.5, 6.0), 2),
                "profitability": round(random.uniform(0.08, 0.20), 2),
                "liquidity": round(random.uniform(1.2, 2.5), 2),
            }

        elif event_type == CreditEventType.PAYMENT_RECEIVED:
            amount = round(min(current_drawn, random.uniform(1000, 25000)), 2)
            new_bal = max(0.0, current_drawn - amount)
            payload = {
                "amount": amount,
                "new_balance": round(new_bal, 2),
                "payment_type": random.choice(["PRINCIPAL_INTEREST", "EXTRA_PAYMENT", "MONTHLY_AMORTIZATION"]),
            }

        elif event_type == CreditEventType.PAYMENT_MISSED:
            days = random.choice([30, 60, 90])
            missed_amount = round(random.uniform(2000, 15000), 2)
            payload = {
                "days_past_due": days,
                "missed_amount": missed_amount,
                "grace_period_expired": True,
            }

        elif event_type == CreditEventType.UTILIZATION_CHANGED:
            new_drawn = round(max(0.0, min(current_limit * 1.05, current_drawn + random.uniform(-20000, 30000))), 2)
            new_rate = round(new_drawn / current_limit, 4) if current_limit > 0 else 1.0
            payload = {
                "drawn_balance": new_drawn,
                "new_utilization_rate": new_rate,
                "reason": random.choice(["SEASONAL_WORKING_CAPITAL", "CAPEX_DRAWDOWN", "SUPPLIER_SETTLEMENT"]),
            }

        elif event_type == CreditEventType.INCOME_CHANGED:
            revenue_delta = random.uniform(-0.35, 0.35)
            base_rev = current_limit * 8.0
            new_rev = round(max(50000.0, base_rev * (1.0 + revenue_delta)), 2)
            payload = {
                "new_annual_revenue": new_rev,
                "percentage_change": round(revenue_delta * 100, 2),
                "financial_quarter": f"Q{random.choice([1, 2, 3, 4])}",
            }

        elif event_type == CreditEventType.DEFAULT_EVENT:
            recovery_est = round(random.uniform(0.20, 0.50), 2)
            payload = {
                "reason": random.choice(["90_DAYS_PAST_DUE", "CHAPTER_11_FILING", "DISTRESSED_RESTRUCTURING"]),
                "recovery_estimate": recovery_est,
                "workout_status": "COMMENCED",
            }

        return CreditEvent(
            event_id=event_id,
            event_type=event_type,
            loan_id=loan_id,
            borrower_id=borrower_id,
            timestamp=now,
            payload=payload,
        )

    def stream_events(
        self,
        count: Optional[int] = None,
        interval_seconds: float = 1.0,
        publish_to_kafka: bool = True,
        on_event: Optional[Any] = None,
    ):
        """
        Continuously generates and streams events into Kafka or a callback.
        """
        producer = get_kafka_producer() if publish_to_kafka else None
        generated = 0

        logger.info(f"Starting Credit Event Generator stream (count={count or 'infinite'}, interval={interval_seconds}s)...")

        try:
            while count is None or generated < count:
                event = self.generate_event()
                generated += 1

                if publish_to_kafka and producer:
                    published = producer.publish_event(event)
                    logger.info(
                        f"[{generated}] Emitted {event.event_type.value} for {event.loan_id} -> "
                        f"Kafka: {'SUCCESS' if published else 'OFFLINE_BUFFER'}"
                    )
                else:
                    logger.info(f"[{generated}] Emitted {event.event_type.value} for {event.loan_id}")

                if on_event:
                    on_event(event)

                time.sleep(interval_seconds)
        except KeyboardInterrupt:
            logger.info("Event generation stream stopped by user.")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Run Synthetic Credit Event Generator")
    parser.add_argument("--count", type=int, default=10, help="Number of events to generate (default: 10)")
    parser.add_argument("--interval", type=float, default=1.0, help="Delay between events in seconds (default: 1.0)")
    parser.add_argument("--no-kafka", action="store_true", help="Do not push to Kafka (print only)")
    args = parser.parse_args()

    gen = CreditEventGenerator()
    gen.stream_events(count=args.count, interval_seconds=args.interval, publish_to_kafka=not args.no_kafka)
