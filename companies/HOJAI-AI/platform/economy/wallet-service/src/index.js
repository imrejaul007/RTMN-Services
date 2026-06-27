import helmet from 'helmet';
/**
 * Agent Wallets Service
 *
 * Digital wallets for AI agents to hold funds, make payments, and manage escrow.
 * Handles:
 * - Wallet creation and management
 * - Deposits and withdrawals
 * - AI-to-AI payments
 * - Escrow management
 * - Transaction history
 * - Auto-payments and subscriptions
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}


app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'agent-wallets' });

const PORT = process.env.PORT || 4840;

// In-memory stores
const wallets = new PersistentMap('wallets', { serviceName: 'agent-wallets' });
const transactions = new PersistentMap('transactions', { serviceName: 'agent-wallets' });
const escrowAccounts = new PersistentMap('escrow-accounts', { serviceName: 'agent-wallets' });
const paymentMethods = new PersistentMap('payment-methods', { serviceName: 'agent-wallets' });
const subscriptions = new PersistentMap('subscriptions', { serviceName: 'agent-wallets' });

// Supported currencies
const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'AED', 'SGD'];

// Transaction types
const TX_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  PAYMENT: 'payment',
  RECEIPT: 'receipt',
  ESCROW_HOLD: 'escrow_hold',
  ESCROW_RELEASE: 'escrow_release',
  ESCROW_REFUND: 'escrow_refund',
  FEE: 'fee',
  REFUND: 'refund',
  SUBSCRIPTION: 'subscription'
};

// Transaction statuses
const TX_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

/**
 * Create wallet for agent
 */
function createWallet(agentId, config = {}) {
  const wallet = {
    id: `WAL-${uuidv4().substring(0, 12)}`,
    agentId,
    agentType: config.agentType || 'merchant',

    // Balances (multi-currency)
    balances: {
      USD: 0,
      EUR: 0,
      GBP: 0,
      INR: 0,
      ...config.initialBalances
    },

    // Primary currency
    primaryCurrency: config.primaryCurrency || 'USD',

    // Limits
    limits: {
      dailyLimit: config.limits?.dailyLimit || 10000,
      monthlyLimit: config.limits?.monthlyLimit || 100000,
      perTransactionLimit: config.limits?.perTransactionLimit || 5000,
      dailyUsed: 0,
      monthlyUsed: 0
    },

    // Status
    status: 'active',  // active, frozen, closed
    frozen: false,
    frozenAt: null,
    frozenReason: null,

    // Fees
    feeStructure: {
      transactionFee: config.feeStructure?.transactionFee || 0.029,  // 2.9%
      fixedFee: config.feeStructure?.fixedFee || 0.30,
      escrowFee: config.feeStructure?.escrowFee || 0.01  // 1%
    },

    // Metadata
    name: config.name || `Wallet for ${agentId}`,
    email: config.email,
    metadata: config.metadata || {},

    // Stats
    stats: {
      totalReceived: 0,
      totalSent: 0,
      transactionCount: 0,
      avgTransactionSize: 0
    },

    // Created
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastTransactionAt: null
  };

  wallets.set(wallet.id, wallet);
  wallets.set(agentId, wallet);  // Also index by agentId
  transactions.set(wallet.id, []);

  return wallet;
}

/**
 * Get wallet
 */
function getWallet(identifier) {
  return wallets.get(identifier);
}

/**
 * Get wallet balance
 */
function getBalance(walletId, currency = 'USD') {
  const wallet = wallets.get(walletId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }
  return {
    walletId: wallet.id,
    currency,
    available: wallet.balances[currency] || 0,
    pending: getPendingBalance(wallet.id, currency),
    total: (wallet.balances[currency] || 0) + getPendingBalance(wallet.id, currency)
  };
}

/**
 * Get pending balance (from pending transactions)
 */
