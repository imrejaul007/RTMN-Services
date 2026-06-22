/**
 * Decision Routes - Make decisions based on context
 *
 * Multi-factor scoring across:
 *   - trust score (0-100) from CorpID
 *   - amount vs policy maxAmount
 *   - time-of-day / business hours
 *   - category risk (low/medium/high/critical)
 *   - action risk (read/write/transfer/admin)
 *   - reputation from trust-network
 *   - previous decisions count
 *
 * Output includes: confidence (0-1), alternatives
 * (proceed|hold|reject|escalate) with reasoning, recommendation, trade-offs.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, DECISION, RISK } from '../index.js';

const router = Router();

// External service URLs
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';
const TRUST_NETWORK_URL = process.env.TRUST_NETWORK_URL || 'http://localhost:4149';

// Action risk weight (0-1, higher = riskier)
const ACTION_RISK_WEIGHT = {
  read: 0.05,
  view: 0.05,
  list: 0.05,
  create: 0.25,
  update: 0.30,
  delete: 0.45,
  transfer: 0.70,
  payout: 0.80,
  refund: 0.55,
  approve: 0.35,
  admin: 0.85
};

// Category risk weight (0-1)
const CATEGORY_RISK_WEIGHT = {
  low: 0.10,
  standard: 0.25,
  medium: 0.50,
  high: 0.75,
  critical: 0.95
};

// Small console fallback for the warn() calls inside the file
const console_ = console;

function safeNumber(x, fallback = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Build multi-factor score breakdown.
 * Returns factors, totalScore (0-1, lower=safer), riskLevel, confidence (0-1).
 */
function scoreFactors({
  trustScore,
  amount,
  maxAmount,
  category,
  action,
  businessHours,
  reputation,
  previousDecisions
}) {
  const factors = [];

  // ---- Trust score factor (0-1, lower = safer)
  // Trust 0 → 1.0 risk; trust 100 → 0.0 risk
  const trust = safeNumber(trustScore, 50);
  const trustRisk = Math.max(0, Math.min(1, (100 - trust) / 100));
  factors.push({
    name: 'trust',
    score: trustRisk,
    weight: 0.30,
    value: trust,
    note: `Trust ${trust}/100`
  });

  // ---- Amount factor (0-1)
  // If no maxAmount, baseline 0.1; otherwise ratio capped at 1
  const amt = safeNumber(amount, 0);
  let amountRisk = 0.1;
  if (maxAmount && maxAmount > 0) {
    amountRisk = Math.max(0, Math.min(1, amt / Number(maxAmount)));
  } else {
    amountRisk = amt > 100000 ? 0.9 : amt > 10000 ? 0.5 : amt > 1000 ? 0.25 : 0.1;
  }
  factors.push({
    name: 'amount',
    score: amountRisk,
    weight: 0.25,
    value: amt,
    max: maxAmount || null,
    note: maxAmount ? `Amount ${amt} of max ${maxAmount}` : `Amount ${amt} (no cap)`
  });

  // ---- Time-of-day factor (0-1, higher outside business hours)
  let timeRisk = 0;
  const now = new Date();
  const hour = now.getUTCHours();
  if (businessHours && typeof businessHours.start === 'number') {
    const inHours = hour >= businessHours.start && hour < (businessHours.end ?? 24);
    timeRisk = inHours ? 0.05 : 0.6;
  } else {
    timeRisk = 0.05;
  }
  factors.push({
    name: 'time',
    score: timeRisk,
    weight: 0.10,
    value: `${hour}:00 UTC`,
    note: businessHours
      ? `Business hours ${businessHours.start}-${businessHours.end ?? 24}`
      : 'No business-hours restriction'
  });

  // ---- Category factor
  const cat = (category || '').toLowerCase();
  const catRisk = CATEGORY_RISK_WEIGHT[cat] != null
    ? CATEGORY_RISK_WEIGHT[cat]
    : 0.4;
  factors.push({
    name: 'category',
    score: catRisk,
    weight: 0.15,
    value: category || 'unspecified',
    note: `Category '${category || 'unspecified'}' risk weight ${catRisk}`
  });

  // ---- Action factor
  const act = (action || '').toLowerCase();
  const actionRisk = ACTION_RISK_WEIGHT[act] != null
    ? ACTION_RISK_WEIGHT[act]
    : 0.3;
  factors.push({
    name: 'action',
    score: actionRisk,
    weight: 0.10,
    value: action || 'unspecified',
    note: `Action '${action || 'unspecified'}' risk weight ${actionRisk}`
  });

  // ---- Reputation factor (0-1)
  const rep = safeNumber(reputation, 50);
  const repRisk = Math.max(0, Math.min(1, (100 - rep) / 100));
  factors.push({
    name: 'reputation',
    score: repRisk,
    weight: 0.05,
    value: rep,
    note: `Reputation ${rep}/100 from trust-network`
  });

  // ---- Previous-decisions factor (more history = slightly more trust)
  const prev = safeNumber(previousDecisions, 0);
  const historyRisk = prev > 0 ? Math.max(0, 0.2 - Math.min(prev, 20) * 0.01) : 0.3;
  factors.push({
    name: 'history',
    score: historyRisk,
    weight: 0.05,
    value: prev,
    note: `${prev} previous decisions on record`
  });

  // Weighted total
  const totalScore = factors.reduce((sum, f) => sum + f.score * f.weight, 0);

  let riskLevel = RISK.LOW;
  if (totalScore > 0.75) riskLevel = RISK.CRITICAL;
  else if (totalScore > 0.5) riskLevel = RISK.HIGH;
  else if (totalScore > 0.25) riskLevel = RISK.MEDIUM;

  // Confidence: blend of trust + amount + reputation, scaled to 0-1
  const confidence = Math.max(0, Math.min(1,
    0.4 * (trust / 100) + 0.4 * (rep / 100) + 0.2 * (1 - Math.min(amountRisk, 1))
  ));

  return { factors, totalScore, riskLevel, confidence };
}

