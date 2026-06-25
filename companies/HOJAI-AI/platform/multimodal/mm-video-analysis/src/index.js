/**
 * mm-video-analysis — Multi-Modal Video Analysis (port 5353) — STUB
 *
 * Stub implementations:
 *   - detect_scenes: returns N scene segments with placeholders
 *   - classify_action: returns action label stub
 *   - detect_shot_boundaries: returns shot transition list
 *   - summarize: end-to-end summary with all signals
 *
 * Endpoints:
 *   POST /scenes                   detect scenes
 *   POST /actions                  classify actions
 *   POST /shots                    detect shot boundaries
 *   POST /summarize                full video summary
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

const PORT = parseInt(process.env.PORT || '5353', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-video-analysis-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const ACTION_LABELS = ['walking', 'running', 'sitting', 'talking', 'driving', 'cooking', 'reading', 'typing', 'sports', 'dancing'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Stub scene detection
function detectScenesStub(duration, bufSize) {
  const sceneCount = Math.max(1, Math.min(10, Math.floor(duration / 10)));
  const scenes = [];
  for (let i = 0; i < sceneCount; i++) {
    const start = Math.round((i * duration / sceneCount) * 100) / 100;
    const end = Math.round(((i + 1) * duration / sceneCount) * 100) / 100;
    scenes.push({
      index: i,
      start_seconds: start,
      end_seconds: end,
      label: `scene-${i + 1}`,
      confidence: 0.7,
    });
  }
  return { scene_count: sceneCount, scenes };
}
function classifyActionStub(buf) {
  const idx = (buf[0] || 0) % ACTION_LABELS.length;
  return { action: ACTION_LABELS[idx], confidence: 0.6, top_k: [{ action: ACTION_LABELS[idx], confidence: 0.6 }] };
}
function detectShotsStub(duration) {
  const shotCount = Math.max(1, Math.floor(duration / 3));
  const shots = [];
  for (let i = 0; i < shotCount; i++) {
    shots.push({
      index: i,
      start_seconds: Math.round(i * 3 * 100) / 100,
      end_seconds: Math.round((i + 1) * 3 * 100) / 100,
      transition: i === 0 ? 'start' : 'cut',
    });
  }
  return { shot_count: shotCount, shots };
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
    id: newId('va'),
    type,
    input_size: buf.length,
    duration_seconds: parseFloat(input.duration_seconds) || 0,
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
  app.use(express.json({ limit: '50mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-video-analysis', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/scenes', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const duration = parseFloat(req.body.duration_seconds) || 30;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('scenes', req.body, detectScenesStub(duration, buf.length));
    res.status(201).json(job);
  });

  app.post('/actions', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('actions', req.body, classifyActionStub(buf));
    res.status(201).json(job);
  });

  app.post('/shots', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const duration = parseFloat(req.body.duration_seconds) || 30;
    const job = createJob('shots', req.body, detectShotsStub(duration));
    res.status(201).json(job);
  });

  app.post('/summarize', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const duration = parseFloat(req.body.duration_seconds) || 30;
    const buf = Buffer.from(req.body.data, 'base64');
    const scenes = detectScenesStub(duration, buf.length);
    const shots = detectShotsStub(duration);
    const action = classifyActionStub(buf);
    const job = createJob('summarize', req.body, {
      duration_seconds: duration,
      scenes,
      shots,
      action,
      summary_text: `${scenes.scene_count} scenes, ${shots.shot_count} shots, primary action: ${action.action}`,
    });
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
  app.listen(PORT, () => console.log(`mm-video-analysis listening on ${PORT}`));
}

module.exports = { createApp };