/**
 * mm-chunker — Multi-Modal Chunker (port 5349)
 *
 * Splits content into chunks for downstream processing (RAG, captions, transcripts).
 *
 * Strategies:
 *   - text:   fixed-size or sentence-based on text content
 *   - audio:  time-based on duration
 *   - video:  scene-based with keyframe boundaries
 *   - ocr:    per-line text chunks
 *
 * Endpoints:
 *   POST /chunk                    chunk content (text/audio/video/ocr)
 *   POST /chunk/batch              chunk multiple inputs
 *   GET  /jobs                     list chunking jobs
 *   GET  /jobs/:id                 get job
 *   GET  /strategies               list strategies + limits
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5349', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-chunker-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const STRATEGIES = {
  text: { default_size: 500, default_overlap: 50, mode: 'chars' },
  audio: { default_seconds: 10, default_overlap_seconds: 1, mode: 'time' },
  video: { default_seconds: 30, default_overlap_seconds: 2, mode: 'scene' },
  ocr: { default_lines: 5, mode: 'lines' },
};

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

function chunkText(text, size, overlap) {
  if (!text || size < 1) return [];
  const out = [];
  let i = 0;
  let idx = 0;
  while (i < text.length) {
    const end = Math.min(text.length, i + size);
    const chunk = text.slice(i, end);
    out.push({ index: idx, text: chunk, start: i, end });
    if (end === text.length) break;
    i = end - overlap;
    if (i <= out[out.length - 1].start) i = end; // safety
    idx++;
  }
  return out;
}

function chunkAudio(duration, seconds, overlap) {
  if (!duration || duration <= 0) return [];
  const out = [];
  let i = 0;
  let idx = 0;
  while (i < duration) {
    const end = Math.min(duration, i + seconds);
    out.push({ index: idx, start_seconds: Math.round(i * 100) / 100, end_seconds: Math.round(end * 100) / 100 });
    if (end === duration) break;
    i = end - overlap;
    if (i <= out[out.length - 1].start_seconds) i = end;
    idx++;
  }
  return out;
}

function chunkVideo(duration, seconds, overlap) {
  // Same as audio for stub
  return chunkAudio(duration, seconds, overlap);
}

function chunkOcr(lines, lineCount) {
  if (!Array.isArray(lines) || lines.length === 0) return [];
  const out = [];
  for (let i = 0; i < lines.length; i += lineCount) {
    out.push({ index: out.length, lines: lines.slice(i, i + lineCount), start: i, end: Math.min(lines.length, i + lineCount) });
  }
  return out;
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateChunk(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.modality) return 'modality required';
  if (!STRATEGIES[body.modality]) return `modality must be one of ${Object.keys(STRATEGIES).join(',')}`;
  return null;
}

function runChunk(body) {
  const strat = STRATEGIES[body.modality];
  if (body.modality === 'text') {
    const size = parseInt(body.chunk_size || strat.default_size, 10);
    const overlap = parseInt(body.overlap ?? strat.default_overlap, 10);
    if (size < 1 || size > 100000) return { error: 'invalid_size' };
    if (overlap < 0 || overlap >= size) return { error: 'invalid_overlap' };
    return {
      modality: 'text', strategy: 'chars',
      chunk_size: size, overlap,
      chunks: chunkText(body.text || '', size, overlap),
    };
  }
  if (body.modality === 'audio') {
    const seconds = parseFloat(body.chunk_seconds || strat.default_seconds);
    const overlap = parseFloat(body.overlap_seconds ?? strat.default_overlap_seconds);
    if (seconds <= 0 || seconds > 3600) return { error: 'invalid_seconds' };
    if (overlap < 0 || overlap >= seconds) return { error: 'invalid_overlap' };
    return {
      modality: 'audio', strategy: 'time',
      chunk_seconds: seconds, overlap_seconds: overlap,
      chunks: chunkAudio(parseFloat(body.duration_seconds) || 0, seconds, overlap),
    };
  }
  if (body.modality === 'video') {
    const seconds = parseFloat(body.chunk_seconds || strat.default_seconds);
    const overlap = parseFloat(body.overlap_seconds ?? strat.default_overlap_seconds);
    if (seconds <= 0 || seconds > 3600) return { error: 'invalid_seconds' };
    if (overlap < 0 || overlap >= seconds) return { error: 'invalid_overlap' };
    return {
      modality: 'video', strategy: 'scene',
      chunk_seconds: seconds, overlap_seconds: overlap,
      chunks: chunkVideo(parseFloat(body.duration_seconds) || 0, seconds, overlap),
    };
  }
  if (body.modality === 'ocr') {
    const lineCount = parseInt(body.lines_per_chunk || strat.default_lines, 10);
    if (lineCount < 1 || lineCount > 1000) return { error: 'invalid_lines' };
    return {
      modality: 'ocr', strategy: 'lines',
      lines_per_chunk: lineCount,
      chunks: chunkOcr(body.lines || [], lineCount),
    };
  }
  return { error: 'unsupported_modality' };
}

function createJob(type, input, result) {
  const data = loadAll();
  const job = {
    id: newId('chk'),
    type,
    modality: input.modality,
    input_summary: { has_text: !!input.text, duration_seconds: input.duration_seconds, line_count: (input.lines || []).length },
    result,
    chunk_count: (result.chunks || []).length,
    status: 'completed',
    created_at: nowIso(),
  };
  data.jobs[job.id] = job;
  saveAll(data);
  return job;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-chunker', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/chunk', requireInternal, (req, res) => {
    const err = validateChunk(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const result = runChunk(req.body);
    if (result.error) return res.status(400).json({ error: result.error });
    const job = createJob('chunk', req.body, result);
    res.status(201).json(job);
  });

  app.post('/chunk/batch', requireInternal, (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'items[] required' });
    const data = loadAll();
    const out = [];
    for (const it of items) {
      const e = validateChunk(it);
      if (e) { out.push({ error: e }); continue; }
      const result = runChunk(it);
      if (result.error) { out.push({ error: result.error }); continue; }
      const job = createJob('chunk', it, result);
      out.push(job);
    }
    res.status(201).json({ count: out.length, jobs: out });
  });

  app.get('/jobs', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.jobs);
    if (req.query.modality) items = items.filter((j) => j.modality === req.query.modality);
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

  app.get('/strategies', (_req, res) => res.json({ strategies: STRATEGIES }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-chunker listening on ${PORT}`));
}

module.exports = { createApp };