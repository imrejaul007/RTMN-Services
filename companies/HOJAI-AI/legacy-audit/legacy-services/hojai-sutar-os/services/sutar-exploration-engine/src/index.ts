// ============================================================================
// SUTAR Exploration Engine - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { ZodError } from 'zod';

// Services
import { MarketScannerService } from './services/marketScanner.js';
import { OpportunityService } from './services/opportunityService.js';
import { TrendService } from './services/trendService.js';
import { CompetitorService } from './services/competitorService.js';
import { GapService } from './services/gapService.js';
import { SegmentService } from './services/segmentService.js';
import { DiscoveryIntegration } from './services/discoveryIntegration.js';
import { SimulationIntegration } from './services/simulationIntegration.js';

// Validators
import {
  ScanQuerySchema,
  OpportunityQuerySchema,
  TrendQuerySchema,
  CompetitorQuerySchema,
  GapQuerySchema,
  SegmentQuerySchema,
  IntentPayloadSchema,
  EventPayloadSchema,
} from './validators/exploration.js';

// Types
import type { ApiResponse, HealthResponse } from './types/index.js';

// Utils
import { logger } from './utils/logger.js';
import { apiResponse, handleZodError } from './utils/helpers.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4255;
const START_TIME = Date.now();
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// ============================================================================
// Initialize Services
// ============================================================================

const marketScanner = new MarketScannerService();
const opportunityService = new OpportunityService();
const trendService = new TrendService();
const competitorService = new CompetitorService();
const gapService = new GapService();
const segmentService = new SegmentService();
const discoveryIntegration = new DiscoveryIntegration();
const simulationIntegration = new SimulationIntegration();

// ============================================================================
// Create Express App
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:4200'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Request-ID'],
  credentials: true,
}));

// Rate limiting
const rateLimit = (max: number) => {
  const limit = max;
  let requests = new Map<string, { count: number; resetTime: number }>();
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const now = Date.now();
    const record = requests.get(ip);

    if (!record || now > record.resetTime) {
      requests.set(ip, { count: 1, resetTime: now + WINDOW_MS });
      next();
      return;
    }

    if (record.count >= limit) {
      res.status(429).json(apiResponse(false, undefined, 'Too many requests, please try again later'));
      return;
    }

    record.count++;
    next();
  };
};

app.use('/api/', rateLimit(100));

// Request timeout
app.use((req: Request, res: Response, next: NextFunction) => {
  const timeout = setTimeout(() => {
    if (!res.writableEnded) {
      res.status(408).json(apiResponse(false, undefined, 'Request timeout'));
    }
  }, 30000);

  res.on('finish', () => clearTimeout(timeout));
  next();
});

// Parse JSON with size limit
app.use(express.json({ limit: '1mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// ============================================================================
// Logging Middleware
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req.method, req.path, res.statusCode, duration, (req as any).requestId, req.ip);
  });
  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  const response: HealthResponse = {
    status: 'healthy',
    service: 'sutar-exploration-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
  };
  res.json(apiResponse(true, response));
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const discoveryHealthy = await discoveryIntegration.healthCheck();
  const simulationHealthy = await simulationIntegration.healthCheck();

  const isReady = discoveryHealthy || simulationHealthy;

  if (isReady) {
    res.json(apiResponse(true, {
      ready: true,
      integrations: {
        discoveryEngine: discoveryHealthy ? 'healthy' : 'unavailable',
        simulationOS: simulationHealthy ? 'healthy' : 'unavailable',
      },
      timestamp: new Date().toISOString(),
    }));
  } else {
    res.status(503).json(apiResponse(false, { ready: false }, 'Service not ready'));
  }
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true, timestamp: new Date().toISOString() }));
});

// ============================================================================
// Info Endpoint
// ============================================================================

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'sutar-exploration-engine',
    description: 'Exploration Engine - Market scanning, opportunity identification, trend analysis, and competitor discovery',
    version: '1.0.0',
    features: [
      'Market scanning',
      'Opportunity identification',
      'Trend analysis',
      'Competitor discovery',
      'Gap analysis',
      'Market segments',
      'Discovery Engine integration',
      'SimulationOS integration',
    ],
    environment: ENVIRONMENT,
  }));
});

