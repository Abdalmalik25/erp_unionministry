package nlp

import (
	"encoding/json"
	"time"
)

// ============ Authentication ============

type LoginRequest struct {
	Email       string `json:"email"`
	Password    string `json:"password"`
	RememberMe  bool   `json:"rememberMe,omitempty"`
}

type LoginResponse struct {
	AccessToken  string    `json:"accessToken"`
	RefreshToken string    `json:"refreshToken"`
	ExpiresIn    int       `json:"expiresIn"`
	User         *User     `json:"user"`
}

type User struct {
	ID             string   `json:"id"`
	Email          string   `json:"email"`
	Name           string   `json:"name"`
	Role           string   `json:"role"`
	UserType       string   `json:"userType"`
	OrganizationID *string  `json:"organizationId,omitempty"`
	Governorate    *string  `json:"governorate,omitempty"`
	Directorate    *string  `json:"directorate,omitempty"`
	Permissions    []string `json:"permissions"`
	MFAEnabled     bool     `json:"mfaEnabled"`
}

// ============ Entities ============

type EntityType string

const (
	EntityTypeUnion                 EntityType = "union"
	EntityTypeEmployer              EntityType = "employer"
	EntityTypeCooperative           EntityType = "cooperative"
	EntityTypeProfessionalAssoc     EntityType = "professional_association"
)

type EntityStatus string

const (
	EntityStatusActive           EntityStatus = "active"
	EntityStatusInactive         EntityStatus = "inactive"
	EntityStatusSuspended        EntityStatus = "suspended"
	EntityStatusUnderInvestigation EntityStatus = "under_investigation"
	EntityStatusDissolved       EntityStatus = "dissolved"
)

type Entity struct {
	ID                string       `json:"id"`
	Name              string       `json:"name"`
	NameAr            string       `json:"nameAr"`
	Type              EntityType   `json:"type"`
	Status            EntityStatus `json:"status"`
	RegistrationNumber *string    `json:"registrationNumber,omitempty"`
	RegistrationDate   *string    `json:"registrationDate,omitempty"`
	ExpiryDate         *string    `json:"expiryDate,omitempty"`
	Sector             *string    `json:"sector,omitempty"`
	IsicCode           *string    `json:"isicCode,omitempty"`
	LicenseNumber      *string    `json:"licenseNumber,omitempty"`
	LicenseExpiry      *string    `json:"licenseExpiry,omitempty"`
	Address            *string    `json:"address,omitempty"`
	Governorate        *string    `json:"governorate,omitempty"`
	District           *string    `json:"district,omitempty"`
	ContactPerson      *string    `json:"contactPerson,omitempty"`
	ContactEmail       *string    `json:"contactEmail,omitempty"`
	ContactPhone       *string    `json:"contactPhone,omitempty"`
	Website            *string    `json:"website,omitempty"`
	Logo               *string    `json:"logo,omitempty"`
	CreatedAt          time.Time  `json:"createdAt"`
	UpdatedAt          time.Time  `json:"updatedAt"`
}

// ============ Workers ============

type WorkerStatus string

const (
	WorkerStatusActive     WorkerStatus = "active"
	WorkerStatusSuspended  WorkerStatus = "suspended"
	WorkerStatusTerminated WorkerStatus = "terminated"
	WorkerStatusEmigrated  WorkerStatus = "emigrated"
	WorkerStatusDeceased   WorkerStatus = "deceased"
)

