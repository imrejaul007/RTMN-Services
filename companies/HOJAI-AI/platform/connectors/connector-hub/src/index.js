/**
 * Connector Hub (port 4855)
 *
 * The "Data Connectors" half of Division 6. Each connector is a small
 * adapter that exposes a common interface over a third-party SaaS:
 *
 *   - listResources(kind)         → [{id, name, ...}]
 *   - getResource(kind, id)       → {...}
 *   - createResource(kind, body)  → {...}
 *   - updateResource(kind, id, b) → {...}
 *   - deleteResource(kind, id)    → {ok}
 *   - search(kind, query)         → [{...}]
 *   - sync(kind, since?)          → {count, syncedAt, items}
 *
 * In production each adapter wraps the vendor's official SDK. Here we
 * ship deterministic in-memory mocks so the API contract is real and
 * testable without vendor accounts.
 *
 * Connectors shipped:
 *   - salesforce   (leads, contacts, opportunities)
 *   - hubspot      (contacts, companies, deals)
 *   - stripe       (customers, charges, subscriptions)
 *   - shopify      (products, orders, customers)
 *   - slack        (channels, messages, members)
 *   - notion       (pages, databases, blocks)
 *   - gsheets      (spreadsheets, values)
 *   - twilio       (messages, calls)
 *
 * Port: 4855 (was 4785, conflicted with reasoning-engine — fixed 2026-06-27)
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

const PORT = process.env.CONNECTOR_HUB_PORT || 4855;
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
// CONNECTOR REGISTRY
// =============================================================================

const CONNECTORS = {
  salesforce: {
    name: 'salesforce',
    label: 'Salesforce CRM',
    version: 'v1.0',
    kinds: ['lead', 'contact', 'opportunity', 'account'],
    description: 'Salesforce leads/contacts/opportunities/accounts.',
  },
  hubspot: {
    name: 'hubspot',
    label: 'HubSpot CRM',
    version: 'v1.0',
    kinds: ['contact', 'company', 'deal', 'ticket'],
    description: 'HubSpot contacts/companies/deals/tickets.',
  },
  stripe: {
    name: 'stripe',
    label: 'Stripe Payments',
    version: 'v1.0',
    kinds: ['customer', 'charge', 'subscription', 'invoice'],
    description: 'Stripe customers/charges/subscriptions/invoices.',
  },
  shopify: {
    name: 'shopify',
    label: 'Shopify Commerce',
    version: 'v1.0',
    kinds: ['product', 'order', 'customer', 'inventory'],
    description: 'Shopify products/orders/customers/inventory.',
  },
  slack: {
    name: 'slack',
    label: 'Slack Messaging',
    version: 'v1.0',
    kinds: ['channel', 'message', 'member'],
    description: 'Slack channels/messages/members.',
  },
  notion: {
    name: 'notion',
    label: 'Notion Docs',
    version: 'v1.0',
    kinds: ['page', 'database', 'block'],
    description: 'Notion pages/databases/blocks.',
  },
  gsheets: {
    name: 'gsheets',
    label: 'Google Sheets',
    version: 'v1.0',
    kinds: ['spreadsheet', 'range'],
    description: 'Google Sheets spreadsheets and ranges.',
  },
  twilio: {
    name: 'twilio',
    label: 'Twilio Comms',
    version: 'v1.0',
    kinds: ['message', 'call'],
    description: 'Twilio SMS/voice messages and calls.',
  },
};

// Per-connector per-kind stores
const stores = new PersistentMap('stores', { serviceName: 'connector-hub' });   // key: `${connector}:${kind}` -> Map(id -> record)
const syncLog = [];         // audit log of sync operations
const connections = new PersistentMap('connections', { serviceName: 'connector-hub' }); // connectionId -> {connector, tenant, credentialsHash, ...}

function storeKey(connector, kind) { return `${connector}:${kind}`; }
function getStore(connector, kind) {
  const k = storeKey(connector, kind);
  let s = stores.get(k);
  if (!s) { s = new PersistentMap('collection-3', { serviceName: 'connector-hub' }); stores.set(k, s); }
  return s;
}

// Seed a few demo records per connector so the API returns real data.
function seed() {
  // Salesforce
  getStore('salesforce', 'lead').set('sf-l-1', { id: 'sf-l-1', name: 'Acme Inc', email: 'lead@acme.com', stage: 'new', amount: 12000 });
  getStore('salesforce', 'contact').set('sf-c-1', { id: 'sf-c-1', name: 'Jane Doe', email: 'jane@acme.com', title: 'CTO' });
  getStore('salesforce', 'opportunity').set('sf-o-1', { id: 'sf-o-1', name: 'Acme Renewal', amount: 48000, stage: 'negotiation' });

  // HubSpot
  getStore('hubspot', 'contact').set('hs-c-1', { id: 'hs-c-1', name: 'John Smith', email: 'john@globex.com', lifecycle: 'customer' });
  getStore('hubspot', 'deal').set('hs-d-1', { id: 'hs-d-1', name: 'Globex Q4 Expansion', amount: 22000, stage: 'closed-won' });

  // Stripe
  getStore('stripe', 'customer').set('cus-1', { id: 'cus-1', name: 'Acme Inc', email: 'billing@acme.com', balance: 0 });
  getStore('stripe', 'subscription').set('sub-1', { id: 'sub-1', customer: 'cus-1', status: 'active', plan: 'pro-monthly', amount: 99 });

  // Shopify
  getStore('shopify', 'product').set('sh-p-1', { id: 'sh-p-1', title: 'Genie Earbuds', price: 199, inventory: 1240 });
  getStore('shopify', 'order').set('sh-o-1', { id: 'sh-o-1', customer: 'cus-1', total: 199, status: 'paid' });

  // Slack
  getStore('slack', 'channel').set('C1', { id: 'C1', name: 'general', members: 142 });
  getStore('slack', 'message').set('M1', { id: 'M1', channel: 'C1', text: 'Welcome to RTMN!' });

  // Notion
  getStore('notion', 'page').set('n-p-1', { id: 'n-p-1', title: 'Q4 Strategy', parent: 'workspace' });
  getStore('notion', 'database').set('n-db-1', { id: 'n-db-1', title: 'Customers' });

  // Google Sheets
  getStore('gsheets', 'spreadsheet').set('gs-s-1', { id: 'gs-s-1', title: 'Revenue 2026' });

  // Twilio
  getStore('twilio', 'message').set('tw-m-1', { id: 'tw-m-1', to: '+15551234567', body: 'Hello from RTMN', status: 'delivered' });
}
seed();

// =============================================================================
// HELPERS
// =============================================================================

function ensureConnector(connector) {
  if (!CONNECTORS[connector]) {
    const err = new Error(`unknown connector: ${connector}`);
    err.status = 404;
    throw err;
  }
}

function ensureKind(connector, kind) {
  ensureConnector(connector);
  if (!CONNECTORS[connector].kinds.includes(kind)) {
    const err = new Error(`connector ${connector} does not support kind: ${kind}; allowed: ${CONNECTORS[connector].kinds.join(',')}`);
    err.status = 400;
    throw err;
  }
}

function logSync(connector, kind, count) {
  syncLog.push({ id: uuidv4(), at: new Date().toISOString(), connector, kind, count });
  if (syncLog.length > 5000) syncLog.splice(0, syncLog.length - 5000);
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  const totalRecords = Array.from(stores.values()).reduce((sum, m) => sum + m.size, 0);
  res.json({
    status: 'healthy',
    service: 'connector-hub',
    version: '1.0.0',
    port: PORT,
    connectors: Object.keys(CONNECTORS),
    totalRecords,
    capabilities: [
      'list-connectors', 'get-connector',
      'list-resources', 'get-resource', 'create-resource', 'update-resource', 'delete-resource',
      'search', 'sync',
      'connections-create', 'connections-list',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Connector catalog ─────────────────────────────────────────────────────

app.get('/api/connectors', (_req, res) => {
  res.json({ connectors: Object.values(CONNECTORS) });
});

app.get('/api/connectors/:name', (req, res) => {
  const c = CONNECTORS[req.params.name];
  if (!c) return res.status(404).json({ error: 'unknown connector' });
  res.json(c);
});

// ── Resource CRUD ─────────────────────────────────────────────────────────

app.get('/api/connectors/:name/:kind', (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const items = Array.from(getStore(req.params.name, req.params.kind).values());
    res.json({ count: items.length, items });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Search ────────────────────────────────────────────────────────────────
// IMPORTANT: keep this route BEFORE the generic /:id route below, otherwise
// Express matches `search` as the :id and returns 404.
app.get('/api/connectors/:name/:kind/search', (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const q = String(req.query.q || '').toLowerCase();
    if (!q) return res.status(400).json({ error: 'q query param required' });
    const store = getStore(req.params.name, req.params.kind);
    const matches = Array.from(store.values()).filter((rec) =>
      JSON.stringify(rec).toLowerCase().includes(q)
    );
    res.json({ count: matches.length, items: matches });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/connectors/:name/:kind/:id', (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const item = getStore(req.params.name, req.params.kind).get(req.params.id);
    if (!item) return res.status(404).json({ error: 'not found' });
    res.json(item);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.post('/api/connectors/:name/:kind',requireAuth,  (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const store = getStore(req.params.name, req.params.kind);
    const id = `${req.params.name.slice(0, 2)}-${req.params.kind.slice(0, 2)}-${uuidv4().slice(0, 8)}`;
    const record = { id, ...(req.body || {}), createdAt: new Date().toISOString() };
    store.set(id, record);
    res.status(201).json(record);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.patch('/api/connectors/:name/:kind/:id',requireAuth,  (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const store = getStore(req.params.name, req.params.kind);
    const existing = store.get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'not found' });
    const updated = { ...existing, ...(req.body || {}), id: existing.id, updatedAt: new Date().toISOString() };
    store.set(req.params.id, updated);
    res.json(updated);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.delete('/api/connectors/:name/:kind/:id',requireAuth,  (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const store = getStore(req.params.name, req.params.kind);
    if (!store.delete(req.params.id)) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Sync ──────────────────────────────────────────────────────────────────

// Mark a sync. In real life this would call the vendor API; here we return
// the count of records we hold so callers can verify the connector is alive.
app.post('/api/connectors/:name/:kind/sync',requireAuth,  (req, res) => {
  try {
    ensureKind(req.params.name, req.params.kind);
    const items = Array.from(getStore(req.params.name, req.params.kind).values());
    logSync(req.params.name, req.params.kind, items.length);
    res.json({ connector: req.params.name, kind: req.params.kind, syncedAt: new Date().toISOString(), count: items.length });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

app.get('/api/sync-log', (_req, res) => {
  res.json({ entries: syncLog.slice(-200) });
});

// ── Connections (credential metadata; never the secrets) ───────────────────

app.post('/api/connections',requireAuth,  (req, res) => {
  const { connector, tenant, label, credentialsHash } = req.body || {};
  if (!connector || !tenant) {
    return res.status(400).json({ error: 'connector and tenant required' });
  }
  if (!CONNECTORS[connector]) return res.status(400).json({ error: 'unknown connector' });
  const id = uuidv4();
  const connection = {
    id,
    connector,
    tenant,
    label: label || `${connector}-${tenant}`,
    credentialsHash: credentialsHash || 'sha256:placeholder',
    createdAt: new Date().toISOString(),
    status: 'connected',
  };
  connections.set(id, connection);
  res.status(201).json(connection);
});

app.get('/api/connections', (req, res) => {
  const tenant = req.query.tenant;
  let list = Array.from(connections.values());
  if (tenant) list = list.filter((c) => c.tenant === tenant);
  res.json({ count: list.length, connections: list });
});

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
    console.log(`[connector-hub] listening on :${PORT} (connectors: ${Object.keys(CONNECTORS).join(', ')})`);
  });
  installGracefulShutdown(server);
}

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[connector-hub]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

