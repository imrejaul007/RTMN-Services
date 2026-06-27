/**
 * RTMN Wallet Twin Service - Digital wallet, balance, coins, credit, rewards
 */
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { v4: uuidv4 } = require('uuid');
const { PersistentStore } = require('@rtmn/shared/lib/persistent-store');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const {
  requireAuth,
  preventPrototypePollution,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestId,
  requestLogger,
  logger,
  defaultLimiter,
  strictLimiter,
  installPhase5
} = require('@rtmn/twinos-shared');
const { publish, publishAsync } = require('@rtmn/twinos-shared/src/event-publisher.js');
const { platform } = require('@rtmn/twinos-shared/src/platform-client.js');

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


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4896;
const SERVICE_NAME = 'wallet-twin';

app.use(require('helmet')());
app.use(require('cors')({ origin: process.env.CORS_ORIGINS?.split(',') || '*', credentials: true }));
app.use(require('compression')());
app.use(require('morgan')('combined'));
app.use(express.json({ limit: '1mb' }));
app.use(requestId);
app.use(requestLogger);

// Storage (file-backed JSON; survives restarts)
const wallets = new PersistentStore('wallets', { serviceName: 'wallet-twin' });
const transactions = new PersistentStore('transactions', { serviceName: 'wallet-twin' });
const rewards = new PersistentStore('rewards', { serviceName: 'wallet-twin' });
const idempotencyKeys = new Map(); // in-memory TTL cache (NOT a data store)

// Per-wallet async mutex to prevent race conditions on concurrent topup/deduct
const walletLocks = new Map();
async function withWalletLock(walletId, fn) {
  const prev = walletLocks.get(walletId) || Promise.resolve();
  let release;
  const next = new Promise(r => { release = r; });
  walletLocks.set(walletId, prev.then(() => next));
  try {
    await prev;
    return await fn();
  } finally {
    release();
    // Clean up if no one is waiting
    if (walletLocks.get(walletId) === next) walletLocks.delete(walletId);
  }
}

const WALLET_TYPES = { CASH: 'cash', CREDIT: 'credit', REWARD: 'reward', CRYPTO: 'crypto' };
const TX_TYPES = { CREDIT: 'credit', DEBIT: 'debit', TRANSFER: 'transfer', REWARD: 'reward', REFUND: 'refund' };

// TTL for idempotency keys (24h)
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of idempotencyKeys.entries()) {
    if (entry.expiresAt && entry.expiresAt < now) {
      idempotencyKeys.delete(key);
      removed++;
    }
  }
  if (removed > 0) logger.info('Cleaned expired idempotency keys', { count: removed });
}, 60 * 60 * 1000); // hourly

function createTwin(type, data) {
  const now = new Date().toISOString();
  return { id: `${type}-${uuidv4().slice(0, 8)}`, type, ...data, status: 'active', version: 1, createdAt: now, updatedAt: now };
}

/** GET /api/twins/wallet/:customerId */
app.get('/api/twins/wallet/:customerId', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  let wallet = wallets.findOne(w => w.customerId === req.params.customerId && w.businessId === req.user.businessId);
  if (!wallet) {
    wallet = createTwin('wallet', { customerId: req.params.customerId, businessId: req.user.businessId, balance: 0, coins: 0, credit: 0, currency: 'USD', rewardsPoints: 0 });
    await wallets.set(wallet.id, wallet);
  }
  const txns = transactions.find(t => t.walletId === wallet.id).slice(-50);
  res.json({ success: true, twin: { ...wallet, recentTransactions: txns } });
}));