/**
 * Build four outcome alternatives with reasoning and trade-offs.
 */
function buildAlternatives({ totalScore, confidence, factors, action, amount, trustScore }) {
  const summary = (factor) => factor.map(f => f.name).join(', ');
  const risk = totalScore;
  const alternatives = [
    {
      outcome: DECISION.PROCEED,
      score: confidence - risk * 0.5,
      reasoning: `Auto-approve. Aggregate risk ${risk.toFixed(2)}, confidence ${confidence.toFixed(2)}`,
      tradeoffs: [
        'No human review (fastest path)',
        `Relies on factors: ${summary(factors)}`
      ]
    },
    {
      outcome: DECISION.HOLD,
      score: 0.5 - Math.abs(risk - 0.5),
      reasoning: `Hold for additional checks. Aggregate risk ${risk.toFixed(2)} sits in ambiguous zone.`,
      tradeoffs: [
        'Adds latency for human review',
        'May reveal issues not captured by scoring'
      ]
    },
    {
      outcome: DECISION.ESCALATE,
      score: risk > 0.4 ? risk * 0.9 : 0.2,
      reasoning: `Escalate to senior approver given risk ${risk.toFixed(2)} for ${action || 'this action'}.`,
      tradeoffs: [
        'Requires senior reviewer availability',
        'Creates an auditable approval trail'
      ]
    },
    {
      outcome: DECISION.REJECT,
      score: risk > 0.6 ? risk : 0.1,
      reasoning: risk > 0.6
        ? `Reject: aggregate risk ${risk.toFixed(2)} exceeds safe threshold.`
        : `Reject only if policy violations; otherwise weak rejection candidate.`,
      tradeoffs: [
        'Blocks the action outright',
        `Trust ${trustScore}/100 and amount ${amount} would need reconsideration`
      ]
    }
  ];
  return alternatives;
}

/**
 * Pick the recommended outcome from the alternatives.
 */
function recommend(alternatives) {
  const best = alternatives.reduce((a, b) => (b.score > a.score ? b : a));
  return best;
}

/**
 * Make decision
 * POST /api/decisions/decide
 */