function getPendingBalance(walletId, currency) {
  const txs = transactions.get(walletId) || [];
  return txs
    .filter(tx => tx.currency === currency && tx.status === TX_STATUS.PENDING)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

/**
 * Deposit funds
 */
function deposit(walletId, amount, currency = 'USD', source = {}) {
  const wallet = wallets.get(walletId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.frozen) {
    throw new Error('Wallet is frozen');
  }

  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  const tx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.DEPOSIT,
    status: TX_STATUS.PENDING,
    walletId,
    amount,
    currency,
    fee: 0,
    net: amount,

    // Source info
    source: {
      type: source.type || 'manual',
      reference: source.reference || null,
      ...source
    },

    balanceBefore: wallet.balances[currency] || 0,
    balanceAfter: (wallet.balances[currency] || 0) + amount,

    timestamp: new Date().toISOString(),
    completedAt: null
  };

  // Update wallet
  wallet.balances[currency] = (wallet.balances[currency] || 0) + amount;
  wallet.stats.totalReceived += amount;
  wallet.stats.transactionCount++;
  wallet.lastTransactionAt = new Date().toISOString();
  wallet.updatedAt = new Date().toISOString();

  // Mark complete immediately for deposits
  tx.status = TX_STATUS.COMPLETED;
  tx.completedAt = new Date().toISOString();

  // Save
  const txs = transactions.get(wallet.id) || [];
  txs.unshift(tx);
  transactions.set(wallet.id, txs);
  wallets.set(wallet.id, wallet);

  return { transaction: tx, balance: wallet.balances };
}

/**
 * Enforce per-tx, daily, monthly wallet limits.
 * Throws if any limit would be exceeded by this transaction.
 * Updates dailyUsed/monthlyUsed counters on success.
 */
function enforceTransactionLimits(wallet, amount) {
  const limits = wallet.limits || {};
  const perTx = limits.perTransactionLimit ?? Infinity;
  const daily = limits.dailyLimit ?? Infinity;
  const monthly = limits.monthlyLimit ?? Infinity;

  if (amount > perTx) {
    throw new Error(
      `Per-transaction limit exceeded: ${amount} > ${perTx}`
    );
  }
  if ((limits.dailyUsed || 0) + amount > daily) {
    throw new Error(
      `Daily limit exceeded: ${(limits.dailyUsed || 0) + amount} > ${daily}`
    );
  }
  if ((limits.monthlyUsed || 0) + amount > monthly) {
    throw new Error(
      `Monthly limit exceeded: ${(limits.monthlyUsed || 0) + amount} > ${monthly}`
    );
  }

  // Reset counters if a new day/month has started since the last transaction
  const now = new Date();
  const last = wallet.lastTransactionAt ? new Date(wallet.lastTransactionAt) : null;
  if (!last || last.toDateString() !== now.toDateString()) {
    limits.dailyUsed = 0;
  }
  if (!last || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear()) {
    limits.monthlyUsed = 0;
  }

  limits.dailyUsed = (limits.dailyUsed || 0) + amount;
  limits.monthlyUsed = (limits.monthlyUsed || 0) + amount;
  wallet.limits = limits;
}

/**
 * Withdraw funds
 */
function withdraw(walletId, amount, currency = 'USD', destination = {}) {
  const wallet = wallets.get(walletId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  if (wallet.frozen) {
    throw new Error('Wallet is frozen');
  }

  const balance = wallet.balances[currency] || 0;
  if (amount > balance) {
    throw new Error('Insufficient balance');
  }

  enforceTransactionLimits(wallet, amount);

  const tx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.WITHDRAWAL,
    status: TX_STATUS.PENDING,
    walletId,
    amount,
    currency,
    fee: calculateFee(amount, wallet.feeStructure),
    net: amount - calculateFee(amount, wallet.feeStructure),

    destination: {
      type: destination.type || 'bank',
      reference: destination.reference || null,
      ...destination
    },

    balanceBefore: balance,
    balanceAfter: balance - amount,

    timestamp: new Date().toISOString(),
    completedAt: null
  };

  // Update wallet
  wallet.balances[currency] = balance - amount;
  wallet.stats.totalSent += amount;
  wallet.stats.transactionCount++;
  wallet.lastTransactionAt = new Date().toISOString();
  wallet.updatedAt = new Date().toISOString();

  tx.status = TX_STATUS.COMPLETED;
  tx.completedAt = new Date().toISOString();

  const txs = transactions.get(wallet.id) || [];
  txs.unshift(tx);
  transactions.set(wallet.id, txs);
  wallets.set(wallet.id, wallet);

  return { transaction: tx, balance: wallet.balances };
}

