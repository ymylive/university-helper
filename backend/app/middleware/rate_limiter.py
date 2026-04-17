from ipaddress import ip_address

from fastapi import Request, HTTPException, status
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple


class RateLimiter:
    MAX_CACHE_SIZE = 10000
    CLEANUP_INTERVAL = 100  # Run cleanup every N requests

    def __init__(self, requests: int = 5, window: int = 60):
        self.requests = requests
        self.window = window
        self._cache: Dict[str, Tuple[int, datetime]] = defaultdict(lambda: (0, datetime.now()))
        self._request_count: int = 0

    def _is_trusted_proxy(self, host: str) -> bool:
        candidate = str(host or "").strip()
        if not candidate:
            return False
        if candidate.lower() == "localhost":
            return True

        try:
            parsed = ip_address(candidate)
        except ValueError:
            return False

        return parsed.is_private or parsed.is_loopback or parsed.is_link_local

    def _cleanup_expired(self) -> None:
        """Remove expired entries to prevent unbounded memory growth."""
        now = datetime.now()
        expired_keys = [
            key for key, (_, start_time) in self._cache.items()
            if now - start_time > timedelta(seconds=self.window)
        ]
        for key in expired_keys:
            del self._cache[key]

    def _evict_oldest(self) -> None:
        """Evict oldest entries when cache exceeds MAX_CACHE_SIZE."""
        if len(self._cache) <= self.MAX_CACHE_SIZE:
            return
        # Sort by start_time (oldest first) and remove excess entries
        sorted_keys = sorted(self._cache, key=lambda k: self._cache[k][1])
        evict_count = len(self._cache) - self.MAX_CACHE_SIZE
        for key in sorted_keys[:evict_count]:
            del self._cache[key]

    def _maybe_cleanup(self) -> None:
        """Periodically clean up expired and excess entries."""
        self._request_count += 1
        if self._request_count % self.CLEANUP_INTERVAL == 0:
            self._cleanup_expired()
            self._evict_oldest()

    def _get_forwarded_client_id(self, request: Request) -> Optional[str]:
        # NOTE: X-Forwarded-For is only trusted when the direct client is a
        # known private/loopback proxy (see _is_trusted_proxy). In production,
        # pair this with TrustedHostMiddleware and ensure Nginx/load balancer
        # overwrites X-Forwarded-For so upstream clients cannot spoof it.
        forwarded_for = str(request.headers.get("x-forwarded-for") or "").strip()
        if forwarded_for:
            for part in forwarded_for.split(","):
                candidate = part.strip()
                if candidate:
                    return candidate

        real_ip = str(request.headers.get("x-real-ip") or "").strip()
        if real_ip:
            return real_ip

        return None

    def _get_client_id(self, request: Request) -> str:
        client_host = request.client.host if request.client else ""

        if self._is_trusted_proxy(client_host):
            forwarded_client_id = self._get_forwarded_client_id(request)
            if forwarded_client_id:
                return forwarded_client_id

        return client_host or "unknown"

    def reset(self) -> None:
        self._cache.clear()

    def check_rate_limit(self, request: Request) -> None:
        self._maybe_cleanup()
        client_id = self._get_client_id(request)
        count, start_time = self._cache[client_id]
        now = datetime.now()

        if now - start_time > timedelta(seconds=self.window):
            self._cache[client_id] = (1, now)
            return

        if count >= self.requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded"
            )

        self._cache[client_id] = (count + 1, start_time)

rate_limiter = RateLimiter()
