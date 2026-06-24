const cors = require('cors');
const helmet = require('helmet');
/**
 * ACP Protocol - Agent Commerce Protocol
 *
 * Standardized messaging layer for AI-to-AI commerce negotiations.
 * Enables autonomous agents to discover, negotiate, and transact.
 *
 * Message Types:
 * - QUERY: Request information about a product/service
 * - QUOTE: Provide pricing/availability
 * - COUNTER: Counter-offer during negotiation
 * - ACCEPT: Accept current terms
 * - REJECT: Reject current terms
 * - ORDER: Place an order with agreed terms
 * - TRACK: Track order status
 * - DISPUTE: Raise a dispute
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
setupSecurity(app, { serviceName: 'acp-protocol' });

const PORT = process.env.PORT || 4800;

// In-memory message store (replace with Redis/MongoDB in production)
const messages = new PersistentMap('messages', { serviceName: 'acp-protocol' });
const negotiations = new PersistentMap('negotiations', { serviceName: 'acp-protocol' });
const messageQueue = new PersistentMap('message-queue', { serviceName: 'acp-protocol' });

// Message type definitions with their expected fields
const MESSAGE_TYPES = {
  QUERY: {
    required: ['sender', 'receiver', 'intent', 'context'],
    optional: ['constraints', 'timeline', 'attachments'],
    nextValid: ['QUOTE', 'REJECT']
  },
  QUOTE: {
    required: ['sender', 'receiver', 'offer', 'terms'],
    optional: ['validUntil', 'alternatives', 'negotiableFields'],
    nextValid: ['COUNTER', 'ACCEPT', 'REJECT', 'ORDER']
  },
  COUNTER: {
    required: ['sender', 'receiver', 'counterOffer', 'reasoning'],
    optional: ['concessions', 'deadline', 'conditions'],
    nextValid: ['COUNTER', 'ACCEPT', 'REJECT', 'ORDER']
  },
  ACCEPT: {
    required: ['sender', 'receiver', 'acceptedTerms', 'contractId'],
    optional: ['signature', 'guarantee'],
    nextValid: ['ORDER', 'TRACK', 'DISPUTE']
  },
  REJECT: {
    required: ['sender', 'receiver', 'reason'],
    optional: ['alternativeOffers', 'redirect'],
    nextValid: ['QUERY', 'NEW_NEGOTIATION']
  },
  ORDER: {
    required: ['sender', 'receiver', 'orderDetails', 'contractId'],
    optional: ['deliveryAddress', 'paymentTerms', 'priority'],
    nextValid: ['TRACK', 'DISPUTE', 'REJECT']
  },
  TRACK: {
    required: ['sender', 'receiver', 'orderId'],
    optional: ['milestones', 'eta', 'proofOfDelivery'],
    nextValid: ['TRACK', 'DISPUTE', 'ACCEPT']
  },
  DISPUTE: {
    required: ['sender', 'receiver', 'orderId', 'reason', 'evidence'],
    optional: ['desiredResolution', 'refundAmount'],
    nextValid: ['RESOLVE', 'ESCALATE', 'ARBITRATE']
  }
};

// Negotiation states
const NEGOTIATION_STATES = {
  INITIATED: 'initiated',
  QUERY_SENT: 'query_sent',
  QUOTE_RECEIVED: 'quote_received',
  NEGOTIATING: 'negotiating',
  COUNTERED: 'countered',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ORDER_PLACED: 'order_placed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DISPUTED: 'disputed',
  CANCELLED: 'cancelled'
};

/**
 * Create a new ACP message
 */
