import helmet from 'helmet';
/**
 * Dispute Resolution Service
 *
 * Handles disputes between AI agents and consumers.
 * Provides:
 * - Automated dispute analysis
 * - Evidence collection
 * - Mediation
 * - Arbitration
 * - Refund processing
 * - Reputation impact tracking
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'dispute-resolution' });

const PORT = process.env.PORT || 4847;

// Service URLs
const AGENT_CONTRACTS_URL = process.env.AGENT_CONTRACTS_URL || 'http://localhost:4830';
const AGENT_WALLETS_URL = process.env.AGENT_WALLETS_URL || 'http://localhost:4840';
const AGENT_REPUTATION_URL = process.env.AGENT_REPUTATION_URL || 'http://localhost:4820';

// In-memory stores
const disputes = new PersistentMap('disputes', { serviceName: 'dispute-resolution' });
const mediations = new PersistentMap('mediations', { serviceName: 'dispute-resolution' });
const arbitrations = new PersistentMap('arbitrations', { serviceName: 'dispute-resolution' });
const evidence = new PersistentMap('evidence', { serviceName: 'dispute-resolution' });
const arbitrators = new PersistentMap('arbitrators', { serviceName: 'dispute-resolution' });

// Dispute categories
const DISPUTE_CATEGORIES = {
  PRODUCT_QUALITY: 'product_quality',
  NOT_RECEIVED: 'not_received',
  NOT_AS_DESCRIBED: 'not_as_described',
  DAMAGED: 'damaged',
  LATE_DELIVERY: 'late_delivery',
  WRONG_ITEM: 'wrong_item',
  REFUND_ISSUE: 'refund_issue',
  UNAUTHORIZED_CHARGE: 'unauthorized_charge',
  SERVICE_QUALITY: 'service_quality',
  OTHER: 'other'
};

// Dispute statuses
const DISPUTE_STATUS = {
  OPEN: 'open',
  INVESTIGATING: 'investigating',
  MEDIATION: 'mediation',
  ARBITRATION: 'arbitration',
  RESOLVED: 'resolved',
  ESCALATED: 'escalated',
  CLOSED: 'closed',
  EXPIRED: 'expired'
};

// Resolution outcomes
const RESOLUTION_OUTCOMES = {
  REFUND_FULL: 'refund_full',
  REFUND_PARTIAL: 'refund_partial',
  REPLACEMENT: 'replacement',
  NO_REFUND: 'no_refund',
  SELLER_FAVOR: 'seller_favor',
  BUYER_FAVOR: 'buyer_favor',
  SPLIT: 'split',
  MEDIATED: 'mediated'
};

/**
 * Create dispute
 */
function createDispute(disputeData) {
  const dispute = {
    id: `DISP-${Date.now()}-${uuidv4().substring(0, 8)}`,
    contractId: disputeData.contractId,
    orderId: disputeData.orderId,
    negotiationId: disputeData.negotiationId,

    // Parties
    raisedBy: disputeData.raisedBy,  // agentId
    raisedByType: disputeData.raisedByType || 'buyer',  // buyer, seller
    against: disputeData.against,    // agentId
    againstType: disputeData.againstType || 'seller',

    // Details
    category: disputeData.category,
    reason: disputeData.reason,
    description: disputeData.description,

    // Amount
    amount: disputeData.amount || 0,
    currency: disputeData.currency || 'USD',
    requestedResolution: disputeData.requestedResolution,
    requestedRefund: disputeData.requestedRefund,

    // Evidence
    evidenceIds: [],

    // Status
    status: DISPUTE_STATUS.OPEN,
    priority: calculatePriority(disputeData),
    assignedTo: null,
    arbitrator: null,

    // Timeline
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    resolvedAt: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),  // 30 days

    // Resolution
    resolution: null,
    refundAmount: 0,

    // History
    history: [{
      action: 'created',
      timestamp: new Date().toISOString(),
      actor: disputeData.raisedBy,
      details: `Dispute opened: ${disputeData.reason}`
    }]
  };

  disputes.set(dispute.id, dispute);
  evidence.set(dispute.id, []);
  return dispute;
}

