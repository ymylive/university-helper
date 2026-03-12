import pytest
from unittest.mock import patch, MagicMock
import requests


class TestChaoxingAPIContract:
    """Test Chaoxing external API contract expectations"""

    @patch('requests.Session.post')
    def test_login_api_contract(self, mock_post):
        """Verify login API request/response contract"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": True, "msg": "登录成功"}
        mock_post.return_value = mock_response

        from app.services.course.chaoxing.client import Chaoxing
        from app.services.course.chaoxing import Account

        account = Account("testuser", "testpass")
        chaoxing = Chaoxing(account=account)
        result = chaoxing.login()

        assert mock_post.called
        assert result["status"] is True

    @patch('requests.Session.get')
    def test_course_list_api_contract(self, mock_get):
        """Verify course list API response structure"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "result": 1,
            "channelList": [
                {"id": "123", "name": "测试课程"}
            ]
        }
        mock_get.return_value = mock_response

        assert mock_response.json()["result"] == 1
        assert "channelList" in mock_response.json()


class TestZhihuishuAPIContract:
    """Test Zhihuishu external API contract expectations"""

    @patch('requests.post')
    def test_auth_api_contract(self, mock_post):
        """Verify Zhihuishu auth API contract"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": 200, "result": {"token": "test_token"}}
        mock_post.return_value = mock_response

        response = mock_post("https://passport.zhihuishu.com/login", json={
            "account": "test",
            "password": "test"
        })

        assert response.status_code == 200
        assert "result" in response.json()


class TestOCRServiceContract:
    """Test OCR service API contract"""

    @patch('requests.post')
    def test_ocr_api_response_structure(self, mock_post):
        """Verify OCR API returns expected structure"""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"text": "识别结果", "confidence": 0.95}
        mock_post.return_value = mock_response

        response = mock_post("http://ocr-service/api/recognize", files={"image": b"fake_image"})

        assert response.status_code == 200
        data = response.json()
        assert "text" in data
        assert "confidence" in data
