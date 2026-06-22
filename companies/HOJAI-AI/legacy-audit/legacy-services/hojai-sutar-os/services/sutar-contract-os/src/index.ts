// ============================================================================
// SUTAR Contract OS - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Types
export type ContractStatus = 'draft' | 'pending' | 'active' | 'expired' | 'terminated' | 'disputed';
export type ContractType = 'service' | 'nda' | 'partnership' | 'employment' | 'licensing' | 'vendor' | 'customer';

export interface Contract {
  id: string;
  type: ContractType;
  title: string;
  parties: Party[];
  terms: string;
  clauses: Clause[];
  startDate: string;
  endDate: string;
  value?: number;
  currency?: string;
  status: ContractStatus;
  signatures: Signature[];
  createdAt: string;
  updatedAt: string;
}

export interface Party {
  id: string;
  name: string;
  email: string;
  role: string;
  signed: boolean;
  signedAt?: string;
}

export interface Clause {
  id: string;
  title: string;
  content: string;
  required: boolean;
  category: string;
}

export interface Signature {
  partyId: string;
  signature: string;
  ipAddress: string;
  timestamp: string;
  status: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// In-memory store
const contracts = new Map<string, Contract>();
const templates = new Map<string, any>();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4190;
const START_TIME = Date.now();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, error: 'Too many requests' } });
app.use('/api/', limiter);

// Request ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({ timestamp: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start }));
  });
  next();
});

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({ success, data, error, timestamp: new Date().toISOString(), requestId });

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { status: 'healthy', service: 'sutar-contract-os', version: '1.0.0', uptime: Math.floor((Date.now() - START_TIME) / 1000) }));
});
app.get('/health/ready', (_req: Request, res: Response) => res.json(apiResponse(true, { ready: true })));
app.get('/health/live', (_req: Request, res: Response) => res.json(apiResponse(true, { alive: true })));

// Contract CRUD
app.post('/api/v1/contracts', (req: Request, res: Response) => {
  try {
    const { type, title, parties, terms, clauses, startDate, endDate, value, currency } = req.body;
    if (!type || !title || !parties || !terms) {
      res.status(400).json(apiResponse(false, undefined, 'Missing required fields'));
      return;
    }
    const contract: Contract = {
      id: `contract-${uuidv4()}`,
      type, title,
      parties: parties.map((p: any) => ({ id: `party-${uuidv4()}`, name: p.name, email: p.email, role: p.role || 'client', signed: false })),
      terms,
      clauses: (clauses || []).map((c: any) => ({ id: `clause-${uuidv4()}`, title: c.title, content: c.content, required: c.required || false, category: c.category || 'general' })),
      startDate, endDate, value, currency: currency || 'INR',
      status: 'draft',
      signatures: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    contracts.set(contract.id, contract);
    console.log(`[CONTRACT] Created: ${contract.id}`);
    res.status(201).json(apiResponse(true, contract, undefined, (req as any).requestId));
  } catch (error) {
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

app.get('/api/v1/contracts', (req: Request, res: Response) => {
  const { status, type, limit = 50, offset = 0 } = req.query;
  let result = Array.from(contracts.values());
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));
  res.json(apiResponse(true, { contracts: result, total, limit: Number(limit), offset: Number(offset) }));
});

app.get('/api/v1/contracts/:id', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json(apiResponse(false, undefined, 'Contract not found')); return; }
  res.json(apiResponse(true, contract));
});

app.put('/api/v1/contracts/:id', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json(apiResponse(false, undefined, 'Contract not found')); return; }
  const { terms, clauses, endDate, status } = req.body;
  if (terms) contract.terms = terms;
  if (clauses) contract.clauses = clauses;
  if (endDate) contract.endDate = endDate;
  if (status) contract.status = status;
  contract.updatedAt = new Date().toISOString();
  contracts.set(contract.id, contract);
  res.json(apiResponse(true, contract));
});

app.post('/api/v1/contracts/:id/sign', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json(apiResponse(false, undefined, 'Contract not found')); return; }
  const { partyId, signature } = req.body;
  if (!partyId || !signature) { res.status(400).json(apiResponse(false, undefined, 'partyId and signature required')); return; }
  const party = contract.parties.find(p => p.id === partyId);
  if (!party) { res.status(404).json(apiResponse(false, undefined, 'Party not found')); return; }
  party.signed = true;
  party.signedAt = new Date().toISOString();
  contract.signatures.push({ partyId, signature, ipAddress: req.ip || 'unknown', timestamp: new Date().toISOString(), status: 'signed' });
  contract.status = contract.parties.every(p => p.signed) ? 'active' : 'pending';
  contract.updatedAt = new Date().toISOString();
  contracts.set(contract.id, contract);
  console.log(`[CONTRACT] Signed: ${contract.id} by ${party.email}`);
  res.json(apiResponse(true, contract));
});

app.post('/api/v1/contracts/:id/terminate', (req: Request, res: Response) => {
  const contract = contracts.get(req.params.id);
  if (!contract) { res.status(404).json(apiResponse(false, undefined, 'Contract not found')); return; }
  contract.status = 'terminated';
  contract.updatedAt = new Date().toISOString();
  console.log(`[CONTRACT] Terminated: ${contract.id}`);
  res.json(apiResponse(true, contract));
});

// Templates
app.post('/api/v1/templates', (req: Request, res: Response) => {
  const { name, type, terms, clauses } = req.body;
  const template = { id: `template-${uuidv4()}`, name, type, terms, clauses: clauses || [], createdAt: new Date().toISOString() };
  templates.set(template.id, template);
  res.status(201).json(apiResponse(true, template));
});

app.get('/api/v1/templates', (req: Request, res: Response) => {
  const { type } = req.query;
  let result = Array.from(templates.values());
  if (type) result = result.filter((t: any) => t.type === type);
  res.json(apiResponse(true, { templates: result }));
});

// 404 & Error
app.use((_req: Request, res: Response) => res.status(404).json(apiResponse(false, undefined, 'Not found')));
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
});

process.on('SIGTERM', () => { console.log('Shutting down...'); process.exit(0); });
process.on('SIGINT', () => { console.log('Shutting down...'); process.exit(0); });

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════════════╗
║        SUTAR CONTRACT OS v1.0.0                      ║
║═══════════════════════════════════════════════════════║
║  Port:     ${PORT}                                       ║
║  Status:   RUNNING                                     ║
╚═══════════════════════════════════════════════════════╝\n`);
});

export default app;
