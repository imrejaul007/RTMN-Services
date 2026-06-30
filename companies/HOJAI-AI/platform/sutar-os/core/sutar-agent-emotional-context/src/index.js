/**
 * SUTAR Agent Emotional Context - v1.0.0
 * =======================================
 * Emotional intelligence for AI agent negotiations.
 *
 * Port: 4850
 *
 * Provides:
 * - Agent emotional state tracking
 * - Negotiation context analysis
 * - Trust evolution in agent relationships
 * - Strategy recommendations
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4850;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const agents = new Map();           // agentId -> AgentProfile
const relationships = new Map();    // `${agentId}:${counterpartId}` -> Relationship
const negotiations = new Map();     // negotiationId -> Negotiation
const interactions = new Map();      // agentId -> Interaction[]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function getRelationshipKey(agentId, counterpartId) {
  return `${agentId}:${counterpartId}`;
}

function calculateTrustScore(history) {
  if (history.length === 0) return 0.5; // Neutral start

  const positive = history.filter(i => i.outcome === 'success' || i.outcome === 'accepted').length;
  const negative = history.filter(i => i.outcome === 'rejected' || i.outcome === 'failed').length;

  const baseScore = positive / (positive + negative + 1);
  const recencyBonus = history.length > 5 ? 0.1 : 0;

  return Math.min(1, baseScore + recencyBonus);
}

function analyzeEmotionalState(context) {
  const state = {
    confidence: 0.8,
    stress: 0.2,
    trust: 0.7,
    urgency: context.urgency || 0.5,
    cooperation: 0.8
  };

  // Adjust based on negotiation phase
  if (context.phase === 'opening') {
    state.confidence = 0.7;
    state.trust = 0.6;
  } else if (context.phase === 'closing') {
    state.urgency = 0.8;
    state.cooperation = 0.9;
  } else if (context.phase === 'impasse') {
    state.stress = 0.6;
    state.confidence = 0.5;
  }

  return state;
}

function getNegotiationStrategy(type, agentState, counterpartState) {
  const strategies = {
    price: {
      aggressive: { style: 'competitive', concessions: 0.1, anchors: 'low' },
      balanced: { style: 'collaborative', concessions: 0.2, anchors: 'market' },
      conservative: { style: 'accommodating', concessions: 0.15, anchors: 'high' }
    },
    partnership: {
      aggressive: { style: 'competitive', concessions: 0.05, anchors: 'favorable' },
      balanced: { style: 'collaborative', concessions: 0.25, anchors: 'fair' },
      conservative: { style: 'principled', concessions: 0.3, anchors: 'consensus' }
    },
    default: {
      aggressive: { style: 'competitive', concessions: 0.1, anchors: 'low' },
      balanced: { style: 'collaborative', concessions: 0.2, anchors: 'market' },
      conservative: { style: 'accommodating', concessions: 0.15, anchors: 'high' }
    }
  };

  // Determine aggressiveness based on trust
  const avgTrust = (agentState.trust + counterpartState.trust) / 2;
  let aggressiveness = 'balanced';

  if (avgTrust < 0.4) aggressiveness = 'aggressive';
  else if (avgTrust > 0.8) aggressiveness = 'conservative';

  const strategySet = strategies[type] || strategies.default;

  return {
    ...strategySet[aggressiveness],
    aggressiveness,
    recommendedTone: avgTrust > 0.7 ? 'warm' : avgTrust > 0.4 ? 'professional' : 'formal',
    patienceLevel: avgTrust > 0.7 ? 'high' : 'medium'
  };
}

function predictCounterpartBehavior(relationship, context) {
  const predictions = {
    likelihood: 0.7,
    likelyAction: 'counter',
    confidence: 0.6,
    reasoning: []
  };

  // Adjust based on relationship history
  if (relationship.history.length > 10) {
    const successRate = relationship.history.filter(h => h.outcome === 'success').length / relationship.history.length;
    predictions.likelihood = successRate;
    predictions.confidence = 0.8;
    predictions.reasoning.push(`Based on ${relationship.history.length} previous interactions`);
  }

  // Adjust based on trust
  if (relationship.trust < 0.4) {
    predictions.likelyAction = 'reject';
    predictions.reasoning.push('Low trust suggests rejection likely');
  } else if (relationship.trust > 0.8) {
    predictions.likelyAction = 'accept';
    predictions.reasoning.push('High trust suggests acceptance likely');
  }

  return predictions;
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT PROFILES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /agent/register - Register an agent
 */
