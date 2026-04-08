import pytest
import os
from unittest.mock import MagicMock, patch

# Set test environment variables before any imports
os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only_min_32_chars")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app.main import app
    return TestClient(app)


@pytest.fixture(autouse=True)
def reset_auth_rate_limiter():
    from app.middleware.rate_limiter import rate_limiter

    rate_limiter.reset()
    yield
    rate_limiter.reset()


@pytest.fixture
def test_user():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123"
    }


@pytest.fixture
def mock_db_session():
    """Mock database session for integration tests"""
    with patch('app.db.session.get_db_session') as mock:
        conn = MagicMock()
        cur = MagicMock()
        conn.cursor.return_value = cur
        conn.__enter__ = MagicMock(return_value=conn)
        conn.__exit__ = MagicMock(return_value=False)
        mock.return_value = conn
        yield cur


@pytest.fixture
def auth_headers(client, mock_db_session):
    """Generate authentication headers with valid token"""
    from app.core.security import create_access_token
    token = create_access_token({"user_id": 1, "tenant_db_name": "tenant_test"})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_chaoxing_client():
    """Mock Chaoxing client for course tests"""
    with patch('app.services.course.chaoxing.client.Chaoxing') as mock:
        instance = MagicMock()
        instance.login.return_value = {"status": True, "msg": "登录成功"}
        mock.return_value = instance
        yield instance


@pytest.fixture
def mock_redis():
    """Mock Redis client for caching tests"""
    with patch('redis.Redis') as mock:
        yield mock.return_value
