/**
 * Memory Federation Service
 * Cross-company memory sharing with privacy boundaries
 *
 * Core concept: "Company A ↔ Company B ↔ Shared memories ↔ Permission boundaries"
 * This is what makes HOJAI unique - enabling memory sharing between Nexhas.
 */

import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// In-memory stores
const federations = new Map();    // federationId -> { id, name, memberIds, sharedPolicies, createdAt }
const members = new Map();          // memberId -> { id, type, name, memoryEndpoint, credentials, status }
const sharedMemories = new Map();  // memoryId -> { id, sourceMemberId, content, permissions, shareHistory }
const permissionBoundaries = new Map(); // boundaryId -> { id, ownerId, rules, exceptions }
const syncJobs = new Map();       // jobId -> { id, type, sourceId, targetId, status, progress, createdAt }
const privacyPolicies = new Map(); // policyId -> { id, name, rules, scope }
const accessLogs = [];            // Access audit trail

const MAX_LOG_SIZE = 1000;

function genId(prefix = 'fed') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// ============ FEDERATIONS ============

// Create a federation
app.post('/api/federations', (req, res) => {
  const { name, memberIds, sharedPolicies } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  const federationId = genId('fed');
  const federation = {
    id: federationId,
    name,
    memberIds: memberIds || [],
    sharedPolicies: sharedPolicies || [],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  federations.set(federationId, federation);

  res.status(201).json({ id: federationId, federation });
});

// Get federation
app.get('/api/federations/:federationId', (req, res) => {
  const federation = federations.get(req.params.federationId);
  if (!federation) {
    return res.status(404).json({ error: 'Federation not found' });
  }
  res.json({ federation });
});

// List federations
app.get('/api/federations', (req, res) => {
  const { memberId, status } = req.query;
  let result = Array.from(federations.values());

  if (memberId) {
    result = result.filter(f => f.memberIds.includes(memberId));
  }
  if (status) {
    result = result.filter(f => f.status === status);
  }

  res.json({ federations: result, total: result.length });
});

// Update federation
app.patch('/api/federations/:federationId', (req, res) => {
  const federation = federations.get(req.params.federationId);
  if (!federation) {
    return res.status(404).json({ error: 'Federation not found' });
  }

  const { name, memberIds, sharedPolicies, status } = req.body;

  if (name) federation.name = name;
  if (memberIds) federation.memberIds = memberIds;
  if (sharedPolicies) federation.sharedPolicies = sharedPolicies;
  if (status) federation.status = status;
  federation.updatedAt = new Date().toISOString();

  res.json({ federation });
});

// Delete federation
app.delete('/api/federations/:federationId', (req, res) => {
  if (!federations.has(req.params.federationId)) {
    return res.status(404).json({ error: 'Federation not found' });
  }

  federations.delete(req.params.federationId);
  res.json({ message: 'Federation deleted', id: req.params.federationId });
});

// ============ MEMBERS ============

// Register a member (company/nexha)
app.post('/api/members', (req, res) => {
  const { type, name, memoryEndpoint, credentials, metadata } = req.body;

  if (!type || !name) {
    return res.status(400).json({ error: 'type and name are required' });
  }

  const memberId = genId('mem');
  const member = {
    id: memberId,
    type, // 'nexha', 'company', 'agent', 'external'
    name,
    memoryEndpoint: memoryEndpoint || null,
    credentials: credentials || {},
    status: 'active',
    metadata: metadata || {},
    federationIds: [],
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  members.set(memberId, member);

  res.status(201).json({ id: memberId, member });
});

// Get member
app.get('/api/members/:memberId', (req, res) => {
  const member = members.get(req.params.memberId);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }
  res.json({ member });
});

// List members
app.get('/api/members', (req, res) => {
  const { type, status, federationId } = req.query;
  let result = Array.from(members.values());

  if (type) result = result.filter(m => m.type === type);
  if (status) result = result.filter(m => m.status === status);
  if (federationId) {
    const fed = federations.get(federationId);
    if (fed) {
      result = result.filter(m => fed.memberIds.includes(m.id));
    }
  }

  res.json({ members: result, total: result.length });
});

// Update member
app.patch('/api/members/:memberId', (req, res) => {
  const member = members.get(req.params.memberId);
  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  const { status, memoryEndpoint, credentials, metadata } = req.body;

  if (status) member.status = status;
  if (memoryEndpoint) member.memoryEndpoint = memoryEndpoint;
  if (credentials) member.credentials = { ...member.credentials, ...credentials };
  if (metadata) member.metadata = { ...member.metadata, ...metadata };
  member.lastSeen = new Date().toISOString();

  res.json({ member });
});

// ============ SHARED MEMORIES ============

// Share a memory across federation
app.post('/api/shared-memories', (req, res) => {
  const { sourceMemberId, federationId, content, permissions, ttl } = req.body;

  if (!sourceMemberId || !federationId || !content) {
    return res.status(400).json({ error: 'sourceMemberId, federationId, and content are required' });
  }

  // Verify member and federation exist
  const source = members.get(sourceMemberId);
  if (!source) {
    return res.status(404).json({ error: 'Source member not found' });
  }

  const federation = federations.get(federationId);
  if (!federation) {
    return res.status(404).json({ error: 'Federation not found' });
  }

  if (!federation.memberIds.includes(sourceMemberId)) {
    return res.status(403).json({ error: 'Source member not in federation' });
  }

  // Check permissions
  if (!checkSharePermissions(sourceMemberId, federationId, content)) {
    return res.status(403).json({ error: 'Sharing not permitted by privacy policy' });
  }

  const memoryId = genId('smem');
  const sharedMemory = {
    id: memoryId,
    sourceMemberId,
    federationId,
    content,
    permissions: permissions || {
      allowCopy: false,
      allowModify: false,
      allowDelete: false,
      expiration: ttl ? new Date(Date.now() + ttl).toISOString() : null,
    },
    shareHistory: [{
      sharedBy: sourceMemberId,
      sharedAt: new Date().toISOString(),
      recipientCount: federation.memberIds.length - 1,
    }],
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
  };

  sharedMemories.set(memoryId, sharedMemory);

  // Log access
  logAccess(sourceMemberId, 'share', memoryId, 'success');

  res.status(201).json({ id: memoryId, sharedMemory });
});

// Get shared memory
app.get('/api/shared-memories/:memoryId', (req, res) => {
  const memory = sharedMemories.get(req.params.memoryId);
  if (!memory) {
    return res.status(404).json({ error: 'Shared memory not found' });
  }

  // Check access
  const requesterId = req.headers['x-member-id'] || req.query.requesterId;
  if (requesterId && !canAccess(requesterId, memory)) {
    logAccess(requesterId, 'read', memory.id, 'denied');
    return res.status(403).json({ error: 'Access denied' });
  }

  memory.lastAccessed = new Date().toISOString();
  logAccess(requesterId || 'anonymous', 'read', memory.id, 'success');

  res.json({ sharedMemory: memory });
});

// List shared memories
app.get('/api/shared-memories', (req, res) => {
  const { federationId, sourceMemberId, requesterId } = req.query;
  let result = Array.from(sharedMemories.values());

  if (federationId) {
    result = result.filter(m => m.federationId === federationId);
  }
  if (sourceMemberId) {
    result = result.filter(m => m.sourceMemberId === sourceMemberId);
  }

  // Filter by access permissions
  if (requesterId) {
    result = result.filter(m => canAccess(requesterId, m));
  }

  res.json({ sharedMemories: result, total: result.length });
});

// Revoke shared memory
app.delete('/api/shared-memories/:memoryId', (req, res) => {
  const memory = sharedMemories.get(req.params.memoryId);
  if (!memory) {
    return res.status(404).json({ error: 'Shared memory not found' });
  }

  const requesterId = req.headers['x-member-id'];
  if (requesterId !== memory.sourceMemberId) {
    return res.status(403).json({ error: 'Only source can revoke' });
  }

  sharedMemories.delete(req.params.memoryId);
  logAccess(requesterId, 'delete', memory.id, 'success');

  res.json({ message: 'Shared memory revoked', id: req.params.memoryId });
});

// ============ PRIVACY POLICIES ============

// Create privacy policy
app.post('/api/privacy-policies', (req, res) => {
  const { name, rules, scope, ownerId } = req.body;

  if (!name || !ownerId) {
    return res.status(400).json({ error: 'name and ownerId are required' });
  }

  const policyId = genId('pol');
  const policy = {
    id: policyId,
    name,
    ownerId,
    rules: rules || [],
    scope: scope || { type: 'all' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  privacyPolicies.set(policyId, policy);

  res.status(201).json({ id: policyId, policy });
});

// Get privacy policy
app.get('/api/privacy-policies/:policyId', (req, res) => {
  const policy = privacyPolicies.get(req.params.policyId);
  if (!policy) {
    return res.status(404).json({ error: 'Policy not found' });
  }
  res.json({ policy });
});

// List privacy policies
app.get('/api/privacy-policies', (req, res) => {
  const { ownerId } = req.query;
  let result = Array.from(privacyPolicies.values());

  if (ownerId) {
    result = result.filter(p => p.ownerId === ownerId);
  }

  res.json({ policies: result, total: result.length });
});

// ============ SYNC JOBS ============

// Create sync job
app.post('/api/sync', (req, res) => {
  const { type, sourceId, targetId, memoryIds, direction } = req.body;

  if (!type || !sourceId || !targetId) {
    return res.status(400).json({ error: 'type, sourceId, and targetId are required' });
  }

  const jobId = genId('sync');
  const job = {
    id: jobId,
    type, // 'pull', 'push', 'bidirectional'
    sourceId,
    targetId,
    memoryIds: memoryIds || [],
    direction: direction || 'bidirectional',
    status: 'pending',
    progress: 0,
    synced: 0,
    failed: 0,
    errors: [],
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };

  syncJobs.set(jobId, job);

  res.status(201).json({ id: jobId, job });
});

// Get sync job
app.get('/api/sync/:jobId', (req, res) => {
  const job = syncJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Sync job not found' });
  }
  res.json({ job });
});

// Update sync job (progress)
app.patch('/api/sync/:jobId', (req, res) => {
  const job = syncJobs.get(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Sync job not found' });
  }

  const { status, progress, synced, failed, errors } = req.body;

  if (status) job.status = status;
  if (progress !== undefined) job.progress = progress;
  if (synced !== undefined) job.synced = synced;
  if (failed !== undefined) job.failed = failed;
  if (errors) job.errors = errors;

  if (status === 'running' && !job.startedAt) {
    job.startedAt = new Date().toISOString();
  }
  if (status === 'completed' || status === 'failed') {
    job.completedAt = new Date().toISOString();
    job.progress = 100;
  }

  res.json({ job });
});

// List sync jobs
app.get('/api/sync', (req, res) => {
  const { status, sourceId, targetId } = req.query;
  let result = Array.from(syncJobs.values());

  if (status) result = result.filter(j => j.status === status);
  if (sourceId) result = result.filter(j => j.sourceId === sourceId);
  if (targetId) result = result.filter(j => j.targetId === targetId);

  res.json({ jobs: result, total: result.length });
});

// ============ ACCESS LOGS ============

app.get('/api/access-logs', (req, res) => {
  const { memberId, action, since, limit } = req.query;
  let result = [...accessLogs];

  if (memberId) result = result.filter(l => l.memberId === memberId);
  if (action) result = result.filter(l => l.action === action);
  if (since) result = result.filter(l => new Date(l.timestamp) >= new Date(since));
  if (limit) result = result.slice(-parseInt(limit));

  res.json({ logs: result, total: result.length });
});

// ============ QUERY (Cross-federation search) ============

app.post('/api/query', (req, res) => {
  const { query, federationId, requesterId, filters } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query is required' });
  }

  // Search across shared memories
  let results = Array.from(sharedMemories.values());

  if (federationId) {
    results = results.filter(m => m.federationId === federationId);
  }

  // Filter by access
  if (requesterId) {
    results = results.filter(m => canAccess(requesterId, m));
  }

  // Text search
  const lowerQuery = query.toLowerCase();
  results = results
    .map(m => {
      let score = 0;
      if (typeof m.content === 'string') {
        if (m.content.toLowerCase().includes(lowerQuery)) score += 0.8;
      }
      if (JSON.stringify(m.permissions).toLowerCase().includes(lowerQuery)) score += 0.2;
      return { ...m, score };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score);

  logAccess(requesterId || 'anonymous', 'query', null, 'success');

  res.json({ results, total: results.length, query });
});

// ============ STATS ============

app.get('/api/stats', (req, res) => {
  res.json({
    totalFederations: federations.size,
    totalMembers: members.size,
    totalSharedMemories: sharedMemories.size,
    totalSyncJobs: syncJobs.size,
    totalPrivacyPolicies: privacyPolicies.size,
    membersByType: Array.from(members.values()).reduce((acc, m) => {
      acc[m.type] = (acc[m.type] || 0) + 1;
      return acc;
    }, {}),
    syncJobsByStatus: Array.from(syncJobs.values()).reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {}),
    accessLogsCount: accessLogs.length,
  });
});

// ============ HEALTH ============

app.get('/health', (req, res) => {
  res.json({
    service: 'memory-federation',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============ HELPER FUNCTIONS ============

function checkSharePermissions(memberId, federationId, content) {
  // Check if member has permission to share
  const member = members.get(memberId);
  const federation = federations.get(federationId);

  if (!member || !federation) return false;

  // Check if content passes privacy rules
  const policy = Array.from(privacyPolicies.values()).find(p => p.ownerId === memberId);
  if (policy) {
    for (const rule of policy.rules) {
      if (rule.type === 'block_sensitive' && isSensitiveContent(content)) {
        return false;
      }
    }
  }

  return true;
}

function isSensitiveContent(content) {
  const sensitiveKeywords = ['secret', 'password', 'confidential', 'private', 'classified'];
  const lower = JSON.stringify(content).toLowerCase();
  return sensitiveKeywords.some(k => lower.includes(k));
}

function canAccess(requesterId, memory) {
  // Check if requester is in the federation
  const federation = federations.get(memory.federationId);
  if (!federation) return false;

  if (!federation.memberIds.includes(requesterId)) return false;

  // Check expiration
  if (memory.permissions.expiration) {
    if (new Date(memory.permissions.expiration) < new Date()) {
      return false;
    }
  }

  return true;
}

function logAccess(memberId, action, resourceId, status) {
  const entry = {
    id: genId('log'),
    memberId,
    action,
    resourceId,
    status,
    timestamp: new Date().toISOString(),
  };

  accessLogs.push(entry);
  if (accessLogs.length > MAX_LOG_SIZE) {
    accessLogs.shift();
  }
}

const PORT = process.env.PORT || 4803;
app.listen(PORT, () => {
  console.log(`Memory Federation running on port ${PORT}`);
});

export default app;