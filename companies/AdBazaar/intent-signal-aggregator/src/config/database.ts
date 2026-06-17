/**
 * Database Configuration
 *
 * MongoDB connection setup for Intent Signal Aggregator.
 */

import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from './logger.js';

// ============================================================================
// CONNECTION STATE
// ============================================================================

let connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

// ============================================================================
// CONNECT
// ============================================================================

export async function connectDatabase(): Promise<void> {
  if (connectionStatus === 'connected') {
    logger.info('MongoDB already connected');
    return;
  }

  connectionStatus = 'connecting';
  logger.info('Connecting to MongoDB...', { uri: config.mongodb.uri });

  try {
    await mongoose.connect(config.mongodb.uri, config.mongodb.options as mongoose.ConnectOptions);
    connectionStatus = 'connected';
    logger.info('MongoDB connected successfully');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
      connectionStatus = 'disconnected';
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
      connectionStatus = 'disconnected';
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
      connectionStatus = 'connected';
    });

  } catch (error) {
    connectionStatus = 'disconnected';
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
}

// ============================================================================
// DISCONNECT
// ============================================================================

export async function disconnectDatabase(): Promise<void> {
  if (connectionStatus === 'disconnected') {
    return;
  }

  try {
    await mongoose.connection.close();
    connectionStatus = 'disconnected';
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB', { error });
    throw error;
  }
}

// ============================================================================
// STATUS
// ============================================================================

export function getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
  return connectionStatus;
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
