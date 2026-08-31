"""
National Labor Platform Python SDK Client
"""

import time
import requests
from typing import Any, Dict, List, Optional, Union
from urllib.parse import urlencode

from .exceptions import (
    NLPError,
    AuthenticationError,
    TokenExpiredError,
    RateLimitError,
    ValidationError,
    NotFoundError,
    NetworkError,
    TimeoutError,
    ServerError,
)
from .models import (
    LoginRequest,
    LoginResponse,
    User,
    PaginatedResponse,
    Entity,
    WorkerProfile,
    Inspection,
    Contract,
    License,
    Payment,
    Dispute,
    DashboardStats,
    EnhancedStats,
    ComplianceAlert,
    TrainingRecord,
    Governorate,
    Occupation,
    ISIC4Code,
    AnalyticsData,
    Recommendation,
    RiskAssessment,
    Document,
    Notification,
    AuditLogEntry,
    UploadResponse,
)


class Client:
    """
    Main client for the National Labor Platform API.
    
    Example:
        from nlp_sdk import Client
        
        client = Client(
            base_url="https://api.labor.gov.ye/v2",
            access_token="your-jwt-token",
        )
        
        workers = client.workers.list(governorate="Sana'a", limit=100)
        stats = client.dashboard.stats()
    """

    def __init__(
        self,
        base_url: str = "https://api.labor.gov.ye/v2",
        access_token: Optional[str] = None,
        refresh_token: Optional[str] = None,
        timeout: int = 60,
        max_retries: int = 3,
        locale: str = "en",
        on_token_refresh: Optional[callable] = None,
    ):
        self.base_url = base_url.rstrip("/")
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.timeout = timeout
        self.max_retries = max_retries
        self.locale = locale
        self.on_token_refresh = on_token_refresh
        self._session = requests.Session()

        # Initialize resource managers
        self.auth = AuthResource(self)
        self.entities = EntitiesResource(self)
        self.members = MembersResource(self)
        self.workers = WorkersResource(self)
        self.employers = EmployersResource(self)
        self.inspections = InspectionsResource(self)
        self.contracts = ContractsResource(self)
        self.licenses = LicensesResource(self)
        self.payments = PaymentsResource(self)
        self.disputes = DisputesResource(self)
        self.compliance = ComplianceResource(self)
        self.documents = DocumentsResource(self)
        self.training = TrainingResource(self)
        self.dashboard = DashboardResource(self)
        self.notifications = NotificationsResource(self)
        self.audit = AuditResource(self)
        self.directories = DirectoriesResource(self)
        self.intelligence = IntelligenceResource(self)
        self.uploads = UploadsResource(self)

    def _get_headers(self) -> Dict[str, str]:
        """Build request headers"""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Accept-Language": self.locale,
        }
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def _build_url(self, path: str, params: Optional[Dict[str, Any]] = None) -> str:
        """Build full URL with query parameters"""
        url = f"{self.base_url}{path}"
        if params:
            filtered_params = {k: v for k, v in params.items() if v is not None}
            if filtered_params:
                url = f"{url}?{urlencode(filtered_params)}"
        return url

    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Process API response and handle errors"""
        data = response.json()

        if response.status_code == 401:
            if self.refresh_token:
                self._refresh_access_token()
                raise TokenExpiredError("Access token expired, please retry the request")
            raise AuthenticationError(data.get("errors", {}).get("message", "Authentication failed"))

        if response.status_code == 429:
            retry_after = int(response.headers.get("X-RateLimit-Reset", 60))
            raise RateLimitError(
                data.get("errors", {}).get("message", "Rate limit exceeded"),
                retry_after=retry_after,
            )

        if response.status_code == 404:
            raise NotFoundError()

        if response.status_code == 400:
            raise ValidationError(
                data.get("errors", {}).get("message", "Validation failed"),
                details=data.get("errors", {}).get("details"),
            )

        if response.status_code >= 500:
            raise ServerError(data.get("errors", {}).get("message", "Server error"))

        if response.status_code >= 400:
            raise NLPError(
                data.get("errors", {}).get("message", "API error"),
                code=data.get("errors", {}).get("code", "API_ERROR"),
                status=response.status_code,
            )

        return data

    def _request(
        self,
        method: str,
        path: str,
        params: Optional[Dict[str, Any]] = None,
        json_data: Optional[Dict[str, Any]] = None,
        retry_count: int = 0,
    ) -> Dict[str, Any]:
        """Make HTTP request with retry logic"""
        url = self._build_url(path, params)

        try:
            response = self._session.request(
                method=method,
                url=url,
                headers=self._get_headers(),
                json=json_data,
                timeout=self.timeout,
            )
            return self._handle_response(response)
        except (TokenExpiredError, RateLimitError):
            raise
        except requests.exceptions.Timeout:
            if retry_count < self.max_retries:
                time.sleep(2**retry_count)
                return self._request(method, path, params, json_data, retry_count + 1)
            raise TimeoutError()
        except requests.exceptions.ConnectionError:
            if retry_count < self.max_retries:
                time.sleep(2**retry_count)
                return self._request(method, path, params, json_data, retry_count + 1)
            raise NetworkError()
        except requests.exceptions.RequestException as e:
            raise NetworkError(str(e))

    def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make GET request"""
        return self._request("GET", path, params=params)

    def post(self, path: str, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make POST request"""
        return self._request("POST", path, json_data=json_data)

    def put(self, path: str, json_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make PUT request"""
        return self._request("PUT", path, json_data=json_data)

    def delete(self, path: str) -> Dict[str, Any]:
        """Make DELETE request"""
        return self._request("DELETE", path)

    def _refresh_access_token(self) -> None:
        """Refresh the access token"""
        if not self.refresh_token:
            return

        try:
            response = self._session.post(
                f"{self.base_url}/auth/refresh",
                headers={"Content-Type": "application/json"},
                json={"refreshToken": self.refresh_token},
                timeout=self.timeout,
            )
            data = response.json()
            if data.get("success") and data.get("data"):
                self.access_token = data["data"]["accessToken"]
                self.refresh_token = data["data"]["refreshToken"]
                if self.on_token_refresh:
                    self.on_token_refresh(self.access_token, self.refresh_token)
        except Exception:
            pass


# ============ Resource Classes ============

class BaseResource:
    """Base class for all API resources"""

    def __init__(self, client: Client):
        self._client = client

    def _paginate(self, path: str, params: Optional[Dict[str, Any]] = None) -> PaginatedResponse:
        """Handle paginated response"""
        params = params or {}
        params.setdefault("page", 1)
        params.setdefault("limit", 20)

        data = self._client.get(path, params)
        return PaginatedResponse(**data["data"])


class AuthResource(BaseResource):
    """Authentication endpoints"""

    def login(self, email: str, password: str, remember_me: bool = False) -> LoginResponse:
        """Authenticate and get tokens"""
        data = self._client.post("/auth/login", {"email": email, "password": password, "rememberMe": remember_me})
        return LoginResponse(**data["data"])

    def logout(self) -> None:
        """Logout current session"""
        self._client.post("/auth/logout")

    def me(self) -> User:
        """Get current user"""
        data = self._client.get("/auth/me")
        return User(**data["data"])


class EntitiesResource(BaseResource):
    """Entity management endpoints"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List entities"""
        return self._paginate("/entities", kwargs)

    def get(self, id: str) -> Entity:
        """Get entity by ID"""
        data = self._client.get(f"/entities/{id}")
        return Entity(**data["data"])

    def create(self, **kwargs) -> Entity:
        """Create entity"""
        data = self._client.post("/entities", kwargs)
        return Entity(**data["data"])

    def update(self, id: str, **kwargs) -> Entity:
        """Update entity"""
        data = self._client.put(f"/entities/{id}", kwargs)
        return Entity(**data["data"])

    def delete(self, id: str) -> None:
        """Soft-delete entity"""
        self._client.delete(f"/entities/{id}")


class MembersResource(BaseResource):
    """Member management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List members"""
        return self._paginate("/members", kwargs)

    def get(self, id: str) -> Dict[str, Any]:
        """Get member by ID"""
        data = self._client.get(f"/members/{id}")
        return data["data"]

    def create(self, **kwargs) -> Dict[str, Any]:
        """Create member"""
        data = self._client.post("/members", kwargs)
        return data["data"]

    def update(self, id: str, **kwargs) -> Dict[str, Any]:
        """Update member"""
        data = self._client.put(f"/members/{id}", kwargs)
        return data["data"]


class WorkersResource(BaseResource):
    """Worker management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List workers"""
        return self._paginate("/workers", kwargs)

    def get(self, id: str) -> WorkerProfile:
        """Get worker by ID"""
        data = self._client.get(f"/workers/{id}")
        return WorkerProfile(**data["data"])

    def create(self, **kwargs) -> WorkerProfile:
        """Register new worker"""
        data = self._client.post("/workers", kwargs)
        return WorkerProfile(**data["data"])

    def update(self, id: str, **kwargs) -> WorkerProfile:
        """Update worker"""
        data = self._client.put(f"/workers/{id}", kwargs)
        return WorkerProfile(**data["data"])

    # Self-service portal
    def get_my_profile(self) -> WorkerProfile:
        """Get current worker's profile"""
        data = self._client.get("/worker-portal/profile")
        return WorkerProfile(**data["data"])

    def update_my_profile(self, **kwargs) -> WorkerProfile:
        """Update own profile"""
        data = self._client.put("/worker-portal/profile/update", kwargs)
        return WorkerProfile(**data["data"])

    def get_my_contracts(self) -> List[Contract]:
        """Get current worker's contracts"""
        data = self._client.get("/worker-portal/contracts")
        return [Contract(**item) for item in data["data"]]


class EmployersResource(BaseResource):
    """Employer management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List employers"""
        return self._paginate("/employers", kwargs)

    def get(self, id: str) -> Entity:
        """Get employer by ID"""
        data = self._client.get(f"/employers/{id}")
        return Entity(**data["data"])

    def create(self, **kwargs) -> Entity:
        """Register employer"""
        data = self._client.post("/employers", kwargs)
        return Entity(**data["data"])

    def update(self, id: str, **kwargs) -> Entity:
        """Update employer"""
        data = self._client.put(f"/employers/{id}", kwargs)
        return Entity(**data["data"])


class InspectionsResource(BaseResource):
    """Inspection management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List inspections"""
        return self._paginate("/inspections", kwargs)

    def get(self, id: str) -> Inspection:
        """Get inspection by ID"""
        data = self._client.get(f"/inspections/{id}")
        return Inspection(**data["data"])

    def create(self, **kwargs) -> Inspection:
        """Create inspection"""
        data = self._client.post("/inspections", kwargs)
        return Inspection(**data["data"])

    def update(self, id: str, **kwargs) -> Inspection:
        """Update inspection"""
        data = self._client.put(f"/inspections/{id}", kwargs)
        return Inspection(**data["data"])

    def complete(self, id: str, **kwargs) -> Inspection:
        """Complete inspection with findings"""
        data = self._client.post(f"/inspections/{id}/complete", kwargs)
        return Inspection(**data["data"])


class ContractsResource(BaseResource):
    """Contract management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List contracts"""
        return self._paginate("/contracts", kwargs)

    def get(self, id: str) -> Contract:
        """Get contract by ID"""
        data = self._client.get(f"/contracts/{id}")
        return Contract(**data["data"])

    def create(self, **kwargs) -> Contract:
        """Create contract"""
        data = self._client.post("/contracts", kwargs)
        return Contract(**data["data"])

    def terminate(self, id: str, reason: str, **kwargs) -> Contract:
        """Terminate contract"""
        data = self._client.post(f"/contracts/{id}/terminate", {"reason": reason, **kwargs})
        return Contract(**data["data"])


class LicensesResource(BaseResource):
    """License management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List licenses"""
        return self._paginate("/licenses", kwargs)

    def get(self, id: str) -> License:
        """Get license by ID"""
        data = self._client.get(f"/licenses/{id}")
        return License(**data["data"])

    def create(self, **kwargs) -> License:
        """Create license"""
        data = self._client.post("/licenses", kwargs)
        return License(**data["data"])

    def renew(self, id: str, new_expiry_date: str) -> License:
        """Renew license"""
        data = self._client.post(f"/licenses/{id}/renew", {"newExpiryDate": new_expiry_date})
        return License(**data["data"])


class PaymentsResource(BaseResource):
    """Payment management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List payments"""
        return self._paginate("/payments", kwargs)

    def get(self, id: str) -> Payment:
        """Get payment by ID"""
        data = self._client.get(f"/payments/{id}")
        return Payment(**data["data"])

    def create(self, **kwargs) -> Payment:
        """Create payment"""
        data = self._client.post("/payments", kwargs)
        return Payment(**data["data"])

    def verify(self, id: str, verification_reference: str) -> Payment:
        """Verify payment"""
        data = self._client.post(f"/payments/{id}/verify", {"verificationReference": verification_reference})
        return Payment(**data["data"])


class DisputesResource(BaseResource):
    """Dispute management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List disputes"""
        return self._paginate("/disputes", kwargs)

    def get(self, id: str) -> Dispute:
        """Get dispute by ID"""
        data = self._client.get(f"/disputes/{id}")
        return Dispute(**data["data"])

    def create(self, **kwargs) -> Dispute:
        """Create dispute"""
        data = self._client.post("/disputes", kwargs)
        return Dispute(**data["data"])

    def resolve(self, id: str, resolution: str, **kwargs) -> Dispute:
        """Resolve dispute"""
        data = self._client.post(f"/disputes/{id}/resolve", {"resolution": resolution, **kwargs})
        return Dispute(**data["data"])


class ComplianceResource(BaseResource):
    """Compliance management"""

    def alerts(self, **kwargs) -> PaginatedResponse:
        """List compliance alerts"""
        return self._paginate("/compliance/alerts", kwargs)

    def acknowledge(self, id: str) -> ComplianceAlert:
        """Acknowledge alert"""
        data = self._client.put(f"/compliance/alerts/{id}/acknowledge")
        return ComplianceAlert(**data["data"])

    def resolve(self, id: str, resolution: str, **kwargs) -> ComplianceAlert:
        """Resolve alert"""
        data = self._client.put(f"/compliance/alerts/{id}/resolve", {"resolution": resolution, **kwargs})
        return ComplianceAlert(**data["data"])


class DocumentsResource(BaseResource):
    """Document management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List documents"""
        return self._paginate("/documents", kwargs)

    def get(self, id: str) -> Document:
        """Get document by ID"""
        data = self._client.get(f"/documents/{id}")
        return Document(**data["data"])

    def delete(self, id: str) -> None:
        """Delete document"""
        self._client.delete(f"/documents/{id}")


class TrainingResource(BaseResource):
    """Training management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List training records"""
        return self._paginate("/training", kwargs)

    def get(self, id: str) -> TrainingRecord:
        """Get training record by ID"""
        data = self._client.get(f"/training/{id}")
        return TrainingRecord(**data["data"])

    def create(self, **kwargs) -> TrainingRecord:
        """Create training record"""
        data = self._client.post("/training", kwargs)
        return TrainingRecord(**data["data"])


class DashboardResource(BaseResource):
    """Dashboard endpoints"""

    def stats(self, **kwargs) -> DashboardStats:
        """Get dashboard statistics"""
        data = self._client.get("/dashboard/stats", kwargs)
        return DashboardStats(**data["data"])

    def enhanced_stats(self, **kwargs) -> EnhancedStats:
        """Get enhanced statistics with predictions"""
        data = self._client.get("/dashboard/enhanced-stats", kwargs)
        return EnhancedStats(**data["data"])


class NotificationsResource(BaseResource):
    """Notification management"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List notifications"""
        return self._paginate("/notifications", kwargs)

    def mark_as_read(self, id: str) -> Notification:
        """Mark notification as read"""
        data = self._client.put(f"/notifications/{id}/read")
        return Notification(**data["data"])

    def mark_all_as_read(self) -> None:
        """Mark all notifications as read"""
        self._client.put("/notifications/read-all")


class AuditResource(BaseResource):
    """Audit log endpoints"""

    def list(self, **kwargs) -> PaginatedResponse:
        """List audit log entries"""
        return self._paginate("/audit-log", kwargs)


class DirectoriesResource(BaseResource):
    """National directory endpoints"""

    def governorates(self, include_districts: bool = False) -> List[Governorate]:
        """Get governorates"""
        data = self._client.get("/geography/governorates", {"includeDistricts": include_districts})
        return [Governorate(**item) for item in data["data"]]

    def occupations(self, **kwargs) -> PaginatedResponse:
        """Get occupations"""
        return self._paginate("/national-directories/occupations", kwargs)

    def isic4(self, **kwargs) -> PaginatedResponse:
        """Get ISIC-4 codes"""
        return self._paginate("/isic4", kwargs)


class IntelligenceResource(BaseResource):
    """AI-powered intelligence endpoints"""

    def analytics(self, metric: str, **kwargs) -> AnalyticsData:
        """Get analytics data"""
        data = self._client.get("/intelligence/analytics", {"metric": metric, **kwargs})
        return AnalyticsData(**data["data"])

    def recommendations(self, **kwargs) -> List[Recommendation]:
        """Get AI recommendations"""
        data = self._client.get("/intelligence/recommendations", kwargs)
        return [Recommendation(**item) for item in data["data"]]

    def risk_assessment(self, entity_type: str, entity_id: str, **kwargs) -> RiskAssessment:
        """Perform risk assessment"""
        data = self._client.post("/intelligence/risk-assessment", {
            "entityType": entity_type,
            "entityId": entity_id,
            **kwargs,
        })
        return RiskAssessment(**data["data"])


class UploadsResource(BaseResource):
    """File upload endpoints"""

    def upload(self, file_path: str, **kwargs) -> UploadResponse:
        """Upload a file"""
        with open(file_path, "rb") as f:
            files = {"file": (file_path.split("/")[-1], f)}
            data = self._client._session.post(
                f"{self._client.base_url}/uploads",
                headers={"Authorization": f"Bearer {self._client.access_token}"},
                files=files,
                data=kwargs,
                timeout=self._client.timeout,
            )
            return UploadResponse(**data.json()["data"])

    def delete(self, id: str) -> None:
        """Delete upload"""
        self._client.delete(f"/uploads/{id}")