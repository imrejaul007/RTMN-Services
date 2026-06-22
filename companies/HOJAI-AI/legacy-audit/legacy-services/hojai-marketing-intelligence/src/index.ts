/**
 * HOJAI Marketing Intelligence - Main Server
 */

import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import marketingRoutes from './routes/marketing.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('server');
const PORT = process.env.PORT || 4753;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-marketing-intelligence';
const isProduction = process.env.NODE_ENV === 'production';
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id'] }));
app.use(express.json({ limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', requestId);
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', service: 'hojai-marketing-intelligence', version: '1.0.0', timestamp: new Date().toISOString() });
});

app.get('/ready', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(mongoStatus === 'connected' ? 200 : 503).json({ status: mongoStatus === 'connected' ? 'ready' : 'not_ready', checks: { mongodb: mongoStatus }, timestamp: new Date().toISOString() });
});

app.use('/api', marketingRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` }, meta: { timestamp: new Date().toISOString() } });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('unhandled_error', { error: err.message, stack: isProduction ? undefined : err.stack });
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: isProduction ? 'Internal server error' : err.message }, meta: { timestamp: new Date().toISOString() } });
});

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, { maxPoolSize: 10, serverSelectionTimeoutMS: 5000 });
    logger.info('mongodb_connected', {});
  } catch (error) {
    logger.error('mongodb_connection_failed', { error: (error as Error).message });
    throw error;
  }
}

async function startServer(): Promise<void> {
  logger.info('server_starting', { port: PORT });
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info('server_started', { port: PORT });
      console.log(`\n📣 HOJAI Marketing Intelligence`);
      console.log(`   Port: ${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('server_start_failed', { error: (error as Error).message });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => { logger.info('server_shutting_down'); await mongoose.disconnect(); process.exit(0); });
process.on('SIGINT', async () => { logger.info('server_shutting_down'); await mongoose.disconnect(); process.exit(0); });

startServer();
export default app;
