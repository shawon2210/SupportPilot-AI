# SupportPilot AI — Complete Folder Structure

```
supportpilot-ai/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + test on PR
│       └── deploy.yml                # Build + deploy on merge to main
│
├── docs/
│   ├── ARCHITECTURE.md               # System architecture document
│   ├── ERD.md                        # Entity relationship diagram
│   ├── API_DESIGN.md                 # API endpoint specifications
│   └── plans/                        # Implementation plans
│       └── 2026-06-17-phase1.md
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                   # FastAPI application entry
│   │   ├── config.py                 # Settings via pydantic-settings
│   │   ├── dependencies.py           # Common DI dependencies
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── database.py           # DB engine, session, Base
│   │   │   ├── security.py           # JWT, password hashing
│   │   │   ├── exceptions.py         # Custom exceptions
│   │   │   └── middleware.py          # Tenant, logging middleware
│   │   │
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # SQLAlchemy Base with common columns
│   │   │   ├── user.py
│   │   │   ├── workspace.py
│   │   │   ├── member.py
│   │   │   ├── knowledge_source.py
│   │   │   ├── document_chunk.py
│   │   │   ├── chat.py
│   │   │   ├── message.py
│   │   │   ├── widget_config.py
│   │   │   ├── api_key.py
│   │   │   ├── usage_metric.py
│   │   │   ├── audit_log.py
│   │   │   └── subscription.py
│   │   │
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Base response schemas
│   │   │   ├── user.py
│   │   │   ├── workspace.py
│   │   │   ├── member.py
│   │   │   ├── knowledge_source.py
│   │   │   ├── chat.py
│   │   │   ├── message.py
│   │   │   └── widget.py
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py       # API router aggregation
│   │   │   │   ├── router.py         # Main v1 router
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── __init__.py
│   │   │   │   │   ├── health.py
│   │   │   │   │   ├── auth.py
│   │   │   │   │   ├── workspaces.py
│   │   │   │   │   ├── members.py
│   │   │   │   │   ├── documents.py
│   │   │   │   │   ├── chats.py
│   │   │   │   │   ├── widget.py
│   │   │   │   │   └── api_keys.py
│   │   │   │   └── deps.py           # Auth deps, workspace context
│   │   │   └── deps.py               # Global API dependencies
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Base service with common CRUD
│   │   │   ├── workspace_service.py
│   │   │   ├── member_service.py
│   │   │   ├── document_service.py
│   │   │   ├── chat_service.py
│   │   │   ├── widget_service.py
│   │   │   ├── api_key_service.py
│   │   │   └── audit_service.py
│   │   │
│   │   ├── repositories/
│   │   │   ├── __init__.py
│   │   │   ├── base.py               # Base repository with tenant filtering
│   │   │   ├── workspace_repo.py
│   │   │   ├── member_repo.py
│   │   │   └── document_repo.py
│   │   │
│   │   ├── ai/
│   │   │   ├── __init__.py
│   │   │   ├── providers/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py           # Abstract AIProvider interface
│   │   │   │   ├── openai_provider.py
│   │   │   │   ├── anthropic_provider.py
│   │   │   │   ├── gemini_provider.py
│   │   │   │   ├── deepseek_provider.py
│   │   │   │   ├── openrouter_provider.py
│   │   │   │   ├── kimi_provider.py
│   │   │   │   └── freekey_provider.py
│   │   │   ├── factory.py            # Provider factory
│   │   │   ├── embeddings.py         # Embedding abstraction
│   │   │   ├── rag.py                # RAG pipeline
│   │   │   └── chat_completion.py    # Chat with context
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── id.py                 # UUID generation
│   │       ├── slug.py               # URL-safe slug generation
│   │       ├── pagination.py         # Cursor-based pagination
│   │       └── files.py              # File validation utilities
│   │
│   ├── db/
│   │   ├── schema.sql                # Full database schema
│   │   └── migrations/               # Alembic migrations
│   │       ├── alembic.ini
│   │       └── versions/
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py               # Test fixtures
│   │   ├── test_config.py
│   │   ├── test_health.py
│   │   ├── test_auth.py
│   │   ├── test_workspaces.py
│   │   ├── test_members.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── test_workspace_service.py
│   │   │   └── test_member_service.py
│   │   └── ai/
│   │       ├── __init__.py
│   │       └── test_provider_factory.py
│   │
│   ├── scripts/
│   │   ├── seed.py                   # Database seeding
│   │   └── create_tables.py          # Create tables from schema
│   │
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── (auth)/
│   │   │   │   ├── sign-in/
│   │   │   │   └── sign-up/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   ├── workspace/
│   │   │   │   ├── knowledge/
│   │   │   │   ├── chats/
│   │   │   │   ├── widget/
│   │   │   │   ├── team/
│   │   │   │   ├── billing/
│   │   │   │   └── settings/
│   │   │   └── api/                  # Next.js API routes for proxy
│   │   ├── components/
│   │   │   ├── ui/                   # Shadcn UI components
│   │   │   ├── layout/
│   │   │   ├── dashboard/
│   │   │   ├── chat/
│   │   │   └── widget/
│   │   ├── lib/
│   │   │   ├── api.ts                # API client
│   │   │   ├── auth.ts               # Auth utilities
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   ├── stores/
│   │   └── types/
│   ├── public/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── .env.example
│
├── widget/
│   ├── src/
│   │   ├── index.ts                  # Widget entry point
│   │   ├── component.tsx             # React widget component
│   │   ├── loader.ts                 # Script loader
│   │   └── styles.css
│   ├── dist/
│   │   └── widget.js                 # Bundled widget script
│   ├── package.json
│   ├── tsconfig.json
│   └── rollup.config.js
│
├── docker-compose.yml                # Local development
├── docker-compose.prod.yml           # Production services
├── Makefile                          # Common commands
├── README.md
├── LICENSE
└── .gitignore
```
