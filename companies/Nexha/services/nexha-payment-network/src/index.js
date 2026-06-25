'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4296;
const CORPID_URL = process.env.CORPID_URL || 'http://corp-id:4702';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 50 }));

const payments = new Map();
const escrowAccounts = new Map();
const settlements = [];

function log(msg) { console.log(`[${new Date().toISOString()}] [payment-network] ${msg}`); }

// Initialize escrow accounts
escrowAccounts.set('system', { balance: 0, currency: 'INR', type: 'system' });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexha-payment-network', version: '0.1.0' }));

// ── Create payment ───────────────────────────────────────────────────
app.post('/api/v1/payments', (req, res) => {
  const { from, to, amount, currency = 'INR', reference, method = 'upi', metadata = {} } = req.body;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'from, to, and amount are required' });
  }
  const paymentId = `pay-${uuidv4().slice(0, 12)}`;
  const payment = {
    id: paymentId,
    from,
    to,
    amount: parseFloat(amount),
    currency,
    reference,
    method,
    status: 'pending',
    metadata,
    createdAt: new Date().toISOString(),
    processedAt: null,
    failureReason: null,
  };
  payments.set(paymentId, payment);

  // Simulate processing
  setTimeout(() => {
    const p = payments.get(paymentId);
    if (p.status === 'pending') {
      const success = Math.random() > 0.05;
      if (success) {
        p.status = 'completed';
        p.processedAt = new Date().toISOString();
        // Credit recipient
        if (!escrowAccounts.has(p.to)) escrowAccounts.set(p.to, { balance: 0, currency: p.currency, type: 'user' });
        escrowAccounts.get(p.to).balance += p.amount;
        log(`Payment ${paymentId}: ${amount} ${currency} ${from} → ${to} [COMPLETED]`);
      } else {
        p.status = 'failed';
        p.failureReason = 'insufficient_funds';
        p.processedAt = new Date().toISOString();
        log(`Payment ${paymentId}: FAILED — ${p.failureReason}`);
      }
      payments.set(paymentId, p);
    }
  }, 300);

  log(`Payment created: ${paymentId} (${amount} ${currency} ${from} → ${to})`);
  res.status(202).json({ success: true, data: payment });
});

// ── Get payment ──────────────────────────────────────────────────────
app.get('/api/v1/payments/:id', (req, res) => {
  const payment = payments.get(req.params.id);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });
  res.json({ success: true, data: payment });
});

// ── List payments ────────────────────────────────────────────────────
app.get('/api/v1/payments', (req, res) => {
  const { from, to, status } = req.query;
  let list = [...payments.values()];
  if (from) list = list.filter(p => p.from === from);
  if (to) list = list.filter(p => p.to === to);
  if (status) list = list.filter(p => p.status === status);
  res.json({ success: true, data: list, total: list.length });
});

// ── Create escrow ────────────────────────────────────────────────────
app.post('/api/v1/escrow', (req, res) => {
  const { accountId, amount, currency = 'INR', reference } = req.body;
  if (!accountId || !amount) {
    return res.status(400).json({ error: 'accountId and amount are required' });
  }
  const escrowId = `esc-${uuidv4().slice(0, 12)}`;
  const escrow = {
    id: escrowId,
    accountId,
    amount: parseFloat(amount),
    currency,
    status: 'held',
    reference,
    createdAt: new Date().toISOString(),
    releasedAt: null,
    releasedTo: null,
  };

  if (!escrowAccounts.has(accountId)) {
    escrowAccounts.set(accountId, { balance: 0, currency, type: 'user' });
  }
  escrowAccounts.get(accountId).balance -= parseFloat(amount);
  escrowAccounts.get('system').balance += parseFloat(amount);
  escrowAccounts.set(escrowId, escrow);
  log(`Escrow created: ${escrowId} (${amount} ${currency} held for ${accountId})`);
  res.status(201).json({ success: true, data: escrow });
});

// ── Release escrow ───────────────────────────────────────────────────
app.post('/api/v1/escrow/:id/release', (req, res) => {
  const escrow = escrowAccounts.get(req.params.id);
  if (!escrow || escrow.status !== 'held') {
    return res.status(404).json({ error: 'Escrow not found or already released' });
  }
  escrow.status = 'released';
  escrow.releasedAt = new Date().toISOString();
  escrow.releasedTo = escrow.accountId;
  escrowAccounts.get('system').balance -= escrow.amount;
  escrowAccounts.get(escrow.accountId).balance += escrow.amount;
  log(`Escrow released: ${escrow.id} (${escrow.amount} ${escrow.currency})`);
  res.json({ success: true, data: escrow });
});

// ── Get balance ──────────────────────────────────────────────────────
app.get('/api/v1/accounts/:id/balance', (req, res) => {
  const account = escrowAccounts.get(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json({ success: true, data: { accountId: req.params.id, balance: account.balance, currency: account.currency } });
});

// ── Settle (batch payments) ──────────────────────────────────────────
app.post('/api/v1/settlements', (req, res) => {
  const { payments: paymentIds, batchId } = req.body;
  if (!paymentIds || !Array.isArray(paymentIds)) {
    return res.status(400).json({ error: 'payments array is required' });
  }
  const settlement = {
    id: `settle-${uuidv4().slice(0, 12)}`,
    batchId: batchId || `batch-${Date.now()}`,
    paymentIds,
    status: 'processing',
    completedAt: null,
    totalAmount: 0,
    createdAt: new Date().toISOString(),
  };

  let total = 0;
  for (const pid of paymentIds) {
    const p = payments.get(pid);
    if (p && p.status === 'completed') total += p.amount;
  }
  settlement.totalAmount = total;
  settlement.status = 'completed';
  settlement.completedAt = new Date().toISOString();
  settlements.push(settlement);
  log(`Settlement: ${settlement.id} — ${paymentIds.length} payments, ${total} total`);
  res.status(201).json({ success: true, data: settlement });
});

// ── Stats ────────────────────────────────────────────────────────────
app.get('/api/v1/stats', (_req, res) => {
  const all = [...payments.values()];
  const completed = all.filter(p => p.status === 'completed');
  const totalVolume = completed.reduce((sum, p) => sum + p.amount, 0);
  res.json({
    payments: {
      total: all.length,
      completed: completed.length,
      pending: all.filter(p => p.status === 'pending').length,
      failed: all.filter(p => p.status === 'failed').length,
      volume: totalVolume,
    },
    escrow: { total: [...escrowAccounts.values()].filter(a => a.status === 'held').length },
    settlements: { total: settlements.length },
  });
});

app.listen(PORT, () => {
  log(`Nexha Payment Network running on port ${PORT}`);
  log(`  CorpID: ${CORPID_URL}`);
});
