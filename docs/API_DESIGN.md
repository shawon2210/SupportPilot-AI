# SupportPilot AI — API Design

## Base URL
Development: `http://localhost:8000/api/v1`
Production: `https://api.supportpilot.ai/api/v1`

## Authentication
All endpoints (except health and widget) require a Bearer token from Clerk.
```
Authorization: Bearer <clerk_jwt_token>
```

## Response Format
All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "per_page": 20,
    "total": 100
  }
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

---

## Health Endpoints

### GET /health
Health check. No auth required.
```json
{ "status": "healthy", "version": "0.1.0" }
```

### GET /health/ready
Readiness probe (checks DB connection).
```json
{ "status": "ready", "database": "connected" }
```

---

## Auth Endpoints

### POST /auth/webhook
Clerk webhook for user sync. No user auth required (webhook signature verified).
Body: Clerk webhook event payload.

### GET /auth/me
Get current user profile.
```json
{
  "id": "user_abc123",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "workspaces": [...]
}
```

---

## Workspace Endpoints

### GET /workspaces
List workspaces for current user.
Query: `?page=1&per_page=20&search=acme`

### POST /workspaces
Create a new workspace.
Body:
```json
{
  "name": "Acme Corp Support",
  "slug": "acme-corp"
}
```

### GET /workspaces/{workspace_id}
Get workspace details.

### PATCH /workspaces/{workspace_id}
Update workspace.
Body:
```json
{
  "name": "Acme Corp",
  "settings": { "timezone": "UTC" }
}
```

### DELETE /workspaces/{workspace_id}
Delete workspace (owner only).

---

## Member Endpoints

### GET /workspaces/{workspace_id}/members
List workspace members.
Query: `?page=1&per_page=20&role=admin`

### POST /workspaces/{workspace_id}/members
Invite a member.
Body:
```json
{
  "email": "agent@acme.com",
  "role": "agent"
}
```

### PATCH /workspaces/{workspace_id}/members/{member_id}
Update member role.
Body:
```json
{ "role": "admin" }
```

### DELETE /workspaces/{workspace_id}/members/{member_id}
Remove a member.

---

## Document Endpoints

### POST /workspaces/{workspace_id}/documents
Upload a document (multipart/form-data).
Fields: `file`, `name` (optional)

### GET /workspaces/{workspace_id}/documents
List documents.
Query: `?page=1&per_page=20&status=ready&type=pdf`

### GET /workspaces/{workspace_id}/documents/{doc_id}
Get document details with chunks.

### DELETE /workspaces/{workspace_id}/documents/{doc_id}
Delete document and its chunks.

---

## Chat Endpoints

### POST /workspaces/{workspace_id}/chats
Create a new chat session.
Body:
```json
{ "title": "Customer inquiry about billing" }
```

### GET /workspaces/{workspace_id}/chats
List chats.
Query: `?page=1&per_page=20&status=active`

### GET /workspaces/{workspace_id}/chats/{chat_id}
Get chat with messages.

### POST /workspaces/{workspace_id}/chats/{chat_id}/messages
Send a message (returns streaming SSE response).
Body:
```json
{ "content": "How do I reset my password?" }
```

### DELETE /workspaces/{workspace_id}/chats/{chat_id}
Delete a chat.

---

## Widget Endpoints

### GET /widget/config/{workspace_id}
Public widget configuration (no auth required).
```json
{
  "theme": "light",
  "primary_color": "#3B82F6",
  "greeting_message": "Hi! How can I help?",
  "position": "right"
}
```

### POST /widget/chat/{workspace_id}
Public chat endpoint for widget (rate limited, no auth).
Body:
```json
{
  "message": "What are your hours?",
  "session_id": "optional-session-id"
}
```

---

## API Key Endpoints

### GET /workspaces/{workspace_id}/api-keys
List API keys (prefixes only, never full keys).

### POST /workspaces/{workspace_id}/api-keys
Create API key.
Body:
```json
{
  "name": "Production Integration",
  "scopes": ["read", "write"],
  "expires_at": "2027-01-01T00:00:00Z"
}
```
Response includes the full key (only shown once).

### DELETE /workspaces/{workspace_id}/api-keys/{key_id}
Revoke an API key.

---

## Analytics Endpoints

### GET /workspaces/{workspace_id}/analytics/overview
Dashboard overview metrics.
```json
{
  "total_messages": 1523,
  "total_chats": 342,
  "avg_response_time_ms": 1200,
  "documents_count": 45,
  "period": "last_30_days"
}
```

### GET /workspaces/{workspace_id}/analytics/usage
Usage over time.
Query: `?period=7d&metric=messages`

---

## Rate Limits

| Plan | Requests/min | Documents/day | Messages/day |
|------|-------------|---------------|--------------|
| Free | 30 | 10 | 50 |
| Starter | 120 | 100 | 500 |
| Pro | 600 | 1000 | 5000 |
| Enterprise | Unlimited | Unlimited | Unlimited |
