import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import crmRoutes from './routes/crm';
import leadsRoutes from './routes/leads';
import whatsappRoutes from './routes/whatsapp';
import campaignsRoutes from './routes/campaigns';
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { TwinSync } from './services/twinSync';

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

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 4962;

// Initialize services
const customerOpsBridge = new CustomerOpsBridge(logger);
const twinSync = new TwinSync(logger);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
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
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'adbazaar-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id']
  });
});

// API routes
app.use('/api/crm', crmRoutes(customerOpsBridge, twinSync, logger));
app.use('/api/leads', leadsRoutes(customerOpsBridge, twinSync, logger));
app.use('/api/whatsapp', whatsappRoutes(customerOpsBridge, twinSync, logger));
app.use('/api/campaigns', campaignsRoutes(customerOpsBridge, twinSync, logger));

// Integration status endpoint
app.get('/api/integration/status', async (req, res) => {
  try {
    const [leadTwin, customerTwin, campaignTwin] = await Promise.all([
      twinSync.checkTwinHealth('lead'),
      twinSync.checkTwinHealth('customer'),
      twinSync.checkTwinHealth('campaign')
    ]);

    const crmHubHealth = await customerOpsBridge.checkServiceHealth('crm-hub');
    const customerOpsHealth = await customerOpsBridge.checkServiceHealth('customer-ops');

    res.json({
      status: 'ok',
      services: {
        'crm-hub': crmHubHealth,
        'lead-twin': leadTwin,
        'customer-twin': customerTwin,
        'campaign-twin': campaignTwin,
        'customer-ops': customerOpsHealth
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Integration status check failed', { error });
    res.status(500).json({
      status: 'error',
      message: 'Failed to check integration status'
    });
  }
});

// DOOH and Journey Intelligence endpoint
app.post('/api/dooh/journey', async (req, res) => {
  try {
    const { adId, audienceId, location, timestamp, impressions } = req.body;

    // Sync to Journey Intelligence via TwinSync
    const journeyEvent = await twinSync.syncDOOHJourney({
      adId,
      audienceId,
      location,
      timestamp: timestamp || new Date().toISOString(),
      impressions: impressions || 1
    });

    // Forward to Journey Intelligence
    await customerOpsBridge.sendToJourneyIntelligence({
      type: 'dooh_exposure',
      data: journeyEvent
    });

    res.json({
      success: true,
      journeyEvent,
      message: 'DOOH journey event synced'
    });
  } catch (error) {
    logger.error('DOOH journey sync failed', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to sync DOOH journey'
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    requestId: req.headers['x-request-id']
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    requestId: req.headers['x-request-id']
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`AdBazaar Integration Service running on port ${PORT}`);
  logger.info(`CRM Hub endpoint: /api/crm`);
  logger.info(`Lead Intelligence endpoint: /api/leads`);
  logger.info(`WhatsApp endpoint: /api/whatsapp`);
  logger.info(`Campaigns endpoint: /api/campaigns`);
  logger.info(`Integration status: /api/integration/status`);
});

export { app, customerOpsBridge, twinSync };
