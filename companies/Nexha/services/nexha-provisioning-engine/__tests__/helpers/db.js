/**
 * Test helpers — in-memory MongoDB shared across test files.
 * globalThis[STATE_KEY] is set once per process to allow cross-file sharing.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const STATE_KEY = '__NEXHA_PROVISIONING_ENGINE_TEST_STATE__';

export async function setupTestDb() {
  if (!globalThis[STATE_KEY]) {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    globalThis[STATE_KEY] = { mongod, uri, mongooseConn: null };
  }
  const state = globalThis[STATE_KEY];
  if (!state.mongooseConn) {
    await mongoose.connect(state.uri);
    state.mongooseConn = mongoose.connection;
  }
  return { uri: state.uri, conn: state.mongooseConn };
}

export async function teardownTestDb() {
  const state = globalThis[STATE_KEY];
  if (state && state.mongod) {
    await mongoose.disconnect();
    await state.mongod.stop();
    delete globalThis[STATE_KEY];
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

export async function syncIndexes() {
  const { ProvisioningPlan } = await import('../../src/models/ProvisioningPlan.js');
  const { PlanEvent } = await import('../../src/models/PlanEvent.js');
  await ProvisioningPlan.syncIndexes();
  await PlanEvent.syncIndexes();
}
