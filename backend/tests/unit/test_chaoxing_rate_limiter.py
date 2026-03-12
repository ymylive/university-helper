import pytest
import time
from app.services.course.chaoxing.rate_limiter import RateLimiter


def test_rate_limiter_init():
    limiter = RateLimiter(1.0)
    assert limiter.call_interval == 1.0


def test_rate_limiter_basic():
    limiter = RateLimiter(0.1)

    start = time.time()
    limiter.limit_rate()
    limiter.limit_rate()
    elapsed = time.time() - start

    assert elapsed >= 0.1


def test_rate_limiter_random():
    limiter = RateLimiter(0.1)

    start = time.time()
    limiter.limit_rate(random_time=True, random_min=0.05, random_max=0.1)
    elapsed = time.time() - start

    assert elapsed >= 0.05
