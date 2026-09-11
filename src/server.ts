import 'dotenv/config';
import crypto from 'node:crypto';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, PlanType, UserRole, UserStatus } from '@prisma/client';
import { z } from 'zod';

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';

const PLAN_LIMITS: Record<PlanType, { daily: number; burst: number }> = {
  FREE: { daily: 5_000, burst: 100 },
  PREMIUM: { daily: 50_000, burst: 500 },
  PRO: { daily: 300_000, burst: 2_000 },
  UNLIMITED: { daily: 1_000_000, burst: 5_000 },
};

const appJson = (success: boolean, count: number, data: unknown, req: express.Request, extra: Record<string, unknown> = {}) => ({
  success,
  count,
  data,
  meta: {
    requestId: (req as any).requestId,
    responseTime: Date.now() - ((req as any).startedAt || Date.now()),
    ...extra,
  },
});

const errorResponse = (req: express.Request, code: string, message: string, status: number, details?: unknown) =>
  appJson(false, 0, null, req, { error: { code, message, ...(details ? { details } : {}) } });

app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"] } } }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  (req as any).requestId = `req_${crypto.randomBytes(8).toString('hex')}`;
  (req as any).startedAt = Date.now();
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

app.use('/api', rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => res.status(429).json(errorResponse(req, 'RATE_LIMITED', 'Too many requests', 429)),
}));

const pagination = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  search: z.string().trim().max(100).optional(),
});

const tokenUser = (req: express.Request) => (req as any).user as { id: string; role: UserRole } | undefined;
const apiContext = (req: express.Request) => (req as any).apiContext as { userId: string; apiKeyId: string; plan: PlanType; states: string[] } | undefined;

function authJwt(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'Authentication required', 401));
  try {
    (req as any).user = jwt.verify(header.slice(7), jwtSecret) as { id: string; role: UserRole };
    return next();
  } catch {
    return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'Invalid or expired token', 401));
  }
}

async function apiKeyAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = req.header('X-API-Key');
  if (!key) return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'X-API-Key header is required', 401));

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: true },
  });
  if (!apiKey || apiKey.revokedAt || (apiKey.expiresAt && apiKey.expiresAt <= new Date())) {
    return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'API key is invalid, revoked, or expired', 401));
  }
  if (apiKey.user.status !== UserStatus.ACTIVE) {
    return res.status(403).json(errorResponse(req, 'ACCESS_DENIED', 'User account is not active', 403));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const usedToday = await prisma.apiLog.count({ where: { apiKeyId: apiKey.id, createdAt: { gte: today } } });
  const limits = PLAN_LIMITS[apiKey.user.planType];
  if (usedToday >= limits.daily) {
    res.setHeader('X-RateLimit-Limit', limits.daily);
    res.setHeader('X-RateLimit-Remaining', 0);
    res.setHeader('X-RateLimit-Reset', Math.floor(new Date(today.getTime() + 86_400_000).getTime() / 1000));
    return res.status(429).json(errorResponse(req, 'RATE_LIMITED', 'Daily quota exceeded', 429));
  }

  const secret = req.header('X-API-Secret');
  if (req.method !== 'GET' && !secret) return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'X-API-Secret header is required for write operations', 401));
  if (req.method !== 'GET' && secret && !(await bcrypt.compare(secret, apiKey.secretHash))) {
    return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'Invalid API secret', 401));
  }

  const access = await prisma.userStateAccess.findMany({ where: { userId: apiKey.userId }, select: { stateId: true } });
  (req as any).apiContext = { userId: apiKey.userId, apiKeyId: apiKey.id, plan: apiKey.user.planType, states: access.map((x) => x.stateId) };
  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });
  res.setHeader('X-RateLimit-Limit', limits.daily);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limits.daily - usedToday - 1));
  res.setHeader('X-RateLimit-Reset', Math.floor(new Date(today.getTime() + 86_400_000).getTime() / 1000));
  return next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (tokenUser(req)?.role !== UserRole.ADMIN) return res.status(403).json(errorResponse(req, 'ACCESS_DENIED', 'Admin access required', 403));
  return next();
}

