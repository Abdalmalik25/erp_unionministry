"""
NLP SDK Analytics Extension
Pandas integration for data science workflows
"""

from typing import Optional, List, Dict, Any
import warnings

try:
    import pandas as pd
    import numpy as np
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    pd = None
    np = None


class DataScienceClient:
    """
    Extended client with pandas DataFrame support for data science workflows.
    
    Requires: pip install national-labor-platform[pandas]
    
    Example:
        from nlp_sdk.analytics import DataScienceClient
        
        client = DataScienceClient(
            base_url="https://api.labor.gov.ye/v2",
            access_token="your-token",
        )
        
        # Get workers as DataFrame
        workers = client.workers.to_dataframe(governorate="Sana'a")
        
        # Aggregate by occupation
        by_occupation = workers.groupby("occupation_title").size()
        
        # Get compliance trends
        compliance = client.intelligence.analytics_to_dataframe(
            metric="compliance_risk",
            governorate="Aden",
        )
    """

    def __init__(self, client):
        if not PANDAS_AVAILABLE:
            raise ImportError(
                "pandas is required for DataScienceClient. "
                "Install with: pip install national-labor-platform[pandas]"
            )

        self._client = client
        self.workers = WorkersAnalytics(client)
        self.employers = EmployersAnalytics(client)
        self.inspections = InspectionsAnalytics(client)
        self.intelligence = IntelligenceAnalytics(client)
        self.dashboard = DashboardAnalytics(client)


class WorkersAnalytics:
    """Analytics helpers for workers"""

    def __init__(self, client):
        self._client = client

    def to_dataframe(
        self,
        governorate: Optional[str] = None,
        status: Optional[str] = None,
        employer_id: Optional[str] = None,
        limit: int = 10000,
    ) -> "pd.DataFrame":
        """Fetch workers and return as DataFrame"""
        params = {"limit": limit}
        if governorate:
            params["governorate"] = governorate
        if status:
            params["status"] = status
        if employer_id:
            params["employerId"] = employer_id

        result = self._client.workers.list(**params)
        
        # Flatten nested data for DataFrame
        rows = []
        for item in result.items:
            row = {
                "id": item.id,
                "first_name": item.first_name,
                "first_name_ar": item.first_name_ar,
                "last_name": item.last_name,
                "last_name_ar": item.last_name_ar,
                "national_id": item.national_id,
                "passport_number": item.passport_number,
                "nationality": item.nationality,
                "date_of_birth": item.date_of_birth,
                "gender": item.gender,
                "email": item.email,
                "phone": item.phone,
                "mobile": item.mobile,
                "governorate": item.governorate,
                "district": item.district,
                "occupation_id": item.occupation_id,
                "occupation_title": item.occupation_title,
                "employer_id": item.employer_id,
                "employer_name": item.employer_name,
                "monthly_wage": item.monthly_wage,
                "start_date": item.start_date,
                "status": item.status.value if hasattr(item.status, "value") else item.status,
                "created_at": item.created_at,
            }
            rows.append(row)

        return pd.DataFrame(rows)

    def by_governorate(self) -> "pd.DataFrame":
        """Get worker count by governorate"""
        params = self._client.workers.list(limit=1)
        total = params.pagination.total
        
        # Use aggregation endpoint if available
        governorates = {}
        page = 1
        while True:
            result = self._client.workers.list(page=page, limit=500)
            for item in result.items:
                gov = item.governorate or "Unknown"
                governorates[gov] = governorates.get(gov, 0) + 1
            if page >= result.pagination.total_pages:
                break
            page += 1

        return pd.DataFrame([
            {"governorate": k, "count": v} for k, v in governorates.items()
        ]).sort_values("count", ascending=False)

    def by_occupation(self) -> "pd.DataFrame":
        """Get worker count by occupation"""
        params = self._client.workers.list(limit=1)
        
        occupations = {}
        page = 1
        while True:
            result = self._client.workers.list(page=page, limit=500)
            for item in result.items:
                occ = item.occupation_title or "Unknown"
                occupations[occ] = occupations.get(occ, 0) + 1
            if page >= result.pagination.total_pages:
                break
            page += 1

        return pd.DataFrame([
            {"occupation": k, "count": v} for k, v in occupations.items()
        ]).sort_values("count", ascending=False)