type WorkerProfile struct {
	ID              string       `json:"id"`
	FirstName       string       `json:"firstName"`
	FirstNameAr     string       `json:"firstNameAr"`
	LastName        string       `json:"lastName"`
	LastNameAr      string       `json:"lastNameAr"`
	NationalID      string       `json:"nationalId"`
	PassportNumber  *string      `json:"passportNumber,omitempty"`
	Nationality     *string      `json:"nationality,omitempty"`
	DateOfBirth     *string      `json:"dateOfBirth,omitempty"`
	Gender          *string      `json:"gender,omitempty"`
	MaritalStatus   *string      `json:"maritalStatus,omitempty"`
	Email           *string      `json:"email,omitempty"`
	Phone           *string      `json:"phone,omitempty"`
	Mobile          *string      `json:"mobile,omitempty"`
	Address         *string      `json:"address,omitempty"`
	Governorate     *string      `json:"governorate,omitempty"`
	District        *string      `json:"district,omitempty"`
	EducationLevel  *string      `json:"educationLevel,omitempty"`
	OccupationID    *string      `json:"occupationId,omitempty"`
	OccupationTitle *string      `json:"occupationTitle,omitempty"`
	EmployerID      *string      `json:"employerId,omitempty"`
	EmployerName    *string      `json:"employerName,omitempty"`
	ContractType    *string      `json:"contractType,omitempty"`
	MonthlyWage     *float64     `json:"monthlyWage,omitempty"`
	StartDate       *string      `json:"startDate,omitempty"`
	Status          WorkerStatus `json:"status"`
	PhotoURL        *string      `json:"photoUrl,omitempty"`
	CreatedAt       time.Time   `json:"createdAt"`
	UpdatedAt       time.Time   `json:"updatedAt"`
}

// ============ Inspections ============

type InspectionStatus string

const (
	InspectionStatusScheduled   InspectionStatus = "scheduled"
	InspectionStatusInProgress InspectionStatus = "in_progress"
	InspectionStatusCompleted  InspectionStatus = "completed"
	InspectionStatusCancelled InspectionStatus = "cancelled"
)

type InspectionType string

const (
	InspectionTypeRoutine     InspectionType = "routine"
	InspectionTypeComplaint   InspectionType = "complaint"
	InspectionTypeFollowUp   InspectionType = "follow_up"
	InspectionTypeScheduled   InspectionType = "scheduled"
	InspectionTypeUnannounced InspectionType = "unannounced"
)

type Violation struct {
	ID              string   `json:"id"`
	InspectionID    string   `json:"inspectionId"`
	Type            string   `json:"type"`
	Description     string   `json:"description"`
	DescriptionAr   string   `json:"descriptionAr"`
	LegalReference  *string  `json:"legalReference,omitempty"`
	Severity        string   `json:"severity"`
	Fine            *float64 `json:"fine,omitempty"`
	Status          string   `json:"status"`
	Resolution      *string  `json:"resolution,omitempty"`
	ResolvedAt      *string  `json:"resolvedAt,omitempty"`
}

type Inspection struct {
	ID              string            `json:"id"`
	EmployerID      string            `json:"employerId"`
	InspectorID    *string           `json:"inspectorId,omitempty"`
	Type            InspectionType    `json:"type"`
	Status          InspectionStatus  `json:"status"`
	ScheduledDate   string            `json:"scheduledDate"`
	ActualDate      *string           `json:"actualDate,omitempty"`
	Location       *string           `json:"location,omitempty"`
	Findings       []json.RawMessage `json:"findings,omitempty"`
	Violations     []Violation       `json:"violations,omitempty"`
	Recommendations *string          `json:"recommendations,omitempty"`
	InspectorNotes *string           `json:"inspectorNotes,omitempty"`
	Photos         []string          `json:"photos,omitempty"`
	CreatedAt      time.Time         `json:"createdAt"`
	UpdatedAt      time.Time         `json:"updatedAt"`
}

// ============ Contracts ============

type ContractStatus string

const (
	ContractStatusDraft     ContractStatus = "draft"
	ContractStatusPending  ContractStatus = "pending"
	ContractStatusActive   ContractStatus = "active"
	ContractStatusExpired  ContractStatus = "expired"
	ContractStatusTerminated ContractStatus = "terminated"
	ContractStatusRenewed  ContractStatus = "renewed"
)

