# Yemen National Labor Platform — Python SDK

Python SDK for the Yemen National Labor Platform API, designed for data science,
BI tools, backend integrations, and scripting.

## Features

- **Full API Coverage**: All 200+ endpoints from the National Labor Platform API
- **Type Safety**: Pydantic models for request/response validation
- **Async Support**: Optional async client using httpx
- **Pandas Integration**: Optional DataFrame helpers for analytics
- **Retry Logic**: Automatic retry with exponential backoff
- **Bearer Token Auth**: JWT-based authentication with refresh

## Installation

```bash
pip install national-labor-platform
```

### With optional dependencies

```bash
# Async support
pip install national-labor-platform[async]

# Data science / pandas support
pip install national-labor-platform[pandas]

# All dependencies
pip install national-labor-platform[all]
```

## Quick Start

```python
from nlp_sdk import Client

# Initialize client
client = Client(
    base_url="https://api.labor.gov.ye/v2",
    access_token="your-jwt-token",
)

# List workers
workers = client.workers.list(governorate="Sana'a", limit=100)
print(f"Found {workers.pagination.total} workers")

# Get dashboard stats
stats = client.dashboard.stats()
print(f"Total employers: {stats.total_employers}")

# Create inspection (inspector)
inspection = client.inspections.create(
    employer_id="uuid-of-employer",
    type="routine",
    scheduled_date="2026-09-15",
    location="Industrial Zone, Sana'a",
)
```

## Async Usage

```python
import asyncio
from nlp_sdk.async_client import AsyncClient

async def main():
    async with AsyncClient(base_url="https://api.labor.gov.ye/v2") as client:
        # Login
        tokens = await client.auth.login(
            email="inspector@mol.gov.ye",
            password="secure-password",
        )
        print(f"Logged in as {tokens.user.name}")
        
        # Parallel requests
        results = await asyncio.gather(
            client.dashboard.stats(),
            client.inspections.list(status="scheduled", limit=10),
            client.workers.list(governorate="Aden"),
        )

asyncio.run(main())
```

## Pandas Integration

```python
from nlp_sdk.analytics import DataScienceClient

client = DataScienceClient(base_url="https://api.labor.gov.ye/v2")

# Get workers as DataFrame
workers_df = client.workers.to_dataframe(
    governorate="Sana'a",
    status="active",
)

# Aggregate by occupation
occupation_counts = workers_df.groupby("occupation_title").size()

# Get compliance trends
compliance_df = client.intelligence.analytics_to_dataframe(
    metric="compliance_risk",
    governorate="Aden",
)

# Merge with external data
import pandas as pd
social_data = pd.read_csv("social_security_data.csv")
merged = workers_df.merge(social_data, on="national_id")
```

## Configuration

```python
from nlp_sdk import Client

client = Client(
    base_url="https://api.labor.gov.ye/v2",
    access_token="jwt-token",
    refresh_token="refresh-token",  # For automatic token refresh
    timeout=60,  # Request timeout in seconds
    max_retries=3,  # Retry attempts
    locale="ar",  # Arabic locale (ar) or English (en)
)
```

## Rate Limits

The API enforces rate limits per role:
- Public: 60 req/min
- Worker: 120 req/min  
- Employer/Union: 300 req/min
- Ministry/Admin: 600 req/min

The SDK handles rate limit responses with automatic retry.

## Error Handling

```python
from nlp_sdk import Client
from nlp_sdk.exceptions import NLPError, AuthenticationError, RateLimitError

client = Client(base_url="https://api.labor.gov.ye/v2")

try:
    result = client.workers.get("invalid-uuid")
except AuthenticationError:
    print("Invalid or expired token")
except RateLimitError as e:
    print(f"Rate limited, retry after {e.retry_after}s")
except NLPError as e:
    print(f"API error: {e.code} - {e.message}")
```

## License

MIT License - Ministry of Labor, Yemen