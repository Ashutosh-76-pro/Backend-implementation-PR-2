# India Administrative Directory API — Project Documentation

**Project:** India Administrative Directory API — Phase 2  
**Repository:** `Ashutosh-76-pro/Backend-implementation-PR-2`

## 1. Project purpose

Build a searchable India administrative hierarchy API and B2B platform supporting:

**Country → State → District → Sub-District → Village**

The supplied specification requires production, staging and local API environments, JSON responses, authentication, pagination, search, autocomplete, admin controls, usage analytics and a B2B portal.

## 2. Current implementation

The existing repository implements a Node.js + Express 5 + TypeScript API backed by PostgreSQL/NeonDB and Prisma. It includes JWT login, business-email registration, API-key validation, state-level access checks, plan quotas, request logging, admin endpoints, OpenAPI JSON, Helmet security headers and hierarchy search/autocomplete.

## 3. API contract

Production API base path: `/api/v1`.

Required authentication for B2B API calls:
- `X-API-Key`
- `X-API-Secret` for write operations

Standard responses include success, count, data and metadata such as request ID, response time and rate-limit information.

## 4. Core endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/v1/states` | List/search states |
| GET | `/api/v1/states/{id}/districts` | Districts by state |
| GET | `/api/v1/districts/{id}/subdistricts` | Sub-districts by district |
| GET | `/api/v1/subdistricts/{id}/villages` | Villages by sub-district |
| GET | `/api/v1/search?q=...` | Unified hierarchy search |
| GET | `/api/v1/autocomplete?q=...` | Village typeahead |

## 5. Admin capabilities

The implementation supports admin statistics, user listing, user status/plan changes, state-access management and API-log viewing.

The supplied specification also calls for dashboard visualizations such as top states by village count, API request trends, plan distribution, response-time trends, endpoint usage and usage-by-hour.

## 6. B2B portal

The portal flow is:

Registration → Pending Approval → Admin Review → Approval → API Key Generation → API Documentation → API Usage Monitoring

The supplied requirements include business email validation, business name, optional GST number, phone, password confirmation, usage cards, request charts and API-key management.

## 7. Security

The project uses JWT for dashboard authentication and API-key authentication for B2B requests. API secrets are hashed with bcrypt in the existing implementation. Keys can be revoked/expired and users can have up to five active keys.

Security headers required by the specification include:
- X-Content-Type-Options
- X-Frame-Options
- Strict-Transport-Security
- Content-Security-Policy

## 8. Rate limits

| Plan | Daily requests | Burst/minute |
|---|---:|---:|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

The repository implementation enforces a daily quota from API-log usage and returns rate-limit headers.

## 9. Data import

The importer is designed for MDDS-style Excel data, validates required columns, keeps administrative codes as strings, removes incomplete duplicate hierarchy rows, upserts hierarchy levels in order and inserts village data in batches.

A real authorized spreadsheet should be used for a production import. The included CSV is synthetic demo data only.

## 10. Demo flow

The supplied specification describes a contact-form demo where a user enters a village/area, the application calls autocomplete, receives the village's full hierarchy and auto-populates sub-district, district, state and country.

## 11. Operational principle

The API should enforce filtering and authorization on the server/database layer, not in frontend code. Read-heavy hierarchy endpoints can be cached with Redis/Upstash, while API logs support operational monitoring.

## 12. Repository submission structure

The project is now packaged as:

```text
Backend-implementation-PR-2/
├── Source Code/
├── Datasets/
├── Documentation/
└── PPT / Slides/
```
