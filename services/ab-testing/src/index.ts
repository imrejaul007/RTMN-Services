import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';

import experimentsRouter from './routes/experiments';
import assignRouter from './routes/assign';
import resultsRouter from './routes/results';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4989;

// Configure logger
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
      ),
    }),
  ],
});

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ab-testing',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'A/B Testing Service',
    version: '1.0.0',
    description: 'A/B testing and experiment framework for RTMN ecosystem',
    endpoints: {
      experiments: {
        'POST /api/experiments': 'Create new experiment',
        'GET /api/experiments': 'List all experiments',
        'GET /api/experiments/:id': 'Get experiment by ID',
        'PATCH /api/experiments/:id': 'Update experiment',
        'POST /api/experiments/:id/start': 'Start experiment',
        'POST /api/experiments/:id/pause': 'Pause experiment',
        'POST /api/experiments/:id/complete': 'Complete experiment',
        'POST /api/experiments/:id/archive': 'Archive experiment',
        'DELETE /api/experiments/:id': 'Delete experiment',
      },
      assign: {
        'POST /api/assign/variant': 'Get variant assignment for user',
        'POST /api/assign/conversion': 'Record conversion event',
        'POST /api/assign/event': 'Record custom event',
      },
      results: {
        'GET /api/results/experiment/:id': 'Get experiment results',
        'GET /api/results/experiment/:id/timeseries': 'Get time series data',
        'GET /api/results/variant/:id': 'Get variant details',
        'GET /api/results/leaderboard': 'Get best performing experiments',
      },
    },
  });
});

// Mount routers
app.use('/api/experiments', experimentsRouter);
app.use('/api/assign', assignRouter);
app.use('/api/results', resultsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`A/B Testing Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api`);
});

export { app, logger };
