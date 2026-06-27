/**
 * Memory Federation Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const federations = new Map(), members = new Map(), sharedMemories = new Map();
  const privacyPolicies = new Map(), syncJobs = new Map();
  const accessLogs = [];
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  // Federations
  app.post('/api/federations', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });
    const id = genId('fed');
    federations.set(id, { id, name, memberIds: [], status: 'active', createdAt: new Date().toISOString() });
    res.status(201).json({ id, federation: federations.get(id) });
  });
  app.get('/api/federations', (req, res) => {
    let result = Array.from(federations.values());
    if (req.query.memberId) result = result.filter(f => f.memberIds.includes(req.query.memberId));
    res.json({ federations: result, total: result.length });
  });
  app.get('/api/federations/:id', (req, res) => {
    const f = federations.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Federation not found' });
    res.json({ federation: f });
  });
  app.patch('/api/federations/:id', (req, res) => {
    const f = federations.get(req.params.id);
    if (!f) return res.status(404).json({ error: 'Federation not found' });
    Object.assign(f, req.body);
    res.json({ federation: f });
  });
  app.delete('/api/federations/:id', (req, res) => {
    if (!federations.has(req.params.id)) return res.status(404).json({ error: 'Federation not found' });
    federations.delete(req.params.id);
    res.json({ message: 'Deleted' });
  });

  // Members
  app.post('/api/members', (req, res) => {
    const { type, name } = req.body;
    if (!type || !name) return res.status(400).json({ error: 'type and name required' });
    const id = genId('mem');
    members.set(id, { id, type, name, status: 'active', federationIds: [], createdAt: new Date().toISOString() });
    res.status(201).json({ id, member: members.get(id) });
  });
  app.get('/api/members', (req, res) => {
    let result = Array.from(members.values());
    if (req.query.type) result = result.filter(m => m.type === req.query.type);
    res.json({ members: result, total: result.length });
  });
  app.get('/api/members/:id', (req, res) => {
    const m = members.get(req.params.id);
    if (!m) return res.status(404).json({ error: 'Member not found' });
    res.json({ member: m });
  });
  app.patch('/api/members/:id', (req, res) => {
    const m = members.get(req.params.id);
    if (!m) return res.status(404).json({ error: 'Member not found' });
    Object.assign(m, req.body);
    res.json({ member: m });
  });

  // Shared Memories
  app.post('/api/shared-memories', (req, res) => {
    const { sourceMemberId, federationId, content } = req.body;
    if (!sourceMemberId || !federationId || !content) return res.status(400).json({ error: 'sourceMemberId, federationId, content required' });
    const fed = federations.get(federationId);
    if (!fed) return res.status(404).json({ error: 'Federation not found' });
    const id = genId('smem');
    sharedMemories.set(id, { id, sourceMemberId, federationId, content, permissions: {}, shareHistory: [], createdAt: new Date().toISOString() });
    res.status(201).json({ id, sharedMemory: sharedMemories.get(id) });
  });
  app.get('/api/shared-memories', (req, res) => {
    let result = Array.from(sharedMemories.values());
    if (req.query.federationId) result = result.filter(m => m.federationId === req.query.federationId);
    res.json({ sharedMemories: result, total: result.length });
  });
  app.get('/api/shared-memories/:id', (req, res) => {
    const m = sharedMemories.get(req.params.id);
    if (!m) return res.status(404).json({ error: 'Shared memory not found' });
    res.json({ sharedMemory: m });
  });
  app.delete('/api/shared-memories/:id', (req, res) => {
    if (!sharedMemories.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
    sharedMemories.delete(req.params.id);
    res.json({ message: 'Revoked' });
  });

  // Privacy Policies
  app.post('/api/privacy-policies', (req, res) => {
    const { name, ownerId } = req.body;
    if (!name || !ownerId) return res.status(400).json({ error: 'name and ownerId required' });
    const id = genId('pol');
    privacyPolicies.set(id, { id, name, ownerId, rules: [], createdAt: new Date().toISOString() });
    res.status(201).json({ id, policy: privacyPolicies.get(id) });
  });
  app.get('/api/privacy-policies', (req, res) => res.json({ policies: Array.from(privacyPolicies.values()), total: privacyPolicies.size }));

  // Sync Jobs
  app.post('/api/sync', (req, res) => {
    const { type, sourceId, targetId } = req.body;
    if (!type || !sourceId || !targetId) return res.status(400).json({ error: 'type, sourceId, targetId required' });
    const id = genId('sync');
    syncJobs.set(id, { id, type, sourceId, targetId, status: 'pending', progress: 0, createdAt: new Date().toISOString() });
    res.status(201).json({ id, job: syncJobs.get(id) });
  });
  app.get('/api/sync', (req, res) => {
    let result = Array.from(syncJobs.values());
    if (req.query.status) result = result.filter(j => j.status === req.query.status);
    res.json({ jobs: result, total: result.length });
  });
  app.patch('/api/sync/:id', (req, res) => {
    const j = syncJobs.get(req.params.id);
    if (!j) return res.status(404).json({ error: 'Not found' });
    Object.assign(j, req.body);
    res.json({ job: j });
  });

  // Query
  app.post('/api/query', (req, res) => {
    const { query, federationId } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    let results = Array.from(sharedMemories.values());
    if (federationId) results = results.filter(m => m.federationId === federationId);
    results = results.map(m => ({ ...m, score: m.content.toLowerCase().includes(query.toLowerCase()) ? 0.8 : 0 })).filter(m => m.score > 0);
    res.json({ results, total: results.length });
  });

  // Access Logs
  app.get('/api/access-logs', (req, res) => res.json({ logs: accessLogs.slice(-10), total: accessLogs.length }));

  // Stats
  app.get('/api/stats', (req, res) => res.json({
    totalFederations: federations.size, totalMembers: members.size, totalSharedMemories: sharedMemories.size,
    totalSyncJobs: syncJobs.size, totalPrivacyPolicies: privacyPolicies.size
  }));

  // Health
  app.get('/health', (req, res) => res.json({ service: 'memory-federation', status: 'healthy' }));

  return app;
}

describe('Memory Federation', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should create federation', async () => {
    const res = await request(app).post('/api/federations').send({ name: 'Test Federation' });
    expect(res.status).toBe(201);
    expect(res.body.federation.name).toBe('Test Federation');
    expect(res.body.federation.status).toBe('active');
  });

  it('should add members to federation', async () => {
    const { body: { id: fedId } } = await request(app).post('/api/federations').send({ name: 'Fed1' });
    const { body: { id: memId } } = await request(app).post('/api/members').send({ type: 'nexha', name: 'Nexha A' });
    const res = await request(app).patch(`/api/federations/${fedId}`).send({ memberIds: [memId] });
    expect(res.body.federation.memberIds).toContain(memId);
  });

  it('should register member', async () => {
    const res = await request(app).post('/api/members').send({ type: 'nexha', name: 'Nexha Corp' });
    expect(res.status).toBe(201);
    expect(res.body.member.type).toBe('nexha');
  });

  it('should list members by type', async () => {
    await request(app).post('/api/members').send({ type: 'nexha', name: 'N1' });
    await request(app).post('/api/members').send({ type: 'company', name: 'C1' });
    const res = await request(app).get('/api/members?type=nexha');
    expect(res.body.total).toBe(1);
  });

  it('should update member status', async () => {
    const { body: { id } } = await request(app).post('/api/members').send({ type: 'n', name: 'M' });
    const res = await request(app).patch(`/api/members/${id}`).send({ status: 'inactive' });
    expect(res.body.member.status).toBe('inactive');
  });

  it('should share memory across federation', async () => {
    const { body: { id: fedId } } = await request(app).post('/api/federations').send({ name: 'Fed' });
    const { body: { id: memId } } = await request(app).post('/api/members').send({ type: 'n', name: 'M' });
    await request(app).patch(`/api/federations/${fedId}`).send({ memberIds: [memId] });
    const res = await request(app).post('/api/shared-memories').send({ sourceMemberId: memId, federationId: fedId, content: { key: 'shared knowledge' } });
    expect(res.status).toBe(201);
    expect(res.body.sharedMemory.content.key).toBe('shared knowledge');
  });

  it('should list shared memories', async () => {
    const { body: { id: fedId } } = await request(app).post('/api/federations').send({ name: 'F' });
    const { body: { id: memId } } = await request(app).post('/api/members').send({ type: 'n', name: 'M' });
    await request(app).patch(`/api/federations/${fedId}`).send({ memberIds: [memId] });
    await request(app).post('/api/shared-memories').send({ sourceMemberId: memId, federationId: fedId, content: 'test1' });
    await request(app).post('/api/shared-memories').send({ sourceMemberId: memId, federationId: fedId, content: 'test2' });
    const res = await request(app).get(`/api/shared-memories?federationId=${fedId}`);
    expect(res.body.total).toBe(2);
  });

  it('should revoke shared memory', async () => {
    const { body: { id: fedId } } = await request(app).post('/api/federations').send({ name: 'F' });
    const { body: { id: memId } } = await request(app).post('/api/members').send({ type: 'n', name: 'M' });
    await request(app).patch(`/api/federations/${fedId}`).send({ memberIds: [memId] });
    const { body: { id } } = await request(app).post('/api/shared-memories').send({ sourceMemberId: memId, federationId: fedId, content: 'test' });
    const res = await request(app).delete(`/api/shared-memories/${id}`);
    expect(res.body.message).toBe('Revoked');
  });

  it('should create privacy policy', async () => {
    const { body: { id: ownerId } } = await request(app).post('/api/members').send({ type: 'n', name: 'O' });
    const res = await request(app).post('/api/privacy-policies').send({ name: 'Strict Policy', ownerId });
    expect(res.status).toBe(201);
    expect(res.body.policy.name).toBe('Strict Policy');
  });

  it('should create sync job', async () => {
    const { body: { id: srcId } } = await request(app).post('/api/members').send({ type: 'n', name: 'S' });
    const { body: { id: tgtId } } = await request(app).post('/api/members').send({ type: 'n', name: 'T' });
    const res = await request(app).post('/api/sync').send({ type: 'bidirectional', sourceId: srcId, targetId: tgtId });
    expect(res.status).toBe(201);
    expect(res.body.job.status).toBe('pending');
  });

  it('should update sync job progress', async () => {
    const { body: { id: s } } = await request(app).post('/api/members').send({ type: 'n', name: 'S' });
    const { body: { id: t } } = await request(app).post('/api/members').send({ type: 'n', name: 'T' });
    const { body: { id } } = await request(app).post('/api/sync').send({ type: 'push', sourceId: s, targetId: t });
    const res = await request(app).patch(`/api/sync/${id}`).send({ status: 'completed', progress: 100 });
    expect(res.body.job.progress).toBe(100);
    expect(res.body.job.status).toBe('completed');
  });

  it('should query shared memories', async () => {
    const { body: { id: fedId } } = await request(app).post('/api/federations').send({ name: 'F' });
    const { body: { id: memId } } = await request(app).post('/api/members').send({ type: 'n', name: 'M' });
    await request(app).patch(`/api/federations/${fedId}`).send({ memberIds: [memId] });
    await request(app).post('/api/shared-memories').send({ sourceMemberId: memId, federationId: fedId, content: 'pricing information Q4' });
    const res = await request(app).post('/api/query').send({ query: 'pricing', federationId: fedId });
    expect(res.body.total).toBe(1);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.totalFederations).toBeDefined();
    expect(res.body.totalMembers).toBeDefined();
    expect(res.body.totalSharedMemories).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});