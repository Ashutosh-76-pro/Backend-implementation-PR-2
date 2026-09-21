# Deployment Guide

## Local

1. Install dependencies: `npm install`
2. Generate Prisma client: `npx prisma generate`
3. Configure `DATABASE_URL`, `JWT_SECRET`, and optional Redis variables.
4. Apply database migrations.
5. Seed development data with `npm run db:seed`.
6. Start development server with `npm run dev`.

## Production build

```bash
npm run build
npm start
```

## Vercel-oriented structure

The supplied architecture describes a Vercel-compatible layout containing API/serverless functions, frontend assets, Prisma configuration and `vercel.json`.

## Environment variables

The supplied specification references:

- DATABASE_URL
- REDIS_URL
- JWT_SECRET
- ADMIN_EMAIL
- ADMIN_PASSWORD_HASH
- SMTP_* configuration

Do not commit live secrets.

## Migration safety

The architecture calls for testing migrations on staging, validating data integrity after migration and maintaining a rollback plan.
