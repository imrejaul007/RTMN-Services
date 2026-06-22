/**
 * HOJAI AI - Compliance Engine
 * Port: 4261
 *
 * Maps regulatory frameworks (GDPR, SOC2, HIPAA, PCI-DSS, ISO27001) to
 * controls, controls to evidence records, and produces attestation snapshots.
 *
 * Works alongside PolicyOS: a PolicyOS rule can be linked to a compliance
 * control via `controlId`, and the engine can answer "which policies cover
 * control X?" or "which controls have no coverage in policy-os?"
 *
 * Persistent, fail-closed, audit-logged.
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
const PORT = process.env.PORT || 4261;
const SERVICE_NAME = 'compliance-engine';
const SERVICE_VERSION = '1.0.0';
const REQUIRE_AUTH = (process.env.COMPLIANCE_REQUIRE_AUTH || 'true') !== 'false';
const CORS_ORIGIN = process.env.COMPLIANCE_CORS_ORIGIN || null;
const SERVICE_TOKEN = process.env.COMPLIANCE_SERVICE_TOKEN || Buffer.from(JSON.stringify({
  service: SERVICE_NAME, role: 'admin', iat: Date.now(),
  exp: Date.now() + 365 * 24 * 60 * 60 * 1000
})).toString('base64');

if (REQUIRE_AUTH && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.log(`[compliance-engine] Service token (admin): ${SERVICE_TOKEN}`);
}

// =================================================================
// Frameworks + seeded controls
// =================================================================

const FRAMEWORKS = {
  'gdpr': {
    name: 'GDPR - EU General Data Protection Regulation',
    controls: [
      { id: 'gdpr.art5', title: 'Lawfulness, fairness, transparency', severity: 'high' },
      { id: 'gdpr.art6', title: 'Lawful basis for processing', severity: 'high' },
      { id: 'gdpr.art7', title: 'Conditions for consent', severity: 'high' },
      { id: 'gdpr.art15', title: 'Right of access', severity: 'medium' },
      { id: 'gdpr.art17', title: 'Right to erasure (right to be forgotten)', severity: 'high' },
      { id: 'gdpr.art20', title: 'Right to data portability', severity: 'medium' },
      { id: 'gdpr.art25', title: 'Privacy by design and by default', severity: 'high' },
      { id: 'gdpr.art30', title: 'Records of processing activities', severity: 'medium' },
      { id: 'gdpr.art32', title: 'Security of processing', severity: 'high' },
      { id: 'gdpr.art33', title: 'Breach notification within 72h', severity: 'critical' }
    ]
  },
  'soc2': {
    name: 'SOC 2 - Trust Services Criteria',
    controls: [
      { id: 'soc2.cc1', title: 'Control environment', severity: 'high' },
      { id: 'soc2.cc2', title: 'Communication and information', severity: 'medium' },
      { id: 'soc2.cc3', title: 'Risk assessment', severity: 'high' },
      { id: 'soc2.cc6', title: 'Logical and physical access', severity: 'critical' },
      { id: 'soc2.cc7', title: 'System operations', severity: 'high' },
      { id: 'soc2.cc8', title: 'Change management', severity: 'medium' },
      { id: 'soc2.a1', title: 'Availability commitments', severity: 'medium' }
    ]
  },
  'hipaa': {
    name: 'HIPAA - Health Insurance Portability and Accountability Act',
    controls: [
      { id: 'hipaa.164.308', title: 'Administrative safeguards', severity: 'critical' },
      { id: 'hipaa.164.310', title: 'Physical safeguards', severity: 'high' },
      { id: 'hipaa.164.312', title: 'Technical safeguards', severity: 'critical' },
      { id: 'hipaa.164.316', title: 'Documentation requirements', severity: 'medium' }
    ]
  },
  'pci-dss': {
    name: 'PCI-DSS - Payment Card Industry Data Security Standard',
    controls: [
      { id: 'pci.req1', title: 'Install and maintain network security controls', severity: 'critical' },
      { id: 'pci.req3', title: 'Protect stored account data', severity: 'critical' },
      { id: 'pci.req4', title: 'Protect cardholder data in transit', severity: 'critical' },
      { id: 'pci.req6', title: 'Develop secure systems and software', severity: 'high' },
      { id: 'pci.req8', title: 'Identify users and authenticate access', severity: 'high' },
      { id: 'pci.req10', title: 'Log and monitor all access', severity: 'high' }
    ]
  },
  'iso27001': {
    name: 'ISO 27001 - Information Security Management',
    controls: [
      { id: 'iso.a5', title: 'Organizational controls', severity: 'high' },
      { id: 'iso.a6', title: 'People controls', severity: 'medium' },
      { id: 'iso.a7', title: 'Physical controls', severity: 'medium' },
      { id: 'iso.a8', title: 'Technological controls', severity: 'high' },
      { id: 'iso.a9', title: 'Access control', severity: 'critical' }
    ]
  }
};

const CONTROL_INDEX = new Map();
for (const [fw, def] of Object.entries(FRAMEWORKS)) {
  for (const c of def.controls) {
    CONTROL_INDEX.set(c.id, { ...c, framework: fw, frameworkName: def.name });
  }
}

// =================================================================
// Persistent stores
// =================================================================

const STORE_OPTS = { serviceName: 'compliance-engine' };
const controls = new PersistentStore('controls', STORE_OPTS); // controlId -> {id, framework, owner, status, policyIds[], evidence[], attestations[]}
const policies = new PersistentStore('policies', STORE_OPTS); // policyId -> {id, name, controlIds[], evidenceTypes[]}
const evidence = new PersistentStore('evidence', STORE_OPTS); // evidenceId -> {id, controlId, kind, summary, capturedAt, capturedBy, source}
const attestations = new PersistentStore('attestations', STORE_OPTS); // attestationId -> {id, controlId, attestedBy, attestedAt, validUntil, status, notes}

// Audit log (ephemeral tail + JSONL file)
let audit = [];
const AUDIT_FILE = `${process.env.HOJAI_DATA_DIR || './data/'}/compliance-engine/audit.jsonl`;

function auditLog(entry) {
  const e = { id: uuidv4(), timestamp: new Date().toISOString(), ...entry };
  audit.push(e);
  try {
    const dir = path.dirname(AUDIT_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(AUDIT_FILE, JSON.stringify(e) + '\n', 'utf8');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[compliance-engine] audit write failed:', err.message);
  }
  return e;
}

// =================================================================
// Auth middleware (SERVICE_TOKEN / Bearer / X-API-Key)
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
// Override with COMPLIANCE_LIMIT env var.
const LIMIT = parseInt(process.env.COMPLIANCE_LIMIT || '20', 10);
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
  counts: { controls: CONTROL_INDEX.size, policies: policies.size, evidence: evidence.size, attestations: attestations.size },
  timestamp: new Date().toISOString()
}));

app.get('/ready', (req, res) => res.json({ ready: true, service: SERVICE_NAME }));

// --- Frameworks ---
app.get('/api/frameworks', (req, res) => {
  res.json({
    count: Object.keys(FRAMEWORKS).length,
    frameworks: Object.entries(FRAMEWORKS).map(([id, def]) => ({
      id, name: def.name, controlCount: def.controls.length
    }))
  });
});

app.get('/api/frameworks/:id/controls', (req, res) => {
  const fw = FRAMEWORKS[req.params.id];
  if (!fw) return res.status(404).json({ error: 'framework not found' });
  res.json({ framework: req.params.id, count: fw.controls.length, controls: fw.controls });
});

app.get('/api/controls', (req, res) => {
  res.json({ count: CONTROL_INDEX.size, controls: Array.from(CONTROL_INDEX.values()) });
});

app.get('/api/controls/:id', (req, res) => {
  const c = CONTROL_INDEX.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'control not found' });
  res.json(c);
});

// --- Policy mapping (which policy covers which controls) ---
app.post('/api/policies',requireAuth,  customAuth, (req, res) => {
  const { name, controlIds = [], evidenceTypes = [] } = req.body || {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!Array.isArray(controlIds)) return res.status(400).json({ error: 'controlIds must be an array' });
  // Validate controls exist
  for (const cid of controlIds) {
    if (!CONTROL_INDEX.has(cid)) return res.status(400).json({ error: `unknown controlId: ${cid}` });
  }
  const id = `cmp-pol-${Date.now()}-${uuidv4().slice(0, 6)}`;
  const rec = { id, name, controlIds, evidenceTypes, createdAt: new Date().toISOString() };
  policies.set(id, rec);
  auditLog({ type: 'policy.mapped', actor: req.auth.role, details: { policyId: id, name, controlCount: controlIds.length } });
  res.json(rec);
});

app.get('/api/policies', (req, res) => {
  res.json({ count: policies.size, policies: Array.from(policies.values()) });
});

app.get('/api/policies/:id', (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'policy not found' });
  res.json(p);
});

app.delete('/api/policies/:id',requireAuth,  customAuth, (req, res) => {
  const p = policies.get(req.params.id);
  if (!p) return res.status(404).json({ error: 'policy not found' });
  policies.delete(req.params.id);
  auditLog({ type: 'policy.unmapped', actor: req.auth.role, details: { policyId: req.params.id } });
  res.json({ ok: true, deleted: true, policyId: req.params.id });
});

// --- Coverage: which controls have a mapped policy? ---
app.get('/api/coverage', (req, res) => {
  const { framework } = req.query;
  const mappedControls = new Set();
  for (const p of policies.values()) {
    for (const cid of p.controlIds || []) mappedControls.add(cid);
  }
  const all = Array.from(CONTROL_INDEX.values()).filter(c => !framework || c.framework === framework);
  const covered = all.filter(c => mappedControls.has(c.id));
  const gaps = all.filter(c => !mappedControls.has(c.id));
  res.json({
    framework: framework || 'all',
    total: all.length,
    covered: covered.length,
    gaps: gaps.length,
    coverageRate: all.length ? Number((covered.length / all.length).toFixed(4)) : 0,
    uncovered: gaps.map(g => ({ id: g.id, title: g.title, severity: g.severity }))
  });
});

// --- Evidence (audit artifacts linked to a control) ---
app.post('/api/evidence',requireAuth,  customAuth, (req, res) => {
  const { controlId, kind, summary, source, capturedBy, capturedAt, metadata } = req.body || {};
  if (!controlId || !CONTROL_INDEX.has(controlId)) return res.status(400).json({ error: 'valid controlId is required' });
  if (!kind) return res.status(400).json({ error: 'kind is required' });
  if (!summary) return res.status(400).json({ error: 'summary is required' });
  const id = `ev-${Date.now()}-${uuidv4().slice(0, 6)}`;
  const rec = {
    id, controlId, kind, summary,
    source: source || null,
    capturedBy: capturedBy || req.auth.role,
    capturedAt: capturedAt || new Date().toISOString(),
    metadata: metadata || {}
  };
  evidence.set(id, rec);
  auditLog({ type: 'evidence.recorded', actor: req.auth.role, details: { evidenceId: id, controlId, kind } });
  res.json(rec);
});

app.get('/api/evidence', (req, res) => {
  const { controlId, kind, limit = 50 } = req.query;
  let arr = Array.from(evidence.values());
  if (controlId) arr = arr.filter(e => e.controlId === controlId);
  if (kind) arr = arr.filter(e => e.kind === kind);
  arr.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
  res.json({ count: arr.length, evidence: arr.slice(0, parseInt(limit, 10)) });
});

app.get('/api/evidence/:id', (req, res) => {
  const e = evidence.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'evidence not found' });
  res.json(e);
});

// --- Attestations (formal sign-off that a control is in place) ---
app.post('/api/attestations',requireAuth,  customAuth, (req, res) => {
  const { controlId, attestedBy, validUntil, notes } = req.body || {};
  if (!controlId || !CONTROL_INDEX.has(controlId)) return res.status(400).json({ error: 'valid controlId is required' });
  if (!attestedBy) return res.status(400).json({ error: 'attestedBy is required' });
  const id = `att-${Date.now()}-${uuidv4().slice(0, 6)}`;
  const rec = {
    id, controlId, attestedBy,
    attestedAt: new Date().toISOString(),
    validUntil: validUntil || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    notes: notes || null
  };
  attestations.set(id, rec);
  auditLog({ type: 'attestation.recorded', actor: req.auth.role, details: { attestationId: id, controlId, attestedBy } });
  res.json(rec);
});

app.get('/api/attestations', (req, res) => {
  const { controlId, status } = req.query;
  let arr = Array.from(attestations.values());
  if (controlId) arr = arr.filter(a => a.controlId === controlId);
  if (status) arr = arr.filter(a => a.status === status);
  arr.sort((a, b) => b.attestedAt.localeCompare(a.attestedAt));
  res.json({ count: arr.length, attestations: arr });
});

app.post('/api/attestations/:id/revoke',requireAuth,  customAuth, (req, res) => {
  const a = attestations.get(req.params.id);
  if (!a) return res.status(404).json({ error: 'attestation not found' });
  a.status = 'revoked';
  a.revokedAt = new Date().toISOString();
  a.revokedBy = req.auth.role;
  attestations.set(a.id, a);
  auditLog({ type: 'attestation.revoked', actor: req.auth.role, details: { attestationId: a.id, controlId: a.controlId } });
  res.json(a);
});

// --- Snapshot: full readiness report for a framework ---
app.get('/api/frameworks/:id/snapshot', (req, res) => {
  const fw = FRAMEWORKS[req.params.id];
  if (!fw) return res.status(404).json({ error: 'framework not found' });

  // Build control -> policies, evidence, latest attestation
  const policiesByControl = new Map();
  for (const p of policies.values()) {
    for (const cid of p.controlIds || []) {
      if (!policiesByControl.has(cid)) policiesByControl.set(cid, []);
      policiesByControl.get(cid).push(p);
    }
  }
  const evidenceByControl = new Map();
  for (const e of evidence.values()) {
    if (!evidenceByControl.has(e.controlId)) evidenceByControl.set(e.controlId, []);
    evidenceByControl.get(e.controlId).push(e);
  }
  const attestationByControl = new Map();
  for (const a of attestations.values()) {
    if (a.status !== 'active') continue;
    const existing = attestationByControl.get(a.controlId);
    if (!existing || existing.attestedAt < a.attestedAt) attestationByControl.set(a.controlId, a);
  }

  const now = new Date().toISOString();
  const rows = fw.controls.map(c => {
    const ps = policiesByControl.get(c.id) || [];
    const ev = evidenceByControl.get(c.id) || [];
    const att = attestationByControl.get(c.id) || null;
    let status = 'uncovered';
    if (att && att.validUntil > now) status = 'attested';
    else if (ps.length > 0 && ev.length > 0) status = 'evidence-pending';
    else if (ps.length > 0) status = 'mapped';
    return {
      controlId: c.id,
      title: c.title,
      severity: c.severity,
      policyCount: ps.length,
      evidenceCount: ev.length,
      attestation: att ? { attestedBy: att.attestedBy, attestedAt: att.attestedAt, validUntil: att.validUntil } : null,
      status
    };
  });

  const summary = {
    framework: req.params.id,
    total: rows.length,
    attested: rows.filter(r => r.status === 'attested').length,
    evidencePending: rows.filter(r => r.status === 'evidence-pending').length,
    mapped: rows.filter(r => r.status === 'mapped').length,
    uncovered: rows.filter(r => r.status === 'uncovered').length,
    readiness: rows.length ? Number((rows.filter(r => r.status === 'attested').length / rows.length).toFixed(4)) : 0,
    snapshotAt: now
  };
  res.json({ summary, controls: rows });
});

// --- Audit ---
app.get('/api/audit', customAuth, (req, res) => {
  const { type, from, to } = req.query;
  let result = audit.slice();
  if (type) result = result.filter(e => e.type === type);
  if (from) result = result.filter(e => e.timestamp >= from);
  if (to) result = result.filter(e => e.timestamp <= to);
  res.json({ count: result.length, entries: result });
});

// =================================================================
// 404 + error
// =================================================================

app.use((err, req, res, _next) => {
  // eslint-disable-next-line no-console
  console.error('[compliance-engine] error:', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));

// =================================================================
// Boot
// =================================================================

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[compliance-engine] listening on :${PORT} (v${SERVICE_VERSION})`);
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
  console.log(`[compliance-engine] ${signal} received, flushing...`);
  try {
    await Promise.all([policies.flush(), evidence.flush(), attestations.flush()]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[compliance-engine] flush error:', err.message);
  }
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('[compliance-engine] uncaughtException:', err);
  gracefulShutdown('uncaughtException');
});
