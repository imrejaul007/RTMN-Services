// Observability APIs (4172) — public query API on top of centralized-observability
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet()); app.use(cors()); app.use(compression());
app.use(express.json({ limit: '5mb' })); app.use(morgan('tiny'));

const PORT = process.env.PORT || 4172;
const SERVICE = 'observability-apis';
const UPSTREAM = process.env.OBSERVABILITY_UPSTREAM || 'http://localhost:4153';

const queries = new Map(); // saved queries
const dashboards = new Map();

const ok = (d) => ({ ok: true, ...d });
const fail = (m, c = 400) => ({ ok: false, error: m });

function seed() {
  const q = [
    { name: 'requests_per_service', query_type: 'metrics_aggregate', params: { name: 'http_requests_total' } },
    { name: 'p99_latency', query_type: 'metrics_aggregate', params: { name: 'ai_inference_seconds' } },
    { name: 'error_logs', query_type: 'logs_search', params: { level: 'error' } },
    { name: 'firing_alerts', query_type: 'alerts_list', params: { status: 'firing' } }
  ];
  q.forEach(qq => { const id = uuid(); queries.set(id, { id, ...qq, created_at: new Date().toISOString() }); });

  const d = [
    { name: 'Service Health', panels: ['requests_per_service', 'p99_latency', 'error_logs', 'firing_alerts'] }
  ];
  d.forEach(dd => { const id = uuid(); dashboards.set(id, { id, ...dd }); });
}

async function proxy(path, params = {}) {
  const url = new URL(UPSTREAM + path);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, v);
  try {
    const r = await fetch(url);
    return await r.json();
  } catch (e) {
    return { ok: false, error: 'upstream unreachable', detail: String(e) };
  }
}

app.get('/health', (_q, r) => r.json(ok({ service: SERVICE, port: PORT, status: 'healthy', upstream: UPSTREAM, queries: queries.size })));
app.get('/ready', (_q, r) => r.json(ok({ ready: true })));

// Saved queries
app.get('/api/queries', (_q, r) => r.json(ok({ queries: [...queries.values()], count: queries.size })));
app.post('/api/queries', (req, res) => {
  const { name, query_type, params } = req.body || {};
  if (!name || !query_type) return res.status(400).json(fail('name, query_type required'));
  const id = uuid();
  const q = { id, name, query_type, params: params || {}, created_at: new Date().toISOString() };
  queries.set(id, q);
  res.status(201).json(ok({ query: q }));
});

// Execute a saved query (proxies to upstream)
app.post('/api/queries/:id/execute', async (req, res) => {
  const q = queries.get(req.params.id);
  if (!q) return res.status(404).json(fail('not found'));
  let result;
  if (q.query_type === 'metrics_aggregate') {
    const name = q.params.name || (req.body && req.body.name);
    const service = q.params.service || (req.body && req.body.service);
    result = await proxy('/api/metrics/aggregate', { name, service });
  } else if (q.query_type === 'logs_search') {
    result = await proxy('/api/logs', { ...q.params, ...(req.body || {}) });
  } else if (q.query_type === 'alerts_list') {
    result = await proxy('/api/alerts', q.params);
  } else {
    return res.status(400).json(fail('unknown query_type'));
  }
  res.json(ok({ query: q, result }));
});

// Direct passthrough endpoints
app.get('/api/metrics/:name/aggregate', async (req, res) => {
  const result = await proxy('/api/metrics/aggregate', { name: req.params.name, service: req.query.service });
  res.json(result);
});
app.get('/api/logs/search', async (req, res) => {
  const result = await proxy('/api/logs', { q: req.query.q, level: req.query.level, service: req.query.service });
  res.json(result);
});

app.get('/api/dashboards', (_q, r) => r.json(ok({ dashboards: [...dashboards.values()], count: dashboards.size })));

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));