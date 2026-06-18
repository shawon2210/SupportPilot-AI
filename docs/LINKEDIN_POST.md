# LinkedIn Post — SupportPilot AI

Over the past few weeks, I built **SupportPilot AI** — a multi-tenant AI customer support SaaS designed to help businesses create AI-powered support agents from their own knowledge base.

**Key features:**

• Retrieval-Augmented Generation (RAG) with document ingestion, semantic search, and source citations
• Multi-tenant architecture with workspace isolation enforced at the repository layer
• Role-based access control (Owner/Admin/Agent/Member) with plan-based feature gating
• Embeddable website chat widget deployable via single script tag
• Stripe subscription billing with 4 tiers (Free/Starter/Pro/Enterprise)
• Event-driven architecture using Redis Streams with consumer groups
• Outbox Pattern for reliable webhook delivery with at-least-once semantics
• AI provider abstraction supporting 7 LLM vendors (swappable via env var)
• Slack slash commands, public API with API key auth, knowledge gap detection
• Prometheus metrics, Grafana dashboards, Sentry error tracking
• 79 API endpoints, 97 automated tests, CI/CD pipeline

**Tech stack:**

FastAPI • Next.js • PostgreSQL • pgvector • Redis • LangChain • Stripe • Docker

**The most valuable part wasn't the features — it was learning how to design a production-oriented SaaS architecture.**

Things I spent real time thinking about:

• How to enforce tenant isolation so it's impossible to leak data between workspaces
• When to use an Outbox Pattern vs direct webhook calls
• How to abstract AI providers so the business logic never depends on a specific vendor
• How to structure an event-driven system where services don't call each other directly
• How to gate features by plan without scattering if/else checks everywhere

The codebase has 100 Python modules, 14 SQLAlchemy models, 12 service classes, and 4 repository classes — all following clean architecture principles.

Now working on deployment, documentation, and getting real users.

GitHub: https://github.com/shawon2210/SupportPilot-AI

#Python #FastAPI #NextJS #AI #RAG #SaaS #SoftwareEngineering #OpenToWork #SystemDesign
