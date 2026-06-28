import { describe, it, expect, beforeEach } from 'vitest';
import { APP } from '../src/index.js';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

function resetData() {
  for (const f of ['datasets.json', 'jobs.json', 'models.json', 'training_metrics.json']) {
    const p = path.join(DATA_DIR, f);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}

function req(method, p, body = null) {
  return new Promise((resolve, reject) => {
    const server = APP.listen(0, () => {
      const { port } = server.address();
      const o = { hostname: 'localhost', port, path: p, method, headers: {} };
      if (body) o.headers['Content-Type'] = 'application/json';
      const r = http.request(o, (res) => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => { server.close(); try { resolve({ status: res.statusCode, body: JSON.parse(d) }); } catch { resolve({ status: res.statusCode, body: d }); } });
      });
      r.on('error', reject);
      if (body) r.write(JSON.stringify(body));
      r.end();
    });
  });
}

describe('fine-tuning API', () => {
  beforeEach(() => { resetData(); });

  it('GET /health returns ok', async () => {
    const r = await req('GET', '/health');
    expect(r.status).toBe(200);
    expect(r.body.status).toBe('ok');
  });

  // Datasets
  it('POST /api/datasets creates dataset', async () => {
    const r = await req('POST', '/api/datasets', { name: 'Train Data', source: 'uploaded', format: 'jsonl', rows: [{a:1}] });
    expect(r.status).toBe(201);
    expect(r.body.id).toBeDefined();
    expect(r.body.name).toBe('Train Data');
    expect(r.body.prepared).toBe(false);
  });

  it('GET /api/datasets lists datasets', async () => {
    await req('POST', '/api/datasets', { name: 'DS1', source: 'uploaded', format: 'jsonl' });
    await req('POST', '/api/datasets', { name: 'DS2', source: 'url', format: 'csv' });
    const r = await req('GET', '/api/datasets');
    expect(r.status).toBe(200);
    expect(r.body.datasets.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/datasets/:id returns dataset', async () => {
    const created = await req('POST', '/api/datasets', { name: 'Get Test', source: 'uploaded', format: 'jsonl' });
    const r = await req('GET', `/api/datasets/${created.body.id}`);
    expect(r.status).toBe(200);
    expect(r.body.name).toBe('Get Test');
  });

  it('GET /api/datasets/:id returns 404', async () => {
    const r = await req('GET', '/api/datasets/00000000-0000-0000-0000-000000000000');
    expect(r.status).toBe(404);
  });

  it('DELETE /api/datasets/:id deletes', async () => {
    const created = await req('POST', '/api/datasets', { name: 'Del', source: 'uploaded', format: 'jsonl' });
    const r = await req('DELETE', `/api/datasets/${created.body.id}`);
    expect(r.status).toBe(200);
  });

  it('POST /api/datasets/:id/prepare marks prepared', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'Prep', source: 'uploaded', format: 'jsonl' });
    const r = await req('POST', `/api/datasets/${ds.body.id}/prepare`);
    expect(r.status).toBe(200);
    expect(r.body.dataset.prepared).toBe(true);
  });

  it('POST /api/datasets without name returns 400', async () => {
    const r = await req('POST', '/api/datasets', { source: 'uploaded' });
    expect(r.status).toBe(400);
  });

  // Jobs
  it('POST /api/jobs creates job', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'For Job', source: 'uploaded', format: 'jsonl' });
    const r = await req('POST', '/api/jobs', { name: 'Test Job', datasetId: ds.body.id, baseModel: 'llama-3-8b' });
    expect(r.status).toBe(201);
    expect(r.body.status).toBe('draft');
    expect(r.body.baseModel).toBe('llama-3-8b');
  });

  it('GET /api/jobs lists jobs', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    await req('POST', '/api/jobs', { name: 'J1', datasetId: ds.body.id });
    await req('POST', '/api/jobs', { name: 'J2', datasetId: ds.body.id });
    const r = await req('GET', '/api/jobs');
    expect(r.status).toBe(200);
    expect(r.body.jobs.length).toBeGreaterThanOrEqual(2);
  });

  it('GET /api/jobs/:id returns job', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'Get Job', datasetId: ds.body.id });
    const r = await req('GET', `/api/jobs/${j.body.id}`);
    expect(r.status).toBe(200);
    expect(r.body.name).toBe('Get Job');
  });

  it('GET /api/jobs/:id returns 404', async () => {
    const r = await req('GET', '/api/jobs/00000000-0000-0000-0000-000000000000');
    expect(r.status).toBe(404);
  });

  it('POST /api/jobs/:id/start starts job', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'Start Me', datasetId: ds.body.id });
    const r = await req('POST', `/api/jobs/${j.body.id}/start`);
    expect(r.status).toBe(200);
    expect(r.body.job.status).toBe('training');
  });

  it('POST /api/jobs/:id/cancel cancels job', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'Cancel Me', datasetId: ds.body.id });
    const r = await req('POST', `/api/jobs/${j.body.id}/cancel`);
    expect(r.status).toBe(200);
    expect(r.body.job.status).toBe('cancelled');
  });

  it('POST /api/jobs/:id/queue queues job', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'Queue Me', datasetId: ds.body.id });
    const r = await req('POST', `/api/jobs/${j.body.id}/queue`);
    expect(r.status).toBe(200);
    expect(r.body.job.status).toBe('queued');
  });

  // Models
  it('GET /api/models lists models', async () => {
    const r = await req('GET', '/api/models');
    expect(r.status).toBe(200);
    expect(r.body.models).toBeInstanceOf(Array);
  });

  it('GET /api/models/:id returns 404 for unknown', async () => {
    const r = await req('GET', '/api/models/00000000-0000-0000-0000-000000000000');
    expect(r.status).toBe(404);
  });

  // Metrics
  it('GET /api/jobs/:id/metrics returns empty array', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'M Job', datasetId: ds.body.id });
    const r = await req('GET', `/api/jobs/${j.body.id}/metrics`);
    expect(r.status).toBe(200);
    expect(r.body.metrics).toHaveLength(0);
  });

  it('POST /api/jobs/:id/metrics/seed seeds mock metrics', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'Seed Job', datasetId: ds.body.id });
    const r = await req('POST', `/api/jobs/${j.body.id}/metrics/seed`, { steps: 10, epochs: 2 });
    expect(r.status).toBe(200);
    expect(r.body.count).toBe(10);
  });

  it('GET /api/jobs/:id/metrics/trend returns trend', async () => {
    const ds = await req('POST', '/api/datasets', { name: 'DS', source: 'uploaded', format: 'jsonl' });
    const j = await req('POST', '/api/jobs', { name: 'T Job', datasetId: ds.body.id });
    await req('POST', `/api/jobs/${j.body.id}/metrics/seed`, { steps: 5 });
    const r = await req('GET', `/api/jobs/${j.body.id}/metrics/trend`);
    expect(r.status).toBe(200);
    expect(r.body.trend.length).toBeGreaterThanOrEqual(3);
  });
});
