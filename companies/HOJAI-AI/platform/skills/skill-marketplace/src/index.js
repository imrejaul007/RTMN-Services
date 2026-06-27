/**
 * Skill Marketplace (port 4120)
 *
 * Marketplace & Network service. Buy/sell skills separately from agents.
 *
 *   - Publishers create listings (skill + price + license)
 *   - Consumers browse, search, purchase or subscribe
 *   - Ratings + reviews tracked
 *   - Skill taxonomy / categories
 *   - Featured + trending rollups
 *
 * SkillOS (4743) is the runtime that executes the skill; this marketplace
 * is the storefront that lists, prices, and rates them.
 *
 * Port: 4120
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

const PORT = process.env.SKILL_MARKETPLACE_PORT || 4120;
const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


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

const listings = new PersistentMap('listings', { serviceName: 'skill-marketplace' });     // listingId -> listing
const reviews = new PersistentMap('reviews', { serviceName: 'skill-marketplace' });      // reviewId -> review
const categories = new PersistentMap('categories', { serviceName: 'skill-marketplace' });   // categoryId -> {name, parent}
const purchases = new PersistentMap('purchases', { serviceName: 'skill-marketplace' });    // purchaseId -> purchase record
const audit = [];

// =============================================================================
// SEED
// =============================================================================

function seed() {
  const cats = [
    { id: 'cat-ai',      name: 'AI & Reasoning',     parent: null },
    { id: 'cat-commerce', name: 'Commerce',          parent: null },
    { id: 'cat-biz',     name: 'Business',           parent: null },
    { id: 'cat-prod',    name: 'Productivity',       parent: null },
    { id: 'cat-comm',    name: 'Communication',      parent: null },
    { id: 'cat-industry',name: 'Industry',           parent: null },
  ];
  cats.forEach((c) => categories.set(c.id, c));

  const sample = [
    { skillId: 'skl-reason',  title: 'ReAct Reasoner',           category: 'cat-ai',       price: 49, pricingModel: 'one-time', publisher: 'HOJAI', featured: true },
    { skillId: 'skl-crm',     title: 'CRM Lead Lookup',          category: 'cat-commerce', price: 19, pricingModel: 'subscription', publisher: 'AdBazaar' },
    { skillId: 'skl-cal',     title: 'Calendar Conflict Check',  category: 'cat-prod',     price: 9,  pricingModel: 'subscription', publisher: 'Genie' },
    { skillId: 'skl-wa',      title: 'WhatsApp Send',            category: 'cat-comm',     price: 29, pricingModel: 'usage',       publisher: 'Genie' },
    { skillId: 'skl-rest',    title: 'Restaurant Booking',       category: 'cat-industry', price: 39, pricingModel: 'subscription', publisher: 'RestaurantOS' },
  ];
  for (const s of sample) {
    const id = uuidv4();
    listings.set(id, {
      id, ...s, status: 'published', rating: 4.5, reviewCount: 0,
      createdAt: new Date().toISOString(), sales: 0,
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

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'skill-marketplace',
    version: '1.0.0',
    port: PORT,
    counts: {
      listings: listings.size,
      categories: categories.size,
      reviews: reviews.size,
      purchases: purchases.size,
    },
    capabilities: [
      'categories', 'listings-create', 'listings-list', 'listings-get',
      'listings-search', 'listings-update', 'listings-delete',
      'reviews-create', 'reviews-list',
      'purchase', 'purchases-list',
      'featured', 'trending',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Categories ─────────────────────────────────────────────────────────────

app.get('/api/categories', (_req, res) => {
  res.json({ categories: Array.from(categories.values()) });
});

app.post('/api/categories',requireAuth,  (req, res) => {
  const { name, parent } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = 'cat-' + uuidv4().slice(0, 6);
  const c = { id, name, parent: parent || null };
  categories.set(id, c);
  res.status(201).json(c);
});

// ── Listings ───────────────────────────────────────────────────────────────

app.post('/api/listings',requireAuth,  (req, res) => {
  const { title, description, category, price, pricingModel, publisher, skillId, tags } = req.body || {};
  if (!title || !price || !pricingModel) {
    return res.status(400).json({ error: 'title, price, pricingModel required' });
  }
  if (!categories.has(category)) return res.status(400).json({ error: 'unknown category' });
  const id = uuidv4();
  const listing = {
    id, title, description: description || '',
    category, price, pricingModel,
    publisher: publisher || 'unknown',
    skillId: skillId || `skl-${id.slice(0, 6)}`,
    tags: Array.isArray(tags) ? tags : [],
    status: 'published', rating: 0, reviewCount: 0, sales: 0,
    createdAt: new Date().toISOString(),
  };
  listings.set(id, listing);
  auditLog({ kind: 'listing-created', id, title });
  res.status(201).json(listing);
});

app.get('/api/listings', (req, res) => {
  const { category, publisher, status, q, minRating, maxPrice, pricingModel, featured, sort } = req.query;
  let list = Array.from(listings.values());
  if (category) list = list.filter((l) => l.category === category);
  if (publisher) list = list.filter((l) => l.publisher === publisher);
  if (status) list = list.filter((l) => l.status === status);
  if (pricingModel) list = list.filter((l) => l.pricingModel === pricingModel);
  if (featured === 'true') list = list.filter((l) => l.featured);
  if (minRating) list = list.filter((l) => l.rating >= parseFloat(minRating));
  if (maxPrice) list = list.filter((l) => l.price <= parseFloat(maxPrice));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(needle) || (l.description || '').toLowerCase().includes(needle));
  }
  if (sort === 'price-asc')  list.sort((a, b) => a.price - b.price);
  if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
  if (sort === 'rating')     list.sort((a, b) => b.rating - a.rating);
  if (sort === 'sales')      list.sort((a, b) => b.sales - a.sales);
  res.json({ count: list.length, listings: list });
});

app.get('/api/listings/featured', (_req, res) => {
  res.json({ listings: Array.from(listings.values()).filter((l) => l.featured) });
});

app.get('/api/listings/trending', (_req, res) => {
  const list = Array.from(listings.values()).sort((a, b) => b.sales - a.sales).slice(0, 10);
  res.json({ listings: list });
});

app.get('/api/listings/:id', (req, res) => {
  const l = listings.get(req.params.id);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  res.json(l);
});

app.patch('/api/listings/:id',requireAuth,  (req, res) => {
  const l = listings.get(req.params.id);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  const allowed = ['title', 'description', 'price', 'pricingModel', 'tags', 'status', 'featured'];
  for (const k of allowed) {
    if (k in (req.body || {})) l[k] = req.body[k];
  }
  l.updatedAt = new Date().toISOString();
  res.json(l);
});

app.delete('/api/listings/:id',requireAuth,  (req, res) => {
  if (!listings.delete(req.params.id)) return res.status(404).json({ error: 'listing not found' });
  res.status(204).end();
});

// ── Reviews ────────────────────────────────────────────────────────────────

app.post('/api/listings/:id/reviews',requireAuth,  (req, res) => {
  const l = listings.get(req.params.id);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  const { rating, comment, reviewer } = req.body || {};
  const r = parseInt(rating);
  if (!r || r < 1 || r > 5) return res.status(400).json({ error: 'rating 1-5 required' });
  const id = uuidv4();
  const review = { id, listingId: l.id, rating: r, comment: comment || '', reviewer: reviewer || 'anonymous', createdAt: new Date().toISOString() };
  reviews.set(id, review);
  // Recompute listing aggregates
  const allReviews = Array.from(reviews.values()).filter((rev) => rev.listingId === l.id);
  l.reviewCount = allReviews.length;
  l.rating = allReviews.reduce((s, x) => s + x.rating, 0) / allReviews.length;
  res.status(201).json(review);
});

app.get('/api/listings/:id/reviews', (req, res) => {
  const list = Array.from(reviews.values()).filter((r) => r.listingId === req.params.id);
  res.json({ count: list.length, reviews: list });
});

// ── Purchase ───────────────────────────────────────────────────────────────

app.post('/api/purchases',requireAuth,  (req, res) => {
  const { listingId, buyer, plan } = req.body || {};
  const l = listings.get(listingId);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  const id = uuidv4();
  const purchase = {
    id,
    listingId,
    buyer: buyer || 'anonymous',
    plan: plan || l.pricingModel,
    amount: l.price,
    createdAt: new Date().toISOString(),
    status: 'completed',
  };
  purchases.set(id, purchase);
  l.sales += 1;
  auditLog({ kind: 'purchase', listingId, buyer: purchase.buyer, amount: purchase.amount });
  res.status(201).json(purchase);
});

app.get('/api/purchases', (req, res) => {
  const { buyer, listingId } = req.query;
  let list = Array.from(purchases.values());
  if (buyer) list = list.filter((p) => p.buyer === buyer);
  if (listingId) list = list.filter((p) => p.listingId === listingId);
  res.json({ count: list.length, purchases: list });
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// 404 + error handling
// =============================================================================

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

export default app;
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[skill-marketplace] listening on :${PORT}`);
  });
  installGracefulShutdown(server);
}

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[skill-marketplace]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});
