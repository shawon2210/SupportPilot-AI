# SupportPilot AI — Seed Script

"""Seed the database with initial test data."""

from __future__ import annotations

import asyncio
import json

from app.core.database import async_session_factory, engine, Base
from app.core.security import generate_uuid
from app.models.user import User
from app.models.workspace import Workspace, WorkspacePlan
from app.models.member import WorkspaceMember, WorkspaceRole
from app.models.widget_config import WidgetConfig
from app.models.subscription import Subscription


async def seed():
    """Insert seed data."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session_factory() as session:
        # Create test user
        user_id = "seed-user-001"
        user = User(
            id=user_id,
            email="demo@supportpilot.ai",
            first_name="Demo",
            last_name="User",
        )
        session.add(user)
        await session.flush()

        # Create workspace
        ws_id = generate_uuid()
        workspace = Workspace(
            id=ws_id,
            name="Demo Workspace",
            slug="demo-workspace",
            plan=WorkspacePlan.FREE,
            plan_limits=json.dumps(WorkspacePlan.LIMITS[WorkspacePlan.FREE]),
        )
        session.add(workspace)
        await session.flush()

        # Add user as owner
        member = WorkspaceMember(
            id=generate_uuid(),
            workspace_id=ws_id,
            user_id=user_id,
            role=WorkspaceRole.OWNER,
        )
        session.add(member)

        # Create widget config
        widget = WidgetConfig(
            id=generate_uuid(),
            workspace_id=ws_id,
        )
        session.add(widget)

        # Create subscription
        sub = Subscription(
            id=generate_uuid(),
            workspace_id=ws_id,
            plan=WorkspacePlan.FREE,
        )
        session.add(sub)

        await session.commit()
        print(f"Seeded: user={user_id}, workspace={ws_id}")


if __name__ == "__main__":
    asyncio.run(seed())
