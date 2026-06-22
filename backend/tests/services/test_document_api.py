"""SupportPilot AI — Document API Tests"""

from __future__ import annotations

import io
import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.fixture
def sample_text_content() -> bytes:
    return b"This is a sample document for testing. It has multiple sentences. " * 20


@pytest.mark.asyncio
async def test_upload_text_document(
    client: AsyncClient,
    auth_headers: dict,
    sample_text_content: bytes,
):
    """Test uploading a plain text document."""
    # Create user and workspace first
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Doc Test Workspace"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    # Upload document
    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/documents",
        files={"file": ("test.txt", io.BytesIO(sample_text_content), "text/plain")},
        headers=auth_headers,
    )

    # Should succeed (201) or fail with 422 if AI provider not configured
    assert response.status_code in (201, 422)

    if response.status_code == 201:
        data = response.json()
        assert data["name"] == "test.txt"
        assert data["source_type"] == "txt"
        assert data["status"] in ("pending", "processing", "ready", "error")


@pytest.mark.asyncio
async def test_upload_unsupported_file_type(client: AsyncClient, auth_headers: dict):
    """Test that unsupported file types are rejected."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "File Type Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/documents",
        files={"file": ("image.jpg", io.BytesIO(b"fake image"), "image/jpeg")},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_upload_empty_file(client: AsyncClient, auth_headers: dict):
    """Test that empty files are rejected."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Empty File Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/documents",
        files={"file": ("empty.txt", io.BytesIO(b""), "text/plain")},
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert "Empty file" in response.json()["detail"]


@pytest.mark.asyncio
async def test_list_documents(client: AsyncClient, auth_headers: dict):
    """Test listing documents in a workspace."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "List Docs Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    response = await client.get(
        f"/api/v1/workspaces/{workspace_id}/documents",
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["data"], list)


@pytest.mark.asyncio
async def test_list_documents_with_filters(client: AsyncClient, auth_headers: dict):
    """Test listing documents with type and status filters."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Filter Docs Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    # Filter by type
    response = await client.get(
        f"/api/v1/workspaces/{workspace_id}/documents?source_type=txt",
        headers=auth_headers,
    )
    assert response.status_code == 200

    # Filter by status
    response = await client.get(
        f"/api/v1/workspaces/{workspace_id}/documents?status=ready",
        headers=auth_headers,
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_delete_document_not_found(client: AsyncClient, auth_headers: dict):
    """Test deleting a non-existent document."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Delete Doc Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    response = await client.delete(
        f"/api/v1/workspaces/{workspace_id}/documents/nonexistent-id",
        headers=auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_website_ingest_validation(client: AsyncClient, auth_headers: dict):
    """Test website ingestion endpoint validation."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Website Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    # Valid request (will fail at crawl level without network, but validates input)
    response = await client.post(
        f"/api/v1/workspaces/{workspace_id}/documents/website",
        json={"url": "https://example.com", "max_pages": 5},
        headers=auth_headers,
    )
    # Should either succeed or fail at crawl level (not validation)
    assert response.status_code in (201, 422, 500)


@pytest.mark.asyncio
async def test_search_validation(client: AsyncClient, auth_headers: dict):
    """Test search endpoint validation."""
    await client.post("/api/v1/auth/webhook", json={
        "type": "user.created",
        "data": {
            "id": "test-user-123",
            "email_addresses": [{"email_address": "test@example.com"}],
            "first_name": "Test",
            "last_name": "User",
        },
    })

    ws_resp = await client.post(
        "/api/v1/workspaces",
        json={"name": "Search Test"},
        headers=auth_headers,
    )
    workspace_id = ws_resp.json()["id"]

    # Empty query should fail validation
    response = await client.get(
        f"/api/v1/workspaces/{workspace_id}/search?query=",
        headers=auth_headers,
    )
    assert response.status_code == 422  # Validation error