/**
 * Calculate priority based on amount and category
 */
function calculatePriority(disputeData) {
  let priority = 'medium';

  if (disputeData.amount > 1000) priority = 'high';
  else if (disputeData.amount < 50) priority = 'low';

  if (disputeData.category === DISPUTE_CATEGORIES.UNAUTHORIZED_CHARGE) {
    priority = 'critical';
  }

  return priority;
}

/**
 * Add evidence to dispute
 */
function addEvidence(disputeId, evidenceData) {
  const evidenceList = evidence.get(disputeId) || [];

  const ev = {
    id: `EVD-${uuidv4().substring(0, 8)}`,
    disputeId,
    submittedBy: evidenceData.submittedBy,
    type: evidenceData.type,  // text, image, video, document, screenshot
    content: evidenceData.content,  // URL or text content
    description: evidenceData.description,
    verified: false,
    timestamp: new Date().toISOString()
  };

  evidenceList.push(ev);
  evidence.set(disputeId, evidenceList);

  const dispute = disputes.get(disputeId);
  if (dispute) {
    dispute.evidenceIds.push(ev.id);
    dispute.updatedAt = new Date().toISOString();
    disputes.set(disputeId, dispute);
  }

  return ev;
}

/**
 * Analyze dispute
 */
function analyzeDispute(disputeId) {
  const dispute = disputes.get(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const disputeEvidence = evidence.get(disputeId) || [];

  const analysis = {
    disputeId,
    confidence: 0,  // 0-1, our confidence in resolving
    recommendation: '',
    suggestedResolution: '',
    estimatedRefund: 0,
    riskLevel: 'medium',
    factors: []
  };

  // Analyze based on category
  switch (dispute.category) {
    case DISPUTE_CATEGORIES.NOT_RECEIVED:
      analysis.recommendation = 'Verify shipping tracking';
      analysis.suggestedResolution = RESOLUTION_OUTCOMES.REFUND_FULL;
      analysis.estimatedRefund = dispute.amount;
      analysis.confidence = 0.8;
      analysis.factors.push('No receipt confirmation', 'Time since order > delivery estimate');
      break;

    case DISPUTE_CATEGORIES.NOT_AS_DESCRIBED:
      analysis.recommendation = 'Compare description vs delivered';
      analysis.suggestedResolution = RESOLUTION_OUTCOMES.REFUND_PARTIAL;
      analysis.estimatedRefund = dispute.amount * 0.5;
      analysis.confidence = 0.6;
      analysis.factors.push('Requires visual verification', 'Evidence of discrepancy');
      break;

    case DISPUTE_CATEGORIES.DAMAGED:
      analysis.recommendation = 'Verify damage with photos';
      analysis.suggestedResolution = RESOLUTION_OUTCOMES.REFUND_FULL;
      analysis.estimatedRefund = dispute.amount;
      analysis.confidence = disputeEvidence.some(e => e.type === 'image') ? 0.9 : 0.5;
      analysis.factors.push('Physical damage', 'Evidence present');
      break;

    case DISPUTE_CATEGORIES.UNAUTHORIZED_CHARGE:
      analysis.recommendation = 'Immediate investigation required';
      analysis.suggestedResolution = RESOLUTION_OUTCOMES.REFUND_FULL;
      analysis.estimatedRefund = dispute.amount;
      analysis.confidence = 0.95;
      analysis.factors.push('Security concern', 'Immediate refund recommended');
      analysis.riskLevel = 'critical';
      break;

    case DISPUTE_CATEGORIES.LATE_DELIVERY:
      analysis.recommendation = 'Check delivery vs promised date';
      analysis.suggestedResolution = RESOLUTION_OUTCOMES.REFUND_PARTIAL;
      analysis.estimatedRefund = dispute.amount * 0.1;
      analysis.confidence = 0.7;
      analysis.factors.push('Late delivery confirmed');
      break;

    default:
      analysis.recommendation = 'Standard investigation';
      analysis.suggestedResolution = RESOLUTION_OUTCOMES.MEDIATED;
      analysis.estimatedRefund = dispute.amount * 0.5;
      analysis.confidence = 0.5;
  }

  // Adjust based on evidence
  if (disputeEvidence.length >= 3) {
    analysis.confidence = Math.min(1, analysis.confidence + 0.1);
  }

  // Adjust based on history
  if (dispute.amount > 5000) {
    analysis.riskLevel = 'high';
  }

  return analysis;
}

/**
 * Start mediation
 */
function startMediation(disputeId, mediatorId) {
  const dispute = disputes.get(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const mediation = {
    id: uuidv4(),
    disputeId,
    mediatorId,
    status: 'active',
    proposals: [],
    messages: [],
    startedAt: new Date().toISOString(),
    endedAt: null,
    resolution: null
  };

  mediations.set(mediation.id, mediation);

  dispute.status = DISPUTE_STATUS.MEDIATION;
  dispute.assignedTo = mediatorId;
  dispute.updatedAt = new Date().toISOString();
  dispute.history.push({
    action: 'mediation_started',
    timestamp: new Date().toISOString(),
    actor: mediatorId,
    details: 'Mediation in progress'
  });

  disputes.set(disputeId, dispute);

  return mediation;
}

/**
 * Submit mediation proposal
 */
function submitMediationProposal(mediationId, proposal) {
  const mediation = mediations.get(mediationId);
  if (!mediation) {
    throw new Error('Mediation not found');
  }

  const proposalRecord = {
    id: uuidv4(),
    proposedBy: proposal.proposedBy,
    terms: proposal.terms,  // e.g., { refundAmount: 50, replacement: false }
    acceptedBy: [],
    rejectedBy: [],
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  mediation.proposals.push(proposalRecord);
  mediations.set(mediationId, mediation);

  return proposalRecord;
}

/**
 * Escalate to arbitration
 */
function escalateToArbitration(disputeId, arbitratorId) {
  const dispute = disputes.get(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  const arbitration = {
    id: uuidv4(),
    disputeId,
    arbitratorId,
    status: 'pending',
    startedAt: new Date().toISOString(),
    decidedAt: null,
    decision: null
  };

  arbitrations.set(arbitration.id, arbitration);

  dispute.status = DISPUTE_STATUS.ARBITRATION;
  dispute.arbitrator = arbitratorId;
  dispute.updatedAt = new Date().toISOString();
  dispute.history.push({
    action: 'arbitration_started',
    timestamp: new Date().toISOString(),
    actor: arbitratorId,
    details: 'Escalated to arbitration'
  });

  disputes.set(disputeId, dispute);

  return arbitration;
}

/**
 * Make arbitration decision
 */
function makeArbitrationDecision(arbitrationId, decision) {
  const arbitration = arbitrations.get(arbitrationId);
  if (!arbitration) {
    throw new Error('Arbitration not found');
  }

  arbitration.status = 'decided';
  arbitration.decidedAt = new Date().toISOString();
  arbitration.decision = {
    outcome: decision.outcome,  // resolution type
    refundAmount: decision.refundAmount,
    reasoning: decision.reasoning,
    binding: true  // Arbitration is binding
  };

  arbitrations.set(arbitrationId, arbitration);

  // Resolve the dispute
  const dispute = disputes.get(arbitration.disputeId);
  if (dispute) {
    resolveDispute(dispute.id, {
      outcome: decision.outcome,
      refundAmount: decision.refundAmount,
      resolutionType: 'arbitration',
      resolvedBy: arbitration.arbitratorId
    });
  }

  return arbitration;
}

/**
 * Resolve dispute
 */
function resolveDispute(disputeId, resolution) {
  const dispute = disputes.get(disputeId);
  if (!dispute) {
    throw new Error('Dispute not found');
  }

  dispute.status = DISPUTE_STATUS.RESOLVED;
  dispute.resolvedAt = new Date().toISOString();
  dispute.resolution = {
    outcome: resolution.outcome,
    refundAmount: resolution.refundAmount || 0,
    resolutionType: resolution.resolutionType || 'mediation',
    resolvedBy: resolution.resolvedBy || 'system',
    notes: resolution.notes
  };
  dispute.refundAmount = resolution.refundAmount || 0;
  dispute.updatedAt = new Date().toISOString();
  dispute.history.push({
    action: 'resolved',
    timestamp: new Date().toISOString(),
    actor: resolution.resolvedBy || 'system',
    details: `Resolved: ${resolution.outcome} - Refund: ${resolution.refundAmount}`
  });

  disputes.set(disputeId, dispute);
  return dispute;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  const all = Array.from(disputes.values());
  res.json({
    service: 'Dispute Resolution Service',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalDisputes: all.length,
      open: all.filter(d => d.status === DISPUTE_STATUS.OPEN).length,
      inProgress: all.filter(d => [DISPUTE_STATUS.MEDIATION, DISPUTE_STATUS.ARBITRATION].includes(d.status)).length,
      resolved: all.filter(d => d.status === DISPUTE_STATUS.RESOLVED).length
    }
  });
});

/**
 * Create dispute
 * POST /api/disputes
 */
app.post('/api/disputes',requireAuth,  (req, res) => {
  try {
    const dispute = createDispute(req.body);
    res.status(201).json(dispute);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get dispute
 * GET /api/disputes/:id
 */
app.get('/api/disputes/:id', (req, res) => {
  const dispute = disputes.get(req.params.id);
  if (!dispute) {
    return res.status(404).json({ error: 'Dispute not found' });
  }

  const disputeEvidence = evidence.get(req.params.id) || [];
  res.json({ ...dispute, evidence: disputeEvidence });
});

/**
 * Update dispute
 * PUT /api/disputes/:id
 */
app.put('/api/disputes/:id',requireAuth,  (req, res) => {
  try {
    const dispute = disputes.get(req.params.id);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }

    const updated = { ...dispute, ...req.body, id: dispute.id, updatedAt: new Date().toISOString() };
    disputes.set(req.params.id, updated);
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Add evidence
 * POST /api/disputes/:id/evidence
 */
app.post('/api/disputes/:id/evidence',requireAuth,  (req, res) => {
  try {
    const ev = addEvidence(req.params.id, req.body);
    res.status(201).json(ev);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get evidence
 * GET /api/disputes/:id/evidence
 */
app.get('/api/disputes/:id/evidence', (req, res) => {
  const disputeEvidence = evidence.get(req.params.id) || [];
  res.json(disputeEvidence);
});

/**
 * Analyze dispute
 * POST /api/disputes/:id/analyze
 */
app.post('/api/disputes/:id/analyze',requireAuth,  (req, res) => {
  try {
    const analysis = analyzeDispute(req.params.id);
    res.json(analysis);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Start mediation
 * POST /api/disputes/:id/mediate
 */
app.post('/api/disputes/:id/mediate',requireAuth,  (req, res) => {
  try {
    const { mediatorId } = req.body;
    const mediation = startMediation(req.params.id, mediatorId);
    res.status(201).json(mediation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Submit mediation proposal
 * POST /api/mediations/:id/propose
 */
app.post('/api/mediations/:id/propose',requireAuth,  (req, res) => {
  try {
    const proposal = submitMediationProposal(req.params.id, req.body);
    res.status(201).json(proposal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get mediation
 * GET /api/mediations/:id
 */
app.get('/api/mediations/:id', (req, res) => {
  const mediation = mediations.get(req.params.id);
  if (!mediation) {
    return res.status(404).json({ error: 'Mediation not found' });
  }
  res.json(mediation);
});

/**
 * Escalate to arbitration
 * POST /api/disputes/:id/escalate
 */
app.post('/api/disputes/:id/escalate',requireAuth,  (req, res) => {
  try {
    const { arbitratorId } = req.body;
    const arbitration = escalateToArbitration(req.params.id, arbitratorId);
    res.status(201).json(arbitration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Make arbitration decision
 * POST /api/arbitrations/:id/decide
 */
app.post('/api/arbitrations/:id/decide',requireAuth,  (req, res) => {
  try {
    const arbitration = makeArbitrationDecision(req.params.id, req.body);
    res.json(arbitration);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Resolve dispute
 * POST /api/disputes/:id/resolve
 */
app.post('/api/disputes/:id/resolve',requireAuth,  (req, res) => {
  try {
    const dispute = resolveDispute(req.params.id, req.body);
    res.json(dispute);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get disputes by agent
 * GET /api/disputes/agent/:agentId
 */
app.get('/api/disputes/agent/:agentId', (req, res) => {
  const { status, role } = req.query;

  let result = Array.from(disputes.values()).filter(
    d => d.raisedBy === req.params.agentId || d.against === req.params.agentId
  );

  if (status) {
    result = result.filter(d => d.status === status);
  }

  if (role === 'buyer') {
    result = result.filter(d => d.raisedByType === 'buyer');
  } else if (role === 'seller') {
    result = result.filter(d => d.raisedByType === 'seller');
  }

  res.json({ total: result.length, disputes: result });
});

/**
 * Get disputes by status
 * GET /api/disputes/status/:status
 */
app.get('/api/disputes/status/:status', (req, res) => {
  const result = Array.from(disputes.values()).filter(
    d => d.status === req.params.status
  );
  res.json({ status: req.params.status, total: result.length, disputes: result });
});

/**
 * Get resolution statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const all = Array.from(disputes.values());

  const byStatus = {};
  Object.values(DISPUTE_STATUS).forEach(status => {
    byStatus[status] = all.filter(d => d.status === status).length;
  });

  const byCategory = {};
  Object.values(DISPUTE_CATEGORIES).forEach(cat => {
    byCategory[cat] = all.filter(d => d.category === cat).length;
  });

  const resolved = all.filter(d => d.status === DISPUTE_STATUS.RESOLVED);
  const totalRefundAmount = resolved.reduce((sum, d) => sum + (d.refundAmount || 0), 0);

  res.json({
    totalDisputes: all.length,
    byStatus,
    byCategory,
    resolvedCount: resolved.length,
    resolutionRate: all.length > 0 ? ((resolved.length / all.length) * 100).toFixed(1) + '%' : '0%',
    totalRefundAmount,
    avgResolutionTime: resolved.length > 0
      ? resolved.reduce((sum, d) => sum + (new Date(d.resolvedAt) - new Date(d.createdAt)), 0) / resolved.length / (1000 * 60 * 60)
      : 0
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           DISPUTE RESOLUTION SERVICE                         ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Dispute Categories:                                          ║
║    Product Quality, Not Received, Damaged, Wrong Item         ║
║    Not as Described, Late Delivery, Unauthorized Charge     ║
║    Service Quality, Refund Issues                             ║
╠══════════════════════════════════════════════════════════════╣
║  Resolution Process:                                         ║
║    Open → Investigation → Mediation → Arbitration            ║
║    OR      → Automated Resolution                            ║
╠══════════════════════════════════════════════════════════════╣
║  Outcomes:                                                    ║
║    Full Refund, Partial Refund, Replacement                  ║
║    No Refund, Seller Favor, Buyer Favor, Split              ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/disputes              Open dispute            ║
║    GET    /api/disputes/:id          Get dispute             ║
║    POST   /api/disputes/:id/evidence Add evidence           ║
║    POST   /api/disputes/:id/analyze  Analyze dispute         ║
║    POST   /api/disputes/:id/mediate  Start mediation         ║
║    POST   /api/disputes/:id/escalate Escalate arbitration    ║
║    POST   /api/disputes/:id/resolve  Resolve dispute         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
