/**
 * Payment Routes - Agent-to-agent payments and escrow
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { redis, CURRENCY, TX_TYPE } from '../index.js';

const router = Router();

// External service URLs
const CORPID_URL = process.env.CORPID_URL || 'http://localhost:4702';

/**
 * Create payment
 * POST /api/payments
 */
router.post('/', async (req, res) => {
  try {
    const { fromCorpId, toCorpId, amount, currency = 'rez', description, taskId } = req.body;

    if (!fromCorpId || !toCorpId || !amount) {
      return res.status(400).json({ error: 'fromCorpId, toCorpId, and amount are required' });
    }

    const paymentId = `pay_${uuidv4()}`;
    const now = new Date().toISOString();

    // Verify both entities exist
    try {
      const [fromRes, toRes] = await Promise.all([
        fetch(`${CORPID_URL}/api/identity/${fromCorpId}`),
        fetch(`${CORPID_URL}/api/identity/${toCorpId}`)
      ]);

      if (!fromRes.ok || !toRes.ok) {
        return res.status(400).json({ error: 'Invalid CorpID(s)' });
      }
    } catch (e) {
      logger?.warn('CorpID verification skipped:', e.message);
    }

    // Check balance
    const fromBalance = parseFloat(await redis.get(`balance:${fromCorpId}:${currency}`) || '0');
    if (fromBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Create payment
    const payment = {
      id: paymentId,
      fromCorpId,
      toCorpId,
      amount,
      currency,
      description: description || '',
      taskId,
      status: 'completed',
      createdAt: now,
      completedAt: now
    };

    // Deduct from sender
    await redis.set(`balance:${fromCorpId}:${currency}`, (fromBalance - amount).toString());

    // Credit receiver
    const toBalance = parseFloat(await redis.get(`balance:${toCorpId}:${currency}`) || '0');
    await redis.set(`balance:${toCorpId}:${currency}`, (toBalance + amount).toString());

    // Mark entities as active
    await redis.sadd('economy:entities', fromCorpId);
    await redis.sadd('economy:entities', toCorpId);

    // Record transactions
    const txId1 = `tx_${uuidv4()}`;
    await redis.set(`tx:${txId1}`, JSON.stringify({
      id: txId1,
      corpId: fromCorpId,
      type: TX_TYPE.PAYMENT,
      amount: -amount,
      currency,
      toCorpId,
      taskId,
      paymentId,
      balanceBefore: fromBalance,
      balanceAfter: fromBalance - amount,
      createdAt: now
    }));
    await redis.lpush(`txs:corpId:${fromCorpId}`, txId1);

    const txId2 = `tx_${uuidv4()}`;
    await redis.set(`tx:${txId2}`, JSON.stringify({
      id: txId2,
      corpId: toCorpId,
      type: TX_TYPE.PAYMENT,
      amount: amount,
      currency,
      fromCorpId,
      taskId,
      paymentId,
      balanceBefore: toBalance,
      balanceAfter: toBalance + amount,
      createdAt: now
    }));
    await redis.lpush(`txs:corpId:${toCorpId}`, txId2);

    // Store payment
    await redis.set(`payment:${paymentId}`, JSON.stringify(payment));

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create escrow
 * POST /api/payments/escrow
 */
router.post('/escrow', async (req, res) => {
  try {
    const { fromCorpId, toCorpId, amount, currency = 'rez', taskId, releaseConditions } = req.body;

    if (!fromCorpId || !toCorpId || !amount) {
      return res.status(400).json({ error: 'fromCorpId, toCorpId, and amount are required' });
    }

    const escrowId = `esc_${uuidv4()}`;
    const now = new Date().toISOString();

    // Deduct from sender
    const fromBalance = parseFloat(await redis.get(`balance:${fromCorpId}:${currency}`) || '0');
    if (fromBalance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    await redis.set(`balance:${fromCorpId}:${currency}`, (fromBalance - amount).toString());

    // Create escrow
    const escrow = {
      id: escrowId,
      fromCorpId,
      toCorpId,
      amount,
      currency,
      taskId,
      releaseConditions: releaseConditions || {},
      status: 'held',
      createdAt: now,
      releasedAt: null
    };

    await redis.set(`escrow:${escrowId}`, JSON.stringify(escrow));
    await redis.sadd(`escrows:corpId:${fromCorpId}`, escrowId);
    await redis.sadd(`escrows:corpId:${toCorpId}`, escrowId);

    // Record deposit transaction
    const txId = `tx_${uuidv4()}`;
    await redis.set(`tx:${txId}`, JSON.stringify({
      id: txId,
      corpId: fromCorpId,
      type: TX_TYPE.ESCROW_DEPOSIT,
      amount: -amount,
      currency,
      escrowId,
      taskId,
      balanceBefore: fromBalance,
      balanceAfter: fromBalance - amount,
      createdAt: now
    }));
    await redis.lpush(`txs:corpId:${fromCorpId}`, txId);

    res.status(201).json(escrow);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Release escrow
 * POST /api/payments/escrow/:escrowId/release
 */
router.post('/escrow/:escrowId/release', async (req, res) => {
  try {
    const { escrowId } = req.params;

    const escrow = await redis.get(`escrow:${escrowId}`);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const parsed = JSON.parse(escrow);

    if (parsed.status !== 'held') {
      return res.status(400).json({ error: 'Escrow already released or refunded' });
    }

    const now = new Date().toISOString();

    // Credit receiver
    const toBalance = parseFloat(await redis.get(`balance:${parsed.toCorpId}:${parsed.currency}`) || '0');
    await redis.set(`balance:${parsed.toCorpId}:${parsed.currency}`, (toBalance + parsed.amount).toString());

    // Update escrow
    parsed.status = 'released';
    parsed.releasedAt = now;
    await redis.set(`escrow:${escrowId}`, JSON.stringify(parsed));

    // Record release transaction
    const txId = `tx_${uuidv4()}`;
    await redis.set(`tx:${txId}`, JSON.stringify({
      id: txId,
      corpId: parsed.toCorpId,
      type: TX_TYPE.ESCROW_RELEASE,
      amount: parsed.amount,
      currency: parsed.currency,
      escrowId,
      taskId: parsed.taskId,
      balanceBefore: toBalance,
      balanceAfter: toBalance + parsed.amount,
      createdAt: now
    }));
    await redis.lpush(`txs:corpId:${parsed.toCorpId}`, txId);

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Refund escrow
 * POST /api/payments/escrow/:escrowId/refund
 */
router.post('/escrow/:escrowId/refund', async (req, res) => {
  try {
    const { escrowId } = req.params;

    const escrow = await redis.get(`escrow:${escrowId}`);
    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    const parsed = JSON.parse(escrow);

    if (parsed.status !== 'held') {
      return res.status(400).json({ error: 'Escrow already released or refunded' });
    }

    const now = new Date().toISOString();

    // Refund to sender
    const fromBalance = parseFloat(await redis.get(`balance:${parsed.fromCorpId}:${parsed.currency}`) || '0');
    await redis.set(`balance:${parsed.fromCorpId}:${parsed.currency}`, (fromBalance + parsed.amount).toString());

    // Update escrow
    parsed.status = 'refunded';
    parsed.refundedAt = now;
    await redis.set(`escrow:${escrowId}`, JSON.stringify(parsed));

    // Record refund transaction
    const txId = `tx_${uuidv4()}`;
    await redis.set(`tx:${txId}`, JSON.stringify({
      id: txId,
      corpId: parsed.fromCorpId,
      type: TX_TYPE.ESCROW_REFUND,
      amount: parsed.amount,
      currency: parsed.currency,
      escrowId,
      taskId: parsed.taskId,
      balanceBefore: fromBalance,
      balanceAfter: fromBalance + parsed.amount,
      createdAt: now
    }));
    await redis.lpush(`txs:corpId:${parsed.fromCorpId}`, txId);

    res.json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get payment
 * GET /api/payments/:paymentId
 */
router.get('/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await redis.get(`payment:${paymentId}`);

    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(JSON.parse(payment));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get escrow
 * GET /api/payments/escrow/:escrowId
 */
router.get('/escrow/:escrowId', async (req, res) => {
  try {
    const { escrowId } = req.params;
    const escrow = await redis.get(`escrow:${escrowId}`);

    if (!escrow) {
      return res.status(404).json({ error: 'Escrow not found' });
    }

    res.json(JSON.parse(escrow));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
