package nlp

import (
	"context"
	"fmt"
)

// ============ Auth Resource ============

type AuthResource struct {
	client *Client
}

func (r *AuthResource) Login(ctx context.Context, req *LoginRequest) (*LoginResponse, error) {
	var resp LoginResponse
	if err := r.client.Post(ctx, "/auth/login", req, &resp); err != nil {
		return nil, err
	}
	r.client.SetAccessToken(resp.AccessToken)
	r.client.SetRefreshToken(resp.RefreshToken)
	return &resp, nil
}

func (r *AuthResource) Logout(ctx context.Context) error {
	return r.client.Post(ctx, "/auth/logout", nil, nil)
}

func (r *AuthResource) Me(ctx context.Context) (*User, error) {
	var user User
	err := r.client.Get(ctx, "/auth/me", nil, &user)
	return &user, err
}

// ============ Entities Resource ============

type EntitiesResource struct {
	client *Client
}

type EntityListParams struct {
	Page        int          `json:"page,omitempty"`
	Limit       int          `json:"limit,omitempty"`
	Governorate string       `json:"governorate,omitempty"`
	Type        EntityType   `json:"type,omitempty"`
	Status      EntityStatus `json:"status,omitempty"`
	Search      string       `json:"search,omitempty"`
}

func (r *EntitiesResource) List(ctx context.Context, params *EntityListParams) (*PaginatedResponse[Entity], error) {
	var resp PaginatedResponse[Entity]
	p := structToMap(params)
	err := r.client.Get(ctx, "/entities", p, &resp)
	return &resp, err
}

func (r *EntitiesResource) Get(ctx context.Context, id string) (*Entity, error) {
	var entity Entity
	err := r.client.Get(ctx, fmt.Sprintf("/entities/%s", id), nil, &entity)
	return &entity, err
}

func (r *EntitiesResource) Create(ctx context.Context, entity map[string]interface{}) (*Entity, error) {
	var resp Entity
	err := r.client.Post(ctx, "/entities", entity, &resp)
	return &resp, err
}

func (r *EntitiesResource) Update(ctx context.Context, id string, updates map[string]interface{}) (*Entity, error) {
	var resp Entity
	err := r.client.Put(ctx, fmt.Sprintf("/entities/%s", id), updates, &resp)
	return &resp, err
}

func (r *EntitiesResource) Delete(ctx context.Context, id string) error {
	return r.client.Delete(ctx, fmt.Sprintf("/entities/%s", id))
}

// ============ Workers Resource ============

type WorkersResource struct {
	client *Client
}

type WorkerListParams struct {
	Page         int          `json:"page,omitempty"`
	Limit        int          `json:"limit,omitempty"`
	Governorate  string       `json:"governorate,omitempty"`
	EmployerID   string       `json:"employerId,omitempty"`
	ProfessionID string       `json:"professionId,omitempty"`
	Status       WorkerStatus `json:"status,omitempty"`
}

func (r *WorkersResource) List(ctx context.Context, params *WorkerListParams) (*PaginatedResponse[WorkerProfile], error) {
	var resp PaginatedResponse[WorkerProfile]
	p := structToMap(params)
	err := r.client.Get(ctx, "/workers", p, &resp)
	return &resp, err
}

func (r *WorkersResource) Get(ctx context.Context, id string) (*WorkerProfile, error) {
	var worker WorkerProfile
	err := r.client.Get(ctx, fmt.Sprintf("/workers/%s", id), nil, &worker)
	return &worker, err
}

func (r *WorkersResource) Create(ctx context.Context, worker map[string]interface{}) (*WorkerProfile, error) {
	var resp WorkerProfile
	err := r.client.Post(ctx, "/workers", worker, &resp)
	return &resp, err
}

func (r *WorkersResource) Update(ctx context.Context, id string, updates map[string]interface{}) (*WorkerProfile, error) {
	var resp WorkerProfile
	err := r.client.Put(ctx, fmt.Sprintf("/workers/%s", id), updates, &resp)
	return &resp, err
}

