import { requireAuth } from '@rtmn/shared/auth';
import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';

// Routes
import brandRoutes from './routes/brand.routes.js';
import reviewRoutes from './routes/review.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import sentimentRoutes from './routes/sentiment.routes.js';

// Services
import { analyticsService } from './services/analytics.service.js';
import { wsService } from './services/websocket.service.js';
import { demoService } from './services/demo.service.js';

// ============================================================================
// GLOBAL ERROR HANDLERS
// ============================================================================

process.on('unhandledRejection', (reason: unknown) => {
  console.error('[FATAL] Unhandled Promise Rejection:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    timestamp: new Date().toISOString()
  });
});

process.on('uncaughtException', (error: Error) => {
  console.error('[FATAL] Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// ============================================================================
// APP SETUP
// ============================================================================

const app = express();
const PORT = process.env.PORT || 4735;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/brandpulse';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:4780'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'brandpulse',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    websocket: {
      enabled: true,
      clients: wsService.getClientCount()
    }
  });
});

app.get('/ready', (req: Request, res: Response) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({
    status: ready ? 'ready' : 'not-ready',
    service: 'brandpulse',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: ready ? 'connected' : 'disconnected'
  });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'HOJAI BrandPulse',
    description: 'Brand intelligence and sentiment analysis',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      brands: '/api/v1/brands',
      reviews: '/api/v1/reviews',
      analytics: '/api/v1/analytics',
      sentiment: '/api/v1/sentiment',
      websocket: '/ws',
      demo: '/api/v1/demo'
    }
  });
});

// ============================================================================
// API DOCUMENTATION (OpenAPI)
// ============================================================================

app.get('/api/docs', (req: Request, res: Response) => {
  const docsPath = path.join(process.cwd(), 'docs', 'openapi.json');
  if (fs.existsSync(docsPath)) {
    res.json(JSON.parse(fs.readFileSync(docsPath, 'utf-8')));
  } else {
    res.status(404).json({ error: 'API documentation not found' });
  }
});

// Serve Swagger UI
app.use('/api/docs/ui', express.static(path.join(process.cwd(), 'node_modules', 'swagger-ui-dist')));

