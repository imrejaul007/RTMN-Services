/**
 * nexha-reputation-os — port 4271
 *
 * The ACI (Autonomous Commerce Index) scoring engine for the Nexha federation.
 * Ingests reputation signals (transactions, disputes, endorsements, verifications,
 * risk events) and computes a 0-1000 score per Nexha, agent, merchant, etc.
 *
 * Endpoints:
 *   GET    /health
 *   GET    /api/v1/info
 *   POST   /api/v1/ingest                          Ingest a signal
 *   GET    /api/v1/scores/:subjectId              Get score
 *   GET    /api/v1/scores                          Query scores (filters)
 *   GET    /api/v1/scores/:subjectId/signals       Get signal log
 *   GET    /api/v1/scores/:subjectId/signals/:kind Get signals by kind
 *   GET    /api/v1/stats                           Federation stats
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import reputationService from './services/reputationService.js';
import type {
  ReputationSubjectType,
  ReputationSignal,
  TrustBand,
  HealthResponse
} from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4271;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.REPUTATION_OS_REQUIRE_AUTH !== 'false';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString()
});

const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[nexha-reputation-os] error:', msg);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

// Optional JWT auth
if (REQUIRE_AUTH) {
  try {
    // @ts-ignore — @rtmn/shared/auth has no .d.ts
    const authModule = await import('@rtmn/shared/auth');
    const { requireAuth } = authModule as { requireAuth: express.RequestHandler };
    app.use('/api/v1', requireAuth);
    console.log('[nexha-reputation-os] auth enabled');
  } catch {
    console.warn('[nexha-reputation-os] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seeded = reputationService.seedDemo();
console.log(`[nexha-reputation-os] seeded ${seeded} demo subjects`);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const SubjectTypeSchema = z.enum(['nexha', 'agent', 'merchant', 'user', 'asset', 'service']);

const SignalSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('transaction_success'), weight: z.number().positive(), amount: z.number().optional(), counterpartyId: z.string().optional(), occurredAt: z.string() }),
  z.object({ kind: z.literal('transaction_failure'), weight: z.number().positive(), amount: z.number().optional(), counterpartyId: z.string().optional(), occurredAt: z.string() }),
  z.object({ kind: z.literal('dispute_raised'), weight: z.number().positive(), counterpartyId: z.string().optional(), occurredAt: z.string() }),
  z.object({ kind: z.literal('dispute_resolved_in_favor'), weight: z.number().positive(), occurredAt: z.string() }),
  z.object({ kind: z.literal('dispute_resolved_against'), weight: z.number().positive(), occurredAt: z.string() }),
  z.object({ kind: z.literal('endorsement_received'), weight: z.number().positive(), endorserId: z.string(), occurredAt: z.string() }),
  z.object({ kind: z.literal('endorsement_given'), weight: z.number().positive(), recipientId: z.string(), occurredAt: z.string() }),
  z.object({ kind: z.literal('verification_kyc'), weight: z.number().positive(), verifierId: z.string(), occurredAt: z.string() }),
  z.object({ kind: z.literal('verification_business'), weight: z.number().positive(), verifierId: z.string(), occurredAt: z.string() }),
  z.object({ kind: z.literal('risk_event_low'), weight: z.number().positive(), occurredAt: z.string() }),
  z.object({ kind: z.literal('risk_event_medium'), weight: z.number().positive(), occurredAt: z.string() }),
  z.object({ kind: z.literal('risk_event_high'), weight: z.number().positive(), occurredAt: z.string() }),
  z.object({ kind: z.literal('risk_event_critical'), weight: z.number().positive(), occurredAt: z.string() }),
  z.object({ kind: z.literal('compliance_violation'), weight: z.number().positive(), occurredAt: z.string() })
]);

const IngestSchema = z.object({
  subjectId: z.string().min(1),
  subjectType: SubjectTypeSchema,
  signal: SignalSchema
});

const BandSchema = z.enum(['platinum', 'gold', 'silver', 'bronze', 'iron', 'restricted', 'unknown']);

const ScoreQuerySchema = z.object({
  subjectId: z.string().optional(),
  subjectType: SubjectTypeSchema.optional(),
  minAci: z.coerce.number().min(0).max(1000).optional(),
  maxAci: z.coerce.number().min(0).max(1000).optional(),
  band: BandSchema.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const SignalKindParam = z.enum([
  'transaction_success', 'transaction_failure',
  'dispute_raised', 'dispute_resolved_in_favor', 'dispute_resolved_against',
  'endorsement_received', 'endorsement_given',
  'verification_kyc', 'verification_business',
  'risk_event_low', 'risk_event_medium', 'risk_event_high', 'risk_event_critical',
  'compliance_violation'
]);

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const stats = reputationService.getFederationStats();
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-reputation-os',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    subjects: stats.totalSubjects,
    signals: stats.totalSignals,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'nexha-reputation-os',
    version: '0.1.0',
    description: 'ACI (Autonomous Commerce Index) scoring engine for the Nexha federation',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      ingest: 'POST /api/v1/ingest',
      getScore: 'GET /api/v1/scores/:subjectId',
      query: 'GET /api/v1/scores',
      signals: 'GET /api/v1/scores/:subjectId/signals',
      stats: 'GET /api/v1/stats'
    },
    signalKinds: [
      'transaction_success', 'transaction_failure',
      'dispute_raised', 'dispute_resolved_in_favor', 'dispute_resolved_against',
      'endorsement_received', 'endorsement_given',
      'verification_kyc', 'verification_business',
      'risk_event_low', 'risk_event_medium', 'risk_event_high', 'risk_event_critical',
      'compliance_violation'
    ],
    seededSubjects: reputationService.getFederationStats().totalSubjects
  }));
});

// ────────────────────────────────────────────────────────────────────
// Ingest
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/ingest', asyncRoute(async (req, res) => {
  const validation = IngestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { subjectId, subjectType, signal } = validation.data;
  const score = reputationService.ingest(subjectId, subjectType, signal as ReputationSignal);
  res.status(201).json(apiResponse(true, score));
}));

// ────────────────────────────────────────────────────────────────────
// Scores
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/scores/:subjectId', asyncRoute(async (req, res) => {
  const score = reputationService.get(req.params.subjectId);
  if (!score) {
    res.status(404).json(apiResponse(false, undefined, 'Subject not found'));
    return;
  }
  res.json(apiResponse(true, score));
}));

app.get('/api/v1/scores', asyncRoute(async (req, res) => {
  const validation = ScoreQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { subjectId, subjectType, minAci, maxAci, band, limit, offset } = validation.data;
  const result = reputationService.query({
    subjectId, subjectType: subjectType as ReputationSubjectType | undefined,
    minAci, maxAci, band: band as TrustBand | undefined, limit, offset
  });
  res.json(apiResponse(true, result));
}));

// ────────────────────────────────────────────────────────────────────
// Signals
// ────────────────────���───────────────────────────────────────────────
app.get('/api/v1/scores/:subjectId/signals', asyncRoute(async (req, res) => {
  const signals = reputationService.getSignals(req.params.subjectId);
  res.json(apiResponse(true, { subjectId: req.params.subjectId, signals, total: signals.length }));
}));

app.get('/api/v1/scores/:subjectId/signals/:kind', asyncRoute(async (req, res) => {
  const kindParse = SignalKindParam.safeParse(req.params.kind);
  if (!kindParse.success) {
    res.status(400).json(apiResponse(false, undefined, `Unknown signal kind: ${req.params.kind}`));
    return;
  }
  const signals = reputationService.getSignalsByKind(req.params.subjectId, kindParse.data);
  res.json(apiResponse(true, { subjectId: req.params.subjectId, kind: kindParse.data, signals, total: signals.length }));
}));

// ────────────────────────────────────────────────────────────────────
// Federation stats
// ─────────────────────────────────────────────────────────────────��──
app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  const stats = reputationService.getFederationStats();
  res.json(apiResponse(true, stats));
}));

// ────────────────────────────────────────────────────────────────────
// REZ Intelligence
// ────────────────────────────────────────────────────────────────────
const REZ_INTEL_URL = process.env.REZ_INTEL_URL || 'http://localhost:5370';
const REZ_INTEL_TIMEOUT = parseInt(process.env.REZ_INTEL_TIMEOUT_MS || '3000');
const REZ_INTEL_ENABLED = process.env.REZ_INTEL_ENABLED !== 'false';

async function callREZIntel(endpoint: string, body: Record<string, unknown>) {
  if (!REZ_INTEL_ENABLED) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REZ_INTEL_TIMEOUT);
    const res = await fetch(`${REZ_INTEL_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json: any = await res.json();
    return json.success ? json.data : null;
  } catch { return null; }
}

app.get('/rez-intel-status', async (_req, res) => {
  let healthy = false;
  try {
    const r = await fetch(`${REZ_INTEL_URL}/api/v1/health`, { signal: AbortSignal.timeout(2000) });
    healthy = r.ok;
  } catch { /* ignore */ }
  res.json({ rezIntelEnabled: REZ_INTEL_ENABLED, rezIntelUrl: REZ_INTEL_URL, rezIntelHealthy: healthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await callREZIntel('/api/v1/agent/enrich', { agentRole, userId, companyId, query, context });
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// ────────────────────────────────────────────────────────────────────
// Start
// ────────────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════��═══════════════════════════════════════════╗
║           NEXHA REPUTATION OS — Layer 4                         ║
║           "The ACI scoring engine"                             ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                              ║
║  Port:        ${String(PORT).padEnd(48)}║
║  Subjects:    ${String(reputationService.getFederationStats().totalSubjects).padEnd(45)}║
║  Auth:        ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(48)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    POST   /api/v1/ingest                  Ingest a signal       ║
║    GET    /api/v1/scores/:id              Get score              ║
║    GET    /api/v1/scores                  Query scores           ║
║    GET    /api/v1/scores/:id/signals      Get signal log         ║
║    GET    /api/v1/scores/:id/signals/:k   Filter by kind         ║
║    GET    /api/v1/stats                   Federation stats      ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-reputation-os] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;