/**
 * Pay another agent
 */
function pay(fromWalletId, toAgentId, amount, currency = 'USD', memo = '') {
  const fromWallet = wallets.get(fromWalletId);
  if (!fromWallet) {
    throw new Error('Source wallet not found');
  }

  // Find recipient wallet
  let toWallet = wallets.get(toAgentId);
  if (!toWallet) {
    // Try to find by wallet ID
    toWallet = wallets.get(toAgentId);
    if (!toWallet) {
      throw new Error('Recipient wallet not found');
    }
  }

  if (fromWallet.frozen || toWallet.frozen) {
    throw new Error('One or more wallets are frozen');
  }

  const fromBalance = fromWallet.balances[currency] || 0;
  if (amount > fromBalance) {
    throw new Error('Insufficient balance');
  }

  enforceTransactionLimits(fromWallet, amount);

  const fee = calculateFee(amount, fromWallet.feeStructure);

  // Debit from sender
  const debitTx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.PAYMENT,
    status: TX_STATUS.COMPLETED,
    walletId: fromWallet.id,
    agentId: fromWallet.agentId,
    counterpartyId: toAgentId,
    counterpartyWalletId: toWallet.id,
    amount,
    currency,
    fee,
    net: amount - fee,
    memo,
    balanceBefore: fromBalance,
    balanceAfter: fromBalance - amount,
    timestamp: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  fromWallet.balances[currency] = fromBalance - amount;
  fromWallet.stats.totalSent += amount;
  fromWallet.stats.transactionCount++;
  fromWallet.updatedAt = new Date().toISOString();

  // Credit to recipient
  const toBalance = toWallet.balances[currency] || 0;
  const creditTx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.RECEIPT,
    status: TX_STATUS.COMPLETED,
    walletId: toWallet.id,
    agentId: toWallet.agentId,
    counterpartyId: fromWallet.agentId,
    counterpartyWalletId: fromWallet.id,
    amount,
    currency,
    fee: 0,
    net: amount,
    memo,
    balanceBefore: toBalance,
    balanceAfter: toBalance + amount,
    timestamp: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  toWallet.balances[currency] = toBalance + amount;
  toWallet.stats.totalReceived += amount;
  toWallet.stats.transactionCount++;
  toWallet.updatedAt = new Date().toISOString();

  // Save transactions
  const fromTxs = transactions.get(fromWallet.id) || [];
  fromTxs.unshift(debitTx);
  transactions.set(fromWallet.id, fromTxs);

  const toTxs = transactions.get(toWallet.id) || [];
  toTxs.unshift(creditTx);
  transactions.set(toWallet.id, toTxs);

  // Save wallets
  wallets.set(fromWallet.id, fromWallet);
  wallets.set(fromWallet.agentId, fromWallet);
  wallets.set(toWallet.id, toWallet);
  wallets.set(toWallet.agentId, toWallet);

  return {
    debitTransaction: debitTx,
    creditTransaction: creditTx,
    fromBalance: fromWallet.balances,
    toBalance: toWallet.balances
  };
}

/**
 * Hold funds in escrow
 */
