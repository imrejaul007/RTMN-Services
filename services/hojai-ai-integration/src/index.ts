import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { initializeBridge } from './services/customerOpsBridge';
import { initializeTwinSync } from './services/twinSync';
import genieRoutes from './routes/genie';
import copilotRoutes from './routes/copilot';
import sutarRoutes from './routes/sutar';

import winston from 'winston';

dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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
const PORT = process.env.PORT || 4960;

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    const bridge = initializeBridge({
      customerOpsUrl: process.env.CUSTOMER_OPS_URL || 'http://localhost:4399',
      memoryOsUrl: process.env.MEMORY_OS_URL || 'http://localhost:4703',
      goalOsUrl: process.env.GOAL_OS_URL || 'http://localhost:4242',
      decisionEngineUrl: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
      copilotUrl: process.env.COPILOT_SERVICE_URL || 'http://localhost:4765',
      apiKey: process.env.SERVICE_API_KEY
    });

    const twinSync = initializeTwinSync({
      agentTwinUrl: process.env.AGENT_TWIN_URL || 'http://localhost:3011',
      buyerTwinUrl: process.env.BUYER_TWIN_URL || 'http://localhost:3017',
      areaTwinUrl: process.env.AREA_TWIN_URL || 'http://localhost:3019',
      referralTwinUrl: process.env.REFERRAL_TWIN_URL || 'http://localhost:3016',
      dealTwinUrl: process.env.DEAL_TWIN_URL || 'http://localhost:3018',
      propertyTwinUrl: process.env.PROPERTY_TWIN_URL || 'http://localhost:3015',
      eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
      apiKey: process.env.SERVICE_API_KEY
    });

    const [bridgeHealth, twinHealth] = await Promise.all([
      bridge.healthCheck(),
      twinSync.healthCheck()
    ]);

    const allHealthy = bridgeHealth.status === 'healthy' && twinHealth.status === 'healthy';

    res.json({
      service: 'hojai-ai-integration',
      status: allHealthy ? 'healthy' : 'degraded',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        bridge: bridgeHealth,
        twinSync: twinHealth
      }
    });
  } catch (error: any) {
    logger.error('Health check error', { error: error.message });
    res.status(500).json({
      service: 'hojai-ai-integration',
      status: 'error',
      error: error.message
    });
  }
});

app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'HOJAI AI Integration Service',
    version: '1.0.0',
    description: 'Integration service connecting HOJAI AI products to Customer Operations OS',
    port: PORT,
    endpoints: {
      genie: '/api/genie',
      copilot: '/api/copilot',
      sutar: '/api/sutar'
    },
    connectedServices: [
      'Customer Ops (4399)',
      'Memory OS (4703)',
      'Goal OS (4242)',
      'Decision Engine (4240)',
      'Copilot (4765)',
      'Agent Twin (3011)',
      'Buyer Twin (3017)',
      'Area Twin (3019)',
      'Referral Twin (3016)',
      'Deal Twin (3018)',
      'Property Twin (3015)',
      'Event Bus (4510)'
    ]
  });
});

app.use('/api/genie', genieRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/sutar', sutarRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    method: req.method
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

const bridge = initializeBridge({
  customerOpsUrl: process.env.CUSTOMER_OPS_URL || 'http://localhost:4399',
  memoryOsUrl: process.env.MEMORY_OS_URL || 'http://localhost:4703',
  goalOsUrl: process.env.GOAL_OS_URL || 'http://localhost:4242',
  decisionEngineUrl: process.env.DECISION_ENGINE_URL || 'http://localhost:4240',
  copilotUrl: process.env.COPILOT_SERVICE_URL || 'http://localhost:4765',
  apiKey: process.env.SERVICE_API_KEY
});

const twinSync = initializeTwinSync({
  agentTwinUrl: process.env.AGENT_TWIN_URL || 'http://localhost:3011',
  buyerTwinUrl: process.env.BUYER_TWIN_URL || 'http://localhost:3017',
  areaTwinUrl: process.env.AREA_TWIN_URL || 'http://localhost:3019',
  referralTwinUrl: process.env.REFERRAL_TWIN_URL || 'http://localhost:3016',
  dealTwinUrl: process.env.DEAL_TWIN_URL || 'http://localhost:3018',
  propertyTwinUrl: process.env.PROPERTY_TWIN_URL || 'http://localhost:3015',
  eventBusUrl: process.env.EVENT_BUS_URL || 'http://localhost:4510',
  apiKey: process.env.SERVICE_API_KEY
});

app.listen(PORT, () => {
  logger.info(`HOJAI AI Integration Service started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Endpoints:`);
  logger.info(`  - Genie: http://localhost:${PORT}/api/genie`);
  logger.info(`  - Copilot: http://localhost:${PORT}/api/copilot`);
  logger.info(`  - SUTAR: http://localhost:${PORT}/api/sutar`);
  logger.info(`  - Health: http://localhost:${PORT}/health`);
  logger.info(`  - Info: http://localhost:${PORT}/api/info`);
});

export default app;
