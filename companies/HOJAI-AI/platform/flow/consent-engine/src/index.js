/**
 * HOJAI AI - Consent Engine
 * Port: 4262
 *
 * Captures, revokes, and verifies data-subject consent per purpose.
 * Provides a single endpoint services can call BEFORE reading/writing user
 * data to confirm a valid consent exists for the intended purpose.
 *
 * On revocation, all data-access checks for that subject+purpose will deny.
 *
 * Persistent, fail-CLOSED (no matching active consent = deny), audit-logged.
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireEnv } from '@rtmn/shared/lib/env';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { PersistentStore } from '../../../../shared/lib/persistent-store.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4262;
const SERVICE_NAME = 'consent-engine';
const SERVICE_VERSION = '1.0.0';
const REQUIRE_AUTH = (process.env.CONSENT_REQUIRE_AUTH || 'true') !== 'false';
const CORS_ORIGIN = process.env.CONSENT_CORS_ORIGIN || null;
const SERVICE_TOKEN = process.env.CONSENT_SERVICE_TOKEN || Buffer.from(JSON.stringify({
  service: SERVICE_NAME, role: 'admin', iat: Date.now(),
  exp: Date.now() + 365 * 24 * 60 * 60 * 1000
})).toString('base64');

if (REQUIRE_AUTH && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.log(`[consent-engine] Service token (admin): ${SERVICE_TOKEN}`);
}

// =================================================================
// Purpose catalog (predefined + open-set)
// =================================================================
//
// Each purpose is a string the calling service uses to identify WHY it
// is touching user data. Examples: 'marketing.email', 'analytics.cohort',
// 'personalization.recommendations', 'fraud.scoring', 'support.lookup'.
// Pre-defined purposes get a description; unknown purposes are accepted
// but logged.

const PREDEFINED_PURPOSES = {
  'marketing.email':           'Sending marketing emails to the user',
  'marketing.sms':             'Sending marketing SMS to the user',
  'marketing.push':            'Sending marketing push notifications',
  'analytics.cohort':          'Including the user in analytics cohorts',
  'personalization.recommendations': 'Personalizing recommendations for the user',
  'fraud.scoring':             'Using the user data for fraud scoring',
  'support.lookup':            'Looking up the user to provide support',
  'data.sharing.partner':      'Sharing the user data with a partner',
  'profiling':                 'Building a profile of the user',
  'legal.compliance':          'Using the user data for legal compliance',
  'research.aggregated':       'Including the user in aggregated research'
};

function describePurpose(p) {
  return PREDEFINED_PURPOSES[p] || null;
}

// =================================================================
// Persistent stores
// =================================================================

const STORE_OPTS = { serviceName: 'consent-engine' };
const consents = new PersistentStore('consents', STORE_OPTS); // id -> consent record
// Index: subjectId+purpose -> [consentId, ...] (active + historical)
const subjectIndex = new PersistentStore('subject-index', STORE_OPTS);

let audit = [];
const AUDIT_FILE = `${process.env.HOJAI_DATA_DIR || './data/'}/consent-engine/audit.jsonl`;

function auditLog(entry) {
  const e = { id: uuidv4(), timestamp: new Date().toISOString(), ...entry };
  audit.push(e);
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(e) + '\n', 'utf8');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[consent-engine] audit write failed:', err.message);
  }
  return e;
}

async function indexAdd(subjectId, purpose, consentId) {
  const key = `${subjectId}::${purpose}`;
  const list = subjectIndex.get(key) || [];
  list.push(consentId);
  subjectIndex.set(key, list);
}

async function indexFor(subjectId, purpose) {
  return subjectIndex.get(`${subjectId}::${purpose}`) || [];
}

// =================================================================
// Auth
// =================================================================

function customAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const hdr = (k) => req.headers[k.toLowerCase()];
  const token = hdr('x-service-token') || (hdr('authorization') || '').replace(/^Bearer\s+/i, '') || hdr('x-api-key');
  if (token === SERVICE_TOKEN) {
    req.auth = { role: 'admin', source: 'service-token' };
    return next();
  }
  return res.status(401).json({ error: 'unauthorized' });
}

// =================================================================
// Middleware
// =================================================================

app.use(helmet());
app.use(cors({ origin: CORS_ORIGIN }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('combined'));

// Rate limiting — 20 requests/minute by default per IP+token.
// Override with CONSENT_LIMIT env var.
const LIMIT = parseInt(process.env.CONSENT_LIMIT || '20', 10);
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: LIMIT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: `Rate limit exceeded; max ${LIMIT} requests per minute` }
});
app.use(limiter);

// =================================================================
// Routes
// =================================================================

app.get('/', (req, res) => res.redirect('/health'));
app.get('/health', (req, res) => res.json({
  status: 'healthy', service: SERVICE_NAME, version: SERVICE_VERSION,
  port: PORT, authRequired: REQUIRE_AUTH,
  counts: { consents: consents.size, purposes: Object.keys(PREDEFINED_PURPOSES).length },
  timestamp: new Date().toISOString()
}));
app.get('/ready', (req, res) => res.json({ ready: true, service: SERVICE_NAME }));

// --- Purpose catalog ---
app.get('/api/purposes', (req, res) => {
  res.json({ count: Object.keys(PREDEFINED_PURPOSES).length, purposes: PREDEFINED_PURPOSES });
});

// --- Grant consent ---
app.post('/api/consents',requireAuth,  customAuth, async (req, res) => {
  const { subjectId, purpose, source, evidence, validUntil, metadata } = req.body || {};
  if (!subjectId) return res.status(400).json({ error: 'subjectId is required' });
  if (!purpose) return res.status(400).json({ error: 'purpose is required' });
  const id = `cs-${Date.now()}-${uuidv4().slice(0, 6)}`;
  const rec = {
    id, subjectId, purpose,
    status: 'active',
    grantedAt: new Date().toISOString(),
    validUntil: validUntil || null,
    source: source || 'api',
    evidence: evidence || null,
    description: describePurpose(purpose),
    metadata: metadata || {}
  };
  consents.set(id, rec);
  await indexAdd(subjectId, purpose, id);
  auditLog({ type: 'consent.granted', actor: req.auth.role, details: { consentId: id, subjectId, purpose, source } });
  res.json(rec);
});

// --- Withdraw consent (revoke) ---
app.post('/api/consents/:id/withdraw',requireAuth,  customAuth, async (req, res) => {
  const c = consents.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'consent not found' });
  if (c.status === 'withdrawn') return res.json(c); // idempotent
  c.status = 'withdrawn';
  c.withdrawnAt = new Date().toISOString();
  c.withdrawnBy = req.auth.role;
  consents.set(c.id, c);
  auditLog({ type: 'consent.withdrawn', actor: req.auth.role, details: { consentId: c.id, subjectId: c.subjectId, purpose: c.purpose } });
  res.json(c);
});

// --- Withdraw all consents for a subject+purpose ---
app.post('/api/consents/withdraw',requireAuth,  customAuth, async (req, res) => {
  const { subjectId, purpose } = req.body || {};
  if (!subjectId || !purpose) return res.status(400).json({ error: 'subjectId and purpose required' });
  const ids = await indexFor(subjectId, purpose);
  let count = 0;
  for (const cid of ids) {
    const c = consents.get(cid);
    if (c && c.status === 'active') {
      c.status = 'withdrawn';
      c.withdrawnAt = new Date().toISOString();
      c.withdrawnBy = req.auth.role;
      consents.set(c.id, c);
      count++;
    }
  }
  auditLog({ type: 'consent.withdrawn.bulk', actor: req.auth.role, details: { subjectId, purpose, count } });
  res.json({ ok: true, withdrawn: count, subjectId, purpose });
});

// --- Lookup consent by id ---
app.get('/api/consents/:id', (req, res) => {
  const c = consents.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'consent not found' });
  res.json(c);
});

// --- List consents for a subject ---
app.get('/api/subjects/:subjectId/consents', (req, res) => {
  const { status, purpose } = req.query;
  const all = Array.from(consents.values()).filter(c => c.subjectId === req.params.subjectId);
  let filtered = all;
  if (status) filtered = filtered.filter(c => c.status === status);
  if (purpose) filtered = filtered.filter(c => c.purpose === purpose);
  filtered.sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  res.json({ count: filtered.length, subjectId: req.params.subjectId, consents: filtered });
});

// --- The main check: is this subject consented for this purpose? ---
// This is the endpoint other services call BEFORE touching user data.
// Fail-CLOSED: no matching active consent = allowed=false.
app.post('/api/check',requireAuth,  customAuth, (req, res) => {
  const { subjectId, purpose } = req.body || {};
  if (!subjectId || !purpose) {
    return res.status(400).json({ allowed: false, reason: 'subjectId and purpose are required' });
  }
  const all = Array.from(consents.values())
    .filter(c => c.subjectId === subjectId && c.purpose === purpose)
    .sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  const now = new Date().toISOString();
  const active = all.find(c => {
    if (c.status !== 'active') return false;
    if (c.validUntil && c.validUntil < now) return false;
    return true;
  });
  if (!active) {
    auditLog({ type: 'consent.check', actor: subjectId, details: { subjectId, purpose, allowed: false, reason: 'no active consent' } });
    return res.json({ allowed: false, reason: 'no active consent for subject+purpose', subjectId, purpose, consentId: null });
  }
  auditLog({ type: 'consent.check', actor: subjectId, details: { subjectId, purpose, allowed: true, consentId: active.id } });
  res.json({
    allowed: true,
    subjectId, purpose,
    consentId: active.id,
    grantedAt: active.grantedAt,
    validUntil: active.validUntil,
    source: active.source
  });
});

// --- Summary: how many active consents per purpose for a subject? ---
app.get('/api/subjects/:subjectId/summary', (req, res) => {
  const subjectId = req.params.subjectId;
  const all = Array.from(consents.values()).filter(c => c.subjectId === subjectId);
  const now = new Date().toISOString();
  const byPurpose = {};
  for (const c of all) {
    if (!byPurpose[c.purpose]) byPurpose[c.purpose] = { active: 0, withdrawn: 0, expired: 0, total: 0 };
    byPurpose[c.purpose].total++;
    if (c.status === 'withdrawn') byPurpose[c.purpose].withdrawn++;
    else if (c.validUntil && c.validUntil < now) byPurpose[c.purpose].expired++;
    else byPurpose[c.purpose].active++;
  }
  res.json({ subjectId, totalConsents: all.length, byPurpose });
});

// --- Audit ---
app.get('/api/audit', customAuth, (req, res) => {
  const { type, from, to, subjectId } = req.query;
  let result = audit.slice();
  if (type) result = result.filter(e => e.type === type);
  if (from) result = result.filter(e => e.timestamp >= from);
  if (to) result = result.filter(e => e.timestamp <= to);
  if (subjectId) result = result.filter(e => e.details && e.details.subjectId === subjectId);
  res.json({ count: result.length, entries: result });
});

// =================================================================
// 404 + error
// =================================================================

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[consent-engine] error:', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// =================================================================
// Boot
// =================================================================

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[consent-engine] listening on :${PORT} (v${SERVICE_VERSION})`);
});
installGracefulShutdown(server);

// =================================================================
// Graceful shutdown
// =================================================================

let shuttingDown = false;
async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  // eslint-disable-next-line no-console
  console.log(`[consent-engine] ${signal} received, flushing...`);
  try {
    await Promise.all([consents.flush(), subjectIndex.flush()]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[consent-engine] flush error:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[consent-engine] uncaughtException:', err);
  gracefulShutdown('uncaughtException');
});
