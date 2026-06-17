/**
 * AdBazaar Integration Service
 *
 * Central integration hub that connects all AdBazaar services to intelligence.
 * This service acts as a facade, providing unified access to:
 * - Audience Intelligence (4805)
 * - HOJAI AI Gateway (4560)
 * - Intent Signals (4800-4802)
 * - CDP (4901)
 * - Inventory (4900)
 *
 * Port: 4910
 *
 * Any service can call this integration service instead of managing multiple connections.
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import axios, { AxiosInstance } from 'axios';
import promClient from 'prom-client';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4910', 10);

// Service URLs
const SERVICES = {
  audienceIntelligence: process.env.AUDIENCE_INTELLIGENCE_URL || 'http://localhost:4805',
  hojaiAI: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560',
  intentAggregator: process.env.INTENT_AGGREGATOR_URL || 'http://localhost:4800',
  intentPrediction: process.env.INTENT_PREDICTION_URL || 'http://localhost:4801',
  intentMarketplace: process.env.INTENT_MARKETPLACE_URL || 'http://localhost:4802',
  cdp: process.env.CDP_URL || 'http://localhost:4901',
  inventory: process.env.INVENTORY_URL || 'http://localhost:4900',
  pixel: process.env.PIXEL_URL || 'http://localhost:4962',
  attribution: process.env.ATTRIBUTION_URL || 'http://localhost:4950',
  decision: process.env.DECISION_URL || 'http://localhost:4027',
};

// Create axios instances with defaults
const createClient = (baseURL: string): AxiosInstance => {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'X-Internal-Service': 'adbazaar-integration-service',
      'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
    },
  });
};

const clients = {
  audienceIntelligence: createClient(SERVICES.audienceIntelligence),
  hojaiAI: createClient(SERVICES.hojaiAI),
  intentAggregator: createClient(SERVICES.intentAggregator),
  intentPrediction: createClient(SERVICES.intentPrediction),
  intentMarketplace: createClient(SERVICES.intentMarketplace),
  cdp: createClient(SERVICES.cdp),
  inventory: createClient(SERVICES.inventory),
  pixel: createClient(SERVICES.pixel),
  attribution: createClient(SERVICES.attribution),
  decision: createClient(SERVICES.decision),
};

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latency?: number }> = {};

  // Check all services
  for (const [name, url] of Object.entries(SERVICES)) {
    const start = Date.now();
    try {
      await clients[name as keyof typeof clients]?.get('/health/live');
      checks[name] = { status: 'up', latency: Date.now() - start };
    } catch {
      checks[name] = { status: 'down' };
    }
  }

  const allUp = Object.values(checks).every(c => c.status === 'up');

  res.status(allUp ? 200 : 503).json({
    status: allUp ? 'healthy' : 'degraded',
    service: 'adbazaar-integration-service',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    services: checks,
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'AdBazaar Integration Service',
    version: '1.0.0',
    description: 'Unified access to all intelligence services',
    services: Object.keys(SERVICES),
    endpoints: {
      audience: '/api/audience',
      intent: '/api/intent',
      ai: '/api/ai',
      cdp: '/api/cdp',
      inventory: '/api/inventory',
      pixel: '/api/pixel',
      attribution: '/api/attribution',
      decision: '/api/decision',
      unified: '/api/unified',
    },
  });
});

// ============================================================================
// UNIFIED AUDIENCE PROFILE
// ============================================================================

/**
 * GET /api/unified/profile/:userId
 * Get unified audience profile from all sources
 */
app.get('/api/unified/profile/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  // Fetch from multiple sources in parallel
  const [audience, intent, cdp, hojai] = await Promise.allSettled([
    clients.audienceIntelligence.get(`/api/profiles/${userId}`),
    clients.intentAggregator.get(`/api/signals/user/${userId}`),
    clients.cdp.get(`/api/profiles/${userId}`),
    clients.hojaiAI.post('/api/intent/predict', { userId }),
  ]);

  const profile = {
    userId,
    audience: audience.status === 'fulfilled' ? audience.value.data : null,
    intent: intent.status === 'fulfilled' ? intent.value.data : null,
    cdp: cdp.status === 'fulfilled' ? cdp.value.data : null,
    aiInsights: hojai.status === 'fulfilled' ? hojai.value.data : null,
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, data: profile });
});

