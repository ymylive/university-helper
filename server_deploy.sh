#!/bin/bash
set -euo pipefail

PROJECT_DIR="${EASY_LEARNING_PROJECT_DIR:-/opt/easy_learning}"
COMPOSE_FILE="${EASY_LEARNING_COMPOSE_FILE:-docker-compose.server.yml}"
DB_PASSWORD="${EASY_LEARNING_POSTGRES_PASSWORD:-change-this-db-password}"
SECRET_KEY="${EASY_LEARNING_SECRET_KEY:-$(openssl rand -hex 32)}"
SHUAKE_COMPAT_SECRET="${EASY_LEARNING_SHUAKE_COMPAT_SECRET:-}"
CORS_ORIGINS="${EASY_LEARNING_CORS_ORIGINS:-[\"http://localhost:3000\",\"http://localhost:5173\"]}"

cd "$PROJECT_DIR"

cat > .env <<EOF
POSTGRES_PASSWORD=${DB_PASSWORD}
SECRET_KEY=${SECRET_KEY}
SHUAKE_COMPAT_SECRET=${SHUAKE_COMPAT_SECRET}
CORS_ORIGINS=${CORS_ORIGINS}
EOF

docker compose -f "$COMPOSE_FILE" down || true
docker compose -f "$COMPOSE_FILE" up -d --build
docker compose -f "$COMPOSE_FILE" ps
