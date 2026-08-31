package nlp

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestNewClient(t *testing.T) {
	client := NewClient(
		WithBaseURL("https://api.example.com"),
		WithAccessToken("test-token"),
		WithLocale("ar"),
	)

	if client.baseURL != "https://api.example.com" {
		t.Errorf("Expected base URL to be https://api.example.com, got %s", client.baseURL)
	}
	if client.accessToken != "test-token" {
		t.Errorf("Expected access token to be test-token, got %s", client.accessToken)
	}
	if client.locale != "ar" {
		t.Errorf("Expected locale to be ar, got %s", client.locale)
	}
}

func TestClient_SetAccessToken(t *testing.T) {
	client := NewClient()
	client.SetAccessToken("new-token")

	if token := client.GetAccessToken(); token != "new-token" {
		t.Errorf("Expected token to be new-token, got %s", token)
	}
}

func TestClient_Get_Success(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success":true,"data":{"totalWorkers":1000,"totalEmployers":500,"totalUnions":50,"pendingInspections":20,"activeContracts":2000,"complianceRate":0.85}}`))
	}))
	defer server.Close()

	client := NewClient(WithBaseURL(server.URL))
	stats, err := client.Dashboard.Stats(context.Background(), nil)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if stats.TotalWorkers != 1000 {
		t.Errorf("Expected total workers 1000, got %d", stats.TotalWorkers)
	}
}

func TestClient_Get_NotFound(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`{"success":false,"errors":{"code":"NOT_FOUND","message":"Resource not found"}}`))
	}))
	defer server.Close()

	client := NewClient(WithBaseURL(server.URL))
	_, err := client.Workers.Get(context.Background(), "invalid-uuid")

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("Expected APIError, got %T", err)
	}
	if !apiErr.IsNotFound() {
		t.Error("Expected error to be NotFound")
	}
}

func TestClient_Get_Unauthorized(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"success":false,"errors":{"code":"UNAUTHORIZED","message":"Authentication required"}}`))
	}))
	defer server.Close()

	client := NewClient(WithBaseURL(server.URL))
	_, err := client.Dashboard.Stats(context.Background(), nil)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("Expected APIError, got %T", err)
	}
	if !apiErr.IsUnauthorized() {
		t.Error("Expected error to be Unauthorized")
	}
}

func TestClient_Get_RateLimit(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-RateLimit-Reset", "30")
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte(`{"success":false,"errors":{"code":"RATE_LIMITED","message":"Too many requests"}}`))
	}))
	defer server.Close()

	client := NewClient(WithBaseURL(server.URL), WithMaxRetries(0))
	_, err := client.Dashboard.Stats(context.Background(), nil)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}

	apiErr, ok := err.(*APIError)
	if !ok {
		t.Fatalf("Expected APIError, got %T", err)
	}
	if !apiErr.IsRateLimited() {
		t.Error("Expected error to be rate limited")
	}
}

func TestClient_Headers(t *testing.T) {
	var capturedHeaders http.Header
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedHeaders = r.Header.Clone()
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"success":true,"data":{}}`))
	}))
	defer server.Close()

	client := NewClient(
		WithBaseURL(server.URL),
		WithAccessToken("my-token"),
		WithLocale("ar"),
		WithAPIKey("my-key"),
	)
	_, _ = client.Dashboard.Stats(context.Background(), nil)

	if capturedHeaders.Get("Authorization") != "Bearer my-token" {
		t.Errorf("Expected Authorization header, got %s", capturedHeaders.Get("Authorization"))
	}
	if capturedHeaders.Get("Accept-Language") != "ar" {
		t.Errorf("Expected Accept-Language header to be ar, got %s", capturedHeaders.Get("Accept-Language"))
	}
	if capturedHeaders.Get("X-API-Key") != "my-key" {
		t.Errorf("Expected X-API-Key header, got %s", capturedHeaders.Get("X-API-Key"))
	}
}

func TestStructToMap(t *testing.T) {
	type TestStruct struct {
		Page  int    `json:"page,omitempty"`
		Limit int    `json:"limit,omitempty"`
		Name  string `json:"name,omitempty"`
	}

	s := TestStruct{Page: 1, Limit: 0, Name: "test"}
	m := structToMap(&s)

	if m["page"] != float64(1) {
		t.Errorf("Expected page=1, got %v", m["page"])
	}
	if _, ok := m["limit"]; ok {
		t.Error("Expected limit to be omitted")
	}
	if m["name"] != "test" {
		t.Errorf("Expected name=test, got %v", m["name"])
	}
}