import base64
import io
from unittest.mock import patch

import pytest
from fastapi import HTTPException
from starlette.datastructures import FormData, UploadFile

import app.api.v1.chaoxing as chaoxing_api
import app.api.v1.course as course_api


class FakeZhihuishuAdapter:
    def __init__(self):
        self._progress = {
            "status": "running",
            "message": "Task is running",
            "total": 2,
            "completed": 1,
            "failed": 0,
            "percentage": 50.0,
            "current_video": "Video 1",
            "estimated_time": "6s",
            "paused": False,
        }

    def get_courses(self):
        return [{"courseId": "1001", "name": "Course A"}]

    def start_course(self, course_id: str, speed: float = 1.0, auto_answer: bool = True):
        del speed, auto_answer
        self._progress.update({"status": "running", "message": "Task started", "course_id": course_id})
        return {"task_id": "z-task-1", "status": "running", "progress": dict(self._progress)}

    def get_videos(self, course_id: str):
        return [{"id": "v1", "title": f"{course_id}-Video", "status": "learning", "progress": 50}]

    def get_progress(self, course_id: str):
        progress = dict(self._progress)
        progress["course_id"] = course_id
        return progress

    def pause_task(self):
        self._progress.update({"status": "paused", "message": "Task paused", "paused": True})
        return {"status": "paused", "message": "Task paused"}

    def resume_task(self):
        self._progress.update({"status": "running", "message": "Task resumed", "paused": False})
        return {"status": "running", "message": "Task resumed"}

    def cancel_task(self):
        self._progress.update({"status": "cancelled", "message": "Task cancelled", "paused": False})
        return {"status": "cancelled", "message": "Task cancelled"}


class FakeMultipartRequest:
    def __init__(self, form_data: FormData):
        self.headers = {"content-type": "multipart/form-data; boundary=test"}
        self._form_data = form_data

    async def form(self):
        return self._form_data

    async def json(self):
        return {}


@pytest.fixture(autouse=True)
def reset_state():
    course_api._user_adapters.clear()
    course_api._course_tasks.clear()
    yield
    course_api._user_adapters.clear()
    course_api._course_tasks.clear()


@pytest.mark.asyncio
async def test_start_course_success():
    request = course_api.CourseStartRequest(
        platform="chaoxing",
        username="testuser",
        password="testpass",
        speed=1.5,
    )
    with patch("app.api.v1.course.signin_manager.login", return_value={"status": True, "message": "ok"}):
        response = await course_api.start_course_learning(request, current_user={"user_id": 1}, db=None)

    assert response.status == "started"
    assert response.task_id


@pytest.mark.asyncio
async def test_start_course_unsupported_platform():
    request = course_api.CourseStartRequest(platform="unknown", username="u", password="p")

    with pytest.raises(HTTPException) as exc_info:
        await course_api.start_course_learning(request, current_user={"user_id": 1}, db=None)

    assert exc_info.value.status_code == 400
    assert exc_info.value.detail == "Only chaoxing is supported"


@pytest.mark.asyncio
async def test_course_login_and_courses():
    request = course_api.CourseStartRequest(platform="chaoxing", username="u", password="p")
    mock_courses = [{"id": "1_2", "courseId": "1", "classId": "2", "name": "Course A"}]

    with patch("app.api.v1.course.signin_manager.login", return_value={"status": True, "message": "ok"}), patch(
        "app.api.v1.course.signin_manager.get_courses", return_value=mock_courses
    ):
        login_resp = await course_api.course_login(request, current_user={"user_id": 1}, db=None)
        list_resp = await course_api.get_courses(current_user={"user_id": 1}, db=None)

    assert login_resp["courses"] == mock_courses
    assert list_resp["courses"] == mock_courses


