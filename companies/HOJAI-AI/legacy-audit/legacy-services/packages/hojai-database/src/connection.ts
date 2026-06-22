/**
 * HOJAI Database Connection
 * MongoDB connection management with tenant isolation
 */

import mongoose, { Connection, Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai';
const CONNECTION_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

let connection: Mongoose | null = null;
let isConnectedFlag = false;

/**
 * Create MongoDB connection
 */
export async function createConnection(uri?: string): Promise<Mongoose> {
  if (connection && isConnectedFlag) {
    return connection;
  }

  const connectionUri = uri || MONGODB_URI;

  try {
    console.log(`[HOJAI Database] Connecting to MongoDB at ${connectionUri}...`);

    connection = await mongoose.connect(connectionUri, {
      ...CONNECTION_OPTIONS,
    });

    isConnectedFlag = true;

    mongoose.connection.on('error', (err) => {
      console.error('[HOJAI Database] MongoDB connection error:', err);
      isConnectedFlag = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[HOJAI Database] MongoDB disconnected');
      isConnectedFlag = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[HOJAI Database] MongoDB reconnected');
      isConnectedFlag = true;
    });

    console.log('[HOJAI Database] Connected to MongoDB successfully');
    return connection;
  } catch (error) {
    console.error('[HOJAI Database] Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Get existing connection
 */
export function getConnection(): Mongoose | null {
  return connection;
}

/**
 * Check if connected
 */
export function isConnected(): boolean {
  return isConnectedFlag && mongoose.connection.readyState === 1;
}

/**
 * Close connection
 */
export async function closeConnection(): Promise<void> {
  if (connection) {
    await connection.disconnect();
    connection = null;
    isConnectedFlag = false;
    console.log('[HOJAI Database] Connection closed');
  }
}

/**
 * Get tenant-specific database
 */
export function getTenantDb(tenantId: string): Connection {
  const dbName = `hojai_${tenantId}`;
  return mongoose.connection.useDb(dbName);
}
