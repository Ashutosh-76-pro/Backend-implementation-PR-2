# India Administrative Directory API — Final Presentation

## Slide 1 — Title
**India Administrative Directory API — Phase 2**

B2B-ready administrative hierarchy platform

**Stack:** Node.js | Express | TypeScript | PostgreSQL/NeonDB | Prisma

## Slide 2 — Problem
Provide a reliable API for navigating India's administrative hierarchy and returning standardized address data for B2B applications.

Hierarchy:
**Country → State → District → Sub-District → Village**

## Slide 3 — API Environments
- Production: `https://api.villageapi.com/v1/`
- Staging: `https://staging-api.villageapi.com/v1/`
- Local: `http://localhost:3000/v1/`

Responses are JSON and include request metadata.

## Slide 4 — Authentication
- `X-API-Key` for B2B API access.
- `X-API-Secret` for write operations.
- JWT for dashboard/admin authentication.
- bcrypt for secret hashing.
- Revocation and expiry support.

## Slide 5 — Core API Endpoints
- GET `/states`
- GET `/states/{id}/districts`
- GET `/districts/{id}/subdistricts`
- GET `/subdistricts/{id}/villages`
- GET `/search?q=...`
- GET `/autocomplete?q=...`

Pagination and query validation are applied to collection endpoints.

## Slide 6 — Standard Response
Response design includes:
- `success`
- `count`
- `data`
- `meta.requestId`
- `meta.responseTime`
- rate-limit information

## Slide 7 — Dropdown / Address Response
Autocomplete returns:
- village value and label
- full standardized address
- village, sub-district, district, state and country hierarchy

## Slide 8 — Technology Architecture
**React SPA / B2B Client / Demo Client**
↓
**HTTPS REST API**
↓
**Helmet + CORS + Rate Limit**
↓
**Express Controllers**
↓
**Prisma ORM**
↓
**Redis/Upstash + Neon PostgreSQL**

## Slide 9 — Frontend Dashboard
Required stack:
React 18+ + TypeScript + Vite + Tailwind CSS + Recharts + Zustand + React Query

Common components:
- collapsible sidebar
- top bar
- breadcrumbs
- sortable/filterable data tables
- CSV/Excel export

## Slide 10 — Admin Panel
Analytics:
- top states by village count
- API request trends
- user plan distribution
- response-time trends
- endpoint usage
- usage by hour

Management:
- approve/suspend users
- change plans
- manage API keys
- grant/revoke state access
- inspect API logs

## Slide 11 — B2B User Portal
Flow:

Registration → Pending Approval → Admin Review → Approved → API Keys → API Documentation → Usage Monitoring

Dashboard:
- requests today
- monthly requests
- average response time
- successful requests %

## Slide 12 — Security
- JWT with 24-hour expiry for user login.
- API key + secret for programmatic access.
- bcrypt hashing for secrets.
- revocation and expiration.
- masked API keys/IPs in logs.
- security headers through Helmet.
- state access enforcement on the server.

## Slide 13 — Plans & Rate Limits

| Plan | Daily Requests | Burst/min |
|---|---:|---:|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

Rate-limit headers communicate limit, remaining quota and reset time.

## Slide 14 — Data Import
Expected MDDS-style columns include:
- state code/name
- district code/name
- sub-district code/name
- village code/name

Import flow:
**Validate → Normalize codes → Upsert hierarchy → Batch villages → Run integrity checks**

The repository includes an importer, but a real authorized source workbook is required for production data.

## Slide 15 — Demo Client
A contact form can use village autocomplete to automatically populate:
**Village → Sub-District → District → State → India**

The API contract is designed for direct dropdown use.

## Slide 16 — Submission Package
```text
Backend-implementation-PR-2/
├── Source Code/
│   ├── server.ts
│   ├── schema.prisma
│   ├── seed.ts
│   ├── import-mdss.py
│   └── package.json
├── Datasets/
│   └── sample_village_hierarchy.csv
├── Documentation/
│   ├── PROJECT_DOCUMENTATION.md
│   ├── API_SPECIFICATION_REFERENCE.md
│   ├── DATABASE_DESIGN.md
│   ├── SECURITY_AND_RATE_LIMITING.md
│   ├── DEPLOYMENT.md
│   └── DEMO_CLIENT.md
└── PPT / Slides/
    ├── FINAL_VILLAGE_API_PRESENTATION.md
    └── VILLAGE_API_PROJECT_PRESENTATION.pptx
```

**Thank you**
