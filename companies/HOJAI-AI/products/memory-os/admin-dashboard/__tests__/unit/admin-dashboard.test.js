/**
 * Memory Admin Dashboard Unit Tests
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

process.env.MEMORY_ADMIN_PORT = '4895';

const { default: app } = await import('../../src/index.js');

let server;
let baseUrl;

before(async () => {
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const addr = server.address();
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });
});

function url(path) { return baseUrl + path; }

describe('Memory Admin Dashboard — Health', () => {
  it('GET /health → 200', async () => {
    const r = await fetch(url('/health'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.status, 'healthy');
    assert.equal(j.service, 'memory-admin-dashboard');
  });

  it('GET / → service info', async () => {
    const r = await fetch(url('/'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.service, 'MemoryOS Department Admin Dashboard');
  });
});

describe('Memory Admin Dashboard — Departments', () => {
  it('GET /api/departments → list departments', async () => {
    const r = await fetch(url('/api/departments'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.departments));
    assert.ok(j.count > 0);
  });

  it('GET /api/departments/:id → get department', async () => {
    const r = await fetch(url('/api/departments/engineering'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.department);
    assert.equal(j.department.id, 'engineering');
  });

  it('GET /api/departments/:id with stats → includes stats', async () => {
    const r = await fetch(url('/api/departments/engineering?include_stats=true'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.department.stats);
  });

  it('PUT /api/departments/:id → update department', async () => {
    const r = await fetch(url('/api/departments/engineering'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Platform Engineering', description: 'Platform team' })
    });
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.department.name, 'Platform Engineering');
  });
});

describe('Memory Admin Dashboard — Teams', () => {
  it('GET /api/teams → list teams', async () => {
    const r = await fetch(url('/api/teams'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.teams));
  });

  it('GET /api/teams/:id → get team', async () => {
    const r = await fetch(url('/api/teams/team-1'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.team);
  });

  it('POST /api/teams → create team', async () => {
    const r = await fetch(url('/api/teams'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Platform Team',
        department: 'engineering',
        members: ['user_1', 'user_2']
      })
    });
    assert.equal(r.status, 201);
    const j = await r.json();
    assert.ok(j.team);
    assert.equal(j.team.name, 'Platform Team');
  });
});

describe('Memory Admin Dashboard — Memories', () => {
  it('GET /api/memories → list memories', async () => {
    const r = await fetch(url('/api/memories'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.memories));
  });

  it('GET /api/memories with filters → filtered results', async () => {
    const r = await fetch(url('/api/memories?department=engineering&importance=High'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.memories));
  });

  it('POST /api/memories → create memory', async () => {
    const r = await fetch(url('/api/memories'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        twinId: 'user_test',
        content: 'Use PostgreSQL for main database',
        type: 'engineering_decision',
        department: 'engineering',
        importance: 'High'
      })
    });
    assert.equal(r.status, 201);
    const j = await r.json();
    assert.ok(j.memory);
    assert.equal(j.memory.type, 'engineering_decision');
  });

  it('GET /api/memories/:id → get memory', async () => {
    const r = await fetch(url('/api/memories/mem-test-123'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.memory);
  });
});

describe('Memory Admin Dashboard — Activities', () => {
  it('GET /api/activities → list activities', async () => {
    const r = await fetch(url('/api/activities'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.activities));
  });

  it('GET /api/activities with filters → filtered', async () => {
    const r = await fetch(url('/api/activities?department=engineering&type=memory_created'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.activities));
  });
});

describe('Memory Admin Dashboard — Knowledge Graph', () => {
  it('GET /api/graph → knowledge graph', async () => {
    const r = await fetch(url('/api/graph'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(Array.isArray(j.nodes));
    assert.ok(Array.isArray(j.edges));
    assert.ok(j.stats);
  });

  it('GET /api/graph/stats → graph stats', async () => {
    const r = await fetch(url('/api/graph/stats'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.stats);
    assert.ok(typeof j.stats.totalMemories === 'number');
  });
});

describe('Memory Admin Dashboard — Compliance', () => {
  it('GET /api/compliance → compliance report', async () => {
    const r = await fetch(url('/api/compliance'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.report);
    assert.ok(j.report.summary);
    assert.ok(j.report.gdpr);
  });

  it('GET /api/compliance/export/:twinId → GDPR export', async () => {
    const r = await fetch(url('/api/compliance/export/user_123'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.twinId);
    assert.ok(Array.isArray(j.memories));
  });
});

describe('Memory Admin Dashboard — Analytics', () => {
  it('GET /api/analytics → dashboard analytics', async () => {
    const r = await fetch(url('/api/analytics'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.ok(j.analytics);
    assert.ok(j.analytics.overview);
    assert.ok(j.analytics.byDepartment);
    assert.ok(j.analytics.byImportance);
  });

  it('GET /api/analytics?period=7d → 7 day analytics', async () => {
    const r = await fetch(url('/api/analytics?period=7d'));
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.analytics.period, '7d');
  });
});

after(() => { server?.close(); });