function createMessage(type, payload) {
  const messageType = MESSAGE_TYPES[type];
  if (!messageType) {
    throw new Error(`Invalid message type: ${type}`);
  }

  // Validate required fields
  const missing = messageType.required.filter(field => !payload[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  const message = {
    id: uuidv4(),
    type,
    timestamp: new Date().toISOString(),
    status: 'pending',
    ...payload
  };

  messages.set(message.id, message);
  return message;
}

/**
 * Create a new negotiation session
 */
function createNegotiation(buyerAgent, sellerAgent, context) {
  const negotiation = {
    id: uuidv4(),
    buyerAgent,
    sellerAgent,
    context,
    state: NEGOTIATION_STATES.INITIATED,
    messages: [],
    currentOffer: null,
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };

  negotiations.set(negotiation.id, negotiation);
  return negotiation;
}

/**
 * Process incoming message and update negotiation state
 */
function processMessage(message) {
  const negotiation = negotiations.get(message.negotiationId);
  if (!negotiation) {
    throw new Error(`Negotiation not found: ${message.negotiationId}`);
  }

  // Validate message type transition
  const currentState = negotiation.state;
  const messageType = MESSAGE_TYPES[message.type];

  // Add to negotiation history
  negotiation.messages.push({
    messageId: message.id,
    type: message.type,
    timestamp: message.timestamp,
    sender: message.sender,
    summary: getMessageSummary(message)
  });

  negotiation.history.push({
    state: currentState,
    action: message.type,
    timestamp: message.timestamp,
    sender: message.sender
  });

  // Update negotiation state based on message type
  switch (message.type) {
    case 'QUERY':
      negotiation.state = NEGOTIATION_STATES.QUERY_SENT;
      break;
    case 'QUOTE':
      negotiation.state = NEGOTIATION_STATES.QUOTE_RECEIVED;
      negotiation.currentOffer = message.offer;
      break;
    case 'COUNTER':
      negotiation.state = NEGOTIATION_STATES.COUNTERED;
      negotiation.currentOffer = message.counterOffer;
      break;
    case 'ACCEPT':
      negotiation.state = NEGOTIATION_STATES.ACCEPTED;
      negotiation.acceptedTerms = message.acceptedTerms;
      break;
    case 'REJECT':
      negotiation.state = NEGOTIATION_STATES.REJECTED;
      negotiation.rejectionReason = message.reason;
      break;
    case 'ORDER':
      negotiation.state = NEGOTIATION_STATES.ORDER_PLACED;
      negotiation.orderDetails = message.orderDetails;
      break;
    case 'TRACK':
      negotiation.state = NEGOTIATION_STATES.IN_PROGRESS;
      negotiation.tracking = message;
      break;
    case 'DISPUTE':
      negotiation.state = NEGOTIATION_STATES.DISPUTED;
      negotiation.dispute = message;
      break;
  }

  negotiation.updatedAt = new Date().toISOString();
  negotiations.set(negotiation.id, negotiation);

  // Queue message for receiver
  queueMessage(message);

  return negotiation;
}

/**
 * Get human-readable summary of a message
 */
function getMessageSummary(message) {
  switch (message.type) {
    case 'QUERY':
      return `QUERY: ${message.intent}`;
    case 'QUOTE':
      return `QUOTE: $${message.offer?.price || 'TBD'} for ${message.terms?.product || 'item'}`;
    case 'COUNTER':
      return `COUNTER: $${message.counterOffer?.price || 'TBD'}`;
    case 'ACCEPT':
      return `ACCEPTED: Terms agreed`;
    case 'REJECT':
      return `REJECTED: ${message.reason}`;
    case 'ORDER':
      return `ORDER: #${message.orderDetails?.id || 'N/A'}`;
    case 'TRACK':
      return `TRACK: Status update`;
    case 'DISPUTE':
      return `DISPUTE: ${message.reason}`;
    default:
      return `${message.type}`;
  }
}

/**
 * Queue message for delivery to receiver agent
 */
function queueMessage(message) {
  const receiver = message.receiver;
  if (!messageQueue.has(receiver)) {
    messageQueue.set(receiver, []);
  }
  messageQueue.get(receiver).push({
    messageId: message.id,
    negotiationId: message.negotiationId,
    type: message.type,
    timestamp: message.timestamp,
    summary: getMessageSummary(message)
  });
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({
    service: 'ACP Protocol',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      messages: messages.size,
      negotiations: negotiations.size,
      queuedMessages: messageQueue.size
    }
  });
});

/**
 * Get ACP Protocol info
 */
app.get('/info', (req, res) => {
  res.json({
    name: 'Agent Commerce Protocol',
    version: '1.0.0',
    description: 'Standardized messaging for AI-to-AI commerce negotiations',
    messageTypes: Object.keys(MESSAGE_TYPES),
    states: Object.values(NEGOTIATION_STATES)
  });
});

/**
 * Create a new negotiation
 * POST /api/negotiations
 */
