# OData v4 Endpoint Configuration

This document describes the OData v4 API implementation for the Yemen National Labor Platform BI integration.

## API Base URL

```
Production: https://api.yourplatform.ye/api/odata/v4/
Staging:    https://staging-api.yourplatform.ye/api/odata/v4/
Development: http://localhost:3000/api/odata/v4/
```

## Authentication

All OData requests require authentication via Bearer token:

```http
Authorization: Bearer <your_api_key>
```

## Response Format

All responses follow the OData JSON format:

```json
{
  "@odata.context": "https://api.yourplatform.ye/api/odata/v4/$metadata#Workers",
  "@odata.count": 1543,
  "@odata.nextLink": "https://api.yourplatform.ye/api/odata/v4/Workers?$top=100&$skip=100",
  "value": [
    {
      "id": 1,
      "full_name_ar": "أحمد محمد",
      "status": "active"
    }
  ]
}
```

## Query Operators

### Comparison Operators

| Operator | Description | Example |
|----------|-------------|---------|
| eq | Equal | `status eq 'active'` |
| ne | Not equal | `status ne 'deleted'` |
| gt | Greater than | `monthly_salary gt 100000` |
| ge | Greater than or equal | `age ge 18` |
| lt | Less than | `count lt 10` |
| le | Less than or equal | `count le 100` |

### Logical Operators

| Operator | Description | Example |
|----------|-------------|---------|
| and | Logical AND | `status eq 'active' and age gt 18` |
| or | Logical OR | `status eq 'active' or status eq 'pending'` |
| not | Logical NOT | `not (status eq 'deleted')` |

### String Functions

| Function | Description | Example |
|----------|-------------|---------|
| contains() | Substring search | `contains(name_ar, 'أحمد')` |
| startswith() | Prefix match | `startswith(email, 'admin')` |
| endswith() | Suffix match | `endswith(phone, '5678')` |
| length() | String length | `length(name_ar) gt 10` |
| tolower() | Lowercase | `tolower(status) eq 'active'` |
| toupper() | Uppercase | `toupper(code) eq 'ABC'` |
| trim() | Remove whitespace | `trim(name) ne ''` |

### Date/Time Functions

| Function | Description | Example |
|----------|-------------|---------|
| year() | Extract year | `year(created_at) eq 2024` |
| month() | Extract month | `month(dob) eq 6` |
| day() | Extract day | `day(start_date) eq 15` |
| hour() | Extract hour | `hour(scheduled_time) ge 9` |
| minute() | Extract minute | `minute(start_time) eq 30` |
| date() | Date portion | `date(created_at) eq 2024-06-15` |
| time() | Time portion | `time(created_at) gt 12:00:00` |

### Collection Functions

| Function | Description | Example |
|----------|-------------|---------|
| has() | Has capability | `has(capabilities, 'admin')` |
| size() | Collection size | `size(roles) gt 0` |

## System Query Options

### $select

Select specific columns:

```
GET /Workers?$select=id,full_name_ar,status,monthly_salary
```

### $filter

Filter results:

```
GET /Workers?$filter=status eq 'active' and governorate eq 'Sana\'a'
GET /Workers?$filter=monthly_salary ge 100000
GET /Workers?$filter=contains(full_name_ar, 'محمد')
```

### $orderby

Sort results:

```
GET /Workers?$orderby=monthly_salary desc
GET /Workers?$orderby=governorate asc,created_at desc
```

### $top and $skip

Pagination:

```
GET /Workers?$top=50&$skip=0        # First page
GET /Workers?$top=50&$skip=50       # Second page
GET /Workers?$top=50&$skip=100      # Third page
```

### $count

Include total count:

```
GET /Workers?$count=true
GET /Workers?$filter=status eq 'active'&$count=true
```

### $expand

Include related entities:

```
GET /Workers?$expand=employer
GET /Workers?$expand=employer($select=name_ar,registration_number)
GET /Inspections?$expand=violations,employer
```

### $apply

Server-side aggregation:

```
# Group by governorate with average salary
GET /Workers?$apply=groupby((governorate),aggregate(monthly_salary with average as avg_salary))

# Group by profession and count
GET /Workers?$apply=groupby((profession),aggregate(id with count as worker_count))

# Filter then group
GET /Workers?$apply=filter(status eq 'active')/groupby((governorate),aggregate(monthly_salary with average as avg_salary))
```

### $search

Full-text search (if enabled):

```
GET /Workers?$search=أحمد
GET /Workers?$search="software engineer"
```

## Endpoint Examples

### Workers

