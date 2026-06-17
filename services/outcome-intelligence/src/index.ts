import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from './utils/logger';

// Routes
import outcomesRoutes from './routes/outcomes';
import analyticsRoutes from './routes/analytics';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/report';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4934;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/outcome-intelligence';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check MongoDB connection
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

    res.json({
      status: 'healthy',
      service: 'outcome-intelligence',
      version: '1.0.0',
      port: PORT,
      mongodb: mongoStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      service: 'outcome-intelligence',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready' });
  }
});

// API Routes
app.use('/api/outcomes', outcomesRoutes);
app.use('/api/outcomes/analytics', analyticsRoutes);
app.use('/api/outcomes/dashboard', dashboardRoutes);
app.use('/api/outcomes/report', reportRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB successfully');

    app.listen(PORT, () => {
      logger.info(`Outcome Intelligence Service started on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API Base: http://localhost:${PORT}/api/outcomes`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
