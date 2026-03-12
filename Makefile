.PHONY: help setup dev build start stop restart logs clean test backup deploy

help:
	@echo "Unified Sign-In Platform - Available Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup          - Initial project setup"
	@echo "  make build          - Build Docker containers"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start development environment"
	@echo "  make start          - Start all services"
	@echo "  make stop           - Stop all services"
	@echo "  make restart        - Restart all services"
	@echo "  make logs           - View logs (all services)"
	@echo "  make logs-backend   - View backend logs"
	@echo "  make logs-frontend  - View frontend logs"
	@echo ""
	@echo "Database:"
	@echo "  make db-shell       - Access PostgreSQL shell"
	@echo "  make db-migrate     - Run database migrations"
	@echo "  make redis-shell    - Access Redis CLI"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run all tests"
	@echo "  make test-backend   - Run backend tests"
	@echo "  make test-frontend  - Run frontend tests"
	@echo "  make lint           - Run linters"
	@echo ""
	@echo "Maintenance:"
	@echo "  make backup         - Create backup"
	@echo "  make clean          - Remove containers and volumes"
	@echo "  make deploy         - Deploy to production"
	@echo ""

setup:
	@bash scripts/setup.sh

build:
	docker-compose build

dev: start

start:
	docker-compose up -d
	@echo "Services started. Access at http://localhost"

stop:
	docker-compose down

restart: stop start

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

db-shell:
	docker-compose exec postgres psql -U signin -d unified_signin

db-migrate:
	docker-compose exec backend alembic upgrade head

redis-shell:
	docker-compose exec redis redis-cli

test:
	@bash scripts/test.sh all

test-backend:
	@bash scripts/test.sh backend

test-frontend:
	@bash scripts/test.sh frontend

lint:
	@bash scripts/test.sh lint

backup:
	@bash scripts/backup.sh

clean:
	docker-compose down -v
	docker system prune -f

deploy:
	@bash scripts/deploy.sh production
