# SupportPilot AI — Portfolio Summary

**Author:** Shawon  
**Date:** June 2026  
**Repository:** https://github.com/shawon2210/SupportPilot-AI  
**Live Demo:** *(URL after deployment)*  

---

## Elevator Pitch

SupportPilot AI is a multi-tenant AI customer support SaaS that lets businesses train AI support agents on their own documentation and deploy them to their website in minutes — with a single script tag.

---

## Project Statistics

| Metric | Value |
|--------|-------|
| Backend API Endpoints | 79 |
| Database Tables | 14 |
| Service Classes | 12 |
| UI Components | 27 |
| Frontend Pages | 29 |
| Automated Tests | 97 |
| LLM Providers Supported | 7 |
| CI/CD Pipeline Stages | 5 |
| Python Source Files | ~100 |
| Total Lines (Backend) | ~8,000 |
| Total Lines (Frontend) | ~5,300 |
| Security Fixes Applied | 4 critical + 4 high |

---

## Architecture Overview

```
Client (Next.js 15) → API Gateway (FastAPI + JWT + Rate Limit)
    → Service Layer (12 services, repository pattern)
    → AI Provider Abstraction (7 LLM vendors)
    → Data Layer (PostgreSQL + pgvector + Redis)
    → Event Bus (Redis Streams + Outbox Pattern)
    → Background Workers (async task processing)
```

---

## Key Features

### 1. Multi-Tenant SaaS
- Workspace isolation enforced at service layer
- 4 role levels: Owner, Admin, Agent, Member
- RBAC enforced on all 48 workspace-scoped endpoints
- Plan-based feature gating (Free/Starter/Pro/Enterprise)

### 2. RAG Knowledge Base
- Document ingestion: PDF, DOCX, TXT, Markdown
- Website crawling with SSRF protection
- Automatic chunking and embedding generation
- Vector search with pgvector
- Source citations and confidence scores

### 3. AI Chat
- Streaming responses (Server-Sent Events)
- Conversation history and context management
- 7 swappable LLM providers
- AI features: classification, suggested replies, escalation, knowledge gaps

### 4. Embeddable Widget
- Single script tag deployment
- Theme customization (colors, messages, position)
- Mobile responsive
- Lead capture
- Works on React, Next.js, WordPress, Shopify, static HTML

### 5. Billing & Analytics
- Stripe subscriptions with 4 tiers
- Usage tracking and analytics dashboard
- PostHog event tracking
- Prometheus metrics + Grafana dashboards

### 6. Integrations
- Public API with API key authentication
- Webhook subscriptions with event bus + outbox pattern
- Slack slash commands
- Clerk user management

---

## Technical Highlights

### Security
- JWT authentication with required secret key (no default)
- RBAC on all workspace endpoints
- Tenant isolation prevents cross-workspace data leakage
- Rate limiting with token bucket algorithm (Redis-backed)
- SSRF protection on website crawler
- Input validation via Pydantic schemas
- SQL injection protection via SQLAlchemy ORM
- Non-root Docker user

### Architecture Patterns
- **Repository Pattern** — decouples business logic from data access
- **Service Layer** — 12 service classes with clear responsibilities
- **Factory Pattern** — AI provider abstraction (7 vendors)
- **Event-Driven Architecture** — Redis Streams for decoupled communication
- **Outbox Pattern** — reliable webhook delivery with at-least-once semantics
- **Dependency Injection** — FastAPI's `Depends` for auth, DB, RBAC

### DevOps
- Docker containerization (multi-stage builds)
- CI/CD pipeline (lint → security → test → build → deploy)
- GitHub Actions for automated testing on push/PR
- Railway + Vercel deployment configs
- Health checks and monitoring (Sentry + Prometheus + Grafana)

---

## Files of Interest

| File | Why It's Interesting |
|------|---------------------|
| `backend/app/ai/factory.py` | AI provider factory supporting 7 LLM vendors |
| `backend/app/core/rbac.py` | RBAC middleware with role hierarchy |
| `backend/app/services/chat_service.py` | RAG pipeline with streaming support |
| `backend/app/services/website_crawler.py` | SSRF-protected web crawler |
| `backend/app/core/event_bus.py` | Redis Streams event bus |
| `backend/app/core/rate_limit.py` | Token bucket rate limiter with Redis |
| `backend/app/models/` | 14 SQLAlchemy models with relationships |
| `frontend/app/(dashboard)/chat/[id]/page.tsx` | Real-time streaming chat UI |
| `frontend/app/(dashboard)/widget/page.tsx` | Widget builder with live preview |
| `.github/workflows/ci.yml` | Full CI/CD pipeline |

