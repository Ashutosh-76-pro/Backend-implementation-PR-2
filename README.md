# India Administrative Directory API — Phase 2

Backend implementation for an India administrative hierarchy and B2B API platform.

## Stack
Node.js + Express 5 | TypeScript | PostgreSQL/NeonDB | Prisma | JWT + bcrypt | Helmet | Zod | express-rate-limit | Vercel-compatible

## Hierarchy
Country -> State -> District -> SubDistrict -> Village

## Implemented Phase 2
- Business-email B2B registration with `PENDING_APPROVAL` status
- JWT login with 24-hour expiry
- API-key authentication using `X-API-Key`
- API-secret validation for write operations
- Hashed API secrets with bcrypt
- API key expiry, revocation fields and five-key limit
- State-level access control
- Standardized success/error response structure with request IDs
- Search and village autocomplete with full hierarchy
- Pagination and query validation
- Daily plan quotas and rate-limit headers
- API request logging with masked API key/IP
- Admin user listing, status and plan management
- Admin state-access management
- Admin usage statistics and logs
- OpenAPI JSON endpoint
- Security headers via Helmet

## Main endpoints
### Public
- GET `/health`
- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/docs/openapi.json`

### API-key protected
- GET `/api/v1/states`
- GET `/api/v1/states/{id}/districts`
- GET `/api/v1/districts/{id}/subdistricts`
- GET `/api/v1/subdistricts/{id}/villages`
- GET `/api/v1/search?q=...`
- GET `/api/v1/autocomplete?q=...`

### Admin JWT protected
- GET `/api/admin/stats`
- GET `/api/admin/users`
- PATCH `/api/admin/users/{id}/status`
- PATCH `/api/admin/users/{id}/plan`
- POST `/api/admin/users/{id}/states`
- GET `/api/admin/logs`
- POST `/api/v1/keys`

## Plan quotas
| Plan | Daily requests | Burst/minute |
|---|---:|---:|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

## Local setup
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Environment
```env
DATABASE_URL=
JWT_SECRET=
REDIS_URL=
REDIS_TOKEN=
PORT=3000
```

Never commit real API secrets, database URLs or JWT secrets.

## Dataset note
The currently supplied dataset upload contains AppleDouble `._` metadata/resource-fork files rather than the underlying spreadsheets, so the actual spreadsheet rows cannot yet be imported or validated. See the dataset analysis report for the current file-level assessment.
