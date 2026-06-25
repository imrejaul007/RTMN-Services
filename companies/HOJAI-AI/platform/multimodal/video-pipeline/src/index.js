/**
 * video-pipeline — Video frame extraction / keyframe selection / audio split (port 5346) — STUB
 *
 * Stub implementations:
 *   - probe: detect format + estimate duration/fps/resolution
 *   - extract_frames: list of frame timestamps at target fps
 *   - keyframes: pick keyframes at scene-change boundaries (deterministic stubs)
 *   - split_audio: returns audio-only metadata (length, sample_rate)
 *   - thumbnail: returns single frame at given time
 *
 * Endpoints:
 *   POST /probe                   video probe (info)
 *   POST /extract/frames          extract frames at fps
 *   POST /extract/keyframes       extract keyframes
 *   POST /split/audio             split audio track
 *   POST /thumbnail               capture thumbnail at time_seconds
 *   GET  /jobs                    list jobs
 *   GET  /jobs/:id                get job
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5346', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'video-pipeline-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SUPPORTED_FORMATS = ['mp4', 'webm', 'avi', 'mov', 'mkv'];
const DEFAULT_FPS = 1;

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
    if (mimeType.includes('mp4')) return 'mp4';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('quicktime') || mimeType.includes('mov')) return 'mov';
    if (mimeType.includes('avi')) return 'avi';
    if (mimeType.includes('matroska') || mimeType.includes('mkv')) return 'mkv';
  }
  if (buf.length < 4) return 'unknown';
  // MP4: 'ftyp' at offset 4
  if (buf.length >= 8 && buf.slice(4, 8).toString('ascii') === 'ftyp') return 'mp4';
  // WebM/MKV: EBML header 1A 45 DF A3
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return 'webm';
  return 'unknown';
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
    id: newId('vid'),
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
  app.use(express.json({ limit: '50mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'video-pipeline', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/probe', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const format = detectFormat(buf, req.body.mime_type);
    if (format === 'unknown') return res.status(415).json({ error: 'unsupported_format', supported: SUPPORTED_FORMATS });
    // Fake metadata
    const duration = parseFloat(req.body.duration_seconds) || 30;
    const fps = parseFloat(req.body.fps) || 24;
    const job = createJob('probe', req.body, {
      format,
      duration_seconds: duration,
      fps,
      width: 1920,
      height: 1080,
      has_audio: true,
      audio_codec: 'aac',
      video_codec: 'h264',
      byte_size: buf.length,
    });
    res.status(201).json(job);
  });

  app.post('/extract/frames', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const fps = parseFloat(req.body.fps || DEFAULT_FPS);
    if (fps < 0.1 || fps > 60) return res.status(400).json({ error: 'invalid_fps' });
    const duration = parseFloat(req.body.duration_seconds || '30');
    const total = Math.max(0, Math.floor(duration * fps));
    const frames = [];
    for (let i = 0; i < total; i++) {
      frames.push({
        index: i,
        timestamp_seconds: Math.round((i / fps) * 100) / 100,
        is_keyframe: i % 30 === 0,
      });
    }
    const job = createJob('extract_frames', req.body, { fps, frame_count: frames.length, frames });
    res.status(201).json(job);
  });

  app.post('/extract/keyframes', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const duration = parseFloat(req.body.duration_seconds || '30');
    const interval = parseFloat(req.body.keyframe_interval_seconds || '5');
    const keyframes = [];
    let t = 0;
    let i = 0;
    while (t < duration) {
      keyframes.push({
        index: i,
        timestamp_seconds: Math.round(t * 100) / 100,
        scene_change: i > 0,
      });
      t += interval;
      i++;
    }
    const job = createJob('extract_keyframes', req.body, {
      interval_seconds: interval,
      keyframe_count: keyframes.length,
      keyframes,
    });
    res.status(201).json(job);
  });

  app.post('/split/audio', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const duration = parseFloat(req.body.duration_seconds || '30');
    const job = createJob('split_audio', req.body, {
      audio_track_present: true,
      sample_rate: 44100,
      channels: 2,
      duration_seconds: duration,
      estimated_byte_size: Math.round(duration * 44100 * 2 * 2),
    });
    res.status(201).json(job);
  });

  app.post('/thumbnail', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const atSec = parseFloat(req.body.at_seconds || '0');
    const duration = parseFloat(req.body.duration_seconds || '30');
    if (atSec < 0 || atSec > duration) return res.status(400).json({ error: 'invalid_time' });
    const job = createJob('thumbnail', req.body, {
      at_seconds: atSec,
      width: 320,
      height: 180,
      estimated_byte_size: 8192,
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
  app.listen(PORT, () => console.log(`video-pipeline listening on ${PORT}`));
}

module.exports = { createApp };