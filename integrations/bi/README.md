# Business Intelligence Integration Layer

This directory contains the Power BI and Tableau integration layer for the Yemen National Labor Platform. It enables data scientists, analysts, and BI professionals to access platform data through standardized, modern data interfaces.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Power BI Integration](#power-bi-integration)
- [Tableau Integration](#tableau-integration)
- [OData Endpoints](#odata-endpoints)
- [Sample Dashboards](#sample-dashboards)
- [Authentication](#authentication)
- [Data Models](#data-models)
- [Quick Start](#quick-start)
- [Troubleshooting](#troubleshooting)

## Overview

The BI Integration Layer provides:

1. **OData v4 REST API** — A standardized, OData-compliant interface for accessing platform data
2. **Power BI Custom Connector** — Native Power BI integration using Power Query M language
3. **Tableau Connector** — Native Tableau integration using the Hyper API and TACO format
4. **Sample Dashboard Templates** — Pre-built reports for common business questions
5. **Comprehensive Data Models** — Documented entity-relationship schemas

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                BI Tools (Power BI / Tableau)                │
└───────────────┬─────────────────────┬───────────────────────┘
                │                     │
        ┌───────▼───────┐     ┌───────▼───────┐
        │   Power BI    │     │   Tableau     │
        │   Connector   │     │   Connector   │
        │   (.pq file)  │     │   (.taco)     │
        └───────┬───────┘     └───────┬───────┘
                │                     │
                └──────────┬──────────┘
                           │
                  ┌────────▼────────┐
                  │   OData v4 API  │
                  │   (Stateless)   │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │   NLP Backend   │
                  │   (Express)     │
                  └────────┬────────┘
                           │
                  ┌────────▼────────┐
                  │   PostgreSQL    │
                  │   Database      │
                  └─────────────────┘
```

## Power BI Integration

### Files

- [`powerbi/NLPConnector.pq`](./powerbi/NLPConnector.pq) — Power Query M connector
- [`powerbi/NLPConnector.xml`](./powerbi/NLPConnector.xml) — Connector metadata
- [`powerbi/sample-queries.pq`](./powerbi/sample-queries.pq) — Pre-built query templates
- [`powerbi/dashboards/`](./powerbi/dashboards/) — Sample .pbix templates

### Installation

1. Download the connector files from the Power BI Custom Connectors repository
2. Place files in: `%LOCALAPPDATA%\Microsoft\Power BI Desktop\Custom Connectors\`
3. Restart Power BI Desktop
4. In Power BI: **Get Data → Online Services → National Labor Platform**
5. Authenticate with your API key or OAuth credentials

### Features

- ✅ Incremental refresh support (delta loads)
- ✅ Automatic pagination handling
- ✅ Query folding for performance
- ✅ DirectQuery and Import modes
- ✅ Relationship detection
- ✅ Column-level data types
- ✅ Multi-language schema support

## Tableau Integration

### Files

- [`tableau/NLPConnector.taco`](./tableau/NLPConnector.taco) — Tableau Connector (WDC)
- [`tableau/NLPConnector.js`](./tableau/NLPConnector.js) — Connector implementation
- [`tableau/hyper/`](./tableau/hyper/) — Hyper API extract schemas
- [`tableau/dashboards/`](./tableau/dashboards/) — Sample .twbx templates

### Installation

1. Copy the .taco file to: `Documents\My Tableau Repository\Connectors\`
2. Restart Tableau Desktop
3. In Tableau: **Connect → To a Server → Web Data Connector → NLP**
4. Enter the WDC URL: `https://api.yourplatform.ye/bi/wdc`
5. Authenticate and select your data sources

### Features

- ✅ High-performance Hyper extracts
- ✅ Incremental data refresh
- ✅ Relationship graph support
- ✅ Cross-database joins
- ✅ Calculated fields
- ✅ Geographic role detection

## OData Endpoints

The OData v4 endpoints are exposed at `/api/odata/v4/`:

### Service Root

```
GET https://api.yourplatform.ye/api/odata/v4/
```

Returns the service document with all available entity sets.

### Entity Sets

| Entity Set | Path | Description |
|------------|------|-------------|
| Entities | `/Entities` | Trade unions and employer organizations |
| Members | `/Members` | Trade union members |
| Workers | `/Workers` | Worker profiles |
| Employers | `/Employers` | Employer establishments |
| Inspections | `/Inspections` | Inspection records |
| Violations | `/Violations` | Violation records |
| Licenses | `/Licenses` | Licenses and permits |
| Contracts | `/Contracts` | Employment contracts |
| Payments | `/Payments` | Fee payments |
| Disputes | `/Disputes` | Labor disputes |
| Training | `/Training` | Training records |
| Notifications | `/Notifications` | User notifications |
| Audit | `/AuditLogs` | Audit trail |
| Documents | `/Documents` | Document metadata |
| Occupations | `/Occupations` | Occupation codes |
| Governorates | `/Governorates` | Geographic divisions |

### Query Examples

**Filter:**
```
GET /api/odata/v4/Workers?$filter=status eq 'active' and governorate eq 'Sana\\'a'
```

**Select:**
```
GET /api/odata/v4/Workers?$select=id,full_name_ar,profession,monthly_salary
```

**Expand:**
```
GET /api/odata/v4/Workers?$expand=employer($select=name_ar,registration_number)
```

**Pagination:**
```
GET /api/odata/v4/Workers?$top=100&$skip=0&$count=true
```

**Order By:**
```
GET /api/odata/v4/Workers?$orderby=monthly_salary desc
```

**Aggregate:**
```
GET /api/odata/v4/Workers?$apply=groupby((governorate),aggregate(monthly_salary with average as avg_salary))
```

## Sample Dashboards

### Power BI Templates

1. **Executive Overview** (`executive-overview.pbix`)
   - Key metrics across all entities
   - Growth trends over time
   - Top performers by governorate

2. **Inspection Performance** (`inspection-performance.pbix`)
   - Inspector productivity
   - Violation rates
   - Compliance trends

3. **Worker Demographics** (`worker-demographics.pbix`)
   - Age distribution
   - Gender breakdown
   - Sector analysis
   - Salary distributions

4. **Employer Compliance** (`employer-compliance.pbix`)
   - License status
   - Violation history
   - Inspection outcomes

### Tableau Templates

1. **National Labor Dashboard** (`national-labor-dashboard.twbx`)
   - Country-wide overview
   - Time-series analysis
   - Geographic distribution

2. **Compliance Heatmap** (`compliance-heatmap.twbx`)
   - Geographic violation density
   - Sector-based compliance
   - Risk assessment

3. **Economic Indicators** (`economic-indicators.twbx`)
   - Employment trends
   - Wage analysis
   - Sector contributions

## Authentication

The BI layer supports multiple authentication methods:

### 1. API Key

```http
GET /api/odata/v4/Workers
Authorization: Bearer YOUR_API_KEY
```

### 2. OAuth 2.0

```http
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET
```

### 3. JWT Token

```http
GET /api/odata/v4/Workers
Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. Service Account

For automated dashboards, use a dedicated service account with appropriate scopes.

## Data Models

See [`docs/DATA_MODELS.md`](./docs/DATA_MODELS.md) for comprehensive entity-relationship documentation.

### Core Entities

- **Entity** — Trade unions / employer organizations
- **Member** — Trade union members
- **Worker** — Individual workers
- **Employer** — Business establishments
- **Inspection** — Inspection records
- **Violation** — Code violations
- **License** — Licenses and permits
- **Contract** — Employment contracts
- **Payment** — Fee payments
- **Dispute** — Labor disputes
- **Training** — Training records

### Relationships

```
Entity (1) ──── (N) Member
Entity (1) ──── (N) Inspection
Employer (1) ──── (N) Worker
Employer (1) ──── (N) Inspection
Employer (1) ──── (N) Violation
Employer (1) ──── (N) License
Employer (1) ──── (N) Contract
Worker (1) ──── (N) Contract
Worker (1) ──── (N) TrainingRecord
Inspection (1) ──── (N) Violation
Contract (1) ──── (N) Payment
```

## Quick Start

### Power BI

1. Open Power BI Desktop
2. Click **Get Data → Blank Query**
3. Open Advanced Editor
4. Paste the contents of `powerbi/sample-queries.pq`
5. Modify parameters (API endpoint, API key)
6. Click **Invoke**
7. Use the returned data in your report

### Tableau

1. Open Tableau Desktop
2. Click **Connect → To a Server → Web Data Connector**
3. Enter: `https://api.yourplatform.ye/bi/wdc`
4. Authenticate with your credentials
5. Select entity sets to extract
6. Click **Update Now**

### Direct OData

```bash
# Get all active workers in Sana'a
curl -X GET "https://api.yourplatform.ye/api/odata/v4/Workers?\$filter=status%20eq%20%27active%27%20and%20governorate%20eq%20%27Sana%27a%27&\$top=100" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Accept: application/json"
```

## Performance Considerations

- **Row limits**: Default 1000 per request, max 10,000
- **Pagination**: Use `$top` and `$skip` for large datasets
- **Server-side filtering**: Always use `$filter` to reduce payload
- **Aggregation**: Use `$apply` for server-side aggregations
- **Caching**: Connector results are cached for 5 minutes by default
- **Delta loads**: Use `Last-Modified` headers for incremental refresh

## Rate Limits

| Tier | Requests/min | Concurrent |
|------|--------------|------------|
| Free | 60 | 2 |
| Standard | 600 | 10 |
| Premium | 6000 | 50 |

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your API key is active
   - Check token expiration
   - Ensure correct base URL

2. **Slow Queries**
   - Add filters to reduce data volume
   - Use pagination for large datasets
   - Consider Import mode instead of DirectQuery

3. **Data Type Mismatches**
   - Review the schema documentation
   - Use `$select` to specify columns
   - Check for null values

4. **Connection Timeouts**
   - Reduce `$top` value
   - Add date filters
   - Use incremental refresh

### Support

- **Email**: bi-support@yourplatform.ye
- **Documentation**: https://docs.yourplatform.ye/bi
- **Status**: https://status.yourplatform.ye
- **GitHub**: https://github.com/mol-yemen/national-labor-platform

## License

This integration layer is licensed under the MIT License. See [`LICENSE`](../../LICENSE) for details.
