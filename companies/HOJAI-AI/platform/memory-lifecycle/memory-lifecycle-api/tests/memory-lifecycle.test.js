/**
 * @fileOverview Memory Lifecycle API Tests
 * Tests all CRUD, TTL, archival, dedup, conflict resolution, GDPR, and analytics endpoints.
 */

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

process.env.NO_LISTEN = '1';
process.env.SERVICE_REQUIRE_AUTH = 'false';
process.env.INTERNAL_SERVICE_TOKEN = 'test-token';
const { app, memories, policies, conflicts, archive, auditLog, stats } = require('../src/index.js');

const BASE = 'http://localhost:4900';

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': 'test-token',
        ...headers,
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
beforeEach(async () => {
  // Reset in-memory state
  memories.clear();
  policies.clear();
  conflicts.clear();
  archive.clear();
  auditLog.length = 0;
  stats.totalRequests = 0;
  stats.errors = 0;
  stats.uptime = 0;

  // Seed default policies
  policies.set('ttl_working', { id: 'ttl_working', name: 'Working Memory TTL', description: 'TTL for working memory', rules: [{ max_age_hours: 24 }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  policies.set('ttl_short_term', { id: 'ttl_short_term', name: 'Short Term Memory TTL', description: 'TTL for short-term memory', rules: [{ max_age_hours: 168 }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  policies.set('ttl_long_term', { id: 'ttl_long_term', name: 'Long Term Memory TTL', description: 'TTL for long-term memory', rules: [{ max_age_hours: 8760 }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  policies.set('archive', { id: 'archive', name: 'Memory Archive Policy', description: 'When to archive memories', rules: [{ archive_after_days: 90 }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  policies.set('deduplication', { id: 'deduplication', name: 'Deduplication Policy', description: 'Memory deduplication rules', rules: [{ similarity_threshold: 0.95 }], version: '1.0.0', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });

  server = app.listen(4900, '127.0.0.1');
  await new Promise(r => server.on('listening', r));
});

afterEach(async () => {
  await new Promise(resolve => server.close(resolve));
});

describe('Memory CRUD', () => {
  it('POST /api/memories → 201', async () => {
    const res = await request('POST', '/api/memories', {
      entity_id: 'user-123',
      entity_type: 'user',
      memory_type: 'working',
      content: { text: 'User prefers dark mode' },
      importance: 0.8,
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.entity_id, 'user-123');
    assert.strictEqual(res.body.status, 'active');
  });

  it('GET /api/memories → 200 with list', async () => {
    await request('POST', '/api/memories', { entity_id: 'u1', entity_type: 'user', memory_type: 'working', content: { text: 'A' } });
    await request('POST', '/api/memories', { entity_id: 'u1', entity_type: 'user', memory_type: 'short_term', content: { text: 'B' } });
    const res = await request('GET', '/api/memories?entity_id=u1');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.memories));
    assert.ok(res.body.memories.length >= 2);
  });

  it('GET /api/memories/:id → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u2', entity_type: 'user', memory_type: 'working', content: { text: 'Find me' } });
    const res = await request('GET', `/api/memories/${created.body.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.content.text, 'Find me');
  });

  it('GET /api/memories/:id → 404 for unknown id', async () => {
    const res = await request('GET', '/api/memories/unknown-mem-999');
    assert.strictEqual(res.status, 404);
  });

  it('PUT /api/memories/:id → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u3', entity_type: 'user', memory_type: 'working', content: { text: 'Old' } });
    const res = await request('PUT', `/api/memories/${created.body.id}`, { content: { text: 'Updated' } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.content.text, 'Updated');
  });

  it('DELETE /api/memories/:id → 204', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u4', entity_type: 'user', memory_type: 'working', content: { text: 'Delete me' } });
    const res = await request('DELETE', `/api/memories/${created.body.id}`);
    assert.strictEqual(res.status, 204);
  });

  it('POST /api/memories/:id/extend → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u5', entity_type: 'user', memory_type: 'working', content: { text: 'Extend me' } });
    const res = await request('POST', `/api/memories/${created.body.id}/extend`, { extend_by_hours: 48 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.expires_at);
  });

  it('GET /api/memories/expiring → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u6', entity_type: 'user', memory_type: 'working', content: { text: 'Expiring' } });
    await request('POST', `/api/memories/${created.body.id}/extend`, { extend_by_hours: 1 });
    const res = await request('GET', '/api/memories/expiring?hours=24');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.memories));
  });
});

describe('Memory Archive', () => {
  it('POST /api/memories/:id/archive → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u7', entity_type: 'user', memory_type: 'long_term', content: { text: 'Archive me' } });
    const res = await request('POST', `/api/memories/${created.body.id}/archive`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'archived');
  });

  it('POST /api/memories/:id/restore → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u8', entity_type: 'user', memory_type: 'long_term', content: { text: 'Restore me' } });
    await request('POST', `/api/memories/${created.body.id}/archive`);
    const res = await request('POST', `/api/memories/${created.body.id}/restore`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'active');
  });

  it('GET /api/archive → 200', async () => {
    const created = await request('POST', '/api/memories', { entity_id: 'u9', entity_type: 'user', memory_type: 'long_term', content: { text: 'Listed' } });
    await request('POST', `/api/memories/${created.body.id}/archive`);
    const res = await request('GET', '/api/archive');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.memories));
  });
});

describe('Memory Deduplication', () => {
  it('POST /api/dedup/find → 200', async () => {
    const m1 = await request('POST', '/api/memories', { entity_id: 'u10', entity_type: 'user', memory_type: 'working', content: { text: 'Hello world' } });
    const m2 = await request('POST', '/api/memories', { entity_id: 'u10', entity_type: 'user', memory_type: 'working', content: { text: 'Hello world' } });
    const res = await request('POST', '/api/dedup/find', { entity_id: 'u10', similarity_threshold: 0.95 });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.duplicates));
    assert.ok(res.body.duplicates.length >= 1);
  });

  it('POST /api/dedup/merge → 200', async () => {
    const m1 = await request('POST', '/api/memories', { entity_id: 'u11', entity_type: 'user', memory_type: 'working', content: { text: 'Keep this' } });
    const m2 = await request('POST', '/api/memories', { entity_id: 'u11', entity_type: 'user', memory_type: 'working', content: { text: 'Duplicate' } });
    const res = await request('POST', '/api/dedup/merge', {
      primary_id: m1.body.id,
      duplicate_ids: [m2.body.id],
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.merged);
  });

  it('GET /api/dedup/stats → 200', async () => {
    const res = await request('GET', '/api/dedup/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.total_memories === 'number');
  });
});

describe('Memory Conflicts', () => {
  it('POST /api/conflicts → 201', async () => {
    const res = await request('POST', '/api/conflicts', {
      memory_id: 'mem-conflict-1',
      entity_id: 'user-123',
      conflict_type: 'version_mismatch',
      versions: [{ version: '1.0', content: { text: 'A' } }, { version: '2.0', content: { text: 'B' } }],
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
    assert.strictEqual(res.body.status, 'open');
  });

  it('GET /api/conflicts/:id → 200', async () => {
    const created = await request('POST', '/api/conflicts', {
      memory_id: 'mem-conflict-2',
      entity_id: 'user-456',
      conflict_type: 'content_mismatch',
      versions: [{ version: '1.0', content: { text: 'X' } }],
    });
    const res = await request('GET', `/api/conflicts/${created.body.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.conflict_type, 'content_mismatch');
  });

  it('POST /api/conflicts/:id/resolve → 200', async () => {
    const created = await request('POST', '/api/conflicts', {
      memory_id: 'mem-conflict-3',
      entity_id: 'user-789',
      conflict_type: 'ttl_mismatch',
      versions: [{ version: '1.0', content: { text: 'Y' }, ttl_hours: 24 }],
    });
    const res = await request('POST', `/api/conflicts/${created.body.id}/resolve`, {
      resolution: 'keep_latest',
      merged_content: { text: 'Merged Y' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'resolved');
  });

  it('GET /api/conflicts → 200 list', async () => {
    await request('POST', '/api/conflicts', { memory_id: 'c1', entity_id: 'e1', conflict_type: 'type1', versions: [] });
    await request('POST', '/api/conflicts', { memory_id: 'c2', entity_id: 'e2', conflict_type: 'type2', versions: [] });
    const res = await request('GET', '/api/conflicts');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.conflicts));
    assert.ok(res.body.conflicts.length >= 2);
  });
});

describe('GDPR Endpoints', () => {
  it('DELETE /api/gdpr/delete/:entity_id → 200', async () => {
    const res = await request('DELETE', '/api/gdpr/delete/user-gdpr-test');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.deleted_count >= 0);
  });

  it('POST /api/gdpr/anonymize/:entity_id → 200', async () => {
    const res = await request('POST', '/api/gdpr/anonymize/user-anon-test');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.anonymized_count >= 0);
  });

  it('GET /api/gdpr/export/:entity_id → 200', async () => {
    const res = await request('GET', '/api/gdpr/export/user-export-test');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.memories));
  });

  it('GET /api/gdpr/audit/:entity_id → 200', async () => {
    const res = await request('GET', '/api/gdpr/audit/user-audit-test');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.audit_trail));
  });
});

describe('Memory Policies', () => {
  it('GET /api/policies → 200 with seeded policies', async () => {
    const res = await request('GET', '/api/policies');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.policies));
    assert.ok(res.body.policies.length >= 5); // 5 seeded
  });

  it('POST /api/policies → 201', async () => {
    const res = await request('POST', '/api/policies', {
      name: 'Custom Memory Policy',
      description: 'Test',
      rules: [{ custom_rule: true }],
    });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id);
  });

  it('GET /api/policies/:id → 200', async () => {
    const res = await request('GET', '/api/policies/ttl_working');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Working Memory TTL');
  });

  it('PUT /api/policies/:id → 200', async () => {
    const res = await request('PUT', '/api/policies/ttl_working', { name: 'Updated TTL Policy' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.name, 'Updated TTL Policy');
  });

  it('DELETE /api/policies/:id → 204', async () => {
    const res = await request('DELETE', '/api/policies/ttl_working');
    assert.strictEqual(res.status, 204);
  });
});

describe('Analytics', () => {
  it('GET /api/analytics → 200', async () => {
    await request('POST', '/api/memories', { entity_id: 'a1', entity_type: 'user', memory_type: 'working', content: { text: 'X' } });
    const res = await request('GET', '/api/analytics');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.total_memories === 'number');
    assert.ok(typeof res.body.by_type === 'object');
  });
});

describe('Health & Stats', () => {
  it('GET /health → 200', async () => {
    const res = await request('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.status);
  });

  it('GET /api/stats → 200', async () => {
    const res = await request('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.total_memories === 'number');
  });

  it('GET /api/audit → 200', async () => {
    await request('POST', '/api/memories', { entity_id: 'audit1', entity_type: 'user', memory_type: 'working', content: { text: 'Audit me' } });
    const res = await request('GET', '/api/audit');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.logs));
  });
});