type Contract struct {
	ID               string         `json:"id"`
	EmployerID       string         `json:"employerId"`
	WorkerID         string         `json:"workerId"`
	ContractNumber   *string        `json:"contractNumber,omitempty"`
	Type             string         `json:"type"`
	StartDate        string         `json:"startDate"`
	EndDate          *string        `json:"endDate,omitempty"`
	Status           ContractStatus `json:"status"`
	Position         string         `json:"position"`
	OccupationID     *string        `json:"occupationId,omitempty"`
	MonthlySalary    *float64       `json:"monthlySalary,omitempty"`
	Currency         string         `json:"currency"`
	WorkingHours     *int           `json:"workingHours,omitempty"`
	ProbationPeriod  *int           `json:"probationPeriod,omitempty"`
	NoticePeriod     *int           `json:"noticePeriod,omitempty"`
	TerminationReason *string       `json:"terminationReason,omitempty"`
	TerminatedAt     *string        `json:"terminatedAt,omitempty"`
	DocumentURL      *string        `json:"documentUrl,omitempty"`
	CreatedAt        time.Time      `json:"createdAt"`
	UpdatedAt        time.Time      `json:"updatedAt"`
}

// ============ Licenses ============

type LicenseStatus string

const (
	LicenseStatusValid    LicenseStatus = "valid"
	LicenseStatusExpired  LicenseStatus = "expired"
	LicenseStatusRevoked  LicenseStatus = "revoked"
	LicenseStatusSuspended LicenseStatus = "suspended"
	LicenseStatusPending   LicenseStatus = "pending"
)

type License struct {
	ID               string        `json:"id"`
	HolderType       string        `json:"holderType"`
	HolderID         string        `json:"holderId"`
	Type             string        `json:"type"`
	Number           string        `json:"number"`
	IssueDate        string        `json:"issueDate"`
	ExpiryDate       string        `json:"expiryDate"`
	Status           LicenseStatus `json:"status"`
	IssuingAuthority *string       `json:"issuingAuthority,omitempty"`
	DocumentURL      *string       `json:"documentUrl,omitempty"`
	Notes            *string       `json:"notes,omitempty"`
	CreatedAt        time.Time     `json:"createdAt"`
	UpdatedAt        time.Time     `json:"updatedAt"`
}

// ============ Payments ============

type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusInitiated PaymentStatus = "initiated"
	PaymentStatusVerified  PaymentStatus = "verified"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

type Payment struct {
	ID                    string        `json:"id"`
	EmployerID            string        `json:"employerId"`
	Type                  string        `json:"type"`
	Amount                float64       `json:"amount"`
	Currency              string        `json:"currency"`
	Reference             *string       `json:"reference,omitempty"`
	Status                PaymentStatus `json:"status"`
	PaymentMethod         *string       `json:"paymentMethod,omitempty"`
	PaymentDate           *string       `json:"paymentDate,omitempty"`
	VerificationReference *string       `json:"verificationReference,omitempty"`
	VerifiedAt            *string       `json:"verifiedAt,omitempty"`
	VerifiedBy            *string       `json:"verifiedBy,omitempty"`
	Period                *string       `json:"period,omitempty"`
	Description           *string       `json:"description,omitempty"`
	CreatedAt             time.Time     `json:"createdAt"`
	UpdatedAt             time.Time     `json:"updatedAt"`
}

// ============ Disputes ============

type DisputeStatus string

const (
	DisputeStatusFiled        DisputeStatus = "filed"
	DisputeStatusUnderReview  DisputeStatus = "under_review"
	DisputeStatusMediation    DisputeStatus = "mediation"
	DisputeStatusArbitration  DisputeStatus = "arbitration"
	DisputeStatusResolved     DisputeStatus = "resolved"
	DisputeStatusClosed       DisputeStatus = "closed"
)

