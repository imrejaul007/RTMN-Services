/**
 * audio-pipeline — Audio decode/resample/VAD/chunk (port 5345) — STUB
 *
 * Stub implementations:
 *   - decode: detect format by MIME + magic bytes
 *   - resample: return target sample rate + estimated samples
 *   - vad: voice activity detection (returns segments based on size heuristic)
 *   - chunk: split into chunks of target duration_seconds
 *
 * Endpoints:
 *   POST /decode                  decode audio
 *   POST /resample                resample to target sample rate
 *   POST /vad                     voice activity detection
 *   POST /chunk                   chunk audio into segments
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

const PORT = parseInt(process.env.PORT || '5345', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'audio-pipeline-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SUPPORTED_FORMATS = ['wav', 'mp3', 'flac', 'ogg', 'm4a', 'aac'];
const DEFAULT_SAMPLE_RATE = 16000;

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

function detectFormat(buf, mimeType) {
  if (mimeType) {
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('flac')) return 'flac';
    if (mimeType.includes('ogg')) return 'ogg';
    if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('aac')) return 'aac';
  }
  if (buf.length < 4) return 'unknown';
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WAVE') return 'wav';
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return 'mp3';
  if (buf.slice(0, 4).toString('ascii') === 'fLaC') return 'flac';
  if (buf.slice(0, 4).toString('ascii') === 'OggS') return 'ogg';
  return 'unknown';
}

function estimateDurationSeconds(buf, sampleRate, channels, bytesPerSample = 2) {
  // 16-bit PCM mono at 16kHz = 32000 bytes/sec
  return Math.max(0, buf.length / (sampleRate * channels * bytesPerSample));
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
    id: newId('aud'),
    type,
    input_size: buf.length,
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'audio-pipeline', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/decode', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const format = detectFormat(buf, req.body.mime_type);
    if (format === 'unknown') return res.status(415).json({ error: 'unsupported_format', supported: SUPPORTED_FORMATS });
    const sampleRate = req.body.sample_rate || DEFAULT_SAMPLE_RATE;
    const channels = req.body.channels || 1;
    const duration = estimateDurationSeconds(buf, sampleRate, channels);
    const job = createJob('decode', req.body, {
      format,
      sample_rate: sampleRate,
      channels,
      bit_depth: 16,
      duration_seconds: Math.round(duration * 100) / 100,
      byte_size: buf.length,
    });
    res.status(201).json(job);
  });

  app.post('/resample', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const targetRate = parseInt(req.body.sample_rate || '16000', 10);
    if (![8000, 16000, 22050, 44100, 48000].includes(targetRate)) {
      return res.status(400).json({ error: 'unsupported_sample_rate', supported: [8000, 16000, 22050, 44100, 48000] });
    }
    const buf = Buffer.from(req.body.data, 'base64');
    const format = detectFormat(buf, req.body.mime_type);
    const job = createJob('resample', req.body, {
      target_sample_rate: targetRate,
      format,
      estimated_samples: Math.round(buf.length / 2),
    });
    res.status(201).json(job);
  });

  app.post('/vad', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const sampleRate = req.body.sample_rate || DEFAULT_SAMPLE_RATE;
    const duration = estimateDurationSeconds(buf, sampleRate, 1);
    // Stub: emit a single speech segment spanning 90% of duration
    const segments = duration > 0.1 ? [{
      start: 0,
      end: Math.max(0.1, Math.round(duration * 0.9 * 100) / 100),
      is_speech: true,
      confidence: 0.85,
    }] : [];
    const job = createJob('vad', req.body, {
      sample_rate: sampleRate,
      duration_seconds: Math.round(duration * 100) / 100,
      segments,
      speech_ratio: segments.length ? segments[0].end / Math.max(0.001, duration) : 0,
    });
    res.status(201).json(job);
  });

  app.post('/chunk', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const chunkSec = req.body.chunk_seconds === undefined ? 5 : parseFloat(req.body.chunk_seconds);
    const sampleRate = req.body.sample_rate || DEFAULT_SAMPLE_RATE;
    if (chunkSec < 0.1 || chunkSec > 60) return res.status(400).json({ error: 'invalid_chunk_seconds' });
    const buf = Buffer.from(req.body.data, 'base64');
    const duration = estimateDurationSeconds(buf, sampleRate, 1);
    const numChunks = Math.max(1, Math.ceil(duration / chunkSec));
    const chunks = [];
    for (let i = 0; i < numChunks; i++) {
      chunks.push({
        index: i,
        start: Math.round(i * chunkSec * 100) / 100,
        end: Math.round(Math.min(duration, (i + 1) * chunkSec) * 100) / 100,
        byte_offset: Math.round((i * chunkSec / Math.max(0.001, duration)) * buf.length),
      });
    }
    const job = createJob('chunk', req.body, {
      chunk_seconds: chunkSec,
      sample_rate: sampleRate,
      chunk_count: chunks.length,
      chunks,
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
  app.listen(PORT, () => console.log(`audio-pipeline listening on ${PORT}`));
}

module.exports = { createApp };