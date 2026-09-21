# Database Design

## Hierarchy

```text
Country
  └── State
       └── District
            └── SubDistrict
                 └── Village
```

## Supporting entities

- **User** — business identity, password hash, status, plan and role.
- **ApiKey** — API key, bcrypt secret hash, owner, expiry/revocation and last-used timestamp.
- **UserStateAccess** — many-to-many mapping between users and states.
- **ApiLog** — request ID, endpoint, method, status code, response time, masked IP and user/API-key references.

## Integrity

Prisma relations enforce parent-child links. Composite unique constraints prevent duplicate state/district/sub-district records inside their parent scope, while village code is globally unique.

## Query support

Indexes are defined for common name and parent-ID lookups. The API limits page size and performs hierarchy filtering in database queries.

## Production extension

For large-scale fuzzy search, the architecture document notes PostgreSQL trigram indexes as a possible extension. Redis/Upstash can be used for caching read-heavy endpoints.
