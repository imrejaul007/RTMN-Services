/**
 * Database Configuration
 */
import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let connected = false;

export async function connectDatabase(): Promise<void> {
  if (connected) return;

  try {
    await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });
    connected = true;
    logger.info('MongoDB connected');

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB error', { error: err.message });
      connected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      connected = false;
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (connected) {
    await mongoose.connection.close();
    connected = false;
    logger.info('MongoDB disconnected');
  }
}

export function isConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
