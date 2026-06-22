/**
 * Connector Marketplace (port 4147)
 *
 * Marketplace & Network service. Buy/sell pre-built SaaS connectors.
 *
 *   - Publishers create listings (connector + price + license)
 *   - Consumers browse, search, install or subscribe
 *   - Connector taxonomy: crm / ecommerce / payments / comms / productivity / data
 *   - Listings include supported entities (lead, contact, deal, etc.) + auth method
 *   - Ratings + reviews tracked
 *   - Featured + trending rollups
 *
 * Connector Hub (4785) is the runtime that executes the connector;
 * this marketplace is the storefront that lists, prices, and rates them.
 *
 * Port: 4147
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

const PORT = process.env.CONNECTOR_MARKETPLACE_PORT || 4147;
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

const listings = new PersistentMap('listings', { serviceName: 'connector-marketplace' });
const reviews = new PersistentMap('reviews', { serviceName: 'connector-marketplace' });
const categories = new PersistentMap('categories', { serviceName: 'connector-marketplace' });
const purchases = new PersistentMap('purchases', { serviceName: 'connector-marketplace' });
const installs = new PersistentMap('installs', { serviceName: 'connector-marketplace' });
const audit = [];

// =============================================================================
// SEED
// =============================================================================

function seed() {
  const cats = [
    { id: 'cat-crm',         name: 'CRM',                parent: null },
    { id: 'cat-ecommerce',   name: 'E-Commerce',         parent: null },
    { id: 'cat-payments',    name: 'Payments',           parent: null },
    { id: 'cat-comms',       name: 'Communications',     parent: null },
    { id: 'cat-productivity',name: 'Productivity',       parent: null },
    { id: 'cat-data',        name: 'Data & Warehousing', parent: null },
  ];
  cats.forEach((c) => categories.set(c.id, c));

  const sample = [
    {
      connectorId: 'cnc-salesforce', title: 'Salesforce CRM Connector', category: 'cat-crm', price: 49,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: true,
      provider: 'salesforce', authMethod: 'oauth2', entities: ['lead', 'contact', 'opportunity', 'account'],
      description: 'Read/write Salesforce leads, contacts, opportunities, accounts.',
    },
    {
      connectorId: 'cnc-hubspot', title: 'HubSpot CRM Connector', category: 'cat-crm', price: 39,
      pricingModel: 'subscription', publisher: 'AdBazaar', featured: false,
      provider: 'hubspot', authMethod: 'oauth2', entities: ['contact', 'company', 'deal'],
      description: 'Read/write HubSpot contacts, companies, deals.',
    },
    {
      connectorId: 'cnc-stripe', title: 'Stripe Payments Connector', category: 'cat-payments', price: 29,
      pricingModel: 'usage', publisher: 'REZ', featured: true,
      provider: 'stripe', authMethod: 'api-key', entities: ['customer', 'subscription', 'invoice', 'charge'],
      description: 'Read/write Stripe customers, subscriptions, invoices, charges.',
    },
    {
      connectorId: 'cnc-shopify', title: 'Shopify E-Commerce Connector', category: 'cat-ecommerce', price: 59,
      pricingModel: 'subscription', publisher: 'REZ-Merchant', featured: true,
      provider: 'shopify', authMethod: 'oauth2', entities: ['product', 'order', 'customer', 'inventory'],
      description: 'Read/write Shopify products, orders, customers, inventory.',
    },
    {
      connectorId: 'cnc-slack', title: 'Slack Comms Connector', category: 'cat-comms', price: 19,
      pricingModel: 'subscription', publisher: 'Genie', featured: false,
      provider: 'slack', authMethod: 'oauth2', entities: ['channel', 'message', 'user'],
      description: 'Send/receive Slack messages, list channels/users.',
    },
    {
      connectorId: 'cnc-notion', title: 'Notion Productivity Connector', category: 'cat-productivity', price: 19,
      pricingModel: 'subscription', publisher: 'Genie', featured: false,
      provider: 'notion', authMethod: 'oauth2', entities: ['page', 'database', 'block'],
      description: 'Read/write Notion pages, databases, blocks.',
    },
    {
      connectorId: 'cnc-twilio', title: 'Twilio Comms Connector', category: 'cat-comms', price: 39,
      pricingModel: 'usage', publisher: 'HOJAI', featured: false,
      provider: 'twilio', authMethod: 'api-key', entities: ['sms', 'call', 'voicemail'],
      description: 'Send SMS, place calls, retrieve voicemails.',
    },
    {
      connectorId: 'cnc-gsheets', title: 'Google Sheets Connector', category: 'cat-data', price: 9,
      pricingModel: 'subscription', publisher: 'HOJAI', featured: false,
      provider: 'gsheets', authMethod: 'oauth2', entities: ['spreadsheet', 'row'],
      description: 'Read/write Google Sheets rows.',
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
    service: 'connector-marketplace',
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
  const { title, description, category, price, pricingModel, publisher, connectorId, provider, authMethod, entities, tags } = req.body || {};
  if (!title || !price || !pricingModel || !provider) {
    return res.status(400).json({ error: 'title, price, pricingModel, provider required' });
  }
  if (category && !categories.has(category)) return res.status(400).json({ error: 'unknown category' });
  const id = uuidv4();
  const listing = {
    id, title, description: description || '',
    category: category || 'cat-crm', price, pricingModel,
    publisher: publisher || 'unknown',
    connectorId: connectorId || `cnc-${id.slice(0, 6)}`,
    provider, authMethod: authMethod || 'api-key',
    entities: Array.isArray(entities) ? entities : [],
    tags: Array.isArray(tags) ? tags : [],
    status: 'published', rating: 0, reviewCount: 0, sales: 0,
    createdAt: new Date().toISOString(),
  };
  listings.set(id, listing);
  auditLog({ kind: 'listing-created', id, title, provider });
  res.status(201).json(listing);
});

app.get('/api/listings', (req, res) => {
  const { category, publisher, status, q, minRating, maxPrice, pricingModel, provider, featured, sort } = req.query;
  let list = Array.from(listings.values());
  if (category) list = list.filter((l) => l.category === category);
  if (publisher) list = list.filter((l) => l.publisher === publisher);
  if (status) list = list.filter((l) => l.status === status);
  if (pricingModel) list = list.filter((l) => l.pricingModel === pricingModel);
  if (provider) list = list.filter((l) => l.provider === provider);
  if (featured === 'true') list = list.filter((l) => l.featured);
  if (minRating) list = list.filter((l) => l.rating >= parseFloat(minRating));
  if (maxPrice) list = list.filter((l) => l.price <= parseFloat(maxPrice));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((l) => l.title.toLowerCase().includes(needle) || (l.description || '').toLowerCase().includes(needle) || l.provider.toLowerCase().includes(needle));
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
  const allowed = ['title', 'description', 'price', 'pricingModel', 'tags', 'status', 'featured', 'entities', 'authMethod'];
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

// install = "register this connector in my connector-hub workspace"
app.post('/api/installs',requireAuth,  (req, res) => {
  const { listingId, buyerOrg } = req.body || {};
  const l = listings.get(listingId);
  if (!l) return res.status(404).json({ error: 'listing not found' });
  const id = uuidv4();
  const install = {
    id,
    listingId,
    connectorId: l.connectorId,
    provider: l.provider,
    buyerOrg: buyerOrg || 'anonymous',
    instanceId: `cni-${uuidv4().slice(0, 8)}`,
    deployedAt: new Date().toISOString(),
    authMethod: l.authMethod,
    entities: l.entities,
    runtime: 'connector-hub:4785',
    configSteps: [
      `1. Open connector-hub:4785/configure/${l.connectorId}`,
      `2. Provide ${l.authMethod.toUpperCase()} credentials`,
      `3. Map entities: ${l.entities.join(', ')}`,
    ],
  };
  installs.set(id, install);
  auditLog({ kind: 'install', listingId, buyerOrg: install.buyerOrg, instanceId: install.instanceId });
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
  const { buyerOrg, listingId } = req.query;
  let list = Array.from(installs.values());
  if (buyerOrg) list = list.filter((i) => i.buyerOrg === buyerOrg);
  if (listingId) list = list.filter((i) => i.listingId === listingId);
  res.json({ count: list.length, installs: list });
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
  console.error('[connector-marketplace]', err);
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
  console.log(`[connector-marketplace] listening on :${PORT}`);
});
installGracefulShutdown(server);

export default app;