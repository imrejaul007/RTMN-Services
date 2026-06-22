/**
 * @rez/mongodb - Standardized MongoDB Connection
 *
 * Features:
 * - Connection pooling with configurable pool size
 * - Retry logic with exponential backoff
 * - Health check support
 * - Automatic reconnection
 * - Type-safe configuration
 */

import mongoose, { Connection, Mongoose } from 'mongoose';

// Types
export interface MongoDBConfig {
  uri: string;
  database: string;
  options?: {
    maxPoolSize?: number;
    minPoolSize?: number;
    serverSelectionTimeoutMS?: number;
    socketTimeoutMS?: number;
    retryWrites?: boolean;
    w?: 'majority' | 1 | 0;
    authSource?: string;
    maxIdleTimeMS?: number;
  };
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  connected: boolean;
  readyState: number;
  latency?: number;
  error?: string;
}

// Internal state
let mongooseInstance: Mongoose | null = null;
let connectionTime: Date | null = null;

/**
 * Create MongoDB connection with standardized config
 */
export async function createConnection(config: MongoDBConfig): Promise<Mongoose> {
  const {
    uri,
    options = {},
  } = config;

  // Standard configuration
  const defaultOptions = {
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority' as const,
    ...options,
  };

  // Remove old connection if exists
  if (mongooseInstance) {
    await mongooseInstance.disconnect();
  }

  // Connect with retry logic
  let retries = 3;
  let lastError: Error | null = null;

  while (retries > 0) {
    try {
      mongooseInstance = await mongoose.connect(uri, defaultOptions);
      connectionTime = new Date();

      console.log(`MongoDB connected successfully`);

      // Setup event handlers
      mongooseInstance.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
      });

      mongooseInstance.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });

      mongooseInstance.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return mongooseInstance;
    } catch (error) {
      lastError = error as Error;
      retries--;

      if (retries > 0) {
        const delay = Math.pow(2, 3 - retries) * 1000; // Exponential backoff
        console.warn(`MongoDB connection failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Failed to connect to MongoDB after 3 attempts: ${lastError?.message}`);
}

/**
 * Get existing connection
 */
export function getConnection(): Connection {
  if (!mongooseInstance) {
    throw new Error('MongoDB not connected. Call createConnection first.');
  }
  return mongooseInstance.connection;
}

/**
 * Get mongoose instance
 */
export function getMongoose(): Mongoose {
  if (!mongooseInstance) {
    throw new Error('MongoDB not connected. Call createConnection first.');
  }
  return mongooseInstance;
}

/**
 * Close connection gracefully
 */
export async function closeConnection(): Promise<void> {
  if (mongooseInstance) {
    await mongooseInstance.disconnect();
    mongooseInstance = null;
    connectionTime = null;
    console.log('MongoDB connection closed');
  }
}

/**
 * Health check for MongoDB
 */
export async function healthCheck(): Promise<HealthStatus> {
  const startTime = Date.now();

  try {
    if (!mongooseInstance) {
      return {
        status: 'unhealthy',
        connected: false,
        readyState: 0,
        error: 'Not connected',
      };
    }

    // Ping the database
    await mongooseInstance.connection.db!.admin().ping();

    const latency = Date.now() - startTime;

    return {
      status: 'healthy',
      connected: true,
      readyState: mongooseInstance.connection.readyState,
      latency,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connected: false,
      readyState: mongooseInstance?.connection.readyState ?? 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Get connection statistics
 */
export function getStats(): {
  readyState: number;
  host: string | null;
  name: string | null;
  uptime: number | null;
} {
  if (!mongooseInstance?.connection) {
    return {
      readyState: 0,
      host: null,
      name: null,
      uptime: null,
    };
  }

  const conn = mongooseInstance.connection;
  const uptime = connectionTime ? Date.now() - connectionTime.getTime() : null;

  return {
    readyState: conn.readyState,
    host: conn.host,
    name: conn.name,
    uptime,
  };
}

// Ready state enum for reference
export const ReadyState = {
  DISCONNECTED: 0,
  CONNECTED: 1,
  CONNECTING: 2,
  DISCONNECTING: 3,
} as const;
