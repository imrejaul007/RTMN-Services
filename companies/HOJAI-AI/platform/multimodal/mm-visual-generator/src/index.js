/**
 * mm-visual-generator — Multi-Modal Visual Generator (port 5354)
 *
 * Real + heuristic implementations:
 *   - /prompt:           text → enriched DALL-E prompt (heuristic enrichment, no cost)
 *   - /layout:           text → layout suggestions (heuristic scoring)
 *   - /palette:          image → dominant color palette (pure Node.js quantization)
 *   - /render:           prompt → DALL-E image (real AI generation when key set)
 *   - /render/svg:       prompt → SVG illustration (pure Node.js)
 *
 * Fallback: when OPENAI_API_KEY is not set, /render returns SVG stub.
 *
 * Endpoints:
 *   POST /prompt             build enriched text→image prompt
 *   POST /layout             suggest layout type + composition
 *   POST /palette            extract dominant colors from image
 *   POST /render             generate image (DALL-E or SVG fallback)
 *   POST /render/svg         generate SVG illustration
 *   GET  /jobs               list generation jobs
 *   GET  /jobs/:id          get job
 *   GET  /styles            available styles
 *   GET  /models            available generation models
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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const DALL_E_MODEL = process.env.DALLE_MODEL || 'dall-e-3';  // dall-e-2 for cheaper
const IMAGE_SIZE = process.env.DALLE_SIZE || '1024x1024';
const USE_STUB = !OPENAI_API_KEY;

const DATA_FILE = path.join(DATA_DIR, 'jobs.json');

const STYLES = ['photorealistic', 'cinematic', 'illustration', 'watercolor', 'oil-painting', 'sketch', 'pixel-art', '3d-render', 'anime', 'minimalist', 'abstract', 'comic', 'infographic'];
const LAYOUTS = ['hero', 'grid', 'list', 'card', 'banner', 'carousel', 'split', 'mosaic', 'gallery', 'magazine', 'timeline', 'comparison', 'feature'];
const TEMPLATES = ['product-shot', 'portrait', 'landscape', 'still-life', 'architecture', 'food', 'fashion', 'tech', 'abstract', 'documentary', ' infographic', 'chart', 'diagram'];
const DALL_E_MODELS = ['dall-e-3', 'dall-e-2'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ jobs: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { jobs: {} }; } }
function saveAll(d) { const tmp = DATA_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(d, null, 2)); fs.renameSync(tmp, DATA_FILE); }

// Build enriched DALL-E prompt from natural language description
function buildPrompt(text, opts) {
  const style = opts.style || 'photorealistic';
  const template = opts.template || 'product-shot';
  const quality = (opts.quality || 'standard').toLowerCase();
  const aspect = opts.aspect_ratio || IMAGE_SIZE.replace('x', ':');

  const qualTokens = quality === 'ultra' ? '8k, ultra-detailed, sharp focus, professional photography'
    : quality === 'high' ? 'high detail, professional quality, 4k'
    : quality === 'draft' ? 'quick concept sketch, rough'
    : 'high quality, professional';

  const styleTokens = {
    photorealistic: 'realistic, natural lighting, photorealistic, DSLR quality',
    cinematic: 'cinematic, movie still, dramatic lighting, film grain, volumetric light',
    illustration: 'digital illustration, clean lines, vibrant colors, vector art',
    watercolor: 'watercolor painting, soft edges, artistic, hand-painted texture',
    'oil-painting': 'oil painting style, brushstrokes visible, rich colors, museum quality',
    sketch: 'pencil sketch, hand-drawn, detailed linework, black and white',
    'pixel-art': 'pixel art, retro game style, 16-bit, vibrant colors',
    '3d-render': '3D render, CGI, octane render, studio lighting, unreal engine',
    anime: 'anime style, Japanese animation, cel-shaded, vibrant, Studio Ghibli inspired',
    minimalist: 'minimalist design, clean, simple, negative space, modern',
    abstract: 'abstract art, geometric shapes, bold colors, contemporary',
    comic: 'comic book art, vibrant colors, dynamic poses, Marvel/DC style',
    infographic: 'infographic style, clean data visualization, flat design',
  }[style] || `${style} style`;

  const tmplTokens = {
    'product-shot': 'isolated on clean white background, studio lighting, product photography',
    portrait: 'portrait photography, shallow depth of field, centered subject, professional lighting',
    landscape: 'landscape photography, golden hour, wide angle, breathtaking scenery',
    'still-life': 'still life photography, carefully arranged objects, dramatic lighting',
    architecture: 'architectural photography, clean lines, interior design, wide angle lens',
    food: 'food photography, appetizing, restaurant quality, overhead shot',
    fashion: 'fashion photography, editorial, model, magazine cover quality',
    tech: 'technology product photography, clean, modern, Apple-style minimal',
    abstract: 'abstract composition, creative, artistic, thought-provoking',
    documentary: 'documentary style, authentic, candid, journalistic',
    infographic: 'clean infographic design, data visualization, modern typography',
    chart: 'clean chart visualization, modern design, professional',
    diagram: 'clean technical diagram, schematic, blueprint style',
  }[template] || `${template} composition`;

  const prompt = `${text.trim()}, ${styleTokens}, ${tmplTokens}, ${qualTokens}, aspect ratio ${aspect}`;
  const negative = opts.negative || 'low quality, blurry, distorted, watermark, text overlay, signature, copyright, deformed, ugly';

  return {
    prompt: prompt.slice(0, 1000),
    negative_prompt: negative.slice(0, 500),
    style, template, quality, aspect_ratio: aspect,
    estimated_tokens: Math.ceil(prompt.length / 4),
  };
}

// Layout suggestion based on content analysis
function suggestLayout(text, intent) {
  const length = text.length;
  const wordCount = text.trim().split(/\s+/).length;
  const hasNumbers = /\d/.test(text);
  const hasLinks = /https?:\/\//.test(text);
  const base = intent || (
    hasNumbers && wordCount < 100 ? 'comparison' :
    wordCount > 500 ? 'article' :
    wordCount > 200 ? 'feature' :
    wordCount > 50 ? 'card' :
    'tile'
  );

  const scores = [];
  if (['article', 'long-form'].includes(base) || wordCount > 300) {
    scores.push({ type: 'magazine', score: 0.92, reason: 'long-form content suits magazine layout' });
    scores.push({ type: 'timeline', score: 0.78, reason: 'sequential content works well as timeline' });
  }
  if (['feature', 'product', 'profile'].includes(base) || wordCount > 100) {
    scores.push({ type: 'hero', score: 0.88, reason: 'featured content deserves hero presentation' });
    scores.push({ type: 'split', score: 0.82, reason: 'split layout balances text and visual' });
  }
  if (['card', 'tile', 'compact'].includes(base) || wordCount < 100) {
    scores.push({ type: 'grid', score: 0.90, reason: 'compact content fits well in a grid' });
    scores.push({ type: 'carousel', score: 0.75, reason: 'swipeable cards work for browsing' });
  }
  if (hasNumbers) {
    scores.push({ type: 'comparison', score: 0.85, reason: 'numerical data suits comparison layout' });
    scores.push({ type: 'infographic', score: 0.80, reason: 'data-heavy content works as infographic' });
  }
  if (wordCount > 50) {
    scores.push({ type: 'banner', score: 0.70, reason: 'banner suitable for CTA and highlights' });
  }

  // Always add fallback
  scores.push({ type: 'card', score: 0.6, reason: 'universal fallback layout' });
  scores.sort((a, b) => b.score - a.score);

  return { intent: base, word_count: wordCount, layouts: scores.slice(0, 5) };
}

// Pure Node.js dominant color extraction using k-means-like quantization
function extractPalette(buf, count = 5) {
  if (buf.length < 3) return { color_count: 0, colors: [] };

  // Sample pixels uniformly (for JPEG, bytes are YCbCr — good enough for palette)
  const sampleStep = Math.max(1, Math.floor(buf.length / (count * 50)));
  const pixels = [];
  for (let i = 0; i < buf.length - 2; i += sampleStep) {
    pixels.push([buf[i] & 0xFF, buf[i + 1] & 0xFF, buf[i + 2] & 0xFF]);
  }
  if (pixels.length === 0) return { color_count: 0, colors: [] };

  // Quantize to 64-level RGB
  const buckets = new Map();
  for (const [r, g, b] of pixels) {
    const qr = Math.round(r / 4) * 4;
    const qg = Math.round(g / 4) * 4;
    const qb = Math.round(b / 4) * 4;
    const key = `${qr},${qg},${qb}`;
    buckets.set(key, (buckets.get(key) || 0) + 1);
  }

  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).slice(0, count);
  const total = pixels.length;

  return {
    color_count: sorted.length,
    colors: sorted.map(([key, freq]) => {
      const [qr, qg, qb] = key.split(',').map(Number);
      return {
        rgb: [Math.min(255, qr), Math.min(255, qg), Math.min(255, qb)],
        hex: '#' + [qr, qg, qb].map((x) => Math.min(255, x).toString(16).padStart(2, '0')).join(''),
        weight: parseFloat((freq / total).toFixed(4)),
      };
    }),
  };
}

// SVG illustration generator (pure Node.js, no external deps)
function generateSvg(prompt, palette, width, height) {
  const w = Math.min(4096, Math.max(64, parseInt(width || 512, 10)));
  const h = Math.min(4096, Math.max(64, parseInt(height || 512, 10)));
  const bg = palette.colors?.[0]?.hex || '#f8f9fa';
  const primary = palette.colors?.[1]?.hex || '#2d3748';
  const accent = palette.colors?.[2]?.hex || '#4fd1c5';

  // Simple geometric illustration based on prompt keywords
  const p = (prompt.prompt || '').toLowerCase();
  let shapes = '';

  if (p.includes('circle') || p.includes('round')) {
    shapes += `<circle cx="${w * 0.5}" cy="${h * 0.4}" r="${Math.min(w, h) * 0.25}" fill="${primary}" opacity="0.85"/>`;
  }
  if (p.includes('line') || p.includes('bar')) {
    for (let i = 0; i < 5; i++) {
      const x = w * 0.2 + i * w * 0.12;
      const bh = h * 0.1 + Math.random() * h * 0.3;
      shapes += `<rect x="${x}" y="${h * 0.7 - bh}" width="${w * 0.08}" height="${bh}" fill="${accent}" rx="2"/>`;
    }
  }
  if (p.includes('mountain') || p.includes('landscape')) {
    shapes += `<polygon points="0,${h} ${w * 0.35},${h * 0.4} ${w * 0.7},${h * 0.65} ${w},${h * 0.5} ${w},${h} 0,${h}" fill="${primary}" opacity="0.6"/>`;
    shapes += `<polygon points="0,${h} ${w * 0.15},${h * 0.6} ${w * 0.5},${h * 0.35} ${w * 0.8},${h * 0.55} ${w},${h * 0.7} ${w},${h} 0,${h}" fill="${accent}" opacity="0.4"/>`;
  }
  if (p.includes('person') || p.includes('face') || p.includes('portrait')) {
    shapes += `<circle cx="${w * 0.5}" cy="${h * 0.35}" r="${w * 0.12}" fill="${primary}"/>`;
    shapes += `<ellipse cx="${w * 0.5}" cy="${h * 0.75}" rx="${w * 0.2}" ry="${h * 0.2}" fill="${primary}" opacity="0.7"/>`;
  }
  if (p.includes('building') || p.includes('house') || p.includes('city')) {
    for (let i = 0; i < 4; i++) {
      const bw = w * 0.15 + Math.random() * w * 0.1;
      const bh = h * 0.2 + Math.random() * h * 0.4;
      const bx = w * 0.1 + i * w * 0.22;
      shapes += `<rect x="${bx}" y="${h - bh - 10}" width="${bw}" height="${bh}" fill="${i % 2 === 0 ? primary : accent}" opacity="0.7"/>`;
    }
  }
  if (p.includes('tree') || p.includes('plant') || p.includes('nature')) {
    shapes += `<rect x="${w * 0.45}" y="${h * 0.55}" width="${w * 0.1}" height="${h * 0.35}" fill="#8B4513"/>`;
    shapes += `<circle cx="${w * 0.5}" cy="${h * 0.4}" r="${w * 0.22}" fill="${primary}" opacity="0.8"/>`;
  }
  if (p.includes('chart') || p.includes('graph') || p.includes('data')) {
    for (let i = 0; i < 6; i++) {
      const x = w * 0.15 + i * w * 0.12;
      const bh = h * 0.1 + Math.sin(i * 0.8) * h * 0.25 + h * 0.15;
      shapes += `<rect x="${x}" y="${h * 0.8 - bh}" width="${w * 0.08}" height="${bh}" fill="${i % 2 === 0 ? primary : accent}"/>`;
    }
  }

  // Default: abstract geometric composition
  if (!shapes) {
    shapes = `
      <circle cx="${w * 0.3}" cy="${h * 0.3}" r="${w * 0.18}" fill="${primary}" opacity="0.6"/>
      <rect x="${w * 0.5}" y="${h * 0.4}" width="${w * 0.35}" height="${h * 0.35}" fill="${accent}" opacity="0.5" transform="rotate(15,${w * 0.675},${h * 0.575})"/>
      <circle cx="${w * 0.7}" cy="${h * 0.25}" r="${w * 0.1}" fill="${palette.colors?.[3]?.hex || '#f6ad55'}" opacity="0.7"/>
    `;
  }

  const label = (prompt.prompt || 'generated').replace(/[<>&"']/g, '').slice(0, 60);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="${bg}"/>${shapes}<text x="10" y="${h - 10}" font-family="sans-serif" font-size="${Math.max(10, w * 0.025)}" fill="${primary}" opacity="0.4">${label}</text></svg>`;
  return { svg, format: 'svg', width: w, height: h, bytes: Buffer.byteLength(svg, 'utf8') };
}

// DALL-E image generation
async function renderDalle(promptText, size, quality, style) {
  const dalleStyle = style === 'photorealistic' || style === 'cinematic' ? 'vivid' : 'natural';

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DALL_E_MODEL,
      prompt: promptText,
      n: 1,
      size: size || IMAGE_SIZE,
      quality: quality === 'ultra' ? 'hd' : 'standard',
      style: dalleStyle,
      response_format: 'url',
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DALL-E API error ${response.status}: ${err}`);
  }

  const json = await response.json();
  const result = json.data?.[0];
  if (!result) throw new Error('No image returned from DALL-E');

  return {
    url: result.url,
    revised_prompt: result.revised_prompt || promptText,
    model: DALL_E_MODEL,
    size: size || IMAGE_SIZE,
    format: 'url',
  };
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
    input_summary: typeof input === 'string' ? { chars: input.length } : { ...input },
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

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'mm-visual-generator', port: PORT, render: USE_STUB ? 'svg-stub' : 'openai-dalle', model: DALL_E_MODEL }));
  app.get('/ready', (_req, res) => res.json({ ok: true, mode: USE_STUB ? 'stub' : 'live' }));

  app.post('/prompt', requireInternal, (req, res) => {
    const text = req.body.text || '';
    if (!text.trim()) return res.status(400).json({ error: 'validation', message: 'text required' });
    const opts = req.body.opts || {};
    if (opts.style && !STYLES.includes(opts.style)) return res.status(400).json({ error: 'invalid_style', supported: STYLES });
    if (opts.template && !TEMPLATES.includes(opts.template)) return res.status(400).json({ error: 'invalid_template', supported: TEMPLATES });
    const job = createJob('prompt', { text, opts }, buildPrompt(text, opts));
    res.status(201).json(job);
  });

  app.post('/layout', requireInternal, (req, res) => {
    const text = req.body.text || '';
    if (!text.trim()) return res.status(400).json({ error: 'validation', message: 'text required' });
    const job = createJob('layout', { text, intent: req.body.intent }, suggestLayout(text, req.body.intent));
    res.status(201).json(job);
  });

  app.post('/palette', requireInternal, (req, res) => {
    if (!req.body || !req.body.data) return res.status(400).json({ error: 'validation', message: 'data (base64) required' });
    const buf = Buffer.from(req.body.data, 'base64');
    if (buf.length === 0) return res.status(400).json({ error: 'validation', message: 'data cannot be empty' });
    const count = parseInt(req.body.count || '5', 10);
    const job = createJob('palette', { size: buf.length, count }, extractPalette(buf, Math.min(20, Math.max(1, count))));
    res.status(201).json(job);
  });

  app.post('/render', requireInternal, async (req, res) => {
    const prompt = req.body.prompt || {};
    const promptText = prompt.prompt || prompt.text || '';
    if (!promptText.trim()) return res.status(400).json({ error: 'validation', message: 'prompt.prompt or prompt.text required' });
    const opts = prompt.opts || req.body.opts || {};
    const enriched = buildPrompt(promptText, opts);
    const size = opts.size || IMAGE_SIZE;
    const quality = opts.quality || 'standard';

    try {
      let result;
      if (USE_STUB) {
        // Fallback: generate SVG illustration
        const palette = req.body.palette || { colors: [{ hex: '#e2e8f0' }, { hex: '#4a5568' }, { hex: '#38b2ac' }] };
        result = generateSvg(enriched, palette, opts.width, opts.height);
      } else {
        result = await renderDalle(enriched.prompt, size, quality, opts.style);
      }
      const job = createJob('render', { prompt: enriched.prompt, opts, enriched: !USE_STUB }, result);
      res.status(201).json(job);
    } catch (e) {
      console.error('render error:', e.message);
      // Graceful fallback to SVG on DALL-E failure
      const palette = req.body.palette || { colors: [{ hex: '#e2e8f0' }, { hex: '#4a5568' }, { hex: '#38b2ac' }] };
      const result = generateSvg(enriched, palette, opts.width, opts.height);
      result.warning = `DALL-E failed: ${e.message}. Using SVG fallback.`;
      const job = createJob('render', { prompt: enriched.prompt, opts }, result);
      res.status(201).json(job);
    }
  });

  app.post('/render/svg', requireInternal, (req, res) => {
    const prompt = req.body.prompt || {};
    const palette = req.body.palette || { colors: [{ hex: '#f7fafc' }, { hex: '#2d3748' }, { hex: '#38b2ac' }] };
    const width = parseInt(req.body.width || '512', 10);
    const height = parseInt(req.body.height || '512', 10);
    if (!prompt.prompt && !prompt.text) return res.status(400).json({ error: 'validation', message: 'prompt.prompt required' });
    const enriched = buildPrompt(prompt.prompt || prompt.text, prompt.opts || {});
    const result = generateSvg(enriched, palette, width, height);
    const job = createJob('render_svg', { prompt: enriched.prompt, palette, width, height }, result);
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

  app.get('/styles', (_req, res) => res.json({ styles: STYLES, count: STYLES.length }));
  app.get('/templates', (_req, res) => res.json({ templates: TEMPLATES, count: TEMPLATES.length }));
  app.get('/layouts', (_req, res) => res.json({ layouts: LAYOUTS, count: LAYOUTS.length }));
  app.get('/models', (_req, res) => res.json({ models: DALL_E_MODELS, active: DALL_E_MODEL }));
  app.get('/modes', (_req, res) => res.json({ stub: USE_STUB, has_api_key: !!OPENAI_API_KEY, model: DALL_E_MODEL }));

  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));
  return app;
}

if (require.main === module) {
  const app = createApp();
  if (USE_STUB) console.log(`mm-visual-generator (SVG stub mode — set OPENAI_API_KEY for DALL-E)`);
  else console.log(`mm-visual-generator (OpenAI DALL-E ${DALL_E_MODEL})`);
  app.listen(PORT, () => console.log(`mm-visual-generator listening on ${PORT}`));
}

module.exports = { createApp };
