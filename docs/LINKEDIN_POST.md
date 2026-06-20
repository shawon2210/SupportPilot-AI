# LinkedIn Post — SupportPilot AI

---

I built a production-grade multi-tenant AI customer support SaaS from scratch.

**SupportPilot AI** lets businesses upload documents, crawl websites, and deploy an AI support agent trained on their own knowledge base in minutes.

**What makes it production-grade:**

• Multi-tenant architecture with workspace isolation enforced at the service layer
• RAG-powered knowledge retrieval with semantic search and source citations
• Embeddable chat widget deployable via single script tag
• Role-based access control (Owner/Admin/Agent/Member)
• Stripe subscription billing with 4 tiers
• Event-driven architecture using Redis Streams with outbox pattern
• AI provider abstraction supporting 7 LLM vendors (swappable via env var)
• Rate limiting, SSRF protection, JWT auth, input validation
• 79 API endpoints, 97 automated tests, CI/CD pipeline

**Tech stack:**
FastAPI • Next.js 15 • PostgreSQL + pgvector • Redis • LangChain • Stripe • Docker

**The most valuable part wasn't the features — it was learning how to design a system where:**

- Tenant isolation is enforced so it's impossible to leak data between workspaces
- AI providers are abstracted so business logic never depends on a specific vendor
- Events are processed asynchronously without direct service-to-service calls
- Features are gated by plan without scattering if/else checks everywhere

The codebase has 100+ Python modules, 14 SQLAlchemy models, 12 service classes, and 4 repository classes — all following clean architecture principles.

GitHub: https://github.com/shawon2210/SupportPilot-AI

Open to opportunities in Full Stack Development, Backend Engineering, and AI Engineering.

#Python #FastAPI #NextJS #AI #RAG #SaaS #SoftwareEngineering #OpenToWork #SystemDesign #MachineLearning

---

## Alternative Shorter Post (for LinkedIn feed)

Built SupportPilot AI — a multi-tenant AI customer support SaaS with RAG-powered knowledge retrieval, embeddable chat widgets, RBAC, Stripe billing, and event-driven architecture.

79 API endpoints. 97 tests. 7 LLM providers. Full CI/CD.

Stack: FastAPI + Next.js + PostgreSQL + Redis

GitHub: https://github.com/shawon2210/SupportPilot-AI

#Python #FastAPI #AI #SaaS #OpenToWork