app.post('/api/negotiations',requireAuth,  (req, res) => {
  try {
    const { buyerAgent, sellerAgent, context, initialQuery } = req.body;

    if (!buyerAgent || !sellerAgent) {
      return res.status(400).json({ error: 'buyerAgent and sellerAgent are required' });
    }

    const negotiation = createNegotiation(buyerAgent, sellerAgent, context);

    // If initial query provided, send it
    if (initialQuery) {
      const query = createMessage('QUERY', {
        sender: buyerAgent,
        receiver: sellerAgent,
        intent: initialQuery.intent || 'inquiry',
        context: initialQuery.context || context,
        constraints: initialQuery.constraints,
        negotiationId: negotiation.id
      });

      processMessage(query);
      negotiation.initialQueryId = query.id;
    }

    res.status(201).json(negotiation);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get negotiation by ID
 * GET /api/negotiations/:id
 */
app.get('/api/negotiations/:id', (req, res) => {
  const negotiation = negotiations.get(req.params.id);
  if (!negotiation) {
    return res.status(404).json({ error: 'Negotiation not found' });
  }
  res.json(negotiation);
});

/**
 * Get all negotiations for an agent
 * GET /api/negotiations/agent/:agentId
 */
app.get('/api/negotiations/agent/:agentId', (req, res) => {
  const agentId = req.params.agentId;
  const agentNegotiations = Array.from(negotiations.values()).filter(
    n => n.buyerAgent === agentId || n.sellerAgent === agentId
  );
  res.json(agentNegotiations);
});

/**
 * Send a message in a negotiation
 * POST /api/negotiations/:id/messages
 */
app.post('/api/negotiations/:id/messages',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { type, ...payload } = req.body;

    if (!type || !MESSAGE_TYPES[type]) {
      return res.status(400).json({
        error: 'Invalid message type',
        validTypes: Object.keys(MESSAGE_TYPES)
      });
    }

    const message = createMessage(type, {
      ...payload,
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(message);

    res.status(201).json({
      message,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Send a QUOTE (from seller to buyer)
 * POST /api/negotiations/:id/quote
 */
app.post('/api/negotiations/:id/quote',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { offer, terms, validUntil, alternatives, negotiableFields } = req.body;

    const quote = createMessage('QUOTE', {
      sender: negotiation.sellerAgent,
      receiver: negotiation.buyerAgent,
      offer: {
        price: offer?.price,
        quantity: offer?.quantity || 1,
        currency: offer?.currency || 'USD',
        unit: offer?.unit || 'each'
      },
      terms: {
        product: terms?.product || negotiation.context?.product,
        deliveryDate: terms?.deliveryDate,
        warranty: terms?.warranty,
        paymentTerms: terms?.paymentTerms || 'net_30'
      },
      validUntil: validUntil || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      alternatives,
      negotiableFields: negotiableFields || ['price', 'quantity', 'delivery'],
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(quote);

    res.status(201).json({
      message: quote,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Send a COUNTER (counter-offer)
 * POST /api/negotiations/:id/counter
 */
app.post('/api/negotiations/:id/counter',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { counterOffer, reasoning, concessions, deadline, conditions } = req.body;

    const counter = createMessage('COUNTER', {
      sender: negotiation.buyerAgent,
      receiver: negotiation.sellerAgent,
      counterOffer: {
        price: counterOffer?.price,
        quantity: counterOffer?.quantity,
        deliveryDate: counterOffer?.deliveryDate
      },
      reasoning: reasoning || 'Price adjustment request',
      concessions,
      deadline,
      conditions,
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(counter);

    res.status(201).json({
      message: counter,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Accept current terms
 * POST /api/negotiations/:id/accept
 */
app.post('/api/negotiations/:id/accept',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { signature, guarantee } = req.body;

    const accept = createMessage('ACCEPT', {
      sender: negotiation.buyerAgent,
      receiver: negotiation.sellerAgent,
      acceptedTerms: negotiation.currentOffer || negotiation.context,
      contractId: `CONTRACT-${negotiation.id.substring(0, 8)}`,
      signature,
      guarantee,
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(accept);

    res.status(201).json({
      message: accept,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Reject negotiation
 * POST /api/negotiations/:id/reject
 */
app.post('/api/negotiations/:id/reject',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { reason, alternativeOffers, redirect } = req.body;

    const reject = createMessage('REJECT', {
      sender: negotiation.buyerAgent,
      receiver: negotiation.sellerAgent,
      reason: reason || 'Terms not acceptable',
      alternativeOffers,
      redirect,
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(reject);

    res.status(201).json({
      message: reject,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Place order
 * POST /api/negotiations/:id/order
 */
app.post('/api/negotiations/:id/order',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.state !== NEGOTIATION_STATES.ACCEPTED) {
      return res.status(400).json({
        error: 'Cannot place order without accepted terms',
        currentState: negotiation.state,
        requiredState: NEGOTIATION_STATES.ACCEPTED
      });
    }

    const { deliveryAddress, paymentTerms, priority } = req.body;

    const order = createMessage('ORDER', {
      sender: negotiation.buyerAgent,
      receiver: negotiation.sellerAgent,
      orderDetails: {
        id: `ORD-${Date.now()}`,
        items: [{
          product: negotiation.context?.product,
          quantity: negotiation.currentOffer?.quantity || 1,
          price: negotiation.currentOffer?.price,
          terms: negotiation.acceptedTerms
        }],
        total: negotiation.currentOffer?.price,
        currency: negotiation.currentOffer?.currency || 'USD',
        status: 'confirmed'
      },
      contractId: negotiation.acceptedTerms?.contractId,
      deliveryAddress,
      paymentTerms: paymentTerms || negotiation.acceptedTerms?.paymentTerms,
      priority: priority || 'standard',
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(order);

    res.status(201).json({
      message: order,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Track order status
 * POST /api/negotiations/:id/track
 */
app.post('/api/negotiations/:id/track',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { milestones, eta, proofOfDelivery } = req.body;

    const track = createMessage('TRACK', {
      sender: negotiation.sellerAgent,
      receiver: negotiation.buyerAgent,
      orderId: negotiation.orderDetails?.id,
      milestones: milestones || getDefaultMilestones(),
      eta,
      proofOfDelivery,
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(track);

    res.status(201).json({
      message: track,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Raise a dispute
 * POST /api/negotiations/:id/dispute
 */
app.post('/api/negotiations/:id/dispute',requireAuth,  (req, res) => {
  try {
    const negotiation = negotiations.get(req.params.id);
    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    const { reason, evidence, desiredResolution, refundAmount } = req.body;

    const dispute = createMessage('DISPUTE', {
      sender: negotiation.buyerAgent,
      receiver: negotiation.sellerAgent,
      orderId: negotiation.orderDetails?.id,
      reason: reason || 'Issue with order',
      evidence: evidence || [],
      desiredResolution: desiredResolution || 'refund',
      refundAmount,
      negotiationId: negotiation.id
    });

    const updatedNegotiation = processMessage(dispute);

    res.status(201).json({
      message: dispute,
      negotiation: updatedNegotiation
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get queued messages for an agent
 * GET /api/messages/:agentId
 */
app.get('/api/messages/:agentId', (req, res) => {
  const queued = messageQueue.get(req.params.agentId) || [];
  res.json(queued);
});

/**
 * Mark message as read
 * DELETE /api/messages/:agentId/:messageId
 */
app.delete('/api/messages/:agentId/:messageId',requireAuth,  (req, res) => {
  const { agentId, messageId } = req.params;
  const queue = messageQueue.get(agentId) || [];
  const filtered = queue.filter(m => m.messageId !== messageId);
  messageQueue.set(agentId, filtered);
  res.json({ success: true });
});

/**
 * Get message by ID
 * GET /api/messages/detail/:id
 */
app.get('/api/messages/detail/:id', (req, res) => {
  const message = messages.get(req.params.id);
  if (!message) {
    return res.status(404).json({ error: 'Message not found' });
  }
  res.json(message);
});

/**
 * Get protocol statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const stateCounts = {};
  Object.values(NEGOTIATION_STATES).forEach(state => {
    stateCounts[state] = 0;
  });

  negotiations.forEach(n => {
    stateCounts[n.state] = (stateCounts[n.state] || 0) + 1;
  });

  res.json({
    totalMessages: messages.size,
    totalNegotiations: negotiations.size,
    byState: stateCounts,
    queuedDeliveries: Array.from(messageQueue.entries()).map(([agent, msgs]) => ({
      agent,
      count: msgs.length
    }))
  });
});

// Default order milestones
function getDefaultMilestones() {
  return [
    { name: 'Order Confirmed', status: 'completed', timestamp: new Date().toISOString() },
    { name: 'Processing', status: 'pending', timestamp: null },
    { name: 'Shipped', status: 'pending', timestamp: null },
    { name: 'In Transit', status: 'pending', timestamp: null },
    { name: 'Delivered', status: 'pending', timestamp: null }
  ];
}

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           ACP PROTOCOL - Agent Commerce Protocol             ║
║                    Version 1.0.0                              ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Message Types:                                               ║
║    QUERY  → Request product/service information               ║
║    QUOTE  → Provide pricing and terms                        ║
║    COUNTER→ Counter-offer during negotiation                 ║
║    ACCEPT → Accept current terms                            ║
║    REJECT → Reject current terms                            ║
║    ORDER  → Place order with agreed terms                   ║
║    TRACK  → Track order status                              ║
║    DISPUTE→ Raise a dispute                                ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/negotiations         Create negotiation       ║
║    GET    /api/negotiations/:id     Get negotiation          ║
║    POST   /api/negotiations/:id/quote    Send quote          ║
║    POST   /api/negotiations/:id/counter  Send counter       ║
║    POST   /api/negotiations/:id/accept   Accept terms        ║
║    POST   /api/negotiations/:id/reject   Reject terms        ║
║    POST   /api/negotiations/:id/order    Place order         ║
║    POST   /api/negotiations/:id/track    Track order         ║
║    POST   /api/negotiations/:id/dispute  Raise dispute       ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

module.exports = app;