// ============ Employers Resource ============

type EmployersResource struct {
	client *Client
}

type EmployerListParams struct {
	Page       int          `json:"page,omitempty"`
	Limit      int          `json:"limit,omitempty"`
	Governorate string      `json:"governorate,omitempty"`
	SectorID   string       `json:"sectorId,omitempty"`
	Status     EntityStatus `json:"status,omitempty"`
}

func (r *EmployersResource) List(ctx context.Context, params *EmployerListParams) (*PaginatedResponse[Entity], error) {
	var resp PaginatedResponse[Entity]
	p := structToMap(params)
	err := r.client.Get(ctx, "/employers", p, &resp)
	return &resp, err
}

func (r *EmployersResource) Get(ctx context.Context, id string) (*Entity, error) {
	var entity Entity
	err := r.client.Get(ctx, fmt.Sprintf("/employers/%s", id), nil, &entity)
	return &entity, err
}

// ============ Inspections Resource ============

type InspectionsResource struct {
	client *Client
}

type InspectionListParams struct {
	Page        int                `json:"page,omitempty"`
	Limit       int                `json:"limit,omitempty"`
	Governorate string             `json:"governorate,omitempty"`
	EmployerID  string             `json:"employerId,omitempty"`
	InspectorID string             `json:"inspectorId,omitempty"`
	Status      InspectionStatus   `json:"status,omitempty"`
	Type        InspectionType     `json:"type,omitempty"`
}

func (r *InspectionsResource) List(ctx context.Context, params *InspectionListParams) (*PaginatedResponse[Inspection], error) {
	var resp PaginatedResponse[Inspection]
	p := structToMap(params)
	err := r.client.Get(ctx, "/inspections", p, &resp)
	return &resp, err
}

func (r *InspectionsResource) Get(ctx context.Context, id string) (*Inspection, error) {
	var inspection Inspection
	err := r.client.Get(ctx, fmt.Sprintf("/inspections/%s", id), nil, &inspection)
	return &inspection, err
}

func (r *InspectionsResource) Create(ctx context.Context, data map[string]interface{}) (*Inspection, error) {
	var resp Inspection
	err := r.client.Post(ctx, "/inspections", data, &resp)
	return &resp, err
}

func (r *InspectionsResource) Update(ctx context.Context, id string, updates map[string]interface{}) (*Inspection, error) {
	var resp Inspection
	err := r.client.Put(ctx, fmt.Sprintf("/inspections/%s", id), updates, &resp)
	return &resp, err
}

func (r *InspectionsResource) Complete(ctx context.Context, id string, completionData map[string]interface{}) (*Inspection, error) {
	var resp Inspection
	err := r.client.Post(ctx, fmt.Sprintf("/inspections/%s/complete", id), completionData, &resp)
	return &resp, err
}

// ============ Contracts Resource ============

type ContractsResource struct {
	client *Client
}

type ContractListParams struct {
	Page       int            `json:"page,omitempty"`
	Limit      int            `json:"limit,omitempty"`
	EmployerID string         `json:"employerId,omitempty"`
	WorkerID   string         `json:"workerId,omitempty"`
	Status     ContractStatus `json:"status,omitempty"`
}

func (r *ContractsResource) List(ctx context.Context, params *ContractListParams) (*PaginatedResponse[Contract], error) {
	var resp PaginatedResponse[Contract]
	p := structToMap(params)
	err := r.client.Get(ctx, "/contracts", p, &resp)
	return &resp, err
}

func (r *ContractsResource) Get(ctx context.Context, id string) (*Contract, error) {
	var contract Contract
	err := r.client.Get(ctx, fmt.Sprintf("/contracts/%s", id), nil, &contract)
	return &contract, err
}

