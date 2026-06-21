import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectDatabase(): Promise<void> {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/nexha_commerce_identity';

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    logger.info(`MongoDB connected: ${uri.replace(/\/\/.*@/, '//***@')}`);
  } catch (error) {
    logger.error('MongoDB connection failed', { error: (error as Error).message });
    throw error;
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', { error: err.message });
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected gracefully');
}
