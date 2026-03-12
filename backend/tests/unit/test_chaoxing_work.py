import pytest
from unittest.mock import Mock, patch
from app.services.course.chaoxing.client import Chaoxing, Account


@patch('app.services.course.chaoxing.client.ChaoxingAuthService')
@patch('app.services.course.chaoxing.client.ChaoxingCourseService')
@patch('app.services.course.chaoxing.client.ChaoxingQuizService')
def test_chaoxing_quiz_service_init(mock_quiz, mock_course, mock_auth):
    account = Account("user", "pass")
    cx = Chaoxing(account)

    assert cx.quiz_service is not None
    mock_quiz.assert_called_once()
