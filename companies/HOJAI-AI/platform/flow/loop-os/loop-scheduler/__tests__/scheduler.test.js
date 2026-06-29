/**
 * LoopOS Loop Scheduler Tests
 */

const { test, describe, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

// Mock cron before importing app
const mockJobs = new Map();
const mockSchedule = (expr, fn, opts) => {
  const id = `job-${Math.random().toString(36).slice(2, 8)}`;
  mockJobs.set(id, { expr, fn, running: false });
  return {
    start: () => { mockJobs.get(id).running = true; },
    stop: () => { mockJobs.get(id).running = false; }
  };
};

// Mock node-cron
require.cache[require.resolve('node-cron')] = {
  exports: {
    schedule: mockSchedule,
    validate: (expr) => {
      const parts = expr.split(' ');
      return parts.length === 5;
    }
  }
};

// Now import app (with mocked cron)
process.env.HOJAI_API_KEY = 'test-key';
const appModule = await import('../src/index.js');
const app = appModule.default;

// Simple test HTTP helper
async function makeRequest(method, path, body = null, headers = {}) {
  const http = require('node:http');
  const baseUrl = `http://localhost:${process.env.PORT || 4721}`;

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: process.env.PORT || 4721,
      path,
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
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

describe('Loop Scheduler - Health', () => {
  test('GET /health returns service status', async () => {
    const res = await makeRequest('GET', '/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.service, 'loop-scheduler');
  });

  test('GET /ready returns ready status', async () => {
    const res = await makeRequest('GET', '/ready');
    assert.equal(res.status, 200);
    assert.equal(res.body.ready, true);
  });
});

describe('Loop Scheduler - Loop CRUD', () => {
  const authHeader = { Authorization: 'Bearer test-key' };

  test('POST /api/loops creates a new loop', async () => {
    const loop = {
      name: 'Test Lead Check',
      frequency: '*/5 * * * *',
      targetTwinId: 'sales-agent-001',
      actions: [{ name: 'check_leads' }],
      enabled: false  // Don't auto-start in tests
    };

    const res = await makeRequest('POST', '/api/loops', loop, authHeader);
    assert.equal(res.status, 201);
    assert.ok(res.body.id.startsWith('loop-'));
    assert.equal(res.body.name, 'Test Lead Check');
    assert.equal(res.body.frequency, '*/5 * * * *');
    assert.equal(res.body.enabled, false);
  });

  test('POST /api/loops rejects invalid cron', async () => {
    const loop = {
      name: 'Invalid Loop',
      frequency: 'not-a-cron'
    };

    const res = await makeRequest('POST', '/api/loops', loop, authHeader);
    assert.equal(res.status, 400);
    assert.ok(res.body.error.includes('cron'));
  });

  test('POST /api/loops requires name', async () => {
    const loop = { frequency: '*/5 * * * *' };
    const res = await makeRequest('POST', '/api/loops', loop, authHeader);
    assert.equal(res.status, 400);
  });

  test('GET /api/loops lists all loops', async () => {
    const res = await makeRequest('GET', '/api/loops');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.loops));
    assert.ok(res.body.count >= 1);
  });

  test('GET /api/loops/:id gets specific loop', async () => {
    // First create one
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Get Test',
      frequency: '*/10 * * * *',
      enabled: false
    }, authHeader);

    const res = await makeRequest('GET', `/api/loops/${create.body.id}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.id, create.body.id);
  });

  test('GET /api/loops/:id returns 404 for unknown', async () => {
    const res = await makeRequest('GET', '/api/loops/loop-unknown');
    assert.equal(res.status, 404);
  });

  test('PUT /api/loops/:id updates loop', async () => {
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Update Test',
      frequency: '*/15 * * * *',
      enabled: false
    }, authHeader);

    const res = await makeRequest('PUT', `/api/loops/${create.body.id}`, {
      name: 'Updated Name',
      maxRetries: 5
    }, authHeader);

    assert.equal(res.status, 200);
    assert.equal(res.body.name, 'Updated Name');
    assert.equal(res.body.maxRetries, 5);
  });

  test('DELETE /api/loops/:id removes loop', async () => {
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Delete Test',
      frequency: '*/20 * * * *',
      enabled: false
    }, authHeader);

    const del = await makeRequest('DELETE', `/api/loops/${create.body.id}`, null, authHeader);
    assert.equal(del.status, 200);
    assert.equal(del.body.deleted, true);

    const get = await makeRequest('GET', `/api/loops/${create.body.id}`);
    assert.equal(get.status, 404);
  });
});

describe('Loop Scheduler - Auth', () => {
  test('POST /api/loops requires auth', async () => {
    const res = await makeRequest('POST', '/api/loops', { name: 'Test', frequency: '*/5 * * * *' });
    assert.equal(res.status, 401);
  });

  test('DELETE /api/loops/:id requires auth', async () => {
    const res = await makeRequest('DELETE', '/api/loops/loop-123');
    assert.equal(res.status, 401);
  });

  test('GET /api/loops works without auth (read-only)', async () => {
    const res = await makeRequest('GET', '/api/loops');
    assert.equal(res.status, 200);
  });
});

describe('Loop Scheduler - Execution', () => {
  const authHeader = { Authorization: 'Bearer test-key' };

  test('GET /api/loops/:id/executions returns history', async () => {
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Exec Test',
      frequency: '*/30 * * * *',
      actions: [{ name: 'test_action' }],
      enabled: false
    }, authHeader);

    const res = await makeRequest('GET', `/api/loops/${create.body.id}/executions`);
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.executions));
  });

  test('GET /api/executions/:id for unknown returns 404', async () => {
    const res = await makeRequest('GET', '/api/executions/exec-unknown');
    assert.equal(res.status, 404);
  });
});

describe('Loop Scheduler - Lifecycle', () => {
  const authHeader = { Authorization: 'Bearer test-key' };

  test('POST /api/loops/:id/stop stops a loop', async () => {
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Stop Test',
      frequency: '*/5 * * * *',
      enabled: true
    }, authHeader);

    const stop = await makeRequest('POST', `/api/loops/${create.body.id}/stop`, null, authHeader);
    assert.equal(stop.status, 200);
    assert.equal(stop.body.stopped, true);
  });

  test('POST /api/loops/:id/pause pauses a loop', async () => {
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Pause Test',
      frequency: '*/5 * * * *',
      enabled: true
    }, authHeader);

    const pause = await makeRequest('POST', `/api/loops/${create.body.id}/pause`, null, authHeader);
    assert.equal(pause.status, 200);
    assert.equal(pause.body.paused, true);
  });

  test('POST /api/loops/:id/resume resumes a paused loop', async () => {
    const create = await makeRequest('POST', '/api/loops', {
      name: 'Resume Test',
      frequency: '*/5 * * * *',
      enabled: false
    }, authHeader);

    const resume = await makeRequest('POST', `/api/loops/${create.body.id}/resume`, null, authHeader);
    assert.equal(resume.status, 200);
    assert.equal(resume.body.resumed, true);
  });
});

console.log('✅ Loop Scheduler tests loaded');