/** POST /api/twins/wallet/:customerId/topup - Add funds */
app.post('/api/twins/wallet/:customerId/topup', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { amount, idempotencyKey, source, type = 'cash' } = preventPrototypePollution(req.body);
  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be positive' } });

  if (idempotencyKey && idempotencyKeys.has(idempotencyKey)) {
    return res.json({ success: true, twin: idempotencyKeys.get(idempotencyKey).value, idempotent: true });
  }

  // Find or create wallet
  let wallet = wallets.findOne(w => w.customerId === req.params.customerId && w.businessId === req.user.businessId);
  if (!wallet) {
    wallet = createTwin('wallet', { customerId: req.params.customerId, businessId: req.user.businessId, balance: 0, coins: 0, credit: 0, currency: 'USD', rewardsPoints: 0 });
    await wallets.set(wallet.id, wallet);
  }

  // Atomic mutation under per-wallet lock
  const result = await withWalletLock(wallet.id, async () => {
    wallet[type] = (wallet[type] || 0) + amount;
    wallet.updatedAt = new Date().toISOString();

    const txn = createTwin('transaction', { walletId: wallet.id, type: TX_TYPES.CREDIT, amount, source, balanceAfter: (wallet.balance||0) + (wallet.credit||0) + (wallet.coins||0), reference: idempotencyKey });
    await transactions.set(txn.id, txn);
    // Persist the mutated wallet (fix for silent-mutation bug: prior code only wrote on create, so topups never reached disk)
    await wallets.set(wallet.id, wallet);
    return { wallet, txn };
  });

  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, { value: result.wallet, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
  }

  publishAsync('wallet.transaction.created', { txnId: result.txn.id, walletId: result.wallet.id, type, amount, customerId: req.params.customerId });
  publishAsync('wallet.wallet.updated', { walletId: result.wallet.id, balance: result.wallet.balance });
  platform.memory.recordEvent('wallet.topup', { walletId: result.wallet.id, amount, currency: result.wallet.currency }, result.wallet.id);
  publishAsync('wallet.transaction.completed', { walletId: result.wallet.id, type: 'topup', amount, currency: result.wallet.currency });
  logger.info('Wallet topped up', { walletId: result.wallet.id, amount, type });
  res.json({ success: true, twin: result.wallet, transaction: result.txn });
}));

