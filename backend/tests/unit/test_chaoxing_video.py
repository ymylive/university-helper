import pytest
from unittest.mock import Mock, patch
from app.services.course.chaoxing.client import Chaoxing, Account, StudyResult


def test_study_result_enum():
    assert StudyResult.SUCCESS.is_success()
    assert not StudyResult.ERROR.is_success()
    assert StudyResult.ERROR.is_failure()


@patch('app.services.course.chaoxing.client.ChaoxingAuthService')
@patch('app.services.course.chaoxing.client.ChaoxingCourseService')
def test_chaoxing_init_video_limiter(mock_course, mock_auth):
    account = Account("user", "pass")
    cx = Chaoxing(account)

    assert cx.video_log_limiter is not None
    assert cx.video_log_limiter.call_interval == 2
