/**
 * Industry Packs (port 4148)
 *
 * Marketplace & Network service. Vertical bundles that combine Industry OS +
 * AI Agents + Workflows + Twins + Integrations into one purchasable bundle.
 *
 *   - Publishers define packs (industry + components + price)
 *   - Consumers browse, search, install or subscribe
 *   - Pack composition is explicit: list of services, agents, twins, workflows, integrations
 *   - Pricing can be subscription, one-time, or usage-based
 *   - Ratings + reviews tracked
 *   - Featured + trending rollups
 *
 * On install, the service records what was deployed into the buyer's org
 * (registry of orgs -> deployed packs -> composed services).
 *
 * Port: 4148
 * Pattern: in-memory + Express 5 (mirrors skill-marketplace)
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

const PORT = process.env.INDUSTRY_PACKS_PORT || 4148;
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

const listings = new PersistentMap('listings', { serviceName: 'industry-packs' });     // listingId -> pack listing
const reviews = new PersistentMap('reviews', { serviceName: 'industry-packs' });      // reviewId -> review
const categories = new PersistentMap('categories', { serviceName: 'industry-packs' });   // categoryId -> {name, parent}
const purchases = new PersistentMap('purchases', { serviceName: 'industry-packs' });    // purchaseId -> purchase record
const installs = new PersistentMap('installs', { serviceName: 'industry-packs' });     // installId -> {packId, buyerOrg, components[], deployedAt}
const audit = [];

// =============================================================================
// SEED
// =============================================================================

function seed() {
  const cats = [
    { id: 'cat-hospitality', name: 'Hospitality',   parent: null },
    { id: 'cat-retail',      name: 'Retail',        parent: null },
    { id: 'cat-healthcare',  name: 'Healthcare',    parent: null },
    { id: 'cat-services',    name: 'Professional Services', parent: null },
    { id: 'cat-finance',     name: 'Finance',       parent: null },
    { id: 'cat-education',   name: 'Education',     parent: null },
  ];
  cats.forEach((c) => categories.set(c.id, c));

  const sample = [
    {
      packId: 'pk-restaurant-starter', title: 'Restaurant Starter Pack', category: 'cat-hospitality', price: 499,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: true,
      industry: 'restaurant',
      components: {
        services: [{ name: 'restaurant-os', port: 5010 }, { name: 'sales-os', port: 5055 }],
        agents: [{ name: 'reservation-bot' }, { name: 'menu-recommender' }, { name: 'review-sentiment' }],
        twins: [{ twinType: 'restaurant', schema: 'menu+tables+orders' }],
        workflows: [{ name: 'order-to-kitchen' }, { name: 'reservation-confirm' }],
        integrations: [{ name: 'stripe-payments' }, { name: 'twilio-sms' }],
      },
      description: 'Everything a restaurant needs: OS + 3 AI agents + 1 twin + 2 workflows + 2 integrations.',
    },
    {
      packId: 'pk-hotel-starter', title: 'Hotel Starter Pack', category: 'cat-hospitality', price: 899,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: true,
      industry: 'hotel',
      components: {
        services: [{ name: 'hotel-os', port: 5025 }, { name: 'marketing-os', port: 5500 }],
        agents: [{ name: 'booking-assistant' }, { name: 'concierge-bot' }, { name: 'review-monitor' }],
        twins: [{ twinType: 'hotel', schema: 'rooms+bookings+guests' }],
        workflows: [{ name: 'guest-checkin' }, { name: 'post-stay-followup' }],
        integrations: [{ name: 'stripe-payments' }, { name: 'whatsapp-business' }],
      },
      description: 'Complete hotel OS with booking + concierge agents, 1 hotel twin, 2 workflows, 2 integrations.',
    },
    {
      packId: 'pk-beauty-starter', title: 'Beauty & Salon Starter Pack', category: 'cat-services', price: 299,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: false,
      industry: 'beauty',
      components: {
        services: [{ name: 'beauty-os', port: 5090 }],
        agents: [{ name: 'appointment-reminder' }, { name: 'service-recommender' }],
        twins: [{ twinType: 'stylist', schema: 'skills+availability' }],
        workflows: [{ name: 'appointment-reminder-24h' }, { name: 'membership-renewal' }],
        integrations: [{ name: 'whatsapp-business' }],
      },
      description: 'Beauty OS + 2 agents + stylist twin + 2 workflows + WhatsApp integration.',
    },
    {
      packId: 'pk-healthcare-starter', title: 'Healthcare Starter Pack', category: 'cat-healthcare', price: 1499,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: true,
      industry: 'healthcare',
      components: {
        services: [{ name: 'healthcare-os', port: 5020 }],
        agents: [{ name: 'patient-triage' }, { name: 'appointment-scheduler' }, { name: 'prescription-checker' }],
        twins: [{ twinType: 'patient', schema: 'demographics+conditions+medications' }],
        workflows: [{ name: 'patient-intake' }, { name: 'appointment-confirm' }, { name: 'prescription-refill' }],
        integrations: [{ name: 'twilio-sms' }, { name: 'stripe-payments' }],
      },
      description: 'HIPAA-ready: patient twin + 3 clinical agents + 3 workflows.',
    },
    {
      packId: 'pk-retail-starter', title: 'Retail Starter Pack', category: 'cat-retail', price: 599,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: false,
      industry: 'retail',
      components: {
        services: [{ name: 'retail-os', port: 5030 }, { name: 'marketing-os', port: 5500 }],
        agents: [{ name: 'product-recommender' }, { name: 'cart-abandon-recovery' }, { name: 'demand-forecaster' }],
        twins: [{ twinType: 'customer', schema: 'profile+LTV+segments' }, { twinType: 'product', schema: 'catalog+inventory' }],
        workflows: [{ name: 'abandoned-cart-recovery' }, { name: 'loyalty-reward' }],
        integrations: [{ name: 'shopify' }, { name: 'stripe-payments' }],
      },
      description: 'Retail OS + 3 AI agents + 2 twins + 2 workflows + 2 integrations.',
    },
    {
      packId: 'pk-legal-starter', title: 'Legal Practice Starter Pack', category: 'cat-services', price: 799,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: false,
      industry: 'legal',
      components: {
        services: [{ name: 'legal-os', port: 5035 }],
        agents: [{ name: 'contract-analyzer' }, { name: 'case-researcher' }, { name: 'document-summarizer' }],
        twins: [{ twinType: 'case', schema: 'parties+filings+deadlines' }],
        workflows: [{ name: 'contract-review' }, { name: 'deadline-reminder' }],
        integrations: [],
      },
      description: 'Legal OS + 3 AI agents + case twin + 2 workflows.',
    },
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
    service: 'industry-packs',
    version: '1.0.0',
    port: PORT,
    counts: {
      listings: listings.size,
      categories: categories.size,
      reviews: reviews.size,
      purchases: purchases.size,
      installs: installs.size,
    },
    capabilities: [
      'categories', 'listings-create', 'listings-list', 'listings-get',
      'listings-search', 'listings-update', 'listings-delete',
      'reviews-create', 'reviews-list',
      'purchase', 'install', 'purchases-list', 'installs-list',
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
  const { title, description, category, price, pricingModel, publisher, packId, industry, components, tags } = req.body || {};
  if (!title || !price || !pricingModel || !industry || !components) {
    return res.status(400).json({ error: 'title, price, pricingModel, industry, components required' });
  }
  if (category && !categories.has(category)) return res.status(400).json({ error: 'unknown category' });
  const id = uuidv4();
  const listing = {
    id, title, description: description || '',
    category: category || 'cat-services', price, pricingModel,
    publisher: publisher || 'unknown',
    packId: packId || `pk-${id.slice(0, 6)}`,
    industry, components,
    tags: Array.isArray(tags) ? tags : [],
    status: 'published', rating: 0, reviewCount: 0, sales: 0,
    createdAt: new Date().toISOString(),
  };
  listings.set(id, listing);
  auditLog({ kind: 'listing-created', id, title, industry });
  res.status(201).json(listing);
});

app.get('/api/listings', (req, res) => {
  const { category, publisher, status, q, minRating, maxPrice, pricingModel, industry, featured, sort } = req.query;
  let list = Array.from(listings.values());
  if (category) list = list.filter((l) => l.category === category);
  if (publisher) list = list.filter((l) => l.publisher === publisher);
  if (status) list = list.filter((l) => l.status === status);
  if (pricingModel) list = list.filter((l) => l.pricingModel === pricingModel);
  if (industry) list = list.filter((l) => l.industry === industry);
  if (featured === 'true') list = list.filter((l) => l.featured);
  if (minRating) list = list.filter((l) => l.rating >= parseFloat(minRating));
  if (maxPrice) list = list.filter((l) => l.price <= parseFloat(maxPrice));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((l) =>
      (l.title || '').toLowerCase().includes(needle) ||
      (l.description || '').toLowerCase().includes(needle) ||
      (l.industry || '').toLowerCase().includes(needle) ||
      (l.publisher || '').toLowerCase().includes(needle)
    );
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
  const allowed = ['title', 'description', 'price', 'pricingModel', 'tags', 'status', 'featured', 'components'];
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
  const allReviews = Array.from(reviews.values()).filter((rev) => rev.listingId === l.id);
  l.reviewCount = allReviews.length;
  l.rating = allReviews.reduce((s, x) => s + x.rating, 0) / allReviews.length;
  res.status(201).json(review);
});

app.get('/api/listings/:id/reviews', (req, res) => {
  const list = Array.from(reviews.values()).filter((r) => r.listingId === req.params.id);
  res.json({ count: list.length, reviews: list });
});

// ── Purchase + Install ──────────────────────────────────────────────���──────

app.post('/api/purchases',requireAuth,  (req, res) => {
  const { listingId, buyer, plan } = req.body || {};
  const l = listings.get(listingId);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  const id = uuidv4();
  const purchase = {
    id, listingId,
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

// install = "deploy every component in the pack into the buyer's org"
app.post('/api/installs',requireAuth,  (req, res) => {
  const { listingId, buyerOrg } = req.body || {};
  const l = listings.get(listingId);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  const id = uuidv4();
  const deployedComponents = [];
  const comps = l.components || {};
  // pretend each component is deployed
  for (const svc of (comps.services || [])) {
    deployedComponents.push({ kind: 'service', name: svc.name, port: svc.port, status: 'deployed', endpoint: `http://localhost:${svc.port}/health` });
  }
  for (const a of (comps.agents || [])) {
    deployedComponents.push({ kind: 'agent', name: a.name, status: 'deployed', runtime: 'ai-intelligence:4881' });
  }
  for (const t of (comps.twins || [])) {
    deployedComponents.push({ kind: 'twin', twinType: t.twinType, schema: t.schema, status: 'deployed', runtime: 'twinOS-Hub:4705' });
  }
  for (const w of (comps.workflows || [])) {
    deployedComponents.push({ kind: 'workflow', name: w.name, status: 'deployed', runtime: 'flow-orchestrator:4244' });
  }
  for (const i of (comps.integrations || [])) {
    deployedComponents.push({ kind: 'integration', name: i.name, status: 'installed', runtime: 'connector-hub:4785' });
  }
  const install = {
    id,
    listingId,
    packId: l.packId,
    industry: l.industry,
    buyerOrg: buyerOrg || 'anonymous',
    instanceId: `pki-${uuidv4().slice(0, 8)}`,
    deployedAt: new Date().toISOString(),
    components: deployedComponents,
    componentCount: deployedComponents.length,
  };
  installs.set(id, install);
  auditLog({ kind: 'install', listingId, buyerOrg: install.buyerOrg, instanceId: install.instanceId, componentCount: install.componentCount });
  res.status(201).json(install);
});

app.get('/api/purchases', (req, res) => {
  const { buyer, listingId } = req.query;
  let list = Array.from(purchases.values());
  if (buyer) list = list.filter((p) => p.buyer === buyer);
  if (listingId) list = list.filter((p) => p.listingId === listingId);
  res.json({ count: list.length, purchases: list });
});

app.get('/api/installs', (req, res) => {
  const { buyerOrg, listingId, industry } = req.query;
  let list = Array.from(installs.values());
  if (buyerOrg) list = list.filter((i) => i.buyerOrg === buyerOrg);
  if (listingId) list = list.filter((i) => i.listingId === listingId);
  if (industry) list = list.filter((i) => i.industry === industry);
  res.json({ count: list.length, installs: list });
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[industry-packs]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`[industry-packs] listening on :${PORT}`);
  });
  installGracefulShutdown(server);
}

export default app;