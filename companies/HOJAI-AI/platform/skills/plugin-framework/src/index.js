// Plugin Framework (4780)
// 3rd-party plugin runtime: registration, lifecycle, hooks, sandboxed execution.
// Plugins declare capabilities and hook into well-defined extension points.

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuid } from 'uuid';

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(morgan('tiny'));

const PORT = process.env.PORT || 4780;
const SERVICE = 'plugin-framework';

// ---------- In-memory stores ----------
const plugins = new Map();     // pluginId -> { id, name, version, author, capabilities, hooks, status, config }
const hooks = new Map();      // hookId -> { id, plugin_id, hook_point, handler, registered_at }
const executions = new Map(); // execId -> { id, plugin_id, hook_point, input, output, status, duration_ms, ts }
const sandboxRuns = new Map();// runId -> { id, plugin_id, code, result, sandboxed, duration_ms, ts }
const reviews = new Map();    // reviewId -> { id, plugin_id, rating, comment, reviewer }

const ALLOWED_HOOKS = [
  'pre-request', 'post-request',
  'pre-llm-call', 'post-llm-call',
  'on-user-create', 'on-order-create', 'on-payment-success',
  'transform-response', 'enrich-context',
  'ui-widget', 'dashboard-panel'
];

const ok = (data) => ({ ok: true, ...data });
const fail = (msg, code = 400) => ({ ok: false, error: msg });

