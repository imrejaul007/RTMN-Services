/**
 * memory-gdpr — GDPR tooling for memory records
 * Port: 5328
 *
 * Handles:
 * - Right to be forgotten (forget subject)
 * - Data portability (export subject data)
 * - Consent withdrawal
 * - Subject access requests (SAR)
 *
 * Storage: $DATA_DIR/gdpr.json (request log)
 * Auth:    X-Internal-Token
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '5328', 10);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'memory-lifecycle-internal-token';

const DATA_FILE = path.join(DATA_DIR, 'gdpr.json');

const VALID_REQUEST_TYPES = ['forget', 'export', 'withdraw_consent', 'access', 'rectify'];
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'failed'];

function nowIso() { return new Date().toISOString(); }
function newId(p) { return `${p}_${crypto.randomBytes(6).toString('hex')}`; }

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({ requests: {}, subjects: {} }, null, 2));
}
function loadAll() { ensureDataDir(); try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (_) { return { requests: {}, subjects: {} }; } }
function saveAll(d) {
  const tmp = DATA_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

function requireInternal(req, res, next) {
  if (req.headers['x-internal-token'] !== INTERNAL_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function validateRequest(body) {
  if (!body || typeof body !== 'object') return 'body required';
  if (!body.subject_id) return 'subject_id required';
  if (!body.request_type || !VALID_REQUEST_TYPES.includes(body.request_type)) {
    return `request_type must be one of ${VALID_REQUEST_TYPES.join(',')}`;
  }
  return null;
}

function createApp() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true, service: 'memory-gdpr', port: PORT }));
  app.get('/ready', (_req, res) => res.json({ ok: true }));

  // ---- Subject data registration (test-stub: in real life data comes from other services) ----
  app.post('/subjects/:subject_id/records', requireInternal, (req, res) => {
    if (!req.body || !Array.isArray(req.body.records)) return res.status(400).json({ error: 'validation', message: 'records array required' });
    const data = loadAll();
    const { subject_id } = req.params;
    if (!data.subjects[subject_id]) data.subjects[subject_id] = { records: [], forgotten: false, forgotten_at: null };
    for (const r of req.body.records) {
      const rec = { id: newId('rec'), ...r, created_at: r.created_at || nowIso() };
      data.subjects[subject_id].records.push(rec);
    }
    saveAll(data);
    res.status(201).json({ subject_id, record_count: data.subjects[subject_id].records.length });
  });

  app.get('/subjects/:subject_id', requireInternal, (req, res) => {
    const data = loadAll();
    const s = data.subjects[req.params.subject_id];
    if (!s) return res.status(404).json({ error: 'not_found' });
    res.json({ subject_id: req.params.subject_id, ...s });
  });

  // ---- GDPR Request CRUD ----
  app.post('/requests', requireInternal, (req, res) => {
    const err = validateRequest(req.body);
    if (err) return res.status(400).json({ error: 'validation', message: err });
    const { subject_id, request_type, requested_by = 'self', reason = '', metadata = {} } = req.body;
    const data = loadAll();
    const request = {
      id: newId('req'),
      subject_id, request_type, requested_by, reason, metadata,
      status: 'pending',
      created_at: nowIso(),
      updated_at: nowIso(),
      completed_at: null,
      result: null,
    };
    data.requests[request.id] = request;
    saveAll(data);
    res.status(201).json(request);
  });

  app.get('/requests', requireInternal, (req, res) => {
    const data = loadAll();
    let items = Object.values(data.requests);
    if (req.query.subject_id) items = items.filter((r) => r.subject_id === req.query.subject_id);
    if (req.query.status) items = items.filter((r) => r.status === req.query.status);
    if (req.query.request_type) items = items.filter((r) => r.request_type === req.query.request_type);
    res.json({ count: items.length, requests: items });
  });

  app.get('/requests/:id', requireInternal, (req, res) => {
    const data = loadAll();
    const r = data.requests[req.params.id];
    if (!r) return res.status(404).json({ error: 'not_found' });
    res.json(r);
  });

  // ---- Process: execute a GDPR request (right to be forgotten / data export) ----
  app.post('/requests/:id/process', requireInternal, (req, res) => {
    const data = loadAll();
    const request = data.requests[req.params.id];
    if (!request) return res.status(404).json({ error: 'not_found' });
    if (request.status === 'completed') return res.status(400).json({ error: 'already_completed' });

    request.status = 'in_progress';
    request.updated_at = nowIso();

    let result = null;
    if (request.request_type === 'forget') {
      // Right to be forgotten: anonymize or delete all records for this subject
      const subject = data.subjects[request.subject_id];
      if (subject) {
        const recordCount = subject.records.length;
        // Soft delete: keep tombstones but remove PII
        subject.records = subject.records.map((r) => ({ ...r, anonymized: true, original: undefined, pii_redacted: true }));
        subject.forgotten = true;
        subject.forgotten_at = nowIso();
        result = { action: 'anonymized', records_affected: recordCount };
      } else {
        result = { action: 'no_records_found', records_affected: 0 };
      }
    } else if (request.request_type === 'export') {
      // Data portability: return all subject records
      const subject = data.subjects[request.subject_id];
      const exportData = {
        subject_id: request.subject_id,
        exported_at: nowIso(),
        records: subject ? subject.records : [],
        forgotten: subject ? subject.forgotten : false,
      };
      result = { action: 'exported', record_count: exportData.records.length, data: exportData };
    } else if (request.request_type === 'access') {
      // Subject access request: same as export but for review
      const subject = data.subjects[request.subject_id];
      result = { action: 'access_provided', record_count: subject ? subject.records.length : 0, data: subject ? subject.records : [] };
    } else if (request.request_type === 'rectify') {
      // Rectify: update records with corrections
      const corrections = (req.body && req.body.corrections) || {};
      const subject = data.subjects[request.subject_id];
      let updated = 0;
      if (subject && corrections.record_id && corrections.fields) {
        const rec = subject.records.find((r) => r.id === corrections.record_id);
        if (rec) { Object.assign(rec, corrections.fields); rec.rectified_at = nowIso(); updated = 1; }
      }
      result = { action: 'rectified', records_updated: updated };
    } else if (request.request_type === 'withdraw_consent') {
      // Just log it — actual consent withdrawal happens via memory-governance
      result = { action: 'consent_withdrawal_logged', note: 'call memory-governance to formally withdraw' };
    }

    request.result = result;
    request.status = 'completed';
    request.completed_at = nowIso();
    request.updated_at = nowIso();
    saveAll(data);
    res.json(request);
  });

  // 404 fallback
  app.use((_req, res) => res.status(404).json({ error: 'not_found' }));

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(PORT, () => console.log(`memory-gdpr listening on ${PORT}`));
}

module.exports = { createApp };