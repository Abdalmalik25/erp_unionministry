package nlp

import (
	"fmt"
	"net/http"
	"time"
)

// Error codes
const (
	ErrCodeUnknown          = "UNKNOWN_ERROR"
	ErrCodeUnauthorized     = "UNAUTHORIZED"
	ErrCodeForbidden       = "FORBIDDEN"
	ErrCodeNotFound        = "NOT_FOUND"
	ErrCodeValidation      = "VALIDATION_ERROR"
	ErrCodeRateLimited     = "RATE_LIMITED"
	ErrCodeInternal        = "INTERNAL_ERROR"
	ErrCodeTokenExpired    = "TOKEN_EXPIRED"
)

// APIError represents an API error response
type APIError struct {
	Code      string                 `json:"code"`
	Message   string                 `json:"message"`
	Details   map[string]interface{} `json:"details,omitempty"`
	HTTPStatus int
	RetryAfter int `json:"retry_after,omitempty"`
}

func (e *APIError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// IsRateLimited returns true if error is rate limiting
func (e *APIError) IsRateLimited() bool {
	return e.Code == ErrCodeRateLimited
}

// IsUnauthorized returns true if error is authentication related
func (e *APIError) IsUnauthorized() bool {
	return e.Code == ErrCodeUnauthorized || e.Code == ErrCodeTokenExpired
}

// IsNotFound returns true if resource not found
func (e *APIError) IsNotFound() bool {
	return e.Code == ErrCodeNotFound
}

// Response represents the standard API response envelope
type Response[T any] struct {
	Success bool    `json:"success"`
	Data    *T      `json:"data"`
	Meta    Meta    `json:"meta"`
	Errors  *APIError `json:"errors,omitempty"`
}

// Meta contains response metadata
type Meta struct {
	Timestamp string `json:"timestamp"`
	Path      string `json:"path"`
	Method    string `json:"method"`
}

// Pagination contains pagination information
type Pagination struct {
	Page       int  `json:"page"`
	Limit      int  `json:"limit"`
	Total      int  `json:"total"`
	TotalPages int  `json:"totalPages"`
	HasNext    bool `json:"hasNext"`
	HasPrev    bool `json:"hasPrev"`
}

// PaginatedResponse wraps paginated API responses
type PaginatedResponse[T any] struct {
	Items      []T         `json:"items"`
	Pagination *Pagination `json:"pagination"`
}

// buildAPIError creates an APIError from HTTP response
func buildAPIError(status int, body map[string]interface{}) *APIError {
	err := &APIError{
		HTTPStatus: status,
	}

	if errors, ok := body["errors"].(map[string]interface{}); ok {
		if code, ok := errors["code"].(string); ok {
			err.Code = code
		} else {
			err.Code = ErrCodeUnknown
		}
		if msg, ok := errors["message"].(string); ok {
			err.Message = msg
		}
		if details, ok := errors["details"].(map[string]interface{}); ok {
			err.Details = details
		}
	} else {
		err.Code = ErrCodeUnknown
		err.Message = "Unknown error"
	}

	switch status {
	case http.StatusUnauthorized:
		if err.Code == "" {
			err.Code = ErrCodeUnauthorized
			err.Message = "Authentication required"
		}
	case http.StatusForbidden:
		err.Code = ErrCodeForbidden
		if err.Message == "" {
			err.Message = "Insufficient permissions"
		}
	case http.StatusNotFound:
		err.Code = ErrCodeNotFound
		if err.Message == "" {
			err.Message = "Resource not found"
		}
	case http.StatusTooManyRequests:
		err.Code = ErrCodeRateLimited
		if err.Message == "" {
			err.Message = "Rate limit exceeded"
		}
	case http.StatusBadRequest:
		err.Code = ErrCodeValidation
	case http.StatusInternalServerError:
		err.Code = ErrCodeInternal
		err.Message = "Internal server error"
	}

	return err
}

// RateLimitError is returned when rate limit is exceeded
type RateLimitError struct {
	RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("rate limited, retry after %v", e.RetryAfter)
}

// NetworkError is returned for network failures
type NetworkError struct {
	Message string
}

func (e *NetworkError) Error() string {
	return e.Message
}

// TimeoutError is returned when request times out
type TimeoutError struct {
	Timeout time.Duration
}

func (e *TimeoutError) Error() string {
	return fmt.Sprintf("request timeout after %v", e.Timeout)
}