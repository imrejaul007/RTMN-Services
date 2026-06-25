/**
 * mm-audio-transcription — Multi-Modal Audio Transcription (port 5352) — STUB
 *
 * Stub implementations of:
 *   - transcribe: speech-to-text (returns empty text + segments structure)
 *   - detect_language: language detection (returns 'en')
 *   - count_speakers: speaker count (returns 1)
 *   - diarize: speaker diarization (segments with speaker labels)
 *
 * Endpoints:
 *   POST /transcribe              speech-to-text
 *   POST /transcribe/batch        batch
 *   POST /language/detect         language detection
 *   POST /speakers/count          speaker count
 *   POST /speakers/diarize        speaker diarization
 *   GET  /jobs                    list transcriptions
 *   GET  /jobs/:id                get job
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5352', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-audio-transcription-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'hi', 'ar', 'zh', 'ja', 'pt', 'ru', 'ko', 'it'];
const SUPPORTED_MODELS = ['whisper-tiny', 'whisper-base', 'whisper-small', 'stub-default'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

function transcribeStub(buf, language) {
  return {
    text: '', // stub: real STT would populate
    language: language || 'en',
    confidence: 0,
    segments: [],
    duration_seconds: Math.round((buf.length / 32000) * 100) / 100,
    model: 'stub-default',
  };
}
function detectLanguageStub(buf) {
  // Hash-based deterministic stub: pick from list
  const idx = (buf[0] || 0) % SUPPORTED_LANGUAGES.length;
  return { language: SUPPORTED_LANGUAGES[idx], confidence: 0.6, top_k: [{ language: SUPPORTED_LANGUAGES[idx], confidence: 0.6 }] };
}
function countSpeakersStub(buf) {
  return { count: 1, confidence: 0.5, method: 'stub' };
}
function diarizeStub(buf, durationSec) {
  const dur = durationSec || Math.round((buf.length / 32000) * 100) / 100;
  return {
    segments: [{
      start: 0,
      end: dur,
      speaker: 'S1',
      confidence: 0.8,
    }],
    speaker_count: 1,
  };
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
    id: newId('tx'),
    type,
    input_size: buf.length,
    language: input.language || 'en',
    model: input.model || 'stub-default',
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-audio-transcription', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/transcribe', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const language = req.body.language || 'en';
    if (!SUPPORTED_LANGUAGES.includes(language)) return res.status(400).json({ error: 'unsupported_language', supported: SUPPORTED_LANGUAGES });
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('transcribe', req.body, transcribeStub(buf, language));
    res.status(201).json(job);
  });

  app.post('/transcribe/batch', requireInternal, (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'items[] required' });
    const language = req.body.language || 'en';
    const data = loadAll();
    const out = [];
    for (const it of items) {
      const buf = Buffer.from(it.data || '', 'base64');
      const r = transcribeStub(buf, language);
      const job = {
        id: newId('tx'),
        type: 'transcribe',
        input_size: buf.length,
        language,
        model: 'stub-default',
        result: r,
        status: 'completed',
        created_at: nowIso(),
      };
      data.jobs[job.id] = job;
      out.push(job);
    }
    saveAll(data);
    res.status(201).json({ count: out.length, jobs: out });
  });

  app.post('/language/detect', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('language_detect', req.body, detectLanguageStub(buf));
    res.status(201).json(job);
  });

  app.post('/speakers/count', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const job = createJob('speaker_count', req.body, countSpeakersStub(buf));
    res.status(201).json(job);
  });

  app.post('/speakers/diarize', requireInternal, (req, res) => {
    if (!requireData(req, res)) return;
    const buf = Buffer.from(req.body.data, 'base64');
    const durationSec = parseFloat(req.body.duration_seconds) || 0;
    const job = createJob('diarize', req.body, diarizeStub(buf, durationSec));
    res.status(201).json(job);
  });

  app.get('/jobs', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.jobs);
    if (req.query.type) items = items.filter((j) => j.type === req.query.type);
    if (req.query.language) items = items.filter((j) => j.language === req.query.language);
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

  app.get('/languages', (_req, res) => res.json({ languages: SUPPORTED_LANGUAGES }));
  app.get('/models', (_req, res) => res.json({ models: SUPPORTED_MODELS }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-audio-transcription listening on ${PORT}`));
}

module.exports = { createApp };