func (r *ContractsResource) Create(ctx context.Context, data map[string]interface{}) (*Contract, error) {
	var resp Contract
	err := r.client.Post(ctx, "/contracts", data, &resp)
	return &resp, err
}

func (r *ContractsResource) Terminate(ctx context.Context, id, reason string) (*Contract, error) {
	var resp Contract
	body := map[string]interface{}{"reason": reason}
	err := r.client.Post(ctx, fmt.Sprintf("/contracts/%s/terminate", id), body, &resp)
	return &resp, err
}

// ============ Licenses Resource ============

type LicensesResource struct {
	client *Client
}

type LicenseListParams struct {
	Page   int           `json:"page,omitempty"`
	Limit  int           `json:"limit,omitempty"`
	Type   string        `json:"type,omitempty"`
	Status LicenseStatus `json:"status,omitempty"`
}

func (r *LicensesResource) List(ctx context.Context, params *LicenseListParams) (*PaginatedResponse[License], error) {
	var resp PaginatedResponse[License]
	p := structToMap(params)
	err := r.client.Get(ctx, "/licenses", p, &resp)
	return &resp, err
}

func (r *LicensesResource) Get(ctx context.Context, id string) (*License, error) {
	var license License
	err := r.client.Get(ctx, fmt.Sprintf("/licenses/%s", id), nil, &license)
	return &license, err
}

func (r *LicensesResource) Create(ctx context.Context, data map[string]interface{}) (*License, error) {
	var resp License
	err := r.client.Post(ctx, "/licenses", data, &resp)
	return &resp, err
}

func (r *LicensesResource) Renew(ctx context.Context, id, newExpiryDate string) (*License, error) {
	var resp License
	body := map[string]interface{}{"newExpiryDate": newExpiryDate}
	err := r.client.Post(ctx, fmt.Sprintf("/licenses/%s/renew", id), body, &resp)
	return &resp, err
}

// ============ Payments Resource ============

type PaymentsResource struct {
	client *Client
}

type PaymentListParams struct {
	Page       int           `json:"page,omitempty"`
	Limit      int           `json:"limit,omitempty"`
	EmployerID string        `json:"employerId,omitempty"`
	Type       string        `json:"type,omitempty"`
	Status     PaymentStatus `json:"status,omitempty"`
}

func (r *PaymentsResource) List(ctx context.Context, params *PaymentListParams) (*PaginatedResponse[Payment], error) {
	var resp PaginatedResponse[Payment]
	p := structToMap(params)
	err := r.client.Get(ctx, "/payments", p, &resp)
	return &resp, err
}

func (r *PaymentsResource) Get(ctx context.Context, id string) (*Payment, error) {
	var payment Payment
	err := r.client.Get(ctx, fmt.Sprintf("/payments/%s", id), nil, &payment)
	return &payment, err
}

func (r *PaymentsResource) Create(ctx context.Context, data map[string]interface{}) (*Payment, error) {
	var resp Payment
	err := r.client.Post(ctx, "/payments", data, &resp)
	return &resp, err
}

func (r *PaymentsResource) Verify(ctx context.Context, id, verificationRef string) (*Payment, error) {
	var resp Payment
	body := map[string]interface{}{"verificationReference": verificationRef}
	err := r.client.Post(ctx, fmt.Sprintf("/payments/%s/verify", id), body, &resp)
	return &resp, err
}

// ============ Disputes Resource ============

type DisputesResource struct {
	client *Client
}

type DisputeListParams struct {
	Page   int            `json:"page,omitempty"`
	Limit  int            `json:"limit,omitempty"`
	Status DisputeStatus  `json:"status,omitempty"`
	Type   string         `json:"type,omitempty"`
}

func (r *DisputesResource) List(ctx context.Context, params *DisputeListParams) (*PaginatedResponse[Dispute], error) {
	var resp PaginatedResponse[Dispute]
	p := structToMap(params)
	err := r.client.Get(ctx, "/disputes", p, &resp)
	return &resp, err
}

