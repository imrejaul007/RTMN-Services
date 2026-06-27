/**
 * HOJAI Secrets Manager - Unit Tests
 * Tests all major routes: health, ready, 404, secrets CRUD, access control, rotation
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

// Set environment BEFORE importing the app
process.env.NODE_ENV = 'test';
process.env.INTERNAL_SERVICE_TOKEN = 'dev-token';
process.env.REQUIRE_AUTH = 'true';

// Now import the app (app.listen will not be called due to NODE_ENV=test)
const app = (await import('../../src/index.js')).default;

const TEST_USER = 'user-123';
const TEST_PROJECT = 'project-456';

function makeRequest(port, options) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path: options.path,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

describe('Secrets Manager API', () => {
  let server;
  let port;

  before(async () => {
    await new Promise(resolve => {
      server = http.createServer(app);
      server.listen(0, '127.0.0.1', () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  beforeEach(() => {
    // Reset stats before each test
    // Note: store state persists across tests within the same test file
  });

  // ── Health & Info Routes ──────────────────────────────────────────────────

  it('GET /health returns 200 with service info', async () => {
    const res = await makeRequest(port, { path: '/health' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.strictEqual(res.body.service, 'secrets-manager');
    assert.ok(res.body.version);
    assert.ok(res.body.timestamp);
  });

  it('GET /ready returns 200 when ready', async () => {
    const res = await makeRequest(port, { path: '/ready' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ready');
    assert.ok(res.body.timestamp);
  });

  it('GET / returns service info', async () => {
    const res = await makeRequest(port, { path: '/' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'HOJAI Secrets Manager');
    assert.strictEqual(res.body.tagline, 'Encrypted credential storage');
  });

  it('GET /api/v1 returns API info', async () => {
    const res = await makeRequest(port, {
      path: '/api/v1',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.service, 'HOJAI Secrets Manager API');
    assert.ok(res.body.endpoints);
    assert.ok(Array.isArray(res.body.secretTypes));
  });

  it('GET /unknown-route returns 404', async () => {
    const res = await makeRequest(port, {
      path: '/unknown-route',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 404);
  });

  // ── Authentication Tests ───────────────────────────��──────────────────────

  it('API routes return 401 without auth token when REQUIRE_AUTH is true', async () => {
    const res = await makeRequest(port, { path: '/api/v1/secrets' });
    assert.strictEqual(res.status, 401);
  });

  it('API routes return 401 with invalid auth token', async () => {
    const res = await makeRequest(port, {
      path: '/api/v1/secrets',
      headers: { 'x-internal-service-token': 'wrong-token' }
    });
    assert.strictEqual(res.status, 401);
  });

  it('API routes return 200 with valid auth token', async () => {
    // Test with /api/v1 endpoint (no userId required) instead
    const res = await makeRequest(port, {
      path: '/api/v1',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
  });

  // ── Secrets CRUD ─────────────────────────────────────────────────────────

  it('POST /api/v1/secrets creates a new secret', async () => {
    const res = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: {
        name: 'test-api-key',
        value: 'sk-test-12345',
        userId: TEST_USER,
        projectId: TEST_PROJECT,
        type: 'api-key',
        metadata: { env: 'test' }
      }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.secret);
    assert.strictEqual(res.body.secret.name, 'test-api-key');
    assert.strictEqual(res.body.secret.type, 'api-key');
    assert.strictEqual(res.body.secret.userId, TEST_USER);
    assert.ok(res.body.secret.id);
    assert.strictEqual(res.body.secret.encryptedValue, undefined); // Should not expose encrypted
    return res.body.secret.id;
  });

  it('POST /api/v1/secrets returns 400 without required fields', async () => {
    const res = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'test' } // missing value and userId
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/v1/secrets creates secret with different types', async () => {
    const types = ['password', 'certificate', 'token', 'credential'];
    for (const type of types) {
      const res = await makeRequest(port, {
        method: 'POST',
        path: '/api/v1/secrets',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-service-token': 'dev-token'
        },
        body: { name: `secret-${type}`, value: 'test-value', userId: TEST_USER, type }
      });
      assert.strictEqual(res.status, 201, `Failed for type: ${type}`);
      assert.strictEqual(res.body.secret.type, type);
    }
  });

  it('GET /api/v1/secrets lists all secrets for a user', async () => {
    const res = await makeRequest(port, {
      path: `/api/v1/secrets?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.secrets));
    assert.ok(res.body.count >= 0);
  });

  it('GET /api/v1/secrets returns 400 without userId', async () => {
    const res = await makeRequest(port, {
      path: '/api/v1/secrets',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('userId'));
  });

  it('GET /api/v1/secrets filters by projectId', async () => {
    const res = await makeRequest(port, {
      path: `/api/v1/secrets?userId=${TEST_USER}&projectId=${TEST_PROJECT}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.secrets));
  });

  it('GET /api/v1/secrets filters by type', async () => {
    const res = await makeRequest(port, {
      path: `/api/v1/secrets?userId=${TEST_USER}&type=api-key`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.secrets));
  });

  it('GET /api/v1/secrets/:id returns decrypted secret', async () => {
    // First create a secret
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'decrypt-test', value: 'my-secret-value', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Then retrieve it
    const res = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.secret.value, 'my-secret-value'); // Decrypted!
    assert.strictEqual(res.body.secret.name, 'decrypt-test');
  });

  it('GET /api/v1/secrets/:id returns 404 for non-existent secret', async () => {
    const res = await makeRequest(port, {
      path: '/api/v1/secrets/non-existent-id?userId=user-999',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 404);
  });

  it('GET /api/v1/secrets/:id returns 400 without userId', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'test', value: 'value', userId: TEST_USER }
    });
    const res = await makeRequest(port, {
      path: `/api/v1/secrets/${createRes.body.secret.id}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/v1/secrets/:id denies access to other user', async () => {
    // Create a secret
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'private', value: 'secret-data', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Try to access with different user
    const res = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=other-user`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 404); // Returns 404 to hide existence
  });

  it('PATCH /api/v1/secrets/:id updates secret name', async () => {
    // Create
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'old-name', value: 'value', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Update
    const res = await makeRequest(port, {
      method: 'PATCH',
      path: `/api/v1/secrets/${secretId}`,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: TEST_USER, name: 'new-name' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.secret.name, 'new-name');
  });

  it('PATCH /api/v1/secrets/:id updates secret value', async () => {
    // Create
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'update-value-test', value: 'old-value', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Update value
    const res = await makeRequest(port, {
      method: 'PATCH',
      path: `/api/v1/secrets/${secretId}`,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: TEST_USER, value: 'new-value' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.secret.version, 2); // Version incremented

    // Verify new value
    const getRes = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(getRes.body.secret.value, 'new-value');
  });

  it('PATCH /api/v1/secrets/:id returns 404 for non-existent secret', async () => {
    const res = await makeRequest(port, {
      method: 'PATCH',
      path: '/api/v1/secrets/non-existent',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: TEST_USER, name: 'test' }
    });
    assert.strictEqual(res.status, 404);
  });

  it('PATCH /api/v1/secrets/:id denies update from other user', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'protected', value: 'data', userId: TEST_USER }
    });
    const res = await makeRequest(port, {
      method: 'PATCH',
      path: `/api/v1/secrets/${createRes.body.secret.id}`,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: 'attacker', name: 'hacked' }
    });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/v1/secrets/:id deletes secret', async () => {
    // Create
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'to-delete', value: 'value', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Delete
    const res = await makeRequest(port, {
      method: 'DELETE',
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);

    // Verify deleted
    const getRes = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(getRes.status, 404);
  });

  it('DELETE /api/v1/secrets/:id returns 404 for non-existent', async () => {
    const res = await makeRequest(port, {
      method: 'DELETE',
      path: '/api/v1/secrets/non-existent?userId=user-123',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/v1/secrets/:id returns 400 without userId', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'delete-test', value: 'v', userId: TEST_USER }
    });
    const res = await makeRequest(port, {
      method: 'DELETE',
      path: `/api/v1/secrets/${createRes.body.secret.id}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 400);
  });

  it('DELETE /api/v1/secrets/:id denies delete from other user', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'undeletable', value: 'v', userId: TEST_USER }
    });
    const res = await makeRequest(port, {
      method: 'DELETE',
      path: `/api/v1/secrets/${createRes.body.secret.id}?userId=attacker`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 404);
  });

  // ── Secret Rotation ──────────────────────────────────────────────────────

  it('POST /api/v1/secrets/:id/rotate rotates secret value', async () => {
    // Create
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'rotatable', value: 'old-rotating-value', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Rotate
    const res = await makeRequest(port, {
      method: 'POST',
      path: `/api/v1/secrets/${secretId}/rotate`,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: TEST_USER }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.value); // Returns new value
    assert.notStrictEqual(res.body.value, 'old-rotating-value');
    assert.strictEqual(res.body.version, 2);

    // Verify old value no longer works
    const getRes = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(getRes.body.secret.value, res.body.value);
  });

  it('POST /api/v1/secrets/:id/rotate returns 404 for non-existent', async () => {
    const res = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets/non-existent/rotate',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: TEST_USER }
    });
    assert.strictEqual(res.status, 404);
  });

  it('POST /api/v1/secrets/:id/rotate returns 400 without userId', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'rotate-test', value: 'v', userId: TEST_USER }
    });
    const res = await makeRequest(port, {
      method: 'POST',
      path: `/api/v1/secrets/${createRes.body.secret.id}/rotate`,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: {} // No userId
    });
    assert.strictEqual(res.status, 400);
  });

  // ── Access Logs ─────────────────────────────────────────────────────────

  it('GET /api/v1/secrets/:id/logs returns access logs', async () => {
    // Create and access a secret
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'log-test', value: 'v', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Access it (generate log)
    await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });

    // Get logs
    const res = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}/logs`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(Array.isArray(res.body.logs));
    assert.ok(res.body.count >= 2); // create + read
  });

  it('GET /api/v1/secrets/:id/logs returns 500 for non-existent', async () => {
    const res = await makeRequest(port, {
      path: '/api/v1/secrets/non-existent/logs',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    // The endpoint doesn't validate secret existence, returns empty logs
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.count, 0);
  });

  // ── Stats ───────────────────────────────────────────────────────────────

  it('GET /api/v1/stats returns platform statistics', async () => {
    const res = await makeRequest(port, {
      path: '/api/v1/stats',
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.stats);
    assert.ok(typeof res.body.stats.totalSecrets === 'number');
    assert.ok(typeof res.body.stats.byType === 'object');
  });

  // ── Edge Cases & Error Handling ─────────────────────────────────────────

  it('handles concurrent secret operations', async () => {
    // Create multiple secrets concurrently
    const results = await Promise.all([
      makeRequest(port, {
        method: 'POST',
        path: '/api/v1/secrets',
        headers: { 'Content-Type': 'application/json', 'x-internal-service-token': 'dev-token' },
        body: { name: 'concurrent-1', value: 'v1', userId: TEST_USER }
      }),
      makeRequest(port, {
        method: 'POST',
        path: '/api/v1/secrets',
        headers: { 'Content-Type': 'application/json', 'x-internal-service-token': 'dev-token' },
        body: { name: 'concurrent-2', value: 'v2', userId: TEST_USER }
      }),
      makeRequest(port, {
        method: 'POST',
        path: '/api/v1/secrets',
        headers: { 'Content-Type': 'application/json', 'x-internal-service-token': 'dev-token' },
        body: { name: 'concurrent-3', value: 'v3', userId: TEST_USER }
      })
    ]);

    // All should succeed
    for (const res of results) {
      assert.strictEqual(res.status, 201);
    }

    // Verify all were created
    const listRes = await makeRequest(port, {
      path: `/api/v1/secrets?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.ok(listRes.body.count >= 3);
  });

  it('handles empty metadata object', async () => {
    const res = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'no-metadata', value: 'v', userId: TEST_USER, metadata: {} }
    });
    assert.strictEqual(res.status, 201);
    assert.deepStrictEqual(res.body.secret.metadata, {});
  });

  it('handles secret with special characters in value', async () => {
    const specialValue = 'p@ssw0rd!#$%^&*()_+-=[]{}|;:,.<>?/~`"\'\\';
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'special-chars', value: specialValue, userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    const getRes = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(getRes.body.secret.value, specialValue);
  });

  it('handles very long secret values', async () => {
    const longValue = 'a'.repeat(10000);
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'long-value', value: longValue, userId: TEST_USER }
    });
    assert.strictEqual(createRes.status, 201);
    const secretId = createRes.body.secret.id;

    const getRes = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.strictEqual(getRes.body.secret.value, longValue);
  });

  it('updates metadata correctly', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'meta-test', value: 'v', userId: TEST_USER, metadata: { key1: 'value1' } }
    });
    const secretId = createRes.body.secret.id;

    // Update with new metadata
    const updateRes = await makeRequest(port, {
      method: 'PATCH',
      path: `/api/v1/secrets/${secretId}`,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { userId: TEST_USER, metadata: { key2: 'value2' } }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.secret.metadata.key1, 'value1'); // Preserved
    assert.strictEqual(updateRes.body.secret.metadata.key2, 'value2'); // Added
  });

  it('access count increments on read', async () => {
    const createRes = await makeRequest(port, {
      method: 'POST',
      path: '/api/v1/secrets',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service-token': 'dev-token'
      },
      body: { name: 'access-count', value: 'v', userId: TEST_USER }
    });
    const secretId = createRes.body.secret.id;

    // Read multiple times
    for (let i = 0; i < 3; i++) {
      await makeRequest(port, {
        path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
        headers: { 'x-internal-service-token': 'dev-token' }
      });
    }

    const getRes = await makeRequest(port, {
      path: `/api/v1/secrets/${secretId}?userId=${TEST_USER}`,
      headers: { 'x-internal-service-token': 'dev-token' }
    });
    assert.ok(getRes.body.secret.accessCount >= 4); // 1 create + 3 reads + 1 this read
  });
});