```bash
# All active workers
curl "https://api.yourplatform.ye/api/odata/v4/Workers?$filter=status eq 'active'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Workers with salary > 100,000
curl "https://api.yourplatform.ye/api/odata/v4/Workers?$filter=monthly_salary gt 100000" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Workers in Sana'a with employer details
curl "https://api.yourplatform.ye/api/odata/v4/Workers?$filter=governorate eq 'Sana\'a'&$expand=employer" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Salary analysis by governorate
curl "https://api.yourplatform.ye/api/odata/v4/Workers?$apply=groupby((governorate),aggregate(monthly_salary with average as avg_salary))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Employers

```bash
# All active employers
curl "https://api.yourplatform.ye/api/odata/v4/Employers?$filter=status eq 'active'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Employers with expired licenses
curl "https://api.yourplatform.ye/api/odata/v4/Employers?$filter=license_expiry lt 2024-01-01" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Large employers (>100 employees)
curl "https://api.yourplatform.ye/api/odata/v4/Employers?$filter=employee_count gt 100" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Employers with inspections
curl "https://api.yourplatform.ye/api/odata/v4/Employers?$expand=inspections" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Inspections

```bash
# All completed inspections
curl "https://api.yourplatform.ye/api/odata/v4/Inspections?$filter=status eq 'completed'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Inspections in June 2024
curl "https://api.yourplatform.ye/api/odata/v4/Inspections?$filter=completed_date ge 2024-06-01 and completed_date lt 2024-07-01" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Monthly inspection counts
curl "https://api.yourplatform.ye/api/odata/v4/Inspections?$apply=groupby((month(completed_date)),aggregate(id with count as inspection_count))" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Inspections by governorate
curl "https://api.yourplatform.ye/api/odata/v4/Inspections?$apply=groupby((governorate),aggregate(id with count as count))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Violations

```bash
# High severity violations
curl "https://api.yourplatform.ye/api/odata/v4/Violations?$filter=severity eq 'high'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Unresolved violations
curl "https://api.yourplatform.ye/api/odata/v4/Violations?$filter=status ne 'resolved'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Violation types distribution
curl "https://api.yourplatform.ye/api/odata/v4/Violations?$apply=groupby((violation_type),aggregate(id with count as count))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Licenses

```bash
# Expiring in next 90 days
curl "https://api.yourplatform.ye/api/odata/v4/Licenses?$filter=expiry_date gt 2024-01-01 and expiry_date lt 2024-04-01" \
  -H "Authorization: Bearer YOUR_TOKEN"

# License status distribution
curl "https://api.yourplatform.ye/api/odata/v4/Licenses?$apply=groupby((status),aggregate(id with count as count))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Contracts

```bash
# Permanent contracts
curl "https://api.yourplatform.ye/api/odata/v4/Contracts?$filter=contract_type eq 'permanent'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Contracts expiring this year
curl "https://api.yourplatform.ye/api/odata/v4/Contracts?$filter=end_date ge 2024-01-01 and end_date le 2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Payments

```bash
# Overdue payments
curl "https://api.yourplatform.ye/api/odata/v4/Payments?$filter=status eq 'overdue'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Payment collection by month
curl "https://api.yourplatform.ye/api/odata/v4/Payments?$apply=groupby((month(paid_date)),aggregate(amount with sum as total_amount))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Disputes

```bash
# Active disputes
curl "https://api.yourplatform.ye/api/odata/v4/Disputes?$filter=status eq 'active'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Resolution rate by type
curl "https://api.yourplatform.ye/api/odata/v4/Disputes?$apply=groupby((dispute_type),aggregate(id with count as total,amount_awarded with sum as total_awarded))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Training

```bash
# Active training programs
curl "https://api.yourplatform.ye/api/odata/v4/Training?$filter=status eq 'active'" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Completion rates
curl "https://api.yourplatform.ye/api/odata/v4/Training?$apply=groupby((program_type),aggregate(enrolled_count with sum as total_enrolled,completed_count with sum as total_completed))" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rate Limits

| Plan | Requests/Minute | Concurrent Connections |
|------|-----------------|------------------------|
| Free | 60 | 2 |
| Standard | 600 | 10 |
| Premium | 6000 | 50 |
| Enterprise | Unlimited | Unlimited |

## Error Responses

### 400 Bad Request

```json
{
  "error": {
    "code": "400",
    "message": "Invalid filter syntax",
    "details": [
      {
        "code": "InvalidOperator",
        "message": "Unknown operator 'containsx'",
        "target": "$filter"
      }
    ]
  }
}
```

### 401 Unauthorized

```json
{
  "error": {
    "code": "401",
    "message": "Authentication required",
    "details": [
      {
        "code": "MissingToken",
        "message": "Authorization header is required"
      }
    ]
  }
}
```

### 403 Forbidden

```json
{
  "error": {
    "code": "403",
    "message": "Access denied",
    "details": [
      {
        "code": "InsufficientPermissions",
        "message": "You do not have permission to access this resource"
      }
    ]
  }
}
```

### 429 Too Many Requests

```json
{
  "error": {
    "code": "429",
    "message": "Rate limit exceeded",
    "details": [
      {
        "code": "RateLimitExceeded",
        "message": "60 requests per minute allowed. Try again in 30 seconds.",
        "retryAfter": 30
      }
    ]
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "500",
    "message": "An unexpected error occurred",
    "details": [
      {
        "code": "InternalError",
        "message": "Please try again later or contact support"
      }
    ]
  }
}
```
