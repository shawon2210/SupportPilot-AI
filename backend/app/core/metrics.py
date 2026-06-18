"""SupportPilot AI — Prometheus Metrics

Exposes /metrics endpoint for Prometheus scraping.
Tracks request counts, latency, and business metrics.
"""

from __future__ import annotations

import logging
import time

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

logger = logging.getLogger("supportpilot.metrics")

# ── Registry ───────────────────────────────────────────────────────

registry = CollectorRegistry()

# ── HTTP Metrics ───────────────────────────────────────────────────

http_requests_total = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status_code"],
    registry=registry,
)

http_request_duration_seconds = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
    registry=registry,
)

http_requests_in_flight = Gauge(
    "http_requests_in_flight",
    "Current number of HTTP requests being processed",
    registry=registry,
)

# ── Business Metrics ───────────────────────────────────────────────

documents_processed_total = Counter(
    "documents_processed_total",
    "Total documents processed",
    ["workspace_id", "status"],  # status: success, error
    registry=registry,
)

messages_sent_total = Counter(
    "messages_sent_total",
    "Total chat messages sent",
    ["workspace_id", "role"],  # role: user, assistant
    registry=registry,
)

widget_chats_total = Counter(
    "widget_chats_total",
    "Total widget chat messages",
    ["workspace_id"],
    registry=registry,
)

knowledge_searches_total = Counter(
    "knowledge_searches_total",
    "Total knowledge base searches",
    ["workspace_id"],
    registry=registry,
)

active_workspaces = Gauge(
    "active_workspaces",
    "Number of active workspaces",
    registry=registry,
)

active_users = Gauge(
    "active_users",
    "Number of active users (last 24h)",
    registry=registry,
)

# ── AI Metrics ─────────────────────────────────────────────────────

ai_tokens_used_total = Counter(
    "ai_tokens_used_total",
    "Total AI tokens consumed",
    ["workspace_id", "model"],
    registry=registry,
)

ai_request_duration_seconds = Histogram(
    "ai_request_duration_seconds",
    "AI provider request duration",
    ["provider", "model"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
    registry=registry,
)

# ── Knowledge Gap Metrics ──────────────────────────────────────────

knowledge_gaps_total = Counter(
    "knowledge_gaps_total",
    "Total knowledge gaps detected",
    ["workspace_id"],
    registry=registry,
)

escalations_total = Counter(
    "escalations_total",
    "Total ticket escalations to human",
    ["workspace_id", "reason"],
    registry=registry,
)


def get_metrics_output() -> tuple[bytes, str]:
    """Get Prometheus metrics output."""
    return generate_latest(registry), CONTENT_TYPE_LATEST
