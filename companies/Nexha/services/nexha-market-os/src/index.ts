/**
 * nexha-market-os — port 4275
 *
 * Federation market intelligence. Aggregates data from CapabilityOS
 * (supply) + OpportunityOS (demand) + ReputationOS (trust) to produce:
 *   - Market prices (median, mean, distribution) per category × region × currency
 *   - Demand signals (count, total budget, top tags)
 *   - Supply signals (count, avg trust, total capacity)
 *   - Supply/demand gaps with classification + recommendation
 *   - Price trends (old → new)
 *   - Federation-wide report
 *
 * Endpoints:
 *   GET    /api/v1/prices                        List all market prices
 *   GET    /api/v1/prices/:category/:region/:currency  Get one
 *   GET    /api/v1/trends/:category/:region/:currency  Get trend
 *   GET    /api/v1/demand                        List all demand signals
 *   GET    /api/v1/demand/:category/:region      Get one
 *   GET    /api/v1/supply                        List all supply signals
 *   GET    /api/v1/supply/:category/:region      Get one
 *   GET    /api/v1/gaps                           List all gaps (sorted by gapScore)
 *   GET    /api/v1/gaps/:category/:region         Get one gap
 *   POST   /api/v1/prices                        Record new price observation
 *   POST   /api/v1/demand                        Add demand snapshot
 *   POST   /api/v1/supply                        Add supply snapshot
 *   GET    /api/v1/report                        Federation-wide report
 *   GET    /health
 */

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { z } from 'zod';
import marketService from './services/marketService.js';
import type { HealthResponse } from './types/index.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4275;
const START_TIME = Date.now();
const REQUIRE_AUTH = process.env.MARKET_OS_REQUIRE_AUTH !== 'false';

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
      console.error('[nexha-market-os] error:', msg);
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
    console.log('[nexha-market-os] auth enabled');
  } catch {
    console.warn('[nexha-market-os] @rtmn/shared/auth not available — auth disabled');
  }
}

// ────────────────────────────────────────────────────────────────────
// Seed
// ────────────────────────────────────────────────────────────────────
const seedStats = marketService.seedDemo();
console.log(
  `[nexha-market-os] seeded ${seedStats.prices} price observations, ` +
  `${seedStats.demandCells} demand cells, ${seedStats.supplyCells} supply cells`
);

// ────────────────────────────────────────────────────────────────────
// Zod validators
// ────────────────────────────────────────────────────────────────────
const PriceObsSchema = z.object({
  capabilityId: z.string().min(1),
  capabilityName: z.string().min(1),
  category: z.string().min(1),
  nexhaId: z.string().min(1),
  pricingModel: z.enum(['free', 'per-call', 'per-hour', 'per-transaction', 'subscription', 'quote']),
  amount: z.number().nonnegative(),
  currency: z.string().length(3),
  region: z.string().length(2)
});

const DemandCellSchema = z.object({
  category: z.string().min(1),
  region: z.string().length(2),
  openOpportunities: z.number().int().nonnegative(),
  totalBudgetUsd: z.number().nonnegative(),
  averageBudgetUsd: z.number().nonnegative(),
  topTags: z.array(z.string()).default([]),
  topPriority: z.enum(['low', 'normal', 'high', 'urgent'])
});

const SupplyCellSchema = z.object({
  category: z.string().min(1),
  region: z.string().length(2),
  activeCapabilities: z.number().int().nonnegative(),
  averagePriceUsd: z.number().nonnegative(),
  totalCapacity: z.number().nonnegative(),
  averageTrust: z.number().min(0).max(1000)
});

const PriceQuerySchema = z.object({
  category: z.string().optional(),
  region: z.string().optional(),
  currency: z.string().optional()
});

const handleZodError = (err: z.ZodError): string =>
  err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');

// ────────────────────────────────────────────────────────────────────
// Health
// ────────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  const gaps = marketService.listGaps();
  const response: HealthResponse = {
    status: 'healthy',
    service: 'nexha-market-os',
    version: '0.1.0',
    port: PORT,
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    priceObservations: marketService.listMarketPrices().reduce((s, p) => s + p.sampleSize, 0),
    gaps: gaps.length,
    timestamp: new Date().toISOString()
  };
  res.json(response);
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req, res) => {
  const report = marketService.getReport();
  res.json(apiResponse(true, {
    name: 'nexha-market-os',
    version: '0.1.0',
    description: 'Federation market intelligence — pricing, demand, supply, gaps',
    port: PORT,
    nexhaLayer: 4,
    endpoints: {
      listPrices: 'GET /api/v1/prices',
      getPrice: 'GET /api/v1/prices/:category/:region/:currency',
      getTrend: 'GET /api/v1/trends/:category/:region/:currency',
      listDemand: 'GET /api/v1/demand',
      listSupply: 'GET /api/v1/supply',
      listGaps: 'GET /api/v1/gaps',
      getGap: 'GET /api/v1/gaps/:category/:region',
      report: 'GET /api/v1/report',
      recordPrice: 'POST /api/v1/prices',
      addDemand: 'POST /api/v1/demand',
      addSupply: 'POST /api/v1/supply'
    },
    dependsOn: {
      capabilityOS: 'port 4270',
      opportunityOS: 'port 4274',
      reputationOS: 'port 4271'
    },
    summary: {
      priceCells: report.totalCapabilities,
      opportunityCells: report.totalOpportunities,
      totalBudgetUsd: report.totalBudgetUsd
    }
  }));
});

