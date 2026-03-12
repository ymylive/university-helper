from fastapi import Request, HTTPException, status
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, Tuple

class RateLimiter:
    def __init__(self, requests: int = 5, window: int = 60):
        self.requests = requests
        self.window = window
        self._cache: Dict[str, Tuple[int, datetime]] = defaultdict(lambda: (0, datetime.now()))

    def _get_client_id(self, request: Request) -> str:
        return request.client.host if request.client else "unknown"

    def check_rate_limit(self, request: Request) -> None:
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
