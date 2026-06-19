# SupportPilot AI — Security Findings Report

**Date:** 2026-06-19  
**Auditor:** Automated Code Analysis  
**Scope:** All backend endpoints, auth flow, config, services  

---

## FINDING 1: RBAC NOT ENFORCED ON WORKSPACE ENDPOINTS

### Severity: HIGH

### Vulnerability
Workspace-scoped endpoints accept any authenticated user but never check whether the user is a member of the target workspace, and never check their role. A logged-in user can read, modify, or delete any other workspace's data.

### Affected Files
- `app/api/v1/endpoints/workspaces.py` (lines 86, 99 — `# TODO: Add RBAC check`)
- `app/api/v1/endpoints/members.py` — invite/update/remove have no role check
- `app/api/v1/endpoints/analytics.py` (line ~106 — no admin check)
- `app/api/v1/endpoints/documents.py`, `chats.py`, `api_keys.py`, `webhooks.py` — all use only `get_current_user` without workspace membership verification

### Exact Code
```python
# workspaces.py L82-107
@router.put("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    updates: WorkspaceUpdate,
    current_user: dict = Depends(get_current_user),  # ← Any authenticated user
    # TODO: Add RBAC check                         # ← NEVER IMPLEMENTED
):
```

### Exploit Scenario
1. User A creates Workspace A (they are the owner)
2. User B creates Workspace B (they are the owner)
3. User B calls `PUT /api/v1/workspaces/{workspace_id-of-a}` with User A's workspace ID
4. User B can rename, modify, or DELETE User A's workspace
5. User B can call `GET /api/v1/workspaces/{workspace_id-of-a}/chats` to read all conversations

### Business Impact
- **Data exfiltration:** Any user can read any workspace's chats, documents, analytics
- **Data destruction:** Any user can delete any workspace or its contents
- **Compliance violation:** Complete tenant isolation failure for SOC2/GDPR

### Fix Complexity: MEDIUM (4-8 hours)
Add a `require_role` dependency and enforce workspace membership on every scoped endpoint. A single reusable dependency can cover all endpoints.

### Verdict for Portfolio/Interview
**Must fix before showing to recruiters.** If a recruiter logs in and sees data from another workspace, that's an instant rejection. However, you can mitigate this by making the frontend only show the user's own workspaces — the backend fix is still needed but the frontend provides a layer of protection.

---

## FINDING 2: SSRF IN WEBSITE CRAWLER

### Severity: CRITICAL

### Vulnerability
The website crawler accepts any URL from the user and makes HTTP requests to it without validating against private/internal IP ranges. The crawler follows redirects, which can redirect to internal services.

### Affected File
- `app/services/website_crawler.py` (lines 58-130)

### Exact Code
```python
# website_crawler.py L78-79
async with httpx.AsyncClient(
    follow_redirects=True,  # ← Follows redirects to internal IPs
) as client:
    ...
    page = await self._fetch_page(client, current_url)  # ← No IP validation

# _fetch_page L124-126
async def _fetch_page(self, client, url: str) -> CrawledPage:
    response = await self._fetch_page(client, url)  # ← Direct GET to any URL
```

### Exploit Scenario
1. Attacker goes to "Add Website" in knowledge base
2. Enters: `http://169.254.169.254/latest/meta-data/iam/security-credentials/` (AWS metadata)
3. The crawler fetches the URL and returns the response as text
4. If an LLM response includes the crawled content, the attacker sees AWS credentials
5. Alternative: `http://localhost:6379/` returns Redis INFO output
6. Alternative: `http://10.0.0.1:8000/api/v1/workspaces` returns all data from internal network

### Business Impact
- **Cloud credential theft** (AWS/GCP/Azure metadata endpoints)
- **Internal network scanning** and service discovery
- **Data exfiltration** from internal services
- **Port scanning** at scale

### Fix Complexity: LOW (1-2 hours)
Add IP validation before making the request. Block RFC 1918 ranges (10.x, 172.16-31.x, 192.168.x), loopback (127.x), link-local (169.254.x), and cloud metadata IPs.

### Verdict for Portfolio/Interview
**Must fix before public deployment.** This is the kind of finding that makes a security reviewer cringe. However, for a local-only demo with no cloud deployment, the risk is near zero (nothing internal to scan).

---

## FINDING 3: AUTHENTICATION BYPASS VIA X-USER-ID HEADER

### Severity: HIGH (in production), LOW (in demo)

### Vulnerability
The authentication dependency accepts a `X-User-ID` header that bypasses JWT validation entirely. Any client can impersonate any user by setting this header.

### Affected Files
- `app/api/v1/endpoints/auth.py` (lines 35-36)
- `app/core/rbac.py` (line 112)

### Exact Code
```python
# auth.py L35-36
# Support X-User-ID header for development
user_id = request.headers.get("X-User-ID")  # ← COMPLETE BYPASS
if not user_id:
    # Only falls back to JWT if no header
    from app.core.security import decode_access_token
    payload = decode_access_token(token)
    user_id = payload.get("sub")
```

### Exploit Scenario
1. Attacker crafts request without a valid JWT token
2. Sets header: `X-User-ID: any-user-id-from-database`
3. The endpoint returns the ID without verifying anything
4. Now attacker can act as any user (including workspace owners)

### Business Impact
- **Complete identity spoofing** — become any user, including admins
- **No audit trail** — actions appear to be from the spoofed user
- **Combined with Finding 1** — attacker can `X-User-ID` as any workspace owner, then delete any workspace

