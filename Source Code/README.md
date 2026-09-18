# Source Code

This folder packages the implementation files for the India Administrative Directory API.

## Included files

- `server.ts` — Express/TypeScript API server with authentication, hierarchy endpoints, search, autocomplete, admin routes, rate-limit headers and logging.
- `schema.prisma` — PostgreSQL/Prisma data model for Country → State → District → SubDistrict → Village plus users, API keys, state access and API logs.
- `seed.ts` — Small development seed for India/Maharashtra/Nandurbar/Akkalkuwa and sample villages.
- `import-mdss.py` — Excel-to-PostgreSQL import workflow for the MDDS-style hierarchy columns.
- `package.json` — Runtime and development dependencies/scripts used by the existing project.

The files are copied from the main implementation paths so the submission folder can be reviewed independently. Keep the canonical production source in `src/`, `prisma/`, and `scripts/`.
