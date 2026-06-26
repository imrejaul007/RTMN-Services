/**
 * @fileOverview Memory Lifecycle API Tests
 * Tests all CRUD, TTL, archival, dedup, conflict resolution, GDPR, and analytics endpoints.
 * Field names and routes match the actual API implementation.
 *
 * Architecture: All tests run inside a single describe block sharing one server instance.
 * beforeEach creates a fresh server + seeds data; afterEach closes it.
 * Individual `it()` tests run sequentially within the same suite, avoiding hook race conditions.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
const { app, memories, policies, conflicts, archive, auditLog, stats } = require('../src/index.js');

const BASE = 'http://localhost:4900';

function mkReq(port) {
  var base = 'http://localhost:' + port;
  return function req(method, path, body) {
    return new Promise(function(resolve, reject) {
      const url = new URL(path, base);
      const opts = {
        method: method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': 'test-token',
        },
      };
      const r = http.request(opts, function(res) {
        let data = '';
        res.on('data', function(chunk) { data += chunk; });
        res.on('end', function() {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed });
        });
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  };
}

let server;
let req;
let portCounter = 4900;

beforeEach(async function() {
  // Reset state
  memories.clear();
  policies.clear();
  conflicts.clear();
  archive.clear();
  auditLog.length = 0;
  stats.totalRequests = 0;
  stats.errors = 0;
  stats.uptime = 0;

  // Seed policies with required type + retentionDays fields
  policies.set('ttl_working', { id: 'ttl_working', name: 'Working Memory TTL', type: 'ttl', retentionDays: 1, memoryTypes: ['working'], status: 'active' });
  policies.set('ttl_short_term', { id: 'ttl_short_term', name: 'Short Term Memory TTL', type: 'ttl', retentionDays: 7, memoryTypes: ['short_term'], status: 'active' });
  policies.set('ttl_long_term', { id: 'ttl_long_term', name: 'Long Term Memory TTL', type: 'ttl', retentionDays: 365, memoryTypes: ['long_term'], status: 'active' });
  policies.set('archive', { id: 'archive', name: 'Memory Archive Policy', type: 'archive', retentionDays: 90, memoryTypes: [], status: 'active' });
  policies.set('deduplication', { id: 'deduplication', name: 'Deduplication Policy', type: 'dedup', memoryTypes: [], status: 'active' });

  // Rotate port to avoid TIME_WAIT issues
  var port = portCounter++;
  req = mkReq(port);
  await new Promise(function(resolve) { server = app.listen(port, '127.0.0.1', resolve); });
});

afterEach(async function() {
  await new Promise(function(resolve) { server.close(resolve); });
});

// All tests in ONE describe block so hooks execute in the right order
describe('Memory Lifecycle API', function() {

  // ============================================================
  // CRUD
  // ============================================================
  describe('CRUD', function() {
    it('POST /api/memories -> 201', async function() {
      const res = await req('POST', '/api/memories', {
        entityId: 'user-123',
        memoryType: 'working',
        content: 'User prefers dark mode',
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.memory);
      assert.strictEqual(res.body.memory.entityId, 'user-123');
      assert.strictEqual(res.body.memory.status, 'active');
    });

    it('GET /api/memories -> 200 with list', async function() {
      await req('POST', '/api/memories', { entityId: 'u1', memoryType: 'working', content: 'A' });
      await req('POST', '/api/memories', { entityId: 'u1', memoryType: 'short_term', content: 'B' });
      const res = await req('GET', '/api/memories?entityId=u1');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.memories));
      assert.ok(res.body.memories.length >= 2);
    });

    it('GET /api/memories/:id -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u2', memoryType: 'working', content: 'Find me' });
      const res = await req('GET', '/api/memories/' + created.body.memory.id);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.memory.content, 'Find me');
    });

    it('GET /api/memories/:id -> 404 for unknown id', async function() {
      const res = await req('GET', '/api/memories/unknown-mem-xyz');
      assert.strictEqual(res.status, 404);
    });

    it('PUT /api/memories/:id -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u3', memoryType: 'working', content: 'Old' });
      const res = await req('PUT', '/api/memories/' + created.body.memory.id, { content: 'Updated' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.memory.content, 'Updated');
    });

    it('DELETE /api/memories/:id -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u4', memoryType: 'working', content: 'Delete me' });
      const res = await req('DELETE', '/api/memories/' + created.body.memory.id);
      assert.strictEqual(res.status, 200);
    });

    it('POST /api/memories/:id/extend -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u5', memoryType: 'working', content: 'Extend me', ttlDays: 1 });
      const res = await req('POST', '/api/memories/' + created.body.memory.id + '/extend', { days: 2 });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.memory.expiresAt);
    });
  });

  // ============================================================
  // Archive / Restore
  // ============================================================
  describe('Archive / Restore', function() {
    it('POST /api/memories/:id/archive -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u7', memoryType: 'working', content: 'Archive me' });
      const res = await req('POST', '/api/memories/' + created.body.memory.id + '/archive');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.memory.status, 'archived');
    });

    it('POST /api/memories/:id/restore -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u8', memoryType: 'working', content: 'Restore me' });
      await req('POST', '/api/memories/' + created.body.memory.id + '/archive');
      const res = await req('POST', '/api/memories/' + created.body.memory.id + '/restore');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.memory.status, 'active');
    });

    it('GET /api/archive -> 200', async function() {
      const created = await req('POST', '/api/memories', { entityId: 'u9', memoryType: 'working', content: 'Listed' });
      await req('POST', '/api/memories/' + created.body.memory.id + '/archive');
      const res = await req('GET', '/api/archive');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.archived);
    });
  });

  // ============================================================
  // Deduplication
  // ============================================================
  describe('Deduplication', function() {
    it('POST /api/dedup -> 200', async function() {
      await req('POST', '/api/memories', { entityId: 'u10', memoryType: 'working', content: 'Hello world', tags: ['test'] });
      await req('POST', '/api/memories', { entityId: 'u10', memoryType: 'working', content: 'Hello world', tags: ['test'] });
      const res = await req('POST', '/api/dedup', { entityId: 'u10', similarityThreshold: 0.9 });
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.duplicates));
    });

    it('POST /api/dedup/merge -> 200', async function() {
      const m1 = await req('POST', '/api/memories', { entityId: 'u11', memoryType: 'working', content: 'Keep this', tags: ['keep'] });
      const m2 = await req('POST', '/api/memories', { entityId: 'u11', memoryType: 'working', content: 'Duplicate', tags: ['dup'] });
      const res = await req('POST', '/api/dedup/merge', { keepId: m1.body.memory.id, mergeIds: [m2.body.memory.id] });
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message);
    });

    it('GET /api/dedup/stats -> 200', async function() {
      await req('POST', '/api/memories', { entityId: 'stat1', memoryType: 'working', content: 'X' });
      const res = await req('GET', '/api/dedup/stats');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.totalMemories === 'number');
    });
  });

  // ============================================================
  // Conflicts
  // ============================================================
  describe('Conflicts', function() {
    it('POST /api/conflicts -> 201', async function() {
      const m1 = await req('POST', '/api/memories', { entityId: 'cuser1', memoryType: 'working', content: 'Memory A' });
      const m2 = await req('POST', '/api/memories', { entityId: 'cuser1', memoryType: 'working', content: 'Memory B' });
      const res = await req('POST', '/api/conflicts', {
        memoryIdA: m1.body.memory.id,
        memoryIdB: m2.body.memory.id,
        conflictType: 'version_mismatch',
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.conflict);
      assert.strictEqual(res.body.conflict.status, 'open');
    });

    it('GET /api/conflicts -> 200 list', async function() {
      const m1 = await req('POST', '/api/memories', { entityId: 'clist1', memoryType: 'working', content: 'X' });
      const m2 = await req('POST', '/api/memories', { entityId: 'clist1', memoryType: 'working', content: 'Y' });
      await req('POST', '/api/conflicts', { memoryIdA: m1.body.memory.id, memoryIdB: m2.body.memory.id, conflictType: 'type1' });
      const res = await req('GET', '/api/conflicts');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.conflicts));
      assert.ok(res.body.conflicts.length >= 1);
    });

    it('POST /api/conflicts/:id/resolve -> 200', async function() {
      const m1 = await req('POST', '/api/memories', { entityId: 'cres1', memoryType: 'working', content: 'One' });
      const m2 = await req('POST', '/api/memories', { entityId: 'cres1', memoryType: 'working', content: 'Two' });
      const created = await req('POST', '/api/conflicts', { memoryIdA: m1.body.memory.id, memoryIdB: m2.body.memory.id, conflictType: 'ttl_mismatch' });
      const res = await req('POST', '/api/conflicts/' + created.body.conflict.id + '/resolve', { resolution: 'keep_a' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.conflict.resolution, 'keep_a');
    });
  });

  // ============================================================
  // GDPR
  // ============================================================
  describe('GDPR', function() {
    it('POST /api/gdpr/delete/:entityId -> 200', async function() {
      const res = await req('POST', '/api/gdpr/delete/user-gdpr-test');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.deletedCount === 'number');
    });

    it('POST /api/gdpr/anonymize/:entityId -> 200', async function() {
      const res = await req('POST', '/api/gdpr/anonymize/user-anon-test');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.anonymizedCount === 'number');
    });

    it('GET /api/gdpr/export/:entityId -> 200', async function() {
      const res = await req('GET', '/api/gdpr/export/user-export-test');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.memories));
    });

    it('GET /api/gdpr/audit/:entityId -> 200', async function() {
      const res = await req('GET', '/api/gdpr/audit/user-audit-test');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.audit_trail));
    });
  });

  // ============================================================
  // Policies
  // ============================================================
  describe('Policies', function() {
    it('GET /api/policies -> 200 with seeded policies', async function() {
      const res = await req('GET', '/api/policies');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.policies));
      assert.ok(res.body.policies.length >= 5);
    });

    it('POST /api/policies -> 201', async function() {
      const res = await req('POST', '/api/policies', {
        name: 'Custom Memory Policy',
        type: 'custom',
        description: 'Test',
        rules: [{ custom_rule: true }],
      });
      assert.strictEqual(res.status, 201);
      assert.ok(res.body.policy);
    });

    it('GET /api/policies/:id -> 200', async function() {
      const res = await req('GET', '/api/policies/ttl_working');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.policy);
      assert.strictEqual(res.body.policy.name, 'Working Memory TTL');
    });

    it('PUT /api/policies/:id -> 200', async function() {
      const res = await req('PUT', '/api/policies/ttl_working', { name: 'Updated TTL Policy' });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.policy.name, 'Updated TTL Policy');
    });

    it('DELETE /api/policies/:id -> 200', async function() {
      const res = await req('DELETE', '/api/policies/ttl_working');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.message);
    });
  });

  // ============================================================
  // Analytics
  // ============================================================
  describe('Analytics', function() {
    it('GET /api/analytics -> 200', async function() {
      await req('POST', '/api/memories', { entityId: 'a1', memoryType: 'working', content: 'X' });
      const res = await req('GET', '/api/analytics');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.total_memories === 'number');
    });
  });

  // ============================================================
  // Health and Stats
  // ============================================================
  describe('Health and Stats', function() {
    it('GET /api/health -> 200', async function() {
      const res = await req('GET', '/api/health');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.status);
    });

    it('GET /api/stats -> 200', async function() {
      const res = await req('GET', '/api/stats');
      assert.strictEqual(res.status, 200);
      assert.ok(typeof res.body.total_memories === 'number');
    });

    it('GET /api/audit -> 200', async function() {
      await req('POST', '/api/memories', { entityId: 'audit1', memoryType: 'working', content: 'Audit me' });
      const res = await req('GET', '/api/audit');
      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.entries));
    });
  });
});
