/**
 * memory-governance — Memory governance policy engine
 * Port: 5326
 *
 * Tracks consent records, lawful basis, and purpose for each subject+memory-type.
 * Provides a check API to determine if processing is allowed.
 *
 * Storage: $DATA_DIR/governance.json
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5326', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'memory-lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'governance.json');

const VALID_BASES = ['consent', 'contract', 'legal_obligation', 'vital_interest', 'public_task', 'legitimate_interest'];
const VALID_STATUSES = ['granted', 'withdrawn', 'expired'];
const VALID_PROCESSING = ['allow', 'deny', 'flag'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ consents: {}, decisions: [] }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { consents: {}, decisions: [] }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateConsent(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.subject_id) return 'subject_id required';
  if (!body.memory_type) return 'memory_type required';
  if (!body.lawful_basis || !VALID_BASES.includes(body.lawful_basis)) return `lawful_basis must be one of ${VALID_BASES.join(',')}`;
  if (!body.purpose) return 'purpose required';
  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) return `status must be one of ${VALID_STATUSES.join(',')}`;
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'memory-governance', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Consent CRUD ----
  app.post('/consents', requireInternal, (req, res) => {
    const err = validateConsent(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { subject_id, memory_type, lawful_basis, purpose, expires_at = null, status = 'granted', metadata = {} } = req.body;
    const data = loadAll();
    // Replace existing for same subject+memory_type
    const existingKey = Object.keys(data.consents).find((k) => {
      const c = data.consents[k];
      return c.subject_id === subject_id && c.memory_type === memory_type;
    });
    if (existingKey) {
      // Update existing record
      const c = data.consents[existingKey];
      c.lawful_basis = lawful_basis;
      c.purpose = purpose;
      c.expires_at = expires_at;
      c.status = status;
      c.metadata = metadata;
      c.updated_at = nowIso();
      saveAll(data);
      return res.json(c);
    }
    const consent = {
      id: newId('cns'),
      subject_id, memory_type, lawful_basis, purpose, expires_at, status, metadata,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    data.consents[consent.id] = consent;
    saveAll(data);
    res.status(201).json(consent);
  });

  app.get('/consents', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.consents);
    if (req.query.subject_id) items = items.filter((c) => c.subject_id === req.query.subject_id);
    if (req.query.memory_type) items = items.filter((c) => c.memory_type === req.query.memory_type);
    if (req.query.status) items = items.filter((c) => c.status === req.query.status);
    res.json({ count: items.length, consents: items });
  });

  app.get('/consents/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const c = data.consents[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    res.json(c);
  });

  // Withdraw consent
  app.post('/consents/:id/withdraw', requireInternal, (req, res) => {
    const data = loadAll();
    const c = data.consents[req.params.id];
    if (!c) return res.status(404).json({ error: 'not_found' });
    c.status = 'withdrawn';
    c.withdrawn_at = nowIso();
    c.withdrawal_reason = (req.body && req.body.reason) || null;
    c.updated_at = nowIso();
    saveAll(data);
    res.json(c);
  });

  // ---- Governance check: should this memory processing be allowed? ----
  app.post('/check', requireInternal, (req, res) => {
    if (!req.body || !req.body.subject_id || !req.body.memory_type || !req.body.purpose) {
      return res.status(400).json({ error: 'validation', message: 'subject_id, memory_type, purpose required' });
    }
    const { subject_id, memory_type, purpose } = req.body;
    const data = loadAll();
    const consent = Object.values(data.consents).find((c) =>
      c.subject_id === subject_id && c.memory_type === memory_type
    );

    let decision = 'deny';
    let reason = 'no_consent_record';
    let consent_record = null;

    if (!consent) {
      decision = 'deny';
      reason = 'no_consent_record';
    } else if (consent.status === 'withdrawn') {
      decision = 'deny';
      reason = 'consent_withdrawn';
      consent_record = consent.id;
    } else if (consent.status === 'expired') {
      decision = 'deny';
      reason = 'consent_expired';
      consent_record = consent.id;
    } else if (consent.expires_at && new Date(consent.expires_at) < new Date()) {
      decision = 'deny';
      reason = 'consent_expired_by_date';
      consent_record = consent.id;
    } else if (consent.purpose !== purpose) {
      decision = 'flag';
      reason = 'purpose_mismatch';
      consent_record = consent.id;
    } else {
      decision = 'allow';
      reason = 'consent_valid_and_purpose_matches';
      consent_record = consent.id;
    }

    const decisionRecord = {
      id: newId('dcs'),
      subject_id, memory_type, purpose,
      decision, reason, consent_id: consent_record,
      created_at: nowIso(),
    };
    data.decisions.push(decisionRecord);
    if (data.decisions.length > 5000) data.decisions = data.decisions.slice(-5000);
    saveAll(data);

    res.json({ decision, reason, consent_id: consent_record, decision_id: decisionRecord.id });
  });

  app.get('/decisions', requireInternal, (req, res) => {
    const data = loadAll();
    let items = data.decisions.slice();
    if (req.query.subject_id) items = items.filter((d) => d.subject_id === req.query.subject_id);
    if (req.query.decision) items = items.filter((d) => d.decision === req.query.decision);
    const limit = parseInt(req.query.limit || '100', 10);
    items = items.slice(-limit);
    res.json({ count: items.length, decisions: items });
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`memory-governance listening on ${PORT}`));
}

module.exports = { createApp };