import pytest
from unittest.mock import Mock, patch
from app.services.course.common.ocr import (
    vision_ocr, is_vision_ocr_enabled, reset_vision_ocr_config,
    _image_to_base64, _detect_image_type
)


@pytest.fixture(autouse=True)
def reset_config():
    reset_vision_ocr_config()
    yield
    reset_vision_ocr_config()


def test_image_to_base64():
    result = _image_to_base64(b"test")
    assert result == "dGVzdA=="


def test_detect_image_type_png():
    png_header = b'\x89PNG\r\n\x1a\n'
    assert _detect_image_type(png_header) == "image/png"


def test_detect_image_type_jpeg():
    jpeg_header = b'\xff\xd8'
    assert _detect_image_type(jpeg_header) == "image/jpeg"


@patch.dict('os.environ', {}, clear=True)
def test_vision_ocr_disabled():
    assert is_vision_ocr_enabled() is False
    assert vision_ocr(b"test") == ""


@patch.dict('os.environ', {'CHAOXING_VISION_OCR_PROVIDER': 'openai', 'CHAOXING_VISION_OCR_KEY': 'test'})
@patch('app.services.course.common.ocr.requests.post')
def test_vision_ocr_openai(mock_post):
    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "recognized text"}}]
    }
    mock_post.return_value = mock_resp

    result = vision_ocr(b"test")
    assert result == "recognized text"


@patch.dict('os.environ', {'CHAOXING_VISION_OCR_PROVIDER': 'claude', 'CHAOXING_VISION_OCR_KEY': 'test'})
@patch('app.services.course.common.ocr.requests.post')
def test_vision_ocr_claude(mock_post):
    mock_resp = Mock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "content": [{"type": "text", "text": "recognized text"}]
    }
    mock_post.return_value = mock_resp

    result = vision_ocr(b"test")
    assert result == "recognized text"
