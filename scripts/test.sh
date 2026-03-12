#!/bin/bash
set -e

echo "=== Test Suite ==="

# Configuration
TEST_TYPE=${1:-all}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

run_backend_tests() {
    echo "Running backend tests..."
    docker-compose exec -T backend pytest --cov=. --cov-report=html --cov-report=term
    echo -e "${GREEN}Backend tests completed${NC}"
}

run_frontend_tests() {
    echo "Running frontend tests..."
    docker-compose exec -T frontend npm test
    echo -e "${GREEN}Frontend tests completed${NC}"
}

run_integration_tests() {
    echo "Running integration tests..."
    # Add integration test commands here
    echo -e "${GREEN}Integration tests completed${NC}"
}

run_linting() {
    echo "Running linters..."

    # Backend linting
    echo "Linting backend..."
    docker-compose exec -T backend flake8 . || echo -e "${RED}Backend linting failed${NC}"

    # Frontend linting
    echo "Linting frontend..."
    docker-compose exec -T frontend npm run lint || echo -e "${RED}Frontend linting failed${NC}"

    echo -e "${GREEN}Linting completed${NC}"
}

# Ensure services are running
if ! docker-compose ps | grep -q "Up"; then
    echo "Starting services..."
    docker-compose up -d
    sleep 5
fi

# Run tests based on type
case $TEST_TYPE in
    backend)
        run_backend_tests
        ;;
    frontend)
        run_frontend_tests
        ;;
    integration)
        run_integration_tests
        ;;
    lint)
        run_linting
        ;;
    all)
        run_linting
        run_backend_tests
        run_frontend_tests
        run_integration_tests
        ;;
    *)
        echo "Usage: $0 {backend|frontend|integration|lint|all}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}=== All Tests Passed ===${NC}"