function holdEscrow(walletId, amount, currency, contractId) {
  const wallet = wallets.get(walletId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  const balance = wallet.balances[currency] || 0;
  if (amount > balance) {
    throw new Error('Insufficient balance for escrow');
  }

  const escrowId = `ESC-${uuidv4().substring(0, 12)}`;

  const escrowAccount = {
    id: escrowId,
    walletId: wallet.id,
    agentId: wallet.agentId,
    contractId,
    amount,
    currency,
    status: 'held',  // held, released, refunded, expired
    heldAt: new Date().toISOString(),
    releasedAt: null,
    refundedAt: null,
    releaseTo: null,
    reason: null
  };

  // Reserve funds
  wallet.balances[currency] = balance - amount;
  wallet.updatedAt = new Date().toISOString();

  // Record transaction
  const tx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.ESCROW_HOLD,
    status: TX_STATUS.COMPLETED,
    walletId: wallet.id,
    amount,
    currency,
    escrowId,
    reference: contractId,
    balanceBefore: balance,
    balanceAfter: balance - amount,
    timestamp: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  const txs = transactions.get(wallet.id) || [];
  txs.unshift(tx);
  transactions.set(wallet.id, txs);
  wallets.set(wallet.id, wallet);
  wallets.set(wallet.agentId, wallet);
  escrowAccounts.set(escrowId, escrowAccount);

  return { escrow: escrowAccount, transaction: tx, balance: wallet.balances };
}

/**
 * Release escrow to seller
 */
function releaseEscrow(escrowId, releaseToAgentId) {
  const escrow = escrowAccounts.get(escrowId);
  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.status !== 'held') {
    throw new Error('Escrow already released or refunded');
  }

  const toWallet = wallets.get(releaseToAgentId) || wallets.get(releaseToAgentId);
  if (!toWallet) {
    throw new Error('Recipient wallet not found');
  }

  const fee = calculateFee(escrow.amount, toWallet.feeStructure);

  // Credit to recipient
  const toBalance = toWallet.balances[escrow.currency] || 0;
  toWallet.balances[escrow.currency] = toBalance + escrow.amount - fee;
  toWallet.stats.totalReceived += escrow.amount;
  toWallet.updatedAt = new Date().toISOString();

  escrow.status = 'released';
  escrow.releasedAt = new Date().toISOString();
  escrow.releaseTo = releaseToAgentId;

  // Transaction on recipient side
  const tx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.ESCROW_RELEASE,
    status: TX_STATUS.COMPLETED,
    walletId: toWallet.id,
    agentId: toWallet.agentId,
    amount: escrow.amount,
    currency: escrow.currency,
    fee,
    net: escrow.amount - fee,
    escrowId,
    reference: escrow.contractId,
    timestamp: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  const txs = transactions.get(toWallet.id) || [];
  txs.unshift(tx);
  transactions.set(toWallet.id, txs);
  wallets.set(toWallet.id, toWallet);
  wallets.set(toWallet.agentId, toWallet);
  escrowAccounts.set(escrowId, escrow);

  return { escrow, transaction: tx, balance: toWallet.balances };
}

/**
 * Refund escrow to buyer
 */
function refundEscrow(escrowId, reason) {
  const escrow = escrowAccounts.get(escrowId);
  if (!escrow) {
    throw new Error('Escrow not found');
  }

  if (escrow.status !== 'held') {
    throw new Error('Escrow already released or refunded');
  }

  const wallet = wallets.get(escrow.walletId) || wallets.get(escrow.agentId);
  if (!wallet) {
    throw new Error('Original wallet not found');
  }

  const balance = wallet.balances[escrow.currency] || 0;
  wallet.balances[escrow.currency] = balance + escrow.amount;
  wallet.updatedAt = new Date().toISOString();

  escrow.status = 'refunded';
  escrow.refundedAt = new Date().toISOString();
  escrow.reason = reason;

  // Refund transaction
  const tx = {
    id: `TX-${Date.now()}-${uuidv4().substring(0, 8)}`,
    type: TX_TYPES.ESCROW_REFUND,
    status: TX_STATUS.COMPLETED,
    walletId: wallet.id,
    agentId: wallet.agentId,
    amount: escrow.amount,
    currency: escrow.currency,
    escrowId,
    reference: escrow.contractId,
    reason,
    timestamp: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };

  const txs = transactions.get(wallet.id) || [];
  txs.unshift(tx);
  transactions.set(wallet.id, txs);
  wallets.set(wallet.id, wallet);
  wallets.set(wallet.agentId, wallet);
  escrowAccounts.set(escrowId, escrow);

  return { escrow, transaction: tx, balance: wallet.balances };
}

