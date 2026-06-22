"""SupportPilot AI — Auth Endpoint Tests"""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_me_unauthorized(client: AsyncClient):
    """Test that /me returns 401 without auth."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_with_auth(client: AsyncClient, auth_headers: dict):
    """Test /me with valid JWT after creating user via webhook."""
    # First, create a user via the webhook
    webhook_data = {
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    }
    response = await client.post("/api/v1/auth/webhook", json=webhook_data)
    assert response.status_code == 200

    # Now get the user profile with valid JWT
    response = await client.get("/api/v1/auth/me", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "test-user-123"
    assert data["email"] == "test@example.com"
    assert data["first_name"] == "Test"
    assert data["last_name"] == "User"


@pytest.mark.asyncio
async def test_clerk_webhook_user_created(client: AsyncClient):
    """Test Clerk webhook for user creation."""
    webhook_data = {
        "type": "user.created",
        "data": {
            "id": "clerk_user_456",
            "email_addresses": [{"email_address": "newuser@example.com"}],
            "first_name": "New",
            "last_name": "User",
        },
    }
    response = await client.post("/api/v1/auth/webhook", json=webhook_data)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_clerk_webhook_user_deleted(client: AsyncClient):
    """Test Clerk webhook for user deletion."""
    # Create user first
    create_data = {
        "type": "user.created",
        "data": {
            "id": "clerk_user_789",
            "email_addresses": [{"email_address": "delete@example.com"}],
            "first_name": "Delete",
            "last_name": "Me",
        },
    }
    await client.post("/api/v1/auth/webhook", json=create_data)

    # Delete user
    delete_data = {
        "type": "user.deleted",
        "data": {"id": "clerk_user_789"},
    }
    response = await client.post("/api/v1/auth/webhook", json=delete_data)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
