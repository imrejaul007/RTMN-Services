import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import compression from 'compression';

import { logger } from './utils/logger';
import { messageBroker } from './utils/message-broker';
import { corsMiddleware } from './middleware/cors';
import { rateLimiter } from './middleware/rate-limiter';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import inventorytwinserviceRoutes from './routes/inventorytwin.routes';

const app = express();
const PORT = parseInt(process.env.SERVICE_PORT || '4016');

// Security middleware
app.use(helmet());
app.use(compression());

// CORS
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use(rateLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  res.json({
    status: 'healthy',
    service: process.env.SERVICE_NAME || 'inventory-twin-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    rabbitmq: messageBroker.isConnected() ? 'connected' : 'disconnected'
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  const isDbReady = mongoose.connection.readyState === 1;
  const isMqReady = messageBroker.isConnected();

  if (isDbReady && isMqReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({
      status: 'not ready',
      mongodb: isDbReady ? 'connected' : 'disconnected',
      rabbitmq: isMqReady ? 'connected' : 'disconnected'
    });
  }
});

// API routes
app.use('/api/twins/inventory/twin/service', inventorytwinserviceRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/inventory_twin_service';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB', { uri: mongoUri });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error: (error as Error).message });
    throw error;
  }
}

// Message broker connection
async function connectMessageBroker(): Promise<void> {
  try {
    await messageBroker.connect();
  } catch (error) {
    logger.warn('Failed to connect to RabbitMQ, will retry in background', {
      error: (error as Error).message
    });
  }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  try {
    await messageBroker.close();
    await mongoose.connection.close();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error: (error as Error).message });
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start(): Promise<void> {
  try {
    await connectDatabase();
    await connectMessageBroker();

    app.listen(PORT, () => {
      logger.info(`Inventory Twin Service started`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
}

start();

export { app };
