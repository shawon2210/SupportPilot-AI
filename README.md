# SupportPilot AI

## Project Structure

```
SupportPilot AI/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── ai/              # AI provider abstraction (7 providers)
│   │   ├── api/v1/          # API routes (79 endpoints)
│   │   ├── core/            # Infrastructure (cache, events, metrics, etc.)
│   │   ├── models/          # SQLAlchemy models (14 tables)
│   │   ├── repositories/    # Repository pattern
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── services/        # Business logic (12 services)
│   │   ├── utils/           # Helpers
│   │   ├── main.py          # FastAPI application
│   │   └── worker.py        # Background worker
│   ├── monitoring/          # Prometheus + Grafana configs
│   ├── tests/               # 97 automated tests
│   ├── Dockerfile
│   ├── docker-compose.prod.yml
│   └── requirements.txt
├── docs/
│   ├── RESUME.md            # Resume bullet points
│   └── CASE_STUDY.md        # Technical case study
├── .github/workflows/       # CI/CD pipeline
└── README.md                # Project documentation
```

## Quick Start

See [backend/README.md](backend/README.md) for detailed setup instructions.

```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload

# Tests
python -m pytest tests/ -v

# Docker (production)
docker compose -f docker-compose.prod.yml up -d
```

## API Documentation

When running in development mode, interactive API docs are available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## License

MIT
