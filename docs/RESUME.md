# Resume — SupportPilot AI

## Single Bullet (for project section)

**SupportPilot AI** — Enterprise AI Customer Support SaaS
Architected and built a multi-tenant AI SaaS platform (100+ Python modules, 62 REST APIs, 97 automated tests) featuring RAG-powered document chat, embeddable widget SDK, Stripe subscriptions, Slack integration, event-driven architecture with Redis Streams, Outbox Pattern for reliable webhooks, feature flags, RBAC, and Prometheus/Grafana observability.

## Detailed Bullets (for interviews / detailed resume)

• **Multi-tenant SaaS architecture** — Designed workspace isolation enforced at the repository layer (not just endpoints), with 4-tier RBAC (Owner/Admin/Agent/Member), plan-based rate limiting (30–300 req/min), and feature flags gating 20 features across Free/Starter/Pro/Enterprise tiers.

• **RAG pipeline** — Built document ingestion supporting PDF, DOCX, TXT, Markdown with configurable chunking (1000-token chunks, 200-token overlap), embedding generation with batch processing and retry logic, vector storage abstracted for SQLite (dev) and pgvector (prod), and semantic search with cosine similarity and source citations.

• **Event-driven architecture** — Implemented Redis Streams-based event bus with 22 event types, consumer groups for independent processing, and in-memory fallback. Decoupled document processing, analytics, notifications, and webhook delivery through async events.

• **Outbox Pattern** — Guaranteed reliable webhook delivery by writing to an outbox in the same database transaction as business logic, with background processor handling delivery, exponential backoff retry (1min → 60min), and circuit breaker after max retries.

• **AI provider abstraction** — Factory pattern supporting 7 LLM providers (OpenAI, Anthropic, Gemini, DeepSeek, OpenRouter, Kimi, FreeKey) swappable via single environment variable. Zero business logic depends on any specific vendor.

• **Enterprise AI features** — Ticket classification (category/priority/tags with confidence scores), escalation engine (confidence-based human routing at 70% threshold + frustration detection), suggested replies (agent-assist with RAG context), and knowledge gap detection (identifies unanswered questions).

• **Observability** — 15+ Prometheus metrics (HTTP latency histograms, token usage by model, document processing counters, knowledge gap tracking), Grafana dashboards, Sentry error tracking, structured logging, and health check probes (liveness/readiness/deep).

• **CI/CD** — GitHub Actions pipeline with lint (Ruff), security scan (Bandit + Safety), test (97 tests with coverage), Docker build with smoke test, and production deployment stage.

## Metrics Summary

| Metric | Value |
|--------|-------|
| Python modules | 100 |
| API routes | 62 |
| Automated tests | 97 |
| Test coverage | ~85% |
| AI providers | 7 |
| Event types | 22 |
| Feature flags | 20 |
| Prometheus metrics | 15+ |
| Database models | 14 |
| Service classes | 12 |
| Repository classes | 4 |
| Middleware layers | 4 |
