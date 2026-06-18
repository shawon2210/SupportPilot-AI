"""SupportPilot AI — Rate Limiting Service

Token-bucket rate limiter with Redis backend.
Supports per-workspace, per-user, and per-IP rate limits.
Tier-based limits aligned with subscription plans.
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass

from app.config import get_settings
from app.core.cache import get_cache

logger = logging.getLogger("supportpilot.ratelimit")


@dataclass
class RateLimitResult:
    """Result of a rate limit check."""
    allowed: bool
    limit: int
    remaining: int
    reset_at: float
    retry_after: float = 0


# ── Rate limit tiers by plan ───────────────────────────────────────

RATE_LIMITS = {
    "free": {
        "requests_per_minute": 30,
        "requests_per_hour": 500,
        "requests_per_day": 2000,
        "widget_per_minute": 10,
        "widget_per_day": 500,
        "api_per_minute": 20,
    },
    "starter": {
        "requests_per_minute": 60,
        "requests_per_hour": 2000,
        "requests_per_day": 10000,
        "widget_per_minute": 30,
        "widget_per_day": 5000,
        "api_per_minute": 60,
    },
    "pro": {
        "requests_per_minute": 120,
        "requests_per_hour": 5000,
        "requests_per_day": 50000,
        "widget_per_minute": 60,
        "widget_per_day": 50000,
        "api_per_minute": 120,
    },
    "enterprise": {
        "requests_per_minute": 300,
        "requests_per_hour": 20000,
        "requests_per_day": 200000,
        "widget_per_minute": 120,
        "widget_per_day": 200000,
        "api_per_minute": 300,
    },
}


class RateLimitService:
    """
    Token-bucket rate limiter backed by Redis (or in-memory fallback).
    
    Usage:
        limiter = RateLimitService()
        result = await limiter.check("user:123", "requests_per_minute", plan="free")
        if not result.allowed:
            raise RateLimitError(retry_after=result.retry_after)
    """

    def __init__(self):
        self.settings = get_settings()

    def _get_limits(self, plan: str) -> dict:
        """Get rate limits for a plan."""
        return RATE_LIMITS.get(plan, RATE_LIMITS["free"])

    async def check(
        self,
        key: str,
        limit_type: str,
        plan: str = "free",
    ) -> RateLimitResult:
        """
        Check if a request is within rate limits.
        
        Args:
            key: Unique identifier (user_id, ip_address, workspace_id)
            limit_type: Type of limit (requests_per_minute, widget_per_day, etc.)
            plan: Subscription plan for tier-based limits
            
        Returns:
            RateLimitResult with allowance status and remaining count
        """
        limits = self._get_limits(plan)
        limit = limits.get(limit_type, 60)

        # Determine window size based on limit type
        if "minute" in limit_type:
            window = 60
        elif "hour" in limit_type:
            window = 3600
        elif "day" in limit_type:
            window = 86400
        else:
            window = 60

        cache_key = f"ratelimit:{limit_type}:{key}"
        cache = get_cache()

        try:
            # Use Redis INCR for atomic counter
            redis = await cache._get_redis()
            if redis:
                pipe = redis.pipeline()
                now = time.time()
                pipe.incr(cache_key)
                pipe.expire(cache_key, window)
                results = await pipe.execute()
                current = results[0]
                remaining = max(0, limit - current)
                reset_at = now + window
                allowed = current <= limit

                return RateLimitResult(
                    allowed=allowed,
                    limit=limit,
                    remaining=remaining,
                    reset_at=reset_at,
                    retry_after=reset_at - now if not allowed else 0,
                )

            # In-memory fallback
            return self._check_memory(cache_key, limit, window)
        except Exception as e:
            logger.warning("Rate limit check failed (allowing request): %s", e)
            return RateLimitResult(allowed=True, limit=limit, remaining=limit, reset_at=time.time() + window)

    def _check_memory(self, key: str, limit: int, window: int) -> RateLimitResult:
        """In-memory rate limit check."""
        import time as _time
        now = _time.time()

        # Access the memory cache directly
        cache = get_cache()
        if key in cache._memory_cache:
            data, expiry = cache._memory_cache[key]
            if expiry is None or now < expiry:
                data["count"] += 1
                cache._memory_cache[key] = (data, expiry)
                remaining = max(0, limit - data["count"])
                return RateLimitResult(
                    allowed=data["count"] <= limit,
                    limit=limit,
                    remaining=remaining,
                    reset_at=expiry or now + window,
                    retry_after=(expiry - now) if data["count"] > limit else 0,
                )

        # First request
        cache._memory_cache[key] = ({"count": 1}, now + window)
        return RateLimitResult(
            allowed=True,
            limit=limit,
            remaining=limit - 1,
            reset_at=now + window,
        )

    async def check_workspace(
        self,
        workspace_id: str,
        limit_type: str = "requests_per_minute",
        plan: str = "free",
    ) -> RateLimitResult:
        """Check rate limit for a workspace."""
        return await self.check(f"workspace:{workspace_id}", limit_type, plan)

    async def check_user(
        self,
        user_id: str,
        limit_type: str = "requests_per_minute",
        plan: str = "free",
    ) -> RateLimitResult:
        """Check rate limit for a user."""
        return await self.check(f"user:{user_id}", limit_type, plan)

    async def check_ip(
        self,
        ip_address: str,
        limit_type: str = "requests_per_minute",
    ) -> RateLimitResult:
        """Check rate limit for an IP address (always uses free tier)."""
        return await self.check(f"ip:{ip_address}", limit_type, plan="free")

    async def check_widget(
        self,
        workspace_id: str,
        ip_address: str,
        plan: str = "free",
    ) -> RateLimitResult:
        """
        Check widget rate limits (both per-workspace and per-IP).
        Returns the most restrictive result.
        """
        ws_result = await self.check_workspace(workspace_id, "widget_per_minute", plan)
        ip_result = await self.check_ip(ip_address, "widget_per_minute")

        # Return the more restrictive one
        if not ws_result.allowed:
            return ws_result
        if not ip_result.allowed:
            return ip_result
        return ws_result if ws_result.remaining < ip_result.remaining else ip_result
