# India Administrative Directory API — PPT / Slides

## Slide 1 — Title
**India Administrative Directory API**  
B2B Administrative Hierarchy & Address Autocomplete Platform  
Prepared by: **Ashutosh Yadav**

## Slide 2 — Problem
Businesses need standardized village and administrative hierarchy data for forms, onboarding, logistics and regional operations.

## Slide 3 — Solution
Country → State → District → Sub-District → Village, exposed through secure REST endpoints.

## Slide 4 — Technology
Node.js, Express, TypeScript, PostgreSQL/NeonDB, Prisma, JWT, bcrypt, Zod, Helmet, express-rate-limit.

## Slide 5 — Authentication & Security
Business-email registration, pending approval, JWT login, API key/secret authentication, hashing, expiry/revocation and security headers.

## Slide 6 — Core API
- GET /api/v1/states
- GET /api/v1/states/{id}/districts
- GET /api/v1/districts/{id}/subdistricts
- GET /api/v1/subdistricts/{id}/villages
- GET /api/v1/search?q=
- GET /api/v1/autocomplete?q=

## Slide 7 — Admin & B2B
Admin stats, user management, plans, state access, API logs and API-key lifecycle.

## Slide 8 — Data & Database
Prisma relations model Country, State, District, SubDistrict and Village. MDDS-style Excel import validates and upserts hierarchy records.

## Slide 9 — Demo
Register/login → authenticate → search → autocomplete → receive full hierarchy → review admin usage/logs.

## Slide 10 — Conclusion
The platform provides a modular foundation for a secure B2B administrative-data API and can be extended with a full dashboard, Redis caching and complete production data.