"""SupportPilot AI — Feature Flags

Plan-based feature gating and gradual rollout system.
Controls which features are available to which workspaces.

Usage:
    from app.core.feature_flags import feature_enabled, require_feature
    
    # In an endpoint:
    if not await feature_enabled(workspace_id, "advanced_analytics"):
        raise HTTPException(403, "Upgrade to Pro for advanced analytics")
    
    # Or use the decorator:
    @require_feature("slack_integration")
    async def slack_endpoint(...):
        ...
"""

from __future__ import annotations

import json
import logging
from functools import wraps

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cache
from app.models.workspace import Workspace, WorkspacePlan

logger = logging.getLogger("supportpilot.features")


# ── Feature Definitions ────────────────────────────────────────────

# Each feature has:
# - plans: which plans have access (empty = all plans)
# - default: default state for plans not explicitly listed
# - description: human-readable description

FEATURES = {
    # Core features (all plans)
    "chat": {
        "plans": [],
        "default": True,
        "description": "Basic AI chat",
    },
    "document_upload": {
        "plans": [],
        "default": True,
        "description": "Upload documents to knowledge base",
    },
    "knowledge_search": {
        "plans": [],
        "default": True,
        "description": "Search knowledge base",
    },
    "widget": {
        "plans": [],
        "default": True,
        "description": "Embeddable chat widget",
    },

    # Starter+ features
    "custom_branding": {
        "plans": ["starter", "pro", "enterprise"],
        "default": False,
        "description": "Custom widget branding",
    },
    "team_members": {
        "plans": ["starter", "pro", "enterprise"],
        "default": False,
        "description": "Invite team members",
    },
    "conversation_history": {
        "plans": ["starter", "pro", "enterprise"],
        "default": False,
        "description": "View conversation history",
    },

    # Pro+ features
    "api_access": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "Public API access",
    },
    "webhooks": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "Webhook integrations",
    },
    "advanced_analytics": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "Advanced analytics dashboard",
    },
    "ticket_classification": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "AI ticket classification",
    },
    "suggested_replies": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "AI suggested replies",
    },
    "knowledge_gap_detection": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "Knowledge gap detection",
    },
    "slack_integration": {
        "plans": ["pro", "enterprise"],
        "default": False,
        "description": "Slack integration",
    },

    # Enterprise only
    "sso": {
        "plans": ["enterprise"],
        "default": False,
        "description": "Single Sign-On (SSO)",
    },
    "audit_logs": {
        "plans": ["enterprise"],
        "default": False,
        "description": "Full audit log access",
    },
    "custom_model": {
        "plans": ["enterprise"],
        "default": False,
        "description": "Custom AI model selection",
    },
    "sla_guarantee": {
        "plans": ["enterprise"],
        "default": False,
        "description": "SLA guarantee",
    },
    "dedicated_support": {
        "plans": ["enterprise"],
        "default": False,
        "description": "Dedicated support channel",
    },
}


