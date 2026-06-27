import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock external services
const mockMemorySubstrate = {
  query: async (query) => ({ rows: [], query }),
  insert: async (data) => ({ id: `mock-${Date.now()}`, ...data }),
  delete: async (query) => ({ deleted: true }),
};

const mockAuditLogger = {
  log: async (event) => console.log('AUDIT:', event),
};

// Create a fresh app for each test
function createTestApp() {
  const app = express();
  app.use(express.json());

  // In-memory stores (fresh for each test)
  const ownerships = new Map();
  const consents = new Map();
  const retentionPolicies = new Map();
  const deletionRequests = new Map();
  const exportJobs = new Map();
  const processingRecords = new Map();
  const auditLogs = [];

  // Helper to create ID
  const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Helper to log audit
  const logAudit = (action, details) => {
    auditLogs.push({ timestamp: new Date().toISOString(), action, ...details });
  };

  // OWNERSHIP MANAGEMENT
  app.post('/api/v1/ownership', async (req, res) => {
    try {
      const { entityId, entityType, ownerId, ownerType, ownershipType, metadata } = req.body;

      if (!entityId || !ownerId) {
        return res.status(400).json({ error: 'entityId and ownerId are required' });
      }

      const existing = [...ownerships.values()].find(
        o => o.entityId === entityId && o.status === 'active'
      );

      if (existing) {
        return res.status(409).json({ error: 'Entity already has an active owner' });
      }

      const ownership = {
        id: createId('own'),
        entityId,
        entityType: entityType || 'unknown',
        ownerId,
        ownerType: ownerType || 'user',
        ownershipType: ownershipType || 'full',
        status: 'active',
        metadata: metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ownerships.set(ownership.id, ownership);
      await mockAuditLogger.log({ type: 'ownership_created', ownership });
      logAudit('ownership_created', ownership);

      res.status(201).json(ownership);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/ownership/:entityId', async (req, res) => {
    try {
      const ownership = [...ownerships.values()].find(
        o => o.entityId === req.params.entityId && o.status === 'active'
      );

      if (!ownership) {
        return res.status(404).json({ error: 'Ownership not found' });
      }

      res.json(ownership);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/ownerships/owner/:ownerId', async (req, res) => {
    try {
      const result = [...ownerships.values()].filter(
        o => o.ownerId === req.params.ownerId && o.status === 'active'
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/ownership/:id/transfer', async (req, res) => {
    try {
      const ownership = ownerships.get(req.params.id);

      if (!ownership) {
        return res.status(404).json({ error: 'Ownership not found' });
      }

      const { newOwnerId, newOwnerType, reason } = req.body;

      if (!newOwnerId) {
        return res.status(400).json({ error: 'newOwnerId is required' });
      }

      ownership.status = 'transferred';
      ownership.updatedAt = new Date().toISOString();
      ownerships.set(ownership.id, ownership);

      const newOwnership = {
        ...ownership,
        id: createId('own'),
        ownerId: newOwnerId,
        ownerType: newOwnerType || ownership.ownerType,
        previousOwnerId: ownership.ownerId,
        transferReason: reason,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      ownerships.set(newOwnership.id, newOwnership);
      logAudit('ownership_transferred', { from: ownership, to: newOwnership });

      res.json(newOwnership);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/v1/ownership/:id', async (req, res) => {
    try {
      const ownership = ownerships.get(req.params.id);

      if (!ownership) {
        return res.status(404).json({ error: 'Ownership not found' });
      }

      ownership.status = 'deleted';
      ownership.updatedAt = new Date().toISOString();
      ownerships.set(ownership.id, ownership);
      logAudit('ownership_deleted', ownership);

      res.json({ message: 'Ownership removed', id: ownership.id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // CONSENT MANAGEMENT
  app.post('/api/v1/consents', async (req, res) => {
    try {
      const { subjectId, subjectType, purpose, dataCategories, legalBasis, grantedAt, expiresAt, restrictions } = req.body;

      if (!subjectId || !purpose) {
        return res.status(400).json({ error: 'subjectId and purpose are required' });
      }

      if (!['consent', 'legitimate_interest', 'legal_obligation', 'contract', 'vital_interest', 'public_task'].includes(legalBasis)) {
        return res.status(400).json({ error: 'Invalid legalBasis' });
      }

      const existing = [...consents.values()].find(
        c => c.subjectId === subjectId && c.purpose === purpose && c.status === 'active'
      );

      if (existing) {
        return res.status(409).json({ error: 'Active consent already exists for this purpose' });
      }

      const consent = {
        id: createId('con'),
        subjectId,
        subjectType: subjectType || 'user',
        purpose,
        dataCategories: dataCategories || [],
        legalBasis: legalBasis || 'consent',
        status: 'active',
        grantedAt: grantedAt || new Date().toISOString(),
        expiresAt: expiresAt || null,
        restrictions: restrictions || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      consents.set(consent.id, consent);
      logAudit('consent_granted', consent);

      res.status(201).json(consent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/consents/:consentId', async (req, res) => {
    try {
      const consent = consents.get(req.params.consentId);

      if (!consent) {
        return res.status(404).json({ error: 'Consent not found' });
      }

      res.json(consent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/consents/subject/:subjectId', async (req, res) => {
    try {
      const result = [...consents.values()].filter(
        c => c.subjectId === req.params.subjectId
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/consents/:consentId/withdraw', async (req, res) => {
    try {
      const consent = consents.get(req.params.consentId);

      if (!consent) {
        return res.status(404).json({ error: 'Consent not found' });
      }

      consent.status = 'withdrawn';
      consent.withdrawnAt = new Date().toISOString();
      consent.withdrawalMethod = req.body?.method || 'api';
      consents.set(consent.id, consent);
      logAudit('consent_withdrawn', consent);

      res.json(consent);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/consents/check', async (req, res) => {
    try {
      const { subjectId, purpose, dataCategories } = req.body;

      if (!subjectId || !purpose) {
        return res.status(400).json({ error: 'subjectId and purpose are required' });
      }

      const consent = [...consents.values()].find(
        c => c.subjectId === subjectId && c.purpose === purpose && c.status === 'active'
      );

      if (!consent) {
        return res.json({ valid: false, reason: 'No active consent found' });
      }

      if (consent.expiresAt && new Date(consent.expiresAt) < new Date()) {
        return res.json({ valid: false, reason: 'Consent expired', consent });
      }

      const now = new Date();
      const grantedAt = new Date(consent.grantedAt);
      const daysSinceGrant = Math.floor((now - grantedAt) / (1000 * 60 * 60 * 24));

      if (daysSinceGrant > 365) {
        return res.json({ valid: false, reason: 'Consent older than 365 days', consent });
      }

      if (dataCategories && dataCategories.length > 0) {
        const hasOverlap = dataCategories.some(dc => consent.dataCategories.includes(dc));
        if (!hasOverlap) {
          return res.json({ valid: false, reason: 'Data categories not covered', consent });
        }
      }

      res.json({ valid: true, consent });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // RETENTION POLICIES
  app.post('/api/v1/retention-policies', async (req, res) => {
    try {
      const { name, description, dataCategory, retentionPeriod, storageType, autoDelete, conditions } = req.body;

      if (!name || !dataCategory || !retentionPeriod) {
        return res.status(400).json({ error: 'name, dataCategory, and retentionPeriod are required' });
      }

      const policy = {
        id: createId('ret'),
        name,
        description: description || '',
        dataCategory,
        retentionPeriod,
        storageType: storageType || 'standard',
        autoDelete: autoDelete !== false,
        conditions: conditions || {},
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      retentionPolicies.set(policy.id, policy);
      logAudit('retention_policy_created', policy);

      res.status(201).json(policy);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/retention-policies/:policyId', async (req, res) => {
    try {
      const policy = retentionPolicies.get(req.params.policyId);

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      res.json(policy);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/retention-policies', async (req, res) => {
    try {
      const { dataCategory, status } = req.query;
      let result = [...retentionPolicies.values()];

      if (dataCategory) {
        result = result.filter(p => p.dataCategory === dataCategory);
      }
      if (status) {
        result = result.filter(p => p.status === status);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/retention-policies/:policyId/preview', async (req, res) => {
    try {
      const policy = retentionPolicies.get(req.params.policyId);

      if (!policy) {
        return res.status(404).json({ error: 'Policy not found' });
      }

      const { dataIds } = req.body;

      // Simulate preview based on retention period
      const previewResults = dataIds ? dataIds.map(id => ({
        dataId: id,
        shouldDelete: Math.random() > 0.7,
        reason: 'Retention period exceeded',
      })) : [];

      res.json({
        policy: policy.name,
        totalItems: dataIds?.length || 0,
        itemsToDelete: previewResults.filter(r => r.shouldDelete).length,
        previewResults,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // DELETION REQUESTS
  app.post('/api/v1/deletion-requests', async (req, res) => {
    try {
      const { subjectId, subjectType, requestType, scope, reason, verifierId } = req.body;

      if (!subjectId || !requestType) {
        return res.status(400).json({ error: 'subjectId and requestType are required' });
      }

      const existing = [...deletionRequests.values()].find(
        r => r.subjectId === subjectId && r.status === 'pending'
      );

      if (existing) {
        return res.status(409).json({ error: 'Pending deletion request already exists' });
      }

      const request = {
        id: createId('del'),
        subjectId,
        subjectType: subjectType || 'user',
        requestType,
        scope: scope || 'full',
        status: 'pending',
        reason: reason || '',
        verificationRequired: true,
        verifiedAt: null,
        verifiedBy: null,
        completedAt: null,
        dataDeleted: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      deletionRequests.set(request.id, request);
      logAudit('deletion_request_created', request);

      res.status(201).json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/deletion-requests/:requestId', async (req, res) => {
    try {
      const request = deletionRequests.get(req.params.requestId);

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      res.json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/deletion-requests/:requestId/verify', async (req, res) => {
    try {
      const request = deletionRequests.get(req.params.requestId);

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Can only verify pending requests' });
      }

      request.verificationRequired = false;
      request.verifiedAt = new Date().toISOString();
      request.verifiedBy = req.body?.verifierId || 'system';
      request.status = 'verified';
      deletionRequests.set(request.id, request);
      logAudit('deletion_request_verified', request);

      res.json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/deletion-requests/:requestId/execute', async (req, res) => {
    try {
      const request = deletionRequests.get(req.params.requestId);

      if (!request) {
        return res.status(404).json({ error: 'Request not found' });
      }

      if (request.status === 'completed') {
        return res.status(400).json({ error: 'Request already completed' });
      }

      // Simulate data deletion
      const dataDeleted = ['personal_data', 'preferences', 'history'];

      request.status = 'completed';
      request.completedAt = new Date().toISOString();
      request.dataDeleted = dataDeleted;
      deletionRequests.set(request.id, request);
      logAudit('deletion_request_completed', request);

      res.json(request);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // EXPORT JOBS
  app.post('/api/v1/export-jobs', async (req, res) => {
    try {
      const { subjectId, subjectType, dataCategories, format, includeMetadata } = req.body;

      if (!subjectId) {
        return res.status(400).json({ error: 'subjectId is required' });
      }

      const job = {
        id: createId('exp'),
        subjectId,
        subjectType: subjectType || 'user',
        dataCategories: dataCategories || ['all'],
        format: format || 'json',
        includeMetadata: includeMetadata !== false,
        status: 'pending',
        progress: 0,
        downloadUrl: null,
        expiresAt: null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      };

      exportJobs.set(job.id, job);
      logAudit('export_job_created', job);

      res.status(201).json(job);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/export-jobs/:jobId', async (req, res) => {
    try {
      const job = exportJobs.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }

      res.json(job);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/v1/export-jobs/:jobId/download', async (req, res) => {
    try {
      const job = exportJobs.get(req.params.jobId);

      if (!job) {
        return res.status(404).json({ error: 'Export job not found' });
      }

      if (job.status !== 'completed') {
        return res.status(400).json({ error: 'Export not ready' });
      }

      job.downloadUrl = `/exports/${job.id}.${job.format}`;
      job.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      exportJobs.set(job.id, job);

      res.json({ downloadUrl: job.downloadUrl, expiresAt: job.expiresAt });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // PROCESSING RECORDS
  app.post('/api/v1/processing-records', async (req, res) => {
    try {
      const { controllerId, processorId, purpose, dataCategories, legalBasis, recipients, transfers, retention, safeguards, description } = req.body;

      if (!controllerId || !purpose) {
        return res.status(400).json({ error: 'controllerId and purpose are required' });
      }

      const record = {
        id: createId('prc'),
        controllerId,
        processorId: processorId || null,
        purpose,
        dataCategories: dataCategories || [],
        legalBasis: legalBasis || 'consent',
        recipients: recipients || [],
        internationalTransfers: transfers || [],
        retentionPeriod: retention || null,
        safeguards: safeguards || [],
        description: description || '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      processingRecords.set(record.id, record);
      logAudit('processing_record_created', record);

      res.status(201).json(record);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/processing-records/:recordId', async (req, res) => {
    try {
      const record = processingRecords.get(req.params.recordId);

      if (!record) {
        return res.status(404).json({ error: 'Processing record not found' });
      }

      res.json(record);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/v1/processing-records', async (req, res) => {
    try {
      const { controllerId, dataCategory, legalBasis } = req.query;
      let result = [...processingRecords.values()];

      if (controllerId) {
        result = result.filter(r => r.controllerId === controllerId);
      }
      if (dataCategory) {
        result = result.filter(r => r.dataCategories.includes(dataCategory));
      }
      if (legalBasis) {
        result = result.filter(r => r.legalBasis === legalBasis);
      }

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // AUDIT LOGS
  app.get('/api/v1/audit-logs', async (req, res) => {
    try {
      const { entityId, subjectId, action, startDate, endDate, limit } = req.query;
      let result = [...auditLogs];

      if (entityId) {
        result = result.filter(l => l.entityId === entityId);
      }
      if (subjectId) {
        result = result.filter(l => l.subjectId === subjectId);
      }
      if (action) {
        result = result.filter(l => l.action === action);
      }
      if (startDate) {
        result = result.filter(l => new Date(l.timestamp) >= new Date(startDate));
      }
      if (endDate) {
        result = result.filter(l => new Date(l.timestamp) <= new Date(endDate));
      }

      result = result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      result = result.slice(0, parseInt(limit) || 100);

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // COMPLIANCE REPORTS
  app.get('/api/v1/compliance/reports', async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      const relevantLogs = auditLogs.filter(l => {
        if (startDate && new Date(l.timestamp) < new Date(startDate)) return false;
        if (endDate && new Date(l.timestamp) > new Date(endDate)) return false;
        return true;
      });

      const report = {
        period: { start: startDate, end: endDate },
        summary: {
          totalOwnerships: ownerships.size,
          activeConsents: [...consents.values()].filter(c => c.status === 'active').length,
          activePolicies: [...retentionPolicies.values()].filter(p => p.status === 'active').length,
          pendingDeletions: [...deletionRequests.values()].filter(r => r.status === 'pending').length,
          completedDeletions: [...deletionRequests.values()].filter(r => r.status === 'completed').length,
          processingRecords: processingRecords.size,
        },
        consentMetrics: {
          total: consents.size,
          byBasis: [...consents.values()].reduce((acc, c) => {
            acc[c.legalBasis] = (acc[c.legalBasis] || 0) + 1;
            return acc;
          }, {}),
          withdrawn: [...consents.values()].filter(c => c.status === 'withdrawn').length,
        },
        retentionMetrics: {
          total: retentionPolicies.size,
          byCategory: [...retentionPolicies.values()].reduce((acc, p) => {
            acc[p.dataCategory] = (acc[p.dataCategory] || 0) + 1;
            return acc;
          }, {}),
        },
        auditLogCount: relevantLogs.length,
        generatedAt: new Date().toISOString(),
      };

      res.json(report);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return { app, ownerships, consents, retentionPolicies, deletionRequests, exportJobs, processingRecords, auditLogs };
}

describe('Memory Governance Service', () => {
  describe('Ownership Management', () => {
    it('should create ownership for entity', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/ownership')
        .send({
          entityId: 'entity-001',
          entityType: 'memory',
          ownerId: 'owner-001',
          ownerType: 'user',
          ownershipType: 'full',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.entityId).toBe('entity-001');
      expect(res.body.ownerId).toBe('owner-001');
      expect(res.body.status).toBe('active');
    });

    it('should reject duplicate ownership', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      const res = await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-002' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already has an active owner');
    });

    it('should require entityId and ownerId', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('ownerId are required');
    });

    it('should get ownership by entity ID', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      const res = await request(app)
        .get('/api/v1/ownership/entity-001');

      expect(res.status).toBe(200);
      expect(res.body.entityId).toBe('entity-001');
    });

    it('should return 404 for non-existent ownership', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .get('/api/v1/ownership/non-existent');

      expect(res.status).toBe(404);
    });

    it('should list ownerships by owner', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-002', ownerId: 'owner-001' });

      const res = await request(app)
        .get('/api/v1/ownerships/owner/owner-001');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should transfer ownership', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      const res = await request(app)
        .post(`/api/v1/ownership/${createRes.body.id}/transfer`)
        .send({ newOwnerId: 'owner-002' });

      expect(res.status).toBe(200);
      expect(res.body.ownerId).toBe('owner-002');
      expect(res.body.previousOwnerId).toBe('owner-001');
    });

    it('should delete ownership', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      const res = await request(app)
        .delete(`/api/v1/ownership/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Ownership removed');
      expect(res.body.id).toBe(createRes.body.id);
    });
  });

  describe('Consent Management', () => {
    it('should create consent', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/consents')
        .send({
          subjectId: 'user-001',
          purpose: 'marketing',
          legalBasis: 'consent',
          dataCategories: ['email', 'preferences'],
        });

      expect(res.status).toBe(201);
      expect(res.body.subjectId).toBe('user-001');
      expect(res.body.purpose).toBe('marketing');
      expect(res.body.status).toBe('active');
    });

    it('should reject invalid legalBasis', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/consents')
        .send({
          subjectId: 'user-001',
          purpose: 'marketing',
          legalBasis: 'invalid_basis',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid legalBasis');
    });

    it('should get consent by ID', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'marketing', legalBasis: 'consent' });

      const res = await request(app)
        .get(`/api/v1/consents/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should list consents by subject', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'marketing', legalBasis: 'consent' });

      await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'analytics', legalBasis: 'legitimate_interest' });

      const res = await request(app)
        .get('/api/v1/consents/subject/user-001');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(2);
    });

    it('should withdraw consent', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'marketing', legalBasis: 'consent' });

      const res = await request(app)
        .post(`/api/v1/consents/${createRes.body.id}/withdraw`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('withdrawn');
      expect(res.body).toHaveProperty('withdrawnAt');
    });

    it('should check consent validity - valid', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/consents')
        .send({
          subjectId: 'user-001',
          purpose: 'marketing',
          legalBasis: 'consent',
          dataCategories: ['email'],
        });

      const res = await request(app)
        .post('/api/v1/consents/check')
        .send({ subjectId: 'user-001', purpose: 'marketing' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });

    it('should check consent validity - no consent', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/consents/check')
        .send({ subjectId: 'user-001', purpose: 'marketing' });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(false);
      expect(res.body.reason).toContain('No active consent');
    });

    it('should check consent with data categories', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/consents')
        .send({
          subjectId: 'user-001',
          purpose: 'marketing',
          legalBasis: 'consent',
          dataCategories: ['email', 'phone'],
        });

      const res = await request(app)
        .post('/api/v1/consents/check')
        .send({
          subjectId: 'user-001',
          purpose: 'marketing',
          dataCategories: ['email'],
        });

      expect(res.status).toBe(200);
      expect(res.body.valid).toBe(true);
    });
  });

  describe('Retention Policies', () => {
    it('should create retention policy', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/retention-policies')
        .send({
          name: 'Customer Data Policy',
          dataCategory: 'customer_data',
          retentionPeriod: { days: 365 },
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Customer Data Policy');
      expect(res.body.autoDelete).toBe(true);
    });

    it('should get retention policy', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/retention-policies')
        .send({ name: 'Policy 1', dataCategory: 'test', retentionPeriod: { days: 30 } });

      const res = await request(app)
        .get(`/api/v1/retention-policies/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Policy 1');
    });

    it('should list retention policies with filters', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/retention-policies')
        .send({ name: 'Policy A', dataCategory: 'customer', retentionPeriod: { days: 30 } });

      await request(app)
        .post('/api/v1/retention-policies')
        .send({ name: 'Policy B', dataCategory: 'logs', retentionPeriod: { days: 90 } });

      const res = await request(app)
        .get('/api/v1/retention-policies?dataCategory=customer');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].dataCategory).toBe('customer');
    });

    it('should preview deletion impact', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/retention-policies')
        .send({ name: 'Policy 1', dataCategory: 'test', retentionPeriod: { days: 30 } });

      const res = await request(app)
        .post(`/api/v1/retention-policies/${createRes.body.id}/preview`)
        .send({ dataIds: ['id1', 'id2', 'id3'] });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalItems', 3);
      expect(res.body).toHaveProperty('itemsToDelete');
    });
  });

  describe('Deletion Requests', () => {
    it('should create deletion request', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/deletion-requests')
        .send({
          subjectId: 'user-001',
          requestType: 'gdpr_right_to_erasure',
          scope: 'full',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.verificationRequired).toBe(true);
    });

    it('should get deletion request', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/deletion-requests')
        .send({ subjectId: 'user-001', requestType: 'gdpr' });

      const res = await request(app)
        .get(`/api/v1/deletion-requests/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should verify deletion request', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/deletion-requests')
        .send({ subjectId: 'user-001', requestType: 'gdpr' });

      const res = await request(app)
        .post(`/api/v1/deletion-requests/${createRes.body.id}/verify`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('verified');
      expect(res.body).toHaveProperty('verifiedAt');
    });

    it('should execute deletion request', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/deletion-requests')
        .send({ subjectId: 'user-001', requestType: 'gdpr' });

      await request(app)
        .post(`/api/v1/deletion-requests/${createRes.body.id}/verify`);

      const res = await request(app)
        .post(`/api/v1/deletion-requests/${createRes.body.id}/execute`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('completed');
      expect(res.body).toHaveProperty('completedAt');
      expect(res.body.dataDeleted.length).toBeGreaterThan(0);
    });

    it('should reject duplicate pending deletion request', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/deletion-requests')
        .send({ subjectId: 'user-001', requestType: 'gdpr' });

      const res = await request(app)
        .post('/api/v1/deletion-requests')
        .send({ subjectId: 'user-001', requestType: 'gdpr' });

      expect(res.status).toBe(409);
    });
  });

  describe('Export Jobs', () => {
    it('should create export job', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/export-jobs')
        .send({
          subjectId: 'user-001',
          dataCategories: ['profile', 'preferences'],
          format: 'json',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
      expect(res.body.format).toBe('json');
    });

    it('should get export job', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/export-jobs')
        .send({ subjectId: 'user-001' });

      const res = await request(app)
        .get(`/api/v1/export-jobs/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should generate download URL for completed export', async () => {
      const { app, exportJobs } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/export-jobs')
        .send({ subjectId: 'user-001', format: 'json' });

      // Simulate completion
      const job = exportJobs.get(createRes.body.id);
      job.status = 'completed';
      exportJobs.set(job.id, job);

      const res = await request(app)
        .post(`/api/v1/export-jobs/${createRes.body.id}/download`);

      expect(res.status).toBe(200);
      expect(res.body.downloadUrl).toContain('.json');
      expect(res.body).toHaveProperty('expiresAt');
    });

    it('should reject download for non-completed export', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/export-jobs')
        .send({ subjectId: 'user-001' });

      const res = await request(app)
        .post(`/api/v1/export-jobs/${createRes.body.id}/download`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not ready');
    });
  });

  describe('Processing Records', () => {
    it('should create processing record', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .post('/api/v1/processing-records')
        .send({
          controllerId: 'company-001',
          purpose: 'customer_service',
          dataCategories: ['name', 'email', 'chat_history'],
          legalBasis: 'contract',
        });

      expect(res.status).toBe(201);
      expect(res.body.purpose).toBe('customer_service');
      expect(res.body.status).toBe('active');
    });

    it('should get processing record', async () => {
      const { app } = createTestApp();

      const createRes = await request(app)
        .post('/api/v1/processing-records')
        .send({ controllerId: 'company-001', purpose: 'test' });

      const res = await request(app)
        .get(`/api/v1/processing-records/${createRes.body.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createRes.body.id);
    });

    it('should list processing records with filters', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/processing-records')
        .send({ controllerId: 'company-001', purpose: 'marketing', dataCategories: ['email'], legalBasis: 'consent' });

      await request(app)
        .post('/api/v1/processing-records')
        .send({ controllerId: 'company-001', purpose: 'analytics', dataCategories: ['behavior'], legalBasis: 'legitimate_interest' });

      const res = await request(app)
        .get('/api/v1/processing-records?legalBasis=consent');

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].legalBasis).toBe('consent');
    });
  });

  describe('Audit Logs', () => {
    it('should retrieve audit logs', async () => {
      const { app } = createTestApp();

      // Create some data to generate logs
      await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'marketing', legalBasis: 'consent' });

      const res = await request(app)
        .get('/api/v1/audit-logs?limit=50');

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter audit logs by action', async () => {
      const { app } = createTestApp();

      await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      const res = await request(app)
        .get('/api/v1/audit-logs?action=ownership_created');

      expect(res.status).toBe(200);
      expect(res.body.every(l => l.action === 'ownership_created')).toBe(true);
    });
  });

  describe('Compliance Reports', () => {
    it('should generate compliance report', async () => {
      const { app } = createTestApp();

      // Create some test data
      await request(app)
        .post('/api/v1/ownership')
        .send({ entityId: 'entity-001', ownerId: 'owner-001' });

      await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'marketing', legalBasis: 'consent' });

      await request(app)
        .post('/api/v1/consents')
        .send({ subjectId: 'user-001', purpose: 'analytics', legalBasis: 'legitimate_interest' });

      await request(app)
        .post('/api/v1/retention-policies')
        .send({ name: 'Policy 1', dataCategory: 'customer', retentionPeriod: { days: 30 } });

      await request(app)
        .post('/api/v1/processing-records')
        .send({ controllerId: 'company-001', purpose: 'test' });

      const res = await request(app)
        .get('/api/v1/compliance/reports');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body.summary.totalOwnerships).toBe(1);
      expect(res.body.summary.activeConsents).toBe(2);
      expect(res.body.summary.processingRecords).toBe(1);
      expect(res.body).toHaveProperty('consentMetrics');
      expect(res.body).toHaveProperty('generatedAt');
    });

    it('should filter compliance report by date range', async () => {
      const { app } = createTestApp();

      const res = await request(app)
        .get('/api/v1/compliance/reports?startDate=2024-01-01&endDate=2024-12-31');

      expect(res.status).toBe(200);
      expect(res.body.period.start).toBe('2024-01-01');
      expect(res.body.period.end).toBe('2024-12-31');
    });
  });
});