function businessEmail(email: string) {
  const free = new Set(['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'proton.me', 'protonmail.com']);
  const domain = email.split('@')[1]?.toLowerCase();
  return Boolean(domain && !free.has(domain));
}

async function maskedIp(req: express.Request) {
  const ip = (req.ip || req.socket.remoteAddress || '').replace('::ffff:', '');
  if (!ip) return undefined;
  if (ip.includes('.')) return ip.split('.').slice(0, 3).join('.') + '.0';
  return ip.length > 6 ? `${ip.slice(0, 6)}::` : ip;
}

app.use(async (req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = ((body: any) => {
    void prisma.apiLog.create({
      data: {
        requestId: String((req as any).requestId),
        endpoint: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        responseTime: Date.now() - Number((req as any).startedAt || Date.now()),
        ipAddress: maskedIp(req),
        userId: apiContext(req)?.userId || tokenUser(req)?.id,
        apiKeyId: apiContext(req)?.apiKeyId,
      },
    }).catch(() => undefined);
    return originalJson(body);
  }) as any;
  next();
});

app.get('/health', async (req, res) => res.json(appJson(true, 1, { status: 'ok', service: 'india-admin-directory-api' }, req)));

const registrationSchema = z.object({
  email: z.string().email(),
  businessName: z.string().trim().min(2).max(150),
  gstNumber: z.string().trim().max(30).optional(),
  phone: z.string().trim().min(7).max(20),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
  confirmPassword: z.string(),
}).refine((x) => x.password === x.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

app.post('/api/auth/register', async (req, res) => {
  const parsed = registrationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'Invalid registration input', 400, parsed.error.flatten()));
  if (!businessEmail(parsed.data.email)) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'Business email is required', 400));
  if (await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })) return res.status(409).json(errorResponse(req, 'INVALID_QUERY', 'Email already registered', 409));
  const password = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({ data: {
    email: parsed.data.email.toLowerCase(), businessName: parsed.data.businessName, gstNumber: parsed.data.gstNumber,
    phone: parsed.data.phone, password, status: UserStatus.PENDING_APPROVAL,
  }});
  return res.status(201).json(appJson(true, 1, { id: user.id, email: user.email, status: user.status }, req));
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'Invalid input', 400));
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) return res.status(401).json(errorResponse(req, 'INVALID_API_KEY', 'Invalid credentials', 401));
  if (user.status === UserStatus.SUSPENDED) return res.status(403).json(errorResponse(req, 'ACCESS_DENIED', 'Account is suspended', 403));
  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '24h' });
  return res.json(appJson(true, 1, { token, user: { id: user.id, email: user.email, role: user.role, status: user.status, planType: user.planType } }, req));
});

app.get('/api/v1/states', apiKeyAuth, async (req, res) => {
  const p = pagination.parse(req.query);
  const where = p.search ? { name: { contains: p.search, mode: 'insensitive' as const } } : {};
  const [data, total] = await Promise.all([
    prisma.state.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, countryId: true } }),
    prisma.state.count({ where }),
  ]);
  return res.json(appJson(true, data.length, data, req, { total, page: p.page, limit: p.limit }));
});

app.get('/api/v1/states/:id/districts', apiKeyAuth, async (req, res) => {
  const p = pagination.parse(req.query);
  const ctx = apiContext(req)!;
  if (ctx.plan === PlanType.FREE && !ctx.states.includes(req.params.id)) return res.status(403).json(errorResponse(req, 'ACCESS_DENIED', 'State access is not granted for this API key', 403));
  const where = { stateId: req.params.id, ...(p.search ? { name: { contains: p.search, mode: 'insensitive' as const } } : {}) };
  const [data, total] = await Promise.all([
    prisma.district.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, stateId: true } }),
    prisma.district.count({ where }),
  ]);
  return res.json(appJson(true, data.length, data, req, { total, page: p.page, limit: p.limit }));
});

app.get('/api/v1/districts/:id/subdistricts', apiKeyAuth, async (req, res) => {
  const p = pagination.parse(req.query);
  const district = await prisma.district.findUnique({ where: { id: req.params.id }, select: { stateId: true } });
  if (!district) return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'District not found', 404));
  const ctx = apiContext(req)!;
  if (ctx.plan === PlanType.FREE && !ctx.states.includes(district.stateId)) return res.status(403).json(errorResponse(req, 'ACCESS_DENIED', 'State access is not granted for this API key', 403));
  const where = { districtId: req.params.id, ...(p.search ? { name: { contains: p.search, mode: 'insensitive' as const } } : {}) };
  const [data, total] = await Promise.all([
    prisma.subDistrict.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true, districtId: true } }),
    prisma.subDistrict.count({ where }),
  ]);
  return res.json(appJson(true, data.length, data, req, { total, page: p.page, limit: p.limit }));
});

app.get('/api/v1/subdistricts/:id/villages', apiKeyAuth, async (req, res) => {
  const p = pagination.parse(req.query);
  const sub = await prisma.subDistrict.findUnique({ where: { id: req.params.id }, select: { district: { select: { stateId: true } } } });
  if (!sub) return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'Sub-district not found', 404));
  const ctx = apiContext(req)!;
  if (ctx.plan === PlanType.FREE && !ctx.states.includes(sub.district.stateId)) return res.status(403).json(errorResponse(req, 'ACCESS_DENIED', 'State access is not granted for this API key', 403));
  const where = { subDistrictId: req.params.id, ...(p.search ? { name: { contains: p.search, mode: 'insensitive' as const } } : {}) };
  const [rows, total] = await Promise.all([
    prisma.village.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
    prisma.village.count({ where }),
  ]);
  const data = rows.map((v) => ({ value: v.id, label: v.name, code: v.code }));
  return res.json(appJson(true, data.length, data, req, { total, page: p.page, limit: p.limit }));
});

