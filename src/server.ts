import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET || 'change-me-in-production';

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: true, legacyHeaders: false }));

const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), search: z.string().trim().optional() });
const tokenUser = (req: express.Request) => (req as any).user as { id: string; role: string } | undefined;

function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
  try { (req as any).user = jwt.verify(header.slice(7), jwtSecret); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}

app.get('/health', async (_req, res) => res.json({ status: 'ok', service: 'india-admin-directory-api' }));

app.post('/api/auth/register', async (req, res) => {
  const schema = z.object({ email: z.string().email(), password: z.string().min(8) });
  const parsed = schema.safeParse(req.body); if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) return res.status(409).json({ error: 'Email already registered' });
  const password = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({ data: { email: parsed.data.email, password } });
  return res.status(201).json({ id: user.id, email: user.email });
});

app.post('/api/auth/login', async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.password))) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: '8h' });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.role, planType: user.planType } });
});

app.get('/api/v1/states', async (req, res) => {
  const p = pagination.parse(req.query); const where = p.search ? { name: { contains: p.search, mode: 'insensitive' as const } } : {};
  const [data, total] = await Promise.all([prisma.state.findMany({ where, skip: (p.page-1)*p.limit, take: p.limit, orderBy: { name: 'asc' }, select: { id:true, code:true, name:true, countryId:true } }), prisma.state.count({ where })]);
  res.json({ data, pagination: { page:p.page, limit:p.limit, total, pages:Math.ceil(total/p.limit) } });
});

app.get('/api/v1/districts', async (req, res) => {
  const p = pagination.parse(req.query); const stateId = typeof req.query.stateId === 'string' ? req.query.stateId : undefined;
  const where = { ...(stateId ? { stateId } : {}), ...(p.search ? { name:{ contains:p.search, mode:'insensitive' as const } } : {}) };
  const [data,total] = await Promise.all([prisma.district.findMany({ where, skip:(p.page-1)*p.limit, take:p.limit, orderBy:{name:'asc'}, include:{state:{select:{id:true,code:true,name:true}}} }),prisma.district.count({where})]);
  res.json({data,pagination:{page:p.page,limit:p.limit,total,pages:Math.ceil(total/p.limit)}});
});

app.get('/api/v1/sub-districts', async (req,res)=>{
  const p=pagination.parse(req.query); const districtId=typeof req.query.districtId==='string'?req.query.districtId:undefined;
  const where={...(districtId?{districtId}:{}),...(p.search?{name:{contains:p.search,mode:'insensitive' as const}}:{})};
  const [data,total]=await Promise.all([prisma.subDistrict.findMany({where,skip:(p.page-1)*p.limit,take:p.limit,orderBy:{name:'asc'},include:{district:{select:{id:true,code:true,name:true}}}}),prisma.subDistrict.count({where})]);
  res.json({data,pagination:{page:p.page,limit:p.limit,total,pages:Math.ceil(total/p.limit)}});
});

app.get('/api/v1/villages', async (req,res)=>{
  const p=pagination.parse(req.query); const subDistrictId=typeof req.query.subDistrictId==='string'?req.query.subDistrictId:undefined;
  const where={...(subDistrictId?{subDistrictId}:{}),...(p.search?{name:{contains:p.search,mode:'insensitive' as const}}:{})};
  const [data,total]=await Promise.all([prisma.village.findMany({where,skip:(p.page-1)*p.limit,take:p.limit,orderBy:{name:'asc'},include:{subDistrict:{select:{id:true,code:true,name:true,district:{select:{id:true,code:true,name:true,state:{select:{id:true,code:true,name:true}}}}}}}}),prisma.village.count({where})]);
  res.json({data,pagination:{page:p.page,limit:p.limit,total,pages:Math.ceil(total/p.limit)}});
});

app.get('/api/v1/search', async (req,res)=>{
  const q=typeof req.query.q==='string'?req.query.q.trim():''; if(q.length<2) return res.status(400).json({error:'q must contain at least 2 characters'});
  const limit=Math.min(Number(req.query.limit)||20,100);
  const [states,districts,subDistricts,villages]=await Promise.all([
    prisma.state.findMany({where:{name:{contains:q,mode:'insensitive'}},take:limit,select:{id:true,code:true,name:true}}),
    prisma.district.findMany({where:{name:{contains:q,mode:'insensitive'}},take:limit,select:{id:true,code:true,name:true,state:{select:{code:true,name:true}}}}),
    prisma.subDistrict.findMany({where:{name:{contains:q,mode:'insensitive'}},take:limit,select:{id:true,code:true,name:true,district:{select:{code:true,name:true,state:{select:{code:true,name:true}}}}}}),
    prisma.village.findMany({where:{name:{contains:q,mode:'insensitive'}},take:limit,select:{id:true,code:true,name:true,subDistrict:{select:{code:true,name:true,district:{select:{code:true,name:true,state:{select:{code:true,name:true}}}}}}}})
  ]); res.json({query:q,results:{states,districts,subDistricts,villages}});
});

app.get('/api/admin/stats', auth, async (req,res)=>{
  if(tokenUser(req)?.role!=='admin') return res.status(403).json({error:'Admin access required'});
  const [states,districts,subDistricts,villages,users]=await Promise.all([prisma.state.count(),prisma.district.count(),prisma.subDistrict.count(),prisma.village.count(),prisma.user.count()]);
  res.json({states,districts,subDistricts,villages,users});
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error(err); res.status(500).json({error:'Internal server error'}); });

app.listen(port, ()=>console.log(`API listening on ${port}`));
process.on('SIGTERM', async ()=>{ await prisma.$disconnect(); process.exit(0); });
