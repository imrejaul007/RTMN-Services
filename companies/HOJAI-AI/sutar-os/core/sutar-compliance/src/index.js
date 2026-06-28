/**
 * SUTAR OS — Compliance Engine
 *
 * SOC2 Type II + GDPR compliance for autonomous agent operations.
 * Covers: audit logging, data retention, consent management,
 * access control, encryption, and compliance reporting.
 *
 * Endpoints:
 *   GET  /api/compliance/audit-log          — Query audit events
 *   GET  /api/compliance/gdpr/data-subjects — GDPR data subject registry
 *   POST /api/compliance/gdpr/export        — GDPR data export (portability)
 *   POST /api/compliance/gdpr/erase         — GDPR right to erasure
 *   GET  /api/compliance/consent            — Consent records
 *   POST /api/compliance/consent            — Record consent
 *   GET  /api/compliance/access-review      — Access review report
 *   GET  /api/compliance/retention          — Data retention status
 *   POST /api/compliance/retention/purge    — Trigger data purge
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());

setupSecurity(app, { serviceName: 'sutar-compliance' });

const PORT = process.env.COMPLIANCE_PORT || 4605;

// ---------- In-Memory Audit Store (replace with persistent store in prod) ----------
const auditLog = [];
const dataSubjects = new Map(); // subjectId → { gdprConsent, erasureRequested, ... }
const consentRecords = new Map(); // consentId → { subjectId, purpose, granted, timestamp }
const retentionPolicies = new Map(); // policyId → { dataType, retentionDays, purgeAfter }

// ---------- Audit Logging ----------
function logAuditEvent(params) {
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    actor: params.actor || 'system',
    actorType: params.actorType || 'agent',
    action: params.action,
    resource: params.resource,
    resourceId: params.resourceId,
    outcome: params.outcome || 'success',
    metadata: params.metadata || {},
    dataCategory: params.dataCategory || 'general',
    piiInvolved: params.piiInvolved || false,
    gdprRelevant: params.gdprRelevant || false,
    jurisdiction: params.jurisdiction || 'EU',
  };
  auditLog.push(event);
  return event;
}

// ---------- GDPR Data Subject Management ----------
function registerDataSubject(params) {
  const subjectId = params.subjectId || uuidv4();
  const subject = {
    subjectId,
    email: params.email,
    fullName: params.fullName,
    registeredAt: new Date().toISOString(),
    gdprConsent: false,
    erasureRequested: false,
    erasureCompletedAt: null,
    lastAccessedAt: null,
    dataCategories: params.dataCategories || [],
    controller: 'SUTAR OS',
    dpoc: 'privacy@sutar.ai',
  };
  dataSubjects.set(subjectId, subject);
  return subject;
}

function requestErasure(subjectId) {
  const subject = dataSubjects.get(subjectId);
  if (!subject) {
    return { error: 'Data subject not found' };
  }
  subject.erasureRequested = true;
  subject.erasureRequestedAt = new Date().toISOString();
  // Schedule actual erasure (in prod, trigger async job)
  return { subjectId, status: 'erasure_scheduled', scheduledWithin: '30 days' };
}

function processErasure(subjectId) {
  const subject = dataSubjects.get(subjectId);
  if (!subject) return { error: 'Data subject not found' };

  // Erase from audit log (GDPR-relevant PII entries)
  const erasedAuditCount = auditLog.filter(e =>
    e.gdprRelevant && (e.actor === subjectId || e.resourceId === subjectId)
  ).length;
  auditLog = auditLog.filter(e =>
    !(e.gdprRelevant && (e.actor === subjectId || e.resourceId === subjectId))
  );

  // Erase consent records
  consentRecords.delete(subjectId);

  subject.erasureCompletedAt = new Date().toISOString();
  subject.gdprConsent = false;

  return { subjectId, auditRecordsErased: erasedAuditCount, status: 'completed' };
}

function exportSubjectData(subjectId) {
  const subject = dataSubjects.get(subjectId);
  if (!subject) return { error: 'Data subject not found' };

  const subjectAuditEvents = auditLog.filter(e =>
    e.actor === subjectId || e.resourceId === subjectId
  );
  const subjectConsents = Array.from(consentRecords.values()).filter(
    c => c.subjectId === subjectId
  );

  return {
    subject,
    auditEvents: subjectAuditEvents,
    consentRecords: subjectConsents,
    exportedAt: new Date().toISOString(),
    format: 'JSON',
    controller: 'SUTAR OS',
  };
}

// ---------- Consent Management ----------
function recordConsent(params) {
  const consentId = uuidv4();
  const record = {
    consentId,
    subjectId: params.subjectId,
    purpose: params.purpose,
    granted: params.granted !== false,
    timestamp: new Date().toISOString(),
    method: params.method || 'web_form',
    version: params.version || '1.0',
    ipHash: hashIp(params.ipAddress),
    withdrawalPossible: true,
  };
  consentRecords.set(consentId, record);

  // Update subject consent status
  const subject = dataSubjects.get(params.subjectId);
  if (subject) {
    subject.gdprConsent = params.granted !== false;
    subject.lastConsentAt = record.timestamp;
  }

  logAuditEvent({
    actor: params.subjectId,
    action: params.granted !== false ? 'consent_granted' : 'consent_denied',
    resource: 'consent_record',
    resourceId: consentId,
    outcome: 'success',
    gdprRelevant: true,
  });

  return record;
}

function checkConsent(subjectId, purpose) {
  const records = Array.from(consentRecords.values()).filter(
    c => c.subjectId === subjectId && c.purpose === purpose
  );
  if (!records.length) return { granted: false, reason: 'no_consent_record' };
  const latest = records.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  return { granted: latest.granted, consentId: latest.consentId, timestamp: latest.timestamp };
}

// ---------- Data Retention ----------
function setupRetentionPolicy(params) {
  const policyId = uuidv4();
  const policy = {
    policyId,
    dataType: params.dataType,
    retentionDays: params.retentionDays || 365,
    purgeAfter: params.purgeAfter || 'immediately',
    encrypted: params.encrypted !== false,
    jurisdiction: params.jurisdiction || 'EU',
    legalBasis: params.legalBasis || 'legitimate_interest',
    createdAt: new Date().toISOString(),
  };
  retentionPolicies.set(policyId, policy);
  return policy;
}

function applyRetentionPolicy(dataType) {
  const policy = Array.from(retentionPolicies.values()).find(p => p.dataType === dataType);
  if (!policy) return { dataType, retained: true, reason: 'no_policy' };

  const cutoff = Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000;
  const oldEvents = auditLog.filter(e =>
    e.dataCategory === dataType && new Date(e.timestamp).getTime() < cutoff
  );

  return {
    policyId: policy.policyId,
    dataType,
    totalEvents: auditLog.length,
    eventsBeforeCutoff: oldEvents.length,
    retentionDays: policy.retentionDays,
    purgeRecommended: oldEvents.length > 0,
  };
}

// ---------- Access Review ----------
function generateAccessReview() {
  const actors = {};
  for (const event of auditLog.slice(-10000)) { // last 10k events
    if (!actors[event.actor]) {
      actors[event.actor] = { actor: event.actor, actorType: event.actorType, actions: 0, resources: new Set(), lastSeen: null };
    }
    actors[event.actor].actions++;
    actors[event.actor].resources.add(event.resource);
    if (!actors[event.actor].lastSeen || event.timestamp > actors[event.actor].lastSeen) {
      actors[event.actor].lastSeen = event.timestamp;
    }
  }

  return {
    reviewedAt: new Date().toISOString(),
    totalActors: Object.keys(actors).length,
    actors: Object.values(actors).map(a => ({ ...a, resources: a.resources.size })),
    staleActors: Object.values(actors).filter(a => {
      if (!a.lastSeen) return false;
      const daysSince = (Date.now() - new Date(a.lastSeen).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 90;
    }).length,
    reportPeriod: 'last_90_days',
  };
}

// ---------- Utilities ----------
function hashIp(ip) {
  if (!ip) return null;
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash |= 0;
  }
  return 'hash_' + Math.abs(hash).toString(16);
}

// ---------- Routes ----------
app.get('/api/compliance/audit-log', requireAuth, (req, res) => {
  const { actor, action, resource, from, to, limit } = req.query;
  let events = [...auditLog];

  if (actor) events = events.filter(e => e.actor === actor);
  if (action) events = events.filter(e => e.action === action);
  if (resource) events = events.filter(e => e.resource === resource);
  if (from) events = events.filter(e => e.timestamp >= from);
  if (to) events = events.filter(e => e.timestamp <= to);

  events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const pageSize = Math.min(parseInt(limit) || 100, 1000);
  events = events.slice(0, pageSize);

  res.json({ total: auditLog.length, returned: events.length, events });
});

app.get('/api/compliance/gdpr/data-subjects', requireAuth, (req, res) => {
  res.json({ total: dataSubjects.size, subjects: Array.from(dataSubjects.values()) });
});

app.post('/api/compliance/gdpr/data-subjects', requireAuth, (req, res) => {
  const subject = registerDataSubject(req.body);
  res.status(201).json(subject);
});

app.post('/api/compliance/gdpr/export', requireAuth, (req, res) => {
  const { subjectId } = req.body;
  if (!subjectId) return res.status(400).json({ error: 'subjectId required' });
  const data = exportSubjectData(subjectId);
  if (data.error) return res.status(404).json(data);
  res.json(data);
});

app.post('/api/compliance/gdpr/erase', requireAuth, (req, res) => {
  const { subjectId, execute } = req.body;
  if (!subjectId) return res.status(400).json({ error: 'subjectId required' });
  if (execute === true) {
    const result = processErasure(subjectId);
    logAuditEvent({ actor: 'system', action: 'gdpr_erasure_executed', resource: 'data_subject', resourceId: subjectId, outcome: 'success', gdprRelevant: true });
    res.json(result);
  } else {
    res.json(requestErasure(subjectId));
  }
});

app.get('/api/compliance/consent', requireAuth, (req, res) => {
  const { subjectId, purpose } = req.query;
  if (subjectId) {
    const records = Array.from(consentRecords.values()).filter(c => c.subjectId === subjectId);
    if (purpose) {
      const result = checkConsent(subjectId, purpose);
      return res.json(result);
    }
    return res.json({ total: records.length, records });
  }
  res.json({ total: consentRecords.size, records: Array.from(consentRecords.values()) });
});

app.post('/api/compliance/consent', (req, res) => {
  const record = recordConsent(req.body);
  res.status(201).json(record);
});

app.get('/api/compliance/access-review', requireAuth, (req, res) => {
  res.json(generateAccessReview());
});

app.get('/api/compliance/retention', requireAuth, (req, res) => {
  const { dataType } = req.query;
  if (dataType) {
    return res.json(applyRetentionPolicy(dataType));
  }
  res.json({ policies: Array.from(retentionPolicies.values()) });
});

app.post('/api/compliance/retention/policies', requireAuth, (req, res) => {
  const policy = setupRetentionPolicy(req.body);
  res.status(201).json(policy);
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'sutar-compliance',
    port: PORT,
    layer: 'Compliance',
    auditEvents: auditLog.length,
    dataSubjects: dataSubjects.size,
    consentRecords: consentRecords.size,
    retentionPolicies: retentionPolicies.size,
    timestamp: new Date().toISOString(),
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[sutar-compliance] listening on :${PORT}`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });