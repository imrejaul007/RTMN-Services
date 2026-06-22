// ============================================================================
// HOJAI VOICE PLATFORM - Models Index
// ============================================================================

export { VoiceAgentModel, VoiceAgentDocument } from './VoiceAgent';
export { CallModel, CallDocument } from './Call';
export { SessionModel, SessionDocument } from './Session';
export { TranscriptModel, TranscriptDocument } from './Transcript';
export {
  AnalyticsModel,
  AnalyticsDocument,
  LiveAnalyticsModel,
  LiveAnalyticsDocument,
} from './Analytics';

// Database connection utilities
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-voice';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`MongoDB connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Session cleanup job
import { SessionModel } from './Session';
import { VoiceAgentModel } from './VoiceAgent';
import { CallModel } from './Call';
import { TranscriptModel } from './Transcript';
import { AnalyticsModel, LiveAnalyticsModel } from './Analytics';

export async function cleanupExpiredSessions(maxIdleTimeMs: number = 300000): Promise<number> {
  try {
    const cutoffTime = new Date(Date.now() - maxIdleTimeMs);

    const result = await SessionModel.updateMany(
      {
        status: 'active',
        lastActivityTime: { $lt: cutoffTime },
      },
      {
        $set: {
          status: 'expired',
          endTime: new Date(),
        },
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`Expired ${result.modifiedCount} inactive sessions`);
    }

    return result.modifiedCount;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}

// Initialize database indexes
export async function initializeIndexes(): Promise<void> {
  try {
    await VoiceAgentModel.createIndexes();
    await CallModel.createIndexes();
    await SessionModel.createIndexes();
    await TranscriptModel.createIndexes();
    await AnalyticsModel.createIndexes();
    await LiveAnalyticsModel.createIndexes();

    console.log('Database indexes initialized');
  } catch (error) {
    console.error('Error initializing database indexes:', error);
    throw error;
  }
}
