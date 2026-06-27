/**
 * PolicyOS — Key Manager Unit Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { generateEncryptionKey, clearKeyCache } from '../../src/services/key-manager.js';

describe('Key Manager', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearKeyCache();
    // Reset env
    delete process.env.PERSISTENT_STORE_KEY;
    delete process.env.PERSISTENT_STORE_KEY_FILE;
  });

  afterEach(() => {
    clearKeyCache();
    // Restore env
    Object.assign(process.env, originalEnv);
  });

  // Clear cache between tests to test fresh resolution each time
  beforeEach(() => clearKeyCache());

  it('generateEncryptionKey returns 64 hex chars', () => {
    const key = generateEncryptionKey();
    assert.equal(key.length, 64);
    assert.match(key, /^[0-9a-f]{64}$/);
  });

  it('generateEncryptionKey returns unique keys', () => {
    const k1 = generateEncryptionKey();
    const k2 = generateEncryptionKey();
    assert.notEqual(k1, k2);
  });

  it('resolveEncryptionKey uses PERSISTENT_STORE_KEY env var', async () => {
    const { clearKeyCache } = await import('../../src/services/key-manager.js');
    clearKeyCache();
    const key = crypto.randomBytes(32).toString('hex');
    process.env.PERSISTENT_STORE_KEY = key;
    const { resolveEncryptionKey: resolve } = await import('../../src/services/key-manager.js');
    const result = resolve();
    assert.equal(result.source, `env:PERSISTENT_STORE_KEY`);
    assert.equal(result.isDevKey, false);
    assert.equal(result.key.toString('hex'), key);
  });

  it('resolveEncryptionKey validates hex key format', async () => {
    const { clearKeyCache } = await import('../../src/services/key-manager.js');
    clearKeyCache();
    process.env.PERSISTENT_STORE_KEY = 'not-valid-hex';
    process.env.NODE_ENV = 'development';
    const { resolveEncryptionKey: resolve } = await import('../../src/services/key-manager.js');
    assert.throws(
      () => resolve(),
      /Invalid encryption key/
    );
  });

  it('resolveEncryptionKey rejects too-short keys', async () => {
    const { clearKeyCache } = await import('../../src/services/key-manager.js');
    clearKeyCache();
    process.env.PERSISTENT_STORE_KEY = 'a'.repeat(32); // 32 hex chars = 16 bytes (too short)
    process.env.NODE_ENV = 'development';
    const { resolveEncryptionKey: resolve } = await import('../../src/services/key-manager.js');
    assert.throws(
      () => resolve(),
      /Invalid encryption key/
    );
  });

  it('resolveEncryptionKey uses key file when env var is absent', async () => {
    const { clearKeyCache } = await import('../../src/services/key-manager.js');
    clearKeyCache();
    const key = crypto.randomBytes(32).toString('hex');
    const tmpFile = `/tmp/policy-os-test-key-${Date.now()}.txt`;
    await import('fs').then(fs => fs.writeFileSync(tmpFile, key));
    process.env.PERSISTENT_STORE_KEY_FILE = tmpFile;
    process.env.NODE_ENV = 'development';
    const { resolveEncryptionKey: resolve } = await import('../../src/services/key-manager.js');
    const result = resolve();
    assert.equal(result.source, `file:${tmpFile}`);
    assert.equal(result.key.toString('hex'), key);
    await import('fs').then(fs => fs.unlinkSync(tmpFile));
  });

  it('resolveEncryptionKey errors in production without key', async () => {
    const { clearKeyCache } = await import('../../src/services/key-manager.js');
    clearKeyCache();
    process.env.NODE_ENV = 'production';
    process.env.NODE_ENVIRONMENT = 'production';
    const { resolveEncryptionKey: resolve } = await import('../../src/services/key-manager.js');
    assert.throws(
      () => resolve(),
      /NODE_ENV=production but no encryption key configured/
    );
  });

  it('caches resolved key across multiple calls', async () => {
    const { clearKeyCache } = await import('../../src/services/key-manager.js');
    clearKeyCache();
    const key = crypto.randomBytes(32).toString('hex');
    process.env.PERSISTENT_STORE_KEY = key;
    const { resolveEncryptionKey: resolve } = await import('../../src/services/key-manager.js');
    const r1 = resolve();
    const r2 = resolve();
    assert.equal(r1, r2); // Same object reference
    assert.equal(r1.key, r2.key);
  });
});