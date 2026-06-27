/**
 * Connector Registry Tests
 * Port: 5374
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');

process.env.PORT = '5374';

const BASE_URL = 'http://localhost:5374';
let server = null;

// Simple HTTP client
async function request(path, method = 'GET', body = null) {
  return new Promise((resolve) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', () => resolve({ status: 503, data: {} }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Wait for server
async function waitForServer(maxRetries = 20) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await request('/health');
      if (res.status === 200) return true;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
  return false;
}

before(async () => {
  server = spawn('node', ['src/index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '5374' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const ready = await waitForServer();
  if (!ready) throw new Error('Server failed to start');
});

after(() => {
  if (server) server.kill();
});

describe('Connector Registry - Health', () => {
  it('should return healthy status', async () => {
    const res = await request('/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'healthy');
    assert.strictEqual(res.data.service, 'connector-registry');
  });

  it('should return ready status', async () => {
    const res = await request('/ready');
    assert.strictEqual(res.status, 200);
  });
});

describe('Connector Registry - List Connectors', () => {
  it('should list all connectors', async () => {
    const res = await request('/api/connectors');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.connectors));
    assert.ok(res.data.count > 0);
  });

  it('should have HTTP webhook connector', async () => {
    const res = await request('/api/connectors');

    const webhook = res.data.connectors.find(c => c.id === 'http-webhook');
    assert.ok(webhook, 'Should have http-webhook');
    assert.strictEqual(webhook.type, 'webhook');
  });

  it('should have Slack connector', async () => {
    const res = await request('/api/connectors');

    const slack = res.data.connectors.find(c => c.id === 'slack-message');
    assert.ok(slack, 'Should have slack-message');
  });

  it('should filter by type', async () => {
    const res = await request('/api/connectors?type=webhook');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.connectors.every(c => c.type === 'webhook'));
  });

  it('should search connectors', async () => {
    const res = await request('/api/connectors?search=slack');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.connectors.length > 0);
  });
});

describe('Connector Registry - Get Connector', () => {
  it('should get connector by ID', async () => {
    const res = await request('/api/connectors/http-webhook');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.connector);
    assert.strictEqual(res.data.connector.id, 'http-webhook');
  });

  it('should include fields schema', async () => {
    const res = await request('/api/connectors/http-webhook');

    assert.ok(res.data.connector.fields);
    assert.ok(res.data.connector.fields.length > 0);
  });

  it('should return 404 for non-existent', async () => {
    const res = await request('/api/connectors/non-existent');

    assert.strictEqual(res.status, 404);
  });
});

describe('Connector Registry - Custom Connectors', () => {
  it('should register custom connector', async () => {
    const res = await request('/api/connectors', 'POST', {
      id: 'custom-api',
      name: 'Custom API',
      type: 'custom',
      description: 'My custom connector',
      fields: [
        { name: 'endpoint', label: 'Endpoint', type: 'string', required: true }
      ]
    });

    assert.strictEqual(res.status, 201);
    assert.ok(res.data.connector);
    assert.strictEqual(res.data.connector.id, 'custom-api');
    assert.strictEqual(res.data.connector.isCustom, true);
  });

  it('should reject duplicate ID', async () => {
    const res = await request('/api/connectors', 'POST', {
      id: 'http-webhook',
      name: 'Duplicate',
      type: 'webhook'
    });

    assert.strictEqual(res.status, 409);
  });

  it('should require id, name, type', async () => {
    const res = await request('/api/connectors', 'POST', {
      name: 'Missing Fields'
    });

    assert.strictEqual(res.status, 400);
  });

  it('should delete custom connector', async () => {
    // First create
    await request('/api/connectors', 'POST', {
      id: 'to-delete',
      name: 'To Delete',
      type: 'custom'
    });

    // Then delete
    const res = await request('/api/connectors/to-delete', 'DELETE');

    assert.strictEqual(res.status, 200);

    // Verify it's gone
    const getRes = await request('/api/connectors/to-delete');
    assert.strictEqual(getRes.status, 404);
  });

  it('should not delete built-in connectors', async () => {
    const res = await request('/api/connectors/http-webhook', 'DELETE');

    assert.strictEqual(res.status, 403);
  });
});

describe('Connector Registry - Execution', () => {
  it('should execute webhook connector', async () => {
    const res = await request('/api/connectors/http-webhook/execute', 'POST', {
      params: {
        url: 'https://httpbin.org/post',
        method: 'POST',
        body: JSON.stringify({ test: true })
      }
    });

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.hasOwnProperty('success'));
    assert.ok(res.data.hasOwnProperty('executionId'));
  });

  it('should validate required fields', async () => {
    const res = await request('/api/connectors/http-webhook/execute', 'POST', {
      params: {
        method: 'POST'
        // Missing URL
      }
    });

    assert.strictEqual(res.status, 400);
    assert.ok(res.data.error.includes('Missing required fields'));
  });

  it('should return execution ID', async () => {
    const res = await request('/api/connectors/http-webhook/execute', 'POST', {
      params: {
        url: 'https://httpbin.org/get',
        method: 'GET'
      }
    });

    assert.ok(res.data.executionId);
  });
});

describe('Connector Registry - Execution Logs', () => {
  it('should list execution logs', async () => {
    const res = await request('/api/executions');

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.data.logs));
  });

  it('should filter by connector', async () => {
    const res = await request('/api/executions?connectorId=http-webhook');

    assert.strictEqual(res.status, 200);
    assert.ok(res.data.logs.every(l => l.connectorId === 'http-webhook'));
  });

  it('should get execution by ID', async () => {
    // First create an execution
    const execRes = await request('/api/connectors/http-webhook/execute', 'POST', {
      params: { url: 'https://httpbin.org/get', method: 'GET' }
    });

    // Get it
    const res = await request(`/api/executions/${execRes.data.executionId}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.execution.executionId, execRes.data.executionId);
  });
});
