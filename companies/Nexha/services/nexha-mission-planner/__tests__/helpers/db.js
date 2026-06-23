/**
 * Test helper — spins up mongodb-memory-server and gives a fresh mongoose
 * connection per test file. Mirrors the pattern used in nexha-acp-messaging
 * and marketplace-listings.
 *
 * Also explicitly ensures all defined indexes are built (the auto-build in
 * Mongoose 8 sometimes races with the first query, so we force a sync build).
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
  // Force-sync all model indexes (compound, partial, etc.) so they exist
  // before the first query.
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