/**
 * Smoke test for PersistentMap
 * Run with: node shared/lib/persistent-map.test.js
 */

import { PersistentMap } from './persistent-map.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Use a unique temp dir for the test
const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'persistent-map-test-'));
process.env.HOJAI_DATA_DIR = testDir;
process.env.SERVICE_NAME = 'test-service';

let passed = 0, failed = 0;
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.log(`  ❌ ${msg}`); }
}

console.log('--- Test 1: Basic Map API ---');
const m = new PersistentMap('test1', { serviceName: 'test-service', flushIntervalMs: 100 });
m.set('a', 1);
m.set('b', 2);
assert(m.get('a') === 1, 'get returns set value');
assert(m.get('b') === 2, 'get returns second value');
assert(m.has('a'), 'has returns true');
assert(!m.has('c'), 'has returns false for missing');
assert(m.size === 2, 'size is correct');
m.set('a', 10);
assert(m.get('a') === 10, 'set overwrites');
m.delete('a');
assert(!m.has('a'), 'delete removes');
assert(m.size === 1, 'size updated after delete');

console.log('--- Test 2: Iterator ---');
const m2 = new PersistentMap('test2', { serviceName: 'test-service', flushIntervalMs: 100 });
m2.set('x', { name: 'X' });
m2.set('y', { name: 'Y' });
const arr = Array.from(m2.entries());
assert(arr.length === 2, 'entries() returns 2');
const values = Array.from(m2.values());
assert(values[0].name === 'X' || values[1].name === 'X', 'values() works');

console.log('--- Test 3: Persistence across "restart" ---');
await m2.flush();
const m3 = new PersistentMap('test2', { serviceName: 'test-service', flushIntervalMs: 100 });
assert(m3.get('x')?.name === 'X', 'value persisted to disk and reloaded');
assert(m3.size === 2, 'size restored from disk');

console.log('--- Test 4: Iteration with for-of ---');
let count = 0;
for (const [, v] of m3) {
  if (v?.name) count++;
}
assert(count === 2, 'for-of iteration works');

console.log('--- Test 5: clear() ---');
m3.clear();
assert(m3.size === 0, 'clear() empties the map');

console.log('--- Test 6: newId() ---');
const id = m3.newId('test');
assert(id.startsWith('test_'), 'newId honors prefix');

m.stopAutoFlush();
m2.stopAutoFlush();
m3.stopAutoFlush();

// Cleanup
fs.rmSync(testDir, { recursive: true, force: true });

console.log(`\n=== ${passed} passed, ${failed} failed ===`);
process.exit(failed === 0 ? 0 : 1);
