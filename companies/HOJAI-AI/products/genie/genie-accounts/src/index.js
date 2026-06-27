/**
 * genie-accounts — Connected Accounts (C9)
 *
 * OAuth-style integration stubs. Each provider:
 *   - Has metadata (icon, color, scopes)
 *   - Has a connect flow (generates a fake auth URL + callback handler)
 *   - Tracks per-user connection status (connected/disconnected + last sync)
 *   - Exposes a sample data fetch (mocked — real impl would call provider API)
 *
 * Supported providers (10):
 *   google_calendar, gmail, google_photos, apple_health, apple_photos,
 *   bank_plaid, contacts, slack, github, notion
 *
 * Real OAuth is intentionally out of scope for Phase A — these are mock
 * connectors that demonstrate the flow and produce believable sample data.
 */

const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const helmet = require('helmet');

const accountsRoutes = require('./routes/accounts');

requireEnv(['JWT_SECRET']);
const PORT = parseInt(process.env.PORT || '4736', 10);
const SERVICE_NAME = 'genie-accounts';

const connectionsStore = new PersistentMap('account-connections', { serviceName: SERVICE_NAME });

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

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '256kb' }));
app.use(requireAuth);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'Genie Connected Accounts', port: PORT });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Genie Connected Accounts',
    tagline: 'Connect Gmail, Calendar, Photos, Health, Banking.',
    endpoints: [
      'GET    /accounts/providers                     — List all available providers',
      'GET    /accounts/list/:userId                 — List connected accounts',
      'POST   /accounts/connect/:userId/:provider    — Initiate OAuth (mock)',
      'POST   /accounts/disconnect/:userId/:provider — Disconnect',
      'GET    /accounts/data/:userId/:provider       — Fetch sample data from connected provider',
      'POST   /accounts/sync/:userId/:provider       — Trigger sync (mock — updates lastSync)',
    ],
  });
});

app.use('/accounts', accountsRoutes({ connectionsStore }));

installReadinessRoutes(app, {
  serviceName: SERVICE_NAME,
  stores: [connectionsStore],
});

// Seed: 2 connected accounts
autoSeed([
  {
    store: connectionsStore,
    items: normalizeSeedData([
      {
        id: 'acc-google-001',
        userId: 'user-001',
        provider: 'google_calendar',
        status: 'connected',
        scopes: ['calendar.readonly'],
        connectedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        lastSync: new Date(Date.now() - 3600000).toISOString(),
        accountEmail: 'demo@gmail.com',
      },
      {
        id: 'acc-health-001',
        userId: 'user-001',
        provider: 'apple_health',
        status: 'connected',
        scopes: ['steps', 'sleep', 'heart_rate'],
        connectedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
        lastSync: new Date(Date.now() - 1800000).toISOString(),
        accountEmail: null,
      },
    ]),
  },
]);

const server = app.listen(PORT, () => {
  console.log(`Genie Connected Accounts running on port ${PORT}`);
});

installGracefulShutdown(server);
