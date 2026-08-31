"""
NLP SDK Exceptions
"""

from typing import Optional, Any


class NLPError(Exception):
    """Base exception for all NLP SDK errors"""

    def __init__(self, message: str, code: str = "UNKNOWN_ERROR", status: int = 0, details: Any = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status
        self.details = details

    def __repr__(self) -> str:
        return f"NLPError({self.code}, {self.status}): {self.message}"

    def to_dict(self) -> dict:
        return {
            "code": self.code,
            "message": self.message,
            "status": self.status,
            "details": self.details,
        }


class AuthenticationError(NLPError):
    """Raised when authentication fails or token is invalid"""

    def __init__(self, message: str = "Authentication failed", details: Any = None):
        super().__init__(message, "AUTHENTICATION_ERROR", 401, details)


class TokenExpiredError(AuthenticationError):
    """Raised when the access token has expired"""

    def __init__(self, message: str = "Access token expired"):
        super().__init__(message, "TOKEN_EXPIRED")


class RateLimitError(NLPError):
    """Raised when rate limit is exceeded"""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(message, "RATE_LIMITED", 429)
        self.retry_after = retry_after


class ValidationError(NLPError):
    """Raised when request validation fails"""

    def __init__(self, message: str, details: Any = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class NotFoundError(NLPError):
    """Raised when a requested resource is not found"""

    def __init__(self, resource: str = "Resource"):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404)


class NetworkError(NLPError):
    """Raised when a network error occurs"""

    def __init__(self, message: str = "Network error"):
        super().__init__(message, "NETWORK_ERROR", 0)


class TimeoutError(NLPError):
    """Raised when a request times out"""

    def __init__(self, message: str = "Request timeout"):
        super().__init__(message, "TIMEOUT", 408)


class ServerError(NLPError):
    """Raised when server returns 5xx error"""

    def __init__(self, message: str = "Internal server error"):
        super().__init__(message, "SERVER_ERROR", 500)