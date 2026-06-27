/**
 * Memory Governance Service
 * Enterprise Memory Compliance for MemoryOS
 * Port: 4791
 *
 * Manages:
 * - Ownership (who owns memories?)
 * - Consent (user consent management)
 * - Export (GDPR right to portability)
 * - Deletion (GDPR right to erasure)
 * - Retention policies
 * - Audit trail
 * - GDPR compliance
 * - AI Act compliance
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

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

const PORT = process.env.PORT || 4791;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Ownership registry: memoryId -> owner
const ownership = new Map();

// Consent records: consentId -> consent
const consents = new Map();

// Consent by entity: entityId -> consentIds
const entityConsents = new Map();

// Retention policies: policyId -> policy
const retentionPolicies = new Map();

// Audit log: id -> audit entry
const auditLog = [];

// Deletion requests: requestId -> request
const deletionRequests = new Map();

// Export jobs: jobId -> job
const exportJobs = new Map();

// Data processing records (AI Act): recordId -> record
const processingRecords = new Map();

// ============================================
// CONSTANTS
// ============================================

const CONSENT_TYPES = {
  MEMORY_STORAGE: 'memory_storage',
  MEMORY_PROCESSING: 'memory_processing',
  MEMORY_SHARING: 'memory_sharing',
  AI_ANALYSIS: 'ai_analysis',
  THIRD_PARTY_SHARING: 'third_party_sharing',
  MARKETING: 'marketing',
  ANALYTICS: 'analytics'
};

const CONSENT_STATUS = {
  GRANTED: 'granted',
  DENIED: 'denied',
  WITHDRAWN: 'withdrawn',
  EXPIRED: 'expired',
  PENDING: 'pending'
};

const RETENTION_ACTIONS = {
  KEEP: 'keep',
  ARCHIVE: 'archive',
  DELETE: 'delete',
  ANONYMIZE: 'anonymize'
};

const REGULATIONS = {
  GDPR: 'gdpr',
  CCPA: 'ccpa',
  AI_ACT: 'ai_act',
  HIPAA: 'hipaa',
  SOC2: 'soc2'
};

const DATA_CATEGORIES = {
  PERSONAL: 'personal',
  SENSITIVE: 'sensitive',
  HEALTH: 'health',
  FINANCIAL: 'financial',
  BIOMETRIC: 'biometric',
  LOCATION: 'location',
  BEHAVIORAL: 'behavioral'
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const generateId = () => uuidv4();

const logAudit = (action, entityType, entityId, details) => {
  const entry = {
    id: generateId(),
    timestamp: Date.now(),
    action,
    entityType,
    entityId,
    details
  };
  auditLog.push(entry);
  return entry;
};

const isExpired = (consent) => {
  if (!consent.expiresAt) return false;
  return new Date(consent.expiresAt).getTime() <= Date.now();
};

const hasValidConsent = (entityId, consentType) => {
  const consentIds = entityConsents.get(entityId) || [];
  return consentIds.some(consentId => {
    const consent = consents.get(consentId);
    return consent &&
           consent.type === consentType &&
           consent.status === CONSENT_STATUS.GRANTED &&
           !isExpired(consent);
  });
};

const applyRetentionPolicy = (memory, policy) => {
  const now = Date.now();
  const createdAt = new Date(memory.createdAt).getTime();
  const ageInDays = (now - createdAt) / (1000 * 60 * 60 * 24);

  // Check time-based rules
  if (policy.maxAgeDays && ageInDays > policy.maxAgeDays) {
    return policy.onMaxAge || RETENTION_ACTIONS.DELETE;
  }

  // Check importance-based rules
  if (memory.importance && policy.importanceThresholds) {
    const threshold = policy.importanceThresholds[memory.importance];
    if (threshold && ageInDays > threshold) {
      return policy.onMaxAge || RETENTION_ACTIONS.ARCHIVE;
    }
  }

  // Check access-based rules
  if (memory.lastAccessed && policy.maxInactiveDays) {
    const inactiveDays = (now - new Date(memory.lastAccessed).getTime()) / (1000 * 60 * 60 * 24);
    if (inactiveDays > policy.maxInactiveDays) {
      return policy.onMaxAge || RETENTION_ACTIONS.ARCHIVE;
    }
  }

  return RETENTION_ACTIONS.KEEP;
};

// ============================================
// OWNERSHIP ROUTES
// ============================================

// Grant ownership
app.post('/ownership', requireInternal, (req, res) => {
  const { memoryId, ownerId, ownerType, metadata } = req.body;

  if (!memoryId || !ownerId) {
    return res.status(400).json({ error: 'memoryId and ownerId are required' });
  }

  const record = {
    id: generateId(),
    memoryId,
    ownerId,
    ownerType: ownerType || 'user', // user, organization, agent, system
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  ownership.set(memoryId, record);

  logAudit('GRANT_OWNERSHIP', 'memory', memoryId, { ownerId, ownerType });

  res.status(201).json(record);
});

// Get ownership
app.get('/ownership/:memoryId', (req, res) => {
  const record = ownership.get(req.params.memoryId);
  if (!record) {
    return res.status(404).json({ error: 'Ownership record not found' });
  }
  res.json(record);
});

// Transfer ownership
app.post('/ownership/:memoryId/transfer', requireInternal, (req, res) => {
  const { newOwnerId, newOwnerType, reason } = req.body;

  const record = ownership.get(req.params.memoryId);
  if (!record) {
    return res.status(404).json({ error: 'Ownership record not found' });
  }

  const oldOwner = { ownerId: record.ownerId, ownerType: record.ownerType };

  record.ownerId = newOwnerId;
  record.ownerType = newOwnerType || record.ownerType;
  record.updatedAt = new Date().toISOString();

  if (reason) record.transferReason = reason;

  ownership.set(record.memoryId, record);

  logAudit('TRANSFER_OWNERSHIP', 'memory', record.memoryId, {
    oldOwner,
    newOwner: { ownerId: newOwnerId, ownerType: record.ownerType },
    reason
  });

  res.json(record);
});

// Get all memories owned by entity
app.get('/ownership', (req, res) => {
  const { ownerId, ownerType, limit = 100, offset = 0 } = req.query;

  let result = Array.from(ownership.values());

  if (ownerId) {
    result = result.filter(r => r.ownerId === ownerId);
  }

  if (ownerType) {
    result = result.filter(r => r.ownerType === ownerType);
  }

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// Delete ownership (memory deleted)
app.delete('/ownership/:memoryId', requireInternal, (req, res) => {
  if (!ownership.has(req.params.memoryId)) {
    return res.status(404).json({ error: 'Ownership record not found' });
  }

  ownership.delete(req.params.memoryId);
  logAudit('DELETE_OWNERSHIP', 'memory', req.params.memoryId, {});

  res.json({ success: true, memoryId: req.params.memoryId });
});

// ============================================
// CONSENT ROUTES
// ============================================

// Grant consent
app.post('/consents', requireInternal, (req, res) => {
  const { entityId, entityType, type, expiresAt, metadata } = req.body;

  if (!entityId || !type) {
    return res.status(400).json({ error: 'entityId and type are required' });
  }

  if (!Object.values(CONSENT_TYPES).includes(type)) {
    return res.status(400).json({
      error: `Invalid consent type. Must be one of: ${Object.values(CONSENT_TYPES).join(', ')}`
    });
  }

  const consent = {
    id: generateId(),
    entityId,
    entityType: entityType || 'user',
    type,
    status: CONSENT_STATUS.GRANTED,
    grantedAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    metadata: metadata || {}
  };

  consents.set(consent.id, consent);

  // Index by entity
  const entityConsentIds = entityConsents.get(entityId) || [];
  entityConsents.set(entityId, [...entityConsentIds, consent.id]);

  logAudit('GRANT_CONSENT', 'consent', consent.id, { entityId, type });

  res.status(201).json(consent);
});

// Get consent
app.get('/consents/:id', (req, res) => {
  const consent = consents.get(req.params.id);
  if (!consent) {
    return res.status(404).json({ error: 'Consent not found' });
  }

  // Check if expired
  if (isExpired(consent) && consent.status === CONSENT_STATUS.GRANTED) {
    consent.status = CONSENT_STATUS.EXPIRED;
    consents.set(consent.id, consent);
  }

  res.json(consent);
});

// Get consents for entity
app.get('/consents', (req, res) => {
  const { entityId, type, status } = req.query;

  let result = [];

  if (entityId) {
    const consentIds = entityConsents.get(entityId) || [];
    result = consentIds.map(id => consents.get(id)).filter(Boolean);
  } else {
    result = Array.from(consents.values());
  }

  if (type) {
    result = result.filter(c => c.type === type);
  }

  if (status) {
    // Also check expired consents
    if (status === CONSENT_STATUS.EXPIRED) {
      result = result.filter(c => isExpired(c));
    } else {
      result = result.filter(c => c.status === status);
    }
  }

  // Update expired status
  result = result.map(c => {
    if (isExpired(c) && c.status === CONSENT_STATUS.GRANTED) {
      c.status = CONSENT_STATUS.EXPIRED;
      consents.set(c.id, c);
    }
    return c;
  });

  res.json({ data: result, total: result.length });
});

// Check if entity has valid consent
app.get('/consents/check/:entityId/:type', (req, res) => {
  const { entityId, type } = req.params;
  const hasConsent = hasValidConsent(entityId, type);

  res.json({
    entityId,
    consentType: type,
    hasValidConsent: hasConsent,
    checkedAt: new Date().toISOString()
  });
});

// Withdraw consent
app.post('/consents/:id/withdraw', requireInternal, (req, res) => {
  const consent = consents.get(req.params.id);
  if (!consent) {
    return res.status(404).json({ error: 'Consent not found' });
  }

  if (consent.status !== CONSENT_STATUS.GRANTED) {
    return res.status(400).json({ error: 'Consent is not in granted state' });
  }

  consent.status = CONSENT_STATUS.WITHDRAWN;
  consent.withdrawnAt = new Date().toISOString();

  consents.set(consent.id, consent);

  logAudit('WITHDRAW_CONSENT', 'consent', consent.id, {
    entityId: consent.entityId,
    type: consent.type
  });

  res.json(consent);
});

// ============================================
// RETENTION POLICY ROUTES
// ============================================

// Create retention policy
app.post('/retention-policies', requireInternal, (req, res) => {
  const { name, description, rules, appliesTo, metadata } = req.body;

  if (!name || !rules) {
    return res.status(400).json({ error: 'name and rules are required' });
  }

  const policy = {
    id: generateId(),
    name,
    description: description || null,
    rules,
    appliesTo: appliesTo || [], // entity types or specific entities
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  retentionPolicies.set(policy.id, policy);

  logAudit('CREATE_POLICY', 'retention', policy.id, { name, rules });

  res.status(201).json(policy);
});

// Get retention policy
app.get('/retention-policies/:id', (req, res) => {
  const policy = retentionPolicies.get(req.params.id);
  if (!policy) {
    return res.status(404).json({ error: 'Retention policy not found' });
  }
  res.json(policy);
});

// List retention policies
app.get('/retention-policies', (req, res) => {
  const result = Array.from(retentionPolicies.values());
  res.json({ data: result, total: result.length });
});

// Update retention policy
app.put('/retention-policies/:id', requireInternal, (req, res) => {
  const policy = retentionPolicies.get(req.params.id);
  if (!policy) {
    return res.status(404).json({ error: 'Retention policy not found' });
  }

  const { name, description, rules, appliesTo } = req.body;

  if (name) policy.name = name;
  if (description !== undefined) policy.description = description;
  if (rules) policy.rules = rules;
  if (appliesTo) policy.appliesTo = appliesTo;
  policy.updatedAt = new Date().toISOString();

  retentionPolicies.set(policy.id, policy);

  logAudit('UPDATE_POLICY', 'retention', policy.id, { name });

  res.json(policy);
});

// Delete retention policy
app.delete('/retention-policies/:id', requireInternal, (req, res) => {
  if (!retentionPolicies.has(req.params.id)) {
    return res.status(404).json({ error: 'Retention policy not found' });
  }

  retentionPolicies.delete(req.params.id);
  logAudit('DELETE_POLICY', 'retention', req.params.id, {});

  res.json({ success: true, id: req.params.id });
});

// Preview retention actions
app.post('/retention-policies/:id/preview', requireInternal, (req, res) => {
  const policy = retentionPolicies.get(req.params.id);
  if (!policy) {
    return res.status(404).json({ error: 'Retention policy not found' });
  }

  const { memories } = req.body;
  if (!memories || !Array.isArray(memories)) {
    return res.status(400).json({ error: 'memories array is required' });
  }

  const preview = memories.map(memory => ({
    memoryId: memory.id,
    action: applyRetentionPolicy(memory, policy),
    reason: 'Retetion policy applied'
  }));

  const summary = {
    keep: preview.filter(p => p.action === RETENTION_ACTIONS.KEEP).length,
    archive: preview.filter(p => p.action === RETENTION_ACTIONS.ARCHIVE).length,
    delete: preview.filter(p => p.action === RETENTION_ACTIONS.DELETE).length,
    anonymize: preview.filter(p => p.action === RETENTION_ACTIONS.ANONYMIZE).length
  };

  res.json({ preview, summary });
});

// ============================================
// DELETION REQUEST ROUTES (GDPR Right to Erasure)
// ============================================

// Create deletion request
app.post('/deletion-requests', requireInternal, (req, res) => {
  const { memoryId, requesterId, requesterType, reason, regulation } = req.body;

  if (!memoryId || !requesterId) {
    return res.status(400).json({ error: 'memoryId and requesterId are required' });
  }

  // Check if deletion is already pending
  const existing = Array.from(deletionRequests.values())
    .find(r => r.memoryId === memoryId && r.status === 'pending');

  if (existing) {
    return res.status(400).json({
      error: 'Deletion request already pending',
      existingRequestId: existing.id
    });
  }

  const request = {
    id: generateId(),
    memoryId,
    requesterId,
    requesterType: requesterType || 'user',
    reason: reason || 'GDPR right to erasure',
    regulation: regulation || REGULATIONS.GDPR,
    status: 'pending', // pending, processing, completed, denied
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  deletionRequests.set(request.id, request);

  logAudit('CREATE_DELETION_REQUEST', 'deletion', request.id, {
    memoryId,
    requesterId,
    regulation
  });

  res.status(201).json(request);
});

// Get deletion request
app.get('/deletion-requests/:id', (req, res) => {
  const request = deletionRequests.get(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Deletion request not found' });
  }
  res.json(request);
});

// List deletion requests
app.get('/deletion-requests', (req, res) => {
  const { status, regulation, limit = 100, offset = 0 } = req.query;

  let result = Array.from(deletionRequests.values());

  if (status) {
    result = result.filter(r => r.status === status);
  }

  if (regulation) {
    result = result.filter(r => r.regulation === regulation);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// Complete deletion request
app.post('/deletion-requests/:id/complete', requireInternal, (req, res) => {
  const request = deletionRequests.get(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Deletion request not found' });
  }

  if (request.status !== 'pending' && request.status !== 'processing') {
    return res.status(400).json({ error: 'Request is not in pending or processing state' });
  }

  request.status = 'completed';
  request.completedAt = new Date().toISOString();

  deletionRequests.set(request.id, request);

  logAudit('COMPLETE_DELETION', 'deletion', request.id, {
    memoryId: request.memoryId
  });

  res.json(request);
});

// Deny deletion request
app.post('/deletion-requests/:id/deny', requireInternal, (req, res) => {
  const { reason } = req.body;

  const request = deletionRequests.get(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Deletion request not found' });
  }

  request.status = 'denied';
  request.denialReason = reason || 'Request denied';
  request.completedAt = new Date().toISOString();

  deletionRequests.set(request.id, request);

  logAudit('DENY_DELETION', 'deletion', request.id, {
    reason
  });

  res.json(request);
});

// ============================================
// EXPORT ROUTES (GDPR Right to Portability)
// ============================================

// Create export job
app.post('/exports', requireInternal, (req, res) => {
  const { entityId, entityType, format, dataCategories, memoryIds } = req.body;

  if (!entityId) {
    return res.status(400).json({ error: 'entityId is required' });
  }

  // Check consent for data export
  if (!hasValidConsent(entityId, CONSENT_TYPES.MEMORY_STORAGE)) {
    return res.status(403).json({
      error: 'Valid consent required for data export',
      requiredConsent: CONSENT_TYPES.MEMORY_STORAGE
    });
  }

  const job = {
    id: generateId(),
    entityId,
    entityType: entityType || 'user',
    format: format || 'json', // json, csv, xml, yaml
    dataCategories: dataCategories || Object.values(DATA_CATEGORIES),
    memoryIds: memoryIds || [], // specific memories or empty for all
    status: 'pending', // pending, processing, completed, failed
    progress: 0,
    createdAt: new Date().toISOString(),
    completedAt: null,
    downloadUrl: null,
    expiresAt: null
  };

  exportJobs.set(job.id, job);

  logAudit('CREATE_EXPORT', 'export', job.id, {
    entityId,
    format,
    memoryCount: memoryIds?.length || 'all'
  });

  res.status(201).json(job);
});

// Get export job
app.get('/exports/:id', (req, res) => {
  const job = exportJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Export job not found' });
  }
  res.json(job);
});

// List export jobs
app.get('/exports', (req, res) => {
  const { entityId, status, limit = 100, offset = 0 } = req.query;

  let result = Array.from(exportJobs.values());

  if (entityId) {
    result = result.filter(j => j.entityId === entityId);
  }

  if (status) {
    result = result.filter(j => j.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// ============================================
// PROCESSING RECORDS (AI Act)
// ============================================

// Record data processing
app.post('/processing-records', requireInternal, (req, res) => {
  const { memoryId, processorId, processorType, purpose, legalBasis, dataCategories } = req.body;

  if (!memoryId || !processorId || !purpose) {
    return res.status(400).json({ error: 'memoryId, processorId, and purpose are required' });
  }

  const record = {
    id: generateId(),
    memoryId,
    processorId,
    processorType: processorType || 'ai_agent',
    purpose,
    legalBasis: legalBasis || 'consent',
    dataCategories: dataCategories || [DATA_CATEGORIES.PERSONAL],
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString()
  };

  processingRecords.set(record.id, record);

  logAudit('RECORD_PROCESSING', 'processing', record.id, {
    memoryId,
    processorId,
    purpose
  });

  res.status(201).json(record);
});

// Get processing records for memory
app.get('/processing-records', (req, res) => {
  const { memoryId, processorId, purpose, limit = 100, offset = 0 } = req.query;

  let result = Array.from(processingRecords.values());

  if (memoryId) {
    result = result.filter(r => r.memoryId === memoryId);
  }

  if (processorId) {
    result = result.filter(r => r.processorId === processorId);
  }

  if (purpose) {
    result = result.filter(r => r.purpose.includes(purpose));
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(offset), offset: Number(offset) });
});

// ============================================
// AUDIT ROUTES
// ============================================

app.get('/audit', (req, res) => {
  const { entityId, action, entityType, startDate, endDate, limit = 100, offset = 0 } = req.query;

  let result = [...auditLog];

  if (entityId) {
    result = result.filter(log => log.entityId === entityId);
  }

  if (action) {
    result = result.filter(log => log.action === action);
  }

  if (entityType) {
    result = result.filter(log => log.entityType === entityType);
  }

  if (startDate) {
    result = result.filter(log => new Date(log.timestamp) >= new Date(startDate));
  }

  if (endDate) {
    result = result.filter(log => new Date(log.timestamp) <= new Date(endDate));
  }

  result.sort((a, b) => b.timestamp - a.timestamp);

  const total = result.length;
  result = result.slice(Number(offset), Number(offset) + Number(limit));

  res.json({ data: result, total, limit: Number(limit), offset: Number(offset) });
});

// ============================================
// COMPLIANCE REPORT
// ============================================

app.get('/compliance-report', (req, res) => {
  const { entityId, regulation } = req.query;

  const report = {
    generatedAt: new Date().toISOString(),
    regulation: regulation || REGULATIONS.GDPR,
    entityId: entityId || 'all',

    ownership: {
      totalOwned: ownership.size,
      byType: Array.from(ownership.values()).reduce((acc, r) => {
        acc[r.ownerType] = (acc[r.ownerType] || 0) + 1;
        return acc;
      }, {})
    },

    consents: {
      total: consents.size,
      byStatus: Array.from(consents.values()).reduce((acc, c) => {
        const status = isExpired(c) ? CONSENT_STATUS.EXPIRED : c.status;
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {}),
      byType: Array.from(consents.values()).reduce((acc, c) => {
        acc[c.type] = (acc[c.type] || 0) + 1;
        return acc;
      }, {})
    },

    retentionPolicies: {
      total: retentionPolicies.size
    },

    deletionRequests: {
      total: deletionRequests.size,
      pending: Array.from(deletionRequests.values()).filter(r => r.status === 'pending').length,
      completed: Array.from(deletionRequests.values()).filter(r => r.status === 'completed').length
    },

    exportJobs: {
      total: exportJobs.size,
      completed: Array.from(exportJobs.values()).filter(j => j.status === 'completed').length
    },

    processingRecords: {
      total: processingRecords.size
    },

    auditLog: {
      totalEntries: auditLog.length,
      recentEntries: auditLog.slice(-10).length
    }
  };

  res.json(report);
});

// ============================================
// HEALTH & STATUS ROUTES
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'memory-governance',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    service: 'memory-governance',
    stats: {
      ownershipRecords: ownership.size,
      consents: consents.size,
      retentionPolicies: retentionPolicies.size,
      deletionRequests: deletionRequests.size,
      exportJobs: exportJobs.size,
      processingRecords: processingRecords.size,
      auditLogEntries: auditLog.length
    }
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`Memory Governance service running on port ${PORT}`);
});

export default app;