app.get('/api/docs/ui', (req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <title>BrandPulse API Documentation</title>
  <link rel="stylesheet" href="/api/docs/ui/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="/api/docs/ui/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api/docs',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>
  `);
});

// ============================================================================
// API ROUTES (v1)
// ============================================================================

app.use('/api/v1/brands', brandRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/sentiment', sentimentRoutes);

// ============================================================================
// DEMO ENDPOINTS
// ============================================================================

/**
 * Generate demo data for a brand
 */
app.post('/api/v1/demo/generate',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { brandId = 'demo-brand', tenantId = 'demo-tenant', brandName = 'Demo Hotel', industry = 'hotel' } = req.body;

    const result = await demoService.generateDemoData({
      brandId,
      tenantId,
      brandName,
      industry
    });

    res.json({
      success: true,
      data: {
        brand: result.brand,
        reviewsGenerated: result.reviews,
        message: `Demo data generated for ${brandName}`
      }
    });
  } catch (error: any) {
    console.error('[Demo] Generation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate demo data'
    });
  }
});

/**
 * Reset demo data
 */
app.delete('/api/v1/demo/reset',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { brandId = 'demo-brand' } = req.body;

    await demoService.resetDemoData(brandId);

    res.json({
      success: true,
      message: 'Demo data reset'
    });
  } catch (error: any) {
    console.error('[Demo] Reset failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset demo data'
    });
  }
});

/**
 * Get demo setup status
 */
app.get('/api/v1/demo/status', async (req: Request, res: Response) => {
  try {
    const { Brand } = await import('./models/index.js');
    const { Review } = await import('./models/index.js');

    const brandCount = await Brand.countDocuments();
    const reviewCount = await Review.countDocuments();
    const wsClients = wsService.getClientCount();

    res.json({
      success: true,
      data: {
        brands: brandCount,
        reviews: reviewCount,
        websocketClients: wsClients
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to get demo status'
    });
  }
});

// ============================================================================
// LEGACY ROUTES (for backward compatibility)
// ============================================================================

app.use('/api/brand', (req: Request, res: Response) => {
  const path = req.path.replace(/^\/brand/, '/brands');
  res.redirect(301, `/api/v1${path}`);
});

app.use('/api/reviews', reviewRoutes);
app.use('/api/sentiment', sentimentRoutes);

// ============================================================================
// RTNM INTEGRATION WEBHOOKS
// ============================================================================

/**
 * Webhook for RTNM to send reviews
 */
app.post('/webhook/rtnm/reviews',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { review } = req.body;

    if (!review) {
      return res.status(400).json({
        success: false,
        error: 'Review data required'
      });
    }

    const { reviewService } = await import('./services/review.service.js');
    const created = await reviewService.createReview({
      brandId: review.brandId,
      tenantId: review.tenantId,
      source: 'internal',
      content: review.content,
      rating: review.rating,
      title: review.title,
      author: review.author,
      metadata: review.metadata
    });

    // Broadcast via WebSocket
    wsService.broadcastReview({
      type: 'new_review',
      brandId: review.brandId,
      review: created
    });

    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error: any) {
    console.error('[Webhook] Error processing RTNM review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process review'
    });
  }
});

/**
 * Webhook for RTNM to send sentiment updates
 */
app.post('/webhook/rtnm/sentiment',requireAuth,  async (req: Request, res: Response) => {
  try {
    const { brandId, tenantId } = req.body;

    if (!brandId || !tenantId) {
      return res.status(400).json({
        success: false,
        error: 'brandId and tenantId required'
      });
    }

    await analyticsService.aggregateSentiment(brandId, tenantId);

    // Broadcast sentiment update
    const overview = await analyticsService.getBrandOverview(brandId);
    if (overview) {
      wsService.broadcastSentimentUpdate({
        type: 'sentiment_changed',
        brandId,
        score: overview.stats.sentimentScore,
        previousScore: 0 // Would need to track previous
      });
    }

    res.json({
      success: true,
      message: 'Sentiment aggregated'
    });
  } catch (error) {
    console.error('[Webhook] Error aggregating sentiment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to aggregate sentiment'
    });
  }
});

// ============================================================================
// WEBSOCKET INFO ENDPOINT
// ============================================================================

app.get('/ws/info', (req: Request, res: Response) => {
  res.json({
    websocket: {
      endpoint: '/ws',
      protocol: 'ws',
      features: ['subscribe', 'unsubscribe', 'real-time-updates'],
      events: ['new_review', 'review_updated', 'new_alert', 'sentiment_changed']
    }
  });
});

// ============================================================================
// ERROR HANDLER
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal error' : err.message
  });
});

// ============================================================================
// 404 HANDLER
// ============================================================================

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// ============================================================================
// START SERVER
// ============================================================================

const httpServer = createServer(app);

async function start() {
  console.log('[BrandPulse] Starting...');

  // Connect to MongoDB
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('[MongoDB] Connected to', MONGODB_URI);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    // Continue anyway for development
  }

  // Initialize WebSocket server
  wsService.initialize(httpServer);
  console.log('[WebSocket] Initialized on /ws');

  // Start HTTP server
  httpServer.listen(PORT, () => {
    console.log(`[BrandPulse] Running on port ${PORT}`);
    console.log(`[BrandPulse] Health: http://localhost:${PORT}/health`);
    console.log(`[BrandPulse] API: http://localhost:${PORT}/api/v1`);
    console.log(`[BrandPulse] WebSocket: ws://localhost:${PORT}/ws`);
    console.log(`[BrandPulse] API Docs: http://localhost:${PORT}/api/docs/ui`);
    console.log(`[BrandPulse] Demo: POST http://localhost:${PORT}/api/v1/demo/generate`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[BrandPulse] Shutting down...');
  wsService.shutdown();
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[BrandPulse] Shutting down...');
  wsService.shutdown();
  await mongoose.disconnect();
  process.exit(0);
});

start().catch((error) => {
  console.error('[BrandPulse] Failed to start:', error);
  process.exit(1);
});

export default app;
