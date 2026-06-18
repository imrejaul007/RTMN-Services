import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import salesmindRoutes from './routes/salesmind';
import salesosRoutes from './routes/salesos';
import customeropsRoutes from './routes/customerops';
import brandpulseRoutes from './routes/brandpulse';

// Services
import { Synchronizer } from './services/synchronizer';
import { ConflictResolver } from './services/conflictResolver';
import { AuditLog } from './services/auditLog';

// Load environment variables
dotenv.config();

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Initialize services
const auditLog = new AuditLog(logger);
const conflictResolver = new ConflictResolver(logger);
const synchronizer = new Synchronizer(auditLog, conflictResolver, logger);

// Express app
const app: Application = express();
const PORT = process.env.PORT || 5182;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const syncStatus = synchronizer.getStatus();
  res.json({
    status: 'healthy',
    service: 'sales-sync',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    syncStatus,
    uptime: process.uptime()
  });
});

// Sync status endpoint
app.get('/api/sync/status', async (req: Request, res: Response) => {
  try {
    const status = synchronizer.getStatus();
    const auditSummary = auditLog.getSummary();
    res.json({
      synchronizer: status,
      audit: auditSummary
    });
  } catch (error) {
    logger.error('Error getting sync status', { error });
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Sync control endpoints
app.post('/api/sync/trigger', async (req: Request, res: Response) => {
  try {
    const { source, target } = req.body;
    await synchronizer.triggerSync(source, target);
    res.json({ success: true, message: 'Sync triggered' });
  } catch (error) {
    logger.error('Error triggering sync', { error });
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

app.post('/api/sync/pause', async (req: Request, res: Response) => {
  try {
    synchronizer.pauseSync();
    res.json({ success: true, message: 'Sync paused' });
  } catch (error) {
    logger.error('Error pausing sync', { error });
    res.status(500).json({ error: 'Failed to pause sync' });
  }
});

app.post('/api/sync/resume', async (req: Request, res: Response) => {
  try {
    synchronizer.resumeSync();
    res.json({ success: true, message: 'Sync resumed' });
  } catch (error) {
    logger.error('Error resuming sync', { error });
    res.status(500).json({ error: 'Failed to resume sync' });
  }
});

// Audit log endpoints
app.get('/api/audit/logs', async (req: Request, res: Response) => {
  try {
    const { source, target, limit = 100, offset = 0 } = req.query;
    const logs = auditLog.getLogs({
      source: source as string,
      target: target as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
    res.json(logs);
  } catch (error) {
    logger.error('Error getting audit logs', { error });
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

app.get('/api/audit/stats', async (req: Request, res: Response) => {
  try {
    const stats = auditLog.getStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting audit stats', { error });
    res.status(500).json({ error: 'Failed to get audit stats' });
  }
});

// Mount routes
app.use('/api/salesmind', salesmindRoutes(synchronizer, auditLog, logger));
app.use('/api/salesos', salesosRoutes(synchronizer, auditLog, logger));
app.use('/api/customerops', customeropsRoutes(synchronizer, auditLog, logger));
app.use('/api/brandpulse', brandpulseRoutes(synchronizer, auditLog, logger));

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id']
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Sales Sync Service started on port ${PORT}`);
  logger.info('Available routes:');
  logger.info('  - GET  /health');
  logger.info('  - GET  /api/sync/status');
  logger.info('  - POST /api/sync/trigger');
  logger.info('  - POST /api/sync/pause');
  logger.info('  - POST /api/sync/resume');
  logger.info('  - GET  /api/audit/logs');
  logger.info('  - GET  /api/audit/stats');
  logger.info('  - /api/salesmind/* - SalesMind integration');
  logger.info('  - /api/salesos/* - Sales OS integration');
  logger.info('  - /api/customerops/* - Customer Ops integration');
  logger.info('  - /api/brandpulse/* - BrandPulse integration');

  // Initialize synchronizer
  synchronizer.initialize().catch((err) => {
    logger.error('Failed to initialize synchronizer', { error: err });
  });
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down Sales Sync Service...');
  synchronizer.stop();
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

export { app, server, synchronizer, auditLog, conflictResolver };