type Dispute struct {
	ID                 string         `json:"id"`
	FilingNumber      *string        `json:"filingNumber,omitempty"`
	Type              string         `json:"type"`
	Status            DisputeStatus  `json:"status"`
	WorkerID          *string        `json:"workerId,omitempty"`
	EmployerID        *string        `json:"employerId,omitempty"`
	Subject           string         `json:"subject"`
	Description       string         `json:"description"`
	FiledAt           *string        `json:"filedAt,omitempty"`
	HearingDate       *string        `json:"hearingDate,omitempty"`
	Decision          *string        `json:"decision,omitempty"`
	ResolvedAt        *string        `json:"resolvedAt,omitempty"`
	ImplementationDate *string       `json:"implementationDate,omitempty"`
	CreatedAt         time.Time      `json:"createdAt"`
	UpdatedAt         time.Time      `json:"updatedAt"`
}

// ============ Dashboard ============

type DashboardStats struct {
	TotalWorkers        int             `json:"totalWorkers"`
	TotalEmployers      int             `json:"totalEmployers"`
	TotalUnions         int             `json:"totalUnions"`
	PendingInspections  int             `json:"pendingInspections"`
	ActiveContracts     int             `json:"activeContracts"`
	ComplianceRate      float64         `json:"complianceRate"`
	RecentActivity      []json.RawMessage `json:"recentActivity,omitempty"`
}

type EnhancedStats struct {
	Summary     map[string]float64                    `json:"summary"`
	Trends      map[string]TrendData                  `json:"trends"`
	Predictions map[string]PredictionData              `json:"predictions"`
}

type TrendData struct {
	Current  float64 `json:"current"`
	Previous float64 `json:"previous"`
	Change   float64 `json:"change"`
	Trend    string  `json:"trend"`
}

type PredictionData struct {
	Value      float64 `json:"value"`
	Confidence float64 `json:"confidence"`
	Timeframe  string  `json:"timeframe"`
}

// ============ Compliance ============

type AlertSeverity string

const (
	AlertSeverityInfo     AlertSeverity = "info"
	AlertSeverityWarning  AlertSeverity = "warning"
	AlertSeverityCritical AlertSeverity = "critical"
)

type ComplianceAlert struct {
	ID             string        `json:"id"`
	EntityType     string        `json:"entityType"`
	EntityID       string        `json:"entityId"`
	Type           string        `json:"type"`
	Severity       AlertSeverity `json:"severity"`
	Title          string        `json:"title"`
	Description    string        `json:"description"`
	Status         string        `json:"status"`
	AcknowledgedAt *string       `json:"acknowledgedAt,omitempty"`
	AcknowledgedBy *string       `json:"acknowledgedBy,omitempty"`
	ResolvedAt     *string       `json:"resolvedAt,omitempty"`
	ResolvedBy     *string       `json:"resolvedBy,omitempty"`
	Resolution     *string       `json:"resolution,omitempty"`
	CreatedAt      time.Time     `json:"createdAt"`
	UpdatedAt      time.Time     `json:"updatedAt"`
}

// ============ Directories ============

type Governorate struct {
	Code       string               `json:"code"`
	Name       string               `json:"name"`
	NameAr     string               `json:"nameAr"`
	Districts  []District           `json:"districts,omitempty"`
}

type District struct {
	Code   string `json:"code"`
	Name   string `json:"name"`
	NameAr string `json:"nameAr"`
}

type Occupation struct {
	ID          string   `json:"id"`
	Code        string   `json:"code"`
	Name        string   `json:"name"`
	NameAr      string   `json:"nameAr"`
	Sector      *string  `json:"sector,omitempty"`
	Level       *int     `json:"level,omitempty"`
	Description *string  `json:"description,omitempty"`
}

type ISIC4Code struct {
	ID            string  `json:"id"`
	Code          string  `json:"code"`
	Description   string  `json:"description"`
	DescriptionAr *string `json:"descriptionAr,omitempty"`
	Section       *string `json:"section,omitempty"`
}

// ============ Training ============

