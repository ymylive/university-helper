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
