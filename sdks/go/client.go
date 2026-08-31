package nlp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Client is the main API client
type Client struct {
	baseURL       string
	accessToken   string
	refreshToken  string
	httpClient    *http.Client
	timeout       time.Duration
	maxRetries    int
	locale        string
	apiKey        string
	mu            sync.RWMutex

	// Resource groups
	Auth         *AuthResource
	Entities     *EntitiesResource
	Workers      *WorkersResource
	Employers    *EmployersResource
	Inspections  *InspectionsResource
	Contracts    *ContractsResource
	Licenses     *LicensesResource
	Payments     *PaymentsResource
	Disputes     *DisputesResource
	Compliance   *ComplianceResource
	Documents    *DocumentsResource
	Training     *TrainingResource
	Dashboard    *DashboardResource
	Notifications *NotificationsResource
	Audit        *AuditResource
	Directories  *DirectoriesResource
	Intelligence *IntelligenceResource
	Uploads      *UploadsResource
}

// Config holds client configuration
type Config struct {
	BaseURL      string
	AccessToken  string
	RefreshToken string
	Timeout      time.Duration
	MaxRetries   int
	Locale       string
	APIKey       string
}

// Option configures the client
type Option func(*Client)

// WithBaseURL sets the base URL
func WithBaseURL(baseURL string) Option {
	return func(c *Client) { c.baseURL = baseURL }
}

// WithAccessToken sets the access token
func WithAccessToken(token string) Option {
	return func(c *Client) { c.accessToken = token }
}

// WithRefreshToken sets the refresh token
func WithRefreshToken(token string) Option {
	return func(c *Client) { c.refreshToken = token }
}

// WithTimeout sets the request timeout
func WithTimeout(timeout time.Duration) Option {
	return func(c *Client) { c.timeout = timeout }
}

// WithMaxRetries sets the maximum retry attempts
func WithMaxRetries(retries int) Option {
	return func(c *Client) { c.maxRetries = retries }
}

// WithLocale sets the locale (en/ar)
func WithLocale(locale string) Option {
	return func(c *Client) { c.locale = locale }
}

// WithAPIKey sets the API key
func WithAPIKey(key string) Option {
	return func(c *Client) { c.apiKey = key }
}

// WithHTTPClient sets a custom HTTP client
func WithHTTPClient(httpClient *http.Client) Option {
	return func(c *Client) { c.httpClient = httpClient }
}

// NewClient creates a new API client
func NewClient(opts ...Option) *Client {
	c := &Client{
		baseURL:    "https://api.labor.gov.ye/v2",
		timeout:    60 * time.Second,
		maxRetries: 3,
		locale:     "en",
		httpClient: &http.Client{},
	}

	for _, opt := range opts {
		opt(c)
	}

	c.httpClient.Timeout = c.timeout

	// Initialize resource groups
	c.Auth = &AuthResource{client: c}
	c.Entities = &EntitiesResource{client: c}
	c.Workers = &WorkersResource{client: c}
	c.Employers = &EmployersResource{client: c}
	c.Inspections = &InspectionsResource{client: c}
	c.Contracts = &ContractsResource{client: c}
	c.Licenses = &LicensesResource{client: c}
	c.Payments = &PaymentsResource{client: c}
	c.Disputes = &DisputesResource{client: c}
	c.Compliance = &ComplianceResource{client: c}
	c.Documents = &DocumentsResource{client: c}
	c.Training = &TrainingResource{client: c}
	c.Dashboard = &DashboardResource{client: c}
	c.Notifications = &NotificationsResource{client: c}
	c.Audit = &AuditResource{client: c}
	c.Directories = &DirectoriesResource{client: c}
	c.Intelligence = &IntelligenceResource{client: c}
	c.Uploads = &UploadsResource{client: c}

	return c
}

// SetAccessToken sets the current access token
func (c *Client) SetAccessToken(token string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.accessToken = token
}

// SetRefreshToken sets the refresh token
func (c *Client) SetRefreshToken(token string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.refreshToken = token
}

// GetAccessToken returns the current access token
func (c *Client) GetAccessToken() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.accessToken
}