router.post('/decide', async (req, res) => {
  try {
    const { corpId, action, resource, amount, context = {}, policyId } = req.body;

    if (!corpId || !action) {
      return res.status(400).json({ error: 'corpId and action are required' });
    }

    const decisionId = `dec_${uuidv4()}`;
    const now = new Date().toISOString();

    // ---- Fetch trust score from CorpID ----
    let trustScore = 50;
    try {
      const trustRes = await fetch(`${CORPID_URL}/api/trust/score/${corpId}`);
      if (trustRes.ok) {
        const trustData = await trustRes.json();
        trustScore = safeNumber(trustData.trustScore, 50);
      }
    } catch (e) {
      console_.warn?.('Could not fetch trust score:', e.message);
    }

    // ---- Fetch reputation from trust-network ----
    let reputation = 50;
    try {
      const repRes = await fetch(`${TRUST_NETWORK_URL}/api/reputation/${corpId}`);
      if (repRes.ok) {
        const repData = await repRes.json();
        reputation = safeNumber(repData.score ?? repData.reputation, 50);
      }
    } catch (e) {
      console_.warn?.('Could not fetch reputation:', e.message);
    }

    // ---- Look up applicable policy (if provided) ----
    let policy = null;
    if (policyId) {
      const raw = await redis.get(`policy:${policyId}`);
      if (raw) policy = JSON.parse(raw);
    }

    const maxAmount = policy?.maxAmount ?? policy?.conditions?.maxAmount ?? null;
    const businessHours = policy?.businessHours ?? policy?.conditions?.businessHours ?? null;
    const category = context.category || policy?.conditions?.category || 'standard';

    // ---- Previous decisions count ----
    const prevIds = await redis.lrange(`decisions:corpId:${corpId}`, 0, 99);
    const previousDecisions = prevIds.length;

    // ---- Multi-factor scoring ----
    const { factors, totalScore, riskLevel, confidence } = scoreFactors({
      trustScore,
      amount,
      maxAmount,
      category,
      action,
      businessHours,
      reputation,
      previousDecisions
    });

    // ---- Alternatives ----
    const alternatives = buildAlternatives({
      totalScore,
      confidence,
      factors,
      action,
      amount,
      trustScore
    });
    const recommendation = recommend(alternatives);

    // ---- Policy / holds enforcement (still applies on top) ----
    const reasons = [];
    const policies = await checkPolicies(corpId, action, resource, amount);
    if (policies.violated.length > 0) {
      reasons.push(...policies.violated.map(p => `Policy violation: ${p}`));
    }

    const holds = await checkHolds(corpId);
    if (holds.length > 0) {
      reasons.push(...holds);
    }

    // ---- Determine final outcome ----
    let outcome = recommendation.outcome;
    let requiresEscalation = outcome === DECISION.ESCALATE;
    if (policies.violated.length > 0) {
      outcome = DECISION.REJECT;
      requiresEscalation = false;
    } else if (holds.length > 0) {
      outcome = DECISION.HOLD;
      requiresEscalation = true;
    } else if (totalScore > 0.85) {
      outcome = DECISION.REJECT;
    } else if (totalScore > 0.6 && outcome === DECISION.PROCEED) {
      outcome = DECISION.HOLD;
      requiresEscalation = true;
    }

    // Build decision record
    const decision = {
      id: decisionId,
      corpId,
      action,
      resource,
      amount,
      outcome,
      riskLevel,
      trustScore,
      reputation,
      category,
      policyId: policyId || null,
      confidence: Number(confidence.toFixed(3)),
      riskScore: Number(totalScore.toFixed(3)),
      factors,
      alternatives,
      recommendation: {
        outcome: recommendation.outcome,
        score: Number(recommendation.score.toFixed(3)),
        reasoning: recommendation.reasoning,
        tradeoffs: recommendation.tradeoffs
      },
      reasons,
      requiresEscalation,
      context,
      decisionBy: 'system',
      createdAt: now
    };

    // Persist (storage abstraction falls back to in-memory automatically)
    await redis.set(`decision:${decisionId}`, JSON.stringify(decision));
    await redis.lpush(`decisions:corpId:${corpId}`, decisionId);
    await redis.ltrim(`decisions:corpId:${corpId}`, 0, 99);

    // Audit
    await redis.lpush('audit:log', JSON.stringify({
      kind: 'decision',
      decisionId,
      corpId,
      policyId: policyId || null,
      result: decision,
      at: now
    }));
    await redis.ltrim('audit:log', 0, 999);

    res.json(decision);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Check policies
 */
async function checkPolicies(corpId, action, resource, amount) {
  const violated = [];

  // Get policies for this entity
  const policyIds = await redis.smembers(`policies:entity:${corpId}`);

  for (const policyId of policyIds) {
    const policy = await redis.get(`policy:${policyId}`);
    if (policy) {
      const p = JSON.parse(policy);

      // Check if action matches
      if (p.action === action || p.action === '*') {
        // Check conditions
        if (p.maxAmount && amount > p.maxAmount) {
          violated.push(`${p.name}: max amount ${p.maxAmount} exceeded`);
        }
      }
    }
  }

  return { violated };
}

/**
 * Check holds
 */
async function checkHolds(corpId) {
  const holds = [];
  const holdIds = await redis.smembers(`holds:entity:${corpId}`);

  for (const holdId of holdIds) {
    const hold = await redis.get(`hold:${holdId}`);
    if (hold) {
      const h = JSON.parse(hold);
      if (h.status === 'active') {
        holds.push(`${h.type}: ${h.reason}`);
      }
    }
  }

  return holds;
}

/**
 * Get decision by ID
 * GET /api/decisions/:decisionId
 */
router.get('/:decisionId', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const decision = await redis.get(`decision:${decisionId}`);

    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    res.json(JSON.parse(decision));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get decisions for entity
 * GET /api/decisions/entity/:corpId
 */
router.get('/entity/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { limit = 20 } = req.query;

    const decisionIds = await redis.lrange(`decisions:corpId:${corpId}`, 0, parseInt(limit) - 1);
    const decisions = [];

    for (const id of decisionIds) {
      const decision = await redis.get(`decision:${id}`);
      if (decision) {
        decisions.push(JSON.parse(decision));
      }
    }

    res.json({ decisions, total: decisions.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Appeal decision
 * POST /api/decisions/:decisionId/appeal
 */
router.post('/:decisionId/appeal', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { reason, supportingDocs = [] } = req.body;

    const decision = await redis.get(`decision:${decisionId}`);
    if (!decision) {
      return res.status(404).json({ error: 'Decision not found' });
    }

    const parsed = JSON.parse(decision);

    const appeal = {
      id: `appeal_${uuidv4()}`,
      decisionId,
      corpId: parsed.corpId,
      reason,
      supportingDocs,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await redis.set(`appeal:${appeal.id}`, JSON.stringify(appeal));
    await redis.sadd(`appeals:corpId:${parsed.corpId}`, appeal.id);

    await redis.lpush('audit:log', JSON.stringify({
      kind: 'appeal',
      appealId: appeal.id,
      decisionId,
      corpId: parsed.corpId,
      at: appeal.createdAt
    }));
    await redis.ltrim('audit:log', 0, 999);

    res.status(201).json(appeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;