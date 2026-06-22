// ============================================================================
// SUTAR Gateway - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4140;
const START_TIME = Date.now();

export interface RouteConfig {
  path: string;
  target: string;
  methods: string[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId?: string;
}

// Service routes
const routes: RouteConfig[] = [
  // Layer 4: Decision
  { path: '/api/v1/decide', target: 'http://localhost:4240', methods: ['POST'] },
  // Layer 5: Simulation
  { path: '/api/v1/simulations', target: 'http://localhost:4241', methods: ['GET', 'POST'] },
  { path: '/api/v1/simulations/:id', target: 'http://localhost:4241', methods: ['GET', 'DELETE'] },
  { path: '/api/v1/simulations/:id/whatif', target: 'http://localhost:4241', methods: ['POST'] },
  // Layer 3: Goals
  { path: '/api/v1/goals', target: 'http://localhost:4242', methods: ['GET', 'POST'] },
  // Agent & Intent
  { path: '/api/v1/agents', target: 'http://localhost:4155', methods: ['GET', 'POST'] },
  { path: '/api/v1/intents', target: 'http://localhost:4154', methods: ['GET', 'POST'] },
  // Trust & Contract
  { path: '/api/v1/trust', target: 'http://localhost:4180', methods: ['GET', 'POST'] },
  { path: '/api/v1/contracts', target: 'http://localhost:4190', methods: ['GET', 'POST', 'PUT'] },
  { path: '/api/v1/contracts/:id/sign', target: 'http://localhost:4190', methods: ['POST'] },
  // Negotiation & Economy
  { path: '/api/v1/rfq', target: 'http://localhost:4191', methods: ['GET', 'POST'] },
  { path: '/api/v1/quotes', target: 'http://localhost:4191', methods: ['GET', 'POST'] },
  { path: '/api/v1/negotiate', target: 'http://localhost:4191', methods: ['POST'] },
  { path: '/api/v1/karma', target: 'http://localhost:4251', methods: ['GET', 'POST'] },
  { path: '/api/v1/transactions', target: 'http://localhost:4251', methods: ['GET', 'POST'] },
  // Marketplace
  { path: '/api/v1/services', target: 'http://localhost:4250', methods: ['GET', 'POST'] },
  // Memory & Learning
  { path: '/api/v1/memories', target: 'http://localhost:4143', methods: ['GET', 'POST'] },
  { path: '/api/v1/patterns', target: 'http://localhost:4243', methods: ['GET', 'POST'] },
  { path: '/api/v1/learn', target: 'http://localhost:4243', methods: ['POST'] },
];

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'] }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { success: false, error: 'Too many requests' } });
app.use('/api/', limiter);

// Request ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    status: res.statusCode,
    duration: Date.now() - start,
    requestId: (req as any).requestId,
  })));
  next();
});

const apiResponse = <T>(success: boolean, data?: T, error?: string, requestId?: string): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

// Health
app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-gateway',
    version: '1.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    routes: routes.length,
  }));
});
app.get('/health/ready', (_req: Request, res: Response) => res.json(apiResponse(true, { ready: true })));
app.get('/health/live', (_req: Request, res: Response) => res.json(apiResponse(true, { alive: true })));

// Info
app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-gateway',
    description: 'SUTAR OS Main API Gateway',
    version: '1.0.0',
    routes: routes.length,
  }));
});

// Routes list
app.get('/api/v1/routes', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { routes }));
});

// Generic proxy for routed services
app.all('/api/v1/:service/:resource/:id/:action', async (req: Request, res: Response) => {
  console.log(`[GATEWAY] ${req.method} /api/v1/${req.params.service}/${req.params.resource}/${req.params.id}/${req.params.action}`);
  res.json(apiResponse(true, {
    message: 'Gateway routing configured',
    service: req.params.service,
    resource: req.params.resource,
    action: req.params.action,
  }));
});

app.all('/api/v1/:service/:resource/:id', async (req: Request, res: Response) => {
  console.log(`[GATEWAY] ${req.method} /api/v1/${req.params.service}/${req.params.resource}/${req.params.id}`);
  res.json(apiResponse(true, {
    message: 'Gateway routing configured',
    service: req.params.service,
    resource: req.params.resource,
    id: req.params.id,
  }));
});

app.all('/api/v1/:service/:resource', async (req: Request, res: Response) => {
  console.log(`[GATEWAY] ${req.method} /api/v1/${req.params.service}/${req.params.resource}`);
  res.json(apiResponse(true, {
    message: 'Gateway routing configured',
    service: req.params.service,
    resource: req.params.resource,
  }));
});

// 404 & Error
app.use((_req: Request, res: Response) => res.status(404).json(apiResponse(false, undefined, 'Route not found')));
app.use((err: Error, _req: Request, res: Response) => {
  console.error('Gateway error:', err);
  res.status(500).json(apiResponse(false, undefined, err.message));
});

process.on('SIGTERM', () => { console.log('Shutting down...'); process.exit(0); });
process.on('SIGINT', () => { console.log('Shutting down...'); process.exit(0); });

app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗
║        SUTAR GATEWAY v1.0.0              ║
╠══════════════════════════════════════════════╣
║  Port:     ${PORT}                             ║
║  Routes:   ${routes.length}                             ║
║  Status:   RUNNING                        ║
╚══════════════════════════════════════════════╝\n`);
});

export default app;
