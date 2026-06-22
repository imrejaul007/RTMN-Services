import { logger } from '../../shared/logger';
/**
 * Database Configuration - ProcurementOS (Production Ready)
 * MongoDB connection with retry logic, health checks, and graceful shutdown
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha_procurement';

// Connection options
const mongooseOptions = {
  maxPoolSize: parseInt(process.env.MONGODB_POOL_SIZE || '10', 10),
  minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE || '2', 10),
  serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '5000', 10),
  socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT || '45000', 10),
  maxIdleTimeMS: parseInt(process.env.MONGODB_MAX_IDLE_TIME || '30000', 10),
  retryWrites: true,
  retryReads: true,
};

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('[Database] Already connected to MongoDB');
    return;
  }

  const retryConnection = async (): Promise<void> => {
    connectionAttempts++;

    try {
      logger.info(`[Database] Connecting to MongoDB (attempt ${connectionAttempts}/${MAX_RETRY_ATTEMPTS})...`);

      await mongoose.connect(MONGODB_URI, mongooseOptions);

      isConnected = true;
      connectionAttempts = 0;
      logger.info(`[Database] Connected to MongoDB: nexha_procurement`);

      mongoose.connection.on('error', (err) => {
        logger.error('[Database] MongoDB error:', err);
        isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('[Database] MongoDB disconnected');
        isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('[Database] MongoDB reconnected');
        isConnected = true;
      });

    } catch (error) {
      logger.error(`[Database] Connection attempt ${connectionAttempts} failed:`, error);

      if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
        logger.info(`[Database] Retrying in ${RETRY_DELAY_MS / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return retryConnection();
      }

      logger.error('[Database] Max retry attempts reached.');
      throw error;
    }
  };

  await retryConnection();
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('[Database] Disconnected from MongoDB gracefully');
}

export function getConnectionStatus(): { connected: boolean; readyState: string } {
  return {
    connected: isConnected,
    readyState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  };
}

export async function healthCheck(): Promise<{ healthy: boolean; latency: number }> {
  const start = Date.now();
  try {
    if (!isConnected || mongoose.connection.readyState !== 1) {
      return { healthy: false, latency: Date.now() - start };
    }
    await mongoose.connection.db?.admin().ping();
    return { healthy: true, latency: Date.now() - start };
  } catch {
    return { healthy: false, latency: Date.now() - start };
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Database] SIGTERM received. Shutting down...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('[Database] SIGINT received. Shutting down...');
  await disconnectDatabase();
  process.exit(0);
});
