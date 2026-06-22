/**
 * SUTAR OS Mock Service
 *
 * Lightweight stand-in for the production SUTAR services during local
 * development of commerce-identity. Exposes the four endpoints that
 * the SUTAR bridge calls:
 *
 *   POST /corpid/issue        - mint a universal identity
 *   POST /trust/link          - link a trust score to a corpId
 *   POST /trust/sync          - persist reputation data
 *   POST /policy/evaluate     - authorize a privileged action
 *   POST /events/publish      - pub/sub event bus
 *
 * In-memory only. No Mongo. Single process.
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';

const PORT = Number(process.env.PORT) || 4799;

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

interface TrustLink { corpId: string; subject: 'supplier' | 'buyer'; trustScoreId: string; createdAt: string }
interface TrustRecord { corpId: string; subject: 'supplier' | 'buyer'; overallScore: number; breakdown: Record<string, number>; updatedAt: string }
interface Policy { id: string; action: string; effect: 'allow' | 'deny' }

const trustLinks = new Map<string, TrustLink>();           // key: corpId
const trustRecords = new Map<string, TrustRecord>();
const events: Array<{ id: string; topic: string; payload: unknown; publishedAt: string }> = [];
const policies: Policy[] = [
  { id: 'p1', action: 'supplier.status.active',     effect: 'allow' },
  { id: 'p2', action: 'supplier.status.verified',   effect: 'allow' },
  { id: 'p3', action: 'supplier.status.suspended',  effect: 'allow' },
  { id: 'p4', action: 'supplier.status.blacklisted',effect: 'allow' },
  { id: 'p5', action: 'buyer.credit_limit.change',  effect: 'allow' },
];

app.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, service: 'sutar-mock', uptime: process.uptime() });
});

app.get('/ready', (_req: Request, res: Response) => {
  res.json({ success: true, service: 'sutar-mock', status: 'ready' });
});

// --- CorpID ---

function issueCorpId(type: 'supplier' | 'buyer' | 'unknown', isGuest?: boolean): string {
  const prefix = type === 'supplier' ? 'SUP' : type === 'buyer' ? 'BUY' : 'ID';
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ts}${rand}`;
}

app.post('/corpid/issue', (req: Request, res: Response) => {
  const { type, businessName, email, phone, isGuest } = req.body || {};
  const t: 'supplier' | 'buyer' | 'unknown' =
    type === 'supplier' ? 'supplier' : type === 'buyer' ? 'buyer' : 'unknown';
  const corpId = issueCorpId(t, !!isGuest);
  res.json({
    success: true,
    data: {
      corpId,
      type: t,
      businessName: businessName || '',
      email: email || '',
      phone: phone || '',
      isGuest: !!isGuest,
      issuedAt: new Date().toISOString(),
    },
  });
});

// --- Trust score link ---

app.post('/trust/link', (req: Request, res: Response) => {
  const { corpId, subject } = req.body || {};
  if (!corpId || !subject) {
    return res.status(400).json({ success: false, error: 'corpId and subject required' });
  }
  const trustScoreId = `trust_${crypto.randomBytes(4).toString('hex')}`;
  trustLinks.set(corpId, { corpId, subject, trustScoreId, createdAt: new Date().toISOString() });
  res.json({ success: true, data: { trustScoreId } });
});

app.get('/trust/:corpId', (req: Request, res: Response) => {
  const link = trustLinks.get(req.params.corpId);
  if (!link) return res.status(404).json({ success: false, error: 'no trust link' });
  const record = trustRecords.get(req.params.corpId);
  res.json({ success: true, data: { link, record: record || null } });
});

// --- Trust score sync ---

app.post('/trust/sync', (req: Request, res: Response) => {
  const { corpId, subject, overallScore, breakdown } = req.body || {};
  if (!corpId) return res.status(400).json({ success: false, error: 'corpId required' });
  trustRecords.set(corpId, {
    corpId,
    subject: subject || 'supplier',
    overallScore: Number(overallScore) || 0,
    breakdown: breakdown || {},
    updatedAt: new Date().toISOString(),
  });
  res.json({ success: true });
});

// --- Policy ---

app.post('/policy/evaluate', (req: Request, res: Response) => {
  const { action, corpId, context } = req.body || {};
  // Default-deny unknown actions; allow listed ones.
  const policy = policies.find((p) => p.action === action);
  if (!policy) {
    return res.json({ success: true, data: { allowed: true, reason: 'no policy defined; default allow' } });
  }
  if (policy.effect === 'deny') {
    return res.json({ success: true, data: { allowed: false, reason: `policy ${policy.id} denies` } });
  }
  // Example guardrail: deny huge credit limit changes
  if (action === 'buyer.credit_limit.change' && context?.newLimit > 100_000_000) {
    return res.json({ success: true, data: { allowed: false, reason: 'limit exceeds 10 lakh requires manual approval' } });
  }
  res.json({ success: true, data: { allowed: true, reason: `policy ${policy.id} allows`, corpId, action } });
});

app.get('/policy', (_req: Request, res: Response) => {
  res.json({ success: true, data: policies });
});

// --- Event bus ---

app.post('/events/publish', (req: Request, res: Response) => {
  const { topic, payload } = req.body || {};
  if (!topic) return res.status(400).json({ success: false, error: 'topic required' });
  const evt = { id: crypto.randomUUID(), topic, payload, publishedAt: new Date().toISOString() };
  events.push(evt);
  if (events.length > 1000) events.splice(0, events.length - 1000);
  res.json({ success: true, data: { eventId: evt.id } });
});

app.get('/events', (req: Request, res: Response) => {
  const topic = (req.query.topic as string) || '';
  const filtered = topic ? events.filter((e) => e.topic === topic) : events;
  res.json({ success: true, data: filtered.slice(-100) });
});

app.get('/stats', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      trustLinks: trustLinks.size,
      trustRecords: trustRecords.size,
      eventsPublished: events.length,
      policies: policies.length,
    },
  });
});

// --- error handling ---

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('SUTAR mock error:', err.message);
  res.status(500).json({ success: false, error: 'internal error' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'not found' });
});

const server = app.listen(PORT, () => {
  console.log(`SUTAR mock listening on :${PORT}  (health: http://localhost:${PORT}/health)`);
});

const shutdown = (sig: string) => {
  console.log(`Received ${sig}, shutting down...`);
  server.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