/** POST /api/twins/wallet/:customerId/deduct - Deduct funds */
app.post('/api/twins/wallet/:customerId/deduct', requireAuth, strictLimiter, asyncHandler(async (req, res) => {
  const { amount, idempotencyKey, type = 'cash', reference, orderId } = preventPrototypePollution(req.body);
  if (!amount || amount <= 0) return res.status(400).json({ success: false, error: { code: 'INVALID_AMOUNT', message: 'Amount must be positive' } });

  if (idempotencyKey && idempotencyKeys.has(idempotencyKey)) {
    return res.json({ success: true, twin: idempotencyKeys.get(idempotencyKey).value, idempotent: true });
  }

  let wallet = wallets.findOne(w => w.customerId === req.params.customerId && w.businessId === req.user.businessId);
  if (!wallet) return res.status(404).json({ success: false, error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found' } });

  // Atomic mutation under per-wallet lock
  const result = await withWalletLock(wallet.id, async () => {
    if ((wallet[type] || 0) < amount) {
      return { error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance' } };
    }
    wallet[type] -= amount;
    wallet.updatedAt = new Date().toISOString();

    const txn = createTwin('transaction', { walletId: wallet.id, type: TX_TYPES.DEBIT, amount, source: reference, orderId, balanceAfter: (wallet.balance||0) + (wallet.credit||0) + (wallet.coins||0) });
    await transactions.set(txn.id, txn);
    // Persist the mutated wallet (fix for silent-mutation bug: prior code only wrote on create, so deducts never reached disk)
    await wallets.set(wallet.id, wallet);
    return { wallet, txn };
  });

  if (result.error) {
    return res.status(400).json({ success: false, error: result.error });
  }

  if (idempotencyKey) {
    idempotencyKeys.set(idempotencyKey, { value: result.wallet, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
  }

  publishAsync('wallet.transaction.created', { txnId: result.txn.id, walletId: result.wallet.id, type: TX_TYPES.DEBIT, amount, customerId: req.params.customerId, orderId });
  publishAsync('wallet.wallet.updated', { walletId: result.wallet.id, balance: result.wallet.balance });
  platform.memory.recordEvent('wallet.deduct', { walletId: result.wallet.id, amount, currency: result.wallet.currency }, result.wallet.id);
  publishAsync('wallet.transaction.completed', { walletId: result.wallet.id, type: 'deduct', amount, currency: result.wallet.currency });
  logger.info('Wallet deducted', { walletId: result.wallet.id, amount, type });
  res.json({ success: true, twin: result.wallet, transaction: result.txn });
}));

/** POST /api/twins/wallet/:customerId/rewards - Add reward points */
app.post('/api/twins/wallet/:customerId/rewards', requireAuth, asyncHandler(async (req, res) => {
  const { points, reason, orderId } = preventPrototypePollution(req.body);
  let wallet = wallets.findOne(w => w.customerId === req.params.customerId && w.businessId === req.user.businessId);
  if (!wallet) {
    wallet = createTwin('wallet', { customerId: req.params.customerId, businessId: req.user.businessId, balance: 0, coins: 0, credit: 0, currency: 'USD', rewardsPoints: 0 });
    await wallets.set(wallet.id, wallet);
  }

  wallet.rewardsPoints = (wallet.rewardsPoints || 0) + (points || 0);
  wallet.updatedAt = new Date().toISOString();

  const txn = createTwin('transaction', { walletId: wallet.id, type: TX_TYPES.REWARD, amount: points, source: reason, orderId, balanceAfter: wallet.rewardsPoints });
  await transactions.set(txn.id, txn);
  // Persist the mutated wallet (fix for silent-mutation bug: prior code never wrote the rewardsPoints bump to disk)
  await wallets.set(wallet.id, wallet);

  publishAsync('wallet.reward.granted', { walletId: wallet.id, customerId: req.params.customerId, points, reason, orderId });
  publishAsync('wallet.rewards.added', { walletId: wallet.id, points });
  res.json({ success: true, twin: wallet, transaction: txn });
}));

/** GET /api/twins/wallet/:customerId/history - Transaction history */
app.get('/api/twins/wallet/:customerId/history', requireAuth, defaultLimiter, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type } = req.query;
  let wallet = wallets.findOne(w => w.customerId === req.params.customerId && w.businessId === req.user.businessId);
  if (!wallet) return res.status(404).json({ success: false, error: { code: 'WALLET_NOT_FOUND', message: 'Wallet not found' } });

  let results = transactions.find(t => t.walletId === wallet.id);
  if (type) results = results.filter(t => t.type === type);
  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = results.length;
  const start = (parseInt(page) - 1) * parseInt(limit);

  res.json({ success: true, transactions: results.slice(start, start + parseInt(limit)), pagination: { page: parseInt(page), limit: parseInt(limit), total } });
}));

/** GET /api/analytics/wallet - Wallet analytics */
app.get('/api/analytics/wallet', requireAuth, asyncHandler(async (req, res) => {
  const businessId = req.user.businessId;
  const businessWallets = wallets.find(w => w.businessId === businessId);

  res.json({
    success: true,
    analytics: {
      totalWallets: businessWallets.length,
      totalBalance: businessWallets.reduce((sum, w) => sum + (w.balance || 0), 0),
      totalCredits: businessWallets.reduce((sum, w) => sum + (w.credit || 0), 0),
      totalRewards: businessWallets.reduce((sum, w) => sum + (w.rewardsPoints || 0), 0),
      activeWallets: businessWallets.filter(w => (w.balance || 0) + (w.credit || 0) > 0).length
    }
  });
}));

app.get('/health', (req, res) => res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', stats: { wallets: wallets.size, transactions: transactions.size } }));
app.get('/ready', (req, res) => res.json({ status: 'ready', service: SERVICE_NAME }));
// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'wallet',
  store: typeof wallets !== 'undefined' ? wallets : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: wallets.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

;
const server = app.listen(PORT, () => logger.info(`💰 Wallet Twin Service running on port ${PORT}`));
installGracefulShutdown(server, phase5Cleanup);


