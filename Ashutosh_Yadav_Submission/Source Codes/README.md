# Source Codes

This folder contains the runnable backend implementation for the India Administrative Directory API.

- `server.ts` — Express API, authentication, search, autocomplete, admin routes and rate limiting
- `schema.prisma` — PostgreSQL/Prisma data model
- `seed.ts` — development seed data
- `import-mdss.py` — MDDS-style Excel import utility
- `package.json` — Node.js dependencies and scripts

Run locally:
```bash
npm install
npx prisma generate
npm run db:seed
npm run dev
```
