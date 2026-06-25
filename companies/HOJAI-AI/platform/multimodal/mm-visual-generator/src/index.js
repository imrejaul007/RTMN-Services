/**
 * mm-visual-generator — Multi-Modal Visual Generator (port 5354) — STUB
 *
 * Stub implementations:
 *   - generate_prompt: text → image prompt with style/template enrichment
 *   - suggest_layout: text → layout suggestions (hero, grid, list, card)
 *   - extract_palette: image → dominant color palette
 *   - render_svg: simple SVG stub (rect/circle) based on prompt + palette
 *
 * Endpoints:
 *   POST /prompt             build text→image prompt
 *   POST /layout             suggest layout
 *   POST /palette            extract palette
 *   POST /render             render SVG stub
 *   GET  /jobs               list generation jobs
 *   GET  /jobs/:id           get job
 *
 * Storage: $DATA_DIR/jobs.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5354', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'mm-visual-generator-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');

const STYLES = ['photorealistic', 'cinematic', 'illustration', 'watercolor', 'oil-painting', 'sketch', 'pixel-art', '3d-render', 'anime', 'minimalist'];
const LAYOUTS = ['hero', 'grid', 'list', 'card', 'banner', 'carousel', 'split', 'mosaic', 'gallery', 'magazine'];
const TEMPLATES = ['product-shot', 'portrait', 'landscape', 'still-life', 'architecture', 'food', 'fashion', 'tech', 'abstract', 'documentary'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Stub prompt builder: enrich raw text with style + template + quality tokens
function buildPromptStub(text, opts) {
  const style = opts.style || 'photorealistic';
  const template = opts.template || 'product-shot';
  const quality = (opts.quality || 'standard').toLowerCase();
  const aspect = opts.aspect_ratio || '1:1';

  const qualTokens = quality === 'high' ? '8k, ultra-detailed, sharp focus' : quality === 'draft' ? 'quick sketch' : 'high quality';
  const styleTokens = style === 'photorealistic' ? 'realistic, natural lighting, photorealistic' : style === 'cinematic' ? 'cinematic, movie still, dramatic lighting' : `${style} style`;
  const tmplTokens = template === 'product-shot' ? 'isolated on clean background, studio lighting' : template === 'portrait' ? 'shallow depth of field, centered' : `${template} composition`;

  const prompt = `${text.trim()}, ${styleTokens}, ${tmplTokens}, ${qualTokens}, aspect ${aspect}`;
  const negative = opts.negative || 'low quality, blurry, distorted, watermark, text';

  return {
    prompt: prompt.slice(0, 1000),
    negative_prompt: negative,
    style, template, quality, aspect_ratio: aspect,
    estimated_tokens: Math.ceil(prompt.length / 4),
  };
}

// Stub layout suggestion: based on content length and intent hints
function suggestLayoutStub(text, intent) {
  const length = text.length;
  const base = intent || (length > 500 ? 'article' : length > 200 ? 'feature' : length > 50 ? 'card' : 'tile');
  const layouts = [];
  if (base === 'article' || base === 'long-form') layouts.push({ type: 'magazine', score: 0.92, reason: 'long-form content suits magazine layout' });
  if (base === 'feature' || base === 'product') layouts.push({ type: 'hero', score: 0.88, reason: 'feature deserves hero presentation' });
  if (base === 'card' || base === 'tile') layouts.push({ type: 'grid', score: 0.85, reason: 'compact content fits in grid' });
  layouts.push({ type: 'split', score: 0.7, reason: 'split layout always usable' });
  layouts.push({ type: 'carousel', score: 0.6, reason: 'good for swipeable browsing' });
  if (layouts.length === 0) layouts.push({ type: 'card', score: 0.5, reason: 'default card layout' });
  return { intent: base, layouts };
}

// Stub palette extraction: hash-based deterministic color picking
function extractPaletteStub(buf) {
  // Use 5 palette colors deterministically derived from buffer bytes
  const colors = [];
  const count = 5;
  const stride = Math.max(1, Math.floor(buf.length / count));
  for (let i = 0; i < count; i++) {
    const offset = Math.min(buf.length - 3, i * stride);
    const r = buf[offset] || 100;
    const g = buf[offset + 1] || 100;
    const b = buf[offset + 2] || 100;
    const hex = '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
    colors.push({
      hex,
      rgb: [r, g, b],
      weight: parseFloat((1 / (i + 1) / 1.5).toFixed(3)),
    });
  }
  return { color_count: colors.length, colors };
}

// Stub SVG render: produces a small SVG with palette + prompt label
function renderSvgStub(prompt, palette, width, height) {
  const w = width || 512;
  const h = height || 512;
  const bg = palette.colors[0]?.hex || '#ffffff';
  const accent = palette.colors[1]?.hex || '#333333';
  const label = (prompt.prompt || '').slice(0, 40).replace(/[<>&"']/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="${accent}"/><text x="50%" y="95%" text-anchor="middle" font-family="sans-serif" font-size="14" fill="${accent}">${label}</text></svg>`;
  return { svg, format: 'svg', bytes: Buffer.byteLength(svg, 'utf8') };
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}
function createJob(type, input, result) {
  const data = loadAll();
  const job = {
    id: newId('vg'),
    type,
    input_chars: (input.text || '').length,
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-visual-generator', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  app.post('/prompt', requireInternal, (req, res) => {
    const text = req.body.text || '';
    if (!text.trim()) return res.status(400).json({ error: 'validation', message: 'text required' });
    const opts = req.body.opts || {};
    if (opts.style && !STYLES.includes(opts.style)) {
      return res.status(400).json({ error: 'validation', message: `style must be one of: ${STYLES.join(', ')}` });
    }
    if (opts.template && !TEMPLATES.includes(opts.template)) {
      return res.status(400).json({ error: 'validation', message: `template must be one of: ${TEMPLATES.join(', ')}` });
    }
    const job = createJob('prompt', { text }, buildPromptStub(text, opts));
    res.status(201).json(job);
  });

  app.post('/layout', requireInternal, (req, res) => {
    const text = req.body.text || '';
    if (!text.trim()) return res.status(400).json({ error: 'validation', message: 'text required' });
    const job = createJob('layout', { text, intent: req.body.intent }, suggestLayoutStub(text, req.body.intent));
    res.status(201).json(job);
  });

  app.post('/palette', requireInternal, (req, res) => {
    if (!req.body || !req.body.data) return res.status(400).json({ error: 'validation', message: 'data (base64) required' });
    const buf = Buffer.from(req.body.data, 'base64');
    if (buf.length === 0) return res.status(400).json({ error: 'validation', message: 'data cannot be empty' });
    const job = createJob('palette', { size: buf.length }, extractPaletteStub(buf));
    res.status(201).json(job);
  });

  app.post('/render', requireInternal, (req, res) => {
    const prompt = req.body.prompt || {};
    const palette = req.body.palette || { colors: [{ hex: '#cccccc' }, { hex: '#333333' }] };
    const width = parseInt(req.body.width || '512', 10);
    const height = parseInt(req.body.height || '512', 10);
    if (!prompt.prompt) return res.status(400).json({ error: 'validation', message: 'prompt.prompt required' });
    const render = renderSvgStub(prompt, palette, width, height);
    const job = createJob('render', { prompt: prompt.prompt, palette, width, height }, render);
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

  app.get('/styles', requireInternal, (_req, res) => res.json({ styles: STYLES }));
  app.get('/templates', requireInternal, (_req, res) => res.json({ templates: TEMPLATES }));
  app.get('/layouts', requireInternal, (_req, res) => res.json({ layouts: LAYOUTS }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`mm-visual-generator listening on ${PORT}`));
}

module.exports = { createApp };