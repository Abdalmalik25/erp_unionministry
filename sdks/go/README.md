# Yemen National Labor Platform — Go SDK

Go SDK for the Yemen National Labor Platform API, designed for backend services,
microservices, and high-performance integrations.

## Features

- **Full API Coverage**: All 200+ endpoints from the National Labor Platform API
- **Type Safety**: Go generics and strong typing
- **Context Support**: Full context.Context for cancellation and timeouts
- **Retry Logic**: Automatic retry with exponential backoff
- **Rate Limiting**: Built-in rate limit handling
- **Zero Dependencies**: No external dependencies for core functionality

## Installation

```bash
go get github.com/mol-yemen/national-labor-platform/sdk
```

## Quick Start

```go
package main

import (
    "context"
    "fmt"
    
    nlp "github.com/mol-yemen/national-labor-platform/sdk"
)

func main() {
    // Initialize client
    client := nlp.NewClient(
        nlp.WithBaseURL("https://api.labor.gov.ye/v2"),
        nlp.WithAccessToken("your-jwt-token"),
    )
    ctx := context.Background()

    // Get dashboard stats
    stats, err := client.Dashboard.Stats(ctx, &nlp.DashboardStatsParams{
        Governorate: "Sana'a",
    })
    if err != nil {
        panic(err)
    }
    fmt.Printf("Total Workers: %d\n", stats.TotalWorkers)

    // List inspections
    inspections, err := client.Inspections.List(ctx, &nlp.InspectionListParams{
        Status: nlp.InspectionStatusScheduled,
        Limit:  100,
    })
    if err != nil {
        panic(err)
    }
    fmt.Printf("Pending Inspections: %d\n", inspections.Pagination.Total)
}
```

## Authentication

```go
// Login
tokens, err := client.Auth.Login(ctx, &nlp.LoginRequest{
    Email:    "inspector@mol.gov.ye",
    Password:  "secure-password",
})
if err != nil {
    panic(err)
}

// Use tokens
client.SetAccessToken(tokens.AccessToken)
```

## Configuration

```go
client := nlp.NewClient(
    nlp.WithBaseURL("https://api.labor.gov.ye/v2"),
    nlp.WithAccessToken("token"),
    nlp.WithTimeout(60 * time.Second),
    nlp.WithMaxRetries(3),
    nlp.WithLocale("ar"),  // Arabic
)
```

## Error Handling

```go
import "errors"

inspection, err := client.Inspections.Get(ctx, id)
if err != nil {
    var apiErr *nlp.APIError
    if errors.As(err, &apiErr) {
        switch apiErr.Code {
        case nlp.ErrCodeNotFound:
            fmt.Println("Inspection not found")
        case nlp.ErrCodeRateLimited:
            fmt.Printf("Rate limited, retry after %d seconds\n", apiErr.RetryAfter)
        case nlp.ErrCodeUnauthorized:
            fmt.Println("Authentication required")
        }
    }
    panic(err)
}
```

## Batch Operations

```go
// Parallel requests
ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
defer cancel()

results, err := nlp.ParallelRequests(ctx, client,
    func(c *nlp.Client) (any, error) { return c.Dashboard.Stats(ctx, nil) },
    func(c *nlp.Client) (any, error) { return c.Employers.List(ctx, nil) },
    func(c *nlp.Client) (any, error) { return c.Workers.List(ctx, nil) },
)
```

## License

MIT License - Ministry of Labor, Yemen