app.post('/agent/register', (req, res) => {
  const { agentId, type, name, capabilities, preferences } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: 'agentId required' });
  }

  const agent = {
    id: agentId,
    type: type || 'general',  // 'procurement', 'sales', 'partner', 'customer'
    name: name || agentId,
    capabilities: capabilities || [],
    preferences: preferences || {},
    emotionalState: { confidence: 0.8, stress: 0.1, trust: 0.7 },
    totalNegotiations: 0,
    successRate: 0.5,
    registeredAt: new Date().toISOString()
  };

  agents.set(agentId, agent);

  res.json({
    success: true,
    agent
  });
});

/**
 * GET /agent/:agentId - Get agent profile
 */
app.get('/agent/:agentId', (req, res) => {
  const { agentId } = req.params;
  const agent = agents.get(agentId);

  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }

  res.json({ agent });
});

// ─────────────────────────────────────────────────────────────────────────────
// EMOTIONAL CONTEXT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /agent/emotional-context - Get emotional context for negotiation
 */
app.post('/agent/emotional-context', (req, res) => {
  const { agentId, counterpartId, negotiationType, phase } = req.body;

  if (!agentId || !negotiationType) {
    return res.status(400).json({ error: 'agentId and negotiationType required' });
  }

  // Get or create agent
  let agent = agents.get(agentId);
  if (!agent) {
    agent = {
      id: agentId,
      type: 'general',
      emotionalState: { confidence: 0.8, stress: 0.1, trust: 0.7 }
    };
    agents.set(agentId, agent);
  }

  // Get or create relationship
  const relKey = getRelationshipKey(agentId, counterpartId || 'anonymous');
  let relationship = relationships.get(relKey);

  if (!relationship) {
    relationship = {
      agentId,
      counterpartId: counterpartId || 'anonymous',
      trust: 0.5,
      history: [],
      createdAt: new Date().toISOString()
    };
    relationships.set(relKey, relationship);
  }

  // Analyze emotional states
  const agentContext = { phase: phase || 'general', urgency: 0.5 };
  const counterpartContext = { phase: phase || 'general', urgency: 0.5 };

  const agentState = analyzeEmotionalState(agentContext);
  const counterpartState = counterpartId
    ? analyzeEmotionalState(counterpartContext)
    : { confidence: 0.5, stress: 0.3, trust: 0.5, urgency: 0.5, cooperation: 0.6 };

  // Get strategy recommendation
  const strategy = getNegotiationStrategy(negotiationType, agentState, counterpartState);

  // Predict counterpart behavior
  const predictions = predictCounterpartBehavior(relationship, agentContext);

  res.json({
    agentId,
    counterpartId: counterpartId || 'anonymous',
    negotiationType,
    phase: phase || 'general',
    emotionalState: {
      agent: agentState,
      counterpart: counterpartState
    },
    relationship: {
      trust: relationship.trust,
      historyLength: relationship.history.length
    },
    strategy,
    predictions,
    recommendations: generateRecommendations(strategy, agentState, counterpartState)
  });
});

/**
 * POST /agent/state - Update agent emotional state
 */
