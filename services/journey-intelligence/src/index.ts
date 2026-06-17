/**
 * Journey Intelligence Service
 * Main entry point
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Import routes
import journeyRoutes from './routes/journey';
import touchpointRoutes from './routes/touchpoints';
import funnelRoutes from './routes/funnel';
import insightsRoutes from './routes/insights';

// Import models (for connection)
import './models/Journey';
import './models/Touchpoint';
import './models/Funnel';

const app: Express = express();
const PORT = process.env.PORT || 4954;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/journey_intelligence';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'journey-intelligence',
    version: '1.0.0',
    timestamp: new Date(),
    uptime: process.uptime(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/journeys', journeyRoutes);
app.use('/api/touchpoints', touchpointRoutes);
app.use('/api/funnels', funnelRoutes);
app.use('/api/insights', insightsRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Journey Intelligence Service',
    version: '1.0.0',
    description: 'Track and analyze the full customer journey from first touch to conversion',
    endpoints: {
      health: '/health',
      journeys: '/api/journeys',
      touchpoints: '/api/touchpoints',
      funnels: '/api/funnels',
      insights: '/api/insights'
    },
    documentation: {
      stages: ['awareness', 'consideration', 'acquisition', 'activation', 'retention', 'referral'],
      touchpointTypes: ['ad', 'website', 'signup', 'purchase', 'delivery', 'support', 'review', 'repeat', 'referral', 'email', 'social', 'search', 'app', 'call', 'chat']
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    timestamp: new Date()
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date()
  });
});

// Database connection
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Continue running even if DB is not connected (for development)
    logger.warn('Service will start without database connection');
  }
}

// Start server
async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(PORT, () => {
    logger.info(`Journey Intelligence Service started on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API Documentation: http://localhost:${PORT}/`);
  });
}

// Handle graceful shutdown
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
