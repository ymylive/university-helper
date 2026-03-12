import pytest
import jwt
from datetime import datetime, timedelta
from app.core.security import hash_password, verify_password, create_access_token, decode_token
from app.config import settings


def test_hash_password():
    password = "test123"
    hashed = hash_password(password)
    assert hashed != password
    assert len(hashed) > 0


def test_verify_password_valid():
    password = "test123"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_password_invalid():
    password = "test123"
    hashed = hash_password(password)
    assert verify_password("wrong", hashed) is False


def test_create_access_token():
    data = {"user_id": 1, "tenant_db_name": "tenant_test"}
    token = create_access_token(data)
    assert isinstance(token, str)
    assert len(token) > 0


def test_decode_token_valid():
    data = {"user_id": 1, "tenant_db_name": "tenant_test"}
    token = create_access_token(data)
    decoded = decode_token(token)
    assert decoded["user_id"] == 1
    assert decoded["tenant_db_name"] == "tenant_test"
    assert "exp" in decoded


def test_decode_token_expired():
    data = {"user_id": 1, "exp": datetime.utcnow() - timedelta(minutes=1)}
    token = jwt.encode(data, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(token)


def test_decode_token_invalid():
    with pytest.raises(jwt.InvalidTokenError):
        decode_token("invalid_token")