app.post('/agent/state', (req, res) => {
  const { agentId, state } = req.body;

  if (!agentId || !state) {
    return res.status(400).json({ error: 'agentId and state required' });
  }

  let agent = agents.get(agentId);
  if (!agent) {
    agent = { id: agentId, emotionalState: {} };
    agents.set(agentId, agent);
  }

  agent.emotionalState = {
    ...agent.emotionalState,
    ...state,
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    emotionalState: agent.emotionalState
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// INTERACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /agent/interaction - Record an interaction
 */
app.post('/agent/interaction', (req, res) => {
  const { agentId, counterpartId, type, outcome, trustImpact, value } = req.body;

  if (!agentId || !type) {
    return res.status(400).json({ error: 'agentId and type required' });
  }

  const interaction = {
    id: uuidv4(),
    agentId,
    counterpartId: counterpartId || 'anonymous',
    type,  // 'counter_offer', 'acceptance', 'rejection', 'proposal'
    outcome: outcome || 'pending',  // 'success', 'rejected', 'failed', 'accepted'
    trustImpact: trustImpact || 0,
    value: value || 0,
    timestamp: new Date().toISOString()
  };

  // Store interaction
  if (!interactions.has(agentId)) interactions.set(agentId, []);
  interactions.get(agentId).push(interaction);

  // Update relationship
  const relKey = getRelationshipKey(agentId, counterpartId || 'anonymous');
  let relationship = relationships.get(relKey);

  if (!relationship) {
    relationship = {
      agentId,
      counterpartId: counterpartId || 'anonymous',
      trust: 0.5,
      history: [],
      createdAt: new Date().toISOString()
    };
    relationships.set(relKey, relationship);
  }

  relationship.history.push({
    type,
    outcome,
    trustImpact,
    timestamp: interaction.timestamp
  });

  // Update trust score
  relationship.trust = calculateTrustScore(relationship.history);

  // Update agent stats
  const agent = agents.get(agentId);
  if (agent) {
    agent.totalNegotiations++;
    const successes = relationship.history.filter(h => h.outcome === 'success' || h.outcome === 'accepted').length;
    agent.successRate = successes / agent.totalNegotiations;
  }

  res.json({
    success: true,
    interaction,
    relationship: {
      trust: relationship.trust,
      totalInteractions: relationship.history.length
    }
  });
});

/**
 * GET /agent/trust/:agentId - Get trust history
 */
app.get('/agent/trust/:agentId', (req, res) => {
  const { agentId } = req.params;

  const agentInteractions = interactions.get(agentId) || [];
  const agentRelationships = [];

  relationships.forEach((rel, key) => {
    if (key.startsWith(`${agentId}:`)) {
      agentRelationships.push({
        counterpartId: rel.counterpartId,
        trust: rel.trust,
        interactions: rel.history.length
      });
    }
  });

  res.json({
    agentId,
    relationships: agentRelationships,
    totalInteractions: agentInteractions.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NEGOTIATION STRATEGY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /agent/strategy - Get negotiation strategy
 */
app.post('/agent/strategy', (req, res) => {
  const { agentId, counterpartId, negotiationType, context } = req.body;

  if (!agentId || !counterpartId) {
    return res.status(400).json({ error: 'agentId and counterpartId required' });
  }

  const relKey = getRelationshipKey(agentId, counterpartId);
  const relationship = relationships.get(relKey);

  const agentState = analyzeEmotionalState({ ...context, phase: context?.phase || 'general' });
  const counterpartState = analyzeEmotionalState({ ...context, phase: context?.phase || 'general' });

  if (relationship) {
    agentState.trust = relationship.trust;
  }

  const strategy = getNegotiationStrategy(
    negotiationType || 'default',
    agentState,
    counterpartState
  );

  res.json({
    agentId,
    counterpartId,
    negotiationType: negotiationType || 'default',
    agentState,
    counterpartState,
    strategy,
    previousNegotiations: relationship?.history.length || 0
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PREDICTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /agent/predict - Predict agent behavior
 */
app.post('/agent/predict', (req, res) => {
  const { agentId, situation } = req.body;

  if (!agentId || !situation) {
    return res.status(400).json({ error: 'agentId and situation required' });
  }

  const agent = agents.get(agentId);
  const agentState = agent?.emotionalState || { confidence: 0.7, stress: 0.3, trust: 0.6 };

  const predictions = {
    action: 'counter',
    confidence: 0.6,
    reasoning: []
  };

  // Analyze situation
  if (situation.includes('offer') || situation.includes('proposal')) {
    if (agentState.confidence > 0.8) {
      predictions.action = 'accept';
      predictions.reasoning.push('High confidence suggests acceptance');
    } else if (agentState.stress > 0.6) {
      predictions.action = 'delay';
      predictions.reasoning.push('High stress suggests delay');
    }
  }

  if (situation.includes('deadline') || situation.includes('urgent')) {
    predictions.confidence = 0.8;
    predictions.reasoning.push('Deadline pressure increases prediction confidence');
  }

  res.json({
    agentId,
    situation,
    predictions,
    agentState
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

function generateRecommendations(strategy, agentState, counterpartState) {
  const recommendations = [];

  // Tone recommendations
  if (strategy.recommendedTone === 'warm') {
    recommendations.push({
      type: 'tone',
      priority: 'high',
      message: 'Use warm, friendly language to build rapport'
    });
  } else if (strategy.recommendedTone === 'professional') {
    recommendations.push({
      type: 'tone',
      priority: 'medium',
      message: 'Maintain professional, business-focused communication'
    });
  }

  // Trust recommendations
  if (agentState.trust < 0.4) {
    recommendations.push({
      type: 'trust',
      priority: 'high',
      message: 'Prioritize building trust before making requests'
    });
  }

  // Patience recommendations
  if (strategy.patienceLevel === 'high') {
    recommendations.push({
      type: 'patience',
      priority: 'medium',
      message: 'Show patience and be willing to wait for responses'
    });
  }

  // Concession recommendations
  recommendations.push({
    type: 'concession',
    priority: 'medium',
    message: `Consider ${strategy.concessions * 100}% concessions if needed`
  });

  return recommendations;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sutar-agent-emotional-context',
    port: PORT,
    agents: agents.size,
    relationships: relationships.size
  });
});

app.listen(PORT, () => {
  console.log(`SUTAR Agent Emotional Context running on port ${PORT}`);
});

export default app;
