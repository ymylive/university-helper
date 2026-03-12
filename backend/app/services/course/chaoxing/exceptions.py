try:
    from requests.exceptions import JSONDecodeError
except ImportError:
    from json import JSONDecodeError


class ChaoxingException(Exception):
    """Base exception for Chaoxing service errors"""
    pass


class LoginError(ChaoxingException):
    """Raised when login fails"""
    pass


class InputFormatError(ChaoxingException):
    """Raised when input format is invalid"""
    pass


class MaxRollBackExceeded(ChaoxingException):
    """Raised when maximum rollback attempts exceeded"""
    pass


class MaxRetryExceeded(ChaoxingException):
    """Raised when maximum retry attempts exceeded"""
    pass


class FontDecodeError(ChaoxingException):
    """Raised when font decoding fails"""
    pass


class AuthenticationError(ChaoxingException):
    """Raised when authentication fails"""
    pass


class TokenExpiredError(ChaoxingException):
    """Raised when token has expired"""
    pass


class InvalidTokenError(ChaoxingException):
    """Raised when token is invalid"""
    pass
