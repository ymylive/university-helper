import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.auth_service import AuthService


@pytest.fixture
def auth_service():
    return AuthService()


@pytest.fixture
def mock_cursor():
    cursor = Mock()
    cursor.fetchone = Mock()
    return cursor


@pytest.fixture
def mock_conn(mock_cursor):
    conn = MagicMock()
    conn.cursor.return_value = mock_cursor
    conn.__enter__ = Mock(return_value=conn)
    conn.__exit__ = Mock(return_value=False)
    return conn


def test_register_user_duplicate_email(auth_service, mock_conn, mock_cursor):
    mock_cursor.fetchone.return_value = {"id": 1}

    with patch("app.services.auth_service.get_db_session", return_value=mock_conn):
        with pytest.raises(ValueError, match="Email already registered"):
            auth_service.register_user("user", "test@example.com", "pass123")


def test_register_user_sql_injection_attempt(auth_service, mock_conn, mock_cursor):
    mock_cursor.fetchone.side_effect = [None, {"id": 1}]

    with patch("app.services.auth_service.get_db_session", return_value=mock_conn):
        with patch("app.services.auth_service.psycopg2.connect", return_value=mock_conn):
            with patch("app.services.auth_service.create_access_token", return_value="token"):
                result = auth_service.register_user("user", "test@example.com", "pass123")

                call_args = mock_cursor.execute.call_args_list[1][0]
                assert "%s" in call_args[0]


def test_register_user_success(auth_service, mock_conn, mock_cursor):
    mock_cursor.fetchone.side_effect = [None, {"id": 1}]

    with patch("app.services.auth_service.get_db_session", return_value=mock_conn):
        with patch("app.services.auth_service.psycopg2.connect", return_value=mock_conn):
            with patch("app.services.auth_service.create_access_token", return_value="token123"):
                result = auth_service.register_user("testuser", "test@example.com", "pass123")

                assert result["access_token"] == "token123"
                assert result["user_id"] == 1
                assert result["tenant_db_name"] == "tenant_testuser"


def test_login_user_invalid_credentials(auth_service, mock_conn, mock_cursor):
    mock_cursor.fetchone.return_value = None

    with patch("app.services.auth_service.get_db_session", return_value=mock_conn):
        with pytest.raises(ValueError, match="Invalid credentials"):
            auth_service.login_user("test@example.com", "wrongpass")


def test_login_user_null_inputs(auth_service, mock_conn, mock_cursor):
    mock_cursor.fetchone.return_value = None

    with patch("app.services.auth_service.get_db_session", return_value=mock_conn):
        with pytest.raises(ValueError, match="Invalid credentials"):
            auth_service.login_user(None, None)
