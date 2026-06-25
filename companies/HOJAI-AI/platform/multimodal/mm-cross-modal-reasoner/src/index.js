/**
 * mm-cross-modal-reasoner — Multi-Modal Cross-Modal Reasoner (port 5355) — STUB
 *
 * Combines inputs from multiple modalities (image, audio, video, text) to:
 *   - caption + retrieve: caption an image, then retrieve similar items
 *   - find image matching audio cue: match audio transcript cue to images
 *   - fuse modalities: produce a unified understanding across modalities
 *   - answer multimodal query: combine modalities to answer a question
 *
 * Endpoints:
 *   POST /caption-retrieve        image → caption → retrieve similar
 *   POST /audio-to-image          audio cue → find matching image
 *   POST /fuse                    fuse multiple modalities
 *   POST /query                   multimodal QA
 *   GET  /jobs                    list reasoning jobs
 *   GET  /jobs/:id                get job
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5355', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-cross-modal-reasoner-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');

const MODALITIES = ['image', 'audio', 'video', 'text'];
const FUSION_STRATEGIES = ['concat', 'weighted-average', 'attention', 'late-fusion', 'early-fusion'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Simple token overlap similarity for stub matching
function tokenize(s) { return (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean); }
function jaccard(a, b) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const uni = sa.size + sb.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

// Stub captioning: hash-based deterministic caption
function captionStub(buf) {
  const seed = buf.length > 0 ? buf[0] + buf[buf.length - 1] : 0;
  const templates = [
    'a photo of an object on a table',
    'an outdoor scene with sky and ground',
    'a person in motion',
    'a building exterior',
    'an abstract colorful pattern',
    'food on a plate',
    'a vehicle on the road',
    'a landscape with mountains',
  ];
  return templates[seed % templates.length];
}

// Stub image matching: given audio transcript text, score against candidate captions
function matchImagesToAudioStub(audioText, candidates) {
  const ranked = candidates.map((c, i) => ({
    index: i,
    caption: c.caption || c.text || '',
    score: parseFloat(jaccard(audioText, c.caption || c.text || '').toFixed(3)),
    id: c.id || null,
  }));
  ranked.sort((a, b) => b.score - a.score);
  return ranked;
}

// Stub fusion: combine multiple modality representations into unified embedding
function fuseStub(modalities, strategy) {
  // Each modality contributes a numeric "representation" (we'll combine simple metrics)
  const parts = modalities.map((m) => ({
    modality: m.modality,
    bytes: (m.data || '').length,
    confidence: parseFloat((0.5 + (m.weight || 1) * 0.1).toFixed(3)),
  }));
  let unified_score;
  switch (strategy) {
    case 'weighted-average':
      unified_score = parts.reduce((s, p) => s + p.confidence * (p.bytes > 0 ? 1 : 0), 0) / Math.max(1, parts.length);
      break;
    case 'attention':
      unified_score = Math.max(...parts.map((p) => p.confidence));
      break;
    case 'concat':
      unified_score = parts.reduce((s, p) => s + p.confidence, 0) / parts.length;
      break;
    case 'late-fusion':
    case 'early-fusion':
    default:
      unified_score = parts.reduce((s, p) => s + p.confidence, 0) / parts.length;
  }
  return {
    strategy,
    parts,
    unified_score: parseFloat(unified_score.toFixed(3)),
    modalities_count: parts.length,
  };
}

// Stub multimodal QA
function answerStub(question, evidence) {
  const qTokens = tokenize(question);
  const scores = evidence.map((e) => {
    const score = jaccard(question, e.text || '');
    return { modality: e.modality, score: parseFloat(score.toFixed(3)), excerpt: (e.text || '').slice(0, 100) };
  });
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];
  let answer;
  if (!best || best.score < 0.1) {
    answer = 'insufficient evidence to answer confidently';
  } else {
    answer = `based on ${best.modality} evidence: ${best.excerpt}`;
  }
  return { answer, evidence_scores: scores };
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
function createJob(type, input, result) {
  const data = loadAll();
  const job = {
    id: newId('xr'),
    type,
    input_modalities: input.modalities || [],
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-cross-modal-reasoner', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/caption-retrieve', requireInternal, (req, res) => {
    if (!req.body || !req.body.data) return res.status(400).json({ error: 'validation', message: 'data (base64) required' });
    if (!Array.isArray(req.body.candidates)) return res.status(400).json({ error: 'validation', message: 'candidates array required' });
    const buf = Buffer.from(req.body.data, 'base64');
    const caption = captionStub(buf);
    const topK = parseInt(req.body.top_k || '3', 10);
    const ranked = matchImagesToAudioStub(caption, req.body.candidates).slice(0, topK);
    const job = createJob('caption-retrieve', { modalities: ['image', 'text'] }, {
      caption,
      ranked,
      candidates_count: req.body.candidates.length,
    });
    res.status(201).json(job);
  });

  app.post('/audio-to-image', requireInternal, (req, res) => {
    if (!req.body || !req.body.audio_text) return res.status(400).json({ error: 'validation', message: 'audio_text required' });
    if (!Array.isArray(req.body.images)) return res.status(400).json({ error: 'validation', message: 'images array required' });
    const topK = parseInt(req.body.top_k || '3', 10);
    const ranked = matchImagesToAudioStub(req.body.audio_text, req.body.images).slice(0, topK);
    const job = createJob('audio-to-image', { modalities: ['audio', 'image'] }, {
      audio_text: req.body.audio_text,
      ranked,
      images_count: req.body.images.length,
    });
    res.status(201).json(job);
  });

  app.post('/fuse', requireInternal, (req, res) => {
    if (!Array.isArray(req.body.modalities)) return res.status(400).json({ error: 'validation', message: 'modalities array required' });
    if (req.body.modalities.length === 0) return res.status(400).json({ error: 'validation', message: 'modalities cannot be empty' });
    const strategy = req.body.strategy || 'concat';
    if (!FUSION_STRATEGIES.includes(strategy)) {
      return res.status(400).json({ error: 'validation', message: `strategy must be one of: ${FUSION_STRATEGIES.join(', ')}` });
    }
    for (const m of req.body.modalities) {
      if (!MODALITIES.includes(m.modality)) {
        return res.status(400).json({ error: 'validation', message: `modality must be one of: ${MODALITIES.join(', ')}` });
      }
    }
    const fusion = fuseStub(req.body.modalities, strategy);
    const job = createJob('fuse', { modalities: req.body.modalities.map((m) => m.modality) }, fusion);
    res.status(201).json(job);
  });

  app.post('/query', requireInternal, (req, res) => {
    if (!req.body || !req.body.question) return res.status(400).json({ error: 'validation', message: 'question required' });
    if (!Array.isArray(req.body.evidence) || req.body.evidence.length === 0) {
      return res.status(400).json({ error: 'validation', message: 'evidence array (non-empty) required' });
    }
    const result = answerStub(req.body.question, req.body.evidence);
    const job = createJob('query', { modalities: result.evidence_scores.map((e) => e.modality) }, result);
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

  app.get('/strategies', requireInternal, (_req, res) => res.json({ strategies: FUSION_STRATEGIES }));
  app.get('/modalities', requireInternal, (_req, res) => res.json({ modalities: MODALITIES }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-cross-modal-reasoner listening on ${PORT}`));
}

module.exports = { createApp };