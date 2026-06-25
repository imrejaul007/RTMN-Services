/**
 * SUTAR Negotiation Engine - Main Entry Point
 *
 * Layer 7 of SUTAR OS - Automated Bargaining and Negotiation
 *
 * Endpoints:
 *   POST   /api/v1/negotiations              Create a new negotiation
 *   GET    /api/v1/negotiations              List/filter negotiations
 *   GET    /api/v1/negotiations/:id          Get one negotiation
 *   POST   /api/v1/negotiations/:id/offers   Add an offer to a negotiation
 *   POST   /api/v1/negotiations/:id/counter  Add a manual counter-offer
 *   POST   /api/v1/negotiations/:id/auto-counter  Generate ZOPA-based counter
 *   POST   /api/v1/negotiations/:id/accept   Accept current offer
 *   POST   /api/v1/negotiations/:id/reject   Reject current offer
 *   POST   /api/v1/negotiations/:id/cancel   Cancel negotiation
 *   GET    /api/v1/negotiations/:id/zopa     Analyze ZOPA
 *   GET    /api/v1/negotiations/stats        Tenant-level stats
 *   POST   /api/v1/axp                       Start AXP session
 *   POST   /api/v1/axp/:sessionId/respond    Respond in AXP session
 *   GET    /api/v1/axp/:sessionId            Get AXP session
 *   GET    /api/v1/info                      Service info
 *   GET    /health                           Health check
 *   GET    /ready                            Readiness probe
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';

import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { v4 as uuidv4 } from 'uuid';

import { negotiationService } from './services/negotiation.service.js';
import { computeZOPA, diagnostics } from './services/zopa.service.js';
import * as rezIntel from './rez-intel-client.js';
import { emit as emitEvent, shutdown as shutdownEvents } from './services/events.js';
import {
  CreateNegotiationSchema,
  NegotiationQuerySchema,
  AddOfferSchema,
  CounterOfferSchema,
  GenerateCounterSchema,
  AnalyzeZOPASchema,
  CancelSchema,
  RejectSchema,
  AXPStartSchema,
  AXPResponseSchema,
  IdParamSchema,
} from './validators/negotiation.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4293;
const START_TIME = Date.now();
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const LOG_LEVEL = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';

const app = express();

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = (req.headers['x-request-id'] as string) || uuidv4();
  next();
});

// Rate limiters
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests', timestamp: new Date().toISOString() },
}));

app.use('/api/', rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many API requests', timestamp: new Date().toISOString() },
}));

// Structured request log
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (LOG_LEVEL === 'debug' || res.statusCode >= 400 || req.path.startsWith('/api/')) {
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: duration,
        requestId: req.headers['x-request-id'],
      }));
    }
  });
  next();
});

// ============================================================================
// Helpers
// ============================================================================

function apiResponse<T>(success: boolean, data?: T, error?: string, requestId?: string) {
  return { success, data, error, timestamp: new Date().toISOString(), requestId };
}

function handleZodError(err: ZodError): string {
  return err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
}

function safe(fn: (req: Request, res: Response) => Promise<void> | void) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (e) {
      next(e);
    }
  };
}

// ============================================================================
// Health
// ============================================================================

app.get('/health', (_req, res) => {
  const checks = diagnostics({ buyerMax: 100, sellerMin: 50 });
  res.json({
    status: checks.healthy ? 'healthy' : 'degraded',
    service: 'sutar-negotiation-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// ============================================================================
// Service Info
// ============================================================================

app.get('/api/v1/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'sutar-negotiation-engine',
    description: 'Negotiation Engine with ZOPA (Zone of Possible Agreement) algorithm',
    version: '1.0.0',
    port: PORT,
    environment: ENVIRONMENT,
    features: [
      'ZOPA (Zone of Possible Agreement) calculation',
      '5 negotiation strategies: competitive, collaborative, accommodating, compromising, principled',
      'Trust-weighted concession decay',
      'Counter-offer auto-generation',
      'Multi-round audit trail',
      'AXP (Agent Exchange Protocol) sessions',
      'Multi-tenant',
    ],
    endpoints: {
      create: 'POST /api/v1/negotiations',
      list: 'GET /api/v1/negotiations',
      get: 'GET /api/v1/negotiations/:id',
      addOffer: 'POST /api/v1/negotiations/:id/offers',
      addCounter: 'POST /api/v1/negotiations/:id/counter',
      autoCounter: 'POST /api/v1/negotiations/:id/auto-counter',
      accept: 'POST /api/v1/negotiations/:id/accept',
      reject: 'POST /api/v1/negotiations/:id/reject',
      cancel: 'POST /api/v1/negotiations/:id/cancel',
      zopa: 'GET /api/v1/negotiations/:id/zopa',
      stats: 'GET /api/v1/negotiations/stats',
      axpStart: 'POST /api/v1/axp',
      axpRespond: 'POST /api/v1/axp/:sessionId/respond',
    },
  }));
});

// ============================================================================
// Negotiations CRUD
// ============================================================================

app.post('/api/v1/negotiations', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const parsed = CreateNegotiationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  const negotiation = negotiationService.create(parsed.data);
  emitEvent(req, 'negotiation.started', {
    negotiationId: negotiation.id,
    buyerId: parsed.data.buyer?.email,
    sellerId: parsed.data.seller?.email,
    productOrService: parsed.data.title,
  });
  res.status(201).json(apiResponse(true, negotiation, undefined, requestId));
}));

app.get('/api/v1/negotiations', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const parsed = NegotiationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  const result = negotiationService.query(parsed.data);
  res.json({ ...result, requestId });
}));

app.get('/api/v1/negotiations/stats', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const tenantId = (req.query.tenantId as string) || (req as any).user?.tenantId;
  if (!tenantId) {
    res.status(400).json(apiResponse(false, undefined, 'tenantId required', requestId));
    return;
  }
  res.json(apiResponse(true, negotiationService.stats(tenantId), undefined, requestId));
}));

app.get('/api/v1/negotiations/:id', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const n = negotiationService.get(idCheck.data.id);
  if (!n) {
    res.status(404).json(apiResponse(false, undefined, 'Not found', requestId));
    return;
  }
  res.json(apiResponse(true, n, undefined, requestId));
}));

// ============================================================================
// Offers & Counters
// ============================================================================

app.post('/api/v1/negotiations/:id/offers', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const parsed = AddOfferSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  const n = negotiationService.addOffer(idCheck.data.id, parsed.data.partyId, parsed.data);
  res.status(201).json(apiResponse(true, n, undefined, requestId));
}));

app.post('/api/v1/negotiations/:id/counter', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const parsed = CounterOfferSchema.safeParse({ ...req.body, negotiationId: idCheck.data.id });
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  // Find a party id from the negotiation (buyer.id by default if not in body)
  const n = negotiationService.get(idCheck.data.id);
  if (!n) {
    res.status(404).json(apiResponse(false, undefined, 'Not found', requestId));
    return;
  }
  const partyId = (req.body.partyId as string) || n.buyer.id;
  const updated = negotiationService.addCounterOffer(partyId, parsed.data);
  res.status(201).json(apiResponse(true, updated, undefined, requestId));
}));

app.post('/api/v1/negotiations/:id/auto-counter', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const parsed = GenerateCounterSchema.safeParse({ ...req.body, negotiationId: idCheck.data.id });
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  const updated = negotiationService.generateCounter(parsed.data);
  res.status(201).json(apiResponse(true, updated, undefined, requestId));
}));

app.post('/api/v1/negotiations/:id/accept', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const partyId = (req.body.partyId as string) || '';
  if (!partyId) {
    res.status(400).json(apiResponse(false, undefined, 'partyId required', requestId));
    return;
  }
  const n = negotiationService.acceptOffer(idCheck.data.id, partyId);
  emitEvent(req, 'negotiation.accepted', {
    negotiationId: idCheck.data.id,
    partyId,
  });
  res.json(apiResponse(true, n, undefined, requestId));
}));

app.post('/api/v1/negotiations/:id/reject', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const parsed = RejectSchema.safeParse(req.body || {});
  const partyId = (req.body.partyId as string) || '';
  if (!partyId) {
    res.status(400).json(apiResponse(false, undefined, 'partyId required', requestId));
    return;
  }
  const n = negotiationService.rejectOffer(idCheck.data.id, partyId, parsed.success ? parsed.data.reason : undefined);
  res.json(apiResponse(true, n, undefined, requestId));
}));

app.post('/api/v1/negotiations/:id/cancel', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const parsed = CancelSchema.safeParse(req.body || {});
  const performedBy = (req.body.performedBy as string) || (req as any).user?.id || 'unknown';
  const n = negotiationService.cancel(idCheck.data.id, performedBy, parsed.success ? parsed.data.reason : undefined);
  emitEvent(req, 'negotiation.cancelled', {
    negotiationId: idCheck.data.id,
    performedBy,
    reason: parsed.success ? parsed.data.reason : undefined,
  });
  res.json(apiResponse(true, n, undefined, requestId));
}));

app.get('/api/v1/negotiations/:id/zopa', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse(req.params);
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid id', requestId));
    return;
  }
  const parsed = AnalyzeZOPASchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  // Also return the raw ZOPA without needing the negotiation
  const zopa = computeZOPA({ buyerMax: parsed.data.buyerMax, sellerMin: parsed.data.sellerMin });
  res.json(apiResponse(true, { zopa }, undefined, requestId));
}));

// ============================================================================
// AXP (Agent Exchange Protocol)
// ============================================================================

app.post('/api/v1/axp', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const idCheck = IdParamSchema.safeParse({ id: req.body.negotiationId });
  if (!idCheck.success) {
    res.status(400).json(apiResponse(false, undefined, 'negotiationId required', requestId));
    return;
  }
  const parsed = AXPStartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  const session = negotiationService.startAXP(idCheck.data.id, parsed.data.partyIds);
  res.status(201).json(apiResponse(true, session, undefined, requestId));
}));

app.post('/api/v1/axp/:sessionId/respond', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const parsed = AXPResponseSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json(apiResponse(false, undefined, handleZodError(parsed.error), requestId));
    return;
  }
  const session = negotiationService.respondAXP(req.params.sessionId, {
    negotiationId: parsed.data.negotiationId ?? '',
    partyId: parsed.data.partyId,
    response: parsed.data.response,
    offer: parsed.data.offer as any,
    message: parsed.data.message,
  });
  res.json(apiResponse(true, session, undefined, requestId));
}));

app.get('/api/v1/axp/:sessionId', requireAuth, safe((req, res) => {
  const requestId = req.headers['x-request-id'] as string;
  const session = negotiationService.getAXPSession(req.params.sessionId);
  if (!session) {
    res.status(404).json(apiResponse(false, undefined, 'Not found', requestId));
    return;
  }
  res.json(apiResponse(true, session, undefined, requestId));
}));

// ============================================================================
// Legacy / Stub endpoints (back-compat with prior contract)
// ============================================================================

app.post('/api/v1/intent', requireAuth, (req, res) => {
  const { type, payload } = req.body;
  console.log(`[INTENT] ${type}:`, payload);
  res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }));
});

app.post('/api/v1/event', requireAuth, (req, res) => {
  const { type, data } = req.body;
  console.log(`[EVENT] ${type}:`, data);
  res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }));
});

// ============================================================================
// 404 + Errors
// ============================================================================
// REZ Intelligence Integration (port 5370) — MUST be before the 404 handler
// ============================================================================
app.get('/rez-intel-status', async (_req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// ============================================================================

app.use((_req, res) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[ERROR]', err);
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json(apiResponse(false, undefined, 'Invalid JSON body'));
    return;
  }
  res.status(500).json(apiResponse(false, undefined, err.message || 'Internal server error'));
});

// ============================================================================
// Start
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║        SUTAR NEGOTIATION ENGINE - Layer 7                       ║
║        "Where Agents Come to Bargain"                          ║
╠═══════════════════════════════════════════════════════════════╣
║  Status:     RUNNING                                           ║
║  Port:        ${String(PORT).padEnd(48)}║
║  Environment: ${ENVIRONMENT.padEnd(46)}║
╠═══════════════════════════════════════════════════════════════╣
║  Endpoints:                                                  ║
║    POST   /api/v1/negotiations             - Create           ║
║    GET    /api/v1/negotiations             - List             ║
║    GET    /api/v1/negotiations/:id         - Get one          ║
║    POST   /api/v1/negotiations/:id/offers  - Add offer        ║
║    POST   /api/v1/negotiations/:id/auto-counter             ║
║    POST   /api/v1/negotiations/:id/accept  - Accept offer     ║
║    POST   /api/v1/negotiations/:id/reject  - Reject offer     ║
║    GET    /api/v1/negotiations/:id/zopa    - ZOPA analysis    ║
║    GET    /api/v1/negotiations/stats       - Stats            ║
║    POST   /api/v1/axp                      - Start AXP        ║
║    GET    /health                          - Health           ║
║    GET    /ready                           - Readiness        ║
╚═══════════════════════════════════════════════════════════════╝
  `);
});

installGracefulShutdown(server, async () => {
  await shutdownEvents();
});

export default app;
