/**
 * Agent Trust Economy - v1.0.0
 * ================================
 * Trust tokens, credits, and economic incentives for AI agents.
 *
 * Port: 4985
 *
 * Features:
 * - Trust credits
 * - Trust staking
 * - Economic incentives
 * - Agent trust marketplace
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4985;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const accounts = new Map();     // agentId -> TrustAccount
const transactions = new Map();   // txId -> Transaction
const stakes = new Map();       // stakeId -> Stake
const incentives = new Map();    // incentiveId -> Incentive

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function createAccount(agentId, initialCredits = 100) {
  return {
    agentId,
    credits: initialCredits,
    staked: 0,
    reputation: 0,
    totalEarned: 0,
    totalSpent: 0,
    transactionCount: 0,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
}

function calculateReputation(account) {
  if (account.transactionCount === 0) return 50;

  // Base reputation from transaction count
  let rep = Math.min(80, account.transactionCount * 2);

  // Bonus from credits
  rep += Math.min(10, account.credits / 100);

  // Bonus from staked amount
  rep += Math.min(10, account.staked / 50);

  return Math.round(rep);
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCOUNT MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /account - Create trust account
 */
app.post('/account', (req, res) => {
  const { agentId, initialCredits = 100 } = req.body;

  if (!agentId) {
    return res.status(400).json({ error: 'agentId required' });
  }

  if (accounts.has(agentId)) {
    return res.status(400).json({ error: 'Account already exists' });
  }

  const account = createAccount(agentId, initialCredits);
  accounts.set(agentId, account);

  res.json({ success: true, account });
});

/**
 * GET /account/:agentId - Get account
 */