func (r *DisputesResource) Get(ctx context.Context, id string) (*Dispute, error) {
	var dispute Dispute
	err := r.client.Get(ctx, fmt.Sprintf("/disputes/%s", id), nil, &dispute)
	return &dispute, err
}

func (r *DisputesResource) Create(ctx context.Context, data map[string]interface{}) (*Dispute, error) {
	var resp Dispute
	err := r.client.Post(ctx, "/disputes", data, &resp)
	return &resp, err
}

func (r *DisputesResource) Resolve(ctx context.Context, id, resolution string) (*Dispute, error) {
	var resp Dispute
	body := map[string]interface{}{"resolution": resolution}
	err := r.client.Post(ctx, fmt.Sprintf("/disputes/%s/resolve", id), body, &resp)
	return &resp, err
}

// ============ Compliance Resource ============

type ComplianceResource struct {
	client *Client
}

func (r *ComplianceResource) Alerts(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[ComplianceAlert], error) {
	var resp PaginatedResponse[ComplianceAlert]
	err := r.client.Get(ctx, "/compliance/alerts", params, &resp)
	return &resp, err
}

func (r *ComplianceResource) Acknowledge(ctx context.Context, id string) (*ComplianceAlert, error) {
	var alert ComplianceAlert
	err := r.client.Put(ctx, fmt.Sprintf("/compliance/alerts/%s/acknowledge", id), nil, &alert)
	return &alert, err
}

func (r *ComplianceResource) Resolve(ctx context.Context, id, resolution string) (*ComplianceAlert, error) {
	var alert ComplianceAlert
	body := map[string]interface{}{"resolution": resolution}
	err := r.client.Put(ctx, fmt.Sprintf("/compliance/alerts/%s/resolve", id), body, &alert)
	return &alert, err
}

// ============ Documents Resource ============

type DocumentsResource struct {
	client *Client
}

func (r *DocumentsResource) List(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[Document], error) {
	var resp PaginatedResponse[Document]
	err := r.client.Get(ctx, "/documents", params, &resp)
	return &resp, err
}

func (r *DocumentsResource) Get(ctx context.Context, id string) (*Document, error) {
	var doc Document
	err := r.client.Get(ctx, fmt.Sprintf("/documents/%s", id), nil, &doc)
	return &doc, err
}

func (r *DocumentsResource) Delete(ctx context.Context, id string) error {
	return r.client.Delete(ctx, fmt.Sprintf("/documents/%s", id))
}

// ============ Training Resource ============

type TrainingResource struct {
	client *Client
}

func (r *TrainingResource) List(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[TrainingRecord], error) {
	var resp PaginatedResponse[TrainingRecord]
	err := r.client.Get(ctx, "/training", params, &resp)
	return &resp, err
}

func (r *TrainingResource) Get(ctx context.Context, id string) (*TrainingRecord, error) {
	var record TrainingRecord
	err := r.client.Get(ctx, fmt.Sprintf("/training/%s", id), nil, &record)
	return &record, err
}

func (r *TrainingResource) Create(ctx context.Context, data map[string]interface{}) (*TrainingRecord, error) {
	var resp TrainingRecord
	err := r.client.Post(ctx, "/training", data, &resp)
	return &resp, err
}

// ============ Dashboard Resource ============

type DashboardResource struct {
	client *Client
}

type DashboardStatsParams struct {
	Governorate string `json:"governorate,omitempty"`
	DateRange   string `json:"dateRange,omitempty"`
}

func (r *DashboardResource) Stats(ctx context.Context, params *DashboardStatsParams) (*DashboardStats, error) {
	var stats DashboardStats
	p := structToMap(params)
	err := r.client.Get(ctx, "/dashboard/stats", p, &stats)
	return &stats, err
}

func (r *DashboardResource) EnhancedStats(ctx context.Context, params *DashboardStatsParams) (*EnhancedStats, error) {
	var stats EnhancedStats
	p := structToMap(params)
	err := r.client.Get(ctx, "/dashboard/enhanced-stats", p, &stats)
	return &stats, err
}

