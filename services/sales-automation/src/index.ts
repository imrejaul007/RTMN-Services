import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';

// Routes
import followupRoutes from './routes/followup';
import routingRoutes from './routes/routing';
import escalationRoutes from './routes/escalation';
import workflowRoutes from './routes/workflows';

// Services
import { FollowUpEngine } from './services/followupEngine';
import { RoutingEngine } from './services/routingEngine';
import { EscalationEngine } from './services/escalationEngine';
import { TriggerEngine } from './services/triggerEngine';
import { store } from './models/Automation';

// Load environment
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5183;

// Logger
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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Initialize engines
const followUpEngine = new FollowUpEngine();
const routingEngine = new RoutingEngine();
const escalationEngine = new EscalationEngine();
const triggerEngine = new TriggerEngine();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'sales-automation',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json(store.getStats());
});

// API Routes
app.use('/api/followups', followupRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/escalations', escalationRoutes);
app.use('/api/workflows', workflowRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Sales Automation Service running on port ${PORT}`);

  // Start background engines
  followUpEngine.start();
  escalationEngine.start();
  triggerEngine.start();

  logger.info('Automation engines started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  followUpEngine.stop();
  escalationEngine.stop();
  triggerEngine.stop();
  process.exit(0);
});

export { app, logger };
