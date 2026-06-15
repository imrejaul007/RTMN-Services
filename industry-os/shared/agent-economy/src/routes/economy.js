/**
 * Economy Routes - Karma points, SLBs, balances
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, CURRENCY, TX_TYPE } from '../index.js';

const router = Router();

/**
 * Get balance
 * GET /api/economy/balance/:corpId
 */
router.get('/balance/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;

    const balances = {
      karma: parseFloat(await redis.get(`balance:${corpId}:karma`) || '0'),
      slb: parseFloat(await redis.get(`balance:${corpId}:slb`) || '0'),
      rez: parseFloat(await redis.get(`balance:${corpId}:rez`) || '0')
    };

    // Get reputation tier
    const tier = getReputationTier(balances.karma);

    res.json({ corpId, balances, tier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get reputation tier
 */
function getReputationTier(karma) {
  if (karma >= 10000) return { name: 'LEGENDARY', multiplier: 1.5 };
  if (karma >= 5000) return { name: 'ELITE', multiplier: 1.3 };
  if (karma >= 1000) return { name: 'TRUSTED', multiplier: 1.1 };
  if (karma >= 100) return { name: 'VERIFIED', multiplier: 1.0 };
  return { name: 'NEW', multiplier: 0.8 };
}

/**
 * Award karma
 * POST /api/economy/karma/award
 */
router.post('/karma/award', async (req, res) => {
  try {
    const { corpId, amount, reason, sourceCorpId } = req.body;

    if (!corpId || !amount || !reason) {
      return res.status(400).json({ error: 'corpId, amount, and reason are required' });
    }

    const txId = `tx_${uuidv4()}`;
    const now = new Date().toISOString();

    // Get current balance
    const current = parseFloat(await redis.get(`balance:${corpId}:karma`) || '0');
    const newBalance = Math.max(0, current + amount);

    // Update balance
    await redis.set(`balance:${corpId}:karma`, newBalance.toString());

    // Record transaction
    const tx = {
      id: txId,
      corpId,
      type: TX_TYPE.KARMA_EARN,
      amount,
      reason,
      sourceCorpId,
      balanceBefore: current,
      balanceAfter: newBalance,
      createdAt: now
    };
    await redis.set(`tx:${txId}`, JSON.stringify(tx));
    await redis.lpush(`txs:corpId:${corpId}`, txId);
    await redis.ltrim(`txs:corpId:${corpId}`, 0, 999);

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Burn karma (penalty)
 * POST /api/economy/karma/burn
 */
router.post('/karma/burn', async (req, res) => {
  try {
    const { corpId, amount, reason } = req.body;

    if (!corpId || !amount || !reason) {
      return res.status(400).json({ error: 'corpId, amount, and reason are required' });
    }

    const txId = `tx_${uuidv4()}`;
    const now = new Date().toISOString();

    // Get current balance
    const current = parseFloat(await redis.get(`balance:${corpId}:karma`) || '0');
    const newBalance = Math.max(0, current - amount);

    // Update balance
    await redis.set(`balance:${corpId}:karma`, newBalance.toString());

    // Record transaction
    const tx = {
      id: txId,
      corpId,
      type: TX_TYPE.KARMA_BURN,
      amount: -amount,
      reason,
      balanceBefore: current,
      balanceAfter: newBalance,
      createdAt: now
    };
    await redis.set(`tx:${txId}`, JSON.stringify(tx));
    await redis.lpush(`txs:corpId:${corpId}`, txId);

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stake SLB
 * POST /api/economy/slb/stake
 */
router.post('/slb/stake', async (req, res) => {
  try {
    const { corpId, amount, taskId } = req.body;

    if (!corpId || !amount) {
      return res.status(400).json({ error: 'corpId and amount are required' });
    }

    const txId = `tx_${uuidv4()}`;
    const now = new Date().toISOString();

    // Deduct from REZ balance
    const current = parseFloat(await redis.get(`balance:${corpId}:rez`) || '0');
    if (current < amount) {
      return res.status(400).json({ error: 'Insufficient REZ balance' });
    }

    await redis.set(`balance:${corpId}:rez`, (current - amount).toString());

    // Add to SLB
    const slbBalance = parseFloat(await redis.get(`balance:${corpId}:slb`) || '0');
    await redis.set(`balance:${corpId}:slb`, (slbBalance + amount).toString());

    // Create stake record
    const stake = {
      id: `stake_${uuidv4()}`,
      corpId,
      amount,
      taskId,
      status: 'active',
      createdAt: now
    };
    await redis.set(`stake:${stake.id}`, JSON.stringify(stake));
    await redis.sadd(`stakes:corpId:${corpId}`, stake.id);

    // Record transaction
    const tx = {
      id: txId,
      corpId,
      type: TX_TYPE.SLB_STAKE,
      amount,
      taskId,
      balanceBefore: current,
      balanceAfter: current - amount,
      createdAt: now
    };
    await redis.set(`tx:${txId}`, JSON.stringify(tx));
    await redis.lpush(`txs:corpId:${corpId}`, txId);

    res.status(201).json(stake);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Slash SLB (penalty for SLA breach)
 * POST /api/economy/slb/slash
 */
router.post('/slb/slash', async (req, res) => {
  try {
    const { corpId, amount, reason, taskId } = req.body;

    if (!corpId || !amount || !reason) {
      return res.status(400).json({ error: 'corpId, amount, and reason are required' });
    }

    const txId = `tx_${uuidv4()}`;
    const now = new Date().toISOString();

    // Deduct from SLB
    const current = parseFloat(await redis.get(`balance:${corpId}:slb`) || '0');
    const newBalance = Math.max(0, current - amount);

    await redis.set(`balance:${corpId}:slb`, newBalance.toString());

    // Record transaction
    const tx = {
      id: txId,
      corpId,
      type: TX_TYPE.SLB_SLASH,
      amount: -amount,
      reason,
      taskId,
      balanceBefore: current,
      balanceAfter: newBalance,
      createdAt: now
    };
    await redis.set(`tx:${txId}`, JSON.stringify(tx));
    await redis.lpush(`txs:corpId:${corpId}`, txId);

    // Also burn karma for SLA breach
    await burnKarma(corpId, Math.ceil(amount / 10), reason);

    res.status(201).json(tx);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper: burn karma
 */
async function burnKarma(corpId, amount, reason) {
  const current = parseFloat(await redis.get(`balance:${corpId}:karma`) || '0');
  const newBalance = Math.max(0, current - amount);
  await redis.set(`balance:${corpId}:karma`, newBalance.toString());
}

/**
 * Get transaction history
 * GET /api/economy/txs/:corpId
 */
router.get('/txs/:corpId', async (req, res) => {
  try {
    const { corpId } = req.params;
    const { limit = 50, type } = req.query;

    const txIds = await redis.lrange(`txs:corpId:${corpId}`, 0, parseInt(limit) - 1);
    const txs = [];

    for (const txId of txIds) {
      const tx = await redis.get(`tx:${txId}`);
      if (tx) {
        const parsed = JSON.parse(tx);
        if (!type || parsed.type === type) {
          txs.push(parsed);
        }
      }
    }

    res.json({ transactions: txs, total: txs.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get leaderboard
 * GET /api/economy/leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const { currency = 'karma', limit = 20 } = req.query;

    const corpIds = await redis.smembers('economy:entities');
    const scores = [];

    for (const corpId of corpIds) {
      const balance = parseFloat(await redis.get(`balance:${corpId}:${currency}`) || '0');
      scores.push({ corpId, balance });
    }

    scores.sort((a, b) => b.balance - a.balance);

    res.json({ leaderboard: scores.slice(0, parseInt(limit)), currency });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
