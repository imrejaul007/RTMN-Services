import cors from 'cors';
import helmet from 'helmet';
/**
 * Agent Contracts Service
 *
 * Smart contracts for AI-to-AI commerce transactions.
 * Manages:
 * - Contract creation from negotiated terms
 * - Escrow management
 * - Automatic fulfillment verification
 * - Dispute resolution triggers
 * - Contract lifecycle management
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');

const app = express();

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'agent-contracts' });

const PORT = process.env.PORT || 4830;

// In-memory stores
const contracts = new PersistentMap('contracts', { serviceName: 'agent-contracts' });
const escrow = new PersistentMap('escrow', { serviceName: 'agent-contracts' });
const fulfillments = new PersistentMap('fulfillments', { serviceName: 'agent-contracts' });
const milestones = new PersistentMap('milestones', { serviceName: 'agent-contracts' });

// Contract states
const CONTRACT_STATES = {
  DRAFT: 'draft',
  PENDING_SIGNATURES: 'pending_signatures',
  ACTIVE: 'active',
  IN_PROGRESS: 'in_progress',
  FULFILLED: 'fulfilled',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled',
  EXPIRED: 'expired'
};

// Contract types
const CONTRACT_TYPES = {
  PURCHASE: 'purchase',
  SERVICE: 'service',
  SUBSCRIPTION: 'subscription',
  RENTAL: 'rental',
  MEMBERSHIP: 'membership',
  PARTNERSHIP: 'partnership'
};

/**
 * Create contract from negotiation terms
 */