app.get('/account/:agentId', (req, res) => {
  const { agentId } = req.params;
  const account = accounts.get(agentId);

  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  account.reputation = calculateReputation(account);
  accounts.set(agentId, account);

  res.json({ account });
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /transfer - Transfer trust credits
 */
app.post('/transfer', (req, res) => {
  const { fromAgentId, toAgentId, amount, reason, type = 'payment' } = req.body;

  if (!fromAgentId || !toAgentId || !amount) {
    return res.status(400).json({ error: 'fromAgentId, toAgentId, and amount required' });
  }

  let fromAccount = accounts.get(fromAgentId);
  let toAccount = accounts.get(toAgentId);

  if (!fromAccount) {
    fromAccount = createAccount(fromAgentId, 0);
    accounts.set(fromAgentId, fromAccount);
  }

  if (!toAccount) {
    toAccount = createAccount(toAgentId);
    accounts.set(toAgentId, toAccount);
  }

  if (fromAccount.credits < amount) {
    return res.status(400).json({ error: 'Insufficient credits' });
  }

  // Process transfer
  fromAccount.credits -= amount;
  fromAccount.totalSpent += amount;
  fromAccount.transactionCount++;
  fromAccount.lastActivity = new Date().toISOString();

  toAccount.credits += amount;
  toAccount.totalEarned += amount;
  toAccount.transactionCount++;
  toAccount.lastActivity = new Date().toISOString();

  const transaction = {
    id: uuidv4(),
    from: fromAgentId,
    to: toAgentId,
    amount,
    reason: reason || '',
    type,  // 'payment', 'reward', 'penalty', 'staking'
    status: 'completed',
    timestamp: new Date().toISOString()
  };

  transactions.set(transaction.id, transaction);

  // Update accounts
  fromAccount.reputation = calculateReputation(fromAccount);
  toAccount.reputation = calculateReputation(toAccount);
  accounts.set(fromAgentId, fromAccount);
  accounts.set(toAgentId, toAccount);

  res.json({ success: true, transaction });
});

/**
 * GET /transactions/:agentId - Get agent transactions
 */
app.get('/transactions/:agentId', (req, res) => {
  const { agentId } = req.params;
  const { limit = 20, offset = 0 } = req.query;

  const agentTxs = [];
  transactions.forEach(tx => {
    if (tx.from === agentId || tx.to === agentId) {
      agentTxs.push(tx);
    }
  });

  agentTxs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const paginated = agentTxs.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    agentId,
    transactions: paginated,
    total: agentTxs.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STAKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /stake - Stake trust credits
 */
app.post('/stake', (req, res) => {
  const { agentId, amount, duration = 30, purpose } = req.body;

  if (!agentId || !amount) {
    return res.status(400).json({ error: 'agentId and amount required' });
  }

  let account = accounts.get(agentId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  if (account.credits < amount) {
    return res.status(400).json({ error: 'Insufficient credits to stake' });
  }

  // Move credits to staked
  account.credits -= amount;
  account.staked += amount;

  const stake = {
    id: uuidv4(),
    agentId,
    amount,
    duration,
    purpose: purpose || 'general',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    reward: amount * 0.05 // 5% reward for staking
  };

  stakes.set(stake.id, stake);
  accounts.set(agentId, account);

  res.json({ success: true, stake });
});

/**
 * POST /unstake - Unstake credits
 */
app.post('/unstake', (req, res) => {
  const { agentId, stakeId } = req.body;

  const stake = stakes.get(stakeId);
  if (!stake) {
    return res.status(404).json({ error: 'Stake not found' });
  }

  if (stake.agentId !== agentId) {
    return res.status(403).json({ error: 'Not your stake' });
  }

  if (stake.status !== 'active') {
    return res.status(400).json({ error: 'Stake already released' });
  }

  let account = accounts.get(agentId);

  // Release stake + reward
  const releaseAmount = stake.amount + stake.reward;
  account.credits += releaseAmount;
  account.staked -= stake.amount;
  account.totalEarned += stake.reward;

  stake.status = 'released';
  stake.releasedAt = new Date().toISOString();
  stakes.set(stakeId, stake);
  accounts.set(agentId, account);

  res.json({ success: true, released: releaseAmount, stake });
});

// ─────────────────────────────────────────────────────────────────────────────
// INCENTIVES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /incentive - Create incentive
 */
app.post('/incentive', (req, res) => {
  const { title, description, agentId, action, reward, expiry } = req.body;

  if (!title || !action || !reward) {
    return res.status(400).json({ error: 'title, action, and reward required' });
  }

  const incentive = {
    id: uuidv4(),
    title,
    description: description || '',
    agentId: agentId || null,  // null = available to all
    action,
    reward,
    status: 'active',
    claimed: 0,
    createdAt: new Date().toISOString(),
    expiresAt: expiry || null
  };

  incentives.set(incentive.id, incentive);

  res.json({ success: true, incentive });
});

/**
 * POST /claim - Claim incentive
 */
app.post('/claim', (req, res) => {
  const { agentId, incentiveId } = req.body;

  if (!agentId || !incentiveId) {
    return res.status(400).json({ error: 'agentId and incentiveId required' });
  }

  const incentive = incentives.get(incentiveId);
  if (!incentive) {
    return res.status(404).json({ error: 'Incentive not found' });
  }

  if (incentive.status !== 'active') {
    return res.status(400).json({ error: 'Incentive not available' });
  }

  if (incentive.expiresAt && new Date(incentive.expiresAt) < new Date()) {
    incentive.status = 'expired';
    incentives.set(incentiveId, incentive);
    return res.status(400).json({ error: 'Incentive expired' });
  }

  // Credit reward
  let account = accounts.get(agentId);
  if (!account) {
    account = createAccount(agentId, 0);
    accounts.set(agentId, account);
  }

  account.credits += incentive.reward;
  account.totalEarned += incentive.reward;
  accounts.set(agentId, account);

  incentive.claimed++;
  incentives.set(incentiveId, incentive);

  // Record transaction
  const tx = {
    id: uuidv4(),
    from: 'incentive_pool',
    to: agentId,
    amount: incentive.reward,
    reason: incentive.title,
    type: 'reward',
    timestamp: new Date().toISOString()
  };
  transactions.set(tx.id, tx);

  res.json({ success: true, reward: incentive.reward });
});

/**
 * GET /incentives - List available incentives
 */
app.get('/incentives', (req, res) => {
  const { agentId } = req.query;

  const available = [];
  incentives.forEach(incentive => {
    if (incentive.status === 'active') {
      if (!incentive.expiresAt || new Date(incentive.expiresAt) > new Date()) {
        if (!incentive.agentId || incentive.agentId === agentId) {
          available.push(incentive);
        }
      }
    }
  });

  res.json({ incentives: available });
});

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /leaderboard - Get trust economy leaderboard
 */
app.get('/leaderboard', (req, res) => {
  const { limit = 10, sortBy = 'credits' } = req.query;

  const leaders = [];
  accounts.forEach(account => {
    account.reputation = calculateReputation(account);
    leaders.push({ ...account });
  });

  leaders.sort((a, b) => {
    switch (sortBy) {
      case 'reputation': return b.reputation - a.reputation;
      case 'totalEarned': return b.totalEarned - a.totalEarned;
      case 'transactions': return b.transactionCount - a.transactionCount;
      default: return b.credits - a.credits;
    }
  });

  res.json({
    leaderboard: leaders.slice(0, parseInt(limit)),
    sortBy
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-trust-economy',
    port: PORT,
    accounts: accounts.size,
    transactions: transactions.size,
    stakes: stakes.size,
    incentives: incentives.size
  });
});

app.listen(PORT, () => {
  console.log(`Agent Trust Economy running on port ${PORT}`);
});

export default app;
