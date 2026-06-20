# SupportPilot AI — Makefile

.PHONY: help install dev test lint format migrate docker-build docker-up docker-down clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ── Backend ──────────────────────────────────────────────────────

install: ## Install backend dependencies
	cd backend && pip install -r requirements.txt

dev: ## Run development server
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

test: ## Run all tests
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=term-missing

test-watch: ## Run tests in watch mode
	cd backend && python -m pytest tests/ -v -f

lint: ## Run linter
	cd backend && ruff check app/ tests/

format: ## Format code
	cd backend && ruff format app/ tests/

typecheck: ## Run type checker
	cd backend && mypy app/

migrate: ## Run database migrations
	cd backend && alembic upgrade head

migrate-create: ## Create a new migration (usage: make migrate-create MESSAGE="add users table")
	cd backend && alembic revision --autogenerate -m "$(MESSAGE)"

seed: ## Seed the database with test data
	cd backend && python scripts/seed.py

# ── Docker ───────────────────────────────────────────────────────

docker-build: ## Build Docker images
	docker compose build

docker-up: ## Start all services
	docker compose up -d

docker-down: ## Stop all services
	docker compose down

docker-logs: ## View logs
	docker compose logs -f api

# ── Cleanup ──────────────────────────────────────────────────────

clean: ## Clean up generated files
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf backend/.pytest_cache backend/.mypy_cache backend/.ruff_cache
	rm -rf backend/data/test.db
