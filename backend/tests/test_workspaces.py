"""SupportPilot AI — Workspace Endpoint Tests"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_create_workspace(client: AsyncClient, auth_headers: dict):
    """Test creating a new workspace."""
    # Create user first
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    response = await client.post(
        "/api/v1/workspaces",
        json={"name": "Test Workspace"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Workspace"
    assert data["slug"] == "test-workspace"
    assert data["plan"] == "free"
    assert data["id"] is not None


@pytest.mark.asyncio
async def test_create_workspace_with_custom_slug(client: AsyncClient, auth_headers: dict):
    """Test creating a workspace with a custom slug."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    response = await client.post(
        "/api/v1/workspaces",
        json={"name": "My Workspace", "slug": "my-custom-slug"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "my-custom-slug"


@pytest.mark.asyncio
async def test_list_workspaces(client: AsyncClient, auth_headers: dict):
    """Test listing workspaces for current user."""
    # Create user and workspace
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    await client.post(
        "/api/v1/workspaces",
        json={"name": "Workspace One"},
        headers=auth_headers,
    )

    response = await client.get("/api/v1/workspaces", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) >= 1


@pytest.mark.asyncio
async def test_get_workspace_detail(client: AsyncClient, auth_headers: dict):
    """Test getting workspace details."""
    # Create user and workspace
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    create_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Detail Test"},
        headers=auth_headers,
    )
    workspace_id = create_resp.json()["id"]

    response = await client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == workspace_id
    assert data["name"] == "Detail Test"
    assert "member_count" in data


@pytest.mark.asyncio
async def test_update_workspace(client: AsyncClient, auth_headers: dict):
    """Test updating a workspace."""
    # Create user and workspace
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    create_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Original Name"},
        headers=auth_headers,
    )
    workspace_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/v1/workspaces/{workspace_id}",
        json={"name": "Updated Name"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"


@pytest.mark.asyncio
async def test_delete_workspace(client: AsyncClient, auth_headers: dict):
    """Test deleting a workspace."""
    # Create user and workspace
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    create_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Delete Me"},
        headers=auth_headers,
    )
    workspace_id = create_resp.json()["id"]

    response = await client.delete(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers,
    )
    assert response.status_code == 204

    # Verify it's gone
    get_resp = await client.get(
        f"/api/v1/workspaces/{workspace_id}",
        headers=auth_headers,
    )
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_workspace_unauthorized(client: AsyncClient):
    """Test that workspace endpoints require auth."""
    response = await client.get("/api/v1/workspaces")
    assert response.status_code == 401