@pytest.mark.asyncio
async def test_chaoxing_compat_login_and_courses():
    mock_courses = [{"id": "1_2", "courseId": "1", "classId": "2", "name": "Course A"}]
    login_request = chaoxing_api.ChaoxingLoginRequest(username="u", password="p", use_cookies=False)

    with patch("app.api.v1.chaoxing.signin_manager.login", return_value={"status": True, "message": "ok", "data": {}}), patch(
        "app.api.v1.chaoxing.signin_manager.get_courses", return_value=mock_courses
    ):
        login_resp = await chaoxing_api.chaoxing_login(login_request, current_user={"user_id": 1})
        courses_resp = await chaoxing_api.chaoxing_courses(current_user={"user_id": 1})

    assert login_resp["status"] is True
    assert courses_resp["data"] == mock_courses


@pytest.mark.asyncio
async def test_zhihuishu_required_endpoints():
    user_id = "1"
    adapter = FakeZhihuishuAdapter()
    course_api._user_adapters[user_id] = adapter

    courses_resp = await course_api.zhihuishu_get_courses(current_user={"user_id": 1})
    start_resp = await course_api.zhihuishu_start_course(
        course_api.ZhihuishuCourseRequest(course_id="1001", speed=1.0, auto_answer=True),
        current_user={"user_id": 1},
    )
    videos_resp = await course_api.zhihuishu_get_videos("1001", current_user={"user_id": 1})
    progress_resp = await course_api.zhihuishu_get_progress("1001", current_user={"user_id": 1})
    pause_resp = await course_api.zhihuishu_pause(current_user={"user_id": 1})
    resume_resp = await course_api.zhihuishu_resume(current_user={"user_id": 1})
    cancel_resp = await course_api.zhihuishu_cancel(current_user={"user_id": 1})

    assert isinstance(courses_resp.get("courses"), list)
    assert start_resp.get("task_id")
    assert isinstance(videos_resp.get("videos"), list)
    assert "completed" in progress_resp
    assert "total" in progress_resp
    assert pause_resp["status"] == "success"
    assert resume_resp["status"] == "success"
    assert cancel_resp["status"] == "success"


@pytest.mark.asyncio
async def test_chaoxing_start_accepts_multipart_photo():
    captured = {}

    def _fake_start_task(user_id, payload):
        captured["user_id"] = user_id
        captured["payload"] = payload
        return "task-multipart-1"

    form_data = FormData(
        [
            ("username", "u"),
            ("password", "p"),
            ("course_list", '["course_1"]'),
            ("sign_type", "photo"),
            ("speed", "1.0"),
            ("jobs", "1"),
            ("photo", UploadFile(filename="demo.jpg", file=io.BytesIO(b"fake-image"))),
        ]
    )

    with patch("app.api.v1.chaoxing.signin_manager.start_task", side_effect=_fake_start_task):
        response = await chaoxing_api.chaoxing_start(
            raw_request=FakeMultipartRequest(form_data),
            current_user={"user_id": 1},
        )

    assert response["status"] is True
    assert response["data"]["task_id"] == "task-multipart-1"
    assert captured["user_id"] == "1"
    assert captured["payload"]["course_list"] == ["course_1"]
    assert captured["payload"]["photo_base64"] == base64.b64encode(b"fake-image").decode("utf-8")


@pytest.mark.asyncio
async def test_chaoxing_sign_accepts_multipart_photo():
    form_data = FormData(
        [
            ("username", "u"),
            ("password", "p"),
            ("sign_type", "photo"),
            ("photo", UploadFile(filename="demo.jpg", file=io.BytesIO(b"fake-image"))),
        ]
    )

    with patch(
        "app.api.v1.chaoxing.signin_manager.sign_once",
        return_value={"status": True, "message": "ok", "data": {}},
    ) as mock_sign_once:
        response = await chaoxing_api.chaoxing_sign(
            raw_request=FakeMultipartRequest(form_data),
            current_user={"user_id": 1},
        )

    assert response["status"] is True

    options = mock_sign_once.call_args.kwargs["options"]
    assert options["sign_type"] == "photo"
    assert options["photo_base64"] == base64.b64encode(b"fake-image").decode("utf-8")
