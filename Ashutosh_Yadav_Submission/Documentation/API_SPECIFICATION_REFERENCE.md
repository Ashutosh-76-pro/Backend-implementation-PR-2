# API Specification Reference

This document summarizes the supplied project specification used for packaging this repository.

## API

- Production: `https://api.villageapi.com/v1/`
- Staging: `https://staging-api.villageapi.com/v1/`
- Local: `http://localhost:3000/v1/`
- Authentication: `X-API-Key`; write operations also use `X-API-Secret`.
- Response metadata includes request ID, response time and rate-limit status.
- Search covers villages, states, districts and sub-districts.
- Hierarchy endpoints support pagination and dependent navigation.
- Error codes include INVALID_QUERY, INVALID_API_KEY, ACCESS_DENIED, NOT_FOUND, RATE_LIMITED and INTERNAL_ERROR.

## Frontend

The supplied requirements specify React 18+ with TypeScript, Vite, Tailwind CSS, Recharts, Zustand and React Query.

Dashboard requirements include responsive navigation, sortable/filterable data tables, export support and performance targets.

## Admin panel

Required analytics include state rankings, API request trends, user plan distribution, response-time trends, endpoint request volume and usage by hour.

Required user administration includes search/filter/sort, bulk status actions, profile review, API-key management, request history and state-access controls.

## B2B portal

Registration requires business email, business name, optional GST number, phone, password and confirmation. New accounts enter PENDING_APPROVAL until reviewed.

The user dashboard displays request usage, monthly requests, response time and successful-request percentage.

## Security and plans

The supplied requirements define JWT for dashboard access, API key + secret for API access, bcrypt hashing for secrets, key revocation/expiry, security headers and plan-specific request limits.

## Deployment

The specification describes a Vercel-compatible project with API/serverless functions, frontend, Prisma and environment variables for the database, Redis, JWT, admin login and SMTP.

## Demo client

The demo is a simple contact form using village autocomplete. The selected village populates the full standardized Indian address hierarchy.

This document is a reference summary, not a replacement for the complete supplied specification.
