import pytest
from unittest.mock import Mock, patch
from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str = None
    password: str = None
    use_qr: bool = True


@pytest.mark.asyncio
async def test_login_with_qr():
    with patch('app.api.v1.course.zhihuishu.ZhihuishuAdapter') as mock_adapter:
        mock_instance = Mock()
        mock_instance.login_with_qr.return_value = {"success": True}
        mock_adapter.return_value = mock_instance

        from app.api.v1.course.zhihuishu import login
        request = LoginRequest(use_qr=True)
        result = await login(request)

        assert result["success"] is True


@pytest.mark.asyncio
async def test_login_with_password():
    with patch('app.api.v1.course.zhihuishu.ZhihuishuAdapter') as mock_adapter:
        mock_instance = Mock()
        mock_instance.login_with_password.return_value = {"success": True}
        mock_adapter.return_value = mock_instance

        from app.api.v1.course.zhihuishu import login
        request = LoginRequest(username="test", password="pass", use_qr=False)
        result = await login(request)

        assert result["success"] is True