// ---------- Sandbox ----------
// Lightweight JS sandbox: parses function body, executes with timeout, catches errors.
// Uses worker_threads for true isolation so infinite loops don't block the event loop.
import { Worker } from 'worker_threads';
function runSandboxed(code, input, timeoutMs = 500) {
  const start = Date.now();
  return new Promise((resolve) => {
    let worker;
    let resolved = false;
    const finish = (result) => {
      if (resolved) return;
      resolved = true;
      if (worker) try { worker.terminate(); } catch (_) {}
      resolve(result);
    };
    try {
      worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        try {
          const fn = new Function('input', workerData.code);
          const result = fn(workerData.input);
          parentPort.postMessage({ ok: true, result, duration_ms: Date.now() - workerData.start });
        } catch (e) {
          parentPort.postMessage({ ok: false, error: e.message, duration_ms: Date.now() - workerData.start });
        }
      `, { eval: true, workerData: { code, input, start: Date.now() } });
      const timer = setTimeout(() => finish({ ok: false, error: 'timeout', duration_ms: Date.now() - start }), timeoutMs);
      worker.on('message', (msg) => { clearTimeout(timer); finish({ ...msg, duration_ms: Date.now() - start }); });
      worker.on('error', (err) => { clearTimeout(timer); finish({ ok: false, error: err.message, duration_ms: Date.now() - start }); });
      worker.on('exit', (code) => {
        clearTimeout(timer);
        if (!resolved) finish({ ok: false, error: 'worker_exit_' + code, duration_ms: Date.now() - start });
      });
    } catch (e) {
      finish({ ok: false, error: e.message, duration_ms: Date.now() - start });
    }
  });
}

// ---------- Seed ----------
function seed() {
  const seedPlugins = [
    {
      name: 'salesforce-sync',
      version: '1.2.0',
      author: 'hojai-team',
      capabilities: ['sync-contacts', 'sync-opportunities'],
      hooks: ['pre-request', 'transform-response'],
      config: { api_url: 'https://api.salesforce.com', rate_limit: 100 }
    },
    {
      name: 'sentiment-analyzer',
      version: '0.8.0',
      author: 'community',
      capabilities: ['analyze-text', 'score-emotion'],
      hooks: ['post-llm-call', 'enrich-context'],
      config: { model: 'sentiment-v1' }
    },
    {
      name: 'audit-logger',
      version: '1.0.0',
      author: 'hojai-team',
      capabilities: ['log-event', 'export-logs'],
      hooks: ['on-order-create', 'on-payment-success', 'on-user-create'],
      config: { retention_days: 90, destination: 's3://audit-logs' }
    }
  ];
  seedPlugins.forEach(p => {
    const id = uuid();
    plugins.set(id, { id, ...p, status: 'active', installed: new Date().toISOString() });
    // Register hooks
    p.hooks.forEach(hookPoint => {
      const hid = uuid();
      hooks.set(hid, {
        id: hid, plugin_id: id, hook_point: hookPoint,
        handler: `${p.name}.on_${hookPoint.replace(/-/g, '_')}`,
        registered_at: new Date().toISOString()
      });
    });
  });
}

// ---------- Routes ----------

app.get('/health', (_req, res) => res.json(ok({ service: SERVICE, port: PORT, status: 'healthy' })));
app.get('/', (_req, res) => res.json(ok({
  service: SERVICE,
  allowed_hooks: ALLOWED_HOOKS,
  endpoints: ['/api/plugins', '/api/plugins/:id', '/api/plugins/:id/hooks',
              '/api/plugins/:id/execute', '/api/plugins/:id/run-sandboxed',
              '/api/hooks', '/api/hooks/fire', '/api/reviews']
})));

// Plugins
app.get('/api/plugins', (_req, res) => res.json(ok({ plugins: [...plugins.values()] })));
app.get('/api/plugins/:id', (req, res) => {
  const p = plugins.get(req.params.id);
  if (!p) return res.status(404).json(fail('plugin not found'));
  res.json(ok({ plugin: p }));
});
app.post('/api/plugins', (req, res) => {
  const { name, version, author, capabilities = [], hooks: hookList = [], config = {} } = req.body || {};
  if (!name) return res.status(400).json(fail('name required'));
  // Validate hooks
  const invalid = hookList.filter(h => !ALLOWED_HOOKS.includes(h));
  if (invalid.length) return res.status(400).json(fail(`invalid hooks: ${invalid.join(',')}`));
  const id = uuid();
  const plugin = { id, name, version: version || '0.1.0', author: author || 'unknown',
    capabilities, hooks: hookList, config, status: 'pending_review', installed: new Date().toISOString() };
  plugins.set(id, plugin);
  hookList.forEach(hookPoint => {
    const hid = uuid();
    hooks.set(hid, { id: hid, plugin_id: id, hook_point: hookPoint,
      handler: `${name}.on_${hookPoint.replace(/-/g, '_')}`, registered_at: new Date().toISOString() });
  });
  res.status(201).json(ok({ plugin }));
});

app.post('/api/plugins/:id/activate', (req, res) => {
  const p = plugins.get(req.params.id);
  if (!p) return res.status(404).json(fail('plugin not found'));
  p.status = 'active';
  plugins.set(p.id, p);
  res.json(ok({ plugin: p }));
});

app.post('/api/plugins/:id/deactivate', (req, res) => {
  const p = plugins.get(req.params.id);
  if (!p) return res.status(404).json(fail('plugin not found'));
  p.status = 'inactive';
  plugins.set(p.id, p);
  res.json(ok({ plugin: p }));
});

app.delete('/api/plugins/:id', (req, res) => {
  if (!plugins.has(req.params.id)) return res.status(404).json(fail('plugin not found'));
  plugins.delete(req.params.id);
  // Cleanup hooks
  [...hooks.values()].filter(h => h.plugin_id === req.params.id).forEach(h => hooks.delete(h.id));
  res.json(ok({ deleted: true, id: req.params.id }));
});

// Plugin hooks
app.get('/api/plugins/:id/hooks', (req, res) => {
  if (!plugins.has(req.params.id)) return res.status(404).json(fail('plugin not found'));
  const list = [...hooks.values()].filter(h => h.plugin_id === req.params.id);
  res.json(ok({ plugin_id: req.params.id, hooks: list }));
});

// Execute a hook
app.post('/api/hooks/fire', async (req, res) => {
  const { hook_point, input = {} } = req.body || {};
  if (!hook_point) return res.status(400).json(fail('hook_point required'));
  if (!ALLOWED_HOOKS.includes(hook_point)) return res.status(400).json(fail('unknown hook_point'));
  // Find all active plugins listening on this hook
  const listening = [...hooks.values()]
    .filter(h => h.hook_point === hook_point)
    .map(h => plugins.get(h.plugin_id))
    .filter(p => p && p.status === 'active');
  const results = [];
  for (const p of listening) {
    const execId = uuid();
    const start = Date.now();
    // Run a tiny default handler (in real impl this would dispatch to plugin code)
    let output;
    try {
      output = await runSandboxed(`
        return Object.assign({}, input, { _enriched_by: '${p.name}', _hook: '${hook_point}' });
      `, input);
    } catch (e) {
      output = { ok: false, error: e.message };
    }
    const duration = Date.now() - start;
    const exec = { id: execId, plugin_id: p.id, hook_point, input,
      output: output.result || output, status: output.ok ? 'success' : 'failed',
      duration_ms: duration, ts: new Date().toISOString() };
    executions.set(execId, exec);
    results.push(exec);
  }
  res.json(ok({ hook_point, fired: results.length, results }));
});

// Run arbitrary plugin code in sandbox
app.post('/api/plugins/:id/run-sandboxed', async (req, res) => {
  const { code, input = {}, timeout_ms = 500 } = req.body || {};
  if (!plugins.has(req.params.id)) return res.status(404).json(fail('plugin not found'));
  if (!code) return res.status(400).json(fail('code required'));
  if (code.length > 50000) return res.status(400).json(fail('code too large (max 50KB)'));
  const id = uuid();
  const result = await runSandboxed(code, input, timeout_ms);
  const run = { id, plugin_id: req.params.id, code: code.slice(0, 200) + (code.length > 200 ? '...' : ''),
    sandboxed: true, ...result, ts: new Date().toISOString() };
  sandboxRuns.set(id, run);
  res.json(ok({ run }));
});

// Hook listing
app.get('/api/hooks', (_req, res) => res.json(ok({ hooks: [...hooks.values()] })));
app.get('/api/hooks/by-point/:point', (req, res) => {
  const list = [...hooks.values()].filter(h => h.hook_point === req.params.point);
  res.json(ok({ hook_point: req.params.point, hooks: list }));
});

// Reviews
app.post('/api/reviews', (req, res) => {
  const { plugin_id, rating, comment, reviewer } = req.body || {};
  if (!plugin_id || !rating) return res.status(400).json(fail('plugin_id + rating required'));
  if (!plugins.has(plugin_id)) return res.status(404).json(fail('plugin not found'));
  if (rating < 1 || rating > 5) return res.status(400).json(fail('rating must be 1-5'));
  const id = uuid();
  const review = { id, plugin_id, rating, comment, reviewer, ts: new Date().toISOString() };
  reviews.set(id, review);
  res.status(201).json(ok({ review }));
});

app.get('/api/plugins/:id/reviews', (req, res) => {
  if (!plugins.has(req.params.id)) return res.status(404).json(fail('plugin not found'));
  const list = [...reviews.values()].filter(r => r.plugin_id === req.params.id);
  const avg = list.length ? list.reduce((a, r) => a + r.rating, 0) / list.length : 0;
  res.json(ok({ plugin_id: req.params.id, count: list.length, avg_rating: avg, reviews: list }));
});

seed();
app.listen(PORT, () => console.log(`${SERVICE} listening on ${PORT}`));