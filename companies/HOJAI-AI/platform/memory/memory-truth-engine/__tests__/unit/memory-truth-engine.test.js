/**
 * Memory Truth Engine Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createApp() {
  const app = express(); app.use(express.json());
  const statements = new Map(), evidenceChains = new Map(), contradictions = new Map();
  const sourceProfiles = new Map(), truthScores = new Map();
  function genId(p) { return `${p}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

  // Sources
  app.post('/api/sources', (req, res) => {
    const { sourceId, type, role, baseCredibility } = req.body;
    if (!sourceId || !type) return res.status(400).json({ error: 'sourceId and type are required' });
    sourceProfiles.set(sourceId, { id: sourceId, type, role: role || 'contributor', baseCredibility: baseCredibility || 0.7, totalStatements: 0, avgConfidence: 0, createdAt: new Date().toISOString() });
    res.status(201).json({ id: sourceId, profile: sourceProfiles.get(sourceId) });
  });
  app.get('/api/sources/:sourceId', (req, res) => {
    const p = sourceProfiles.get(req.params.sourceId);
    if (!p) return res.status(404).json({ error: 'Source not found' });
    res.json({ profile: p });
  });
  app.patch('/api/sources/:sourceId', (req, res) => {
    const p = sourceProfiles.get(req.params.sourceId);
    if (!p) return res.status(404).json({ error: 'Source not found' });
    if (req.body.baseCredibility !== undefined) p.baseCredibility = req.body.baseCredibility;
    res.json({ profile: p });
  });

  // Statements
  app.post('/api/statements', (req, res) => {
    const { content, sourceId, confidence } = req.body;
    if (!content || !sourceId) return res.status(400).json({ error: 'content and sourceId are required' });
    const id = genId('stmt');
    statements.set(id, { id, content, sourceId, confidence: confidence || 0.5, timestamp: new Date().toISOString(), contradictedBy: [], linkedFacts: [], contexts: [] });
    const p = sourceProfiles.get(sourceId);
    if (p) { p.totalStatements++; p.avgConfidence = (p.avgConfidence * (p.totalStatements - 1) + confidence) / p.totalStatements; }
    res.status(201).json({ id, statement: statements.get(id) });
  });
  app.get('/api/statements', (req, res) => {
    let result = Array.from(statements.values());
    if (req.query.sourceId) result = result.filter(s => s.sourceId === req.query.sourceId);
    if (req.query.minConfidence) result = result.filter(s => s.confidence >= parseFloat(req.query.minConfidence));
    res.json({ statements: result, total: result.length });
  });
  app.get('/api/statements/:id', (req, res) => {
    const s = statements.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Statement not found' });
    res.json({ statement: s });
  });
  app.patch('/api/statements/:id', (req, res) => {
    const s = statements.get(req.params.id);
    if (!s) return res.status(404).json({ error: 'Statement not found' });
    if (req.body.confidence !== undefined) s.confidence = req.body.confidence;
    res.json({ statement: s });
  });

  // Evidence chains
  app.post('/api/evidence-chains', (req, res) => {
    const { statementIds } = req.body;
    if (!statementIds || statementIds.length < 2) return res.status(400).json({ error: 'At least 2 statementIds required' });
    const id = genId('chain');
    evidenceChains.set(id, { id, statements: statementIds, strength: 0.8, createdAt: new Date().toISOString() });
    res.status(201).json({ id, chain: evidenceChains.get(id) });
  });
  app.get('/api/evidence-chains', (req, res) => res.json({ chains: Array.from(evidenceChains.values()), total: evidenceChains.size }));

  // Contradictions
  app.post('/api/contradictions/check', (req, res) => {
    const { statementAId, statementBId } = req.body;
    if (!statementAId || !statementBId) return res.status(400).json({ error: 'Both statementIds required' });
    const a = statements.get(statementAId), b = statements.get(statementBId);
    if (!a || !b) return res.status(404).json({ error: 'Statement not found' });
    const score = (a.content.includes('yes') && b.content.includes('no')) ? 0.9 : 0.1;
    if (score > 0.7) {
      const cid = genId('contra');
      contradictions.set(cid, { id: cid, statementA: a, statementB: b, score, status: 'detected' });
      return res.status(201).json({ isContradiction: true, contradiction: contradictions.get(cid) });
    }
    res.json({ isContradiction: false, score });
  });
  app.get('/api/contradictions', (req, res) => res.json({ contradictions: Array.from(contradictions.values()), total: contradictions.size }));
  app.patch('/api/contradictions/:id', (req, res) => {
    const c = contradictions.get(req.params.id);
    if (!c) return res.status(404).json({ error: 'Contradiction not found' });
    if (req.body.resolution) c.resolution = req.body.resolution;
    c.status = 'resolved';
    res.json({ contradiction: c });
  });

  // Truth scores
  app.get('/api/truth-scores/:entityId', (req, res) => {
    const entityStatements = Array.from(statements.values()).filter(s => s.content.toLowerCase().includes(req.params.entityId.toLowerCase()));
    if (entityStatements.length === 0) return res.status(404).json({ error: 'No statements found' });
    const score = entityStatements.reduce((s, st) => s + st.confidence, 0) / entityStatements.length;
    truthScores.set(req.params.entityId, { entityId: req.params.entityId, overallScore: score, statementCount: entityStatements.length });
    res.json({ truthScore: truthScores.get(req.params.entityId) });
  });

  // Verify
  app.post('/api/verify', (req, res) => {
    const { claim } = req.body;
    if (!claim) return res.status(400).json({ error: 'claim is required' });
    const similar = Array.from(statements.values()).filter(s => s.content.toLowerCase().includes(claim.toLowerCase()));
    res.json({ verified: similar.length > 0, status: similar.length > 0 ? 'confirmed' : 'unknown', statements: similar });
  });

  // Stats
  app.get('/api/stats', (req, res) => res.json({ totalStatements: statements.size, totalEvidenceChains: evidenceChains.size, totalContradictions: contradictions.size, totalSources: sourceProfiles.size }));

  // Health
  app.get('/health', (req, res) => res.json({ service: 'memory-truth-engine', status: 'healthy' }));

  return app;
}

describe('Memory Truth Engine', () => {
  let app;
  beforeEach(() => { app = createApp(); });

  it('should register a source', async () => {
    const res = await request(app).post('/api/sources').send({ sourceId: 'ceo_1', type: 'human', role: 'ceo', baseCredibility: 0.95 });
    expect(res.status).toBe(201);
    expect(res.body.profile.role).toBe('ceo');
    expect(res.body.profile.baseCredibility).toBe(0.95);
  });

  it('should create a statement', async () => {
    await request(app).post('/api/sources').send({ sourceId: 'src1', type: 'human' });
    const res = await request(app).post('/api/statements').send({ content: 'We will launch in Q4', sourceId: 'src1', confidence: 0.9 });
    expect(res.status).toBe(201);
    expect(res.body.statement.confidence).toBe(0.9);
  });

  it('should update source credibility', async () => {
    await request(app).post('/api/sources').send({ sourceId: 'src1', type: 'human' });
    const res = await request(app).patch('/api/sources/src1').send({ baseCredibility: 0.85 });
    expect(res.body.profile.baseCredibility).toBe(0.85);
  });

  it('should track source statistics', async () => {
    await request(app).post('/api/sources').send({ sourceId: 'src1', type: 'human' });
    await request(app).post('/api/statements').send({ content: 'Statement 1', sourceId: 'src1', confidence: 0.8 });
    await request(app).post('/api/statements').send({ content: 'Statement 2', sourceId: 'src1', confidence: 0.9 });
    const res = await request(app).get('/api/sources/src1');
    expect(res.body.profile.totalStatements).toBe(2);
  });

  it('should detect contradictions', async () => {
    await request(app).post('/api/statements').send({ content: 'yes we will ship', sourceId: 'src1', confidence: 0.9 });
    await request(app).post('/api/statements').send({ content: 'no we will not ship', sourceId: 'src1', confidence: 0.8 });
    const { body: { statements } } = await request(app).get('/api/statements?sourceId=src1');
    const res = await request(app).post('/api/contradictions/check').send({ statementAId: statements[0].id, statementBId: statements[1].id });
    expect(res.body.isContradiction).toBe(true);
    expect(res.body.contradiction).toBeDefined();
  });

  it('should resolve contradictions', async () => {
    await request(app).post('/api/statements').send({ content: 'yes', sourceId: 'src1', confidence: 0.9 });
    await request(app).post('/api/statements').send({ content: 'no', sourceId: 'src1', confidence: 0.8 });
    const { body: { statements } } = await request(app).get('/api/statements?sourceId=src1');
    await request(app).post('/api/contradictions/check').send({ statementAId: statements[0].id, statementBId: statements[1].id });
    const { body: { contradictions } } = await request(app).get('/api/contradictions');
    const res = await request(app).patch(`/api/contradictions/${contradictions[0].id}`).send({ resolution: 'Statement B is more recent and accurate' });
    expect(res.body.contradiction.status).toBe('resolved');
  });

  it('should calculate truth scores', async () => {
    await request(app).post('/api/statements').send({ content: 'Company X has 100 employees', sourceId: 'src1', confidence: 0.9 });
    const res = await request(app).get('/api/truth-scores/Company X');
    expect(res.body.truthScore.overallScore).toBe(0.9);
  });

  it('should verify claims', async () => {
    await request(app).post('/api/statements').send({ content: 'Product launches in December', sourceId: 'src1', confidence: 0.8 });
    const res = await request(app).post('/api/verify').send({ claim: 'Product launches' });
    expect(res.body.verified).toBe(true);
    expect(res.body.status).toBe('confirmed');
  });

  it('should create evidence chains', async () => {
    await request(app).post('/api/statements').send({ content: 'Fact 1', sourceId: 'src1', confidence: 0.8 });
    await request(app).post('/api/statements').send({ content: 'Fact 2', sourceId: 'src2', confidence: 0.9 });
    const res = await request(app).post('/api/evidence-chains').send({ statementIds: ['stmt_1', 'stmt_2'] });
    expect(res.status).toBe(201);
    expect(res.body.chain.strength).toBeDefined();
  });

  it('should filter statements by confidence', async () => {
    await request(app).post('/api/statements').send({ content: 'Low confidence', sourceId: 'src1', confidence: 0.3 });
    await request(app).post('/api/statements').send({ content: 'High confidence', sourceId: 'src1', confidence: 0.95 });
    const res = await request(app).get('/api/statements?minConfidence=0.9');
    expect(res.body.total).toBe(1);
  });

  it('should return stats', async () => {
    const res = await request(app).get('/api/stats');
    expect(res.body.totalStatements).toBeDefined();
    expect(res.body.totalSources).toBeDefined();
  });

  it('should return health', async () => {
    const res = await request(app).get('/health');
    expect(res.body.status).toBe('healthy');
  });
});