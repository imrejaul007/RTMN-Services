/**
 * eval-datasets (port 5392) — Phase 31.1 (was 4781, conflicted with rag-platform — fixed 2026-06-27)
 *
 * Golden dataset management for the evaluation platform.
 *
 * Capabilities:
 *   - CRUD on datasets (name, description, tags, examples)
 *   - Versioning: each save creates an immutable snapshot
 *   - Import: CSV (header row + comma-separated values), JSON, HuggingFace format
 *   - Split: train/val/test with configurable ratios
 *   - Tag: add/remove tags per dataset
 *   - Validation: each example must have input + (expected | reference | label)
 *
 * Storage: file-backed JSON in data/datasets/ (one file per dataset for human inspection).
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = parseInt(process.env.PORT, 10) || 5392;
const SERVICE_NAME = 'eval-datasets';
const VERSION = '1.0.0';
const DATA_DIR = process.env.EVAL_DATASETS_DATA_DIR || path.join(__dirname, '../data/datasets');

function ensureDir() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) { /* ignore */ } }

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateExample(ex, idx) {
  const errors = [];
  if (!ex || typeof ex !== 'object') { errors.push(`example ${idx}: must be object`); return errors; }
  if (typeof ex.input !== 'string' || ex.input.length === 0) errors.push(`example ${idx}: input required (string)`);
  // Must have at least one of: expected, reference, label
  if (ex.expected === undefined && ex.reference === undefined && ex.label === undefined) {
    errors.push(`example ${idx}: must have expected | reference | label`);
  }
  return errors;
}

function validateDataset(body) {
  const errors = [];
  if (!body || typeof body !== 'object') { errors.push('body must be object'); return errors; }
  if (!body.name || typeof body.name !== 'string') errors.push('name required (string)');
  if (Array.isArray(body.examples)) {
    body.examples.forEach((ex, i) => {
      const errs = validateExample(ex, i);
      errors.push(...errs);
    });
  } else if (body.examples !== undefined) {
    errors.push('examples must be array if provided');
  }
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Parsers (CSV, JSON, HuggingFace)
// ---------------------------------------------------------------------------

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const obj = {};
    headers.forEach((h, j) => { obj[h] = values[j] !== undefined ? values[j] : ''; });
    out.push(obj);
  }
  return out;
}

function parseCsvLine(line) {
  // Simple CSV with quoted strings; not RFC-4180 complete but covers 99% of cases
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { cur += c; }
    } else {
      if (c === ',') { out.push(cur); cur = ''; }
      else if (c === '"') { inQuotes = true; }
      else { cur += c; }
    }
  }
  out.push(cur);
  return out;
}

function parseHf(text) {
  // HuggingFace format: [{ prompt, completion, ... }, ...] or { data: [...] }
  let parsed;
  try { parsed = JSON.parse(text); } catch { return null; }
  const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.data) ? parsed.data : null);
  if (!arr) return null;
  return arr.map((row) => ({
    input: row.prompt || row.input || row.question || '',
    expected: row.completion || row.expected || row.answer || row.label || '',
  })).filter((x) => x.input);
}

