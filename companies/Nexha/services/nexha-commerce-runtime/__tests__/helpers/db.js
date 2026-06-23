/**
 * Test DB helper — spins up an in-memory MongoDB for the test suite.
 * Same pattern as mission-planner / partner-graph.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let _memServer = null;

export async function connectTestDb() {
  if (_memServer) return _memServer.getUri();
  _memServer = await MongoMemoryServer.create();
  const uri = _memServer.getUri();
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(uri);
  }
  // Force index build before any test runs so unique constraints are
  // enforced immediately (mongoose builds indexes async by default).
  await syncAllIndexes();
  return uri;
}

async function syncAllIndexes() {
  // Import models lazily so they don't connect before the test DB is ready
  const { Order } = await import('../../src/models/Order.js');
  const { Payment } = await import('../../src/models/Payment.js');
  const { Return } = await import('../../src/models/Return.js');
  await Promise.all([
    Order.syncIndexes(),
    Payment.syncIndexes(),
    Return.syncIndexes(),
  ]);
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  if (_memServer) {
    await _memServer.stop();
    _memServer = null;
  }
}

export async function clearTestDb() {
  if (mongoose.connection.readyState === 1) {
    const collections = await mongoose.connection.db.collections();
    for (const c of collections) {
      await c.deleteMany({});
    }
  }
}