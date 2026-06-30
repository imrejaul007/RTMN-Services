/**
 * RTMN Unified Hub — Express server
 * Port: 4399
 * Single entry point for all RTMN services
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { proxyRequest } from './services/proxy.js';
import {
  checkAllServices,
  startHealthChecks,
  stopHealthChecks,
  summarizeHealth,
  getCachedHealth,
} from './services/healthChecker.js';
import { SERVICE_REGISTRY, ServiceEntry } from './services/serviceRegistry.js';
import { requireHubAuth } from './middleware/auth.js';

const PORT = parseInt(process.env.PORT || '4399', 10);
const SERVICE_NAME = 'rtmn-unified-hub';

const app = express();

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));

// Auth — applies to all routes except /health and /ready (handled inside the middleware).
// In dev with no HUB_API_KEY, this is a no-op. In prod, set HUB_API_KEY.
app.use(requireHubAuth);

// === Health endpoints (no auth) ===
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: PORT,
    version: '1.0.0',
    registeredServices: SERVICE_REGISTRY.length,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (req, res) => {
  const cached = getCachedHealth();
  const summary = summarizeHealth(cached);
  res.status(summary.allHealthy ? 200 : 503).json({
    ready: summary.allHealthy,
    summary,
    timestamp: new Date().toISOString(),
  });
});

// === Service registry endpoints ===
app.get('/api/services', (req, res) => {
  const services = SERVICE_REGISTRY.map(s => ({
    name: s.name,
    url: s.url,
    prefix: s.prefix,
    category: s.category,
  }));
  res.json({
    total: services.length,
    services,
    meta: { timestamp: new Date().toISOString() },
  });
});

// === Health check endpoints ===
app.get('/api/health/all', async (req, res) => {
  const checks = await checkAllServices();
  res.json({
    summary: summarizeHealth(checks),
    services: checks,
    meta: { timestamp: new Date().toISOString() },
  });
});

app.get('/api/health/cached', (req, res) => {
  const checks = getCachedHealth();
  res.json({
    summary: summarizeHealth(checks),
    services: checks,
    meta: { timestamp: new Date().toISOString() },
  });
});

app.get('/api/health/:serviceName', async (req, res, next) => {
  try {
    const service = SERVICE_REGISTRY.find(s => s.name === req.params.serviceName);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Service not found' },
      });
    }
    const { checkServiceHealth } = await import('./services/healthChecker.js');
    const health = await checkServiceHealth(service);
    res.json(health);
  } catch (e) { next(e); }
});

// === Genie Dashboard Endpoint ===
// Aggregates data from all 14 Genie services for a unified user view
app.get('/api/genie/dashboard/:userId', async (req, res) => {
  const userId = req.params.userId;
  const timeout = 8000;

  // Direct service URLs for dashboard aggregation
  const SERVICE_DIRECT_URLS: Record<string, string> = {
    decisions: process.env.DECISION_INTELLIGENCE_URL || 'http://localhost:4740',
    learning: process.env.LEARNING_LOOP_URL || 'http://localhost:4742',
    anticipation: process.env.ANTICIPATION_URL || 'http://localhost:4745',
    ambient: process.env.AMBIENT_URL || 'http://localhost:4746',
    constitution: process.env.CONSTITUTION_URL || 'http://localhost:4743',
    financial: process.env.FINANCIAL_LIFE_URL || 'http://localhost:4747',
    health: process.env.HEALTH_URL || 'http://localhost:4748',
    household: process.env.HOUSEHOLD_URL || 'http://localhost:4749',
    travel: process.env.TRAVEL_URL || 'http://localhost:4750',
    spiritual: process.env.SPIRITUAL_URL || 'http://localhost:4751',
    simulation: process.env.LIFE_SIMULATION_URL || 'http://localhost:4752',
    focus: process.env.FOCUS_URL || 'http://localhost:4753',
    dreams: process.env.DREAMS_URL || 'http://localhost:4754',
    legacy: process.env.LEGACY_URL || 'http://localhost:4755',
  };

  const fetchDirect = async (baseUrl: string, path: string): Promise<any> => {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(`${baseUrl}${path}`, { timeout, validateStatus: () => true });
      return response.data?.data || response.data || null;
    } catch { return null; }
  };

  const fetchDirectPost = async (baseUrl: string, path: string, body: any): Promise<any> => {
    try {
      const axios = (await import('axios')).default;
      const response = await axios.post(`${baseUrl}${path}`, body, { timeout, validateStatus: () => true });
      return response.data?.data || response.data || null;
    } catch { return null; }
  };

  const d = SERVICE_DIRECT_URLS;

  const services: Record<string, Promise<any>> = {
    decisions: fetchDirect(d.decisions, `/api/decision/${userId}`),
    preferences: fetchDirect(d.learning, `/api/learning/${userId}`),
    patterns: fetchDirect(d.learning, `/api/learning/${userId}/behavior?minConfidence=0.5`),
    anticipation: fetchDirect(d.anticipation, `/api/anticipation/active/${userId}`),
    constitution: fetchDirect(d.constitution, `/api/constitution/${userId}`),
    constitutionValues: fetchDirect(d.constitution, `/api/constitution/${userId}/values`),
    financials: fetchDirect(d.financial, `/api/financial/${userId}`),
    financialBurn: fetchDirect(d.financial, `/api/financial/${userId}/burn?period=month`),
    health: fetchDirect(d.health, `/api/health/${userId}`),
    burnout: fetchDirect(d.health, `/api/health/${userId}/burnout`),
    sleep: fetchDirect(d.health, `/api/health/${userId}/sleep?days=30`),
    gastric: fetchDirect(d.health, `/api/health/${userId}/gastric?days=60`),
    household: fetchDirect(d.household, `/api/household/${userId}/dashboard`),
    focusStats: fetchDirect(d.focus, `/api/focus/${userId}`),
    focusInsights: fetchDirect(d.focus, `/api/focus/${userId}/insights`),
    prayer: fetchDirectPost(d.spiritual, `/api/spiritual/prayer`, { lat: 12.97, lng: 77.59 }),
    ramadan: fetchDirect(d.spiritual, `/api/spiritual/${userId}`),
    charity: fetchDirect(d.spiritual, `/api/spiritual/charity`),
    legacy: fetchDirect(d.legacy, `/api/legacy/${userId}`),
    legacyStats: fetchDirect(d.legacy, `/api/legacy/${userId}`),
    dreams: fetchDirect(d.dreams, `/api/dreams/${userId}?limit=10`),
    dreamPatterns: fetchDirect(d.dreams, `/api/dreams/patterns/${userId}`),
  };

  const results = await Promise.all(Object.values(services));
  const keys = Object.keys(services);

  const dashboard: Record<string, any> = {};
  keys.forEach((key, idx) => {
    dashboard[key] = results[idx];
  });

  // Health overview
  const counts = {
    decisions: dashboard.decisions ? (Array.isArray(dashboard.decisions) ? dashboard.decisions.length : 1) : 0,
    preferences: dashboard.preferences ? (Array.isArray(dashboard.preferences) ? dashboard.preferences.length : 1) : 0,
    anticipations: dashboard.anticipation ? (Array.isArray(dashboard.anticipation) ? dashboard.anticipation.length : 1) : 0,
    financialHealth: !!dashboard.financialBurn,
    healthInsights: !!dashboard.health,
    householdMembers: dashboard.household?.members || 0,
    focusSessions: dashboard.focusStats?.stats?.totalSessions || 0,
    dreams: Array.isArray(dashboard.dreams) ? dashboard.dreams.length : 0,
    legacyEntries: dashboard.legacyStats?.stats?.totalEntries || 0,
  };

  res.json({
    success: true,
    data: {
      userId,
      counts,
      dashboard,
      meta: { timestamp: new Date().toISOString() },
    },
  });
});

// === Gateway routes — proxy all /api/* requests ===
app.use('/api', proxyRequest);

// === 404 handler ===
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      hint: 'Try /api/services for available routes',
    },
    meta: { timestamp: new Date().toISOString() },
  });
});

// === Error handler ===
app.use((err: Error, req: express.Request, res: express.Response, next: any) => {
  console.error(`[${SERVICE_NAME}] Error:`, err.message);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL', message: err.message },
    meta: { timestamp: new Date().toISOString() },
  });
});

// === Start server ===
const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════��═════════════════════════╗
║      RTMN UNIFIED HUB v1.0.0                              ║
║      Single entry point for all services                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                       ║
║  Services:    ${SERVICE_REGISTRY.length} registered                            ║
╠══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                ║
║    GET  /health              - Hub health                  ║
║    GET  /ready               - All services ready?         ║
║    GET  /api/services        - Service registry            ║
║    GET  /api/health/all      - Check all services          ║
║    GET  /api/health/:name    - Check specific service      ║
║    ANY  /api/genie/*         → Genie OS Runtime (7100)     ║
║    ANY  /api/services/*      → 14 Genie services           ║
║    ANY  /api/memory/*        → MemoryOS (4703)             ║
║    ANY  /api/twin/*          → TwinOS (4705)               ║
║    ANY  /api/razo/*          → RAZO (4299)                 ║
╚══════════════════════════════════════════════════════════════╝
  `);

  startHealthChecks(30000); // Check every 30s
});

// === Graceful shutdown ===
process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] SIGTERM received`);
  stopHealthChecks();
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log(`[${SERVICE_NAME}] SIGINT received`);
  stopHealthChecks();
  server.close(() => process.exit(0));
});

export default app;