// ============================================================================
// Market Scanning Endpoints
// ============================================================================

/**
 * GET /api/v1/scan
 * Scan market for data points matching the query
 */
app.get('/api/v1/scan', async (req: Request, res: Response) => {
  try {
    const validated = ScanQuerySchema.parse(req.query);

    const scan = await marketScanner.scan({
      query: validated.query,
      industry: validated.industry,
      region: validated.region,
      timeRange: validated.timeRange,
      limit: validated.limit,
    });

    // Enrich with Discovery Engine data
    try {
      const discoveryResults = await discoveryIntegration.search({
        query: validated.query,
        limit: 5,
      });

      if (discoveryResults.length > 0) {
        scan.metadata.discoveryResults = discoveryResults;
      }
    } catch (e) {
      logger.warn('Failed to enrich scan with Discovery Engine data', { error: String(e) }, (req as any).requestId);
    }

    res.json(apiResponse(true, scan, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      logger.error('Market scan error', error instanceof Error ? error : undefined, (req as any).requestId);
      res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

// ============================================================================
// Opportunity Endpoints
// ============================================================================

/**
 * GET /api/v1/opportunities
 * List opportunities with optional filters
 */
app.get('/api/v1/opportunities', (req: Request, res: Response) => {
  try {
    const validated = OpportunityQuerySchema.parse(req.query);

    const result = opportunityService.list({
      type: validated.type,
      priority: validated.priority,
      minScore: validated.minScore,
      limit: validated.limit,
      offset: validated.offset,
    });

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

/**
 * GET /api/v1/opportunities/:id
 * Get a specific opportunity
 */
app.get('/api/v1/opportunities/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const opportunity = opportunityService.get(id);

  if (!opportunity) {
    res.status(404).json(apiResponse(false, undefined, 'Opportunity not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, opportunity, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/opportunities/top
 * Get top opportunities by score
 */
app.get('/api/v1/opportunities/top', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const opportunities = opportunityService.getTop(limit);
  res.json(apiResponse(true, { opportunities, count: opportunities.length }, undefined, (req as any).requestId));
});

// ============================================================================
// Trend Endpoints
// ============================================================================

/**
 * GET /api/v1/trends
 * Get trends with optional filters
 */
app.get('/api/v1/trends', (req: Request, res: Response) => {
  try {
    const validated = TrendQuerySchema.parse(req.query);

    const result = trendService.list({
      category: validated.category,
      direction: validated.direction,
      minStrength: validated.minStrength,
      timeRange: validated.timeRange,
      limit: validated.limit,
    });

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

/**
 * GET /api/v1/trends/:id
 * Get a specific trend
 */
app.get('/api/v1/trends/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const trend = trendService.get(id);

  if (!trend) {
    res.status(404).json(apiResponse(false, undefined, 'Trend not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, trend, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/trends/trending
 * Get currently trending topics
 */
app.get('/api/v1/trends/trending', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const trends = trendService.getTrending(limit);
  res.json(apiResponse(true, { trends, count: trends.length }, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/trends/emerging
 * Get emerging trends
 */
app.get('/api/v1/trends/emerging', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const trends = trendService.getEmerging(limit);
  res.json(apiResponse(true, { trends, count: trends.length }, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/trends/summary
 * Get trend summary statistics
 */
app.get('/api/v1/trends/summary', (req: Request, res: Response) => {
  const summary = trendService.getSummary();
  res.json(apiResponse(true, summary, undefined, (req as any).requestId));
});

// ============================================================================
// Competitor Endpoints
// ============================================================================

/**
 * GET /api/v1/competitors
 * Discover competitors
 */
app.get('/api/v1/competitors', (req: Request, res: Response) => {
  try {
    const validated = CompetitorQuerySchema.parse(req.query);

    const result = competitorService.list({
      industry: validated.industry,
      region: validated.region,
      limit: validated.limit,
    });

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

/**
 * GET /api/v1/competitors/:id
 * Get a specific competitor
 */
app.get('/api/v1/competitors/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const competitor = competitorService.get(id);

  if (!competitor) {
    res.status(404).json(apiResponse(false, undefined, 'Competitor not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, competitor, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/competitors/overview
 * Get market overview
 */
app.get('/api/v1/competitors/overview', (req: Request, res: Response) => {
  const overview = competitorService.getMarketOverview();
  res.json(apiResponse(true, overview, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/competitors/landscape
 * Analyze competitive landscape
 */
app.get('/api/v1/competitors/landscape', (req: Request, res: Response) => {
  const landscape = competitorService.analyzeLandscape();
  res.json(apiResponse(true, landscape, undefined, (req as any).requestId));
});

// ============================================================================
// Gap Analysis Endpoints
// ============================================================================

/**
 * GET /api/v1/gaps
 * Perform gap analysis
 */
app.get('/api/v1/gaps', (req: Request, res: Response) => {
  try {
    const validated = GapQuerySchema.parse(req.query);

    const analysis = gapService.analyze({
      industry: validated.industry,
      region: validated.region,
      type: validated.type,
      minSeverity: validated.minSeverity,
    });

    res.json(apiResponse(true, analysis, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

/**
 * GET /api/v1/gaps/:id
 * Get a specific gap analysis
 */
app.get('/api/v1/gaps/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const analysis = gapService.get(id);

  if (!analysis) {
    res.status(404).json(apiResponse(false, undefined, 'Gap analysis not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, analysis, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/gaps/opportunities
 * Get top gap-based opportunities
 */
app.get('/api/v1/gaps/opportunities', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const opportunities = gapService.getTopOpportunities(limit);
  res.json(apiResponse(true, { opportunities, count: opportunities.length }, undefined, (req as any).requestId));
});

// ============================================================================
// Market Segment Endpoints
// ============================================================================

/**
 * GET /api/v1/segments
 * Get market segments
 */
app.get('/api/v1/segments', (req: Request, res: Response) => {
  try {
    const validated = SegmentQuerySchema.parse(req.query);

    const result = segmentService.list({
      industry: validated.industry,
      region: validated.region,
      minSize: validated.minSize,
      minGrowth: validated.minGrowth,
      limit: validated.limit,
    });

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

/**
 * GET /api/v1/segments/:id
 * Get a specific market segment
 */
app.get('/api/v1/segments/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const segment = segmentService.get(id);

  if (!segment) {
    res.status(404).json(apiResponse(false, undefined, 'Market segment not found', (req as any).requestId));
    return;
  }

  res.json(apiResponse(true, segment, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/segments/highgrowth
 * Get high-growth segments
 */
app.get('/api/v1/segments/highgrowth', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const segments = segmentService.getHighGrowth(limit);
  res.json(apiResponse(true, { segments, count: segments.length }, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/segments/underserved
 * Get underserved segments
 */
app.get('/api/v1/segments/underserved', (req: Request, res: Response) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 20);
  const segments = segmentService.getUnderserved(limit);
  res.json(apiResponse(true, { segments, count: segments.length }, undefined, (req as any).requestId));
});

/**
 * GET /api/v1/segments/summary
 * Get segment summary
 */
app.get('/api/v1/segments/summary', (req: Request, res: Response) => {
  const summary = segmentService.getSummary();
  res.json(apiResponse(true, summary, undefined, (req as any).requestId));
});

// ============================================================================
// Simulation Endpoints
// ============================================================================

/**
 * POST /api/v1/simulate/opportunity
 * Simulate opportunity viability
 */
app.post('/api/v1/simulate/opportunity', async (req: Request, res: Response) => {
  try {
    const { marketSize, growthRate, competition, barriers } = req.body;

    if (typeof marketSize !== 'number' || typeof growthRate !== 'number' || typeof competition !== 'number') {
      res.status(400).json(apiResponse(false, undefined, 'Invalid parameters: marketSize, growthRate, and competition are required'));
      return;
    }

    const result = await simulationIntegration.simulateOpportunityViability({
      marketSize,
      growthRate,
      competition,
      barriers: Array.isArray(barriers) ? barriers : [],
    });

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    logger.error('Opportunity simulation error', error instanceof Error ? error : undefined, (req as any).requestId);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

/**
 * POST /api/v1/simulate/trend
 * Simulate trend impact
 */
app.post('/api/v1/simulate/trend', async (req: Request, res: Response) => {
  try {
    const { trendStrength, trendVelocity, marketSize, timeHorizon } = req.body;

    if (typeof trendStrength !== 'number' || typeof trendVelocity !== 'number' || typeof marketSize !== 'number') {
      res.status(400).json(apiResponse(false, undefined, 'Invalid parameters: trendStrength, trendVelocity, and marketSize are required'));
      return;
    }

    const result = await simulationIntegration.simulateTrendImpact({
      trendStrength,
      trendVelocity,
      marketSize,
      timeHorizon: timeHorizon || '1y',
    });

    res.json(apiResponse(true, result, undefined, (req as any).requestId));
  } catch (error) {
    logger.error('Trend simulation error', error instanceof Error ? error : undefined, (req as any).requestId);
    res.status(500).json(apiResponse(false, undefined, String(error), (req as any).requestId));
  }
});

// ============================================================================
// Intent/Event Endpoints
// ============================================================================

app.post('/api/v1/intent', async (req: Request, res: Response) => {
  try {
    const validated = IntentPayloadSchema.parse(req.body);
    const { type, payload } = validated;

    logger.info(`[INTENT] ${type}`, payload, (req as any).requestId);

    // Handle exploration intents
    if (type === 'SCAN_MARKET') {
      const scan = await marketScanner.scan({
        query: (payload.query as string) || '',
        industry: payload.industry as string,
        region: payload.region as string,
      });
      res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'completed', scan }, undefined, (req as any).requestId));
      return;
    }

    if (type === 'FIND_OPPORTUNITIES') {
      const result = opportunityService.list({ limit: 20 });
      res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'completed', opportunities: result.opportunities }, undefined, (req as any).requestId));
      return;
    }

    if (type === 'ANALYZE_TRENDS') {
      const trends = trendService.list({ limit: 20 });
      res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'completed', trends: trends.trends }, undefined, (req as any).requestId));
      return;
    }

    res.json(apiResponse(true, { intentId: uuidv4(), type, status: 'received' }, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(400).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

app.post('/api/v1/event', async (req: Request, res: Response) => {
  try {
    const validated = EventPayloadSchema.parse(req.body);
    const { type, data } = validated;

    logger.info(`[EVENT] ${type}`, data, (req as any).requestId);

    res.json(apiResponse(true, { eventId: uuidv4(), type, status: 'processed' }, undefined, (req as any).requestId));
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json(apiResponse(false, undefined, handleZodError(error), (req as any).requestId));
    } else {
      res.status(400).json(apiResponse(false, undefined, String(error), (req as any).requestId));
    }
  }
});

// ============================================================================
// Metrics Endpoint
// ============================================================================

app.get('/metrics', (_req: Request, res: Response) => {
  const metrics = {
    uptime_seconds: Math.floor((Date.now() - START_TIME) / 1000),
    memory_usage_bytes: process.memoryUsage().heapUsed,
    market_scanner_cache_size: marketScanner.getCacheStats().size,
    discovery_integration_cache_size: discoveryIntegration.getCacheStats().size,
  };

  res.setHeader('Content-Type', 'text/plain');
  res.send(Object.entries(metrics)
    .map(([key, value]) => `${key} ${value}`)
    .join('\n'));
});

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Not found'));
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', err);
  res.status(500).json(apiResponse(false, undefined, 'Internal server error'));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

let server: ReturnType<typeof app.listen>;

const shutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// Start Server
// ============================================================================

server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           SUTAR EXPLORATION ENGINE v1.0.0                     ║
║════════════════════════════════════════════════════════════════║
║  Port:     ${PORT}                                              ║
║  Env:      ${ENVIRONMENT.padEnd(54)}║
║  Status:   RUNNING                                             ║
║                                                            ║
║  Features:                                                 ║
║    - Market scanning                                        ║
║    - Opportunity identification                             ║
║    - Trend analysis                                         ║
║    - Competitor discovery                                   ║
║    - Gap analysis                                           ║
║    - Market segments                                        ║
║    - Discovery Engine integration (4256)                    ║
║    - SimulationOS integration (4241)                       ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
