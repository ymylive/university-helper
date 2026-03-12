import pytest
from unittest.mock import patch
from app.config import Settings


def test_settings_defaults():
    with patch.dict('os.environ', {'SECRET_KEY': 'test', 'CORS_ORIGINS': '["*"]'}):
        settings = Settings()
        assert settings.MAIN_DB_HOST == "localhost"
        assert settings.MAIN_DB_PORT == 5432
        assert settings.ALGORITHM == "HS256"


def test_settings_missing_secret_key():
    from pydantic_core import ValidationError
    with patch.dict('os.environ', {}, clear=True):
        with pytest.raises(ValidationError):
            Settings()


def test_settings_missing_cors():
    with patch.dict('os.environ', {'SECRET_KEY': 'test'}, clear=True):
        with pytest.raises(ValueError, match="CORS_ORIGINS must be set"):
            Settings()


def test_settings_custom_values():
    with patch.dict('os.environ', {
        'SECRET_KEY': 'test',
        'CORS_ORIGINS': '["*"]',
        'MAIN_DB_HOST': 'custom',
        'MAIN_DB_PORT': '3306'
    }):
        settings = Settings()
        assert settings.MAIN_DB_HOST == "custom"
        assert settings.MAIN_DB_PORT == 3306
