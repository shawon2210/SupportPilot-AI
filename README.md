# SupportPilot AI

> A multi-tenant AI customer support platform that enables businesses to create AI-powered support assistants trained on their own documentation.

[![CI](https://github.com/shawon2210/SupportPilot-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/shawon2210/SupportPilot-AI/actions)
[![Python](https://img.shields.io/badge/python-3.12+-blue.svg)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688.svg)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

---

## Overview

SupportPilot AI allows businesses to:

1. **Upload documents** (PDF, DOCX, TXT, Markdown) or **crawl websites**
2. **Build a knowledge base** with automatic chunking, embeddings, and vector storage
3. **Chat with their data** using RAG-powered AI responses with source citations
4. **Deploy an embeddable chat widget** on any website with a single script tag
5. **Manage teams** with role-based access control (Owner, Admin, Agent, Member)
6. **Track analytics** — usage, response times, conversion metrics
7. **Integrate via API** with API keys, webhooks, and Slack

The entire application works with **any LLM provider** — switch between OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Kimi, or a custom OpenAI-compatible endpoint by changing one environment variable.

---

## Architecture

```
                    ┌─────────────────────────────────────────────┐
                    │              CLIENT LAYER                    │
                    │  ┌──────────┐ ┌──────────┐ ┌─────────────┐  │
                    │  │ Next.js  │ │ Widget   │ │ 3rd Party   │  │
                    │  │ Dashboard│ │ (embed)  │ │ Integrations│  │
                    │  └────┬─────┘ └────┬─────┘ └──────┬──────┘  │
                    └───────┼────────────┼──────────────┼─────────┘
                            │ HTTPS/WSS  │              │
                    ┌───────┴────────────┴──────────────┴─────────┐
                    │              API GATEWAY                      │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
                    │  │   JWT    │ │  Rate    │ │    CORS      │  │
                    │  │  Auth    │ │  Limit   │ │   Handler    │  │
                    │  └──────────┘ └──────────┘ └──────────────┘  │
                    ├──────────────────────────────────────────────┤
                    │            SERVICE LAYER                      │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
                    │  │Workspace │ │ Document │ │    Chat      │  │
                    │  │ Service  │ │ Service  │ │   Service    │  │
                    │  └──────────┘ └──────────┘ └──────────────┘  │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
                    │  │ Billing  │ │Analytics │ │  AI Provider │  │
                    │  │ Service  │ │ Service  │ │  Factory     │  │
                    │  └──────────┘ └──────────┘ └──────────────┘  │
                    ├──────────────────────────────────────────────┤
                    │          AI PROVIDER ABSTRACTION              │
                    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
                    │  │ OpenAI │ │Anthropic│ │ Gemini │ │DeepSeek│ │
                    │  └────────┘ └────────┘ └────────┘ └────────┘ │
                    │  ┌────────┐ ┌────────┐ ┌────────┐            │
                    │  │OpenRouter│ │  Kimi  │ │FreeKey │            │
                    │  └────────┘ └────────┘ └────────┘            │
                    ├──────────────────────────────────────────────┤
                    │              DATA LAYER                       │
                    │  ┌──────────────┐ ┌──────────┐ ┌──────────┐  │
                    │  │ PostgreSQL   │ │ pgvector │ │  Redis   │  │
                    │  │ (Primary DB) │ │ (Vectors)│ │ (Cache)  │  │
                    │  └──────────────┘ └──────────┘ └──────────┘  │
                    │  ┌──────────────┐ ┌──────────┐                │
                    │  │    Event     │ │  Outbox  │                │
                    │  │    Bus       │ │  Pattern │                │
                    │  └──────────────┘ └──────────┘                │
                    └──────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI, Framer Motion |
| **State Management** | TanStack Query, Zustand, React Hook Form + Zod |
| **Backend** | FastAPI, Python 3.12+, Pydantic v2 |
| **Database** | PostgreSQL + pgvector (vector search) |
| **Cache/Rate Limit** | Redis (with in-memory fallback) |
| **AI/ML** | LangChain, 7 LLM provider integrations |
| **Auth** | JWT + Clerk (JWKS validation) |
| **Payments** | Stripe (subscriptions, webhooks) |
| **Monitoring** | Sentry, Prometheus, Grafana |
| **CI/CD** | GitHub Actions |
| **Deployment** | Vercel (frontend), Railway (backend) |
| **Storage** | Supabase Storage (prod), Local (dev) |

---

## Features

### Multi-Tenant SaaS
- Workspace isolation enforced at the service layer with RBAC
- 4 role levels: Owner, Admin, Agent, Member
- Plan-based feature gating (Free / Starter / Pro / Enterprise)

### RAG Knowledge Base
- Document ingestion: PDF, DOCX, TXT, Markdown
- Website crawling with configurable depth
- Automatic text chunking and embedding generation
- Vector search with pgvector (IVFFlat/HNSW indexes)
- Source citations and confidence scores in responses

### AI Chat
- Streaming responses via Server-Sent Events
- Conversation history and context management
- 7 swappable LLM providers (change via env var)
- AI features: ticket classification, suggested replies, escalation detection, knowledge gap analysis

### Embeddable Widget
- Single script tag deployment
- Floating chat bubble with theme customization
- Mobile responsive
- Lead capture and conversation history
- Works on React, Next.js, WordPress, Shopify, static HTML

### Billing & Analytics
- Stripe subscription management with 4 tiers
- Usage tracking and analytics dashboard
- PostHog event tracking
- Prometheus metrics + Grafana dashboards

### Integrations
- Public API with API key authentication
- Webhook subscriptions with event bus + outbox pattern
- Slack slash commands
- Clerk user management webhooks

---

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- PostgreSQL with pgvector (or use the included Docker setup)
- Redis

### Local Development

```bash
# Clone the repository
git clone git@github.com:shawon2210/SupportPilot-AI.git
cd SupportPilot-AI

# ── Backend ──────────────────────────────────────
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Copy and configure environment
cp .env.example .env
# Edit .env with your API keys (SECRET_KEY, AI_PROVIDER, etc.)

# Run development server
uvicorn app.main:app --reload

# ── Frontend ─────────────────────────────────────
cd ../frontend
npm install
npm run dev

# ── Docker (full stack) ──────────────────────────
docker compose -f docker-compose.prod.yml up -d
```

### Access the Application
- Frontend: http://localhost:3000
- API: http://localhost:8000/api/v1
- API Docs (Swagger): http://localhost:8000/docs
- API Docs (ReDoc): http://localhost:8000/redoc

### Run Tests
```bash
cd backend
python -m pytest tests/ -v --tb=short
```

### Seed Demo Data
```bash
cd backend
python -m scripts.demo_data
```

This creates an "Acme Corp" workspace with:
- 5 team members across all roles
- 5 documents with RAG chunks
- 3 website knowledge sources
- 5 realistic support conversations
- 30 days of analytics data

---

## API Endpoints

79 endpoints across 15 router groups:

| Group | Endpoints | Description |
|-------|-----------|-------------|
| `auth` | 8 | Login, register, Clerk webhook, token refresh |
| `workspaces` | 5 | CRUD, member management |
| `documents` | 5 | Upload, list, get, delete, chunks |
| `chats` | 7 | Create, list, messages, streaming |
| `search` | 2 | Semantic search, search with filters |
| `ai` | 6 | Classify, escalation check, suggested replies, knowledge gaps |
| `analytics` | 4 | Overview, usage, audit, platform |
| `billing` | 6 | Plans, subscription, checkout, portal, webhook |
| `api_keys` | 4 | Create, list, delete, rotate |
| `webhooks` | 6 | Events, subscriptions, management |
| `widget` | 5 | Public config, chat, script, management |
| `members` | 4 | List, invite, update, remove |
| `slack` | 3 | Slash commands, events, verify |
| `public_api` | 5 | Chat, search, documents (API key auth) |
| `health` | 1 | Health check |

---

## Project Structure

```
SupportPilot AI/
├── backend/
│   ├── app/
│   │   ├── ai/                  # AI provider abstraction (7 providers)
│   │   │   └── providers/       # OpenAI, Anthropic, Gemini, etc.
│   │   ├── api/v1/endpoints/    # 79 API endpoints (15 routers)
│   │   ├── core/                # Infrastructure layer
│   │   │   ├── cache.py         # Redis cache with fallback
│   │   │   ├── database.py      # SQLAlchemy async session
│   │   │   ├── event_bus.py     # Redis Streams event bus
│   │   │   ├── middleware.py    # Request middleware
│   │   │   ├── rate_limit.py    # Token bucket rate limiting
│   │   │   ├── rbac.py          # Role-based access control
│   │   │   ├── security.py      # JWT, password hashing, API keys
│   │   │   └── task_queue.py    # Background task processing
│   │   ├── models/              # 14 SQLAlchemy models
│   │   ├── repositories/        # Repository pattern (4 repos)
│   │   ├── schemas/             # Pydantic request/response schemas
│   │   ├── services/            # 12 business logic services
│   │   ├── utils/               # File handling, ID generation
│   │   ├── main.py              # FastAPI application
│   │   └── worker.py            # Background worker
│   ├── monitoring/              # Prometheus + Grafana configs
│   ├── scripts/
│   │   ├── seed.py              # Basic seed data
│   │   └── demo_data.py         # Full demo dataset
│   ├── tests/                   # 97 automated tests
│   ├── Dockerfile               # Production container
│   ├── docker-compose.prod.yml  # Production orchestration
│   ├── railway.toml             # Railway deployment config
│   └── requirements.txt         # Python dependencies
├── frontend/
│   ├── app/                     # Next.js App Router (29 pages)
│   │   ├── (auth)/              # Sign in, sign up, onboarding
│   │   ├── (dashboard)/         # Dashboard, workspaces, chat, etc.
│   │   └── (admin)/             # Admin panel
│   ├── components/
│   │   ├── ui/                  # 27 Shadcn UI components
│   │   └── ...                  # Feature-specific components
│   ├── lib/                     # Utilities, API client, stores
│   ├── stores/                  # Zustand state stores
│   └── vercel.json              # Vercel deployment config
├── docs/
│   ├── ARCHITECTURE.md          # System architecture diagram
│   ├── ERD.md                   # Database entity-relationship diagram
│   ├── API_DESIGN.md            # API design decisions
│   ├── CASE_STUDY.md           # Technical case study
│   ├── RESUME.md                # Resume bullet points
│   ├── LINKEDIN_POST.md         # LinkedIn post draft
│   └── DEPLOYMENT.md            # Deployment guide
├── .github/workflows/ci.yml     # CI/CD pipeline
├── docker-compose.yml           # Development orchestration
├── railway.toml                 # Railway root config
└── SECURITY_FINDINGS_REPORT.md  # Security audit report
```

---

## Security

This project follows security best practices and has been audited:

- **JWT authentication** with HS256 signing (no default secret key)
- **Role-based access control** enforced on all workspace-scoped endpoints
- **Tenant isolation** — users can only access workspaces they belong to
- **Rate limiting** — token bucket algorithm with Redis, tier-based limits
- **SSRF protection** — website crawler validates URLs against private IP ranges
- **Input validation** — Pydantic schemas on all request/response models
- **SQL injection protection** — SQLAlchemy ORM with parameterized queries only
- **XSS protection** — React's built-in escaping + Content Security Policy
- **Secure secrets** — no hardcoded keys; all secrets via environment variables
- **Non-root Docker user** — container runs as unprivileged user

See [SECURITY_FINDINGS_REPORT.md](SECURITY_FINDINGS_REPORT.md) for the full audit.

---

## Deployment

### Production Architecture

| Service | Platform | Details |
|---------|----------|---------|
| Frontend | Vercel | Next.js 15, auto-deploy from main |
| Backend | Railway | FastAPI, Docker container |
| Database | Supabase | PostgreSQL + pgvector |
| Redis | Upstash Redis | Cache + rate limiting + event bus |
| Storage | Supabase Storage | File uploads with per-workspace isolation |
| Monitoring | Sentry + Grafana | Error tracking + metrics dashboards |

### Environment Variables

Required for production:

```bash
# Application
APP_ENV=production
SECRET_KEY=<generate: openssl rand -hex 32>

# Database (Supabase)
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/supportpilot

# Redis (Upstash)
REDIS_URL=redis://user:pass@host:6379

# AI Provider
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx

# Auth (Clerk)
CLERK_SECRET_KEY=sk_xxx
CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_JWKS_URL=https://xxx.clerk.accounts.dev/.well-known/jwks.json

# Payments (Stripe)
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Monitoring
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

---

## Testing

```bash
# Backend tests (97 tests)
cd backend && python -m pytest tests/ -v

# Frontend type check
cd frontend && npx tsc --noEmit

# Frontend lint
cd frontend && npx next lint

# Docker build test
docker compose -f docker-compose.prod.yml build
```

---

## Resume Bullet

> Built SupportPilot AI, a multi-tenant customer-support SaaS with RAG-powered knowledge retrieval, embeddable AI chat widgets, RBAC, Stripe billing, event-driven architecture, and 7 LLM provider integrations. FastAPI backend (79 API endpoints, 97 tests) + Next.js frontend (29 pages, 27 UI components) deployed on Railway + Vercel with CI/CD pipeline.

---

## License

MIT
