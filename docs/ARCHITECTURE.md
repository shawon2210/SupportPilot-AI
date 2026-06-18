# SupportPilot AI — System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────────┐  │
│  │  Next.js 15   │  │  Embeddable  │  │  React/Vue/WordPress     │  │
│  │  Dashboard    │  │  Chat Widget │  │  Widget Integration      │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┬─────────────┘  │
│         │                  │                        │                │
│         └──────────────────┼────────────────────────┘                │
│                            │ HTTPS / WSS                            │
├────────────────────────────┼────────────────────────────────────────┤
│                     API GATEWAY LAYER                                │
│  ┌─────────────────────────┴─────────────────────────────────────┐  │
│  │                    FastAPI Application                         │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐  │  │
│  │  │  Auth     │ │  Rate    │ │  CORS    │ │  Request         │  │  │
│  │  │  Middleware│ │  Limiter │ │  Handler │ │  Validation      │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────┤
│                      SERVICE LAYER                                    │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────────┐   │
│  │  Workspace │ │  Document  │ │  Chat      │ │  Widget         │   │
│  │  Service   │ │  Service   │ │  Service   │ │  Service        │   │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────────┘   │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌─────────────────┐   │
│  │  Billing   │ │  Analytics │ │  AI        │ │  File           │   │
│  │  Service   │ │  Service   │ │  Service   │ │  Service        │   │
│  └────────────┘ └────────────┘ └────────────┘ └─────────────────┘   │
├──────────────────────────────────────────────────────────────────────┤
│                    AI PROVIDER ABSTRACTION                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ OpenAI   │ │ Anthropic│ │  Gemini  │ │ DeepSeek │ │ FreeKey  │  │
│  │ Provider │ │ Provider │ │ Provider │ │ Provider │ │ Provider │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐                                           │
│  │ OpenRouter│ │  Kimi    │                                           │
│  │ Provider │ │ Provider │                                           │
│  └──────────┘ └──────────┘                                           │
├──────────────────────────────────────────────────────────────────────┤
│                      DATA LAYER                                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────────┐  │
│  │  PostgreSQL  │ │   pgvector   │ │  Redis (Cache/Rate Limit)    │  │
│  │  (Primary DB)│ │  (Vectors)   │ │                              │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────────┘  │
│  ┌──────────────┐ ┌──────────────┐                                   │
│  │  Supabase    │ │  S3/MinIO    │                                   │
│  │  Storage     │ │  (Files)     │                                   │
│  └──────────────┘ └──────────────┘                                   │
├──────────────────────────────────────────────────────────────────────┤
│                   EXTERNAL SERVICES                                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Clerk   │ │  Stripe  │ │  PostHog │ │  Sentry  │ │  Resend  │  │
│  │  (Auth)  │ │(Payments)│ │(Analytics)│ │(Monitoring)│ │ (Email) │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Multi-Tenant Architecture

Every resource is scoped to a workspace. The tenant resolution flow:

```
Request → JWT Decode → Extract workspace_id → Apply Tenant Filter → Query DB
```

Tenant isolation is enforced at:
1. **Middleware level**: Extracts workspace_id from JWT, sets it in request state
2. **Service level**: Every service method requires workspace_id parameter
3. **Repository level**: All queries include WHERE workspace_id = :workspace_id
4. **Database level**: Row-level security policies in production PostgreSQL

## Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| Repository | Data layer | Abstracts DB operations, swappable backends |
| Service | Business logic | Encapsulates business rules, testable |
| Provider/Strategy | AI layer | Swap AI vendors via env vars |
| Dependency Injection | FastAPI endpoints | Testability, loose coupling |
| Factory | Provider creation | Single point of provider instantiation |
| Observer/Events | Analytics, audit | Decouple side effects from core logic |
| Background Tasks | File processing | Non-blocking document ingestion |

## API Versioning

All APIs are versioned: `/api/v1/...`

## Security Layers

1. **Clerk JWT** — Authentication via Clerk middleware
2. **Workspace RBAC** — Role checks on every workspace-scoped endpoint
3. **Rate Limiting** — Per-workspace and per-user rate limits via SlowAPI
4. **Input Validation** — Pydantic schemas on every endpoint
5. **File Validation** — MIME type + extension + size checks
6. **CORS** — Strict origin whitelist
7. **SQL Injection** — SQLAlchemy ORM + parameterized queries only

## RAG Pipeline

```
Document Upload
    │
    ▼
File Extraction (PDF/DOCX/TXT/MD)
    │
    ▼
Text Chunking (RecursiveCharacterTextSplitter, 1000 chars, 200 overlap)
    │
    ▼
Embedding Generation (Provider-configurable: text-embedding-3-small, etc.)
    │
    ▼
Vector Storage (pgvector, IVFFlat index)
    │
    ▼
Semantic Search (cosine similarity, top-k retrieval)
    │
    ▼
Context Augmentation (inject retrieved chunks into prompt)
    │
    ▼
LLM Generation (streaming response)
    │
    ▼
Source Citation (return chunk metadata with response)
```

## Deployment Architecture

```
GitHub Push → GitHub Actions → Run Tests → Build Docker Image
    → Push to GHCR → Deploy to Railway (Backend) + Vercel (Frontend)
```
