import pytest
import time
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from concurrent.futures import ThreadPoolExecutor


@pytest.fixture
def client():
    from app.main import app
    return TestClient(app)


@pytest.fixture
def mock_chaoxing():
    with patch('app.api.v1.course.Chaoxing') as mock:
        instance = MagicMock()
        instance.login = MagicMock(return_value={"status": True, "msg": "登录成功"})
        mock.return_value = instance
        yield instance


class TestCoursePerformance:
    def test_course_start_response_time(self, client, mock_chaoxing):
        """Course start should complete within acceptable time"""
        start = time.time()
        response = client.post("/api/v1/course/start", json={
            "platform": "chaoxing",
            "username": "testuser",
            "password": "testpass"
        })
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 3.0

    def test_concurrent_course_requests(self, client, mock_chaoxing):
        """Handle concurrent course start requests"""
        def start_course():
            return client.post("/api/v1/course/start", json={
                "platform": "chaoxing",
                "username": "testuser",
                "password": "testpass"
            })

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(start_course) for _ in range(5)]
            results = [f.result() for f in futures]

        assert all(r.status_code == 200 for r in results)

    def test_status_check_response_time(self, client):
        """Status check should be fast"""
        start = time.time()
        response = client.get("/api/v1/course/status/task123")
        duration = time.time() - start

        assert response.status_code == 200
        assert duration < 0.5
