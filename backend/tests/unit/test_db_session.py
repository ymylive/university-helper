import pytest
from unittest.mock import Mock, patch, MagicMock
from app.db.session import get_main_db_connection, get_tenant_db_connection, get_db_session


@patch('app.db.session._get_main_pool')
def test_get_main_db_connection(mock_pool):
    mock_conn = Mock()
    mock_pool.return_value.getconn.return_value = mock_conn

    conn = get_main_db_connection()

    assert conn == mock_conn
    mock_pool.return_value.getconn.assert_called_once()


@patch('app.db.session.ThreadedConnectionPool')
@patch('app.db.session.settings')
def test_get_tenant_db_connection(mock_settings, mock_pool_class):
    mock_settings.MAIN_DB_HOST = "localhost"
    mock_settings.MAIN_DB_USER = "user"
    mock_settings.MAIN_DB_PASSWORD = "pass"
    mock_settings.MAIN_DB_PORT = 5432

    mock_pool = Mock()
    mock_conn = Mock()
    mock_pool.getconn.return_value = mock_conn
    mock_pool_class.return_value = mock_pool

    conn = get_tenant_db_connection("test_db")

    assert conn == mock_conn
    mock_pool_class.assert_called_once()


@patch('app.db.session._get_main_pool')
def test_get_db_session_main(mock_pool):
    mock_conn = Mock()
    mock_pool.return_value.getconn.return_value = mock_conn

    with get_db_session() as conn:
        assert conn == mock_conn

    mock_conn.commit.assert_called_once()
    mock_pool.return_value.putconn.assert_called_once_with(mock_conn)


@patch('app.db.session._get_main_pool')
def test_get_db_session_rollback(mock_pool):
    mock_conn = Mock()
    mock_conn.commit.side_effect = Exception("DB error")
    mock_pool.return_value.getconn.return_value = mock_conn

    with pytest.raises(Exception):
        with get_db_session() as conn:
            pass

    mock_conn.rollback.assert_called_once()
