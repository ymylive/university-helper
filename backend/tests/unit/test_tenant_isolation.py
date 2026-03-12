import pytest
from fastapi import HTTPException, Request
from unittest.mock import Mock, AsyncMock, patch
from app.middleware.tenant_isolation import tenant_isolation_middleware


@pytest.fixture
def mock_request():
    request = Mock(spec=Request)
    request.url.path = "/api/v1/protected"
    request.headers = {}
    request.state = Mock()
    return request


@pytest.fixture
def mock_call_next():
    return AsyncMock(return_value=Mock())


@pytest.mark.asyncio
async def test_whitelisted_paths(mock_call_next):
    paths = ["/api/v1/auth/register", "/api/v1/auth/login", "/docs", "/openapi.json"]

    for path in paths:
        request = Mock(spec=Request)
        request.url.path = path
        result = await tenant_isolation_middleware(request, mock_call_next)
        assert result is not None


@pytest.mark.asyncio
async def test_missing_authorization_header(mock_request, mock_call_next):
    with pytest.raises(HTTPException) as exc_info:
        await tenant_isolation_middleware(mock_request, mock_call_next)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Missing token"


@pytest.mark.asyncio
async def test_malformed_token(mock_request, mock_call_next):
    mock_request.headers = {"Authorization": "Bearer malformed_token"}

    with patch("app.middleware.tenant_isolation.decode_token", side_effect=Exception("Invalid token")):
        with pytest.raises(HTTPException) as exc_info:
            await tenant_isolation_middleware(mock_request, mock_call_next)

        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_expired_token(mock_request, mock_call_next):
    mock_request.headers = {"Authorization": "Bearer expired_token"}

    with patch("app.middleware.tenant_isolation.decode_token", side_effect=Exception("Token expired")):
        with pytest.raises(HTTPException) as exc_info:
            await tenant_isolation_middleware(mock_request, mock_call_next)

        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_missing_tenant_db_name(mock_request, mock_call_next):
    mock_request.headers = {"Authorization": "Bearer valid_token"}

    with patch("app.middleware.tenant_isolation.decode_token", return_value={"user_id": 1}):
        with pytest.raises(HTTPException) as exc_info:
            await tenant_isolation_middleware(mock_request, mock_call_next)

        assert exc_info.value.status_code == 401
        assert "Invalid token payload" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_missing_user_id(mock_request, mock_call_next):
    mock_request.headers = {"Authorization": "Bearer valid_token"}

    with patch("app.middleware.tenant_isolation.decode_token", return_value={"tenant_db_name": "tenant_test"}):
        with pytest.raises(HTTPException) as exc_info:
            await tenant_isolation_middleware(mock_request, mock_call_next)

        assert exc_info.value.status_code == 401
        assert "Invalid token payload" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_valid_token(mock_request, mock_call_next):
    mock_request.headers = {"Authorization": "Bearer valid_token"}

    with patch("app.middleware.tenant_isolation.decode_token", return_value={"user_id": 1, "tenant_db_name": "tenant_test"}):
        result = await tenant_isolation_middleware(mock_request, mock_call_next)

        assert mock_request.state.user_id == 1
        assert mock_request.state.tenant_db_name == "tenant_test"
        assert result is not None