// ============ Notifications Resource ============

type NotificationsResource struct {
	client *Client
}

func (r *NotificationsResource) List(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[Notification], error) {
	var resp PaginatedResponse[Notification]
	err := r.client.Get(ctx, "/notifications", params, &resp)
	return &resp, err
}

func (r *NotificationsResource) MarkAsRead(ctx context.Context, id string) (*Notification, error) {
	var notif Notification
	err := r.client.Put(ctx, fmt.Sprintf("/notifications/%s/read", id), nil, &notif)
	return &notif, err
}

func (r *NotificationsResource) MarkAllAsRead(ctx context.Context) error {
	return r.client.Put(ctx, "/notifications/read-all", nil, nil)
}

// ============ Audit Resource ============

type AuditResource struct {
	client *Client
}

func (r *AuditResource) List(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[AuditLogEntry], error) {
	var resp PaginatedResponse[AuditLogEntry]
	err := r.client.Get(ctx, "/audit-log", params, &resp)
	return &resp, err
}

// ============ Directories Resource ============

type DirectoriesResource struct {
	client *Client
}

func (r *DirectoriesResource) Governorates(ctx context.Context, includeDistricts bool) ([]Governorate, error) {
	params := map[string]interface{}{"includeDistricts": includeDistricts}
	var resp []Governorate
	err := r.client.Get(ctx, "/geography/governorates", params, &resp)
	return resp, err
}

func (r *DirectoriesResource) Occupations(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[Occupation], error) {
	var resp PaginatedResponse[Occupation]
	err := r.client.Get(ctx, "/national-directories/occupations", params, &resp)
	return &resp, err
}

func (r *DirectoriesResource) ISIC4(ctx context.Context, params map[string]interface{}) (*PaginatedResponse[ISIC4Code], error) {
	var resp PaginatedResponse[ISIC4Code]
	err := r.client.Get(ctx, "/isic4", params, &resp)
	return &resp, err
}

// ============ Intelligence Resource ============

type IntelligenceResource struct {
	client *Client
}

func (r *IntelligenceResource) Analytics(ctx context.Context, metric, governorate, dateRange string) (*AnalyticsData, error) {
	params := map[string]interface{}{
		"metric":    metric,
		"governorate": governorate,
		"dateRange": dateRange,
	}
	var data AnalyticsData
	err := r.client.Get(ctx, "/intelligence/analytics", params, &data)
	return &data, err
}

func (r *IntelligenceResource) Recommendations(ctx context.Context, category string) ([]Recommendation, error) {
	params := map[string]interface{}{"category": category}
	var resp []Recommendation
	err := r.client.Get(ctx, "/intelligence/recommendations", params, &resp)
	return resp, err
}

func (r *IntelligenceResource) RiskAssessment(ctx context.Context, entityType, entityID string) (*RiskAssessment, error) {
	body := map[string]interface{}{
		"entityType": entityType,
		"entityId":   entityID,
	}
	var resp RiskAssessment
	err := r.client.Post(ctx, "/intelligence/risk-assessment", body, &resp)
	return &resp, err
}

// ============ Uploads Resource ============

type UploadsResource struct {
	client *Client
}

func (r *UploadsResource) Delete(ctx context.Context, id string) error {
	return r.client.Delete(ctx, fmt.Sprintf("/uploads/%s", id))
}

// ============ Helper ============

// structToMap converts a struct to a map for query parameters
func structToMap(v interface{}) map[string]interface{} {
	if v == nil {
		return nil
	}

	data, err := json.Marshal(v)
	if err != nil {
		return nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal(data, &result); err != nil {
		return nil
	}

	// Filter out empty values
	filtered := make(map[string]interface{})
	for k, v := range result {
		if v != nil && v != "" && v != 0 {
			filtered[k] = v
		}
	}
	return filtered
}