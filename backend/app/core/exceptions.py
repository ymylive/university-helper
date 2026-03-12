"""Custom exceptions for the application"""


class AppException(Exception):
    """Base exception for application errors"""
    pass


class UserAlreadyExistsError(AppException):
    """Raised when attempting to register a user that already exists"""
    pass


class InvalidCredentialsError(AppException):
    """Raised when login credentials are invalid"""
    pass


class DatabaseError(AppException):
    """Raised when a database operation fails"""
    pass
