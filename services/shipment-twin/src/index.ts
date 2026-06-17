import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import routes from './routes';
import { authenticate } from './middleware';
import { errorHandler, notFoundHandler } from './middleware';
import logger from './utils/logger';
import { Carrier } from './models';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4903;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    query: req.query
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    service: 'shipment-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    dependencies: {
      mongodb: mongoStatus
    }
  });
});

app.get('/healthz', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// API routes
app.use('/api', authenticate, routes);

// API Documentation
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Shipment Twin',
    version: '1.0.0',
    description: 'Shipment tracking, logistics, and carrier integration service',
    endpoints: {
      shipments: {
        'POST /api/shipments': 'Create a new shipment',
        'GET /api/shipments': 'List shipments',
        'GET /api/shipments/stats': 'Get shipment statistics',
        'GET /api/shipments/active': 'Get active shipments',
        'GET /api/shipments/:shipmentId': 'Get shipment by ID',
        'PATCH /api/shipments/:shipmentId': 'Update shipment',
        'POST /api/shipments/:shipmentId/cancel': 'Cancel shipment',
        'POST /api/shipments/:shipmentId/proof': 'Add proof of delivery',
        'GET /api/shipments/track/:trackingNumber': 'Track by tracking number'
      },
      carriers: {
        'GET /api/carriers': 'List all carriers',
        'GET /api/carriers/active': 'List active carriers',
        'POST /api/carriers': 'Create a carrier',
        'GET /api/carriers/:code': 'Get carrier by code',
        'PATCH /api/carriers/:code': 'Update carrier',
        'DELETE /api/carriers/:code': 'Deactivate carrier',
        'POST /api/carriers/seed': 'Seed default carriers'
      },
      tracking: {
        'GET /api/tracking/:shipmentId': 'Get tracking timeline',
        'GET /api/tracking/:shipmentId/location': 'Get current location',
        'POST /api/tracking/:shipmentId/events': 'Create tracking event',
        'POST /api/tracking/bulk': 'Bulk update tracking',
        'GET /api/tracking/generate/:carrierCode': 'Generate tracking number'
      }
    }
  });
});

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/shipment-twin';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    // Seed default carriers
    await Carrier.seedDefaults();
    logger.info('Default carriers initialized');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    // Don't exit in production - let the service retry
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
};

// Start server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Shipment Twin service running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API docs: http://localhost:${PORT}/api`);
  });
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