app.get('/api/v1/search', apiKeyAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'q must contain at least 2 characters', 400));
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const ctx = apiContext(req)!;
  const stateFilter = ctx.plan === PlanType.FREE ? { stateId: { in: ctx.states } } : {};
  const [states, districts, subDistricts, villages] = await Promise.all([
    prisma.state.findMany({ where: { name: { contains: q, mode: 'insensitive' }, ...(ctx.plan === PlanType.FREE ? { id: { in: ctx.states } } : {}) }, take: limit, select: { id: true, code: true, name: true } }),
    prisma.district.findMany({ where: { name: { contains: q, mode: 'insensitive' }, ...stateFilter }, take: limit, select: { id: true, code: true, name: true, state: { select: { code: true, name: true } } } }),
    prisma.subDistrict.findMany({ where: { name: { contains: q, mode: 'insensitive' }, district: stateFilter ? { is: { stateId: stateFilter.stateId } } : undefined }, take: limit, select: { id: true, code: true, name: true, district: { select: { code: true, name: true, state: { select: { code: true, name: true } } } } } }),
    prisma.village.findMany({ where: { name: { contains: q, mode: 'insensitive' }, subDistrict: { is: { district: { is: stateFilter ? { stateId: stateFilter.stateId } : {} } } } }, take: limit, select: { id: true, code: true, name: true, subDistrict: { select: { code: true, name: true, district: { select: { code: true, name: true, state: { select: { code: true, name: true } } } } } } } }),
  ]);
  return res.json(appJson(true, states.length + districts.length + subDistricts.length + villages.length, { states, districts, subDistricts, villages }, req));
});

