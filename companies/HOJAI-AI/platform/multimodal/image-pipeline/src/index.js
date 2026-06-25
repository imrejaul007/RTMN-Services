/**
 * image-pipeline — Image decode/resize/normalize (port 5344) — STUB
 *
 * STUB implementations of:
 *   - decode: parse MIME, return image info (width/height/mode)
 *   - resize: scale to target dimensions (returns metadata + estimated byte_size)
 *   - thumbnail: same as resize, target 256x256
 *   - normalize: returns standardized byte representation metadata
 *   - exif_strip: returns input with metadata stripped (no-op for stub)
 *
 * Endpoints:
 *   POST /decode                  decode + return image info
 *   POST /resize                  resize to target dimensions
 *   POST /thumbnail               create 256x256 thumbnail metadata
 *   POST /normalize               normalize image (color space, mode)
 *   POST /exif/strip              strip EXIF metadata
 *   GET  /jobs                    list pipeline jobs
 *   GET  /jobs/:id                get job
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5344', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'image-pipeline-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SUPPORTED_FORMATS = ['jpeg', 'png', 'webp', 'gif', 'bmp'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Stub: detect format by MIME or magic bytes
function detectFormat(buf, mimeType) {
  if (mimeType) {
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('gif')) return 'gif';
    if (mimeType.includes('bmp')) return 'bmp';
  }
  if (buf.length < 4) return 'unknown';
  // PNG: 89 50 4E 47
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpeg';
  // GIF: GIF8
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  // WebP: RIFF...WEBP
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  return 'unknown';
}

function fakeDimensions(buf) {
  // Deterministic fake width/height based on buffer length for stability
  const w = 100 + (buf.length % 1800);
  const h = 100 + ((buf.length * 7) % 1200);
  return { width: w, height: h };
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
  const job = {
    id: newId('img'),
    type,
    input_size: Buffer.from(input.data || '', 'base64').length,
    input_mime: input.mime_type || 'unknown',
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'image-pipeline', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/decode', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const format = detectFormat(buf, req.body.mime_type);
    if (format === 'unknown') return res.status(415).json({ error: 'unsupported_format', supported: SUPPORTED_FORMATS });
    const dims = fakeDimensions(buf);
    const job = createJob('decode', req.body, {
      format,
      width: dims.width,
      height: dims.height,
      channels: 3,
      byte_size: buf.length,
    });
    res.status(201).json(job);
  });

  app.post('/resize', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const targetW = parseInt(req.body.width || '256', 10);
    const targetH = parseInt(req.body.height || '256', 10);
    if (targetW < 1 || targetW > 8192 || targetH < 1 || targetH > 8192) {
      return res.status(400).json({ error: 'invalid_dimensions' });
    }
    const buf = Buffer.from(req.body.data, 'base64');
    const format = detectFormat(buf, req.body.mime_type);
    const job = createJob('resize', req.body, {
      target_width: targetW,
      target_height: targetH,
      format,
      estimated_byte_size: Math.round(buf.length * (targetW * targetH) / Math.max(1, fakeDimensions(buf).width * fakeDimensions(buf).height)),
    });
    res.status(201).json(job);
  });

  app.post('/thumbnail', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('thumbnail', req.body, {
      width: 256, height: 256,
      format: detectFormat(buf, req.body.mime_type),
      estimated_byte_size: Math.round(buf.length * 0.05),
    });
    res.status(201).json(job);
  });

  app.post('/normalize', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('normalize', req.body, {
      color_space: req.body.color_space || 'srgb',
      mode: 'RGB',
      bit_depth: 8,
      normalized_size: buf.length,
      mean: [0.485, 0.456, 0.406],
      std: [0.229, 0.224, 0.225],
    });
    res.status(201).json(job);
  });

  app.post('/exif/strip', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('exif_strip', req.body, {
      input_size: buf.length,
      output_size: buf.length, // stub: same size
      stripped_tags: ['GPS', 'Make', 'Model', 'DateTime', 'Software'],
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
  app.listen(PORT, () => console.log(`image-pipeline listening on ${PORT}`));
}

module.exports = { createApp };