// ────────────────────────────────────────────────────────────────────
// Market prices
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/prices', asyncRoute(async (req, res) => {
  const validation = PriceQuerySchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const { category, region, currency } = validation.data;
  const prices = marketService.listMarketPrices({ category, region, currency });
  res.json(apiResponse(true, { prices, total: prices.length }));
}));

app.get('/api/v1/prices/:category/:region/:currency', asyncRoute(async (req, res) => {
  const price = marketService.getMarketPrice(req.params.category, req.params.region, req.params.currency);
  if (!price) {
    res.status(404).json(apiResponse(false, undefined, 'No price data for that category/region/currency'));
    return;
  }
  res.json(apiResponse(true, price));
}));

// ────────────────────────────────────────────────────────────────────
// Price trends
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/trends/:category/:region/:currency', asyncRoute(async (req, res) => {
  const trend = marketService.getPriceTrend(req.params.category, req.params.region, req.params.currency);
  if (!trend) {
    res.status(404).json(apiResponse(false, undefined, 'Not enough data for a trend (need ≥2 observations)'));
    return;
  }
  res.json(apiResponse(true, trend));
}));

// ────────────────────────────────────────────────────────────────────
// Demand signals
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/demand', asyncRoute(async (_req, res) => {
  const demand = marketService.listDemand();
  res.json(apiResponse(true, { demand, total: demand.length }));
}));

app.get('/api/v1/demand/:category/:region', asyncRoute(async (req, res) => {
  const demand = marketService.getDemand(req.params.category, req.params.region);
  if (!demand) {
    res.status(404).json(apiResponse(false, undefined, 'No demand data for that category/region'));
    return;
  }
  res.json(apiResponse(true, demand));
}));

// ────────────────────────────────────────────────────────────────────
// Supply signals
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/supply', asyncRoute(async (_req, res) => {
  const supply = marketService.listSupply();
  res.json(apiResponse(true, { supply, total: supply.length }));
}));

app.get('/api/v1/supply/:category/:region', asyncRoute(async (req, res) => {
  const supply = marketService.getSupply(req.params.category, req.params.region);
  if (!supply) {
    res.status(404).json(apiResponse(false, undefined, 'No supply data for that category/region'));
    return;
  }
  res.json(apiResponse(true, supply));
}));

// ────────────────────────────────────────────────────────────────────
// Supply/demand gaps
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/gaps', asyncRoute(async (_req, res) => {
  const gaps = marketService.listGaps();
  res.json(apiResponse(true, { gaps, total: gaps.length }));
}));

app.get('/api/v1/gaps/:category/:region', asyncRoute(async (req, res) => {
  const gap = marketService.computeGap(req.params.category, req.params.region);
  if (!gap) {
    res.status(404).json(apiResponse(false, undefined, 'No demand data for that category/region — no gap to compute'));
    return;
  }
  res.json(apiResponse(true, gap));
}));

// ────────────────────────────────────────────────────────────────────
// Federation report
// ────────────────────────────────────────────────────────────────────
app.get('/api/v1/report', asyncRoute(async (_req, res) => {
  const report = marketService.getReport();
  res.json(apiResponse(true, report));
}));

// ────────────────────────────────────────────────────────────────────
// Ingest endpoints (webhook-style — would be called by CapabilityOS/OpportunityOS in prod)
// ────────────────────────────────────────────────────────────────────
app.post('/api/v1/prices', asyncRoute(async (req, res) => {
  const validation = PriceObsSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  const obs = marketService.recordPrice(validation.data);
  res.status(201).json(apiResponse(true, obs));
}));

app.post('/api/v1/demand', asyncRoute(async (req, res) => {
  const validation = DemandCellSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  marketService.addDemandSnapshot(validation.data);
  res.status(201).json(apiResponse(true, { added: true }));
}));

app.post('/api/v1/supply', asyncRoute(async (req, res) => {
  const validation = SupplyCellSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json(apiResponse(false, undefined, `Validation error: ${handleZodError(validation.error)}`));
    return;
  }
  marketService.addSupplySnapshot(validation.data);
  res.status(201).json(apiResponse(true, { added: true }));
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
  const report = marketService.getReport();
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           NEXHA MARKET OS — Layer 4                            ║
║           "Federation market intelligence"                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:        RUNNING                                           ║
║  Port:           ${String(PORT).padEnd(47)}║
║  Price cells:    ${String(report.totalCapabilities).padEnd(43)}║
║  Demand cells:   ${String(report.totalOpportunities).padEnd(43)}║
║  Total budget:   $${String(report.totalBudgetUsd).padEnd(42)}║
║  Avg ACI:        ${String(report.averageAci).padEnd(43)}║
║  Auth:           ${(REQUIRE_AUTH ? 'enabled' : 'disabled').padEnd(47)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                     ║
║    GET    /api/v1/prices              List all market prices    ║
║    GET    /api/v1/prices/:c/:r/:cur   One (cat × region × cur) ║
║    GET    /api/v1/trends/:c/:r/:cur   Price trend               ║
║    GET    /api/v1/demand              List demand signals       ║
║    GET    /api/v1/supply              List supply signals       ║
║    GET    /api/v1/gaps               List all supply/demand gaps║
║    GET    /api/v1/report             Federation-wide report    ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

const shutdown = async () => {
  console.log('[nexha-market-os] shutting down');
  server.close(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export default app;