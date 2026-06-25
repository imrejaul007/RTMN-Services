/**
 * mm-image-understanding — Multi-Modal Image Understanding (port 5351) — STUB
 *
 * Stub implementations of:
 *   - detect_objects: returns 1 fake bounding box detection
 *   - classify_scene: returns placeholder scene label
 *   - caption: returns placeholder caption
 *   - dominant_colors: deterministic palette from byte hash
 *
 * Endpoints:
 *   POST /detect/objects           object detection
 *   POST /classify/scene           scene classification
 *   POST /caption                  image captioning
 *   POST /colors/dominant          palette extraction
 *   POST /understand               all-in-one (calls every endpoint)
 *   GET  /jobs                     list analysis jobs
 *   GET  /jobs/:id                 get job
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5351', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-image-understanding-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SCENE_LABELS = ['indoor', 'outdoor', 'portrait', 'landscape', 'document', 'product', 'food', 'animal', 'building', 'vehicle'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Stub: returns 1 fake detection
function detectObjects(buf) {
  return [{
    label: 'object',
    confidence: 0.5 + (buf.length % 50) / 100,
    bbox: [0, 0, Math.min(100, buf.length % 100), Math.min(100, (buf.length * 7) % 100)],
  }];
}
function classifyScene(buf) {
  const idx = buf.length % SCENE_LABELS.length;
  return { label: SCENE_LABELS[idx], confidence: 0.7, top_k: [{ label: SCENE_LABELS[idx], confidence: 0.7 }] };
}
function caption(buf) {
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8);
  return `An image (${buf.length} bytes, #${hash})`;
}
function dominantColors(buf, count) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const r = (buf[i % buf.length] || 0) ^ i;
    const g = (buf[(i + 1) % buf.length] || 0) ^ (i * 2);
    const b = (buf[(i + 2) % buf.length] || 0) ^ (i * 3);
    out.push({
      rgb: [r % 256, g % 256, b % 256],
      hex: '#' + [r, g, b].map((x) => (x % 256).toString(16).padStart(2, '0')).join(''),
      weight: Math.round((1 / (i + 1)) * 1000) / 1000,
    });
  }
  return out;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
function requireData(req, res) {
  if (!req.body || !req.body.data) {
    res.status(400).json({ error: 'validation', message: 'data (base64) required' });
    return false;
  }
  return true;
}
function createJob(type, input, result) {
  const data = loadAll();
  const buf = Buffer.from(input.data || '', 'base64');
  const job = {
    id: newId('iu'),
    type,
    input_size: buf.length,
    result,
    status: 'completed',
    created_at: nowIso(),
  };
  data.jobs[job.id] = job;
  saveAll(data);
  return job;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-image-understanding', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/detect/objects', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('detect_objects', req.body, { detections: detectObjects(buf), count: 1 });
    res.status(201).json(job);
  });

  app.post('/classify/scene', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('classify_scene', req.body, classifyScene(buf));
    res.status(201).json(job);
  });

  app.post('/caption', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('caption', req.body, { caption: caption(buf), confidence: 0.6 });
    res.status(201).json(job);
  });

  app.post('/colors/dominant', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const count = parseInt(req.body.count || '5', 10);
    if (count < 1 || count > 20) return res.status(400).json({ error: 'invalid_count' });
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('dominant_colors', req.body, { count, colors: dominantColors(buf, count) });
    res.status(201).json(job);
  });

  app.post('/understand', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const result = {
      detections: detectObjects(buf),
      scene: classifyScene(buf),
      caption: { caption: caption(buf), confidence: 0.6 },
      colors: dominantColors(buf, 3),
    };
    const job = createJob('understand', req.body, result);
    res.status(201).json(job);
  });

  app.get('/jobs', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.jobs);
    if (req.query.type) items = items.filter((j) => j.type === req.query.type);
    const limit = parseInt(req.query.limit || '50', 10);
    items = items.sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, limit);
    res.json({ count: items.length, jobs: items });
  });

  app.get('/jobs/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const j = data.jobs[req.params.id];
    if (!j) return res.status(404).json({ error: 'not_found' });
    res.json(j);
  });

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-image-understanding listening on ${PORT}`));
}

module.exports = { createApp };