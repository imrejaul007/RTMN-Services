/**
 * Database Configuration
 */
import mongoose from 'mongoose';
import { getRedis } from './redis.js';
import { logger } from '../utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/rez-ads';

// Intelligence Service URLs
export const INTELLIGENCE_SERVICES = {
  HOJAI_GATEWAY_URL: process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560',
  AUDIENCE_INTELLIGENCE_URL: process.env.AUDIENCE_INTELLIGENCE_URL || 'http://localhost:4805',
  INTENT_AGGREGATOR_URL: process.env.INTENT_AGGREGATOR_URL || 'http://localhost:4800',
  INTENT_PREDICTION_URL: process.env.INTENT_PREDICTION_URL || 'http://localhost:4801',
  CDP_URL: process.env.CDP_URL || 'http://localhost:4901',
  INTEGRATION_SERVICE_URL: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:4910',
};

let connected = false;

export async function connectDB(): Promise<void> {
  if (connected) return;

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    connected = true;
    logger.info('[DB] MongoDB connected');
  } catch (error) {
    logger.error('[DB] MongoDB connection error', { error });
    throw error;
  }

  mongoose.connection.on('error', (err) => {
    logger.error('[DB] MongoDB error', { error: err.message });
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('[DB] MongoDB disconnected');
    connected = false;
  });
}

export async function disconnectDB(): Promise<void> {
  if (connected) {
    await mongoose.disconnect();
    connected = false;
    logger.info('[DB] MongoDB disconnected');
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function validateEnv(): void {
  const required = ['MONGODB_URI'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Redis should be initialized
  const redis = getRedis();
  if (redis.status !== 'ready') {
    logger.warn('[DB] Redis not ready, will use fallback');
  }
}
