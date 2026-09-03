# India Administrative Directory API

Scalable backend foundation for an India administrative hierarchy API.

## Stack
Node.js + Express.js | PostgreSQL/NeonDB | Prisma | Redis/Upstash | JWT + bcrypt | Vercel

## Hierarchy
Country -> State -> District -> SubDistrict -> Village

## Phase 1
Technical architecture, normalized database design, indexing strategy, validation, import workflow, caching, authentication and rate-limiting foundations.

## Planned API
- GET /api/v1/states
- GET /api/v1/districts
- GET /api/v1/sub-districts
- GET /api/v1/villages
- GET /api/v1/search
- POST /api/auth/login
- Admin/import endpoints

## Environment
DATABASE_URL, JWT_SECRET, REDIS_URL, REDIS_TOKEN, PORT
