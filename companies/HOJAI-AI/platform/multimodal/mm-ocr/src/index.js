/**
 * mm-ocr — Multi-Modal OCR (port 5350) — STUB
 *
 * Returns stub OCR text + confidence score. Real OCR (Tesseract, Cloud Vision)
 * can be plugged in by replacing the `runOcr` function.
 *
 * Endpoints:
 *   POST /ocr                     run OCR on image (base64 in body)
 *   POST /ocr/batch               run OCR on multiple images
 *   GET  /jobs                    list OCR jobs
 *   GET  /jobs/:id                get OCR job
 *   GET  /languages               list supported languages
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5350', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-ocr-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'hi', 'ar', 'zh', 'ja', 'pt', 'ru'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// STUB: returns deterministic pseudo-OCR result based on buffer size
function runOcr(buf, lang) {
  const text = `[OCR-STUB lang=${lang} bytes=${buf.length}]`;
  const confidence = 0.5 + (buf.length % 50) / 100; // 0.50-0.99
  return { text, confidence: Math.min(0.99, confidence), lines: 1 };
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
function validateOcr(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.data) return 'data (base64 image) required';
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '30mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-ocr', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/ocr', requireInternal, (req, res) => {
    const err = validateOcr(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const lang = req.body.language || 'en';
    if (!SUPPORTED_LANGUAGES.includes(lang)) return res.status(400).json({ error: 'unsupported_language', supported: SUPPORTED_LANGUAGES });
    const buf = Buffer.from(req.body.data, 'base64');
    const result = runOcr(buf, lang);
    const data = loadAll();
    const job = {
      id: newId('ocr'),
      asset_id: req.body.asset_id || null,
      language: lang,
      text: result.text,
      confidence: result.confidence,
      lines: result.lines,
      byte_size: buf.length,
      status: 'completed',
      created_at: nowIso(),
    };
    data.jobs[job.id] = job;
    saveAll(data);
    res.status(201).json(job);
  });

  app.post('/ocr/batch', requireInternal, (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'items[] required' });
    const lang = req.body.language || 'en';
    const data = loadAll();
    const jobs = [];
    for (const it of items) {
      const buf = Buffer.from(it.data || '', 'base64');
      const result = runOcr(buf, lang);
      const job = {
        id: newId('ocr'),
        asset_id: it.asset_id || null,
        language: lang,
        text: result.text,
        confidence: result.confidence,
        lines: result.lines,
        byte_size: buf.length,
        status: 'completed',
        created_at: nowIso(),
      };
      data.jobs[job.id] = job;
      jobs.push(job);
    }
    saveAll(data);
    res.status(201).json({ count: jobs.length, jobs });
  });

  app.get('/jobs', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.jobs);
    if (req.query.asset_id) items = items.filter((j) => j.asset_id === req.query.asset_id);
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

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-ocr listening on ${PORT}`));
}

module.exports = { createApp };