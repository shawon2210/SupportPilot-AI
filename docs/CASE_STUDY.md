# Building SupportPilot AI: Designing a Multi-Tenant RAG SaaS from Scratch

## Problem Statement

Customer support is expensive. A single support agent costs $40K–$60K/year, and most of their time is spent answering the same questions repeatedly. AI can help, but existing solutions either require technical expertise to set up or lock you into a single vendor.

SupportPilot AI solves this: upload your documentation, FAQs, and website content, and get an AI support agent trained on your data — deployable in minutes via an embeddable chat widget.

## Architecture Decisions

### Multi-Tenant from Day One

The most critical decision was building multi-tenancy into the foundation, not bolting it on later. Every query in the system includes a `workspace_id` filter. This isn't enforced at the application layer — it's enforced at the repository layer, making it impossible to accidentally leak data between tenants.

```
Repository Pattern:
  BaseRepository → generic CRUD
  TenantRepository → all queries include workspace_id filter
  Services → call repositories, never write raw SQL
```

This means a developer can't accidentally write `SELECT * FROM documents` — the repository doesn't expose that method. They can only write `list_by_workspace(workspace_id)`.

### AI Provider Abstraction

LLM vendors change rapidly. OpenAI's pricing shifts, Anthropic releases new models, open-source alternatives emerge. The factory pattern means swapping providers requires changing one environment variable:

```python
# .env
AI_PROVIDER=anthropic  # Was "openai"
```

Zero business logic depends on any specific vendor. The `AIProvider` abstract base class defines the interface, and 7 providers implement it.

### Event-Driven Architecture

Instead of services calling each other directly:

```
Document Upload → Process Embeddings → Update Analytics → Send Notification
```

Events flow through a central bus:

```
DocumentUploaded event → Embeddings consumer
                       → Analytics consumer  
                       → Notification consumer
```

This enables loose coupling — the document service doesn't know or care about analytics. New consumers can be added without modifying existing code.

### Outbox Pattern for Reliable Webhooks

Webhooks are notoriously unreliable. The recipient might be down, the network might fail, or the payload might be too large. The Outbox Pattern guarantees at-least-once delivery:

1. When an event occurs, write to the outbox table in the **same database transaction** as the business logic
2. A background processor polls the outbox and delivers pending webhooks
3. Failed deliveries are retried with exponential backoff
4. Successfully delivered webhooks are marked as sent

If the transaction rolls back, the outbox entry is also rolled back — no phantom webhooks. If the webhook service is down, the outbox persists and retries later.

## RAG Pipeline Design

The RAG (Retrieval-Augmented Generation) pipeline has 6 stages:

1. **Upload** — File validation (MIME type, extension, size), safe filename generation, storage
2. **Extract** — Text extraction using format-specific extractors (PDF, DOCX, TXT, Markdown)
3. **Chunk** — Overlapping chunks (1000 tokens, 200 overlap) with metadata preservation
4. **Embed** — Batch embedding generation with retry logic and rate limiting
5. **Store** — Vector storage abstracted for SQLite (dev) and pgvector (prod)
6. **Retrieve** — Cosine similarity search with top-k results and source citations

The key insight: the system degrades gracefully. If embeddings fail, the document is still searchable by text. If the vector store is unavailable, the system falls back to brute-force similarity.

## Lessons Learned

### 1. Tenant Isolation Can't Be Optional

The audit found 3 queries missing `workspace_id` filters — in the worker, the chat service, and the public API. All were defense-in-depth issues (the outer layer already enforced isolation), but in security, defense-in-depth isn't optional. The fix was adding workspace_id filters at every layer.

### 2. Test Infrastructure Matters

The pytest-asyncio event loop fixture conflict caused 1 test error that looked like a code bug but was actually a test infrastructure issue. Fixing the fixture configuration (removing the custom `event_loop` fixture) resolved it cleanly.

### 3. Feature Flags Prevent Feature Creep

Without feature flags, every feature is available to every workspace. This sounds good until a free user accidentally triggers an expensive AI operation. Feature flags enforce plan boundaries at the code level, not just the UI level.

### 4. The Outbox Pattern is Worth the Complexity

Naive webhook delivery (send and forget) loses events during failures. The Outbox Pattern adds complexity (separate table, background processor, retry logic) but guarantees delivery. For a billing-critical system like Stripe webhooks, this is non-negotiable.

## Future Improvements

- **Celery/Dramatiq** — Replace the in-memory task queue with a proper distributed task broker
- **Event Sourcing** — Store all events as the source of truth, enabling temporal queries and audit trails
- **Multi-model RAG** — Use different embedding models for different document types
- **A/B Testing** — Framework for testing different prompts and models per workspace
- **Kubernetes Helm Chart** — Production-grade deployment with auto-scaling

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Python 3.12+, SQLAlchemy, Pydantic |
| Database | PostgreSQL + pgvector (prod), SQLite (dev) |
| Cache/Queue | Redis (caching, rate limiting, Streams) |
| AI | 7-provider abstraction (OpenAI, Anthropic, Gemini, etc.) |
| Auth | Clerk (JWT) |
| Billing | Stripe |
| Monitoring | Prometheus, Grafana, Sentry |
| CI/CD | GitHub Actions |
| Deployment | Docker Compose, Railway |

## Source Code

[https://github.com/yourusername/supportpilot-ai](https://github.com/yourusername/supportpilot-ai)
