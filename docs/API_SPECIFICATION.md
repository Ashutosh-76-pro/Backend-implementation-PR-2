# 6. API Specification

## 6.1 API Standards

Base path: `/api/v1`

Transport: HTTPS in production
Format: JSON
Authentication: JWT for protected administrative operations; API-key authentication is supported for B2B usage in the production design.
Versioning: URI versioning (`/api/v1`)
Pagination: `page` and `limit`
Default page size: 25
Maximum page size: 100

## 6.2 Public Health Endpoint

### GET `/health`

Purpose: Service health check.

Response:
```json
{
  "status": "ok",
  "service": "india-admin-directory-api"
}
```

## 6.3 Authentication APIs

### POST `/api/auth/register`

Creates a client account.

Request:
```json
{
  "email": "client@example.com",
  "password": "minimum-8-characters"
}
```

Success: `201 Created`

### POST `/api/auth/login`

Authenticates a user and returns a JWT.

Request:
```json
{
  "email": "client@example.com",
  "password": "minimum-8-characters"
}
```

Success:
```json
{
  "token": "<jwt>",
  "user": {
    "id": "...",
    "email": "client@example.com",
    "role": "client",
    "planType": "demo"
  }
}
```

## 6.4 Hierarchy APIs

### GET `/api/v1/states`

Query parameters:
- `page` - page number, default 1
- `limit` - records per page, default 25, max 100
- `search` - case-insensitive state-name search

### GET `/api/v1/districts`

Query parameters:
- `stateId` - optional parent-state filter
- `page`
- `limit`
- `search`

### GET `/api/v1/sub-districts`

Query parameters:
- `districtId` - optional parent-district filter
- `page`
- `limit`
- `search`

### GET `/api/v1/villages`

Query parameters:
- `subDistrictId` - optional parent-sub-district filter
- `page`
- `limit`
- `search`

Village responses include the complete administrative ancestry required to present a standardized address.

## 6.5 Unified Search API

### GET `/api/v1/search?q=<term>&limit=<n>`

Purpose: Search states, districts, sub-districts, and villages using one endpoint.

Rules:
- `q` is required and must contain at least two characters.
- `limit` defaults to 20 and is capped at 100.

Response shape:
```json
{
  "query": "nandurbar",
  "results": {
    "states": [],
    "districts": [],
    "subDistricts": [],
    "villages": []
  }
}
```

## 6.6 Admin API

### GET `/api/admin/stats`

Authentication: `Authorization: Bearer <JWT>`

Authorization: user role must be `admin`.

Response:
```json
{
  "states": 36,
  "districts": 700,
  "subDistricts": 6000,
  "villages": 600000,
  "users": 10
}
```

## 6.7 B2B API-Key Contract

Production B2B endpoints should accept:

```http
X-API-Key: <public-api-key>
X-API-Secret: <secret>
```

Validation sequence:
1. Validate header presence and format.
2. Resolve API key.
3. Compare supplied secret against the stored bcrypt hash.
4. Resolve the owning user and plan.
5. Check state-level access permissions.
6. Apply rate limits using Redis.
7. Execute the requested query.
8. Write an API usage log.

Secrets must never be returned by APIs or stored in plain text.

## 6.8 Pagination Contract

Successful collection endpoints return:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "pages": 4
  }
}
```

## 6.9 Standard Error Contract

All API errors should follow a consistent structure:

```json
{
  "error": "Invalid input",
  "details": {}
}
```

Recommended HTTP status codes:

| Status | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created |
| 400 | Invalid request or validation failure |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Duplicate/conflicting resource |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |

## 6.10 Filtering and Hierarchical Access

Hierarchy filters must be applied at the database query layer rather than in frontend code. A village request filtered by `subDistrictId` must return only villages belonging to that parent. B2B state restrictions must be enforced server-side before data is returned.

## 6.11 Caching Strategy

Read-heavy endpoints such as state, district, sub-district and village lookups can use Redis caching.

Suggested cache keys:
- `states:list:<hash>`
- `districts:<stateId>:<hash>`
- `subdistricts:<districtId>:<hash>`
- `villages:<subDistrictId>:<hash>`
- `search:<normalizedQuery>:<limit>`

Cache invalidation occurs after successful data imports or administrative updates.

## 6.12 Observability

Each B2B request should record:
- endpoint
- HTTP method
- status code
- response time
- user ID when available
- API key ID when available
- timestamp

These records are stored in `ApiLog` for usage analytics and operational monitoring.
