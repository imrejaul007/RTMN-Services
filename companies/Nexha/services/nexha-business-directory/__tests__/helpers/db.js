/**
 * Test helper — connect mongoose to an in-memory MongoDB.
 * Returns the server instance so tests can stop it cleanly.
 *
 * Uses mongodb-memory-server so no real MongoDB is required.
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let server = null;

export async function connectTestDb() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  server = await MongoMemoryServer.create();
  const uri = server.getUri();
  await mongoose.connect(uri);
  return mongoose.connection;
}

export async function disconnectTestDb() {
  await mongoose.disconnect();
  if (server) {
    await server.stop();
    server = null;
  }
}

export async function clearTestDb() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}