/**
 * POST /api/unified/segments
 * Get segments from all sources
 */
app.post('/api/unified/segments', async (req: Request, res: Response) => {
  const { criteria } = req.body;

  const [audience, intent, marketplace] = await Promise.allSettled([
    clients.audienceIntelligence.post('/api/segments', { criteria }),
    clients.intentPrediction.post('/api/predict/audience', { criteria }),
    clients.intentMarketplace.get('/api/segments'),
  ]);

  const segments = {
    audience: audience.status === 'fulfilled' ? audience.value.data?.data?.segments : [],
    intent: intent.status === 'fulfilled' ? intent.value.data?.data?.segments : [],
    marketplace: marketplace.status === 'fulfilled' ? marketplace.value.data?.data?.segments : [],
    timestamp: new Date().toISOString(),
  };

  res.json({ success: true, data: segments });
});

// ============================================================================
// AUDIENCE INTELLIGENCE PROXY
// ============================================================================

app.get('/api/audience/profiles/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const response = await clients.audienceIntelligence.get(`/api/profiles/${userId}`);
  res.json(response.data);
});

app.get('/api/audience/segments', async (req: Request, res: Response) => {
  const { category, intent } = req.query;
  const response = await clients.audienceIntelligence.get('/api/segments', { params: { category, intent } });
  res.json(response.data);
});

app.get('/api/audience/twins', async (req: Request, res: Response) => {
  const response = await clients.audienceIntelligence.get('/api/twins');
  res.json(response.data);
});

app.post('/api/audience/twins/create', async (req: Request, res: Response) => {
  const response = await clients.audienceIntelligence.post('/api/twins/create', req.body);
  res.json(response.data);
});

app.post('/api/audience/explore', async (req: Request, res: Response) => {
  const response = await clients.audienceIntelligence.post('/api/explore', req.body);
  res.json(response.data);
});

// ============================================================================
// INTENT PROXY
// ============================================================================

app.post('/api/intent/predict', async (req: Request, res: Response) => {
  const response = await clients.hojaiAI.post('/api/intent/predict', req.body);
  res.json(response.data);
});

app.post('/api/intent/behavior', async (req: Request, res: Response) => {
  const response = await clients.hojaiAI.post('/api/behavior/predict', req.body);
  res.json(response.data);
});

app.post('/api/intent/signals/ingest', async (req: Request, res: Response) => {
  const response = await clients.intentAggregator.post('/api/signals/ingest', req.body);
  res.json(response.data);
});

app.get('/api/intent/signals/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const response = await clients.intentAggregator.get(`/api/signals/user/${userId}`);
  res.json(response.data);
});

app.post('/api/intent/segments', async (req: Request, res: Response) => {
  const response = await clients.intentPrediction.post('/api/predict/audience', req.body);
  res.json(response.data);
});

app.get('/api/intent/marketplace/segments', async (req: Request, res: Response) => {
  const response = await clients.intentMarketplace.get('/api/segments');
  res.json(response.data);
});

// ============================================================================
// AI PROXY
// ============================================================================

app.post('/api/ai/campaign/predict', async (req: Request, res: Response) => {
  const response = await clients.hojaiAI.post('/api/campaign/predict', req.body);
  res.json(response.data);
});

app.post('/api/ai/leads/score', async (req: Request, res: Response) => {
  const response = await clients.hojaiAI.post('/api/leads/score', req.body);
  res.json(response.data);
});

app.post('/api/ai/fraud/detect', async (req: Request, res: Response) => {
  const response = await clients.hojaiAI.post('/api/fraud/detect', req.body);
  res.json(response.data);
});

app.post('/api/ai/recommendations', async (req: Request, res: Response) => {
  const response = await clients.hojaiAI.post('/api/recommendations', req.body);
  res.json(response.data);
});

// ============================================================================
// CDP PROXY
// ============================================================================

app.get('/api/cdp/profiles/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const response = await clients.cdp.get(`/api/profiles/${userId}`);
  res.json(response.data);
});

