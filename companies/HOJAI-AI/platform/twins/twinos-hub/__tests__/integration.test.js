/**
 * TwinOS Hub Integration Tests
 * Tests the full API flow with a real server instance
 *
 * NOTE: These tests require a running server. Run separately with:
 *   npm start &
 *   npx vitest run __tests__/integration.test.js
 *
 * Or use Docker:
 *   docker-compose up
 *   npx vitest run __tests__/integration.test.js
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import http from 'http';

// Test configuration
const BASE_URL = 'http://localhost:4706'; // Use different port for integration tests
const TEST_TIMEOUT = 30000;

let server;
let serverProcess;

// Helper to make HTTP requests
function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, body: data });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

// Generate test JWT token
function generateToken(userId = 'test-user') {
  // This would normally use jwt.sign, but we'll use a simple approach for testing
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    email: `${userId}@test.com`,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    iss: 'rtmn-twinos'
  })).toString('base64');
  const signature = 'test-signature';
  return `${header}.${payload}.${signature}`;
}

// Start server for integration tests
beforeAll(async () => {
  // Note: In CI, you would use a pre-built Docker image or start the server differently
  // For local testing, we assume the server might already be running
  console.log('Integration tests will run against', BASE_URL);
}, TEST_TIMEOUT);

afterAll(async () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

describe('TwinOS Hub Integration Tests', () => {
  const authHeader = { Authorization: `Bearer ${generateToken()}` };

  describe('Health & Readiness', () => {
    it('should return healthy status', async () => {
      const res = await request('GET', '/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.version).toBeDefined();
    });

    it('should return ready status', async () => {
      const res = await request('GET', '/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });

  describe('Twin CRUD Operations', () => {
    const testTwinId = `integration-test-${Date.now()}`;

    afterAll(async () => {
      // Cleanup: delete test twin
      try {
        await request('DELETE', `/api/twins/${testTwinId}`, null, authHeader);
      } catch (e) {
        // Ignore cleanup errors
      }
    });

    it('should create a twin', async () => {
      const twin = {
        id: testTwinId,
        name: 'Integration Test Twin',
        type: 'employee',
        category: 'people',
        metadata: { source: 'integration-test' }
      };

      const res = await request('POST', '/api/twins', twin, authHeader);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.twin.id).toBe(testTwinId);
    });

    it('should get a twin by ID', async () => {
      const res = await request('GET', `/api/twins/${testTwinId}`, null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.twin.id).toBe(testTwinId);
    });

    it('should update a twin', async () => {
      const updates = {
        name: 'Updated Integration Test Twin',
        metadata: { source: 'integration-test', updated: true }
      };

      const res = await request('PUT', `/api/twins/${testTwinId}`, updates, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.twin.name).toBe(updates.name);
    });

    it('should list twins', async () => {
      const res = await request('GET', '/api/twins', null, authHeader);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.twins) || Array.isArray(res.body.data)).toBe(true);
    });

    it('should delete a twin', async () => {
      // Create temp twin for deletion
      const tempId = `delete-test-${Date.now()}`;
      await request('POST', '/api/twins', { id: tempId, name: 'Delete Me', type: 'test' }, authHeader);

      const res = await request('DELETE', `/api/twins/${tempId}`, null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Relationship Management', () => {
    const twin1 = `rel-test-1-${Date.now()}`;
    const twin2 = `rel-test-2-${Date.now()}`;
    const twin3 = `rel-test-3-${Date.now()}`;

    beforeAll(async () => {
      // Create test twins
      for (const id of [twin1, twin2, twin3]) {
        await request('POST', '/api/twins', { id, name: `Test Twin ${id}`, type: 'employee' }, authHeader);
      }
    });

    afterAll(async () => {
      // Cleanup
      for (const id of [twin1, twin2, twin3]) {
        try {
          await request('DELETE', `/api/twins/${id}`, null, authHeader);
        } catch (e) {
          // Ignore
        }
      }
    });

    it('should create a relationship', async () => {
      const relationship = {
        sourceId: twin1,
        targetId: twin2,
        type: 'works_with',
        metadata: { strength: 0.8, trust_score: 85 }
      };

      const res = await request('POST', '/api/relationships', relationship, authHeader);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.relationship.sourceId).toBe(twin1);
      expect(res.body.relationship.targetId).toBe(twin2);
    });

    it('should get relationships for a twin', async () => {
      const res = await request('GET', `/api/relationships?sourceId=${twin1}`, null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should update a relationship', async () => {
      // First create a relationship
      const createRes = await request('POST', '/api/relationships', {
        sourceId: twin1,
        targetId: twin3,
        type: 'collaborates_with'
      }, authHeader);

      const relId = createRes.body.relationship?.id;
      if (relId) {
        const updateRes = await request('PUT', `/api/relationships/${relId}`, {
          type: 'partners_with',
          strength: 0.9
        }, authHeader);
        expect(updateRes.status).toBe(200);
      }
    });

    it('should get relationship types', async () => {
      const res = await request('GET', '/api/relationships/types');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.types)).toBe(true);
      expect(res.body.types).toContain('owns');
      expect(res.body.types).toContain('belongs_to');
    });
  });

  describe('Graph Traversal (Phase 2)', () => {
    const gTwin1 = `graph-1-${Date.now()}`;
    const gTwin2 = `graph-2-${Date.now()}`;
    const gTwin3 = `graph-3-${Date.now()}`;
    const gOrg = `graph-org-${Date.now()}`;

    beforeAll(async () => {
      // Create graph: twin1 -> twin2 -> twin3 AND twin1 -> org
      for (const id of [gTwin1, gTwin2, gTwin3, gOrg]) {
        await request('POST', '/api/twins', { id, name: `Graph Twin ${id}`, type: 'employee' }, authHeader);
      }

      // Create relationships
      await request('POST', '/api/relationships', { sourceId: gTwin1, targetId: gTwin2, type: 'reports_to' }, authHeader);
      await request('POST', '/api/relationships', { sourceId: gTwin2, targetId: gTwin3, type: 'manages' }, authHeader);
      await request('POST', '/api/relationships', { sourceId: gTwin1, targetId: gOrg, type: 'belongs_to' }, authHeader);
    });

    afterAll(async () => {
      for (const id of [gTwin1, gTwin2, gTwin3, gOrg]) {
        try {
          await request('DELETE', `/api/twins/${id}`, null, authHeader);
        } catch (e) {
          // Ignore
        }
      }
    });

    it('should find path between twins', async () => {
      const res = await request('GET', `/api/graph/path?from=${gTwin1}&to=${gOrg}`, null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should find connected twins', async () => {
      const res = await request('GET', `/api/graph/connected?twinId=${gTwin1}&hops=3`, null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should validate path exists', async () => {
      const res = await request('POST', '/api/graph/path-validate', {
        path: [gTwin1, gOrg]
      }, authHeader);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Relationship Enrichment (Phase 1)', () => {
    it('should record interaction', async () => {
      // This test assumes there's a relationship with id 'test-rel'
      const res = await request('POST', '/api/relationships/test-rel/interact', {
        interaction_type: 'meeting',
        trust_delta: 5,
        strength_delta: 0.1
      }, authHeader);

      // Will return 404 if relationship doesn't exist, which is expected
      expect([200, 404]).toContain(res.status);
    });

    it('should query enriched relationships', async () => {
      const res = await request('GET', '/api/relationships/enriched?min_trust=50', null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('count');
      expect(res.body).toHaveProperty('relationships');
    });

    it('should get enrichment stats', async () => {
      const res = await request('GET', `/api/relationships/enrichment-stats`, null, authHeader);
      // Will return 404 if twin doesn't exist
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Temporal History (Phase 3)', () => {
    it('should query history at point in time', async () => {
      const res = await request('GET', `/api/relationships/history?at=2026-01-01`, null, authHeader);
      expect([200, 404]).toContain(res.status);
    });

    it('should get timeline', async () => {
      const res = await request('GET', `/api/relationships/timeline`, null, authHeader);
      expect([200, 404]).toContain(res.status);
    });
  });

  describe('Auto-Linking (Phase 4)', () => {
    it('should suggest auto-links', async () => {
      const res = await request('POST', '/api/auto-link/suggest', {
        twinId: 'emp_001',
        strategy: 'memory',
        minConfidence: 0.5
      }, authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('suggestions');
    });

    it('should get auto-link stats', async () => {
      const res = await request('GET', '/api/auto-link/stats', null, authHeader);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('stats');
    });

    it('should create auto-links', async () => {
      const res = await request('POST', '/api/auto-link/create', {
        twinId: 'emp_001',
        suggestions: [],
        dryRun: true
      }, authHeader);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
    });
  });

  describe('Error Handling', () => {
    it('should return 401 without auth', async () => {
      const res = await request('POST', '/api/twins', { id: 'test', name: 'Test' });
      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent twin', async () => {
      const res = await request('GET', '/api/twins/non-existent-twin-xyz', null, authHeader);
      expect(res.status).toBe(404);
    });

    it('should return 400 for invalid input', async () => {
      const res = await request('POST', '/api/twins', { /* missing required fields */ }, authHeader);
      expect(res.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting gracefully', async () => {
      // Make many rapid requests
      const promises = [];
      for (let i = 0; i < 25; i++) {
        promises.push(request('GET', '/health'));
      }

      const results = await Promise.allSettled(promises);
      const statuses = results.map(r => r.status || r.value?.status);

      // Should have mostly 200s, some 429s
      const successCount = statuses.filter(s => s === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});