type TrainingRecord struct {
	ID                string   `json:"id"`
	WorkerID         string   `json:"workerId"`
	Type             string   `json:"type"`
	Title            string   `json:"title"`
	TitleAr          string   `json:"titleAr"`
	Provider         *string  `json:"provider,omitempty"`
	StartDate        *string  `json:"startDate,omitempty"`
	EndDate          *string  `json:"endDate,omitempty"`
	Hours            *int     `json:"hours,omitempty"`
	CertificateIssued bool    `json:"certificateIssued"`
	CertificateNumber *string `json:"certificateNumber,omitempty"`
	Grade            *string  `json:"grade,omitempty"`
	Status           string   `json:"status"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

// ============ Intelligence ============

type AnalyticsData struct {
	Metric    string                  `json:"metric"`
	Timeframe string                  `json:"timeframe"`
	Data      []AnalyticsDataPoint    `json:"data"`
	Summary   map[string]interface{}  `json:"summary"`
	Insights  []string                `json:"insights,omitempty"`
}

type AnalyticsDataPoint struct {
	Date  string  `json:"date"`
	Value float64 `json:"value"`
}

type Recommendation struct {
	ID             string   `json:"id"`
	Category       string   `json:"category"`
	Priority       string   `json:"priority"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Rationale      string   `json:"rationale"`
	ExpectedImpact string   `json:"expectedImpact"`
	Resources      []string `json:"resources,omitempty"`
	Timeline       string   `json:"timeline"`
}

type RiskAssessment struct {
	EntityType     string              `json:"entityType"`
	EntityID       string              `json:"entityId"`
	AssessmentType string              `json:"assessmentType"`
	OverallScore   float64             `json:"overallScore"`
	RiskLevel      string              `json:"riskLevel"`
	Factors        []RiskFactor        `json:"factors"`
	Recommendations []string            `json:"recommendations"`
	LastAssessed   time.Time           `json:"lastAssessed"`
}

type RiskFactor struct {
	Name        string  `json:"name"`
	Score       float64 `json:"score"`
	Weight      float64 `json:"weight"`
	Description string  `json:"description"`
}

// ============ Notifications ============

type Notification struct {
	ID        string                 `json:"id"`
	UserID    string                 `json:"userId"`
	Type      string                 `json:"type"`
	Title     string                 `json:"title"`
	Message   string                 `json:"message"`
	Data      map[string]interface{} `json:"data,omitempty"`
	Read      bool                   `json:"read"`
	ReadAt    *string                `json:"readAt,omitempty"`
	CreatedAt time.Time              `json:"createdAt"`
}

// ============ Documents ============

type Document struct {
	ID          string    `json:"id"`
	EntityType  string    `json:"entityType"`
	EntityID    string    `json:"entityId"`
	Type        string    `json:"type"`
	Name        string    `json:"name"`
	NameAr      *string   `json:"nameAr,omitempty"`
	Number      *string   `json:"number,omitempty"`
	IssueDate   *string   `json:"issueDate,omitempty"`
	ExpiryDate  *string   `json:"expiryDate,omitempty"`
	Issuer      *string   `json:"issuer,omitempty"`
	FileURL     string    `json:"fileUrl"`
	FileSize    *int      `json:"fileSize,omitempty"`
	MimeType    *string   `json:"mimeType,omitempty"`
	Verified    bool      `json:"verified"`
	VerifiedAt  *string   `json:"verifiedAt,omitempty"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

// ============ Upload ============

type UploadResponse struct {
	ID       string `json:"id"`
	URL      string `json:"url"`
	Filename string `json:"filename"`
	Size     int    `json:"size"`
	MimeType string `json:"mimeType"`
}

// ============ Audit ============

type AuditLogEntry struct {
	ID         string    `json:"id"`
	UserID     *string   `json:"userId,omitempty"`
	UserEmail  *string   `json:"userEmail,omitempty"`
	Action     string    `json:"action"`
	EntityType string    `json:"entityType"`
	EntityID   *string   `json:"entityId,omitempty"`
	OldValues  map[string]interface{} `json:"oldValues,omitempty"`
	NewValues  map[string]interface{} `json:"newValues,omitempty"`
	IPAddress  *string   `json:"ipAddress,omitempty"`
	UserAgent  *string   `json:"userAgent,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}