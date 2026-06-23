import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const STATE_KEY = '__NEXHA_HOOKS_SDK_TEST_STATE__';

export async function setupTestDb() {
  if (!globalThis[STATE_KEY]) {
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    globalThis[STATE_KEY] = { mongod, uri };
  }
  const state = globalThis[STATE_KEY];
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(state.uri);
  }
  return { uri: state.uri };
}

export async function teardownTestDb() {
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  const state = globalThis[STATE_KEY];
  if (state && state.mongod) {
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
  const { HookSubscription } = await import('../../src/models/HookSubscription.js');
  const { HookDelivery } = await import('../../src/models/HookDelivery.js');
  await HookSubscription.syncIndexes();
  await HookDelivery.syncIndexes();
}
