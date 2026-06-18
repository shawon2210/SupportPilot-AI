"""SupportPilot AI — Workspace Service Tests"""

from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.workspace import WorkspacePlan
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.services.workspace_service import WorkspaceService


@pytest.mark.asyncio
async def test_create_workspace(db: AsyncSession):
    """Test workspace creation via service."""
    service = WorkspaceService(db)
    data = WorkspaceCreate(name="Test Workspace")
    workspace = await service.create_workspace(data, "user-123")

    assert workspace.name == "Test Workspace"
    assert workspace.slug == "test-workspace"
    assert workspace.plan == WorkspacePlan.FREE
    assert workspace.is_active is True


@pytest.mark.asyncio
async def test_create_workspace_generates_unique_slug(db: AsyncSession):
    """Test that duplicate slugs get a suffix."""
    service = WorkspaceService(db)

    ws1 = await service.create_workspace(WorkspaceCreate(name="Same Name"), "user-1")
    ws2 = await service.create_workspace(WorkspaceCreate(name="Same Name"), "user-2")

    assert ws1.slug == "same-name"
    assert ws2.slug == "same-name-1"


@pytest.mark.asyncio
async def test_get_workspace(db: AsyncSession):
    """Test getting a workspace by ID."""
    service = WorkspaceService(db)
    created = await service.create_workspace(WorkspaceCreate(name="Get Me"), "user-123")

    fetched = await service.get_workspace(created.id)
    assert fetched.id == created.id
    assert fetched.name == "Get Me"


@pytest.mark.asyncio
async def test_get_workspace_not_found(db: AsyncSession):
    """Test that getting a non-existent workspace raises NotFoundError."""
    service = WorkspaceService(db)
    with pytest.raises(NotFoundError):
        await service.get_workspace("nonexistent-id")


@pytest.mark.asyncio
async def test_update_workspace(db: AsyncSession):
    """Test updating a workspace."""
    service = WorkspaceService(db)
    created = await service.create_workspace(WorkspaceCreate(name="Original"), "user-123")

    updated = await service.update_workspace(
        created.id,
        WorkspaceUpdate(name="Updated"),
    )
    assert updated.name == "Updated"


@pytest.mark.asyncio
async def test_delete_workspace(db: AsyncSession):
    """Test deleting a workspace."""
    service = WorkspaceService(db)
    created = await service.create_workspace(WorkspaceCreate(name="Delete Me"), "user-123")

    await service.delete_workspace(created.id)

    with pytest.raises(NotFoundError):
        await service.get_workspace(created.id)


@pytest.mark.asyncio
async def test_workspace_plan_limits(db: AsyncSession):
    """Test that workspace has correct plan limits."""
    service = WorkspaceService(db)
    workspace = await service.create_workspace(WorkspaceCreate(name="Limits Test"), "user-123")

    limits = workspace.get_plan_limits()
    assert limits["max_members"] == 2  # free plan
    assert limits["max_documents"] == 10
    assert limits["max_messages_per_day"] == 50
