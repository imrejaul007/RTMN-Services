/**
 * Test helper — spins up mongodb-memory-server and gives a fresh mongoose
 * connection per test file. Mirrors the pattern used in nexha-mission-planner
 * and marketplace-listings.
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer = null;

export async function connectTestDb() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  if (mongoose.connection?.readyState === 1) {
    return mongoose.connection;
  }
  await mongoose.connect(mongoServer.getUri());
  for (const name of mongoose.modelNames()) {
    try {
      await mongoose.model(name).syncIndexes();
    } catch {
      // Ignore — individual models may not have text indexes.
    }
  }
  return mongoose.connection;
}

export async function disconnectTestDb() {
  if (mongoose.connection?.readyState === 1) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

export async function clearTestDb() {
  if (mongoose.connection?.readyState !== 1) return;
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}