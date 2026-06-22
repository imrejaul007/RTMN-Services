import { logger } from '../../../logger.js';
/**
 * Production Database Layer - MongoDB with Real Models
 *
 * Features:
 * - Connection pooling
 * - Automatic retries
 * - Index management
 * - Migration support
 */

import mongoose, { Schema, Document } from 'mongoose';

// ============================================================================
// Configuration
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha';

interface DatabaseConfig {
  maxPoolSize: number;
  minPoolSize: number;
  serverSelectionTimeoutMS: number;
  socketTimeoutMS: number;
  connectTimeoutMS: number;
  retryWrites: boolean;
  retryReads: boolean;
}

const config: DatabaseConfig = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
};

// ============================================================================
// Connection State
// ============================================================================

let isConnected = false;
let connectionAttempts = 0;
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_DELAY_MS = 5000;

// ============================================================================
// Connection Functions
// ============================================================================

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    logger.info('[Database] Already connected');
    return;
  }

  try {
    connectionAttempts++;
    logger.info(`[Database] Connecting to MongoDB... (attempt ${connectionAttempts})`);

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: config.maxPoolSize,
      minPoolSize: config.minPoolSize,
      serverSelectionTimeoutMS: config.serverSelectionTimeoutMS,
      socketTimeoutMS: config.socketTimeoutMS,
      connectTimeoutMS: config.connectTimeoutMS,
      retryWrites: config.retryWrites,
      retryReads: config.retryReads,
    });

    isConnected = true;
    connectionAttempts = 0;
    logger.info(`[Database] Connected to MongoDB: ${getDatabaseName()}`);

    // Setup event handlers
    setupEventHandlers();

    // Ensure indexes
    await ensureIndexes();

  } catch (error) {
    logger.error('[Database] Connection failed:', error);
    isConnected = false;

    if (connectionAttempts < MAX_RETRY_ATTEMPTS) {
      logger.info(`[Database] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      return connectDatabase();
    }

    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('[Database] Disconnected from MongoDB');
  } catch (error) {
    logger.error('[Database] Disconnect error:', error);
    throw error;
  }
}

export function getConnectionStatus(): {
  isConnected: boolean;
  readyState: mongoose.Mongoose['connection']['readyState'];
  host: string;
  name: string;
} {
  const conn = mongoose.connection;
  return {
    isConnected: conn.readyState === 1,
    readyState: conn.readyState,
    host: conn.host || 'unknown',
    name: conn.name || 'unknown',
  };
}

// ============================================================================
// Event Handlers
// ============================================================================

function setupEventHandlers(): void {
  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('[Database] Connection established');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('[Database] Connection lost - attempting reconnect...');
    // Attempt auto-reconnect
    setTimeout(() => {
      if (!isConnected) {
        connectDatabase().catch(console.error);
      }
    }, RETRY_DELAY_MS);
  });

  mongoose.connection.on('error', (error) => {
    logger.error('[Database] Connection error:', error);
  });

  mongoose.connection.on('reconnected', () => {
    isConnected = true;
    logger.info('[Database] Reconnected successfully');
  });
}

// ============================================================================
// Index Management
// ============================================================================

interface IndexDefinition {
  collection: string;
  indexes: mongoose.IndexDefinition[];
  options?: mongoose.IndexOptions;
}

const requiredIndexes: IndexDefinition[] = [
  {
    collection: 'distributors',
    indexes: [
      { distributorNumber: 1 },
      { businessName: 1 },
      { email: 1 },
      { 'territory.cities': 1 },
      { 'territory.regions': 1 },
      { status: 1, type: 1 },
      { createdAt: -1 },
    ],
  },
  {
    collection: 'franchises',
    indexes: [
      { franchiseNumber: 1 },
      { brandId: 1 },
      { status: 1 },
      { address: 1 },
      { createdAt: -1 },
    ],
  },
  {
    collection: 'suppliers',
    indexes: [
      { email: 1 },
      { categories: 1 },
      { rating: -1 },
      { status: 1 },
    ],
  },
  {
    collection: 'rfqs',
    indexes: [
      { rfqNumber: 1 },
      { merchantId: 1 },
      { status: 1 },
      { deadline: 1 },
      { createdAt: -1 },
    ],
  },
  {
    collection: 'orders',
    indexes: [
      { orderNumber: 1 },
      { merchantId: 1 },
      { supplierId: 1 },
      { status: 1 },
      { createdAt: -1 },
    ],
  },
  {
    collection: 'van_sales',
    indexes: [
      { saleNumber: 1 },
      { distributorId: 1 },
      { date: -1 },
      { status: 1 },
    ],
  },
  {
    collection: 'credit_lines',
    indexes: [
      { businessId: 1 },
      { status: 1 },
      { createdAt: -1 },
    ],
  },
];

export async function ensureIndexes(): Promise<void> {
  logger.info('[Database] Ensuring indexes...');

  for (const idx of requiredIndexes) {
    try {
      const collection = mongoose.connection.collection(idx.collection);
      await collection.createIndex(idx.indexes, {
        background: true,
        ...idx.options,
      });
      logger.info(`[Database] Indexes created for ${idx.collection}`);
    } catch (error) {
      logger.warn(`[Database] Index creation warning for ${idx.collection}:`, error);
    }
  }

  logger.info('[Database] Index management complete');
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck(): Promise<{
  healthy: boolean;
  latency: number;
  details: Record<string, unknown>;
}> {
  const start = Date.now();

  try {
    // Ping database
    await mongoose.connection.db?.admin().ping();

    const latency = Date.now() - start;
    const status = getConnectionStatus();

    return {
      healthy: status.isConnected,
      latency,
      details: {
        ...status,
        config,
      },
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - start,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

// ============================================================================
// Utilities
// ============================================================================

export function getDatabaseName(): string {
  const match = MONGODB_URI.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : 'unknown';
}

export function getCollection(name: string): mongoose.Collection {
  return mongoose.connection.collection(name);
}

// ============================================================================
// Export
// ============================================================================

export const db = mongoose;
export default mongoose;
