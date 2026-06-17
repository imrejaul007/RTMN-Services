import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import resolutionRoutes from './routes/resolutions';
import slaRoutes from './routes/sla';
import { ResolverService } from './services/resolver';
import { SLATracker } from './services/slaTracker';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'resolution-engine.log' })
  ]
});

const app = express();
const PORT = process.env.PORT || 4981;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Services
const resolverService = new ResolverService(logger);
const slaTracker = new SLATracker(logger);

// Make services available to routes
app.set('resolverService', resolverService);
app.set('slaTracker', slaTracker);
app.set('logger', logger);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'resolution-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/resolutions', resolutionRoutes);
app.use('/api/sla', slaRoutes);

// SLA monitoring interval
setInterval(() => {
  slaTracker.checkAndEscalate();
}, 60000); // Check every minute

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  logger.info(`Resolution Engine started on port ${PORT}`);
});

export { app, resolverService, slaTracker };
