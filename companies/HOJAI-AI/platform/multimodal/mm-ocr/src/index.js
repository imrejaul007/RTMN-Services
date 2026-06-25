/**
 * mm-ocr — Multi-Modal OCR (port 5350)
 *
 * Real AI-powered OCR using OpenAI GPT-4o:
 *   - Transcribes text from images (documents, screenshots, receipts, etc.)
 *   - Returns structured text with confidence scores
 *   - Supports batch processing
 *
 * Fallback: when OPENAI_API_KEY is not set, uses hash-based stub.
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OCR_MODEL = process.env.OPENAI_OCR_MODEL || 'gpt-4o';
const USE_STUB = !OPENAI_API_KEY;

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'hi', 'ar', 'zh', 'ja', 'pt', 'ru', 'ko', 'it', 'nl', 'tr', 'vi', 'th', 'id'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

function stubOcr(buf, lang) {
  const text = `[OCR-STUB lang=${lang} bytes=${buf.length}]`;
  const confidence = Math.min(0.99, parseFloat((0.5 + (buf.length % 50) / 100).toFixed(3)));
  return { text, confidence, lines: 1 };
}

async function realOcr(buf, lang) {
  const base64 = buf.toString('base64');
  const prompt = `You are an expert OCR system. Extract ALL text from this image exactly as it appears.
Preserve line breaks and spacing. Include all text visible in the image including:
- Document text (printed or handwritten)
- Labels, captions, and annotations
- Numbers, codes, and identifiers
- Signs and notices

Return ONLY valid JSON with this structure:
{
  "text": "the complete extracted text with line breaks preserved as \\n",
  "confidence": 0.0-1.0,  // your confidence in the accuracy of extraction
  "lines": number,         // count of text lines detected
  "language_hint": "primary language detected or 'mixed'"
}
Only respond with valid JSON, no additional text.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}`, detail: 'high' } },
          { type: 'text', text: prompt },
        ],
      }],
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI OCR error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const content = json.choices?.[0]?.message?.content || '';
  try {
    let cleaned = content.trim();
    const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/) || cleaned.match(/(\{[\s\S]*\})/);
    if (jsonMatch) cleaned = jsonMatch[1];
    const parsed = JSON.parse(cleaned);
    return {
      text: String(parsed.text || '').replace(/\n\n+/g, '\n'),
      confidence: parseFloat(Math.min(1, Math.max(0, Number(parsed.confidence || 0.8))).toFixed(3)),
      lines: parseInt(parsed.lines || 1, 10),
      language_hint: parsed.language_hint || lang,
    };
  } catch (_) {
    return { text: content.trim(), confidence: 0.6, lines: (content.trim().split('\n').length), language_hint: lang };
  }
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

function createJob(body, result, lang) {
  const data = loadAll();
  const buf = Buffer.from(body.data || '', 'base64');
  const job = {
    id: newId('ocr'),
    asset_id: body.asset_id || null,
    language: lang,
    ai_model: USE_STUB ? 'stub' : OCR_MODEL,
    text: result.text,
    confidence: result.confidence,
    lines: result.lines,
    byte_size: buf.length,
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-ocr', port: PORT, ai: USE_STUB ? 'stub' : 'openai', model: OCR_MODEL }));
  app.get('/ready', (_req, res) => res.json({ ok: true, mode: USE_STUB ? 'stub' : 'live' }));

  app.post('/ocr', requireInternal, async (req, res) => {
    const err = validateOcr(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const lang = req.body.language || 'en';
    if (!SUPPORTED_LANGUAGES.includes(lang)) return res.status(400).json({ error: 'unsupported_language', supported: SUPPORTED_LANGUAGES });
    const buf = Buffer.from(req.body.data, 'base64');
    try {
      const result = USE_STUB ? stubOcr(buf, lang) : await realOcr(buf, lang);
      const job = createJob(req.body, result, lang);
      res.status(201).json(job);
    } catch (e) {
      console.error('OCR error:', e.message);
      res.status(500).json({ error: 'ai_failed', message: e.message, fallback: 'stub' });
    }
  });

  app.post('/ocr/batch', requireInternal, async (req, res) => {
    const items = Array.isArray(req.body?.items) ? req.body.items : null;
    if (!items) return res.status(400).json({ error: 'items[] required' });
    if (items.length > 20) return res.status(400).json({ error: 'max 20 items per batch' });
    const lang = req.body.language || 'en';
    const data = loadAll();
    const jobs = [];
    for (const it of items) {
      const buf = Buffer.from(it.data || '', 'base64');
      try {
        const result = USE_STUB ? stubOcr(buf, lang) : await realOcr(buf, lang);
        const job = { id: newId('ocr'), asset_id: it.asset_id || null, language: lang, ai_model: USE_STUB ? 'stub' : OCR_MODEL, text: result.text, confidence: result.confidence, lines: result.lines, byte_size: buf.length, status: 'completed', created_at: nowIso() };
        data.jobs[job.id] = job;
        jobs.push(job);
      } catch (e) {
        jobs.push({ error: e.message });
      }
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

  app.get('/languages', (_req, res) => res.json({ languages: SUPPORTED_LANGUAGES, count: SUPPORTED_LANGUAGES.length }));
  app.get('/modes', (_req, res) => res.json({ stub: USE_STUB, has_api_key: !!OPENAI_API_KEY, model: OCR_MODEL }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  if (USE_STUB) console.log(`mm-ocr (stub mode — set OPENAI_API_KEY for AI OCR)`);
  else console.log(`mm-ocr (OpenAI ${OCR_MODEL})`);
  app.listen(PORT, () => console.log(`mm-ocr listening on ${PORT}`));
}

module.exports = { createApp };
