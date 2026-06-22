/**
 * Database Configuration
 * MongoDB connection for NeXha services
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha';

let isConnected = false;

export async function connectDatabase(): Promise<void> {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    isConnected = true;
    logger.info([Database] Connected to MongoDB: ${MONGODB_URI}`);
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) {
    return;
  }

  await mongoose.disconnect();
  isConnected = false;
  console.log('[Database] Disconnected from MongoDB');
}

export function getConnectionStatus(): boolean {
  return isConnected;
}

// mongoose.connection.on('connected', () => {
//   isConnected = true;
// });

// mongoose.connection.on('disconnected', () => {
//   isConnected = false;
// });

export default mongoose;
