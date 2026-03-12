#!/bin/bash
set -e

echo "=== Unified Sign-In Platform Setup ==="

# Check prerequisites
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed. Aborting." >&2; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "Docker Compose is required but not installed. Aborting." >&2; exit 1; }

# Create .env if not exists
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "Please update .env with your configuration before proceeding."
    exit 0
fi

# Create necessary directories
echo "Creating directories..."
mkdir -p logs
mkdir -p backups

# Pull Docker images
echo "Pulling Docker images..."
docker-compose pull

# Build containers
echo "Building containers..."
docker-compose build

# Start database and redis first
echo "Starting database and redis..."
docker-compose up -d postgres redis

# Wait for database
echo "Waiting for database to be ready..."
sleep 5

# Run database migrations
echo "Running database migrations..."
docker-compose run --rm backend alembic upgrade head || echo "Migrations not configured yet"

# Start all services
echo "Starting all services..."
docker-compose up -d

echo ""
echo "=== Setup Complete ==="
echo "Services are running at:"
echo "  Frontend: http://localhost"
echo "  Backend API: http://localhost/api"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop services: docker-compose down"
