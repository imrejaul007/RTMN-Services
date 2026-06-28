// AIOps OS tests
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';

function httpReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'localhost', port: 4898, path, method, headers: {} };
    if (body) { const json = JSON.stringify(body); opts.headers['Content-Type'] = 'application/json'; opts.headers['Content-Length'] = Buffer.byteLength(json); }
    const req = http.request(opts, (res) => { let data = ''; res.on('data', c => { data += c; }); res.on('end', () => { try { resolve({ status: res.statusCode, body: JSON.parse(data) }); } catch { resolve({ status: res.statusCode, body: data }); } }); });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

let server;
describe('AIOps OS HTTP API', () => {
  beforeAll(async () => { const mod = await import('../../src/index.js'); server = mod.default; await new Promise(r => setTimeout(r, 200)); });
  afterAll(() => { if (server) server.close(); });

  it('GET /health', async () => { const r = await httpReq('GET', '/health'); expect(r.status).toBe(200); expect(r.body.status).toBe('healthy'); });
  it('GET /ready', async () => { const r = await httpReq('GET', '/ready'); expect(r.status).toBe(200); expect(r.body.ready).toBe(true); });

  // Metrics
  it('POST /api/metrics', async () => { const r = await httpReq('POST', '/api/metrics', { service: 'api-gateway', name: 'request_count', value: 1500 }); expect(r.status).toBe(201); expect(r.body.service).toBe('api-gateway'); expect(r.body.name).toBe('request_count'); });
  it('POST /api/metrics → 400 without required', async () => { const r = await httpReq('POST', '/api/metrics', { service: 'svc' }); expect(r.status).toBe(400); });
  it('GET /api/metrics', async () => { const r = await httpReq('GET', '/api/metrics'); expect(r.status).toBe(200); expect(r.body.metrics).toBeTruthy(); });
  it('GET /api/metrics?service=api-gateway', async () => { const r = await httpReq('GET', '/api/metrics?service=api-gateway'); expect(r.status).toBe(200); });
  it('GET /api/metrics/summary', async () => { const r = await httpReq('GET', '/api/metrics/summary'); expect(r.status).toBe(200); expect(r.body.summary).toBeTruthy(); });

  // Alerts
  it('POST /api/alerts', async () => { const r = await httpReq('POST', '/api/alerts', { name: 'High CPU', service: 'api-gateway', severity: 'high' }); expect(r.status).toBe(201); expect(r.body.state).toBe('firing'); expect(r.body.id).toBeTruthy(); });
  it('POST /api/alerts → 400 without name', async () => { const r = await httpReq('POST', '/api/alerts', { service: 'svc' }); expect(r.status).toBe(400); });
  it('GET /api/alerts', async () => { const r = await httpReq('GET', '/api/alerts'); expect(r.status).toBe(200); expect(r.body.alerts).toBeTruthy(); });
  it('GET /api/alerts?state=firing', async () => { const r = await httpReq('GET', '/api/alerts?state=firing'); expect(r.status).toBe(200); });
  it('GET /api/alerts/:id', async () => { const create = await httpReq('POST', '/api/alerts', { name: 'Test', service: 'svc', severity: 'medium' }); const r = await httpReq('GET', `/api/alerts/${create.body.id}`); expect(r.status).toBe(200); expect(r.body.name).toBe('Test'); });
  it('POST /api/alerts/:id/acknowledge', async () => { const create = await httpReq('POST', '/api/alerts', { name: 'Ack Test', service: 'svc', severity: 'medium' }); const r = await httpReq('POST', `/api/alerts/${create.body.id}/acknowledge`); expect(r.status).toBe(200); expect(r.body.state).toBe('acknowledged'); });
  it('POST /api/alerts/:id/resolve', async () => { const create = await httpReq('POST', '/api/alerts', { name: 'Resolve Test', service: 'svc', severity: 'low' }); const r = await httpReq('POST', `/api/alerts/${create.body.id}/resolve`); expect(r.status).toBe(200); expect(r.body.state).toBe('resolved'); });
  it('POST /api/alerts/:id/snooze', async () => { const create = await httpReq('POST', '/api/alerts', { name: 'Snooze Test', service: 'svc', severity: 'info' }); const r = await httpReq('POST', `/api/alerts/${create.body.id}/snooze`, { duration: 3600 }); expect(r.status).toBe(200); expect(r.body.state).toBe('snoozed'); expect(r.body.snoozedUntil).toBeTruthy(); });

  // Incidents
  it('POST /api/incidents', async () => { const r = await httpReq('POST', '/api/incidents', { title: 'API Down', severity: 'critical', service: 'api-gateway' }); expect(r.status).toBe(201); expect(r.body.state).toBe('open'); expect(r.body.timeline).toHaveLength(1); });
  it('POST /api/incidents → 400 without title', async () => { const r = await httpReq('POST', '/api/incidents', { service: 'svc' }); expect(r.status).toBe(400); });
  it('GET /api/incidents', async () => { const r = await httpReq('GET', '/api/incidents'); expect(r.status).toBe(200); expect(r.body.incidents).toBeTruthy(); });
  it('GET /api/incidents/:id', async () => { const create = await httpReq('POST', '/api/incidents', { title: 'Get Test', service: 'svc' }); const r = await httpReq('GET', `/api/incidents/${create.body.id}`); expect(r.status).toBe(200); expect(r.body.title).toBe('Get Test'); });
  it('POST /api/incidents/:id/timeline', async () => { const create = await httpReq('POST', '/api/incidents', { title: 'Timeline Test', service: 'svc' }); const r = await httpReq('POST', `/api/incidents/${create.body.id}/timeline`, { event: 'investigating', note: 'Looking into it' }); expect(r.status).toBe(200); expect(r.body.timeline).toHaveLength(2); });
  it('POST /api/incidents/:id/transition', async () => { const create = await httpReq('POST', '/api/incidents', { title: 'Trans Test', service: 'svc' }); const r = await httpReq('POST', `/api/incidents/${create.body.id}/transition`, { toState: 'investigating' }); expect(r.status).toBe(200); expect(r.body.state).toBe('investigating'); });
  it('POST /api/incidents/:id/transition → 400 invalid state', async () => { const create = await httpReq('POST', '/api/incidents', { title: 'Invalid', service: 'svc' }); const r = await httpReq('POST', `/api/incidents/${create.body.id}/transition`, { toState: 'invalid_state' }); expect(r.status).toBe(400); });

  // Dashboards
  it('POST /api/dashboards', async () => { const r = await httpReq('POST', '/api/dashboards', { name: 'Ops Dashboard', description: 'Main ops view', widgets: [{ type: 'metric', metric: 'request_count' }] }); expect(r.status).toBe(201); expect(r.body.id).toBeTruthy(); });
  it('POST /api/dashboards → 400 without name', async () => { const r = await httpReq('POST', '/api/dashboards', {}); expect(r.status).toBe(400); });
  it('GET /api/dashboards', async () => { const r = await httpReq('GET', '/api/dashboards'); expect(r.status).toBe(200); expect(r.body.dashboards).toBeTruthy(); });
  it('GET /api/dashboards/:id', async () => { const create = await httpReq('POST', '/api/dashboards', { name: 'Get Dash' }); const r = await httpReq('GET', `/api/dashboards/${create.body.id}`); expect(r.status).toBe(200); expect(r.body.name).toBe('Get Dash'); });
  it('DELETE /api/dashboards/:id', async () => { const create = await httpReq('POST', '/api/dashboards', { name: 'Delete Dash' }); const r = await httpReq('DELETE', `/api/dashboards/${create.body.id}`); expect(r.status).toBe(200); expect(r.body.deleted).toBe(true); });

  // Status
  it('GET /api/status', async () => { const r = await httpReq('GET', '/api/status'); expect(r.status).toBe(200); expect(r.body).toHaveProperty('overall'); expect(r.body).toHaveProperty('timestamp'); });
  it('GET /api/health/:service', async () => { const r = await httpReq('GET', '/api/health/api-gateway'); expect(r.status).toBe(200); expect(r.body.service).toBe('api-gateway'); expect(r.body).toHaveProperty('healthScore'); });
});
