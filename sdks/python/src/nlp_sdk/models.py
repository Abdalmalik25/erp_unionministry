
"""
NLP SDK Data Models
All models are Pydantic v2 compatible
"""

from datetime import datetime, date
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, Field, ConfigDict
from enum import Enum


# ============ Enums ============

class EntityType(str, Enum):
    UNION = "union"
    EMPLOYER = "employer"
    COOPERATIVE = "cooperative"
    PROFESSIONAL_ASSOCIATION = "professional_association"


class EntityStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    UNDER_INVESTIGATION = "under_investigation"
    DISSOLVED = "dissolved"


class WorkerStatus(str, Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    TERMINATED = "terminated"
    EMIGRATED = "emigrated"
    DECEASED = "deceased"


class InspectionStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class InspectionType(str, Enum):
    ROUTINE = "routine"
    COMPLAINT = "complaint"
    FOLLOW_UP = "follow_up"
    SCHEDULED = "scheduled"
    UNANNOUNCED = "unannounced"


class ContractStatus(str, Enum):
    DRAFT = "draft"
    PENDING = "pending"
    ACTIVE = "active"
    EXPIRED = "expired"
    TERMINATED = "terminated"
    RENEWED = "renewed"


class LicenseStatus(str, Enum):
    VALID = "valid"
    EXPIRED = "expired"
    REVOKED = "revoked"
    SUSPENDED = "suspended"
    PENDING = "pending"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    INITIATED = "initiated"
    VERIFIED = "verified"
    FAILED = "failed"
    REFUNDED = "refunded"


class DisputeStatus(str, Enum):
    FILED = "filed"
    UNDER_REVIEW = "under_review"
    MEDIATION = "mediation"
    ARBITRATION = "arbitration"
    RESOLVED = "resolved"
    CLOSED = "closed"


class AlertSeverity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


# ============ Base Models ============

class PaginationMeta(BaseModel):
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool


class BaseEntity(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    created_at: datetime
    updated_at: datetime
    created_by: Optional[str] = None
    deleted_at: Optional[datetime] = None


class PaginatedResponse(BaseModel):
    items: List[Any]
    pagination: Optional[PaginationMeta] = None


# ============ Authentication ============

class LoginRequest(BaseModel):
    email: str
    password: str
    remember_me: bool = False


class User(BaseModel):
    id: str
    email: str
    name: str
    role: str
    user_type: str
    organization_id: Optional[str] = None
    governorate: Optional[str] = None
    directorate: Optional[str] = None
    permissions: List[str] = Field(default_factory=list)
    mfa_enabled: bool = False


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    user: User


# ============ Entities ============

class Entity(BaseEntity):
    name: str
    name_ar: str
    type: EntityType
    status: EntityStatus
    registration_number: Optional[str] = None
    registration_date: Optional[date] = None
    expiry_date: Optional[date] = None
    sector: Optional[str] = None
    isic_code: Optional[str] = None
    license_number: Optional[str] = None
    license_expiry: Optional[date] = None
    address: Optional[str] = None
    governorate: Optional[str] = None
    district: Optional[str] = None
    contact_person: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None


# ============ Workers ============

class WorkerProfile(BaseEntity):
    first_name: str
    first_name_ar: str
    last_name: str
    last_name_ar: str
    national_id: str
    passport_number: Optional[str] = None
    nationality: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    marital_status: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    address: Optional[str] = None
    governorate: Optional[str] = None
    district: Optional[str] = None
    education_level: Optional[str] = None
    occupation_id: Optional[str] = None
    occupation_title: Optional[str] = None
    employer_id: Optional[str] = None
    employer_name: Optional[str] = None
    contract_type: Optional[str] = None
    employment_status: Optional[str] = None
    monthly_wage: Optional[float] = None
    start_date: Optional[date] = None
    status: WorkerStatus


# ============ Inspections ============

class Violation(BaseModel):
    id: str
    inspection_id: str
    type: str
    description: str
    description_ar: str
    legal_reference: Optional[str] = None
    severity: str
    fine: Optional[float] = None
    status: str = "pending"
    resolution: Optional[str] = None
    resolved_at: Optional[datetime] = None


class Inspection(BaseEntity):
    employer_id: str
    inspector_id: Optional[str] = None
    type: InspectionType
    status: InspectionStatus
    scheduled_date: date
    actual_date: Optional[date] = None
    location: Optional[str] = None
    findings: Optional[List[Dict[str, Any]]] = None
    violations: Optional[List[Violation]] = None
    recommendations: Optional[str] = None
    inspector_notes: Optional[str] = None
    photos: Optional[List[str]] = None


class InspectionCreate(BaseModel):
    employer_id: str
    type: InspectionType
    scheduled_date: date
    location: Optional[str] = None
    notes: Optional[str] = None


class InspectionComplete(BaseModel):
    findings: List[Dict[str, Any]]
    violations: Optional[List[Dict[str, Any]]] = None
    recommendations: Optional[str] = None
    inspector_notes: Optional[str] = None
    photos: Optional[List[str]] = None


# ============ Contracts ============

class Contract(BaseEntity):
    employer_id: str
    worker_id: str
    contract_number: Optional[str] = None
    type: str
    start_date: date
    end_date: Optional[date] = None
    status: ContractStatus
    position: str
    occupation_id: Optional[str] = None
    monthly_salary: Optional[float] = None
    currency: str = "YER"
    working_hours: Optional[int] = None
    probation_period: Optional[int] = None
    notice_period: Optional[int] = None
    termination_reason: Optional[str] = None
    terminated_at: Optional[datetime] = None
    document_url: Optional[str] = None


class ContractCreate(BaseModel):
    employer_id: str
    worker_id: str
    type: str
    start_date: date
    end_date: Optional[date] = None
    position: str
    occupation_id: Optional[str] = None
    monthly_salary: Optional[float] = None
    currency: str = "YER"
    working_hours: Optional[int] = None
    probation_period: Optional[int] = None
    notice_period: Optional[int] = None


# ============ Licenses ============

class License(BaseEntity):
    holder_type: str
    holder_id: str
    type: str
    number: str
    issue_date: date
    expiry_date: date
    status: LicenseStatus
    issuing_authority: Optional[str] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None


class LicenseCreate(BaseModel):
    holder_type: str
    holder_id: str
    type: str
    number: str
    issue_date: date
    expiry_date: date
    issuing_authority: Optional[str] = None
    notes: Optional[str] = None


# ============ Payments ============

class Payment(BaseEntity):
    employer_id: str
    type: str
    amount: float
    currency: str = "YER"
    reference: Optional[str] = None
    status: PaymentStatus
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    verification_reference: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    period: Optional[str] = None
    description: Optional[str] = None


class PaymentCreate(BaseModel):
    employer_id: str
    type: str
    amount: float
    currency: str = "YER"
    payment_method: Optional[str] = None
    payment_date: Optional[date] = None
    period: Optional[str] = None
    description: Optional[str] = None


# ============ Disputes ============

class Dispute(BaseEntity):
    filing_number: Optional[str] = None
    type: str
    status: DisputeStatus
    worker_id: Optional[str] = None
    employer_id: Optional[str] = None
    subject: str
    description: str
    filed_at: Optional[datetime] = None
    hearing_date: Optional[date] = None
    decision: Optional[str] = None
    resolved_at: Optional[datetime] = None
    implementation_date: Optional[date] = None


class DisputeCreate(BaseModel):
    worker_id: Optional[str] = None
    employer_id: Optional[str] = None
    type: str
    subject: str
    description: str


# ============ Compliance ============

class ComplianceAlert(BaseEntity):
    entity_type: str
    entity_id: str
    type: str
    severity: AlertSeverity
    title: str
    description: str
    status: str
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution: Optional[str] = None


# ============ Dashboard ============

class DashboardStats(BaseModel):
    total_workers: int
    total_employers: int
    total_unions: int
    pending_inspections: int
    active_contracts: int
    compliance_rate: float
    recent_activity: List[Dict[str, Any]] = Field(default_factory=list)


class EnhancedStats(BaseModel):
    summary: Dict[str, Any]
    trends: Dict[str, Dict[str, Any]]
    predictions: Dict[str, Dict[str, Any]]


# ============ Training ============

class TrainingRecord(BaseEntity):
    worker_id: str
    type: str
    title: str
    title_ar: str
    provider: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    hours: Optional[int] = None
    certificate_issued: bool = False
    certificate_number: Optional[str] = None
    grade: Optional[str] = None
    status: str = "scheduled"


# ============ Directories ============

class Governorate(BaseModel):
    code: str
    name: str
    name_ar: str
    districts: Optional[List[Dict[str, str]]] = None


class Occupation(BaseModel):
    id: str
    code: str
    name: str
    name_ar: str
    sector: Optional[str] = None
    level: Optional[int] = None
    description: Optional[str] = None


class ISIC4Code(BaseModel):
    id: str
    code: str
    description: str
    description_ar: Optional[str] = None
    section: Optional[str] = None


# ============ Intelligence ============

class AnalyticsData(BaseModel):
    metric: str
    timeframe: str
    data: List[Dict[str, Any]]
    summary: Dict[str, Any]
    insights: List[str] = Field(default_factory=list)


class Recommendation(BaseModel):
    id: str
    category: str
    priority: str
    title: str
    description: str
    rationale: str
    expected_impact: str
    resources: List[str] = Field(default_factory=list)
    timeline: str


class RiskAssessment(BaseModel):
    entity_type: str
    entity_id: str
    assessment_type: str
    overall_score: float
    risk_level: str
    factors: List[Dict[str, Any]]
    recommendations: List[str]
    last_assessed: datetime


# ============ Documents ============

class Document(BaseEntity):
    entity_type: str
    entity_id: str
    type: str
    name: str
    name_ar: Optional[str] = None
    number: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    issuer: Optional[str] = None
    file_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    verified: bool = False
    verified_at: Optional[datetime] = None


# ============ Uploads ============

class UploadResponse(BaseModel):
    id: str
    url: str
    filename: str
    size: int
    mime_type: str


# ============ Notifications ============

class Notification(BaseModel):
    id: str
    user_id: str
    type: str
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime


# ============ Audit ============

class AuditLogEntry(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    action: str
    entity_type: str
    entity_id: Optional[str] = None
    old_values: Optional[Dict[str, Any]] = None
    new_values: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: datetime