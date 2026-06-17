import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './logger';

// Routes
import workflowsRouter from './routes/workflows';
import categoriesRouter from './routes/categories';
import installRouter from './routes/install';
import reviewsRouter from './routes/reviews';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4938;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const healthcheck = {
    status: 'healthy',
    service: 'workflow-marketplace',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
  res.json(healthcheck);
});

// API routes
app.use('/api/marketplace/workflows', workflowsRouter);
app.use('/api/marketplace', categoriesRouter);
app.use('/api/marketplace', installRouter);
app.use('/api/marketplace', reviewsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Workflow Marketplace',
    version: '1.0.0',
    description: 'One-click installable industry workflows',
    endpoints: {
      health: '/health',
      workflows: '/api/marketplace/workflows',
      categories: '/api/marketplace/categories',
      industries: '/api/marketplace/categories/industries',
      install: '/api/marketplace/:workflowId/install',
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use(
  (
    err: Error,
    req: Request,
    res: Response,
    _next: express.NextFunction
  ) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
);

// Connect to MongoDB and start server
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/workflow-marketplace';

const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`Workflow Marketplace running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API: http://localhost:${PORT}/api/marketplace`);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

startServer();

export default app;
