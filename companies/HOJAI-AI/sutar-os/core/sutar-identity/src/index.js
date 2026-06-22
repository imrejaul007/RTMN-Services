/**
 * SUTAR OS — Identity OS (port 4144)
 *
 * SUTAR-scoped identity layered over CorpID (4702). Issues SUTAR identities
 * that have a CorpID parent + SUTAR-specific claims (role, capabilities,
 * participating intents, reputation seed).
 *
 * Layer: 2 (Twin + Memory + Identity + Agent ID)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');
const axios = require('axios');

const { applyTenantContext } = require('../../sutar-shared/tenant');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4144;
const SERVICE_NAME = 'sutar-identity';
setupSecurity(app, { serviceName: 'sutar-identity' });
// ADR-0009 Phase 1: tenant context middleware. /health, /ready,
// /v1/info (if present) stay public; everything else under /api/ requires
// a tenant. Returns { getTenantId, tkey } for route-level use.
applyTenantContext(app, {
  serviceName: 'sutar-identity',
  publicPathPatterns: ["^\\/health$","^\\/health\\/.*$","^\\/ready$","^\\/v1\\/info$"].map(s => new RegExp(s)),
});
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const corpIdClient = axios.create({ baseURL: CORPID_URL, timeout: 2000 });

// SUTAR identities (sutarId -> identity)
const identities = new PersistentMap('identities', { serviceName: 'sutar-identity' });
const audit = [];

const ROLES = ['merchant', 'consumer', 'facilitator', 'observer', 'system'];

function seed() {
  const seeds = [
    { sutarId: 'sutar-merchant-001', corpId: 'corp-merchant-001', role: 'merchant', claims: ['negotiator'] },
    { sutarId: 'sutar-consumer-001', corpId: 'corp-consumer-001', role: 'consumer', claims: ['intent-publisher'] },
    { sutarId: 'sutar-system-001',   corpId: 'corp-system-001',   role: 'system',   claims: ['*'] },
  ];
  for (const s of seeds) {
    identities.set(s.sutarId, {
      ...s,
      reputation: 80,
      participatingIntents: [],
      createdAt: new Date().toISOString(),
    });
  }
}
seed();

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 2, port: PORT,
    counts: { identities: identities.size, audit: audit.length },
    capabilities: ['identity-issue', 'identity-get', 'identity-list', 'identity-add-claim', 'identity-revoke', 'identity-attest'],
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/identities',requireAuth,  (req, res) => {
  const { corpId, role, claims = [] } = req.body || {};
  if (!corpId || !ROLES.includes(role)) return res.status(400).json({ error: `corpId required, role must be one of ${ROLES.join(',')}` });
  const sutarId = `sutar-${role}-${uuid().slice(0, 8)}`;
  const identity = {
    sutarId, corpId, role, claims,
    reputation: 50,
    participatingIntents: [],
    createdAt: new Date().toISOString(),
  };
  identities.set(sutarId, identity);
  audit.push({ kind: 'issue', sutarId, role, at: Date.now() });
  res.status(201).json(identity);
});

app.get('/api/identities', (req, res) => {
  const role = req.query.role;
  let list = Array.from(identities.values());
  if (role) list = list.filter(i => i.role === role);
  res.json({ count: list.length, identities: list });
});

app.get('/api/identities/:sutarId', (req, res) => {
  const id = identities.get(req.params.sutarId);
  if (!id) return res.status(404).json({ error: 'unknown identity' });
  res.json(id);
});

app.post('/api/identities/:sutarId/claims',requireAuth,  (req, res) => {
  const { claim } = req.body || {};
  if (!claim) return res.status(400).json({ error: 'claim required' });
  const id = identities.get(req.params.sutarId);
  if (!id) return res.status(404).json({ error: 'unknown identity' });
  if (!id.claims.includes(claim)) id.claims.push(claim);
  audit.push({ kind: 'add-claim', sutarId: req.params.sutarId, claim, at: Date.now() });
  res.json(id);
});

app.post('/api/identities/:sutarId/revoke',requireAuth,  (req, res) => {
  const id = identities.get(req.params.sutarId);
  if (!id) return res.status(404).json({ error: 'unknown identity' });
  id.revoked = true;
  id.revokedAt = new Date().toISOString();
  audit.push({ kind: 'revoke', sutarId: req.params.sutarId, at: Date.now() });
  res.json(id);
});

// Cross-system attestation — assert that identity X vouches for identity Y
app.post('/api/identities/:sutarId/attest',requireAuth,  (req, res) => {
  const { subject, statement, weight = 10 } = req.body || {};
  if (!subject || !statement) return res.status(400).json({ error: 'subject and statement required' });
  const id = identities.get(req.params.sutarId);
  if (!id) return res.status(404).json({ error: 'unknown identity' });
  const target = identities.get(subject);
  if (!target) return res.status(404).json({ error: 'unknown subject' });
  const attestation = {
    id: uuid(),
    from: req.params.sutarId,
    to: subject,
    statement,
    weight,
    createdAt: new Date().toISOString(),
  };
  target.attestations = target.attestations || [];
  target.attestations.push(attestation);
  audit.push({ kind: 'attest', from: req.params.sutarId, to: subject, at: Date.now() });
  res.status(201).json(attestation);
});

// Bridge to CorpID
app.get('/api/corpid/proxy/:corpId', async (req, res) => {
  try {
    const r = await corpIdClient.get(`/api/identities/${encodeURIComponent(req.params.corpId)}`);
    res.json({ source: 'corpid', ...r.data });
  } catch (err) {
    res.status(err.response?.status || 502).json({ error: err.message, targetUrl: CORPID_URL });
  }
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);
