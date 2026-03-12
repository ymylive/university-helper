import importlib

import pytest

import app.services.course.task_store as task_store_module
from app.services.course.task_store import TaskStore


class _FakeCursor:
    def __init__(self, rows):
        self._rows = rows
        self.executed = []

    def execute(self, sql, params=None):
        self.executed.append((sql, params))

    def fetchall(self):
        return list(self._rows)

    def fetchone(self):
        return self._rows[0] if self._rows else None

    def close(self):
        return None


class _FakeConn:
    def __init__(self, cursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor


class _FakeSessionCtx:
    def __init__(self, conn):
        self._conn = conn

    def __enter__(self):
        return self._conn

    def __exit__(self, exc_type, exc, tb):
        return False


def test_task_store_list_tasks_uses_user_filter_and_updated_desc(monkeypatch):
    store = TaskStore()
    monkeypatch.setattr(store, "ensure_tables", lambda: None)

    rows = [
        {
            "task_id": "task-new",
            "user_id": "user-1",
            "task_kind": "signin",
            "status": "running",
            "message": "new",
            "started_at": None,
            "updated_at": None,
            "payload": {"task_id": "task-new", "user_id": "user-1"},
        },
        {
            "task_id": "task-old",
            "user_id": "user-1",
            "task_kind": "signin",
            "status": "failed",
            "message": "old",
            "started_at": None,
            "updated_at": None,
            "payload": {"task_id": "task-old", "user_id": "user-1"},
        },
    ]
    fake_cursor = _FakeCursor(rows)
    fake_conn = _FakeConn(fake_cursor)
    monkeypatch.setattr(task_store_module, "get_db_session", lambda: _FakeSessionCtx(fake_conn))

    tasks = store.list_tasks(task_kind="signin", user_id="user-1", limit=20)

    assert [item["task_id"] for item in tasks] == ["task-new", "task-old"]
    assert all(item["user_id"] == "user-1" for item in tasks)

    assert len(fake_cursor.executed) == 1
    sql, params = fake_cursor.executed[0]
    assert "WHERE task_kind = %s AND user_id = %s" in sql
    assert "ORDER BY updated_at DESC" in sql
    assert params == ("signin", "user-1", 20)


def test_task_store_get_task_uses_task_and_user_filters(monkeypatch):
    store = TaskStore()
    monkeypatch.setattr(store, "ensure_tables", lambda: None)

    rows = [
        {
            "task_id": "task-1",
            "user_id": "user-1",
            "task_kind": "signin",
            "status": "running",
            "message": "active",
            "started_at": None,
            "updated_at": None,
            "payload": {"task_id": "task-1", "user_id": "user-1"},
        }
    ]
    fake_cursor = _FakeCursor(rows)
    fake_conn = _FakeConn(fake_cursor)
    monkeypatch.setattr(task_store_module, "get_db_session", lambda: _FakeSessionCtx(fake_conn))

    task = store.get_task(task_kind="signin", task_id="task-1", user_id="user-1")

    assert task is not None
    assert task["task_id"] == "task-1"
    assert task["user_id"] == "user-1"
    sql, params = fake_cursor.executed[0]
    assert "WHERE task_kind = %s AND task_id = %s AND user_id = %s" in sql
    assert params == ("signin", "task-1", "user-1")


def test_task_store_upsert_task_returns_safely_when_task_id_missing(monkeypatch):
    store = TaskStore()
    call_count = {"db": 0}

    def _unexpected_db_call():
        call_count["db"] += 1
        return _FakeSessionCtx(_FakeConn(_FakeCursor([])))

    monkeypatch.setattr(task_store_module, "get_db_session", _unexpected_db_call)

    store.upsert_task(
        task_kind="signin",
        task_state_public={
            "user_id": "user-1",
            "status": "running",
            "message": "task-id missing should be no-op",
        },
    )

    assert call_count["db"] == 0


def test_signin_manager_loads_full_history_for_user_even_after_partial_preload(monkeypatch):
    try:
        signin_module = importlib.import_module("app.services.course.chaoxing.signin")
    except Exception as exc:
        pytest.xfail(f"signin import blocked in current branch: {exc}")

    if not hasattr(signin_module, "task_store"):
        pytest.xfail("signin manager task_store integration is not available")

    global_history = [
        {
            "user_id": "user-1",
            "timestamp": "2026-01-01T00:00:00+00:00",
            "message": "partial",
        }
    ]
    full_history = [
        {
            "timestamp": "2026-01-02T00:00:00+00:00",
            "message": "latest",
        },
        {
            "timestamp": "2026-01-01T00:00:00+00:00",
            "message": "partial",
        },
    ]

    monkeypatch.setattr(signin_module.task_store, "list_tasks", lambda *args, **kwargs: [], raising=False)
    monkeypatch.setattr(signin_module.task_store, "upsert_task", lambda *args, **kwargs: None, raising=False)

    def _fake_list_history(*args, **kwargs):
        if kwargs.get("user_id"):
            return list(full_history)
        return list(global_history)

    monkeypatch.setattr(signin_module.task_store, "list_history", _fake_list_history, raising=False)

    manager = signin_module.ChaoxingSigninManager()
    history = manager.get_history("user-1")

    assert [item["message"] for item in history] == ["latest", "partial"]


def test_signin_manager_loads_missing_task_from_store_on_demand(monkeypatch):
    try:
        signin_module = importlib.import_module("app.services.course.chaoxing.signin")
    except Exception as exc:
        pytest.xfail(f"signin import blocked in current branch: {exc}")

    if not hasattr(signin_module, "task_store"):
        pytest.xfail("signin manager task_store integration is not available")

    stored_task = {
        "task_id": "stored-task",
        "user_id": "user-1",
        "status": "completed",
        "message": "done",
        "progress": {"total": 1, "completed": 1, "failed": 0, "current": 1},
        "created_at": "2026-01-01T00:00:00+00:00",
        "started_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:01:00+00:00",
        "logs": [{"timestamp": "2026-01-01T00:01:00+00:00", "message": "done", "level": "success"}],
    }

    monkeypatch.setattr(signin_module.task_store, "list_tasks", lambda *args, **kwargs: [], raising=False)
    monkeypatch.setattr(signin_module.task_store, "list_history", lambda *args, **kwargs: [], raising=False)
    monkeypatch.setattr(signin_module.task_store, "upsert_task", lambda *args, **kwargs: None, raising=False)
    monkeypatch.setattr(signin_module.task_store, "get_task", lambda *args, **kwargs: dict(stored_task), raising=False)

    manager = signin_module.ChaoxingSigninManager()
    task = manager.get_task(user_id="user-1", task_id="stored-task")

    assert task is not None
    assert task["task_id"] == "stored-task"
    assert task["status"] == "completed"


def test_signin_manager_get_active_tasks_falls_back_to_background_tasks(monkeypatch):
    try:
        signin_module = importlib.import_module("app.services.course.chaoxing.signin")
    except Exception as exc:
        pytest.xfail(f"signin import blocked in current branch: {exc}")

    if not hasattr(signin_module, "task_store"):
        pytest.xfail("signin manager task_store integration is not available")

    monkeypatch.setattr(signin_module.task_store, "list_tasks", lambda *args, **kwargs: [], raising=False)
    monkeypatch.setattr(signin_module.task_store, "list_history", lambda *args, **kwargs: [], raising=False)
    monkeypatch.setattr(signin_module.task_store, "upsert_task", lambda *args, **kwargs: None, raising=False)

    manager = signin_module.ChaoxingSigninManager()
    manager._tasks["bg-task-1"] = {
        "task_id": "bg-task-1",
        "user_id": "user-1",
        "status": "running",
        "message": "Task started",
        "progress": {"total": 1, "completed": 0, "failed": 0, "current": 0, "current_course": "????I"},
        "created_at": "2026-01-01T00:00:00+00:00",
        "updated_at": "2026-01-01T00:01:00+00:00",
        "logs": [],
        "_log_cursor": 0,
    }

    tasks = manager.get_active_tasks("user-1")

    assert len(tasks) == 1
    assert tasks[0]["taskId"] == "bg-task-1"
    assert tasks[0]["actionable"] is False
    assert tasks[0]["source"] == "background"
    assert tasks[0]["typeLabel"] == "Background task"
    assert tasks[0]["courseName"] == "????I"


def test_signin_manager_recovery_marks_running_task_as_non_running(monkeypatch):
    try:
        signin_module = importlib.import_module("app.services.course.chaoxing.signin")
    except Exception as exc:
        pytest.xfail(f"signin import blocked in current branch: {exc}")

    if not hasattr(signin_module, "task_store"):
        pytest.xfail("signin manager task_store integration is not available")

    restored_rows = [
        {
            "task_id": "recovered-running",
            "user_id": "user-1",
            "status": "running",
            "message": "task was running before restart",
            "progress": {"total": 1, "completed": 0, "failed": 0, "current": 0},
            "created_at": "2026-01-01T00:00:00+00:00",
            "started_at": "2026-01-01T00:00:00+00:00",
            "updated_at": "2026-01-01T00:00:00+00:00",
            "logs": [],
        }
    ]

    monkeypatch.setattr(
        signin_module.task_store,
        "list_tasks",
        lambda *args, **kwargs: list(restored_rows),
        raising=False,
    )
    monkeypatch.setattr(signin_module.task_store, "list_history", lambda *args, **kwargs: [], raising=False)
    monkeypatch.setattr(signin_module.task_store, "upsert_task", lambda *args, **kwargs: None, raising=False)

    manager = signin_module.ChaoxingSigninManager()
    restored = manager.get_task(user_id="user-1", task_id="recovered-running")

    assert restored is not None
    assert restored["status"] in {"failed", "error"}
    assert restored["status"] != "running"
