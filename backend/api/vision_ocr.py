from typing import Optional


def is_vision_ocr_enabled() -> bool:
    return False


def vision_ocr(image_bytes: bytes) -> Optional[str]:
    del image_bytes
    return None

