import { describe, it, expect, beforeEach } from 'vitest';
import { APP } from '../src/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function resetData() {
  const runsFile = path.join(DATA_DIR, 'runs.json');
  const baselinesFile = path.join(DATA_DIR, 'baselines.json');
  if (fs.existsSync(runsFile)) fs.unlinkSync(runsFile);
  if (fs.existsSync(baselinesFile)) fs.unlinkSync(baselinesFile);
}

function makeRequest(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const server = APP.listen(0, () => {
      const { port } = server.address();
      const options = { hostname: 'localhost', port, path: reqPath, method };
      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      req.on('error', reject);
      if (body) { req.write(JSON.stringify(body)); }
      req.end();
    });
  });
}

describe('eval-continuous API', () => {
  beforeEach(() => { resetData(); });

  it('GET /health returns ok', async () => {
    const res = await makeRequest('GET', '/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('eval-continuous');
  });

  it('GET /ready returns ready', async () => {
    const res = await makeRequest('GET', '/ready');
    expect(res.status).toBe(200);
    expect(res.body.ready).toBe(true);
  });

  it('POST /api/runs creates a run and returns 201', async () => {
    const res = await makeRequest('POST', '/api/runs', { service: 'test-svc', suite: 'unit' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.service).toBe('test-svc');
    expect(res.body.suite).toBe('unit');
    expect(res.body.status).toBe('completed');
    expect(res.body.metrics).toBeDefined();
    expect(res.body.metrics.tests).toBeDefined();
    expect(res.body.verdict).toMatch(/^(pass|fail)$/);
  });

  it('POST /api/runs with async=true returns 202', async () => {
    const res = await makeRequest('POST', '/api/runs', { service: 'test-svc', suite: 'unit', async: true });
    expect(res.status).toBe(202);
    expect(res.body.message).toBe('Run started asynchronously');
  });

  it('GET /api/runs lists runs', async () => {
    await makeRequest('POST', '/api/runs', { service: 'svc-a', suite: 'unit' });
    await makeRequest('POST', '/api/runs', { service: 'svc-b', suite: 'e2e' });
    const res = await makeRequest('GET', '/api/runs');
    expect(res.status).toBe(200);
    expect(res.body.runs.length).toBeGreaterThanOrEqual(2);
    expect(res.body.total).toBe(res.body.runs.length);
  });

  it('GET /api/runs filters by service', async () => {
    await makeRequest('POST', '/api/runs', { service: 'filter-test', suite: 'unit' });
    await makeRequest('POST', '/api/runs', { service: 'other', suite: 'unit' });
    const res = await makeRequest('GET', '/api/runs?service=filter-test');
    expect(res.status).toBe(200);
    expect(res.body.runs.every(r => r.service === 'filter-test')).toBe(true);
  });

  it('GET /api/runs/:id returns run by id', async () => {
    const create = await makeRequest('POST', '/api/runs', { service: 'lookup-test', suite: 'unit' });
    const id = create.body.id;
    const res = await makeRequest('GET', `/api/runs/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('GET /api/runs/:id returns 404 for unknown id', async () => {
    const res = await makeRequest('GET', '/api/runs/nonexistent-id');
    expect(res.status).toBe(404);
  });

  it('POST /api/baseline sets a baseline', async () => {
    const res = await makeRequest('POST', '/api/baseline', {
      service: 'baseline-svc', suite: 'unit',
      metrics: { tests: { total: 10, passed: 9, failed: 1, skipped: 0 }, latency: { p50: 100, p95: 200, p99: 300 }, quality: 0.9, coverage: 0.8 }
    });
    expect(res.status).toBe(201);
    expect(res.body.service).toBe('baseline-svc');
    expect(res.body.suite).toBe('unit');
    expect(res.body.metrics.quality).toBe(0.9);
  });

  it('POST /api/baseline from runId works', async () => {
    const run = await makeRequest('POST', '/api/runs', { service: 'from-run', suite: 'unit' });
    const res = await makeRequest('POST', '/api/baseline', { service: 'from-run', suite: 'unit', runId: run.body.id });
    expect(res.status).toBe(201);
    expect(res.body.metrics).toBeDefined();
  });

  it('GET /api/baseline returns baseline', async () => {
    await makeRequest('POST', '/api/baseline', { service: 'get-test', suite: 'unit', metrics: { tests: { total: 10, passed: 10, failed: 0, skipped: 0 }, latency: { p50: 50, p95: 100, p99: 150 }, quality: 1.0, coverage: 0.9 } });
    const res = await makeRequest('GET', '/api/baseline?service=get-test&suite=unit');
    expect(res.status).toBe(200);
    expect(res.body.service).toBe('get-test');
  });

  it('GET /api/metrics returns current metrics', async () => {
    await makeRequest('POST', '/api/runs', { service: 'metrics-test', suite: 'unit' });
    const res = await makeRequest('GET', '/api/metrics?service=metrics-test&suite=unit');
    expect(res.status).toBe(200);
    expect(res.body.current).toBeDefined();
  });

  it('GET /api/metrics/trend returns trend data', async () => {
    await makeRequest('POST', '/api/runs', { service: 'trend-test', suite: 'unit' });
    const res = await makeRequest('GET', '/api/metrics/trend?service=trend-test&suite=unit');
    expect(res.status).toBe(200);
    expect(res.body.trend).toBeInstanceOf(Array);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/gates/:service returns gate status', async () => {
    await makeRequest('POST', '/api/runs', { service: 'gate-test', suite: 'unit' });
    const res = await makeRequest('GET', '/api/gates/gate-test?suite=unit');
    expect(res.status).toBe(200);
    expect(typeof res.body.gated).toBe('boolean');
    expect(res.body.service).toBe('gate-test');
    expect(res.body.checkedAt).toBeDefined();
  });

  it('POST /api/gates checks multiple services', async () => {
    await makeRequest('POST', '/api/runs', { service: 'multi-1', suite: 'unit' });
    await makeRequest('POST', '/api/runs', { service: 'multi-2', suite: 'unit' });
    const res = await makeRequest('POST', '/api/gates', { services: ['multi-1', 'multi-2'] });
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(2);
    expect(typeof res.body.allClear).toBe('boolean');
  });

  it('POST /api/runs without service returns 400', async () => {
    const res = await makeRequest('POST', '/api/runs', {});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('GET /api/runs/:id returns 404 for unknown id', async () => {
    const res = await makeRequest('GET', '/api/runs/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(404);
  });
});
