import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import flagsRouter from './routes/flags';
import evaluateRouter from './routes/evaluate';
import analyticsRouter from './routes/analytics';

// Logger configuration
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

// In-memory storage (replace with database in production)
export const flags = new Map<string, Flag>();
export const evaluationLogs: EvaluationLog[] = [];

// Types
export interface TargetingRule {
  id: string;
  attribute: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'nin' | 'contains' | 'regex';
  value: string | number | string[] | number[];
}

export interface Flag {
  id: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean | string | number | object;
  variantType: 'boolean' | 'string' | 'number' | 'json';
  variants?: Record<string, boolean | string | number | object>;
  targetingRules: TargetingRule[];
  rollouts: {
    percentage: number;
    startDate?: string;
    endDate?: string;
  };
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  environment: 'development' | 'staging' | 'production';
}

export interface EvaluationContext {
  userId?: string;
  anonymousId?: string;
  attributes: Record<string, string | number | boolean | string[]>;
  environment: 'development' | 'staging' | 'production';
}

export interface EvaluationLog {
  id: string;
  flagKey: string;
  flagId: string;
  context: EvaluationContext;
  result: boolean | string | number | object;
  reason: string;
  evaluatedAt: string;
  environment: string;
}

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'feature-flags',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    flagsCount: flags.size,
    uptime: process.uptime()
  });
});

// Routes
app.use('/api/flags', flagsRouter);
app.use('/api/evaluate', evaluateRouter);
app.use('/api/analytics', analyticsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '4990', 10);

app.listen(PORT, () => {
  logger.info(`Feature Flags Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API: http://localhost:${PORT}/api/flags`);

  // Register with service registry if available
  registerWithServiceRegistry();
});

// Service registry registration
async function registerWithServiceRegistry() {
  const registryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399';

  try {
    const response = await fetch(`${registryUrl}/api/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'feature-flags',
        port: PORT,
        url: `http://localhost:${PORT}`,
        healthCheck: `http://localhost:${PORT}/health`,
        capabilities: ['feature-flags', 'gradual-rollouts', 'targeting'],
        tags: ['feature-management', 'a-b-testing']
      })
    });

    if (response.ok) {
      logger.info('Registered with service registry');
    }
  } catch (error) {
    logger.warn('Service registry not available, running standalone');
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
