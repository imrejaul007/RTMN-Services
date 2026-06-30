/**
 * HOJAI InternetOS API Server
 *
 * HTTP gateway for all actor and watcher operations
 * Port: 4595
 *
 * Integrates with existing HOJAI services:
 * - MemoryOS (4703) - Store scraped data
 * - TwinOS Hub (4705) - Register entities
 * - Knowledge Extraction (4784) - NER, entity linking
 * - Webhook Bus (4110) - Notifications
 * - SkillOS (4743) - Register skills
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { actorRoutes } from './routes/actors.js';
import { watcherRoutes } from './routes/watchers.js';
import { historyRoutes } from './routes/history.js';
import { actorService } from './services/actorService.js';
import { watcherService } from './services/watcherService.js';
import { config } from './config.js';

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'internet-os-api',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

// Ready check
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const actorServiceReady = actorService.isHealthy();
    const watcherServiceReady = watcherService.isHealthy();

    res.json({
      ready: actorServiceReady && watcherServiceReady,
      services: {
        actorService: actorServiceReady,
        watcherService: watcherServiceReady,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// API Routes
app.use('/api/actors', actorRoutes);
app.use('/api/watchers', watcherRoutes);
app.use('/api/history', historyRoutes);

// Stats endpoint
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json({
    actors: actorService.getStats(),
    watchers: watcherService.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// Error handling
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Start server
app.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              HOJAI InternetOS API Server                     ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${String(config.port).padEnd(43)}║
║  Environment: ${String(process.env.NODE_ENV || 'development').padEnd(43)}║
║                                                              ║
║  Endpoints:                                                  ║
║  - GET  /health              Health check                   ║
║  - GET  /ready               Readiness check                ║
║  - GET  /api/stats           Service statistics             ║
║  - GET  /api/actors          List actors                   ║
║  - POST /api/actors/:id/run   Run actor                     ║
║  - GET  /api/watchers        List watchers                 ║
║  - POST /api/watchers        Create watcher                ║
║  - GET  /api/history         Search history                ║
║                                                              ║
║  Integrations:                                               ║
║  - MemoryOS:      ${String(config.services.memoryOs).padEnd(35)}║
║  - TwinOS Hub:    ${String(config.services.twinOs).padEnd(35)}║
║  - Knowledge:      ${String(config.services.knowledgeExtraction).padEnd(35)}║
║  - Webhook Bus:    ${String(config.services.webhookBus).padEnd(35)}║
║  - SkillOS:       ${String(config.services.skillOs).padEnd(35)}║
╚══════════════════════════════════════════════════════════════╝
  `);
});

export default app;
