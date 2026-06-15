/**
 * Decision Routes - Make decisions based on context
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, DECISION, RISK } from '../index.js';

const router = Router();

// External service URLs
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

/**
 * Make decision
 * POST /api/decisions/decide
 */
router.post('/decide', async (req, res) => {
  try {
    const { corpId, action, resource, amount, context = {} } = req.body;

    if (!corpId || !action) {
      return res.status(400).json({ error: 'corpId and action are required' });
    }

    const decisionId = `dec_${uuidv4()}`;
    const now = new Date().toISOString();

    // Get trust score from CorpID
    let trustScore = 50;
    let riskLevel = RISK.MEDIUM;

    try {
      const trustRes = await fetch(`${CORPID_URL}/api/trust/score/${corpId}`);
      if (trustRes.ok) {
        const trustData = await trustRes.json();
        trustScore = trustData.trustScore || 50;
      }
    } catch (e) {
      logger?.warn('Could not fetch trust score:', e.message);
    }

    // Calculate risk
    if (amount) {
      if (amount > 100000) riskLevel = RISK.CRITICAL;
      else if (amount > 50000) riskLevel = RISK.HIGH;
      else if (amount > 10000) riskLevel = RISK.MEDIUM;
      else riskLevel = RISK.LOW;
    }

    // Check trust-based rules
    let outcome = DECISION.PROCEED;
    let reasons = [];
    let requiresEscalation = false;

    // Low trust = higher scrutiny
    if (trustScore < 30) {
      if (riskLevel === RISK.HIGH || riskLevel === RISK.CRITICAL) {
        outcome = DECISION.REJECT;
        reasons.push('Low trust score with high-risk action');
      } else {
        outcome = DECISION.HOLD;
        reasons.push('Low trust score - manual review required');
        requiresEscalation = true;
      }
    }

    // High trust = fast path
    if (trustScore >= 80 && riskLevel === RISK.LOW) {
      outcome = DECISION.PROCEED;
      reasons.push('High trust, low risk - auto approved');
    }

    // Check for policy violations
    const policies = await checkPolicies(corpId, action, resource, amount);
    if (policies.violated.length > 0) {
      outcome = DECISION.REJECT;
      reasons.push(...policies.violated.map(p => `Policy violation: ${p}`));
    }

    // Check for holds
    const holds = await checkHolds(corpId);
    if (holds.length > 0) {
      outcome = DECISION.HOLD;
      reasons.push(...holds);
      requiresEscalation = true;
    }

    // Build decision
    const decision = {
      id: decisionId,
      corpId,
      action,
      resource,
      amount,
      outcome,
      riskLevel,
      trustScore,
      reasons,
      requiresEscalation,
      context,
      decisionBy: 'system',
      createdAt: now
    };

    // Store decision
    await redis.set(`decision:${decisionId}`, JSON.stringify(decision));
    await redis.lpush(`decisions:corpId:${corpId}`, decisionId);
    await redis.ltrim(`decisions:corpId:${corpId}`, 0, 99);

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

    res.status(201).json(appeal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
