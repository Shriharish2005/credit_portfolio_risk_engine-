"""
Kafka Consumer for Credit Risk Real-Time Pipeline
===================================================
Subscribes to 'credit-events' topic and processes financial events:
- LOAN_CREATED: Computes initial PD/LGD/EAD/EL and persists loan to DB
- PAYMENT_RECEIVED: Decreases drawn balance, reduces EAD & Expected Loss, updates DB
- PAYMENT_MISSED: Increases DPD, triggers rating degradation / PD escalation, recalculates EL
- UTILIZATION_CHANGED: Adjusts drawn balance, recalculates EAD via CCF, recalculates EL
- INCOME_CHANGED: Recalculates borrower leverage & logistic PD, recalculates EL
- DEFAULT_EVENT: Marks facility defaulted, shifts Stage 3 / 100% PD, computes workout LGD/EL

Passes events directly into the existing quantitative risk engine models:
- RatingPDMapper & LogisticPDModel
- LGDModel
- EADModel
- ExpectedLossCalculator
And commits results directly into the existing PostgreSQL / SQLite database.
"""

import json
import logging
import threading
import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.cache import cache
from backend.app.db.session import SessionLocal
from backend.app.db.models.loan import Loan
from backend.app.db.models.borrower import Borrower
from backend.app.kafka.events import CreditEvent, CreditEventType
from backend.risk_engine.pd.rating_pd import RatingPDMapper
from backend.risk_engine.pd.logistic_pd import LogisticPDModel
from backend.risk_engine.lgd.lgd_model import LGDModel
from backend.risk_engine.ead.ead_model import EADModel
from backend.risk_engine.expected_loss.el_calculator import ExpectedLossCalculator

# Rating downgrade/upgrade mapping helper
RATINGS_ORDER = ["AAA", "AA", "A", "BBB", "BB", "B", "CCC", "D"]


