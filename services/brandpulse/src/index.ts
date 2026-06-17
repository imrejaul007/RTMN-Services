import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';

import brandsRouter from './routes/brands';
import mentionsRouter from './routes/mentions';
import sentimentRouter from './routes/sentiment';
import campaignsRouter from './routes/campaigns';
import analyticsRouter from './routes/analytics';
import alertsRouter from './routes/alerts';

import { SocialMonitorService } from './services/socialMonitor';
import { BrandHealthService } from './services/brandHealth';
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { TwinSyncService } from './services/twinSync';

dotenv.config();

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
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

const app: Express = express();
const PORT = process.env.PORT || 4974;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const healthcheck = {
    service: 'BrandPulse',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    port: PORT
  };
  res.json(healthcheck);
});

// API Routes
app.use('/api/brands', brandsRouter);
app.use('/api/mentions', mentionsRouter);
app.use('/api/sentiment', sentimentRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/alerts', alertsRouter);

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Services
let socialMonitor: SocialMonitorService;
let brandHealth: BrandHealthService;
let customerOpsBridge: CustomerOpsBridge;
let twinSync: TwinSyncService;

// Start server
async function startServer() {
  try {
    // Connect to MongoDB if URI is provided
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      logger.info('Connected to MongoDB');
    }

    // Initialize services
    customerOpsBridge = new CustomerOpsBridge();
    twinSync = new TwinSyncService();
    brandHealth = new BrandHealthService();
    socialMonitor = new SocialMonitorService(brandHealth, twinSync, customerOpsBridge);

    // Start social monitoring
    socialMonitor.startMonitoring();

    // Start server
    app.listen(PORT, () => {
      logger.info(`BrandPulse service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  socialMonitor?.stopMonitoring();
  await mongoose.disconnect();
  process.exit(0);
});

startServer();

export { app, logger };
