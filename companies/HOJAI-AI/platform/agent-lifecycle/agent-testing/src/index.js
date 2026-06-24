/**
 * agent-testing — Unit / Integration / Smoke Test Runner
 * Port: 4912
 *
 * Records and runs test suites for agent versions. Each suite is a set of
 * named test cases. Supports:
 *   - unit tests (in-process checks)
 *   - integration tests (assertions against external systems)
 *   - smoke tests (basic liveness checks)
 * Reports: pass/fail counts, per-case results, duration.
 *
 * Storage: JSON file at $DATA_DIR/test_runs.json
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '4912', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'test_runs.json');

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ runs: [], suites: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { runs: [], suites: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

/** Validate suite/test case structure. */
function validateSuite(suite) {
  if (!suite || typeof suite !== 'object') return 'suite must be an object';
  if (!suite.name || typeof suite.name !== 'string') return 'suite.name is required';
  if (!Array.isArray(suite.tests)) return 'suite.tests must be an array';
  for (const t of suite.tests) {
    if (!t.name) return 'each test must have a name';
    if (!['unit', 'integration', 'smoke'].includes(t.kind)) return `invalid test kind: ${t.kind}`;
  }
  return null;
}

/** Run a registered suite and record results. */
function runSuite(suite) {
  const started = Date.now();
  const cases = suite.tests.map((t) => {
    const caseStart = Date.now();
    let status = 'pass';
    let error = null;
    try {
      // Suite's test "logic" is a small expression we evaluate.
      // Real services would invoke an LLM or a real check.
      // For lifecycle infra we evaluate an inline `expect` string.
      if (t.check) {
        const fn = new Function('return ' + t.check);
        const result = fn();
        if (!result) {
          status = 'fail';
          error = 'check returned falsy';
        }
      }
    } catch (e) {
      status = 'fail';
      error = e.message;
    }
    return { name: t.name, kind: t.kind, status, error, duration_ms: Date.now() - caseStart };
  });
  const passed = cases.filter((c) => c.status === 'pass').length;
  const failed = cases.length - passed;
  return {
    status: failed === 0 ? 'pass' : 'fail',
    cases,
    summary: { total: cases.length, passed, failed, duration_ms: Date.now() - started },
  };
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'agent-testing', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // Register a test suite
  app.post('/suites', requireInternal, (req, res) => {
    const { agentId, version, suite } = req.body || {};
    if (!agentId || !version) return res.status(400).json({ error: 'validation', message: 'agentId and version required' });
    const err = validateSuite(suite);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const data = loadAll();
    const key = `${agentId}@${version}`;
    data.suites[key] = { agent_id: agentId, version, suite, registered_at: nowIso() };
    saveAll(data);
    res.status(201).json({ key, suite_count: suite.tests.length });
  });

  // Get a registered suite
  app.get('/suites/:key', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.suites[req.params.key];
    if (!s) return res.status(404).json({ error: 'not_found' });
    res.json(s);
  });

  // List suites (optionally filter by agentId)
  app.get('/suites', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.entries(data.suites).map(([key, v]) => ({ key, ...v }));
    if (req.query.agentId) items = items.filter((i) => i.agent_id === req.query.agentId);
    res.json({ count: items.length, suites: items });
  });

  // Run a suite and record the result
  app.post('/suites/:key/run', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.suites[req.params.key];
    if (!s) return res.status(404).json({ error: 'not_found' });
    const result = runSuite(s.suite);
    const run = {
      id: newId('run'),
      key: req.params.key,
      agent_id: s.agent_id,
      version: s.version,
      started_at: nowIso(),
      ...result,
    };
    data.runs.push(run);
    // Cap to last 500 runs to avoid unbounded growth
    if (data.runs.length > 500) data.runs = data.runs.slice(-500);
    saveAll(data);
    res.status(201).json(run);
  });

  // List runs (optionally filter by key or agentId)
  app.get('/runs', requireInternal, (req, res) => {
    const data = loadAll();
    let runs = data.runs.slice();
    if (req.query.key) runs = runs.filter((r) => r.key === req.query.key);
    if (req.query.agentId) runs = runs.filter((r) => r.agent_id === req.query.agentId);
    if (req.query.status) runs = runs.filter((r) => r.status === req.query.status);
    // Default to last 50
    runs = runs.slice(-50).reverse();
    res.json({ count: runs.length, runs });
  });

  // Get one run
  app.get('/runs/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.runs.find((x) => x.id === req.params.id);
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  // Summary: pass rate per agent
  app.get('/summary', requireInternal, (_req, res) => {
    const data = loadAll();
    const byAgent = {};
    for (const r of data.runs) {
      const a = byAgent[r.agent_id] || (byAgent[r.agent_id] = { agent_id: r.agent_id, runs: 0, passed: 0, failed: 0, total_cases: 0 });
      a.runs += 1;
      if (r.status === 'pass') a.passed += 1; else a.failed += 1;
      a.total_cases += r.summary.total;
    }
    res.json({ agents: Object.values(byAgent) });
  });

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`[agent-testing] listening on :${PORT} data=${DATA_FILE}`));
}

module.exports = { createApp, runSuite, validateSuite };