app.get('/api/v1/autocomplete', apiKeyAuth, async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q.length < 2) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'q must contain at least 2 characters', 400));
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const ctx = apiContext(req)!;
  const rows = await prisma.village.findMany({
    where: { name: { contains: q, mode: 'insensitive' }, ...(ctx.plan === PlanType.FREE ? { subDistrict: { is: { district: { is: { stateId: { in: ctx.states } } } } } } : {}) },
    take: limit,
    orderBy: { name: 'asc' },
    select: { id: true, code: true, name: true, subDistrict: { select: { name: true, district: { select: { name: true, state: { select: { name: true } } } } } } },
  });
  const data = rows.map((v) => ({ value: v.id, label: v.name, fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`, hierarchy: { village: v.name, subDistrict: v.subDistrict.name, district: v.subDistrict.district.name, state: v.subDistrict.district.state.name, country: 'India' } }));
  return res.json(appJson(true, data.length, data, req));
});

app.get('/api/v1/states', apiKeyAuth, async (req, res, next) => next());

app.post('/api/v1/keys', authJwt, requireAdmin, async (req, res) => {
  const parsed = z.object({ userId: z.string(), name: z.string().min(2), expiresAt: z.coerce.date().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'Invalid key input', 400, parsed.error.flatten()));
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } });
  if (!user) return res.status(404).json(errorResponse(req, 'NOT_FOUND', 'User not found', 404));
  const activeKeys = await prisma.apiKey.count({ where: { userId: user.id, revokedAt: null } });
  if (activeKeys >= 5) return res.status(400).json(errorResponse(req, 'ACCESS_DENIED', 'A user can have up to 5 active keys', 400));
  const key = `ak_${crypto.randomBytes(16).toString('hex')}`;
  const secret = `as_${crypto.randomBytes(16).toString('hex')}`;
  const created = await prisma.apiKey.create({ data: { name: parsed.data.name, key, secretHash: await bcrypt.hash(secret, 12), userId: user.id, expiresAt: parsed.data.expiresAt } });
  return res.status(201).json(appJson(true, 1, { id: created.id, key: created.key, secret, createdAt: created.createdAt, expiresAt: created.expiresAt, warning: 'Store the secret securely. It is displayed only once.' }, req));
});

app.get('/api/admin/stats', authJwt, requireAdmin, async (req, res) => {
  const [states, districts, subDistricts, villages, users, requestsToday] = await Promise.all([
    prisma.state.count(), prisma.district.count(), prisma.subDistrict.count(), prisma.village.count(), prisma.user.count(),
    prisma.apiLog.count({ where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } } }),
  ]);
  return res.json(appJson(true, 1, { states, districts, subDistricts, villages, users, requestsToday }, req));
});

app.get('/api/admin/users', authJwt, requireAdmin, async (req, res) => {
  const p = pagination.parse(req.query);
  const status = typeof req.query.status === 'string' && Object.values(UserStatus).includes(req.query.status as UserStatus) ? req.query.status as UserStatus : undefined;
  const planType = typeof req.query.planType === 'string' && Object.values(PlanType).includes(req.query.planType as PlanType) ? req.query.planType as PlanType : undefined;
  const where = { ...(status ? { status } : {}), ...(planType ? { planType } : {}), ...(p.search ? { OR: [ { email: { contains: p.search, mode: 'insensitive' as const } }, { businessName: { contains: p.search, mode: 'insensitive' as const } } ] } : {}) };
  const [users, total] = await Promise.all([
    prisma.user.findMany({ where, skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' }, select: { id: true, email: true, businessName: true, gstNumber: true, phone: true, status: true, planType: true, role: true, createdAt: true } }),
    prisma.user.count({ where }),
  ]);
  return res.json(appJson(true, users.length, users, req, { total, page: p.page, limit: p.limit }));
});

app.patch('/api/admin/users/:id/status', authJwt, requireAdmin, async (req, res) => {
  const parsed = z.object({ status: z.nativeEnum(UserStatus), reason: z.string().max(500).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'Invalid status', 400));
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { status: parsed.data.status } });
  return res.json(appJson(true, 1, { id: user.id, status: user.status, reason: parsed.data.reason }, req));
});

app.patch('/api/admin/users/:id/plan', authJwt, requireAdmin, async (req, res) => {
  const parsed = z.object({ planType: z.nativeEnum(PlanType) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'Invalid plan type', 400));
  const user = await prisma.user.update({ where: { id: req.params.id }, data: { planType: parsed.data.planType } });
  return res.json(appJson(true, 1, { id: user.id, planType: user.planType }, req));
});

app.post('/api/admin/users/:id/states', authJwt, requireAdmin, async (req, res) => {
  const parsed = z.object({ stateIds: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json(errorResponse(req, 'INVALID_QUERY', 'stateIds must be a non-empty array', 400));
  await prisma.userStateAccess.deleteMany({ where: { userId: req.params.id } });
  await prisma.userStateAccess.createMany({ data: parsed.data.stateIds.map((stateId) => ({ userId: req.params.id, stateId })), skipDuplicates: true });
  return res.json(appJson(true, parsed.data.stateIds.length, parsed.data.stateIds, req));
});

app.get('/api/admin/logs', authJwt, requireAdmin, async (req, res) => {
  const p = pagination.parse(req.query);
  const logs = await prisma.apiLog.findMany({ skip: (p.page - 1) * p.limit, take: p.limit, orderBy: { createdAt: 'desc' }, include: { user: { select: { email: true, businessName: true } }, apiKey: { select: { key: true } } } });
  const data = logs.map((log) => ({ ...log, apiKey: log.apiKey ? `${log.apiKey.key.slice(0, 7)}****` : null, ipAddress: log.ipAddress ? `${log.ipAddress.split('.').slice(0, 3).join('.')}.0` : null }));
  return res.json(appJson(true, data.length, data, req, { page: p.page, limit: p.limit }));
});

app.get('/api/docs/openapi.json', async (req, res) => {
  res.json({ openapi: '3.0.3', info: { title: 'India Administrative Directory API', version: '1.0.0' }, servers: [{ url: '/api/v1' }], paths: {
    '/states': { get: { summary: 'List states' } },
    '/states/{id}/districts': { get: { summary: 'Districts by state' } },
    '/districts/{id}/subdistricts': { get: { summary: 'Sub-districts by district' } },
    '/subdistricts/{id}/villages': { get: { summary: 'Villages by sub-district' } },
    '/search': { get: { summary: 'Search hierarchy' } },
    '/autocomplete': { get: { summary: 'Village autocomplete' } },
  }, security: [{ ApiKeyAuth: [] }], components: { securitySchemes: { ApiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' }, ApiSecretAuth: { type: 'apiKey', in: 'header', name: 'X-API-Secret' } } } });
});

app.use((_req, res) => res.status(404).json({ success: false, count: 0, data: null, meta: { error: { code: 'NOT_FOUND', message: 'Requested resource does not exist' } } }));
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  if (res.headersSent) return;
  return res.status(500).json(errorResponse(req, 'INTERNAL_ERROR', 'Server-side error', 500));
});

app.listen(port, () => console.log(`API listening on ${port}`));
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });
process.on('SIGINT', async () => { await prisma.$disconnect(); process.exit(0); });
