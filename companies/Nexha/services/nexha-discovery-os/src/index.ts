/**
 * nexha-discovery-os — port 4272
 *
 * The federation's discovery + ranking engine. Combines CapabilityOS
 * (what's offered) with ReputationOS (how much to trust) into a single
 * ranked search API.
 *
 * Endpoints:
 *   POST   /api/v1/discover                   Search (body)
 *   GET    /api/v1/discover                   Search (query params)
 *   GET    /api/v1/index/:capabilityId        Get one indexed capability
 *   POST   /api/v1/index                      Index/refresh a capability
 *   POST   /api/v1/index/bulk                 Bulk index
 *   DELETE /api/v1/index/:capabilityId        Remove from index
 *   GET    /api/v1/stats                      Index stats
 *   GET    /health
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import discoveryService from './services/discoveryService.js';
import type {
  Capability,
  DiscoveryQuery,
  HealthResponse,
  TrustScore
} from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4272;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.DISCOVERY_OS_REQUIRE_AUTH !== 'false';

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
      console.error('[nexha-discovery-os] error:', msg);
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
    console.log('[nexha-discovery-os] auth enabled');
  } catch {
    console.warn('[nexha-discovery-os] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seedStats = discoveryService.seedDemo();
console.log(
  `[nexha-discovery-os] seeded ${seedStats.capabilities} capabilities ` +
  `across ${seedStats.nexhas} nexhas (${seedStats.scored} scored)`
);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const CapabilitySchema = z.object({
  id: z.string().min(1),
  nexhaId: z.string().min(1),
  ownerId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  pricing: z.object({
    model: z.string(),
    amount: z.number().optional(),
    currency: z.string().optional()
  }),
  trust: z.object({
    verified: z.boolean(),
    kycLevel: z.string(),
    insurance: z.number().optional()
  }),
  regions: z.array(z.string()),
  languages: z.array(z.string()),
  slaMs: z.number().optional(),
  status: z.string()
});

const TrustScoreSchema = z.object({
  subjectId: z.string(),
  aci: z.number().min(0).max(1000),
  band: z.string()
});

const IndexRequestSchema = z.object({
  capability: CapabilitySchema,
  trust: TrustScoreSchema.nullable().optional()
});

const BulkIndexRequestSchema = z.object({
  entries: z.array(z.object({
    capability: CapabilitySchema,
    trust: TrustScoreSchema.nullable().optional()
  })).min(1).max(500)
});

const DiscoveryQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  nexhaId: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  minAciBand: z.enum(['platinum', 'gold', 'silver', 'bronze', 'iron', 'restricted', 'any']).optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  trustBoost: z.coerce.number().min(0).max(2).default(0.3)
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

function normalizeQuery(parsed: Record<string, unknown>): DiscoveryQuery {
  const out: DiscoveryQuery = {};
  if (typeof parsed.q === 'string') out.q = parsed.q;
  if (typeof parsed.category === 'string') out.category = parsed.category;
  if (typeof parsed.nexhaId === 'string') out.nexhaId = parsed.nexhaId;
  if (typeof parsed.region === 'string') out.region = parsed.region;
  if (typeof parsed.language === 'string') out.language = parsed.language;
  if (typeof parsed.minAciBand === 'string') {
    out.minAciBand = parsed.minAciBand as DiscoveryQuery['minAciBand'];
  }
  if (typeof parsed.verifiedOnly === 'boolean') out.verifiedOnly = parsed.verifiedOnly;
  if (typeof parsed.limit === 'number') out.limit = parsed.limit;
  if (typeof parsed.offset === 'number') out.offset = parsed.offset;
  if (typeof parsed.trustBoost === 'number') out.trustBoost = parsed.trustBoost;
  if (parsed.tags) {
    out.tags = Array.isArray(parsed.tags) ? parsed.tags.filter((t): t is string => typeof t === 'string') : [String(parsed.tags)];
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const stats = discoveryService.stats();
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-discovery-os',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    indexedCapabilities: stats.capabilities,
    cachedNexhas: stats.nexhas,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  const stats = discoveryService.stats();
  res.json(apiResponse(true, {
    name: 'nexha-discovery-os',
    version: '0.1.0',
    description: 'Federated search engine combining CapabilityOS + ReputationOS',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      discover: 'POST /api/v1/discover',
      getIndexed: 'GET /api/v1/index/:id',
      index: 'POST /api/v1/index',
      bulkIndex: 'POST /api/v1/index/bulk',
      remove: 'DELETE /api/v1/index/:id',
      stats: 'GET /api/v1/stats'
    },
    dependsOn: {
      capabilityOS: 'port 4270',
      reputationOS: 'port 4271'
    },
    seededCapabilities: stats.capabilities,
    cachedNexhas: stats.nexhas
  }));
});

// ────────────────────────────────────────────────────────────────────
// Discover — main API
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/discover', asyncRoute(async (req, res) => {
  const validation = DiscoveryQuerySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const query = normalizeQuery(validation.data as Record<string, unknown>);
  const result = discoveryService.discover(query);
  res.json(apiResponse(true, result));
}));

app.get('/api/v1/discover', asyncRoute(async (req, res) => {
  const validation = DiscoveryQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const query = normalizeQuery(validation.data as Record<string, unknown>);
  const result = discoveryService.discover(query);
  res.json(apiResponse(true, result));
}));

// ────────────────────────────────────────────────────────────────────
// Index management
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/index/:capabilityId', asyncRoute(async (req, res) => {
  const idx = discoveryService.get(req.params.capabilityId);
  if (!idx) {
    res.status(404).json(apiResponse(false, undefined, 'Capability not indexed'));
    return;
  }
  res.json(apiResponse(true, idx));
}));

app.post('/api/v1/index', asyncRoute(async (req, res) => {
  const validation = IndexRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { capability, trust } = validation.data;
  discoveryService.upsertCapability(capability as Capability, trust as TrustScore | null);
  res.json(apiResponse(true, { indexed: true, capabilityId: capability.id }));
}));

app.post('/api/v1/index/bulk', asyncRoute(async (req, res) => {
  const validation = BulkIndexRequestSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  let count = 0;
  for (const e of validation.data.entries) {
    discoveryService.upsertCapability(e.capability as Capability, e.trust as TrustScore | null);
    count++;
  }
  res.json(apiResponse(true, { indexed: count }));
}));

app.delete('/api/v1/index/:capabilityId', asyncRoute(async (req, res) => {
  const removed = discoveryService.removeCapability(req.params.capabilityId);
  if (!removed) {
    res.status(404).json(apiResponse(false, undefined, 'Capability not indexed'));
    return;
  }
  res.json(apiResponse(true, { removed: true, capabilityId: req.params.capabilityId }));
}));

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  const stats = discoveryService.stats();
  res.json(apiResponse(true, stats));
}));

// ────────────────────────────────────────────────────────────────��───
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
  const stats = discoveryService.stats();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA DISCOVERY OS — Layer 4                         ║
║           "Federated search + trust-aware ranking"            ║
╠═════════════���═════════════════════════════════════════════════╣
║  Status:     RUNNING                                              ║
║  Port:        ${String(PORT).padEnd(48)}║
║  Indexed:     ${String(stats.capabilities).padEnd(43)}capabilities${(' (' + stats.nexhas + ' nexhas)').padEnd(0)}║
║  Auth:        ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(48)}║
╠═══════════════════════════════════════════════════════════════╣
║  Depends on:                                                   ║
║    CapabilityOS   (port 4270) — capability data              ║
║    ReputationOS   (port 4271) — trust scores                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    POST   /api/v1/discover            Search (body)             ║
║    GET    /api/v1/discover            Search (query params)     ║
║    POST   /api/v1/index               Index a capability        ║
║    POST   /api/v1/index/bulk          Bulk index                 ║
║    GET    /api/v1/index/:id           Get indexed capability    ║
║    DELETE /api/v1/index/:id           Remove from index          ║
║    GET    /api/v1/stats               Index stats                ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-discovery-os] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;