class FeatureFlags:
    """
    Feature flag service with caching and plan-based gating.
    
    Features can be:
    - Enabled/disabled per plan (default)
    - Overridden per workspace (for beta testing, custom deals)
    - Gradually rolled out (percentage-based)
    """

    def __init__(self, db: AsyncSession | None = None):
        self.db = db
        self.cache = get_cache()

    async def is_enabled(self, workspace_id: str, feature: str) -> bool:
        """
        Check if a feature is enabled for a workspace.
        
        Resolution order:
        1. Workspace-specific override (from DB)
        2. Plan-based default (from FEATURES config)
        3. False (feature doesn't exist)
        """
        if feature not in FEATURES:
            logger.warning("Unknown feature flag: %s", feature)
            return False

        # Check cache first
        cache_key = f"feature:{workspace_id}:{feature}"
        cached = await self.cache.get(cache_key)
        if cached is not None:
            return cached

        # Check workspace-specific override
        if self.db:
            override = await self._get_workspace_override(workspace_id, feature)
            if override is not None:
                await self.cache.set(cache_key, override, ttl=300)
                return override

        # Fall back to plan-based default
        plan = await self._get_workspace_plan(workspace_id)
        feature_config = FEATURES[feature]

        if not feature_config["plans"]:
            # Empty plans list = available to all
            result = feature_config["default"]
        else:
            result = plan in feature_config["plans"]

        await self.cache.set(cache_key, result, ttl=300)
        return result

    async def require_feature(self, workspace_id: str, feature: str) -> None:
        """Raise an error if the feature is not enabled."""
        from fastapi import HTTPException

        if not await self.is_enabled(workspace_id, feature):
            feature_config = FEATURES.get(feature, {})
            required_plans = feature_config.get("plans", [])
            plan_names = ", ".join(required_plans) if required_plans else "any paid"

            raise HTTPException(
                status_code=403,
                detail={
                    "error": "FEATURE_NOT_AVAILABLE",
                    "message": f"This feature requires {plan_names} plan.",
                    "feature": feature,
                    "upgrade_url": "/api/v1/billing/plans",
                },
            )

    async def get_workspace_features(self, workspace_id: str) -> dict[str, bool]:
        """Get all feature flags for a workspace."""
        plan = await self._get_workspace_plan(workspace_id)
        result = {}

        for feature, config in FEATURES.items():
            if not config["plans"]:
                result[feature] = config["default"]
            else:
                result[feature] = plan in config["plans"]

        return result

    async def set_workspace_override(
        self,
        workspace_id: str,
        feature: str,
        enabled: bool,
    ) -> None:
        """Set a workspace-specific feature override."""
        if not self.db:
            return

        from app.core.security import generate_uuid as _genid
        from app.models.audit_log import AuditLog

        log = AuditLog(
            id=_genid(),
            workspace_id=workspace_id,
            action=f"feature.{feature}.{'enabled' if enabled else 'disabled'}",
            resource_type="feature_flag",
            resource_id=feature,
            details=json.dumps({"enabled": enabled, "source": "admin"}),
        )
        self.db.add(log)
        await self.db.flush()

        # Invalidate cache
        cache_key = f"feature:{workspace_id}:{feature}"
        await self.cache.set(cache_key, enabled, ttl=300)

    async def _get_workspace_override(self, workspace_id: str, feature: str) -> bool | None:
        """Get workspace-specific feature override from DB."""
        if not self.db:
            return None

        from app.models.audit_log import AuditLog

        stmt = select(AuditLog).where(
            AuditLog.workspace_id == workspace_id,
            AuditLog.action.startswith(f"feature.{feature}"),
        ).order_by(AuditLog.created_at.desc()).limit(1)

        result = await self.db.execute(stmt)
        log = result.scalar_one_or_none()

        if log:
            try:
                data = json.loads(log.details or "{}")
                return data.get("enabled")
            except (json.JSONDecodeError, TypeError):
                pass

        return None

    async def _get_workspace_plan(self, workspace_id: str) -> str:
        """Get the plan for a workspace."""
        if not self.db:
            return WorkspacePlan.FREE

        stmt = select(Workspace).where(Workspace.id == workspace_id)
        result = await self.db.execute(stmt)
        workspace = result.scalar_one_or_none()

        return workspace.plan if workspace else WorkspacePlan.FREE


# ── Decorator for endpoint protection ──────────────────────────────

def require_feature(feature: str):
    """
    Decorator to protect endpoints with feature flags.
    
    Usage:
        @router.get("/analytics/advanced")
        @require_feature("advanced_analytics")
        async def advanced_analytics(workspace_id: str, ...):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract workspace_id from kwargs or args
            workspace_id = kwargs.get("workspace_id")
            if not workspace_id and args:
                # Try to find workspace_id in positional args
                import inspect
                sig = inspect.signature(func)
                params = list(sig.parameters.keys())
                if "workspace_id" in params:
                    idx = params.index("workspace_id")
                    if idx < len(args):
                        workspace_id = args[idx]

            if workspace_id:
                from app.core.database import async_session_factory
                async with async_session_factory() as db:
                    flags = FeatureFlags(db)
                    await flags.require_feature(workspace_id, feature)

            return await func(*args, **kwargs)
        return wrapper
    return decorator