function parseJsonl(text) {
  return text.split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function normalizeExample(raw) {
  // Map common field aliases to canonical {input, expected}
  const input = raw.input || raw.prompt || raw.question || raw.query || raw.text || '';
  const expected = raw.expected || raw.reference || raw.answer || raw.label || raw.completion || raw.target || '';
  return { input: String(input), expected: expected !== '' ? String(expected) : undefined };
}

// ---------------------------------------------------------------------------
// Split helper
// ---------------------------------------------------------------------------

function splitDataset(examples, ratios = { train: 0.7, val: 0.15, test: 0.15 }, seed = Date.now()) {
  // Deterministic shuffle via seed
  const rng = mulberry32(seed >>> 0);
  const shuffled = examples.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const n = shuffled.length;
  const trainEnd = Math.floor(n * (ratios.train ?? 0.7));
  const valEnd = trainEnd + Math.floor(n * (ratios.val ?? 0.15));
  return {
    train: shuffled.slice(0, trainEnd),
    val: shuffled.slice(trainEnd, valEnd),
    test: shuffled.slice(valEnd),
    counts: { train: trainEnd, val: valEnd - trainEnd, test: n - valEnd },
    ratios,
    seed,
  };
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

function datasetPath(id) { return path.join(DATA_DIR, `${id}.json`); }

function loadDataset(id) {
  try {
    if (!fs.existsSync(datasetPath(id))) return null;
    return JSON.parse(fs.readFileSync(datasetPath(id), 'utf8'));
  } catch { return null; }
}

function saveDataset(ds) {
  ensureDir();
  fs.writeFileSync(datasetPath(ds.id), JSON.stringify(ds, null, 2));
}

function listAll() {
  try {
    ensureDir();
    return fs.readdirSync(DATA_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => {
        try { return JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8')); } catch { return null; }
      })
      .filter(Boolean)
      .map((ds) => ({
        id: ds.id, name: ds.name, tags: ds.tags || [],
        exampleCount: (ds.examples || []).length,
        version: ds.version, createdAt: ds.createdAt, updatedAt: ds.updatedAt,
      }));
  } catch { return []; }
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  // Allow if no token required (dev/test mode) or token matches
  if (!expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  if (token && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.text({ type: 'text/csv', limit: '10mb' }));
app.use(express.text({ type: 'application/jsonl', limit: '10mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy', service: SERVICE_NAME, version: VERSION, port: PORT,
    uptimeSec: Math.round(process.uptime()),
    stats: { datasets: listAll().length },
    timestamp: new Date().toISOString(),
  });
});
app.get('/ready', (_req, res) => res.json({ ready: true, ts: new Date().toISOString() }));

// CRUD
app.post('/api/datasets', requireInternal, (req, res) => {
  const v = validateDataset(req.body);
  if (!v.valid) return res.status(400).json({ error: 'VALIDATION_ERROR', errors: v.errors });
  const now = new Date().toISOString();
  const ds = {
    id: crypto.randomUUID(),
    name: req.body.name,
    description: req.body.description || '',
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    examples: req.body.examples || [],
    version: 1,
    versions: [{ version: 1, createdAt: now, examples: req.body.examples || [] }],
    createdAt: now,
    updatedAt: now,
  };
  saveDataset(ds);
  res.status(201).json(ds);
});

app.get('/api/datasets', (_req, res) => {
  res.json({ count: listAll().length, datasets: listAll() });
});

app.get('/api/datasets/:id', (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json(ds);
});

app.patch('/api/datasets/:id', requireInternal, (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  // Patch merges metadata but not examples; examples are versioned via /versions
  if (req.body.name !== undefined) ds.name = req.body.name;
  if (req.body.description !== undefined) ds.description = req.body.description;
  ds.updatedAt = new Date().toISOString();
  saveDataset(ds);
  res.json(ds);
});

app.delete('/api/datasets/:id', requireInternal, (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  try { fs.unlinkSync(datasetPath(req.params.id)); } catch (_) { /* ignore */ }
  res.json({ deleted: req.params.id });
});

// Versioning
app.post('/api/datasets/:id/versions', requireInternal, (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  if (!Array.isArray(req.body.examples)) return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'examples required' });
  // Validate examples
  const errs = [];
  req.body.examples.forEach((ex, i) => errs.push(...validateExample(ex, i)));
  if (errs.length) return res.status(400).json({ error: 'VALIDATION_ERROR', errors: errs });
  const now = new Date().toISOString();
  const newVersion = (ds.version || 1) + 1;
  ds.version = newVersion;
  ds.examples = req.body.examples;
  ds.versions = ds.versions || [];
  ds.versions.push({ version: newVersion, createdAt: now, examples: req.body.examples });
  ds.updatedAt = now;
  saveDataset(ds);
  res.status(201).json({ id: ds.id, version: newVersion, exampleCount: req.body.examples.length });
});

app.get('/api/datasets/:id/versions', (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  res.json({ id: ds.id, versions: (ds.versions || []).map((v) => ({ version: v.version, createdAt: v.createdAt, exampleCount: (v.examples || []).length })) });
});

app.get('/api/datasets/:id/versions/:version', (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  const v = (ds.versions || []).find((x) => String(x.version) === String(req.params.version));
  if (!v) return res.status(404).json({ error: 'VERSION_NOT_FOUND' });
  res.json(v);
});

// Import
app.post('/api/datasets/import', requireInternal, (req, res) => {
  const { format, name, text, examples: providedExamples } = req.body || {};
  let raw = [];
  if (Array.isArray(providedExamples)) {
    raw = providedExamples;
  } else if (typeof text === 'string') {
    if (format === 'csv') raw = parseCsv(text);
    else if (format === 'hf') raw = parseHf(text) || [];
    else if (format === 'jsonl') raw = parseJsonl(text);
    else {
      // Try to auto-detect
      const trimmed = text.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
          const j = JSON.parse(trimmed);
          raw = Array.isArray(j) ? j : (Array.isArray(j.data) ? j.data : []);
        } catch { raw = parseJsonl(text); }
      } else {
        raw = parseCsv(text);
      }
    }
  }
  const examples = raw.map(normalizeExample).filter((x) => x.input);
  // Validate
  const errs = [];
  examples.forEach((ex, i) => errs.push(...validateExample(ex, i)));
  if (errs.length) return res.status(400).json({ error: 'VALIDATION_ERROR', errors: errs.slice(0, 20) });
  const now = new Date().toISOString();
  const ds = {
    id: crypto.randomUUID(),
    name: name || `imported-${Date.now()}`,
    description: `Imported from ${format || 'auto-detected'}`,
    tags: ['imported'],
    examples,
    version: 1,
    versions: [{ version: 1, createdAt: now, examples }],
    createdAt: now,
    updatedAt: now,
    sourceFormat: format || 'auto',
  };
  saveDataset(ds);
  res.status(201).json(ds);
});