/**
 * Calculate transaction fee
 */
function calculateFee(amount, feeStructure) {
  return Math.round((amount * feeStructure.transactionFee + feeStructure.fixedFee) * 100) / 100;
}

/**
 * Freeze wallet
 */
function freezeWallet(walletId, reason) {
  const wallet = wallets.get(walletId);
  if (!wallet) {
    throw new Error('Wallet not found');
  }

  wallet.frozen = true;
  wallet.frozenAt = new Date().toISOString();
  wallet.frozenReason = reason;

  wallets.set(walletId, wallet);
  return wallet;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Agent Wallets Service',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalWallets: wallets.size,
      totalEscrow: escrowAccounts.size,
      totalTransactions: Array.from(transactions.values()).reduce((sum, txs) => sum + txs.length, 0)
    }
  });
});

/**
 * Create wallet
 * POST /api/wallets
 */
app.post('/api/wallets',requireAuth,  (req, res) => {
  try {
    const { agentId, name, initialBalances, ...config } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const wallet = createWallet(agentId, { name, initialBalances, ...config });
    res.status(201).json(wallet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get wallet
 * GET /api/wallets/:id
 */
app.get('/api/wallets/:id', (req, res) => {
  const wallet = wallets.get(req.params.id);
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }
  res.json(wallet);
});

/**
 * Get balance
 * GET /api/wallets/:id/balance
 */
app.get('/api/wallets/:id/balance', (req, res) => {
  try {
    const { currency = 'USD' } = req.query;
    const balance = getBalance(req.params.id, currency);
    res.json(balance);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get current wallet limits + usage
 * GET /api/wallets/:id/limits
 */
app.get('/api/wallets/:id/limits', (req, res) => {
  try {
    const wallet = wallets.get(req.params.id) || getWallet(req.params.id);
    const limits = wallet.limits || {};
    res.json({
      walletId: wallet.id,
      perTransactionLimit: limits.perTransactionLimit ?? null,
      dailyLimit: limits.dailyLimit ?? null,
      monthlyLimit: limits.monthlyLimit ?? null,
      dailyUsed: limits.dailyUsed || 0,
      monthlyUsed: limits.monthlyUsed || 0,
      dailyRemaining: (limits.dailyLimit ?? Infinity) - (limits.dailyUsed || 0),
      monthlyRemaining: (limits.monthlyLimit ?? Infinity) - (limits.monthlyUsed || 0),
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Deposit funds
 * POST /api/wallets/:id/deposit
 */
app.post('/api/wallets/:id/deposit',requireAuth,  (req, res) => {
  try {
    const { amount, currency = 'USD', source } = req.body;
    const result = deposit(req.params.id, amount, currency, source);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Withdraw funds
 * POST /api/wallets/:id/withdraw
 */
app.post('/api/wallets/:id/withdraw',requireAuth,  (req, res) => {
  try {
    const { amount, currency = 'USD', destination } = req.body;
    const result = withdraw(req.params.id, amount, currency, destination);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Pay another agent
 * POST /api/wallets/:id/pay
 */
app.post('/api/wallets/:id/pay',requireAuth,  (req, res) => {
  try {
    const { toAgentId, amount, currency = 'USD', memo } = req.body;
    const result = pay(req.params.id, toAgentId, amount, currency, memo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Hold escrow
 * POST /api/wallets/:id/escrow
 */
app.post('/api/wallets/:id/escrow',requireAuth,  (req, res) => {
  try {
    const { amount, currency, contractId } = req.body;
    const result = holdEscrow(req.params.id, amount, currency, contractId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Release escrow
 * POST /api/escrow/:escrowId/release
 */
app.post('/api/escrow/:escrowId/release',requireAuth,  (req, res) => {
  try {
    const { releaseToAgentId } = req.body;
    const result = releaseEscrow(req.params.escrowId, releaseToAgentId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Refund escrow
 * POST /api/escrow/:escrowId/refund
 */
app.post('/api/escrow/:escrowId/refund',requireAuth,  (req, res) => {
  try {
    const { reason } = req.body;
    const result = refundEscrow(req.params.escrowId, reason);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get escrow
 * GET /api/escrow/:escrowId
 */
app.get('/api/escrow/:escrowId', (req, res) => {
  const escrow = escrowAccounts.get(req.params.escrowId);
  if (!escrow) {
    return res.status(404).json({ error: 'Escrow not found' });
  }
  res.json(escrow);
});

/**
 * Get transaction history
 * GET /api/wallets/:id/transactions
 */
app.get('/api/wallets/:id/transactions', (req, res) => {
  const wallet = wallets.get(req.params.id);
  if (!wallet) {
    return res.status(404).json({ error: 'Wallet not found' });
  }

  const txs = transactions.get(wallet.id) || [];
  const { type, status, limit = 50, offset = 0 } = req.query;

  let filtered = txs;
  if (type) {
    filtered = filtered.filter(tx => tx.type === type);
  }
  if (status) {
    filtered = filtered.filter(tx => tx.status === status);
  }

  res.json({
    total: filtered.length,
    transactions: filtered.slice(parseInt(offset), parseInt(offset) + parseInt(limit))
  });
});

/**
 * Freeze wallet
 * POST /api/wallets/:id/freeze
 */
app.post('/api/wallets/:id/freeze',requireAuth,  (req, res) => {
  try {
    const { reason } = req.body;
    const wallet = freezeWallet(req.params.id, reason);
    res.json(wallet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get all wallets for agent
 * GET /api/wallets/agent/:agentId
 */
app.get('/api/wallets/agent/:agentId', (req, res) => {
  const agentWallets = Array.from(wallets.values()).filter(
    w => w.agentId === req.params.agentId
  );
  res.json(agentWallets);
});

/**
 * Get network statistics
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const allWallets = Array.from(wallets.values());
  const allEscrow = Array.from(escrowAccounts.values());

  const totalBalance = {};
  CURRENCIES.forEach(c => {
    totalBalance[c] = allWallets.reduce((sum, w) => sum + (w.balances[c] || 0), 0);
  });

  res.json({
    totalWallets: allWallets.length,
    totalEscrow: allEscrow.filter(e => e.status === 'held').length,
    totalTransactions: Array.from(transactions.values()).reduce((sum, t) => sum + t.length, 0),
    totalVolume: totalBalance,
    byStatus: {
      active: allWallets.filter(w => w.status === 'active' && !w.frozen).length,
      frozen: allWallets.filter(w => w.frozen).length,
      closed: allWallets.filter(w => w.status === 'closed').length
    }
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT WALLETS SERVICE                              ║
║                 Version 1.0.0                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Supported Currencies:                                       ║
║    USD  EUR  GBP  INR  AED  SGD                              ║
╠══════════════════════════════════════════════════════════════╣
║  Transaction Types:                                          ║
║    Deposit, Withdrawal, Payment, Receipt                     ║
║    Escrow Hold, Release, Refund                             ║
║    Fee, Refund, Subscription                                 ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/wallets              Create wallet           ║
║    GET    /api/wallets/:id         Get wallet              ║
║    GET    /api/wallets/:id/balance Get balance             ║
║    POST   /api/wallets/:id/deposit Deposit funds           ║
║    POST   /api/wallets/:id/withdraw Withdraw funds         ║
║    POST   /api/wallets/:id/pay     Pay another agent       ║
║    POST   /api/wallets/:id/escrow  Hold escrow            ║
║    POST   /api/escrow/:id/release  Release escrow           ║
║    POST   /api/escrow/:id/refund  Refund escrow           ║
║    GET    /api/wallets/:id/transactions  Get history       ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
