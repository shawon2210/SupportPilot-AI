# Resume Positioning — SupportPilot AI

---

## Resume Bullet (Software Engineer / Full Stack / Backend)

> **SupportPilot AI** — Built a multi-tenant AI customer support SaaS platform with RAG-powered knowledge retrieval, embeddable chat widgets, RBAC, Stripe billing, and event-driven architecture. Designed and implemented 79 REST API endpoints using FastAPI + PostgreSQL + Redis, and a Next.js 15 frontend with 29 pages and 27 UI components. Deployed via CI/CD pipeline with automated testing (97 tests), monitoring (Sentry + Prometheus), and containerized infrastructure (Docker).

---

## Resume Bullet (shorter version)

> Built SupportPilot AI, a multi-tenant customer-support SaaS with RAG knowledge retrieval, Stripe billing, RBAC, and event-driven architecture using FastAPI, PostgreSQL, Redis, and Next.js. 79 API endpoints, 97 automated tests, CI/CD pipeline.

---

## Interview Talking Points

### 1. System Design
- Multi-tenant isolation enforced at service layer with repository pattern
- AI provider abstraction supporting 7 vendors via factory pattern
- Event bus with Redis Streams for decoupled service communication
- Outbox pattern for reliable webhook delivery

### 2. Security
- JWT authentication with HS256 and required secret key
- Role-based access control on all workspace endpoints
- Tenant isolation prevents cross-workspace data leakage
- SSRF protection on website crawler
- Rate limiting with token bucket algorithm

### 3. Architecture Decisions
- **Why async?** I/O-bound workloads (LLM queries, file processing, web crawling) benefit from async concurrency
- **Why repository pattern?** Decouples business logic from data access; enables easy testing and database switching
- **Why event-driven?** Services communicate via events instead of direct calls; enables loose coupling and horizontal scaling
- **Why pgvector?** Native PostgreSQL extension for vector similarity search; avoids separate vector DB infrastructure

### 4. Challenges Solved
- **LLM variability:** Abstracted providers behind a common interface; responses are validated via Pydantic schemas
- **Document processing pipeline:** Async extraction → chunking → embedding → vector storage with error handling at each stage
- **Widget cross-origin:** CORS configuration, API key auth, rate limiting for public endpoints
- **Rate limit failures:** Graceful fallback to in-memory counter when Redis unavailable

### 5. What I'd Do Differently
- Use proper Clerk JWKS validation from the start (not just the dev header fallback)
- Implement query result caching for repeated RAG searches
- Add database connection retry logic with exponential backoff
- Consider using Celery for heavier background processing workloads

---

## Relevant Job Titles

- Software Engineer (Full Stack)
- Backend Engineer
- AI/ML Engineer
- Platform Engineer
- SaaS Developer
- Software Engineer Intern
- Freelance AI Consultant

---

## Key Metrics to Mention

| Metric | Value |
|--------|-------|
| API Endpoints | 79 |
| Database Tables | 14 |
| Service Classes | 12 |
| UI Components | 27 |
| Frontend Pages | 29 |
| Automated Tests | 97 |
| LLM Providers | 7 |
| CI/CD Stages | 5 |
| Lines of Code (Backend) | ~8,000 |
| Lines of Code (Frontend) | ~5,300 |
