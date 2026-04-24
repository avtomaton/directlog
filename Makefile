# =============================================================================
# DirectLog - Development & Deployment Commands
# =============================================================================
# Usage: make <target>
#
# Development:
#   make dev          — Start backend + frontend dev servers
#   make install      — Install all dependencies
#   make migrate      — Run database migrations
#   make seed         — Seed database with sample data
#
# Building:
#   make build        — Build frontend for production
#   make docker       — Build Docker image
#
# Testing:
#   make test         — Run all tests (backend + frontend)
#   make test-backend — Run backend tests only
#   make test-frontend— Run frontend tests only
#   make lint         — Run linters
#
# Deployment:
#   make deploy       — Deploy with docker compose
#   make down         — Stop all services
#   make logs         — Follow application logs
# =============================================================================

.PHONY: dev install build test lint migrate seed docker deploy down logs clean

# --- Development ---

install:
	cd frontend && npm ci
	cd backend && ./venv/bin/pip install -r requirements.txt

dev-backend:
	cd backend && ./venv/bin/python app.py

dev-frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting development servers..."
	@make dev-backend & make dev-frontend & wait

# --- Database ---

migrate:
	cd backend && ./venv/bin/alembic upgrade head

seed:
	cd backend && ./venv/bin/python ../scripts/seed_db.py

# --- Building ---

build:
	cd frontend && npm run build

docker:
	docker compose build

# --- Testing ---

test-backend:
	cd backend && ./venv/bin/python -m pytest tests/ -v

test-frontend:
	cd frontend && npx vitest run

test: test-backend test-frontend

# --- Linting ---

lint-backend:
	cd backend && ./venv/bin/python -m flake8 app.py auth.py models/ --max-line-length=120 || true

lint-frontend:
	cd frontend && npx tsc --noEmit

lint: lint-backend lint-frontend

# --- Deployment ---

deploy: build
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f app

# --- Cleanup ---

clean:
	rm -rf frontend/dist frontend/dist-single
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
