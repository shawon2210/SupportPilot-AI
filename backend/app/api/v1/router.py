"""SupportPilot AI — API v1 Router"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import (
    ai_features,
    analytics,
    api_keys,
    auth,
    billing,
    canned_responses,
    chats,
    documents,
    github,
    health,
    members,
    notifications,
    public_api,
    search,
    slack,
    webhooks,
    website_ingest,
    widget,
    workspaces,
)

api_router = APIRouter(prefix="/api/v1")

# ── Health ────────────────────────────────────────────────────────
api_router.include_router(health.router, prefix="/health", tags=["Health"])

# ── Auth ──────────────────────────────────────────────────────────
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])

# ── Workspaces (top-level CRUD) ───────────────────────────────────
api_router.include_router(workspaces.router, prefix="/workspaces", tags=["Workspaces"])

# ── Workspace-scoped resources ────────────────────────────────────
api_router.include_router(members.router, prefix="/workspaces/{workspace_id}/members", tags=["Members"])
api_router.include_router(documents.router, prefix="/workspaces/{workspace_id}", tags=["Documents"])
api_router.include_router(website_ingest.router, prefix="/workspaces/{workspace_id}", tags=["Website Ingestion"])
api_router.include_router(search.router, prefix="/workspaces/{workspace_id}", tags=["Search"])
api_router.include_router(chats.router, prefix="/workspaces/{workspace_id}", tags=["Chats"])
api_router.include_router(widget.widget_router, prefix="/workspaces/{workspace_id}", tags=["Widget"])

# ── API Keys ──────────────────────────────────────────────────────
api_router.include_router(api_keys.router, prefix="/workspaces/{workspace_id}/api-keys", tags=["API Keys"])

# ── Webhooks ──────────────────────────────────────────────────────
api_router.include_router(webhooks.router, prefix="/workspaces/{workspace_id}/webhooks", tags=["Webhooks"])

# ── AI Features ───────────────────────────────────────────────────
api_router.include_router(ai_features.router, prefix="/workspaces/{workspace_id}/ai", tags=["AI Features"])

# ── Analytics ─────────────────────────────────────────────────────
api_router.include_router(analytics.router, tags=["Analytics"])

# ── Billing ───────────────────────────────────────────────────────
api_router.include_router(billing.router, tags=["Billing"])

# ── Public Widget (no auth) ───────────────────────────────────────
api_router.include_router(widget.public_widget_router, prefix="/widget", tags=["Public Widget"])

# ── Public API (API key auth) ─────────────────────────────────────
api_router.include_router(public_api.router, prefix="/v1", tags=["Public API"])

# ── Canned Responses ──────────────────────────────────────────────
api_router.include_router(canned_responses.router, prefix="/workspaces/{workspace_id}", tags=["Canned Responses"])

# ── Notifications ────────────────────────────────────────────────
api_router.include_router(notifications.router, prefix="/workspaces/{workspace_id}", tags=["Notifications"])

# ── GitHub ──────────────────────────────────────────────────────
api_router.include_router(github.router, prefix="/workspaces/{workspace_id}", tags=["GitHub"])

# ── Slack Integration ─────────────────────────────────────────────
api_router.include_router(slack.router, prefix="/slack", tags=["Slack"])
