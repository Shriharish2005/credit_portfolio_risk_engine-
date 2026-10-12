"""
Redis cache service with in-memory local fallback.
Used for caching expensive portfolio aggregation, HHI, and repeated risk runs.
"""

import json
import time
from typing import Any, Optional
from backend.app.core.config import settings
from backend.app.core.logging import logger

try:
    import redis
    _redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True, socket_timeout=1.0)
    # Test ping
    _redis_client.ping()
    _redis_available = True
    logger.info("Redis cache connected successfully.")
except Exception:
    _redis_client = None
    _redis_available = False
    logger.info("Redis not detected. Operating with in-memory caching fallback.")


class CacheService:
    """Caching abstraction layer supporting Redis and local RAM."""

    def __init__(self):
        self._memory_store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if _redis_available and _redis_client is not None:
            try:
                val = _redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.warning(f"Redis get failed for key {key}: {e}")

        # Fallback to local memory cache
        if key in self._memory_store:
            val, expiry = self._memory_store[key]
            if expiry == 0 or time.time() < expiry:
                return val
            else:
                del self._memory_store[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int = 3600) -> bool:
        serialized = json.dumps(value)
        if _redis_available and _redis_client is not None:
            try:
                _redis_client.setex(key, ttl_seconds, serialized)
                return True
            except Exception as e:
                logger.warning(f"Redis set failed for key {key}: {e}")

        # Fallback memory store
        expiry = time.time() + ttl_seconds if ttl_seconds > 0 else 0
        self._memory_store[key] = (value, expiry)
        return True

    def delete(self, key: str) -> bool:
        if _redis_available and _redis_client is not None:
            try:
                _redis_client.delete(key)
            except Exception:
                pass
        self._memory_store.pop(key, None)
        return True

    def clear(self):
        if _redis_available and _redis_client is not None:
            try:
                _redis_client.flushdb()
            except Exception:
                pass
        self._memory_store.clear()


cache = CacheService()