class CreditRiskEventProcessor:
    """
    Applies real-time financial events to existing risk engine models and PostgreSQL database.
    """

    def __init__(self):
        self.rating_mapper = RatingPDMapper()
        self.logistic_model = LogisticPDModel()
        self.lgd_model = LGDModel()
        self.ead_model = EADModel()

    def process_event(self, event_data: Dict[str, Any], db: Optional[Session] = None) -> Dict[str, Any]:
        """
        Routes the event by event_type and executes domain risk calculations.
        """
        event_type = event_data.get("event_type")
        payload = event_data.get("payload", {})
        loan_id = event_data.get("loan_id")
        borrower_id = event_data.get("borrower_id")

        should_close_db = False
        if db is None:
            db = SessionLocal()
            should_close_db = True

        try:
            if event_type == CreditEventType.LOAN_CREATED.value:
                result = self._handle_loan_created(db, loan_id, borrower_id, payload)
            elif event_type == CreditEventType.PAYMENT_RECEIVED.value:
                result = self._handle_payment_received(db, loan_id, borrower_id, payload)
            elif event_type == CreditEventType.PAYMENT_MISSED.value:
                result = self._handle_payment_missed(db, loan_id, borrower_id, payload)
            elif event_type == CreditEventType.UTILIZATION_CHANGED.value:
                result = self._handle_utilization_changed(db, loan_id, borrower_id, payload)
            elif event_type == CreditEventType.INCOME_CHANGED.value:
                result = self._handle_income_changed(db, loan_id, borrower_id, payload)
            elif event_type == CreditEventType.DEFAULT_EVENT.value:
                result = self._handle_default_event(db, loan_id, borrower_id, payload)
            else:
                logger.warning(f"Unrecognized credit event type: {event_type}")
                result = {"status": "ignored", "reason": f"Unknown event type: {event_type}"}

            db.commit()

            # Invalidate portfolio summary cache to reflect updated risk numbers
            cache.delete("portfolio:summary")
            cache.delete("portfolio:exposures")

            return result
        except Exception as e:
            db.rollback()
            logger.error(f"Error processing credit event {event_type} for loan {loan_id}: {e}", exc_info=True)
            raise e
        finally:
            if should_close_db:
                db.close()

    def _handle_loan_created(self, db: Session, loan_id: str, borrower_id: str, payload: dict) -> dict:
        """New loan facility creation."""
        credit_limit = float(payload.get("credit_limit", 100000.0))
        drawn_balance = float(payload.get("drawn_balance", credit_limit))
        facility_type = payload.get("facility_type", "TERM_LOAN")
        seniority = payload.get("seniority", "SENIOR_SECURED")
        credit_rating = payload.get("credit_rating", "BBB")
        sector = payload.get("sector", "Technology")
        geography = payload.get("geography", "North America")
        collateral_value = float(payload.get("collateral_value", 0.0))
        collateral_type = payload.get("collateral_type", "EQUIPMENT")
        interest_rate = float(payload.get("interest_rate", 0.05))

        # Check or create borrower record
        borrower = db.query(Borrower).filter(Borrower.borrower_id == borrower_id).first()
        if not borrower:
            borrower = Borrower(
                borrower_id=borrower_id,
                legal_name=payload.get("borrower_name", f"Borrower {borrower_id}"),
                sector=sector,
                geography=geography,
                country="USA",
                credit_rating=credit_rating,
                annual_revenue=float(payload.get("annual_revenue", 5000000.0)),
                total_assets=float(payload.get("total_assets", 8000000.0)),
                leverage=float(payload.get("leverage", 2.0)),
                debt_ratio=float(payload.get("debt_ratio", 0.4)),
                interest_coverage=float(payload.get("interest_coverage", 4.0)),
                profitability=float(payload.get("profitability", 0.12)),
                liquidity=float(payload.get("liquidity", 1.8)),
            )
            db.add(borrower)
            db.flush()

        # Quantitative Engine Calculations
        # 1. EAD
        ead = self.ead_model.calculate_single_ead(
            drawn_balance=drawn_balance,
            credit_limit=credit_limit,
            facility_type=facility_type,
        )
        utilization_rate = (drawn_balance / credit_limit) if credit_limit > 0 else 1.0

        # 2. PD
        rating_pd = self.rating_mapper.get_pd(credit_rating)
        features = {
            "leverage": borrower.leverage,
            "debt_ratio": borrower.debt_ratio,
            "interest_coverage": borrower.interest_coverage,
            "profitability": borrower.profitability,
            "liquidity": borrower.liquidity,
            "unemployment_rate": 5.0,
            "interest_rate": interest_rate * 100.0,
        }
        logistic_pd = float(self.logistic_model.predict_pd(features)[0])
        final_pd = (rating_pd + logistic_pd) / 2.0

        # 3. LGD
        lgd = self.lgd_model.calculate_single_lgd(
            exposure=credit_limit,
            collateral_value=collateral_value,
            collateral_type=collateral_type,
            seniority=seniority,
        )

        # 4. Expected Loss
        el = ExpectedLossCalculator.calculate_single_el(final_pd, lgd, ead)

        # Upsert Loan in DB
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            loan = Loan(
                loan_id=loan_id,
                borrower_id=borrower_id,
                facility_type=facility_type,
                seniority=seniority,
                credit_rating=credit_rating,
                sector=sector,
                geography=geography,
                credit_limit=credit_limit,
                drawn_balance=drawn_balance,
                utilization_rate=utilization_rate,
                ccf=self.ead_model.get_ccf(facility_type),
                ead=round(ead, 2),
                pd=round(final_pd, 6),
                lgd=round(lgd, 4),
                expected_loss=round(el, 2),
                interest_rate=interest_rate,
                status="ACTIVE",
            )
            db.add(loan)
        else:
            loan.credit_limit = credit_limit
            loan.drawn_balance = drawn_balance
            loan.utilization_rate = utilization_rate
            loan.ead = round(ead, 2)
            loan.pd = round(final_pd, 6)
            loan.lgd = round(lgd, 4)
            loan.expected_loss = round(el, 2)
            loan.status = "ACTIVE"

        db.flush()

        return {
            "action": "LOAN_CREATED",
            "loan_id": loan_id,
            "borrower_id": borrower_id,
            "pd": round(final_pd, 6),
            "lgd": round(lgd, 4),
            "ead": round(ead, 2),
            "expected_loss": round(el, 2),
        }

    def _handle_payment_received(self, db: Session, loan_id: str, borrower_id: str, payload: dict) -> dict:
        """Loan payment processed: reduces drawn balance and recalibrates EAD / EL."""
        payment_amount = float(payload.get("amount", 0.0))
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            # Fallback create loan if missing
            self._handle_loan_created(db, loan_id, borrower_id, {"credit_limit": max(payment_amount * 5, 50000.0), "drawn_balance": max(payment_amount * 2, 25000.0)})
            db.flush()
            loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()

        current_drawn = loan.drawn_balance if loan else payment_amount * 2
        new_balance = max(0.0, float(payload.get("new_balance", current_drawn - payment_amount)))
        if loan:
            loan.drawn_balance = new_balance
            loan.utilization_rate = (new_balance / loan.credit_limit) if loan.credit_limit > 0 else 0.0

        # Recalculate EAD
        new_ead = self.ead_model.calculate_single_ead(
            drawn_balance=new_balance,
            credit_limit=loan.credit_limit,
            facility_type=loan.facility_type,
            ccf_override=loan.ccf,
        )
        loan.ead = round(new_ead, 2)

        # Recalculate EL
        new_el = ExpectedLossCalculator.calculate_single_el(loan.pd, loan.lgd, new_ead)
        loan.expected_loss = round(new_el, 2)

        if new_balance == 0.0:
            loan.status = "PAID_OFF"

        return {
            "action": "PAYMENT_RECEIVED",
            "loan_id": loan_id,
            "payment_amount": payment_amount,
            "new_drawn_balance": round(new_balance, 2),
            "new_ead": round(new_ead, 2),
            "new_expected_loss": round(new_el, 2),
        }

    def _handle_payment_missed(self, db: Session, loan_id: str, borrower_id: str, payload: dict) -> dict:
        """Missed payment: increments DPD, triggers rating notch downgrade, increases PD and EL."""
        days_past_due = int(payload.get("days_past_due", 30))
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            self._handle_loan_created(db, loan_id, borrower_id, {"credit_limit": 100000.0, "drawn_balance": 80000.0})
            loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()

        # Grade notch downgrade on missed payment
        current_rating = loan.credit_rating
        current_idx = RATINGS_ORDER.index(current_rating) if current_rating in RATINGS_ORDER else 3
        # Degrade 1 or 2 notches depending on days past due
        downgrade_steps = 2 if days_past_due >= 60 else 1
        new_idx = min(len(RATINGS_ORDER) - 2, current_idx + downgrade_steps)  # reserve D for explicit default
        new_rating = RATINGS_ORDER[new_idx]
        loan.credit_rating = new_rating

        # Recalculate PD using rating and higher penalty factor
        base_pd = self.rating_mapper.get_pd(new_rating)
        pd_multiplier = 1.0 + (days_past_due / 60.0) * 0.5
        new_pd = min(0.999, base_pd * pd_multiplier)
        loan.pd = round(new_pd, 6)

        # Recalculate EL
        new_el = ExpectedLossCalculator.calculate_single_el(new_pd, loan.lgd, loan.ead)
        loan.expected_loss = round(new_el, 2)
        loan.status = "WATCHLIST" if days_past_due < 60 else "DELINQUENT"

        return {
            "action": "PAYMENT_MISSED",
            "loan_id": loan_id,
            "days_past_due": days_past_due,
            "previous_rating": current_rating,
            "new_rating": new_rating,
            "new_pd": round(new_pd, 6),
            "new_expected_loss": round(new_el, 2),
            "status": loan.status,
        }

    def _handle_utilization_changed(self, db: Session, loan_id: str, borrower_id: str, payload: dict) -> dict:
        """Credit line drawn balance or utilization rate changes."""
        new_drawn = float(payload.get("drawn_balance", 0.0))
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            self._handle_loan_created(db, loan_id, borrower_id, {"credit_limit": max(new_drawn, 50000.0), "drawn_balance": new_drawn})
            loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()

        loan.drawn_balance = new_drawn
        loan.utilization_rate = (new_drawn / loan.credit_limit) if loan.credit_limit > 0 else 1.0

        # Recalculate EAD
        new_ead = self.ead_model.calculate_single_ead(
            drawn_balance=new_drawn,
            credit_limit=loan.credit_limit,
            facility_type=loan.facility_type,
            ccf_override=loan.ccf,
        )
        loan.ead = round(new_ead, 2)

        # Recalculate EL
        new_el = ExpectedLossCalculator.calculate_single_el(loan.pd, loan.lgd, new_ead)
        loan.expected_loss = round(new_el, 2)

        return {
            "action": "UTILIZATION_CHANGED",
            "loan_id": loan_id,
            "new_drawn_balance": round(new_drawn, 2),
            "utilization_rate": round(loan.utilization_rate, 4),
            "new_ead": round(new_ead, 2),
            "new_expected_loss": round(new_el, 2),
        }

    def _handle_income_changed(self, db: Session, loan_id: str, borrower_id: str, payload: dict) -> dict:
        """Borrower financial statement / revenue shift: adjusts leverage and recalculates PD."""
        new_revenue = float(payload.get("new_annual_revenue", 0.0))
        borrower = db.query(Borrower).filter(Borrower.borrower_id == borrower_id).first()
        if borrower and new_revenue > 0:
            borrower.annual_revenue = new_revenue
            # Recompute debt ratio / leverage proxy
            if borrower.annual_revenue > 0:
                borrower.leverage = round(borrower.total_assets / borrower.annual_revenue, 2)

        # Update loan PD based on updated financial strength
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if loan:
            features = {
                "leverage": borrower.leverage if borrower else 2.5,
                "debt_ratio": borrower.debt_ratio if borrower else 0.5,
                "interest_coverage": borrower.interest_coverage if borrower else 3.5,
                "profitability": borrower.profitability if borrower else 0.12,
                "liquidity": borrower.liquidity if borrower else 1.8,
                "unemployment_rate": 5.0,
                "interest_rate": loan.interest_rate * 100.0,
            }
            logistic_pd = float(self.logistic_model.predict_pd(features)[0])
            rating_pd = self.rating_mapper.get_pd(loan.credit_rating)
            new_pd = (rating_pd + logistic_pd) / 2.0
            loan.pd = round(new_pd, 6)

            new_el = ExpectedLossCalculator.calculate_single_el(new_pd, loan.lgd, loan.ead)
            loan.expected_loss = round(new_el, 2)

            return {
                "action": "INCOME_CHANGED",
                "borrower_id": borrower_id,
                "loan_id": loan_id,
                "new_revenue": new_revenue,
                "new_pd": round(new_pd, 6),
                "new_expected_loss": round(new_el, 2),
            }

        return {"action": "INCOME_CHANGED", "borrower_id": borrower_id, "loan_id": loan_id}

    def _handle_default_event(self, db: Session, loan_id: str, borrower_id: str, payload: dict) -> dict:
        """Explicit loan default (e.g. 90+ DPD, bankruptcy filing). PD=1.0, workout recovery applied."""
        recovery_estimate = float(payload.get("recovery_estimate", 0.40))
        loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()
        if not loan:
            self._handle_loan_created(db, loan_id, borrower_id, {"credit_limit": 100000.0, "drawn_balance": 100000.0})
            loan = db.query(Loan).filter(Loan.loan_id == loan_id).first()

        loan.credit_rating = "D"
        loan.status = "DEFAULTED"
        loan.pd = 1.0  # Under Basel & IFRS 9 Stage 3, defaulted loans have PD = 1.0
        loan.lgd = round(1.0 - recovery_estimate, 4)
        loan.expected_loss = round(loan.pd * loan.lgd * loan.ead, 2)

        return {
            "action": "DEFAULT_EVENT",
            "loan_id": loan_id,
            "borrower_id": borrower_id,
            "status": "DEFAULTED",
            "pd": 1.0,
            "lgd": loan.lgd,
            "ead": loan.ead,
            "expected_loss": loan.expected_loss,
            "reason": payload.get("reason", "CRITICAL_DEFAULT"),
        }


