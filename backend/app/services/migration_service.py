"""
Credit Rating Migration Service.
"""

import os
from typing import Dict, Optional
import pandas as pd
from backend.app.core.config import settings
from backend.app.core.cache import cache
from backend.risk_engine.migration.transition_matrix import CreditMigrationEngine


class MigrationService:

    def __init__(self):
        self._engine: Optional[CreditMigrationEngine] = None

    def _get_engine(self) -> CreditMigrationEngine:
        if self._engine is not None:
            return self._engine

        history_csv = os.path.join(settings.DATA_DIR, "synthetic", "ratings_history.csv")
        if os.path.exists(history_csv):
            try:
                df = pd.read_csv(history_csv)
                self._engine = CreditMigrationEngine.estimate_from_transitions(df)
                return self._engine
            except Exception:
                pass

        self._engine = CreditMigrationEngine()
        return self._engine

    def get_migration_analysis(self, periods: int = 1) -> Dict:
        cache_key = f"migration:analysis:{periods}"
        cached = cache.get(cache_key)
        if cached:
            return cached

        engine = self._get_engine()
        result = engine.analyze_migrations(n_periods=periods)
        cache.set(cache_key, result, ttl_seconds=1200)
        return result
