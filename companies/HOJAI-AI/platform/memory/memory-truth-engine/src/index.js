/**
 * Memory Truth Engine Service
 * Source credibility, contradiction detection, evidence chains
 *
 * Core concept: "Truth is contextual" - the same statement can be true or false
 * depending on source, time, and evidence.
 */

import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// In-memory stores
const statements = new Map();       // statementId -> { id, content, sourceId, sourceType, sourceRole, confidence, timestamp, validFrom, validUntil, contexts, linkedFacts }
const evidenceChains = new Map();   // chainId -> { id, statements, relationships, createdAt }
const contradictions = new Map();    // contradictionId -> { id, statementA, statementB, resolution, status }
const sourceProfiles = new Map();   // sourceId -> { id, type, role, baseCredibility, totalStatements, avgConfidence }
const truthScores = new Map();     // entityId -> { id, entityId, overallScore, breakdown, lastUpdated }

function genId(prefix = 'truth') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// ============ SOURCE PROFILES ============

// Register a source
app.post('/api/sources', (req, res) => {
  const { sourceId, type, role, baseCredibility } = req.body;
  if (!sourceId || !type) {
    return res.status(400).json({ error: 'sourceId and type are required' });
  }

  const profile = {
    id: sourceId,
    type, // 'human', 'agent', 'document', 'system', 'api'
    role: role || 'contributor', // 'ceo', 'manager', 'employee', 'customer', 'vendor', 'system'
    baseCredibility: baseCredibility || 0.7,
    totalStatements: 0,
    avgConfidence: 0,
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  sourceProfiles.set(sourceId, profile);

  res.status(201).json({ id: sourceId, profile });
});

// Get source profile
app.get('/api/sources/:sourceId', (req, res) => {
  const profile = sourceProfiles.get(req.params.sourceId);
  if (!profile) {
    return res.status(404).json({ error: 'Source not found' });
  }
  res.json({ profile });
});

// Update source credibility
app.patch('/api/sources/:sourceId', (req, res) => {
  const profile = sourceProfiles.get(req.params.sourceId);
  if (!profile) {
    return res.status(404).json({ error: 'Source not found' });
  }

  const { baseCredibility, role } = req.body;
  if (baseCredibility !== undefined) profile.baseCredibility = baseCredibility;
  if (role) profile.role = role;
  profile.lastSeen = new Date().toISOString();

  res.json({ profile });
});

// ============ STATEMENTS ============

// Add a statement
app.post('/api/statements', (req, res) => {
  const { content, sourceId, sourceType, sourceRole, confidence, validFrom, validUntil, contexts, linkedFacts } = req.body;

  if (!content || !sourceId) {
    return res.status(400).json({ error: 'content and sourceId are required' });
  }

  const statementId = genId('stmt');
  const statement = {
    id: statementId,
    content,
    sourceId,
    sourceType: sourceType || 'manual',
    sourceRole: sourceRole || 'contributor',
    confidence: confidence || 0.5,
    timestamp: new Date().toISOString(),
    validFrom: validFrom || new Date().toISOString(),
    validUntil: validUntil || null,
    contexts: contexts || [],
    linkedFacts: linkedFacts || [],
    version: 1,
    contradictedBy: [],
    supports: [],
  };

  statements.set(statementId, statement);

  // Update source profile
  const profile = sourceProfiles.get(sourceId);
  if (profile) {
    profile.totalStatements++;
    profile.avgConfidence = (profile.avgConfidence * (profile.totalStatements - 1) + confidence) / profile.totalStatements;
  }

  res.status(201).json({ id: statementId, statement });
});

// Get statement
app.get('/api/statements/:statementId', (req, res) => {
  const statement = statements.get(req.params.statementId);
  if (!statement) {
    return res.status(404).json({ error: 'Statement not found' });
  }
  res.json({ statement });
});

// List statements with filters
app.get('/api/statements', (req, res) => {
  const { sourceId, minConfidence, context, validAt } = req.query;
  let result = Array.from(statements.values());

  if (sourceId) {
    result = result.filter(s => s.sourceId === sourceId);
  }
  if (minConfidence) {
    result = result.filter(s => s.confidence >= parseFloat(minConfidence));
  }
  if (context) {
    result = result.filter(s => s.contexts.includes(context));
  }
  if (validAt) {
    const checkTime = new Date(validAt);
    result = result.filter(s => {
      const from = new Date(s.validFrom);
      const until = s.validUntil ? new Date(s.validUntil) : null;
      return from <= checkTime && (!until || until >= checkTime);
    });
  }

  res.json({ statements: result, total: result.length });
});

// Update statement (new version)
app.patch('/api/statements/:statementId', (req, res) => {
  const statement = statements.get(req.params.statementId);
  if (!statement) {
    return res.status(404).json({ error: 'Statement not found' });
  }

  const { confidence, validUntil, contexts, linkedFacts } = req.body;
  if (confidence !== undefined) statement.confidence = confidence;
  if (validUntil !== undefined) statement.validUntil = validUntil;
  if (contexts) statement.contexts = contexts;
  if (linkedFacts) statement.linkedFacts = linkedFacts;
  statement.version++;

  res.json({ statement });
});

// ============ EVIDENCE CHAINS ============

// Create evidence chain
app.post('/api/evidence-chains', (req, res) => {
  const { statementIds, relationships } = req.body;

  if (!statementIds || !Array.isArray(statementIds) || statementIds.length < 2) {
    return res.status(400).json({ error: 'At least 2 statementIds are required' });
  }

  // Validate all statements exist
  for (const id of statementIds) {
    if (!statements.has(id)) {
      return res.status(404).json({ error: `Statement ${id} not found` });
    }
  }

  const chainId = genId('chain');
  const chain = {
    id: chainId,
    statements: statementIds,
    relationships: relationships || [],
    strength: calculateChainStrength(statementIds),
    createdAt: new Date().toISOString(),
  };

  evidenceChains.set(chainId, chain);

  // Link statements to chain
  for (const stmtId of statementIds) {
    const stmt = statements.get(stmtId);
    stmt.linkedFacts.push(chainId);
  }

  res.status(201).json({ id: chainId, chain });
});

// Get evidence chain
app.get('/api/evidence-chains/:chainId', (req, res) => {
  const chain = evidenceChains.get(req.params.chainId);
  if (!chain) {
    return res.status(404).json({ error: 'Evidence chain not found' });
  }

  // Expand with statement details
  const expandedStatements = chain.statements.map(id => statements.get(id)).filter(Boolean);

  res.json({ chain, statements: expandedStatements });
});

// List evidence chains
app.get('/api/evidence-chains', (req, res) => {
  const { statementId, minStrength } = req.query;
  let result = Array.from(evidenceChains.values());

  if (statementId) {
    result = result.filter(c => c.statements.includes(statementId));
  }
  if (minStrength) {
    result = result.filter(c => c.strength >= parseFloat(minStrength));
  }

  res.json({ chains: result, total: result.length });
});

// ============ CONTRADICTION DETECTION ============

// Check for contradictions
app.post('/api/contradictions/check', (req, res) => {
  const { statementAId, statementBId } = req.body;

  if (!statementAId || !statementBId) {
    return res.status(400).json({ error: 'Both statementAId and statementBId are required' });
  }

  const stmtA = statements.get(statementAId);
  const stmtB = statements.get(statementBId);

  if (!stmtA || !stmtB) {
    return res.status(404).json({ error: 'One or both statements not found' });
  }

  // Simple contradiction check (in production, this would use ML/LLM)
  const contradictionScore = detectContradiction(stmtA, stmtB);
  const isContradiction = contradictionScore > 0.7;

  if (isContradiction) {
    const contradictionId = genId('contra');
    const contradiction = {
      id: contradictionId,
      statementA: stmtA,
      statementB: stmtB,
      score: contradictionScore,
      status: 'detected',
      detectedAt: new Date().toISOString(),
      resolution: null,
    };

    contradictions.set(contradictionId, contradiction);
    stmtA.contradictedBy.push(contradictionId);
    stmtB.contradictedBy.push(contradictionId);

    return res.status(201).json({ isContradiction: true, contradiction });
  }

  res.json({ isContradiction: false, score: contradictionScore });
});

// Get contradiction
app.get('/api/contradictions/:contradictionId', (req, res) => {
  const contradiction = contradictions.get(req.params.contradictionId);
  if (!contradiction) {
    return res.status(404).json({ error: 'Contradiction not found' });
  }
  res.json({ contradiction });
});

// Resolve contradiction
app.patch('/api/contradictions/:contradictionId', (req, res) => {
  const contradiction = contradictions.get(req.params.contradictionId);
  if (!contradiction) {
    return res.status(404).json({ error: 'Contradiction not found' });
  }

  const { resolution, winner } = req.body;
  if (resolution) contradiction.resolution = resolution;
  if (winner) contradiction.winner = winner;
  contradiction.status = 'resolved';
  contradiction.resolvedAt = new Date().toISOString();

  res.json({ contradiction });
});

// List contradictions
app.get('/api/contradictions', (req, res) => {
  const { status, sourceId } = req.query;
  let result = Array.from(contradictions.values());

  if (status) {
    result = result.filter(c => c.status === status);
  }
  if (sourceId) {
    result = result.filter(c =>
      c.statementA?.sourceId === sourceId ||
      c.statementB?.sourceId === sourceId
    );
  }

  res.json({ contradictions: result, total: result.length });
});

// ============ TRUTH SCORING ============

// Calculate truth score for an entity
app.get('/api/truth-scores/:entityId', (req, res) => {
  const { entityId } = req.params;

  // Get all statements about this entity
  const entityStatements = Array.from(statements.values()).filter(s =>
    s.linkedFacts.includes(entityId) ||
    s.content.toLowerCase().includes(entityId.toLowerCase())
  );

  if (entityStatements.length === 0) {
    return res.status(404).json({ error: 'No statements found for entity' });
  }

  // Calculate weighted truth score
  const breakdown = {
    avgConfidence: 0,
    sourceCredibility: 0,
    recencyWeight: 0,
    evidenceStrength: 0,
    contradictionPenalty: 0,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const stmt of entityStatements) {
    const source = sourceProfiles.get(stmt.sourceId);
    const sourceCred = source?.baseCredibility || 0.5;
    const recency = calculateRecencyWeight(stmt.timestamp);
    const weight = sourceCred * recency;

    weightedSum += stmt.confidence * weight;
    totalWeight += weight;
  }

  breakdown.avgConfidence = entityStatements.reduce((s, st) => s + st.confidence, 0) / entityStatements.length;
  breakdown.sourceCredibility = sourceProfiles.size > 0 ?
    Array.from(sourceProfiles.values()).reduce((s, p) => s + p.baseCredibility, 0) / sourceProfiles.size : 0.5;

  // Count contradictions
  const contradictionsCount = entityStatements.reduce((sum, stmt) => sum + stmt.contradictedBy.length, 0);
  breakdown.contradictionPenalty = Math.min(contradictionsCount * 0.1, 0.5);

  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  const truthScore = {
    entityId,
    overallScore: Math.max(0, Math.min(1, overallScore - breakdown.contradictionPenalty)),
    breakdown,
    statementCount: entityStatements.length,
    lastUpdated: new Date().toISOString(),
  };

  truthScores.set(entityId, truthScore);

  res.json({ truthScore });
});

// ============ VERIFICATION ============

// Verify a claim against evidence
app.post('/api/verify', (req, res) => {
  const { claim, context } = req.body;

  if (!claim) {
    return res.status(400).json({ error: 'claim is required' });
  }

  // Find similar statements
  const similar = Array.from(statements.values()).filter(s =>
    s.content.toLowerCase().includes(claim.toLowerCase()) ||
    claim.toLowerCase().includes(s.content.toLowerCase())
  );

  if (similar.length === 0) {
    return res.json({
      verified: false,
      status: 'unknown',
      message: 'No evidence found for this claim',
      supportingEvidence: [],
      contradictingEvidence: [],
    });
  }

  // Calculate verification score
  let supportingCount = 0;
  let contradictingCount = 0;

  for (const stmt of similar) {
    const contradiction = detectContradiction({ content: claim }, stmt);
    if (contradiction > 0.7) {
      contradictingCount++;
    } else {
      supportingCount++;
    }
  }

  const verificationScore = supportingCount / (supportingCount + contradictingCount);

  res.json({
    verified: verificationScore > 0.6,
    status: verificationScore > 0.8 ? 'confirmed' : verificationScore > 0.5 ? 'partial' : 'disputed',
    score: verificationScore,
    supportingEvidence: supportingCount,
    contradictingEvidence: contradictingCount,
    statements: similar.slice(0, 5),
  });
});

// ============ STATS ============

app.get('/api/stats', (req, res) => {
  res.json({
    totalStatements: statements.size,
    totalEvidenceChains: evidenceChains.size,
    totalContradictions: contradictions.size,
    totalSources: sourceProfiles.size,
    avgTruthScore: truthScores.size > 0 ?
      Array.from(truthScores.values()).reduce((s, t) => s + t.overallScore, 0) / truthScores.size : 0,
    contradictionsByStatus: {
      detected: Array.from(contradictions.values()).filter(c => c.status === 'detected').length,
      resolved: Array.from(contradictions.values()).filter(c => c.status === 'resolved').length,
    },
  });
});

// ============ HEALTH ============

app.get('/health', (req, res) => {
  res.json({
    service: 'memory-truth-engine',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// ============ HELPER FUNCTIONS ============

function calculateChainStrength(statementIds) {
  let totalConfidence = 0;
  let sourceDiversity = new Set();

  for (const id of statementIds) {
    const stmt = statements.get(id);
    if (stmt) {
      totalConfidence += stmt.confidence;
      sourceDiversity.add(stmt.sourceId);
    }
  }

  const avgConfidence = totalConfidence / statementIds.length;
  const diversityBonus = Math.min(sourceDiversity.size / statementIds.length, 1) * 0.2;

  return Math.min(avgConfidence + diversityBonus, 1);
}

function detectContradiction(stmtA, stmtB) {
  // Simple keyword-based contradiction detection
  // In production, this would use NLP/LLM

  const positive = ['yes', 'true', 'correct', 'agree', 'confirmed', 'is', 'are', 'will', 'can'];
  const negative = ['no', 'false', 'incorrect', 'disagree', 'denied', 'is not', 'are not', 'won\'t', 'cannot'];

  const contentA = stmtA.content.toLowerCase();
  const contentB = stmtB.content.toLowerCase();

  let scoreA = 0, scoreB = 0;

  for (const word of positive) {
    if (contentA.includes(word)) scoreA++;
    if (contentB.includes(word)) scoreB++;
  }

  for (const word of negative) {
    if (contentA.includes(word)) scoreA--;
    if (contentB.includes(word)) scoreB--;
  }

  // If one is positive and other negative, potential contradiction
  if ((scoreA > 0 && scoreB < 0) || (scoreA < 0 && scoreB > 0)) {
    return 0.8;
  }

  // Check for time-based contradictions
  if (stmtA.validUntil && stmtB.validUntil) {
    if (stmtA.validUntil !== stmtB.validUntil) {
      return 0.6; // Temporal contradiction possible
    }
  }

  // Check for confidence difference
  if (Math.abs(stmtA.confidence - stmtB.confidence) > 0.5) {
    return 0.4; // Weak contradiction signal
  }

  return 0.1; // No contradiction
}

function calculateRecencyWeight(timestamp) {
  const age = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24); // days
  return Math.max(0.2, 1 - (age * 0.01)); // Decay 1% per day, min 0.2
}

const PORT = process.env.PORT || 4801;
app.listen(PORT, () => {
  console.log(`Memory Truth Engine running on port ${PORT}`);
});

export default app;