import pytest
import json
from pathlib import Path
from unittest.mock import Mock, patch
from app.services.course.chaoxing.cookies import save_cookies, use_cookies, COOKIES_FILE


@pytest.fixture
def cleanup_cookies():
    yield
    if COOKIES_FILE.exists():
        COOKIES_FILE.unlink()


def test_save_cookies(cleanup_cookies):
    mock_session = Mock()
    mock_session.cookies.get_dict.return_value = {"key": "value"}

    save_cookies(mock_session)

    assert COOKIES_FILE.exists()
    data = json.loads(COOKIES_FILE.read_text())
    assert data == {"key": "value"}


def test_use_cookies_exists(cleanup_cookies):
    COOKIES_FILE.write_text(json.dumps({"key": "value"}))

    result = use_cookies()

    assert result == {"key": "value"}


def test_use_cookies_not_exists(cleanup_cookies):
    result = use_cookies()
    assert result == {}
