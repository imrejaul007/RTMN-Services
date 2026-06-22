/**
 * Prompt Marketplace (port 4130)
 *
 * Marketplace & Network service. Buy/sell prompt templates.
 *
 *   - Publishers list prompts (with model target + variables + sample I/O)
 *   - Consumers search by tag / model / intent
 *   - Versions, ratings, reviews
 *   - Featured + trending rollups
 *
 * Pairs with Prompt Manager (4771) which holds the canonical versions
 * inside a tenant; this marketplace is the public storefront.
 *
 * Port: 4130
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PROMPT_MARKETPLACE_PORT || 4130;
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const prompts = new PersistentMap('prompts', { serviceName: 'prompt-marketplace' });    // id -> prompt record
const versions = new PersistentMap('versions', { serviceName: 'prompt-marketplace' });   // versionId -> {promptId, version, body, vars, sampleIO, ...}
const reviews = new PersistentMap('reviews', { serviceName: 'prompt-marketplace' });    // reviewId -> review
const audit = [];

// =============================================================================
// SEED
// =============================================================================

function seed() {
  const samples = [
    {
      title: 'Restaurant Reservation Agent',
      model: 'gpt-4',
      tags: ['restaurant', 'booking', 'agent'],
      body: 'You are a polite restaurant booking assistant. Today is {{date}}. Help the user reserve a table for {{partySize}} at {{time}}.',
      vars: ['date', 'partySize', 'time'],
      featured: true,
      publisher: 'RestaurantOS',
      price: 5,
    },
    {
      title: 'Support Reply Triage',
      model: 'claude-3-sonnet',
      tags: ['support', 'triage', 'email'],
      body: 'Classify the following support email into one of: billing, bug, how-to, feature-request, other. Email:\n\n{{email}}',
      vars: ['email'],
      publisher: 'HOJAI',
      featured: true,
      price: 9,
    },
    {
      title: 'Code Review Senior',
      model: 'gpt-4',
      tags: ['code-review', 'engineering'],
      body: 'You are a senior staff engineer. Review the following {{language}} code for correctness, performance, and security:\n\n```{{language}}\n{{code}}\n```',
      vars: ['language', 'code'],
      publisher: 'HOJAI',
      price: 12,
    },
    {
      title: 'Lead Enrichment',
      model: 'gpt-3.5-turbo',
      tags: ['sales', 'crm', 'enrichment'],
      body: 'Given the following lead, infer industry, company size, and best contact channel:\n\nName: {{name}}\nEmail: {{email}}\nNotes: {{notes}}',
      vars: ['name', 'email', 'notes'],
      publisher: 'AdBazaar',
      price: 7,
    },
  ];

  for (const s of samples) {
    const id = uuidv4();
    const prompt = {
      id, title: s.title, model: s.model, tags: s.tags,
      description: s.title + ' — a production-grade prompt template.',
      publisher: s.publisher, featured: !!s.featured, price: s.price,
      currentVersion: 1, versionCount: 1,
      rating: 4.5, reviewCount: 0, sales: 0,
      createdAt: new Date().toISOString(), status: 'published',
    };
    prompts.set(id, prompt);
    const vId = uuidv4();
    versions.set(vId, {
      id: vId, promptId: id, version: 1,
      body: s.body, vars: s.vars, sampleIO: null,
      createdAt: new Date().toISOString(),
    });
  }
}
seed();

// =============================================================================
// HELPERS
// =============================================================================

function auditLog(entry) {
  audit.push({ id: uuidv4(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
}

function listVersions(promptId) {
  return Array.from(versions.values()).filter((v) => v.promptId === promptId).sort((a, b) => b.version - a.version);
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'prompt-marketplace',
    version: '1.0.0',
    port: PORT,
    counts: { prompts: prompts.size, versions: versions.size, reviews: reviews.size },
    capabilities: [
      'prompts-create', 'prompts-list', 'prompts-get', 'prompts-update', 'prompts-delete',
      'version-add', 'version-list', 'version-get', 'version-render',
      'review-create', 'review-list',
      'featured', 'trending',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Prompts ────────────────────────────────────────────────────────────────

app.post('/api/prompts',requireAuth,  (req, res) => {
  const { title, model, body, vars, tags, publisher, description, price } = req.body || {};
  if (!title || !model || !body) return res.status(400).json({ error: 'title, model, body required' });
  const id = uuidv4();
  const prompt = {
    id, title, model,
    description: description || '',
    publisher: publisher || 'unknown',
    tags: Array.isArray(tags) ? tags : [],
    price: price || 0,
    featured: false, currentVersion: 1, versionCount: 1,
    rating: 0, reviewCount: 0, sales: 0, status: 'published',
    createdAt: new Date().toISOString(),
  };
  prompts.set(id, prompt);
  const vId = uuidv4();
  versions.set(vId, { id: vId, promptId: id, version: 1, body, vars: Array.isArray(vars) ? vars : [], sampleIO: null, createdAt: new Date().toISOString() });
  auditLog({ kind: 'prompt-created', id, title });
  res.status(201).json(prompt);
});

app.get('/api/prompts', (req, res) => {
  const { tag, model, publisher, q, minRating, featured, sort } = req.query;
  let list = Array.from(prompts.values());
  if (tag) list = list.filter((p) => p.tags.includes(tag));
  if (model) list = list.filter((p) => p.model === model);
  if (publisher) list = list.filter((p) => p.publisher === publisher);
  if (minRating) list = list.filter((p) => p.rating >= parseFloat(minRating));
  if (featured === 'true') list = list.filter((p) => p.featured);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((p) => p.title.toLowerCase().includes(needle) || p.description.toLowerCase().includes(needle));
  }
  if (sort === 'rating') list.sort((a, b) => b.rating - a.rating);
  if (sort === 'sales')  list.sort((a, b) => b.sales - a.sales);
  res.json({ count: list.length, prompts: list });
});

app.get('/api/prompts/featured', (_req, res) => {
  res.json({ prompts: Array.from(prompts.values()).filter((p) => p.featured) });
});

app.get('/api/prompts/trending', (_req, res) => {
  const list = Array.from(prompts.values()).sort((a, b) => b.sales - a.sales).slice(0, 10);
  res.json({ prompts: list });
});

app.get('/api/prompts/:id', (req, res) => {
  const p = prompts.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'prompt not found' });
  res.json(p);
});

app.patch('/api/prompts/:id',requireAuth,  (req, res) => {
  const p = prompts.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'prompt not found' });
  const allowed = ['title', 'description', 'tags', 'price', 'featured', 'status'];
  for (const k of allowed) if (k in (req.body || {})) p[k] = req.body[k];
  p.updatedAt = new Date().toISOString();
  res.json(p);
});

app.delete('/api/prompts/:id',requireAuth,  (req, res) => {
  if (!prompts.delete(req.params.id)) return res.status(404).json({ error: 'prompt not found' });
  res.status(204).end();
});

// ── Versions ───────────────────────────────────────────────────────────────

app.post('/api/prompts/:id/versions',requireAuth,  (req, res) => {
  const p = prompts.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'prompt not found' });
  const { body, vars, sampleIO, changelog } = req.body || {};
  if (!body) return res.status(400).json({ error: 'body required' });
  const newVersion = p.currentVersion + 1;
  const vId = uuidv4();
  versions.set(vId, {
    id: vId, promptId: p.id, version: newVersion, body,
    vars: Array.isArray(vars) ? vars : [],
    sampleIO: sampleIO || null, changelog: changelog || '',
    createdAt: new Date().toISOString(),
  });
  p.currentVersion = newVersion;
  p.versionCount += 1;
  res.status(201).json({ versionId: vId, version: newVersion });
});

app.get('/api/prompts/:id/versions', (req, res) => {
  const p = prompts.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'prompt not found' });
  res.json({ count: p.versionCount, versions: listVersions(p.id) });
});

app.get('/api/prompts/:id/versions/:version', (req, res) => {
  const v = listVersions(req.params.id).find((x) => String(x.version) === String(req.params.version));
  if (!v) return res.status(404).json({ error: 'version not found' });
  res.json(v);
});

// Render a version with provided vars (substitutes {{var}} placeholders)
app.post('/api/prompts/:id/versions/:version/render',requireAuth,  (req, res) => {
  const v = listVersions(req.params.id).find((x) => String(x.version) === String(req.params.version));
  if (!v) return res.status(404).json({ error: 'version not found' });
  const vars = req.body || {};
  let out = v.body;
  for (const [k, val] of Object.entries(vars)) {
    out = out.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(val));
  }
  const missingVars = (v.vars || []).filter((vn) => !(vn in vars));
  res.json({ promptId: req.params.id, version: v.version, body: out, missingVars, renderedAt: new Date().toISOString() });
});

// ── Reviews ────────────────────────────────────────────────────────────────

app.post('/api/prompts/:id/reviews',requireAuth,  (req, res) => {
  const p = prompts.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'prompt not found' });
  const { rating, comment, reviewer } = req.body || {};
  const r = parseInt(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'rating 1-5 required' });
  const id = uuidv4();
  const review = { id, promptId: p.id, rating: r, comment: comment || '', reviewer: reviewer || 'anonymous', createdAt: new Date().toISOString() };
  reviews.set(id, review);
  const all = Array.from(reviews.values()).filter((rev) => rev.promptId === p.id);
  p.reviewCount = all.length;
  p.rating = all.reduce((s, x) => s + x.rating, 0) / all.length;
  res.status(201).json(review);
});

app.get('/api/prompts/:id/reviews', (req, res) => {
  const list = Array.from(reviews.values()).filter((r) => r.promptId === req.params.id);
  res.json({ count: list.length, reviews: list });
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[prompt-marketplace]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[prompt-marketplace] listening on :${PORT}`);
});
installGracefulShutdown(server);

export default app;
