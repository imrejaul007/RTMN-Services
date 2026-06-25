/**
 * nexha-capability-os — port 4270
 *
 * The canonical capability schema + registry for the Nexha federation.
 * Every Nexha publishes what it offers here; every consumer queries here.
 *
 * Endpoints:
 *   POST   /api/v1/capabilities              Register a capability
 *   GET    /api/v1/capabilities              List all (admin)
 *   GET    /api/v1/capabilities/:id          Get one
 *   PUT    /api/v1/capabilities/:id          Update
 *   DELETE /api/v1/capabilities/:id          Remove
 *   POST   /api/v1/match                     Match query → ranked capabilities
 *   GET    /api/v1/match                     Match query (query params)
 *   GET    /api/v1/nexhas/:nexhaId/stats     Per-Nexha stats
 *   GET    /api/v1/stats                     Federation-wide stats
 *   POST   /api/v1/capabilities/:id/attest   Issue a verifiable credential
 *   GET    /api/v1/capabilities/:id/attestations    List attestations
 *   GET    /api/v1/capabilities/:id/verify         Verify attestations
 *   GET    /api/v1/capabilities/:id/verify/:attestationId  Verify one attestation
 *   DELETE /api/v1/capabilities/:id/attestations/:attestationId  Revoke
 *   GET    /health
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import capabilityService from './services/capabilityService.js';
import type {
  Capability,
  CapabilityCategory,
  CapabilityQuery,
  HealthResponse,
  AttestationInput,
  AttestationClaimType,
  AttestationLevel
} from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4270;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.CAPABILITY_OS_REQUIRE_AUTH !== 'false';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));

// Response envelope
const apiResponse = <T>(success: boolean, data?: T, error?: string) => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString()
});

// Async-route wrapper
const asyncRoute = (handler: (req: Request, res: Response) => Promise<unknown>) =>
  async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[nexha-capability-os] error:', msg);
      if (!res.headersSent) res.status(500).json(apiResponse(false, undefined, msg));
    }
  };

// Optional JWT auth (dynamic import — works whether or not @rtmn/shared has types)
if (REQUIRE_AUTH) {
  try {
    // @ts-ignore — @rtmn/shared/auth has no .d.ts in this monorepo layout
    const authModule = await import('@rtmn/shared/auth');
    const { requireAuth } = authModule as { requireAuth: express.RequestHandler };
    app.use('/api/v1', requireAuth);
    console.log('[nexha-capability-os] auth enabled');
  } catch {
    console.warn('[nexha-capability-os] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seeded = capabilityService.seedDemoCapabilities();
console.log(`[nexha-capability-os] seeded ${seeded} demo capabilities`);
const attestSeedCount = capabilityService.seedDemoAttestations();
console.log(`[nexha-capability-os] seeded ${attestSeedCount} demo attestations`);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const CategorySchema = z.enum([
  'skill', 'service', 'product', 'agent', 'data', 'workflow', 'integration', 'content'
]);

const CapabilityInputSchema = z.object({
  nexhaId: z.string().min(1),
  ownerId: z.string().optional(),
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  longDescription: z.string().max(10000).optional(),
  category: CategorySchema,
  tags: z.array(z.string()).default([]),
  pricing: z.object({
    model: z.enum(['free', 'per-call', 'per-hour', 'per-transaction', 'subscription', 'quote']),
    amount: z.number().optional(),
    currency: z.string().optional(),
    unit: z.string().optional()
  }),
  trust: z.object({
    verified: z.boolean().default(false),
    kycLevel: z.enum(['none', 'basic', 'full']).default('none'),
    insurance: z.number().optional()
  }),
  regions: z.array(z.string()).default([]),
  languages: z.array(z.string()).default([]),
  slaMs: z.number().optional(),
  status: z.enum(['active', 'draft', 'deprecated']).default('active'),
  metadata: z.record(z.unknown()).optional()
});

const CapabilityPatchSchema = CapabilityInputSchema.partial();

const AttestationClaimTypeSchema = z.enum([
  'identity', 'capability', 'compliance', 'certification',
  'insurance', 'audit', 'kyc', 'performance'
]);
const AttestationLevelSchema = z.enum(['self', 'peer', 'audit', 'certified']);

const AttestationInputSchema = z.object({
  issuerId: z.string().min(1),
  issuerName: z.string().min(1),
  claimType: AttestationClaimTypeSchema,
  level: AttestationLevelSchema,
  claim: z.string().min(1).max(500),
  expiresAt: z.string().datetime().optional(),
  evidenceUrl: z.string().url().optional()
});

const MatchQuerySchema = z.object({
  q: z.string().optional(),
  category: CategorySchema.optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  nexhaId: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  maxPrice: z.coerce.number().optional(),
  currency: z.string().optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0)
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-capability-os',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    capabilities: capabilityService.total(),
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'nexha-capability-os',
    version: '0.1.0',
    description: 'The canonical capability schema + registry for the Nexha federation',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      register: 'POST /api/v1/capabilities',
      match: 'POST /api/v1/match',
      get: 'GET /api/v1/capabilities/:id',
      list: 'GET /api/v1/capabilities',
      stats: 'GET /api/v1/stats'
    },
    seededCapabilities: capabilityService.total()
  }));
});

// ────────────────────────────────────────────────────────────────────
// Capability CRUD
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/capabilities', asyncRoute(async (req, res) => {
  const validation = CapabilityInputSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const cap = capabilityService.register(validation.data as Omit<Capability, 'id' | 'createdAt' | 'updatedAt'>);
  res.status(201).json(apiResponse(true, cap));
}));

app.get('/api/v1/capabilities', asyncRoute(async (req, res) => {
  const nexhaId = req.query.nexhaId as string | undefined;
  const all = capabilityService.listAll();
  const filtered = nexhaId ? all.filter((c) => c.nexhaId === nexhaId) : all;
  res.json(apiResponse(true, { capabilities: filtered, total: filtered.length }));
}));

app.get('/api/v1/capabilities/:id', asyncRoute(async (req, res) => {
  const cap = capabilityService.get(req.params.id);
  if (!cap) {
    res.status(404).json(apiResponse(false, undefined, 'Capability not found'));
    return;
  }
  res.json(apiResponse(true, cap));
}));

app.put('/api/v1/capabilities/:id', asyncRoute(async (req, res) => {
  const validation = CapabilityPatchSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const updated = capabilityService.update(req.params.id, validation.data);
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Capability not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.delete('/api/v1/capabilities/:id', asyncRoute(async (req, res) => {
  const deleted = capabilityService.delete(req.params.id);
  if (!deleted) {
    res.status(404).json(apiResponse(false, undefined, 'Capability not found'));
    return;
  }
  res.json(apiResponse(true, { deleted: true, id: req.params.id }));
}));

// ────────────────────────────────────────────────────────────────────
// Match — the core query API
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/match', asyncRoute(async (req, res) => {
  // POST body = query
  const validation = MatchQuerySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const q = normalizeQuery(validation.data as Record<string, unknown>);
  const result = capabilityService.match(q);
  res.json(apiResponse(true, result));
}));

app.get('/api/v1/match', asyncRoute(async (req, res) => {
  const validation = MatchQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const q = normalizeQuery(validation.data as Record<string, unknown>);
  const result = capabilityService.match(q);
  res.json(apiResponse(true, result));
}));

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/nexhas/:nexhaId/stats', asyncRoute(async (req, res) => {
  const stats = capabilityService.getNexhaStats(req.params.nexhaId);
  res.json(apiResponse(true, stats));
}));

app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  const stats = capabilityService.getFederationStats();
  res.json(apiResponse(true, stats));
}));

// ────────────────────────────────────────────────────────────────────
// Helper: normalize parsed query for the service
// ────────────────────────────────────────────────────────────────────
function normalizeQuery(parsed: Record<string, unknown>): CapabilityQuery {
  const out: CapabilityQuery = {};
  if (typeof parsed.q === 'string') out.q = parsed.q;
  if (typeof parsed.category === 'string') out.category = parsed.category as CapabilityCategory;
  if (typeof parsed.nexhaId === 'string') out.nexhaId = parsed.nexhaId;
  if (typeof parsed.region === 'string') out.region = parsed.region;
  if (typeof parsed.language === 'string') out.language = parsed.language;
  if (typeof parsed.maxPrice === 'number') out.maxPrice = parsed.maxPrice;
  if (typeof parsed.currency === 'string') out.currency = parsed.currency;
  if (typeof parsed.verifiedOnly === 'boolean') out.verifiedOnly = parsed.verifiedOnly;
  if (typeof parsed.limit === 'number') out.limit = parsed.limit;
  if (typeof parsed.offset === 'number') out.offset = parsed.offset;
  if (parsed.tags) {
    out.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : [String(parsed.tags)];
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// REZ Intelligence (graceful enrichment, same pattern as other SUTAR services)
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
// ─────���──────────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA CAPABILITY OS — Layer 4                          ║
║           "The federation's capability registry"                ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                              ║
║  Port:        ${String(PORT).padEnd(48)}║
║  Capabilities: ${String(capabilityService.total()).padEnd(45)}║
║  Auth:        ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(48)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    POST   /api/v1/capabilities         Register a capability   ║
║    GET    /api/v1/capabilities         List capabilities       ║
║    GET    /api/v1/capabilities/:id     Get one                  ║
║    PUT    /api/v1/capabilities/:id     Update                   ║
║    DELETE /api/v1/capabilities/:id     Remove                   ║
║    POST   /api/v1/match                Match query              ║
║    GET    /api/v1/nexhas/:id/stats      Per-Nexha stats          ║
║    GET    /api/v1/stats                Federation stats         ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('[nexha-capability-os] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;