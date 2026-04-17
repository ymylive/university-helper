from typing import Optional

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.middleware.rate_limiter import RateLimiter


def _build_request(client_host: str, forwarded_for: Optional[str] = None) -> Request:
    headers = []
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode("latin-1")))

    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": headers,
        "client": (client_host, 12345),
        "server": ("testserver", 80),
        "scheme": "http",
        "query_string": b"",
    }
    return Request(scope)


def test_rate_limiter_uses_forwarded_client_ip_when_present():
    limiter = RateLimiter(requests=5, window=60)

    for _ in range(5):
        limiter.check_rate_limit(
            _build_request("172.18.0.10", forwarded_for="198.51.100.10")
        )

    for _ in range(5):
        limiter.check_rate_limit(
            _build_request("172.18.0.10", forwarded_for="198.51.100.11")
        )


def test_rate_limiter_blocks_after_forwarded_client_exceeds_limit():
    limiter = RateLimiter(requests=2, window=60)
    request = _build_request("172.18.0.10", forwarded_for="198.51.100.10")

    limiter.check_rate_limit(request)
    limiter.check_rate_limit(request)

    with pytest.raises(HTTPException) as exc_info:
        limiter.check_rate_limit(request)

    assert exc_info.value.status_code == 429


def test_request_at_exact_limit_boundary_is_allowed():
    """The Nth request (where N == limit) should succeed; N+1 should be blocked."""
    limiter = RateLimiter(requests=5, window=60)
    request = _build_request("10.0.0.1")

    # Requests 1 through 5 should all succeed
    for _ in range(5):
        limiter.check_rate_limit(request)

    # The 6th request should be blocked
    with pytest.raises(HTTPException) as exc_info:
        limiter.check_rate_limit(request)

    assert exc_info.value.status_code == 429


def test_request_allowed_after_window_expires():
    """After the rate-limit window expires, requests should be allowed again."""
    from unittest.mock import patch
    from datetime import datetime, timedelta

    limiter = RateLimiter(requests=2, window=60)
    request = _build_request("10.0.0.2")

    # Exhaust the limit
    limiter.check_rate_limit(request)
    limiter.check_rate_limit(request)

    with pytest.raises(HTTPException):
        limiter.check_rate_limit(request)

    # Simulate time passing beyond the window
    future_time = datetime.now() + timedelta(seconds=61)
    with patch("app.middleware.rate_limiter.datetime") as mock_dt:
        mock_dt.now.return_value = future_time
        mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)
        # After window expires, request should succeed
        limiter.check_rate_limit(request)


def test_cleanup_expired_removes_stale_entries():
    """_cleanup_expired should remove entries whose window has passed."""
    from unittest.mock import patch
    from datetime import datetime, timedelta

    limiter = RateLimiter(requests=5, window=60)

    # Manually populate the cache with entries that are already expired
    past_time = datetime.now() - timedelta(seconds=120)
    limiter._cache["expired_client_1"] = (3, past_time)
    limiter._cache["expired_client_2"] = (5, past_time)

    # Add one fresh entry
    fresh_time = datetime.now()
    limiter._cache["fresh_client"] = (1, fresh_time)

    assert len(limiter._cache) == 3

    limiter._cleanup_expired()

    assert "expired_client_1" not in limiter._cache
    assert "expired_client_2" not in limiter._cache
    assert "fresh_client" in limiter._cache
    assert len(limiter._cache) == 1
