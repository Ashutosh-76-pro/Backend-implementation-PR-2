# Phase 1 — Technical Architecture

## 3.1 Technology Stack
| Component | Technology | Purpose |
|---|---|---|
| Backend | Node.js + Express | REST API |
| Database | Neon PostgreSQL | Persistent hierarchy data |
| ORM | Prisma | Type-safe access and migrations |
| Cache | Redis/Upstash | Cache/rate-limit extension point |
| Auth | JWT + bcrypt | Stateless authentication |
| Hosting | Vercel-compatible Node deployment | CI/CD and scaling |

## 3.2 Architecture
```text
React SPA / B2B Client / Demo Client
             |
        HTTPS REST API
             |
   Helmet + CORS + Rate Limit
             |
      Express Controllers
             |
        Prisma ORM
          /     \
     Redis      Neon PostgreSQL
                    |
 Country -> State -> District -> SubDistrict -> Village
```

## 3.3 Request Flow
1. Client sends request.
2. HTTP security and rate-limit middleware execute.
3. Authenticated endpoints validate JWT.
4. Zod validates request input.
5. Prisma executes indexed PostgreSQL queries.
6. API returns standardized JSON and pagination metadata.
7. Production deployment can add Redis caching and asynchronous API logs.

## 3.4 Data Import Strategy
- Read MDDS Excel using Python/pandas/openpyxl.
- Validate required columns and nulls.
- Normalize codes as strings to preserve leading zeroes.
- Upsert Country, State, District and SubDistrict in hierarchy order.
- Batch villages in chunks of 5,000.
- Record invalid rows and continue non-fatal failures.
- Run counts, orphan checks and random hierarchy spot checks after import.

## 3.5 Performance
- Composite unique keys prevent duplicates.
- Foreign-key indexes support hierarchy traversal.
- Name indexes support common lookups; PostgreSQL trigram indexes can be added for fuzzy search at scale.
- Pagination caps responses at 100 records.
- Redis is an optional production cache/rate-limit layer.