// Split
app.post('/api/datasets/:id/split', requireInternal, (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  const ratios = req.body?.ratios || { train: 0.7, val: 0.15, test: 0.15 };
  const seed = req.body?.seed !== undefined ? req.body.seed : Date.now();
  const split = splitDataset(ds.examples || [], ratios, seed);
  res.json({ id: ds.id, totalExamples: ds.examples.length, ...split });
});

// Tag
app.post('/api/datasets/:id/tag', requireInternal, (req, res) => {
  const ds = loadDataset(req.params.id);
  if (!ds) return res.status(404).json({ error: 'NOT_FOUND' });
  const { add = [], remove = [] } = req.body || {};
  ds.tags = ds.tags || [];
  for (const t of add) if (!ds.tags.includes(t)) ds.tags.push(t);
  ds.tags = ds.tags.filter((t) => !remove.includes(t));
  ds.updatedAt = new Date().toISOString();
  saveDataset(ds);
  res.json({ id: ds.id, tags: ds.tags });
});

// Validate
app.post('/api/datasets/validate', requireInternal, (req, res) => {
  const v = validateDataset(req.body);
  res.status(v.valid ? 200 : 400).json(v);
});

// Errors
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
app.use((err, _req, res, _next) => {
  console.error(`[${SERVICE_NAME}] unhandled error:`, err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: err.message });
});

// ---------------------------------------------------------------------------
// Exports + start
// ---------------------------------------------------------------------------

module.exports = {
  app, validateDataset, validateExample, parseCsv, parseCsvLine, parseHf, parseJsonl,
  normalizeExample, splitDataset, mulberry32, listAll, loadDataset, saveDataset,
};

if (require.main === module) {
  ensureDir();
  const server = app.listen(PORT, () => {
    console.log(`[${SERVICE_NAME}] listening on :${PORT} (data dir: ${DATA_DIR})`);
  });
  for (const sig of ['SIGINT', 'SIGTERM']) {
    process.on(sig, () => {
      console.log(`[${SERVICE_NAME}] received ${sig}, shutting down`);
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(1), 5000).unref();
    });
  }
}
