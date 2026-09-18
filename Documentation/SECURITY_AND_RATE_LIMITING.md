# Security & Rate Limiting

## Authentication layers

- Dashboard/user login: JWT.
- Programmatic B2B access: API key.
- Write operations: API key + secret.
- Admin actions: JWT with admin role.

## Secret handling

API secrets are stored as bcrypt hashes in the existing implementation and the generated secret is intended to be displayed only at creation time.

Real credentials must never be committed to Git.

## Account controls

- Pending approval on registration.
- Active/suspended account states.
- API key revocation.
- Optional API-key expiry.
- Maximum five active keys per user.
- State-level access checks.

## Rate limits

| Plan | Daily | Burst/minute |
|---|---:|---:|
| Free | 5,000 | 100 |
| Premium | 50,000 | 500 |
| Pro | 300,000 | 2,000 |
| Unlimited | 1,000,000 | 5,000 |

The supplied design includes usage alerts at 80%, 95% and quota exhaustion, plus admin alerts for unusual or capacity-heavy usage.

## Response headers

- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`

## API logging

Each request can record endpoint, method, status, response time, user/API-key context and a masked IP address for operational analytics.
