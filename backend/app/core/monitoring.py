"""SupportPilot AI — Monitoring Setup

Integrates Sentry for error tracking and performance monitoring.
"""

from __future__ import annotations

import logging

import sentry_sdk
from sentry_sdk.integrations.asgi import SentryAsgiMiddleware
from sentry_sdk.integrations.logging import LoggingIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from app.config import get_settings

logger = logging.getLogger("supportpilot.monitoring")


def init_sentry():
    """Initialize Sentry SDK for error tracking."""
    settings = get_settings()

    if not settings.SENTRY_DSN or "xxx" in settings.SENTRY_DSN:
        logger.info("Sentry DSN not configured — error tracking disabled")
        return

    sentry_logging = LoggingIntegration(
        level=logging.INFO,
        event_level=logging.ERROR,
    )

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.APP_ENV.value,
        release=settings.APP_VERSION,
        traces_sample_rate=0.1 if settings.is_production else 1.0,
        profiles_sample_rate=0.1 if settings.is_production else 1.0,
        integrations=[
            sentry_logging,
            SqlalchemyIntegration(),
        ],
    )

    logger.info("Sentry initialized (env=%s, version=%s)", settings.APP_ENV.value, settings.APP_VERSION)


def get_asgi_middleware():
    """Get the Sentry ASGI middleware class for the app."""
    settings = get_settings()
    if settings.SENTRY_DSN:
        return SentryAsgiMiddleware
    return None