class CreditKafkaConsumer:
    """
    Background Kafka consumer worker subscribing to the 'credit-events' topic.
    Runs in a dedicated thread with graceful shutdown and error recovery.
    """

    def __init__(
        self,
        bootstrap_servers: Optional[str] = None,
        topic: Optional[str] = None,
        group_id: Optional[str] = None,
    ):
        self.bootstrap_servers = bootstrap_servers or settings.KAFKA_BOOTSTRAP_SERVERS
        self.topic = topic or settings.KAFKA_TOPIC_CREDIT_EVENTS
        self.group_id = group_id or settings.KAFKA_CONSUMER_GROUP_ID
        self.processor = CreditRiskEventProcessor()

        self._consumer = None
        self._thread: Optional[threading.Thread] = None
        self._running = False
        self._processed_count = 0
        self._error_count = 0
        self._last_event_time: Optional[str] = None

    def start(self):
        """Starts background consumption thread."""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(target=self._run_loop, name="KafkaCreditConsumerThread", daemon=True)
        self._thread.start()
        logger.info(f"CreditKafkaConsumer thread started for topic '{self.topic}'.")

    def stop(self, timeout: float = 5.0):
        """Signals shutdown and waits for loop to exit."""
        if not self._running:
            return

        logger.info("Stopping CreditKafkaConsumer...")
        self._running = False
        if self._consumer:
            try:
                self._consumer.close()
            except Exception as e:
                logger.warning(f"Error closing Kafka consumer: {e}")

        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=timeout)
        logger.info("CreditKafkaConsumer stopped successfully.")

    def _run_loop(self):
        """Main poll loop."""
        from kafka import KafkaConsumer
        from kafka.errors import NoBrokersAvailable

        retry_backoff = 2.0

        while self._running:
            try:
                logger.info(f"Connecting Kafka Consumer to {self.bootstrap_servers} (topic: {self.topic})...")
                self._consumer = KafkaConsumer(
                    self.topic,
                    bootstrap_servers=self.bootstrap_servers.split(",") if isinstance(self.bootstrap_servers, str) else self.bootstrap_servers,
                    group_id=self.group_id,
                    value_deserializer=lambda m: json.loads(m.decode("utf-8")),
                    auto_offset_reset="latest",
                    enable_auto_commit=True,
                    consumer_timeout_ms=1000,
                )
                logger.info(f"Kafka Consumer successfully connected and subscribed to '{self.topic}'.")
                retry_backoff = 2.0

                while self._running:
                    try:
                        message_batch = self._consumer.poll(timeout_ms=1000)
                        for topic_partition, records in message_batch.items():
                            for record in records:
                                if not self._running:
                                    break
                                try:
                                    event_dict = record.value
                                    logger.info(
                                        f"Received credit event from Kafka [partition={record.partition}, offset={record.offset}]: "
                                        f"{event_dict.get('event_type')} (Loan: {event_dict.get('loan_id')})"
                                    )
                                    self.processor.process_event(event_dict)
                                    self._processed_count += 1
                                    self._last_event_time = datetime.now(timezone.utc).isoformat()
                                except Exception as proc_err:
                                    self._error_count += 1
                                    logger.error(f"Error handling event record offset={record.offset}: {proc_err}")

                    except Exception as poll_err:
                        if not self._running:
                            break
                        logger.warning(f"Error in Kafka consumer polling loop: {poll_err}")
                        time.sleep(1.0)

            except (NoBrokersAvailable, Exception) as conn_err:
                if not self._running:
                    break
                logger.warning(f"Kafka consumer connection error: {conn_err}. Retrying in {retry_backoff}s...")
                time.sleep(retry_backoff)
                retry_backoff = min(30.0, retry_backoff * 1.5)

    def get_stats(self) -> Dict[str, Any]:
        """Returns consumer running status and telemetry."""
        return {
            "running": self._running,
            "topic": self.topic,
            "group_id": self.group_id,
            "bootstrap_servers": self.bootstrap_servers,
            "processed_count": self._processed_count,
            "error_count": self._error_count,
            "last_event_time": self._last_event_time,
        }


# Global consumer instance
_kafka_consumer_instance: Optional[CreditKafkaConsumer] = None
_consumer_lock = threading.Lock()


def get_kafka_consumer() -> CreditKafkaConsumer:
    """Singleton getter for CreditKafkaConsumer."""
    global _kafka_consumer_instance
    with _consumer_lock:
        if _kafka_consumer_instance is None:
            _kafka_consumer_instance = CreditKafkaConsumer()
        return _kafka_consumer_instance
