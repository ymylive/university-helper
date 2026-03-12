import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool
from contextlib import contextmanager
from app.config import settings

main_pool = None
tenant_pools = {}


def _get_main_pool():
    global main_pool
    if main_pool is None:
        main_pool = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            host=settings.MAIN_DB_HOST,
            database=settings.MAIN_DB_NAME,
            user=settings.MAIN_DB_USER,
            password=settings.MAIN_DB_PASSWORD,
            port=settings.MAIN_DB_PORT,
            cursor_factory=RealDictCursor
        )
    return main_pool


def get_main_db_connection():
    return _get_main_pool().getconn()


def get_tenant_db_connection(tenant_db_name: str):
    if tenant_db_name not in tenant_pools:
        tenant_pools[tenant_db_name] = ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            host=settings.MAIN_DB_HOST,
            database=tenant_db_name,
            user=settings.MAIN_DB_USER,
            password=settings.MAIN_DB_PASSWORD,
            port=settings.MAIN_DB_PORT,
            cursor_factory=RealDictCursor
        )
    return tenant_pools[tenant_db_name].getconn()


@contextmanager
def get_db_session(db_name: str = None):
    if db_name:
        pool = tenant_pools.get(db_name)
        if not pool:
            conn = get_tenant_db_connection(db_name)
        else:
            conn = pool.getconn()
    else:
        conn = _get_main_pool().getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        if db_name and db_name in tenant_pools:
            tenant_pools[db_name].putconn(conn)
        else:
            _get_main_pool().putconn(conn)