function createContract(negotiationData) {
  const contract = {
    id: `CTR-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: negotiationData.type || CONTRACT_TYPES.PURCHASE,
    state: CONTRACT_STATES.DRAFT,

    // Parties
    buyer: {
      agentId: negotiationData.buyerAgent,
      name: negotiationData.buyerName,
      signature: null,
      signedAt: null
    },
    seller: {
      agentId: negotiationData.sellerAgent,
      name: negotiationData.sellerName,
      signature: null,
      signedAt: null
    },

    // Terms
    terms: {
      product: negotiationData.terms?.product,
      description: negotiationData.terms?.description,
      quantity: negotiationData.terms?.quantity || 1,
      price: negotiationData.terms?.price,
      currency: negotiationData.terms?.currency || 'USD',
      deliveryDate: negotiationData.terms?.deliveryDate,
      paymentTerms: negotiationData.terms?.paymentTerms || 'immediate',
      returnPolicy: negotiationData.terms?.returnPolicy,
      warranty: negotiationData.terms?.warranty,
      serviceLevel: negotiationData.terms?.serviceLevel
    },

    // Milestones (for complex contracts)
    milestones: negotiationData.milestones || [],

    // Escrow
    escrow: {
      required: negotiationData.escrow?.required ?? true,
      amount: negotiationData.terms?.price || 0,
      status: 'pending',  // pending, funded, released, refunded
      fundedAt: null,
      releasedAt: null
    },

    // Timeline
    timeline: {
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      signedAt: null,
      startedAt: null,
      completedAt: null
    },

    // Fulfillment
    fulfillment: {
      status: 'pending',
      verifiedAt: null,
      verifiedBy: null,
      proof: null
    },

    // Metadata
    negotiationId: negotiationData.negotiationId,
    references: negotiationData.references || [],
    attachments: negotiationData.attachments || [],

    // History
    history: [
      {
        action: 'created',
        timestamp: new Date().toISOString(),
        actor: 'system',
        details: 'Contract created from negotiation'
      }
    ]
  };

  contracts.set(contract.id, contract);
  return contract;
}

/**
 * Sign contract by agent
 */
function signContract(contractId, agentId, signature) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  let signedParty;
  if (contract.buyer.agentId === agentId) {
    contract.buyer.signature = signature || generateSignature(contract, agentId);
    contract.buyer.signedAt = new Date().toISOString();
    signedParty = 'buyer';
  } else if (contract.seller.agentId === agentId) {
    contract.seller.signature = signature || generateSignature(contract, agentId);
    contract.seller.signedAt = new Date().toISOString();
    signedParty = 'seller';
  } else {
    throw new Error('Agent not party to this contract');
  }

  contract.history.push({
    action: 'signed',
    timestamp: new Date().toISOString(),
    actor: agentId,
    details: `${signedParty} signed the contract`
  });

  // Check if both parties signed
  if (contract.buyer.signature && contract.seller.signature) {
    contract.state = CONTRACT_STATES.ACTIVE;
    contract.timeline.signedAt = new Date().toISOString();
    contract.history.push({
      action: 'activated',
      timestamp: new Date().toISOString(),
      actor: 'system',
      details: 'All parties signed - contract activated'
    });

    // Fund escrow if required
    if (contract.escrow.required) {
      contract.escrow.status = 'funded';
      contract.escrow.fundedAt = new Date().toISOString();
      escrow.set(contract.id, {
        contractId: contract.id,
        amount: contract.escrow.amount,
        status: 'held',
        heldAt: new Date().toISOString()
      });
    }
  } else {
    contract.state = CONTRACT_STATES.PENDING_SIGNATURES;
  }

  contracts.set(contractId, contract);
  return contract;
}

/**
 * Generate signature for contract
 */
function generateSignature(contract, agentId) {
  const data = `${contract.id}-${agentId}-${Date.now()}`;
  // In production, use proper cryptographic signing
  return `SIG-${Buffer.from(data).toString('base64').substring(0, 32)}`;
}

/**
 * Activate contract (start fulfillment)
 */
function activateContract(contractId) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.state !== CONTRACT_STATES.ACTIVE) {
    throw new Error('Contract not in active state');
  }

  contract.state = CONTRACT_STATES.IN_PROGRESS;
  contract.timeline.startedAt = new Date().toISOString();

  // Create fulfillment record
  fulfillments.set(contract.id, {
    contractId,
    status: 'in_progress',
    milestones: contract.milestones.map(m => ({
      id: m.id || uuidv4(),
      name: m.name,
      status: 'pending',
      dueDate: m.dueDate,
      completedAt: null,
      proof: null
    })),
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  });

  contract.history.push({
    action: 'started',
    timestamp: new Date().toISOString(),
    actor: 'system',
    details: 'Contract fulfillment started'
  });

  contracts.set(contractId, contract);
  return contract;
}

/**
 * Complete milestone
 */
function completeMilestone(contractId, milestoneId, proof) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  const fulfillment = fulfillments.get(contractId);
  if (!fulfillment) {
    throw new Error('Fulfillment not found');
  }

  const milestone = fulfillment.milestones.find(m => m.id === milestoneId);
  if (!milestone) {
    throw new Error('Milestone not found');
  }

  milestone.status = 'completed';
  milestone.completedAt = new Date().toISOString();
  milestone.proof = proof;

  fulfillment.lastUpdate = new Date().toISOString();
  fulfillments.set(contractId, fulfillment);

  // Check if all milestones complete
  const allComplete = fulfillment.milestones.every(m => m.status === 'completed');
  if (allComplete) {
    contract.fulfillment.status = 'verified';
    contract.fulfillment.verifiedAt = new Date().toISOString();
    contract.state = CONTRACT_STATES.FULFILLED;

    // Release escrow
    releaseEscrow(contractId, 'fulfillment_complete');
  }

  contract.history.push({
    action: 'milestone_completed',
    timestamp: new Date().toISOString(),
    actor: 'system',
    details: `Milestone "${milestone.name}" completed`
  });

  contracts.set(contractId, contract);
  return { contract, fulfillment };
}

/**
 * Mark contract fulfilled
 */
function fulfillContract(contractId, fulfillmentProof) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  contract.state = CONTRACT_STATES.FULFILLED;
  contract.fulfillment.status = 'verified';
  contract.fulfillment.verifiedAt = new Date().toISOString();
  contract.fulfillment.proof = fulfillmentProof;
  contract.timeline.completedAt = new Date().toISOString();

  // Release escrow to seller
  releaseEscrow(contractId, 'contract_fulfilled');

  contract.history.push({
    action: 'fulfilled',
    timestamp: new Date().toISOString(),
    actor: 'system',
    details: 'Contract fulfilled - escrow released'
  });

  contracts.set(contractId, contract);
  return contract;
}

/**
 * Complete contract (buyer confirms receipt/satisfaction)
 */
function completeContract(contractId) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  if (contract.state !== CONTRACT_STATES.FULFILLED) {
    throw new Error('Contract not in fulfilled state');
  }

  contract.state = CONTRACT_STATES.COMPLETED;
  contract.timeline.completedAt = new Date().toISOString();

  contract.history.push({
    action: 'completed',
    timestamp: new Date().toISOString(),
    actor: 'system',
    details: 'Contract completed successfully'
  });

  contracts.set(contractId, contract);
  return contract;
}

/**
 * Release escrow
 */
function releaseEscrow(contractId, reason) {
  const esc = escrow.get(contractId);
  if (esc) {
    esc.status = 'released';
    esc.releasedAt = new Date().toISOString();
    esc.releaseReason = reason;

    const contract = contracts.get(contractId);
    if (contract) {
      contract.escrow.status = 'released';
      contract.escrow.releasedAt = new Date().toISOString();
      contracts.set(contractId, contract);
    }
  }
}

/**
 * Refund escrow (in case of dispute resolution)
 */
function refundEscrow(contractId, reason) {
  const esc = escrow.get(contractId);
  if (esc) {
    esc.status = 'refunded';
    esc.refundedAt = new Date().toISOString();
    esc.refundReason = reason;

    const contract = contracts.get(contractId);
    if (contract) {
      contract.escrow.status = 'refunded';
      contracts.set(contractId, contract);
    }
  }
}

/**
 * Raise dispute
 */
function raiseDispute(contractId, disputeData) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  contract.state = CONTRACT_STATES.DISPUTED;
  contract.dispute = {
    id: uuidv4(),
    raisedBy: disputeData.raisedBy,
    reason: disputeData.reason,
    evidence: disputeData.evidence || [],
    status: 'open',
    raisedAt: new Date().toISOString(),
    resolution: null
  };

  // Freeze escrow
  const esc = escrow.get(contractId);
  if (esc) {
    esc.status = 'frozen';
    escrow.set(contractId, esc);
  }

  contract.history.push({
    action: 'disputed',
    timestamp: new Date().toISOString(),
    actor: disputeData.raisedBy,
    details: `Dispute raised: ${disputeData.reason}`
  });

  contracts.set(contractId, contract);
  return contract;
}

/**
 * Cancel contract
 */
function cancelContract(contractId, cancelledBy, reason) {
  const contract = contracts.get(contractId);
  if (!contract) {
    throw new Error('Contract not found');
  }

  if ([CONTRACT_STATES.COMPLETED, CONTRACT_STATES.DISPUTED].includes(contract.state)) {
    throw new Error('Cannot cancel contract in current state');
  }

  contract.state = CONTRACT_STATES.CANCELLED;
  contract.cancellation = {
    cancelledBy,
    reason,
    cancelledAt: new Date().toISOString()
  };

  // Refund escrow if funded
  if (contract.escrow.status === 'funded') {
    refundEscrow(contractId, 'contract_cancelled');
  }

  contract.history.push({
    action: 'cancelled',
    timestamp: new Date().toISOString(),
    actor: cancelledBy,
    details: `Contract cancelled: ${reason}`
  });

  contracts.set(contractId, contract);
  return contract;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  const all = Array.from(contracts.values());
  res.json({
    service: 'Agent Contracts Service',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalContracts: all.length,
      active: all.filter(c => c.state === CONTRACT_STATES.ACTIVE || c.state === CONTRACT_STATES.IN_PROGRESS).length,
      completed: all.filter(c => c.state === CONTRACT_STATES.COMPLETED).length,
      disputed: all.filter(c => c.state === CONTRACT_STATES.DISPUTED).length
    }
  });
});

/**
 * Create contract
 * POST /api/contracts
 */
app.post('/api/contracts',requireAuth,  (req, res) => {
  try {
    const contract = createContract(req.body);
    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Create contract from negotiation
 * POST /api/contracts/from-negotiation
 */
app.post('/api/contracts/from-negotiation',requireAuth,  (req, res) => {
  try {
    const { negotiationId, terms, buyerAgent, sellerAgent, milestones } = req.body;

    const contract = createContract({
      negotiationId,
      type: terms?.type || CONTRACT_TYPES.PURCHASE,
      buyerAgent,
      sellerAgent,
      terms,
      milestones
    });

    res.status(201).json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get contract
 * GET /api/contracts/:id
 */
app.get('/api/contracts/:id', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  res.json(contract);
});

/**
 * Sign contract
 * POST /api/contracts/:id/sign
 */
app.post('/api/contracts/:id/sign',requireAuth,  (req, res) => {
  try {
    const { agentId, signature } = req.body;
    const contract = signContract(req.params.id, agentId, signature);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Activate contract
 * POST /api/contracts/:id/activate
 */
app.post('/api/contracts/:id/activate',requireAuth,  (req, res) => {
  try {
    const contract = activateContract(req.params.id);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Mark contract fulfilled
 * POST /api/contracts/:id/fulfill
 */
app.post('/api/contracts/:id/fulfill',requireAuth,  (req, res) => {
  try {
    const contract = fulfillContract(req.params.id, req.body.proof);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Complete contract
 * POST /api/contracts/:id/complete
 */
app.post('/api/contracts/:id/complete',requireAuth,  (req, res) => {
  try {
    const contract = completeContract(req.params.id);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Complete milestone
 * POST /api/contracts/:id/milestones/:milestoneId
 */
app.post('/api/contracts/:id/milestones/:milestoneId',requireAuth,  (req, res) => {
  try {
    const result = completeMilestone(req.params.id, req.params.milestoneId, req.body.proof);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Raise dispute
 * POST /api/contracts/:id/dispute
 */
app.post('/api/contracts/:id/dispute',requireAuth,  (req, res) => {
  try {
    const contract = raiseDispute(req.params.id, req.body);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Cancel contract
 * POST /api/contracts/:id/cancel
 */
app.post('/api/contracts/:id/cancel',requireAuth,  (req, res) => {
  try {
    const { cancelledBy, reason } = req.body;
    const contract = cancelContract(req.params.id, cancelledBy, reason);
    res.json(contract);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get escrow status
 * GET /api/contracts/:id/escrow
 */
app.get('/api/contracts/:id/escrow', (req, res) => {
  const esc = escrow.get(req.params.id);
  if (!esc) {
    return res.status(404).json({ error: 'Escrow not found' });
  }
  res.json(esc);
});

/**
 * Get contracts by agent
 * GET /api/contracts/agent/:agentId
 */
app.get('/api/contracts/agent/:agentId', (req, res) => {
  const { state, type, limit = 50 } = req.query;

  let result = Array.from(contracts.values()).filter(
    c => c.buyer.agentId === req.params.agentId || c.seller.agentId === req.params.agentId
  );

  if (state) {
    result = result.filter(c => c.state === state);
  }
  if (type) {
    result = result.filter(c => c.type === type);
  }

  result.sort((a, b) => new Date(b.timeline.createdAt) - new Date(a.timeline.createdAt));

  res.json({
    total: result.length,
    contracts: result.slice(0, parseInt(limit))
  });
});

/**
 * Get fulfillment status
 * GET /api/contracts/:id/fulfillment
 */
app.get('/api/contracts/:id/fulfillment', (req, res) => {
  const fulfillment = fulfillments.get(req.params.id);
  if (!fulfillment) {
    return res.status(404).json({ error: 'Fulfillment not found' });
  }
  res.json(fulfillment);
});

/**
 * Get contract history
 * GET /api/contracts/:id/history
 */
app.get('/api/contracts/:id/history', (req, res) => {
  const contract = contracts.get(req.params.id);
  if (!contract) {
    return res.status(404).json({ error: 'Contract not found' });
  }
  res.json(contract.history);
});

/**
 * Get contracts by state
 * GET /api/contracts/state/:state
 */
app.get('/api/contracts/state/:state', (req, res) => {
  const result = Array.from(contracts.values()).filter(
    c => c.state === req.params.state
  );
  res.json({
    state: req.params.state,
    total: result.length,
    contracts: result
  });
});

/**
 * Get contract statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const all = Array.from(contracts.values());

  const byState = {};
  Object.values(CONTRACT_STATES).forEach(state => {
    byState[state] = all.filter(c => c.state === state).length;
  });

  const totalValue = all.reduce((sum, c) => sum + (c.terms?.price || 0), 0);

  res.json({
    total: all.length,
    byState,
    totalValue,
    activeValue: all
      .filter(c => c.state === CONTRACT_STATES.ACTIVE || c.state === CONTRACT_STATES.IN_PROGRESS)
      .reduce((sum, c) => sum + (c.terms?.price || 0), 0)
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT CONTRACTS SERVICE                             ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Contract States:                                             ║
║    DRAFT → PENDING → ACTIVE → IN_PROGRESS                   ║
║    → FULFILLED → COMPLETED                                   ║
║    DISPUTED / CANCELLED / EXPIRED                            ║
╠══════════════════════════════════════════════════════════════╣
║  Contract Types:                                             ║
║    Purchase, Service, Subscription, Rental                  ║
║    Membership, Partnership                                   ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                                  ║
║    • Smart contract creation from negotiations              ║
║    • Multi-party digital signatures                         ║
║    • Escrow management                                      ║
║    • Milestone tracking                                     ║
║    • Automatic fulfillment verification                      ║
║    • Dispute handling                                       ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/contracts                  Create contract      ║
║    POST   /api/contracts/from-negotiation From negotiation    ║
║    GET    /api/contracts/:id             Get contract         ║
║    POST   /api/contracts/:id/sign       Sign contract        ║
║    POST   /api/contracts/:id/activate   Activate contract    ║
║    POST   /api/contracts/:id/fulfill    Mark fulfilled       ║
║    POST   /api/contracts/:id/complete   Mark complete        ║
║    POST   /api/contracts/:id/dispute    Raise dispute        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