class EmployersAnalytics:
    """Analytics helpers for employers"""

    def __init__(self, client):
        self._client = client

    def to_dataframe(self, status: Optional[str] = None) -> "pd.DataFrame":
        """Fetch employers and return as DataFrame"""
        params = {"limit": 500}
        if status:
            params["status"] = status

        result = self._client.employers.list(**params)
        
        rows = []
        for item in result.items:
            row = {
                "id": item.id,
                "name": item.name,
                "name_ar": item.name_ar,
                "type": item.type.value if hasattr(item.type, "value") else item.type,
                "status": item.status.value if hasattr(item.status, "value") else item.status,
                "sector": item.sector,
                "isic_code": item.isic_code,
                "governorate": item.governorate,
                "employee_count": getattr(item, "employee_count", None),
                "created_at": item.created_at,
            }
            rows.append(row)

        return pd.DataFrame(rows)

    def by_sector(self) -> "pd.DataFrame":
        """Get employer count by sector"""
        sectors = {}
        page = 1
        while True:
            result = self._client.employers.list(page=page, limit=500)
            for item in result.items:
                sector = item.sector or "Unknown"
                sectors[sector] = sectors.get(sector, 0) + 1
            if page >= result.pagination.total_pages:
                break
            page += 1

        return pd.DataFrame([
            {"sector": k, "count": v} for k, v in sectors.items()
        ]).sort_values("count", ascending=False)


class InspectionsAnalytics:
    """Analytics helpers for inspections"""

    def __init__(self, client):
        self._client = client

    def to_dataframe(
        self,
        status: Optional[str] = None,
        type: Optional[str] = None,
    ) -> "pd.DataFrame":
        """Fetch inspections and return as DataFrame"""
        params = {"limit": 500}
        if status:
            params["status"] = status
        if type:
            params["type"] = type

        result = self._client.inspections.list(**params)
        
        rows = []
        for item in result.items:
            row = {
                "id": item.id,
                "employer_id": item.employer_id,
                "type": item.type.value if hasattr(item.type, "value") else item.type,
                "status": item.status.value if hasattr(item.status, "value") else item.status,
                "scheduled_date": item.scheduled_date,
                "actual_date": item.actual_date,
                "location": item.location,
                "violations_count": len(item.violations) if item.violations else 0,
                "has_findings": bool(item.findings),
            }
            rows.append(row)

        return pd.DataFrame(rows)

    def compliance_rate(self) -> Dict[str, float]:
        """Calculate compliance rate from completed inspections"""
        result = self._client.inspections.list(status="completed", limit=500)
        
        total = 0
        compliant = 0
        
        for page in range(1, result.pagination.total_pages + 1):
            if page > 1:
                result = self._client.inspections.list(status="completed", page=page, limit=500)
            
            for item in result.items:
                total += 1
                if not item.violations:
                    compliant += 1

        return {
            "total": total,
            "compliant": compliant,
            "rate": compliant / total if total > 0 else 0,
        }


class IntelligenceAnalytics:
    """Analytics helpers for intelligence data"""

    def __init__(self, client):
        self._client = client

    def analytics_to_dataframe(
        self,
        metric: str,
        governorate: Optional[str] = None,
        date_range: str = "year",
    ) -> "pd.DataFrame":
        """Fetch analytics data and return as DataFrame"""
        params = {"metric": metric, "dateRange": date_range}
        if governorate:
            params["governorate"] = governorate

        data = self._client.intelligence.analytics(**params)
        
        rows = []
        for item in data.data:
            row = {
                "date": item.get("date"),
                "value": item.get("value"),
            }
            rows.append(row)

        return pd.DataFrame(rows)

    def recommendations_summary(self) -> "pd.DataFrame":
        """Get all recommendations as DataFrame"""
        recommendations = self._client.intelligence.recommendations()
        
        rows = []
        for item in recommendations:
            row = {
                "id": item.id,
                "category": item.category,
                "priority": item.priority,
                "title": item.title,
                "description": item.description,
                "expected_impact": item.expected_impact,
                "timeline": item.timeline,
            }
            rows.append(row)

        return pd.DataFrame(rows)


class DashboardAnalytics:
    """Analytics helpers for dashboard data"""

    def __init__(self, client):
        self._client = client

    def trends_dataframe(
        self,
        governorate: Optional[str] = None,
    ) -> "pd.DataFrame":
        """Get dashboard trends as DataFrame"""
        params = {}
        if governorate:
            params["governorate"] = governorate

        stats = self._client.dashboard.enhanced_stats(**params)
        
        rows = []
        for metric, trend in stats.trends.items():
            row = {
                "metric": metric,
                "current": trend.get("current"),
                "previous": trend.get("previous"),
                "change": trend.get("change"),
                "trend": trend.get("trend"),
            }
            rows.append(row)

        return pd.DataFrame(rows)