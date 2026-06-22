/**
 * Smoke test for shared library persistent store.
 * Run: node test/persistent-store.test.js
 */

import { createModel, createPersistentStore, _resetModelRegistry } from '../lib/persistent-store.js';
import fs from 'fs';
import path from 'path';

const DATA_DIR = '/tmp/hojai-smoke-test';
process.env.HOJAI_DATA_DIR = DATA_DIR;
process.env.SERVICE_NAME = 'smoke-test';

// Clean slate
if (fs.existsSync(DATA_DIR)) {
  fs.rmSync(DATA_DIR, { recursive: true });
}
fs.mkdirSync(DATA_DIR, { recursive: true });

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (cond) {
    console.log(`  PASS  ${msg}`);
    passed++;
  } else {
    console.log(`  FAIL  ${msg}`);
    failed++;
  }
}

console.log('============================================');
console.log('  Shared Library - Persistent Store Smoke');
console.log('============================================');

async function run() {
  // Test 1: createModel + create
  const User = createModel('User', { key: 'email' });
  const alice = await User.create({ email: 'alice@example.com', name: 'Alice', role: 'admin' });
  assert(alice.email === 'alice@example.com', 'email preserved (and used as key)');
  assert(alice.createdAt, 'createdAt auto-set');

  // Test 1b: When key field isn't provided, an auto-id should be assigned
  const Auto = createModel('Auto', { key: 'id' });
  const autoObj = await Auto.create({ name: 'thing' });
  assert(autoObj.id && autoObj.id.length > 0, 'created record gets auto-id when key missing');

  // Test 2: findOne by string (key)
  const found = await User.findOne('alice@example.com');
  assert(found && found.name === 'Alice', 'findOne by key works');

  // Test 3: findOne by query
  const adminFound = await User.findOne({ role: 'admin' });
  assert(adminFound && adminFound.email === 'alice@example.com', 'findOne by query works');

  // Test 4: find all
  await User.create({ email: 'bob@example.com', name: 'Bob', role: 'user' });
  const all = await User.find();
  assert(all.length === 2, `find all returns 2 users (got ${all.length})`);

  // Test 5: find with query
  const admins = await User.find({ role: 'admin' });
  assert(admins.length === 1, 'find with query filters correctly');

  // Test 6: updateOne
  const updated = await User.updateOne({ email: 'alice@example.com' }, { name: 'Alice 2' });
  assert(updated.name === 'Alice 2', 'updateOne modifies name');
  assert(updated.updatedAt, 'updatedAt set on update');

  // Test 7: deleteOne
  const deleted = await User.deleteOne({ email: 'bob@example.com' });
  assert(deleted.email === 'bob@example.com', 'deleteOne returns deleted record');
  const afterDelete = await User.find();
  assert(afterDelete.length === 1, 'find returns 1 after delete');

  // Test 8: PERSISTENCE - data survives "restart"
  // (Simulate restart by creating fresh model instance from same store)
  const UserReloaded = createModel('User', { key: 'email' });
  const aliceReloaded = await UserReloaded.findOne('alice@example.com');
  assert(aliceReloaded && aliceReloaded.name === 'Alice 2', 'PERSISTENCE: data survives store reload');

  // Test 9: file actually exists on disk
  const userFile = path.join(DATA_DIR, 'users.json');
  assert(fs.existsSync(userFile), `users.json exists at ${userFile}`);
  const fileContent = JSON.parse(fs.readFileSync(userFile, 'utf8'));
  assert(fileContent.length === 1, 'file contains 1 entry');

  // Test 10: raw PersistentStore
  const sessions = createPersistentStore('sessions', { key: 'token' });
  await sessions.set('abc123', { userId: 'user-1', expires: Date.now() + 3600000 });
  const sessReloaded = createPersistentStore('sessions', { key: 'token' });
  const sess = sessReloaded.get('abc123');
  assert(sess && sess.userId === 'user-1', 'raw PersistentStore persists too');

  // Test 11: findOne with non-existent returns null
  const ghost = await User.findOne('nobody@example.com');
  assert(ghost === null, 'findOne returns null for missing');

  // Test 12: countDocuments
  const count = await User.countDocuments();
  assert(count === 1, 'countDocuments returns 1');

  // Test 13: pagination-like find with query
  await User.create({ email: 'c1@x.com', role: 'user' });
  await User.create({ email: 'c2@x.com', role: 'user' });
  const users = await User.find({ role: 'user' });
  assert(users.length === 2, 'find with role=user returns 2');

  console.log('============================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('============================================');

  // Cleanup
  fs.rmSync(DATA_DIR, { recursive: true });
  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Test crashed:', err);
  process.exit(1);
});
