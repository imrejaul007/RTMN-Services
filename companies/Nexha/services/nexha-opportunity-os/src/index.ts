/**
 * nexha-opportunity-os — port 4274
 *
 * The federation's demand-side broker. Matches opportunities (buyer demand)
 * with the best-fit capabilities across the federation.
 *
 * Endpoints:
 *   POST   /api/v1/opportunities              Post an opportunity
 *   GET    /api/v1/opportunities              List opportunities
 *   GET    /api/v1/opportunities/:id          Get one
 *   PATCH  /api/v1/opportunities/:id          Update
 *   POST   /api/v1/opportunities/:id/bid      Increment bid count
 *   POST   /api/v1/opportunities/:id/match    Match against capabilities
 *   POST   /api/v1/match                       Match all open opportunities
 *   GET    /api/v1/stats                       Federation stats
 *   GET    /health
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import opportunityService from './services/opportunityService.js';
import type {
  OpportunityKind,
  OpportunityStatus,
  OpportunityPriority,
  HealthResponse
} from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4274;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.OPPORTUNITY_OS_REQUIRE_AUTH !== 'false';

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
      console.error('[nexha-opportunity-os] error:', msg);
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
    console.log('[nexha-opportunity-os] auth enabled');
  } catch {
    console.warn('[nexha-opportunity-os] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seedStats = opportunityService.seedDemo();
console.log(
  `[nexha-opportunity-os] seeded ${seedStats.opportunities} opportunities ` +
  `+ ${seedStats.capabilities} capabilities`
);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const KindEnum = z.enum(['rfq', 'job', 'subscription', 'partnership', 'data-request', 'support', 'integration']);
const StatusEnum = z.enum(['open', 'in-progress', 'closed', 'cancelled', 'expired']);
const PriorityEnum = z.enum(['low', 'normal', 'high', 'urgent']);
const BudgetTypeEnum = z.enum(['fixed', 'hourly', 'per-unit', 'quote']);

const OpportunityPostSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().min(1).max(5000),
  kind: KindEnum,
  requiredCategories: z.array(z.string()).min(1),
  requiredTags: z.array(z.string()).default([]),
  region: z.string().length(2),
  language: z.string().optional(),
  budget: z.object({
    amount: z.number().positive(),
    currency: z.string().min(3).max(3),
    type: BudgetTypeEnum
  }),
  priority: PriorityEnum,
  status: StatusEnum.optional().default('open'),
  postedByNexhaId: z.string().min(1),
  postedByEntityId: z.string().optional(),
  closesAt: z.string().optional(),
  metadata: z.record(z.unknown()).optional()
});

const OpportunityPatchSchema = OpportunityPostSchema.partial().extend({
  bidsReceived: z.number().int().min(0).optional()
});

const OpportunityQuerySchema = z.object({
  kind: KindEnum.optional(),
  status: StatusEnum.optional(),
  postedByNexhaId: z.string().optional(),
  priority: PriorityEnum.optional()
});

const MatchQuerySchema = z.object({
  trustBoost: z.coerce.number().min(0).max(2).default(0.3)
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const stats = opportunityService.getStats();
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-opportunity-os',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    opportunities: stats.totalOpportunities,
    totalBids: stats.totalBids,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  const stats = opportunityService.getStats();
  res.json(apiResponse(true, {
    name: 'nexha-opportunity-os',
    version: '0.1.0',
    description: 'Federation demand-side broker — matches opportunities with capabilities',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      post: 'POST /api/v1/opportunities',
      list: 'GET /api/v1/opportunities',
      get: 'GET /api/v1/opportunities/:id',
      matchOne: 'POST /api/v1/opportunities/:id/match',
      matchAll: 'POST /api/v1/match',
      stats: 'GET /api/v1/stats'
    },
    dependsOn: {
      capabilityOS: 'port 4270',
      reputationOS: 'port 4271',
      federationOS: 'port 4273'
    },
    seededOpportunities: stats.totalOpportunities,
    seededCapabilities: 7
  }));
});

// ────────────────────────────────────────────────────────────────────
// Opportunity CRUD
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/opportunities', asyncRoute(async (req, res) => {
  const validation = OpportunityPostSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const opp = opportunityService.post(validation.data);
  res.status(201).json(apiResponse(true, opp));
}));

app.get('/api/v1/opportunities', asyncRoute(async (req, res) => {
  const validation = OpportunityQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { kind, status, postedByNexhaId, priority } = validation.data;
  const opps = opportunityService.list({
    kind: kind as OpportunityKind | undefined,
    status: status as OpportunityStatus | undefined,
    postedByNexhaId,
    priority: priority as OpportunityPriority | undefined
  });
  res.json(apiResponse(true, { opportunities: opps, total: opps.length }));
}));

app.get('/api/v1/opportunities/:id', asyncRoute(async (req, res) => {
  const opp = opportunityService.get(req.params.id);
  if (!opp) {
    res.status(404).json(apiResponse(false, undefined, 'Opportunity not found'));
    return;
  }
  res.json(apiResponse(true, opp));
}));

app.patch('/api/v1/opportunities/:id', asyncRoute(async (req, res) => {
  const validation = OpportunityPatchSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const updated = opportunityService.update(req.params.id, validation.data as any);
  if (!updated) {
    res.status(404).json(apiResponse(false, undefined, 'Opportunity not found'));
    return;
  }
  res.json(apiResponse(true, updated));
}));

app.post('/api/v1/opportunities/:id/bid', asyncRoute(async (req, res) => {
  const opp = opportunityService.incrementBids(req.params.id);
  if (!opp) {
    res.status(404).json(apiResponse(false, undefined, 'Opportunity not found'));
    return;
  }
  res.json(apiResponse(true, opp));
}));

// ────────────────────────────────────────────────────────────────────
// Match (the killer feature)
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/opportunities/:id/match', asyncRoute(async (req, res) => {
  const validation = MatchQuerySchema.safeParse(req.body || req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const result = opportunityService.matchOpportunity(req.params.id, validation.data.trustBoost);
  if (!result) {
    res.status(404).json(apiResponse(false, undefined, 'Opportunity not found'));
    return;
  }
  res.json(apiResponse(true, result));
}));

app.post('/api/v1/match', asyncRoute(async (req, res) => {
  const validation = MatchQuerySchema.safeParse(req.body || req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const results = opportunityService.matchAll(validation.data.trustBoost);
  res.json(apiResponse(true, { matches: results, total: results.length }));
}));

// ────────────────────────────────────────────────────────────────────
// Stats
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/stats', asyncRoute(async (_req, res) => {
  const stats = opportunityService.getStats();
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
  const stats = opportunityService.getStats();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA OPPORTUNITY OS — Layer 4                       ║
║           "The federation's demand-side broker"                  ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:        RUNNING                                           ║
║  Port:           ${String(PORT).padEnd(47)}║
║  Opportunities:  ${String(stats.totalOpportunities).padEnd(43)}║
║  Open:           ${String(stats.openCount).padEnd(45)}║
║  Capabilities:   7 (demo)                                         ║
║  Auth:           ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(47)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    POST   /api/v1/opportunities              Post opportunity   ║
║    GET    /api/v1/opportunities              List                ║
║    GET    /api/v1/opportunities/:id          Get one             ║
║    POST   /api/v1/opportunities/:id/match    Match one           ║
║    POST   /api/v1/match                       Match all open      ║
║    GET    /api/v1/stats                      Federation stats    ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-opportunity-os] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;