---

## What I Learned

### Technical
- **Multi-tenancy:** Enforcing isolation at the service layer is more secure than relying on frontend filtering
- **AI Provider Abstraction:** A common interface with factory pattern makes it trivial to switch LLM vendors
- **Event-Driven Design:** Services communicate via events instead of direct calls, enabling loose coupling
- **RAG Pipeline:** Document → Extract → Chunk → Embed → Vector Store → Retrieve → Generate → Cite

### Engineering Process
- **Security First:** Audited and fixed 4 critical vulnerabilities before deployment
- **Testing:** 97 automated tests covering services, endpoints, and edge cases
- **CI/CD:** Automated linting, security scanning, testing, and deployment
- **Documentation:** Architecture diagrams, API design, deployment guide, case study

### Product Thinking
- **Portfolio vs Production:** A portfolio project needs evidence (screenshots, video, live demo) more than features
- **RBAC:** Role-based access control is essential for any multi-tenant system
- **Widget Embedding:** A single script tag is the difference between "easy adoption" and "another integration project"

---

## How to Read This Codebase

### Start here (5 minutes):
1. `README.md` — Overview and quick start
2. `docs/ARCHITECTURE.md` — System architecture
3. `docs/ERD.md` — Database schema

### Understand the backend (30 minutes):
1. `backend/app/api/v1/router.py` — API routing structure
2. `backend/app/core/rbac.py` — Authentication and authorization
3. `backend/app/services/chat_service.py` — Core RAG logic
4. `backend/app/ai/factory.py` — AI provider abstraction

### Understand the frontend (15 minutes):
1. `frontend/app/layout.tsx` — Root layout
2. `frontend/app/(dashboard)/dashboard/page.tsx` — Main dashboard
3. `frontend/app/(dashboard)/chat/[id]/page.tsx` — Chat interface
4. `frontend/components/ui/` — Component library

### Deep dive (1 hour):
1. `backend/app/services/` — All 12 service classes
2. `backend/app/models/` — All 14 database models
3. `backend/app/core/` — Infrastructure (cache, events, rate limit, security)
4. `frontend/app/(dashboard)/` — All dashboard pages

---

## Interview Talking Points

### "Tell me about the architecture"
> "SupportPilot uses a layered architecture: API Gateway → Service Layer → Repository → Data Layer. The frontend communicates via REST API with JWT authentication. Services are decoupled through an event bus using Redis Streams. The AI layer is abstracted behind a factory pattern supporting 7 LLM providers."

### "How do you handle multi-tenancy?"
> "Every resource belongs to a workspace. RBAC is enforced on all 48 workspace-scoped endpoints — users must be members with the appropriate role. The service layer filters queries by workspace_id, preventing any cross-workspace data leakage."

### "What was the hardest technical challenge?"
> "The RAG pipeline with streaming. I had to implement Server-Sent Events for real-time AI responses, handle streaming token assembly, and ensure source citations are properly attached. The chat service coordinates embedding generation, vector search, and LLM completion — all asynchronously."

### "How do you handle security?"
> "JWT auth with no default secret key, RBAC on all workspace endpoints, rate limiting with token bucket algorithm, SSRF protection on the website crawler, input validation via Pydantic, and SQL injection prevention through parameterized queries only."

### "What would you do differently?"
> "I'd implement proper Clerk JWKS validation from the start instead of the dev header fallback. I'd also add query result caching for repeated RAG searches and use Celery for heavier background workloads."

---

## Deployment

### Production Stack
- **Frontend:** Vercel (Next.js 15)
- **Backend:** Railway (FastAPI + Docker)
- **Database:** Supabase (PostgreSQL + pgvector)
- **Cache:** Upstash Redis
- **Monitoring:** Sentry + Prometheus + Grafana

### Local Development
```bash
# Backend
cd backend && pip install -r requirements.txt
cp .env.example .env  # Configure your API keys
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

---

## License

MIT
