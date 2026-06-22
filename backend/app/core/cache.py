"""SupportPilot AI — Redis Cache Service

Provides a unified caching layer using Redis.
Falls back to in-memory dict when Redis is not available (dev mode).
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger("supportpilot.cache")


class CacheService:
    """
    Redis-backed caching service with automatic fallback to in-memory cache.
    
    Usage:
        cache = CacheService()
        await cache.set("key", {"data": "value"}, ttl=300)
        result = await cache.get("key")
    """

    def __init__(self):
        self.settings = get_settings()
        self._redis = None
        self._memory_cache: dict[str, tuple[Any, float | None]] = {}
        self._use_redis = bool(self.settings.REDIS_URL)

    async def get_redis(self):
        """Public accessor for the Redis connection (used by RateLimitService)."""
        return await self._get_redis()

    async def _get_redis(self):
        """Lazy-initialize Redis connection."""
        if self._redis is None and self._use_redis:
            try:
                import redis.asyncio as redis
                self._redis = redis.from_url(
                    self.settings.REDIS_URL,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await self._redis.ping()
                logger.info("Redis cache connected")
            except Exception as e:
                logger.warning("Redis connection failed, using in-memory cache: %s", e)
                self._use_redis = False
                self._redis = None
        return self._redis

    async def get(self, key: str) -> Any | None:
        """Get a value from cache."""
        try:
            redis = await self._get_redis()
            if redis:
                value = await redis.get(key)
                if value:
                    return json.loads(value)
                return None

            # In-memory fallback
            import time
            if key in self._memory_cache:
                value, expiry = self._memory_cache[key]
                if expiry is None or time.time() < expiry:
                    return value
                del self._memory_cache[key]
            return None
        except Exception as e:
            logger.warning("Cache get error for key=%s: %s", key, e)
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set a value in cache with TTL in seconds."""
        try:
            redis = await self._get_redis()
            if redis:
                await redis.set(key, json.dumps(value, default=str), ex=ttl)
                return

            # In-memory fallback
            import time
            expiry = time.time() + ttl if ttl > 0 else None
            self._memory_cache[key] = (value, expiry)
        except Exception as e:
            logger.warning("Cache set error for key=%s: %s", key, e)

    async def delete(self, key: str) -> None:
        """Delete a key from cache."""
        try:
            redis = await self._get_redis()
            if redis:
                await redis.delete(key)
                return
            self._memory_cache.pop(key, None)
        except Exception as e:
            logger.warning("Cache delete error for key=%s: %s", key, e)

    async def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching a pattern (e.g., 'workspace:123:*')."""
        try:
            redis = await self._get_redis()
            if redis:
                keys = []
                async for key in redis.scan_iter(match=pattern):
                    keys.append(key)
                if keys:
                    await redis.delete(*keys)
                return len(keys)

            # In-memory fallback
            import fnmatch
            keys_to_delete = [
                k for k in self._memory_cache
                if fnmatch.fnmatch(k, pattern)
            ]
            for k in keys_to_delete:
                del self._memory_cache[k]
            return len(keys_to_delete)
        except Exception as e:
            logger.warning("Cache invalidate error for pattern=%s: %s", pattern, e)
            return 0

    async def close(self):
        """Close Redis connection."""
        if self._redis:
            await self._redis.close()
            self._redis = None


# ── Singleton ──────────────────────────────────────────────────────

_cache: CacheService | None = None


def get_cache() -> CacheService:
    """Get or create the cache singleton."""
    global _cache
    if _cache is None:
        _cache = CacheService()
    return _cache
