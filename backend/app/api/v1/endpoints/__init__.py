"""SupportPilot AI — API v1 Endpoints Package"""

from app.api.v1.endpoints import (
    analytics,
    auth,
    billing,
    chats,
    documents,
    health,
    members,
    search,
    website_ingest,
    widget,
    workspaces,
)

__all__ = [
    "analytics", "auth", "billing", "chats", "documents",
    "health", "members", "search", "website_ingest", "widget", "workspaces",
]
