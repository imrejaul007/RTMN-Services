import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import { approvalRouter } from './routes/approvals';
import { rulesRouter } from './routes/rules';
import { RuleEngine } from './services/ruleEngine';
import { AuditService } from './services/audit';

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

const app: Express = express();
const PORT = process.env.PORT || 4982;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({
    requestId: uuidv4(),
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'auto-approve-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/approvals', approvalRouter);
app.use('/api/rules', rulesRouter);

// Initialize services
const ruleEngine = new RuleEngine();
const auditService = new AuditService();

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack
  });

  auditService.log({
    action: 'ERROR',
    details: { error: err.message },
    timestamp: new Date()
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Auto-Approve Engine running on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);

  // Initialize default rules if none exist
  ruleEngine.initializeDefaultRules();
});

// Export for testing
export { app, ruleEngine, auditService, logger };