// getHeaders builds request headers
func (c *Client) getHeaders() http.Header {
	c.mu.RLock()
	defer c.mu.RUnlock()

	headers := http.Header{
		"Content-Type":     []string{"application/json"},
		"Accept":           []string{"application/json"},
		"Accept-Language":  []string{c.locale},
	}

	if c.accessToken != "" {
		headers.Set("Authorization", "Bearer "+c.accessToken)
	}
	if c.apiKey != "" {
		headers.Set("X-API-Key", c.apiKey)
	}

	return headers
}

// buildURL constructs the full URL with query parameters
func (c *Client) buildURL(path string, params map[string]interface{}) string {
	base := c.baseURL + path
	if len(params) == 0 {
		return base
	}

	q := url.Values{}
	for k, v := range params {
		if v == nil {
			continue
		}
		q.Set(k, fmt.Sprintf("%v", v))
	}
	return base + "?" + q.Encode()
}

// Do executes an API request with retry logic
func (c *Client) Do(ctx context.Context, method, path string, params map[string]interface{}, body interface{}, result interface{}) error {
	var lastErr error

	for attempt := 0; attempt <= c.maxRetries; attempt++ {
		err := c.do(ctx, method, path, params, body, result)
		if err == nil {
			return nil
		}

		// Don't retry on certain errors
		var apiErr *APIError
		if isAPIError(err, &apiErr) {
			if !apiErr.IsRateLimited() {
				return err
			}
			// Rate limited - wait and retry
			lastErr = err
			time.Sleep(time.Duration(apiErr.RetryAfter) * time.Second)
			continue
		}

		// Network/timeout errors - retry with exponential backoff
		var netErr *NetworkError
		var timeoutErr *TimeoutError
		if isNetworkError(err, &netErr) || isTimeoutError(err, &timeoutErr) {
			lastErr = err
			if attempt < c.maxRetries {
				time.Sleep(time.Duration(1<<attempt) * time.Second)
				continue
			}
		}

		return err
	}

	return lastErr
}

// do executes a single request
func (c *Client) do(ctx context.Context, method, path string, params map[string]interface{}, body interface{}, result interface{}) error {
	var reqBody io.Reader
	if body != nil {
		data, err := json.Marshal(body)
		if err != nil {
			return fmt.Errorf("failed to marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(data)
	}

	fullURL := c.buildURL(path, params)

	req, err := http.NewRequestWithContext(ctx, method, fullURL, reqBody)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header = c.getHeaders()

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if strings.Contains(err.Error(), "timeout") {
			return &TimeoutError{Timeout: c.timeout}
		}
		return &NetworkError{Message: err.Error()}
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &NetworkError{Message: err.Error()}
	}

	var apiResp Response[json.RawMessage]
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return fmt.Errorf("failed to parse response: %w", err)
	}

	if !apiResp.Success {
		var errorMap map[string]interface{}
		json.Unmarshal(respBody, &errorMap)
		return buildAPIError(resp.StatusCode, errorMap)
	}

	if result != nil && apiResp.Data != nil {
		if err := json.Unmarshal(*apiResp.Data, result); err != nil {
			return fmt.Errorf("failed to unmarshal response data: %w", err)
		}
	}

	return nil
}

// Get performs a GET request
func (c *Client) Get(ctx context.Context, path string, params map[string]interface{}, result interface{}) error {
	return c.Do(ctx, http.MethodGet, path, params, nil, result)
}

// Post performs a POST request
func (c *Client) Post(ctx context.Context, path string, body interface{}, result interface{}) error {
	return c.Do(ctx, http.MethodPost, path, nil, body, result)
}

// Put performs a PUT request
func (c *Client) Put(ctx context.Context, path string, body interface{}, result interface{}) error {
	return c.Do(ctx, http.MethodPut, path, nil, body, result)
}

// Delete performs a DELETE request
func (c *Client) Delete(ctx context.Context, path string) error {
	return c.Do(ctx, http.MethodDelete, path, nil, nil, nil)
}

// Helper functions
func isAPIError(err error, target **APIError) bool {
	if apiErr, ok := err.(*APIError); ok {
		*target = apiErr
		return true
	}
	return false
}

func isNetworkError(err error, target **NetworkError) bool {
	if netErr, ok := err.(*NetworkError); ok {
		*target = netErr
		return true
	}
	return false
}

func isTimeoutError(err error, target **TimeoutError) bool {
	if timeoutErr, ok := err.(*TimeoutError); ok {
		*target = timeoutErr
		return true
	}
	return false
}