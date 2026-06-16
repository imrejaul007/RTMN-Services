/**
 * MongoDB Connection
 * Exhibition OS Database Configuration
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/exhibition_os';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log(`✅ MongoDB connected: ${MONGODB_URI}`);
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
}

// Connection events
mongoose.connection.on('connected', () => {
  console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

export default mongoose;
