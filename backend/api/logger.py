import logging
from typing import Any

try:  # pragma: no cover - prefer loguru when available
    from loguru import logger as logger  # type: ignore[no-redef]
except Exception:  # pragma: no cover
    class _FallbackLogger:
        def __init__(self) -> None:
            self._logger = logging.getLogger("chaoxing")
            if not self._logger.handlers:
                logging.basicConfig(level=logging.INFO)

        @staticmethod
        def _render(message: Any, *args: Any) -> str:
            text = str(message)
            if not args:
                return text
            try:
                return text.format(*args)
            except Exception:
                return f"{text} {' '.join(str(arg) for arg in args)}"

        def trace(self, message: Any, *args: Any, **kwargs: Any) -> None:
            del kwargs
            self._logger.debug(self._render(message, *args))

        def debug(self, message: Any, *args: Any, **kwargs: Any) -> None:
            del kwargs
            self._logger.debug(self._render(message, *args))

        def info(self, message: Any, *args: Any, **kwargs: Any) -> None:
            del kwargs
            self._logger.info(self._render(message, *args))

        def success(self, message: Any, *args: Any, **kwargs: Any) -> None:
            del kwargs
            self._logger.info(self._render(message, *args))

        def warning(self, message: Any, *args: Any, **kwargs: Any) -> None:
            del kwargs
            self._logger.warning(self._render(message, *args))

        def error(self, message: Any, *args: Any, **kwargs: Any) -> None:
            del kwargs
            self._logger.error(self._render(message, *args))

    logger = _FallbackLogger()  # type: ignore[assignment]

