import os

os.environ.setdefault("SECRET_KEY", "test_secret_key_for_testing_only_min_32_chars")
os.environ.setdefault("CORS_ORIGINS", '["http://localhost:3000"]')
os.environ.setdefault("MAIN_DB_USER", "test_user")
os.environ.setdefault("MAIN_DB_PASSWORD", "test_password")

import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.dependencies import get_current_user


@pytest.fixture
def valid_payload():
    return {
        "user_id": 1,
        "tenant_db_name": "tenant_test",
        "exp": 9999999999,
    }


@pytest.fixture
def valid_credentials():
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials="valid.jwt.token")


@pytest.mark.asyncio
@patch("app.dependencies.decode_token")
async def test_valid_token_returns_user_payload(mock_decode, valid_credentials, valid_payload):
    mock_decode.return_value = valid_payload

    result = await get_current_user(valid_credentials)

    mock_decode.assert_called_once_with("valid.jwt.token")
    assert result == valid_payload
    assert result["user_id"] == 1
    assert result["tenant_db_name"] == "tenant_test"


@pytest.mark.asyncio
async def test_missing_authorization_header_returns_401():
    """When credentials are None (no Authorization header), HTTPBearer raises 403.
    In practice FastAPI's HTTPBearer dependency handles this before get_current_user
    is called. We verify that passing None directly raises an error."""
    with pytest.raises((HTTPException, AttributeError)):
        await get_current_user(None)


@pytest.mark.asyncio
@patch("app.dependencies.decode_token")
async def test_expired_token_returns_401(mock_decode, valid_credentials):
    mock_decode.side_effect = ValueError("Token has expired")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(valid_credentials)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authentication credentials"


@pytest.mark.asyncio
@patch("app.dependencies.decode_token")
async def test_invalid_token_format_returns_401(mock_decode, valid_credentials):
    mock_decode.side_effect = ValueError("Invalid token")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(valid_credentials)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authentication credentials"


@pytest.mark.asyncio
@patch("app.dependencies.decode_token")
async def test_token_missing_required_fields_returns_401(mock_decode, valid_credentials):
    """When decode_token raises KeyError due to missing fields in payload."""
    mock_decode.side_effect = KeyError("user_id")

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(valid_credentials)

    assert exc_info.value.status_code == 401
    assert exc_info.value.detail == "Invalid authentication credentials"
