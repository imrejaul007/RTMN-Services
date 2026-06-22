/**
 * Trust Network (port 4149)
 *
 * Cross-platform reputation service. Extends agent-reputation (4820)
 * beyond AI agents to cover the full network:
 *
 *   - Humans (founders, admins, end-users)
 *   - Organizations (businesses, tenants, vendors)
 *   - Content (articles, listings, prompts, twins)
 *
 *   - Trust score (0-100)
 *   - Endorsements (peer-given, weighted by endorser's own trust)
 *   - Risk flags
 *   - Verification records
 *   - Network-level rollups (top trusted in network)
 *
 * This is the social-trust layer that complements agent-reputation's
 * transactional trust.
 *
 * Port: 4149
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { setupSecurity, strictLimiter } from '@rtmn/shared/security';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.TRUST_NETWORK_PORT || 4149;
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'trust-network' });
// =============================================================================
// STORES
// =============================================================================

const entities = new PersistentMap('entities', { serviceName: 'trust-network' });       // entityId -> { entityId, entityType, name, score, ... }
const endorsements = new PersistentMap('endorsements', { serviceName: 'trust-network' });   // endorsementId -> { fromEntityId, toEntityId, weight, ... }
const riskFlags = new PersistentMap('risk-flags', { serviceName: 'trust-network' });      // flagId -> { entityId, kind, severity, ... }
const verifications = new PersistentMap('verifications', { serviceName: 'trust-network' });  // verificationId -> { entityId, kind, verifiedBy, ... }
const audit = [];

// =============================================================================
// SEED
// =============================================================================

function seed() {
  // humans
  registerEntity({ entityType: 'human', name: 'Imrejaul Reja', score: 85, metadata: { role: 'founder' }, verified: true });
  registerEntity({ entityType: 'human', name: 'Anita Verma', score: 72 });
  registerEntity({ entityType: 'human', name: 'Rohit Singh', score: 45, riskFlags: ['new-account'] });

  // organizations
  registerEntity({ entityType: 'organization', name: 'HOJAI AI', score: 92, metadata: { industry: 'AI Platform' }, verified: true });
  registerEntity({ entityType: 'organization', name: 'AdBazaar', score: 88, verified: true });
  registerEntity({ entityType: 'organization', name: 'REZ-Merchant', score: 81 });
  registerEntity({ entityType: 'organization', name: 'Suspicious Co', score: 12, riskFlags: ['unverified', 'low-activity'] });

  // content
  registerEntity({ entityType: 'content', name: 'ReAct Reasoner skill', score: 78, metadata: { kind: 'skill', listingId: 'skl-reason' } });
  registerEntity({ entityType: 'content', name: 'Restaurant Twin', score: 84, metadata: { kind: 'twin' } });
  registerEntity({ entityType: 'content', name: 'WhatsApp Send skill', score: 65 });

  // endorsements (peer trust)
  endorse('human-imrejaul-reja', 'human-anita-verma', 20, 'worked together');
  endorse('organization-hojai-ai', 'organization-adbazaar', 30, 'longtime partner');
  endorse('human-imrejaul-reja', 'organization-hojai-ai', 50, 'founded');

  // verifications
  verify('human-imrejaul-reja', 'identity', 'corpID:4702');
  verify('organization-hojai-ai', 'business', 'corpID:4702');
  verify('organization-adbazaar', 'business', 'corpID:4702');
}

seed();

function registerEntity({ entityType, name, score = 50, metadata = {}, verified = false, riskFlags = [] }) {
  const id = `${entityType}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (entities.has(id)) return entities.get(id);
  const entity = {
    entityId: id,
    entityType,
    name,
    score,
    endorsementCount: 0,
    endorsementsReceived: 0,
    riskFlags: [...riskFlags],
    verified,
    verifiedAt: verified ? new Date().toISOString() : null,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  entities.set(id, entity);
  return entity;
}

function endorse(fromEntityId, toEntityId, weight, reason) {
  const id = uuidv4();
  const e = {
    id, fromEntityId, toEntityId,
    weight: Math.max(1, Math.min(100, weight)),
    reason: reason || '',
    createdAt: new Date().toISOString(),
  };
  endorsements.set(id, e);
  const target = entities.get(toEntityId);
  if (target) {
    target.endorsementCount += 1;
    target.endorsementsReceived += 1;
    // small score bump from endorsement, scaled by weight
    target.score = Math.min(100, target.score + Math.round(weight * 0.05));
    target.updatedAt = new Date().toISOString();
  }
  auditLog({ kind: 'endorse', from: fromEntityId, to: toEntityId, weight });
  return e;
}

function verify(entityId, kind, verifiedBy) {
  const id = uuidv4();
  const v = {
    id, entityId,
    kind, // 'identity' | 'business' | 'email' | 'phone' | 'kyc'
    verifiedBy,
    createdAt: new Date().toISOString(),
  };
  verifications.set(id, v);
  const e = entities.get(entityId);
  if (e) {
    e.verified = true;
    e.verifiedAt = v.createdAt;
    e.metadata.verifiedBy = verifiedBy;
    e.metadata.verificationKind = kind;
    e.score = Math.min(100, e.score + 10);
    e.updatedAt = v.createdAt;
  }
  auditLog({ kind: 'verify', entityId, kind, verifiedBy });
  return v;
}

function flagRisk(entityId, kind, severity, reason) {
  const id = uuidv4();
  const f = {
    id, entityId,
    kind, // 'new-account' | 'unverified' | 'low-activity' | 'dispute-history' | 'fraud-suspected' | 'tos-violation'
    severity, // 1-10
    reason: reason || '',
    createdAt: new Date().toISOString(),
  };
  riskFlags.set(id, f);
  const e = entities.get(entityId);
  if (e) {
    e.riskFlags.push(kind);
    e.score = Math.max(0, e.score - severity * 3);
    e.updatedAt = f.createdAt;
  }
  auditLog({ kind: 'risk-flag', entityId, kind, severity });
  return f;
}

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
    service: 'trust-network',
    version: '1.0.0',
    port: PORT,
    counts: {
      entities: entities.size,
      endorsements: endorsements.size,
      riskFlags: riskFlags.size,
      verifications: verifications.size,
    },
    byType: {
      humans: Array.from(entities.values()).filter(e => e.entityType === 'human').length,
      organizations: Array.from(entities.values()).filter(e => e.entityType === 'organization').length,
      content: Array.from(entities.values()).filter(e => e.entityType === 'content').length,
    },
    capabilities: [
      'entities-list', 'entities-get', 'entities-create',
      'endorsements-create', 'endorsements-list',
      'risk-flags-create', 'risk-flags-list',
      'verifications-create', 'verifications-list',
      'top-trusted', 'by-type',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Entities ───────────────────────────────────────────────────────────────

app.get('/api/entities', (req, res) => {
  const { entityType, minScore, maxScore, verified, q, sort } = req.query;
  let list = Array.from(entities.values());
  if (entityType) list = list.filter((e) => e.entityType === entityType);
  if (minScore) list = list.filter((e) => e.score >= parseFloat(minScore));
  if (maxScore) list = list.filter((e) => e.score <= parseFloat(maxScore));
  if (verified === 'true') list = list.filter((e) => e.verified);
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((e) => e.name.toLowerCase().includes(needle));
  }
  if (sort === 'score-asc')  list.sort((a, b) => a.score - b.score);
  if (sort === 'score-desc') list.sort((a, b) => b.score - a.score);
  if (sort === 'endorsements') list.sort((a, b) => b.endorsementCount - a.endorsementCount);
  res.json({ count: list.length, entities: list });
});

app.post('/api/entities',requireAuth,  (req, res) => {
  const { entityType, name, score, metadata, verified } = req.body || {};
  if (!entityType || !name) return res.status(400).json({ error: 'entityType, name required' });
  if (!['human', 'organization', 'content'].includes(entityType)) {
    return res.status(400).json({ error: 'entityType must be human, organization, or content' });
  }
  const id = `${entityType}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  if (entities.has(id)) return res.status(409).json({ error: 'entity already exists', entityId: id });
  const entity = registerEntity({ entityType, name, score: score ?? 50, metadata: metadata || {}, verified: !!verified });
  auditLog({ kind: 'entity-create', entityId: id, entityType, name });
  res.status(201).json(entity);
});

app.get('/api/entities/:id', (req, res) => {
  const e = entities.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'entity not found' });
  // include related data
  const entityEndorsements = Array.from(endorsements.values()).filter((x) => x.toEntityId === e.entityId || x.fromEntityId === e.entityId);
  const entityVerifications = Array.from(verifications.values()).filter((v) => v.entityId === e.entityId);
  const entityFlags = Array.from(riskFlags.values()).filter((f) => f.entityId === e.entityId);
  res.json({ ...e, endorsements: entityEndorsements, verifications: entityVerifications, riskFlagsDetailed: entityFlags });
});

// ── Endorsements ──────────────────────────────────────────────────────────

app.post('/api/endorsements',requireAuth,  (req, res) => {
  const { fromEntityId, toEntityId, weight, reason } = req.body || {};
  if (!fromEntityId || !toEntityId || !weight) return res.status(400).json({ error: 'fromEntityId, toEntityId, weight required' });
  if (!entities.has(fromEntityId)) return res.status(404).json({ error: 'fromEntityId not found' });
  if (!entities.has(toEntityId)) return res.status(404).json({ error: 'toEntityId not found' });
  const e = endorse(fromEntityId, toEntityId, weight, reason);
  res.status(201).json(e);
});

app.get('/api/endorsements', (req, res) => {
  const { fromEntityId, toEntityId } = req.query;
  let list = Array.from(endorsements.values());
  if (fromEntityId) list = list.filter((e) => e.fromEntityId === fromEntityId);
  if (toEntityId) list = list.filter((e) => e.toEntityId === toEntityId);
  res.json({ count: list.length, endorsements: list });
});

// ── Risk flags ──────────────────────────────────────────────────────────────

app.post('/api/risk-flags',requireAuth,  (req, res) => {
  const { entityId, kind, severity, reason } = req.body || {};
  if (!entityId || !kind || !severity) return res.status(400).json({ error: 'entityId, kind, severity required' });
  if (!entities.has(entityId)) return res.status(404).json({ error: 'entityId not found' });
  const f = flagRisk(entityId, kind, severity, reason);
  res.status(201).json(f);
});

app.get('/api/risk-flags', (req, res) => {
  const { entityId } = req.query;
  let list = Array.from(riskFlags.values());
  if (entityId) list = list.filter((f) => f.entityId === entityId);
  res.json({ count: list.length, flags: list });
});

// ── Verifications ─────────────────────────────────────────────────────────

app.post('/api/verifications',requireAuth,  (req, res) => {
  const { entityId, kind, verifiedBy } = req.body || {};
  if (!entityId || !kind || !verifiedBy) return res.status(400).json({ error: 'entityId, kind, verifiedBy required' });
  if (!entities.has(entityId)) return res.status(404).json({ error: 'entityId not found' });
  const v = verify(entityId, kind, verifiedBy);
  res.status(201).json(v);
});

app.get('/api/verifications', (req, res) => {
  const { entityId } = req.query;
  let list = Array.from(verifications.values());
  if (entityId) list = list.filter((v) => v.entityId === entityId);
  res.json({ count: list.length, verifications: list });
});

// ── Network rollups ───────────────────────────────────────────────────────

app.get('/api/top-trusted', (req, res) => {
  const { entityType, limit } = req.query;
  let list = Array.from(entities.values());
  if (entityType) list = list.filter((e) => e.entityType === entityType);
  list.sort((a, b) => b.score - a.score);
  res.json({ entities: list.slice(0, parseInt(limit) || 10) });
});

app.get('/api/by-type/:type', (req, res) => {
  const { type } = req.params;
  const list = Array.from(entities.values()).filter((e) => e.entityType === type);
  res.json({ count: list.length, entities: list });
});

// ── Audit ─────────────────────────────��────────────────────────────────────

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
  console.error('[trust-network]', err);
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
  console.log(`[trust-network] listening on :${PORT}`);
});
installGracefulShutdown(server);

export default app;