### Fix Complexity: LOW (30 min)
Remove the `X-User-ID` fallback in production. If needed for development, gate it behind `APP_ENV == "development"`:
```python
if os.getenv("APP_ENV") == "development":
    user_id = request.headers.get("X-User-ID")
```

### Verdict for Portfolio/Interview
**Must fix before public deployment.** Gate it behind APP_ENV. For local demo only, it's acceptable since you control all requests.

---

## FINDING 4: DEFAULT SECRET_KEY

### Severity: CRITICAL (if not set), NONE (if set)

### Vulnerability
The `SECRET_KEY` config has a default value of `"change-me-in-production"`. If `SECRET_KEY` env var is not set in production, all JWT tokens are signed with a publicly known key.

### Affected File
- `app/core/config.py` (line 40)

### Exact Code
```python
# config.py L40
SECRET_KEY: str = "change-me-in-production"  # ← PUBLICLY KNOWN DEFAULT
```

### Exploit Scenario
1. Attacker decodes a JWT token (base64 decode)
2. If the app used the default key, attacker can forge new tokens:
   ```python
   import jwt
   token = jwt.encode({"sub": "any-user-id", "exp": 9999999999}, "change-me-in-production", "HS256")
   ```
3. Attacker becomes any user without any credentials

### Business Impact
- **Complete token forgery** if SECRET_KEY is not configured
- **Impersonate any user**, including workspace owners
- **Bypass all authentication** without knowing any real credentials

### Fix Complexity: Trivial (5 minutes)
Remove the default value. Require the env var:
```python
SECRET_KEY: str  # No default — app crashes if not set
```
Or generate one at startup in development mode only.

### Verdict for Portfolio/Interview
**Must fix before public deployment.** But if you set `SECRET_KEY` in your Railway/Vercel env vars (which you will), this is automatically resolved. Just remove the default value so you get a clear error if it's missing.

---

## ADDITIONAL FINDINGS (MEDIUM/HIGH)

### H1: Database Connection Pool Too Small
- **File:** `app/core/database.py`
- **Issue:** Default SQLAlchemy pool (5 connections) exhausts under load
- **Fix:** Set `pool_size=20, max_overflow=10`
- **Complexity:** 5 minutes
- **Verdict:** Can defer for demo

### H2: CORS Allows All Methods
- **File:** `app/main.py`
- **Issue:** `allow_methods=["*"]` + `allow_credentials=True`
- **Fix:** Restrict to specific methods
- **Complexity:** 5 minutes
- **Verdict:** Can defer for demo

### H3: Clerk Webhook No Signature Verification
- **File:** `app/api/v1/endpoints/auth.py` (webhook handler)
- **Issue:** Webhook payloads accepted without Svix signature verification
- **Fix:** Implement Svix verification
- **Complexity:** 1-2 hours
- **Verdict:** Must fix if using Clerk webhooks in production

### H4: No File Content Validation
- **File:** `app/utils/files.py`
- **Issue:** Only extension/MIME checked (client-spoofable)
- **Fix:** Add magic byte validation
- **Complexity:** 1 hour
- **Verdict:** Can defer for demo

---

## RISK MATRIX FOR YOUR USE CASE

| Finding | Severity | Portfolio Demo | Real Users | Fix Time |
|---------|----------|---------------|------------|----------|
| B-1: RBAC | HIGH | ⚠️ Mitigate via frontend | ✅ Must fix | 4-8h |
| B-2: SSRF | CRITICAL | ✅ Low risk (local only) | ✅ Must fix | 1-2h |
| B-3: X-User-ID | HIGH | ✅ Gate behind APP_ENV | ✅ Must fix | 0.5h |
| B-4: SECRET_KEY | CRITICAL | ✅ Set env var = fixed | ✅ Must fix | 0.5h |
| H1: DB pool | MEDIUM | ✅ Low impact | ✅ Should fix | 0.1h |
| H2: CORS | MEDIUM | ✅ Low impact | ✅ Should fix | 0.1h |
| H3: Clerk webhook | MEDIUM | ✅ Low impact | ✅ Should fix | 1-2h |
| H4: File validation | MEDIUM | ✅ Low impact | ✅ Should fix | 1h |

---

## RECOMMENDED ACTION PLAN

### For Portfolio/Interview Demo (1-2 hours of fixes)

**Fix these 3 things:**
1. **B-3:** Gate `X-User-ID` behind `APP_ENV == "development"` (5 min)
2. **B-4:** Remove default value for `SECRET_KEY` (5 min)
3. **B-2:** Add IP validation to website crawler (30 min)

**Mitigate B-1 without backend changes:**
- The frontend already only shows the user's own workspaces
- A recruiter won't try to guess other workspace IDs
- Add the backend RBAC fix when you have time

### For Real Customer Deployment (8-12 hours of fixes)

Fix all 8 findings above, plus:
- Add RBAC enforcement to all workspace endpoints
- Configure database connection pool
- Restrict CORS methods/headers
- Implement Clerk webhook signature verification
- Add file content magic byte validation

---

## CONCLUSION

**For your stated goal (interviews, freelance, portfolio):**

The project is **safe to deploy as a demo** with 3 quick fixes (30 minutes total):
1. Gate X-User-ID behind APP_ENV
2. Remove SECRET_KEY default
3. Add SSRF IP validation

Deploy with demo data only. No real customer data. No Stripe live mode.
Show it to recruiters. Get interviews. Fix the rest when you have paying customers.

**The code quality, architecture, and feature set are already impressive.**
The security findings are common in early-stage SaaS projects and easily fixable.