app.post('/api/cdp/profiles', async (req: Request, res: Response) => {
  const response = await clients.cdp.post('/api/profiles', req.body);
  res.json(response.data);
});

app.post('/api/cdp/profiles/identify', async (req: Request, res: Response) => {
  const response = await clients.cdp.post('/api/profiles/identify', req.body);
  res.json(response.data);
});

app.get('/api/cdp/activities/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  const response = await clients.cdp.get(`/api/activities/${userId}`);
  res.json(response.data);
});

app.get('/api/cdp/segments', async (req: Request, res: Response) => {
  const response = await clients.cdp.get('/api/segments');
  res.json(response.data);
});

// ============================================================================
// INVENTORY PROXY
// ============================================================================

app.get('/api/inventory/screens', async (req: Request, res: Response) => {
  const { city, area, type, status } = req.query;
  const response = await clients.inventory.get('/api/inventory/screens', { params: { city, area, type, status } });
  res.json(response.data);
});

app.get('/api/inventory/screens/:screenId', async (req: Request, res: Response) => {
  const { screenId } = req.params;
  const response = await clients.inventory.get(`/api/inventory/screens/${screenId}`);
  res.json(response.data);
});

app.get('/api/inventory/search', async (req: Request, res: Response) => {
  const { q, lat, lng, radius } = req.query;
  const response = await clients.inventory.get('/api/inventory/search', { params: { q, lat, lng, radius } });
  res.json(response.data);
});

app.get('/api/inventory/stats', async (req: Request, res: Response) => {
  const response = await clients.inventory.get('/api/inventory/stats');
  res.json(response.data);
});

// ============================================================================
// PIXEL PROXY
// ============================================================================

app.post('/api/pixel/track', async (req: Request, res: Response) => {
  const response = await clients.pixel.post('/track', req.body);
  res.json(response.data);
});

app.post('/api/pixel/server/event', async (req: Request, res: Response) => {
  const response = await clients.pixel.post('/server/event', req.body);
  res.json(response.data);
});

app.get('/api/pixel/sdk.js', async (req: Request, res: Response) => {
  const { pixel_id } = req.query;
  const response = await clients.pixel.get('/sdk.js', { params: { pixel_id } });
  res.set('Content-Type', 'application/javascript');
  res.send(response.data);
});

// ============================================================================
// ATTRIBUTION PROXY
// ============================================================================

app.post('/api/attribution/track', async (req: Request, res: Response) => {
  const response = await clients.attribution.post('/api/track', req.body);
  res.json(response.data);
});

app.post('/api/attribution/conversion', async (req: Request, res: Response) => {
  const response = await clients.attribution.post('/api/conversion', req.body);
  res.json(response.data);
});

app.get('/api/attribution/report/:campaignId', async (req: Request, res: Response) => {
  const { campaignId } = req.params;
  const response = await clients.attribution.get(`/api/report/${campaignId}`);
  res.json(response.data);
});

// ============================================================================
// DECISION PROXY
// ============================================================================

app.post('/api/decision/targeting/evaluate', async (req: Request, res: Response) => {
  const response = await clients.decision.post('/api/targeting/evaluate', req.body);
  res.json(response.data);
});

app.post('/api/decision/sampling/bid', async (req: Request, res: Response) => {
  const response = await clients.decision.post('/api/sampling/bid', req.body);
  res.json(response.data);
});

app.get('/api/decision/analytics/dooh', async (req: Request, res: Response) => {
  const response = await clients.decision.get('/api/analytics/dooh');
  res.json(response.data);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  AdBazaar Integration Service v1.0.0              ║
║  Port: ${PORT}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  CONNECTED SERVICES:                                 ║
║  • Audience Intelligence (4805)                    ║
║  • HOJAI AI Gateway (4560)                        ║
║  • Intent Aggregator (4800)                        ║
║  • Intent Prediction (4801)                        ║
║  • Intent Marketplace (4802)                        ║
║  • CDP (4901)                                     ║
║  • Inventory (4900)                                ║
║  • Pixel (4962)                                    ║
║  • Attribution (4950)                               ║
║  • Decision (4027)                                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
