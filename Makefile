.PHONY: dev up down api web fmt lint test test-backend test-frontend test-coverage test-watch test-ui

up:
	docker compose up -d

down:
	docker compose down

web:
	cd web && pnpm dev

api:
	cd backend && uv run python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

api-prod:
	cd backend && uv run python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --workers 2

fmt:
	cd backend && ruff check --fix . && black . && mypy .
	cd web && pnpm exec eslint . --fix

# Test Commands
test:
	@echo "🧪 Running all tests..."
	$(MAKE) test-backend
	$(MAKE) test-frontend

test-simple:
	@echo "🧪 Running all tests (no coverage)..."
	$(MAKE) test-backend-simple
	$(MAKE) test-frontend

test-backend:
	@echo "🐍 Running backend tests..."
	cd backend && uv run pytest -v

test-backend-simple:
	@echo "🐍 Running backend tests (no coverage)..."
	cd backend && uv run pytest -v --no-cov

test-frontend:
	@echo "⚛️  Running frontend tests..."
	cd web && pnpm test:run

test-coverage:
	@echo "📊 Running tests with coverage..."
	@echo "🐍 Backend coverage..."
	cd backend && uv run pytest --cov=app --cov-report=term-missing --cov-report=html:htmlcov
	@echo "⚛️  Frontend coverage..."
	cd web && pnpm test:coverage

test-watch:
	@echo "👀 Running tests in watch mode (choose backend or frontend)..."
	@echo "Run: make test-watch-backend OR make test-watch-frontend"

test-watch-backend:
	@echo "👀 Watching backend tests..."
	cd backend && uv run pytest -f

test-watch-frontend:
	@echo "👀 Watching frontend tests..."
	cd web && pnpm test

test-ui:
	@echo "🖥️  Opening test UI..."
	cd web && pnpm test:ui

# Specific test targets
test-auth:
	@echo "🔐 Running auth tests..."
	cd backend && uv run pytest tests/unit/test_auth/ -v

test-categories:
	@echo "📂 Running categories tests..."
	cd backend && uv run pytest tests/unit/test_categories/ -v

test-products:
	@echo "📦 Running products tests..."
	cd backend && uv run pytest tests/unit/test_products/ -v

test-components:
	@echo "🧩 Running component tests..."
	cd web && pnpm test components

# Test setup and development
test-setup:
	@echo "🔧 Setting up test environment..."
	cd backend && uv sync
	cd web && pnpm install
	@echo "✅ Test environment ready!"
	@echo "Run 'make test' to run all tests"

test-clean:
	@echo "🧹 Cleaning test artifacts..."
	cd backend && rm -rf htmlcov/ .pytest_cache/ .coverage
	cd web && rm -rf coverage/ node_modules/.vitest/

# Quick development commands
dev-test:
	@echo "🚀 Starting development with tests..."
	@echo "Backend tests: make test-watch-backend"
	@echo "Frontend tests: make test-watch-frontend"
	@echo "Test UI: make test-ui"
