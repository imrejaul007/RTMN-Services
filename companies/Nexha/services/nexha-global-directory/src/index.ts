/**
 * nexha-global-directory — port 4276
 *
 * The federation's central search index. Pulls from all 6 federation
 * services (FederationOS, CapabilityOS, ReputationOS, DiscoveryOS,
 * OpportunityOS, MarketOS) and exposes unified search with trust-aware
 * ranking.
 *
 * Endpoints:
 *   POST   /api/v1/search              Search (body)
 *   GET    /api/v1/search              Search (query params)
 *   GET    /api/v1/listings/:id         Get one listing
 *   POST   /api/v1/listings             Upsert a listing
 *   DELETE /api/v1/listings/:id         Remove a listing
 *   GET    /api/v1/stats                Federation stats
 *   GET    /health
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import directoryService from './services/directoryService.js';
import type {
  ListingKind,
  HealthResponse,
  TrustBand
} from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4276;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.GLOBAL_DIRECTORY_REQUIRE_AUTH !== 'false';

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
      console.error('[nexha-global-directory] error:', msg);
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
    console.log('[nexha-global-directory] auth enabled');
  } catch {
    console.warn('[nexha-global-directory] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seedStats = directoryService.seedDemo();
console.log(
  `[nexha-global-directory] seeded ${seedStats.listings} listings ` +
  `across ${seedStats.nexhas} nexhas`
);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const KindEnum = z.enum(['nexha', 'capability', 'opportunity', 'data-feed', 'service']);
const BandEnum = z.enum(['platinum', 'gold', 'silver', 'bronze', 'iron', 'restricted', 'any', 'unknown']);
const SortEnum = z.enum(['relevance', 'trust', 'recent']);

const SearchQuerySchema = z.object({
  q: z.string().optional(),
  kind: KindEnum.optional(),
  category: z.string().optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
  nexhaId: z.string().optional(),
  region: z.string().optional(),
  language: z.string().optional(),
  minAciBand: BandEnum.optional(),
  verifiedOnly: z.coerce.boolean().optional(),
  activeOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  sort: SortEnum.optional().default('relevance'),
  trustBoost: z.coerce.number().min(0).max(2).default(0.3)
});

const ListingInputSchema = z.object({
  kind: KindEnum,
  name: z.string().min(1),
  description: z.string().min(1),
  nexhaId: z.string().min(1),
  nexhaName: z.string().min(1),
  nexhaTier: z.enum(['founding', 'strategic', 'standard', 'associate', 'observer']),
  tags: z.array(z.string()),
  category: z.string().min(1),
  region: z.string().length(2),
  languages: z.array(z.string()),
  aci: z.number().min(0).max(1000).nullable().optional(),
  band: BandEnum.optional().default('unknown'),
  status: z.enum(['active', 'pending', 'deprecated', 'closed']).default('active'),
  price: z.object({ amount: z.number().positive(), currency: z.string(), model: z.string() }).optional(),
  budget: z.object({ amount: z.number().positive(), currency: z.string(), type: z.string() }).optional(),
  href: z.string().optional()
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

function normalizeQuery(parsed: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...parsed };
  if (parsed.tags) {
    out.tags = Array.isArray(parsed.tags)
      ? (parsed.tags as unknown[]).filter((t): t is string => typeof t === 'string')
      : [String(parsed.tags)];
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const stats = directoryService.getStats();
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-global-directory',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    totalListings: stats.totalListings,
    totalNexhas: stats.totalNexhas,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  const stats = directoryService.getStats();
  res.json(apiResponse(true, {
    name: 'nexha-global-directory',
    version: '0.1.0',
    description: 'Federation central search index — yellow pages of Global Nexha',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      search: 'POST /api/v1/search (body) or GET /api/v1/search (query)',
      getListing: 'GET /api/v1/listings/:id',
      upsertListing: 'POST /api/v1/listings',
      removeListing: 'DELETE /api/v1/listings/:id',
      stats: 'GET /api/v1/stats'
    },
    dependsOn: {
      federationOS: 'port 4273',
      capabilityOS: 'port 4270',
      reputationOS: 'port 4271',
      discoveryOS: 'port 4272',
      opportunityOS: 'port 4274',
      marketOS: 'port 4275'
    },
    summary: {
      totalListings: stats.totalListings,
      totalNexhas: stats.totalNexhas,
      averageAci: stats.averageAci,
      verifiedPercentage: stats.verifiedPercentage
    }
  }));
});

// ────────────────────────────────────────────────────────────────────
// Search (the killer feature)
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/search', asyncRoute(async (req, res) => {
  const validation = SearchQuerySchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const q = normalizeQuery(validation.data as Record<string, unknown>) as any;
  const result = directoryService.search(q, q.trustBoost);
  res.json(apiResponse(true, result));
}));

app.get('/api/v1/search', asyncRoute(async (req, res) => {
  const validation = SearchQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const q = normalizeQuery(validation.data as Record<string, unknown>) as any;
  const result = directoryService.search(q, q.trustBoost);
  res.json(apiResponse(true, result));
}));

// ────────────────────────────────────────────────────────────────────
// Listing CRUD
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/listings/:id', asyncRoute(async (req, res) => {
  const listing = directoryService.get(req.params.id);
  if (!listing) {
    res.status(404).json(apiResponse(false, undefined, 'Listing not found'));
    return;
  }
  res.json(apiResponse(true, listing));
}));

app.post('/api/v1/listings', asyncRoute(async (req, res) => {
  const validation = ListingInputSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const input = { ...validation.data };
  if (input.aci === undefined) input.aci = null;
  const listing = directoryService.upsertListing(input as any);
  res.status(201).json(apiResponse(true, listing));
}));

app.delete('/api/v1/listings/:id', asyncRoute(async (req, res) => {
  const removed = directoryService.remove(req.params.id);
  if (!removed) {
    res.status(404).json(apiResponse(false, undefined, 'Listing not found'));
    return;
  }
  res.json(apiResponse(true, { removed: true, listingId: req.params.id }));
}));

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  const stats = directoryService.getStats();
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
  const stats = directoryService.getStats();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA GLOBAL DIRECTORY — Layer 4                     ║
║           "The federation's yellow pages"                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:        RUNNING                                           ║
║  Port:           ${String(PORT).padEnd(47)}║
║  Listings:       ${String(stats.totalListings).padEnd(45)}║
║  Nexhas:         ${String(stats.totalNexhas).padEnd(45)}║
║  Avg ACI:        ${String(stats.averageAci).padEnd(45)}║
║  Verified:       ${String(stats.verifiedPercentage).padEnd(42)}%║
║  Auth:           ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(47)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    POST   /api/v1/search              Search (body)              ║
║    GET    /api/v1/search              Search (query params)      ║
║    GET    /api/v1/listings/:id         Get one listing            ║
║    POST   /api/v1/listings             Upsert a listing           ║
║    DELETE /api/v1/listings/:id         Remove a listing           ║
║    GET    /api/v1/stats                Federation stats           ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-global-directory] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;