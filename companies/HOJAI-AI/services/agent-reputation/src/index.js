/**
 * Agent Reputation Service
 *
 * Tracks and manages trust scores for all AI agents in the network.
 * Provides:
 * - Reputation scores (0-100)
 * - Transaction history
 * - Trust badges
 * - Dispute records
 * - Identity verification
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4820;

// In-memory stores
const agentReputations = new Map();
const transactionRecords = new Map();
const disputeRecords = new Map();
const trustBadges = new Map();
const verificationRecords = new Map();

// Reputation factors with weights
const REPUTATION_FACTORS = {
  transactionSuccess: 0.30,      // 30% - Successful transactions
  responseTime: 0.15,             // 15% - Average response time
  disputeRate: 0.20,              // 20% - Low dispute rate
  identityVerified: 0.15,         // 15% - Verified identity
  longevity: 0.10,               // 10% - Time in network
  consistency: 0.10              // 10% - Consistent behavior
};

// Trust badges
const BADGES = {
  VERIFIED: { name: 'Verified', icon: '✓', points: 10 },
  TOP_RATED: { name: 'Top Rated', icon: '⭐', points: 15 },
  TRUSTED: { name: 'Trusted', icon: '🛡️', points: 20 },
  POWER_SELLER: { name: 'Power Seller', icon: '⚡', points: 25 },
  NEWBIE: { name: 'Newcomer', icon: '🌱', points: 0 },
  RISKY: { name: 'Caution', icon: '⚠️', points: -20 },
  BLOCKED: { name: 'Blocked', icon: '🚫', points: -100 }
};

/**
 * Create initial reputation record
 */
function createReputationRecord(agentId, agentType) {
  const record = {
    agentId,
    agentType,
    overall: 50,  // Start at 50 (neutral)
    factors: {
      transactionSuccess: 50,
      responseTime: 50,
      disputeRate: 50,
      identityVerified: 0,
      longevity: 0,
      consistency: 50
    },
    stats: {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      disputedTransactions: 0,
      totalVolume: 0,
      averageResponseTime: 0,
      longestStreak: 0,
      currentStreak: 0
    },
    badges: ['NEWBIE'],
    level: 'bronze',
    rank: 0,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    verified: false,
    verifiedAt: null,
    verifiedBy: null,
    riskFlags: [],
    blocked: false,
    blockedAt: null,
    blockReason: null
  };

  agentReputations.set(agentId, record);
  transactionRecords.set(agentId, []);
  return record;
}

/**
 * Calculate overall reputation score
 */
function calculateReputation(record) {
  const factors = record.factors;
  let score = 0;

  // Transaction success (0-100)
  const successRate = record.stats.totalTransactions > 0
    ? (record.stats.successfulTransactions / record.stats.totalTransactions) * 100
    : 50;
  factors.transactionSuccess = successRate;

  // Response time (0-100, lower time = higher score)
  if (record.stats.averageResponseTime <= 1) factors.responseTime = 100;
  else if (record.stats.averageResponseTime <= 5) factors.responseTime = 80;
  else if (record.stats.averageResponseTime <= 30) factors.responseTime = 60;
  else if (record.stats.averageResponseTime <= 60) factors.responseTime = 40;
  else factors.responseTime = 20;

  // Dispute rate (0-100, lower = better)
  const disputeRate = record.stats.totalTransactions > 0
    ? (record.stats.disputedTransactions / record.stats.totalTransactions) * 100
    : 0;
  factors.disputeRate = Math.max(0, 100 - disputeRate * 10);

  // Identity verification
  factors.identityVerified = record.verified ? 100 : 0;

  // Longevity (0-100, caps at 365 days)
  const daysActive = (Date.now() - new Date(record.createdAt).getTime()) / (1000 * 60 * 60 * 24);
  factors.longevity = Math.min(100, (daysActive / 365) * 100);

  // Calculate weighted overall
  score = (
    factors.transactionSuccess * REPUTATION_FACTORS.transactionSuccess +
    factors.responseTime * REPUTATION_FACTORS.responseTime +
    factors.disputeRate * REPUTATION_FACTORS.disputeRate +
    factors.identityVerified * REPUTATION_FACTORS.identityVerified +
    factors.longevity * REPUTATION_FACTORS.longevity +
    factors.consistency * REPUTATION_FACTORS.consistency
  );

  // Apply badge modifiers
  record.badges.forEach(badge => {
    const badgeInfo = BADGES[badge];
    if (badgeInfo) {
      score += badgeInfo.points;
    }
  });

  // Apply risk penalties
  if (record.riskFlags.includes('high_disputes')) score -= 15;
  if (record.riskFlags.includes('late_responses')) score -= 10;
  if (record.riskFlags.includes('unverified')) score -= 5;

  // Clamp to 0-100
  record.overall = Math.max(0, Math.min(100, Math.round(score)));

  // Update level
  record.level = getLevel(record.overall);

  record.lastUpdated = new Date().toISOString();
  return record;
}

/**
 * Get level from score
 */
function getLevel(score) {
  if (score >= 90) return 'platinum';
  if (score >= 80) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'iron';
  return 'restricted';
}

/**
 * Record a transaction
 */
function recordTransaction(agentId, transaction) {
  const records = transactionRecords.get(agentId) || [];
  const record = {
    id: uuidv4(),
    ...transaction,
    timestamp: new Date().toISOString()
  };

  records.push(record);
  transactionRecords.set(agentId, records);

  // Update reputation stats
  const reputation = agentReputations.get(agentId);
  if (reputation) {
    reputation.stats.totalTransactions++;

    if (transaction.success) {
      reputation.stats.successfulTransactions++;
      reputation.stats.currentStreak++;
      reputation.stats.longestStreak = Math.max(
        reputation.stats.longestStreak,
        reputation.stats.currentStreak
      );
    } else {
      reputation.stats.currentStreak = 0;
    }

    if (transaction.disputed) {
      reputation.stats.disputedTransactions++;
      reputation.riskFlags.push('disputed_transaction');
    }

    if (transaction.volume) {
      reputation.stats.totalVolume += transaction.volume;
    }

    if (transaction.responseTime) {
      const avg = reputation.stats.averageResponseTime;
      const count = reputation.stats.totalTransactions;
      reputation.stats.averageResponseTime =
        (avg * (count - 1) + transaction.responseTime) / count;
    }

    // Check for risk flags
    checkRiskFlags(reputation);

    // Check for badge upgrades
    checkBadges(reputation);

    calculateReputation(reputation);
    agentReputations.set(agentId, reputation);
  }

  return record;
}

/**
 * Check and update risk flags
 */
function checkRiskFlags(record) {
  record.riskFlags = [];

  // High dispute rate
  if (record.stats.totalTransactions >= 10) {
    const disputeRate = record.stats.disputedTransactions / record.stats.totalTransactions;
    if (disputeRate > 0.1) record.riskFlags.push('high_disputes');
  }

  // Slow responses
  if (record.stats.averageResponseTime > 60) {
    record.riskFlags.push('late_responses');
  }

  // Unverified
  if (!record.verified) {
    record.riskFlags.push('unverified');
  }

  // Block if too many disputes
  if (record.stats.disputedTransactions > 5) {
    record.riskFlags.push('excessive_disputes');
  }
}

/**
 * Check and award badges
 */
function checkBadges(record) {
  const currentBadges = new Set(record.badges);

  // Remove NEWBIE after first transaction
  if (record.stats.totalTransactions >= 1) {
    currentBadges.delete('NEWBIE');
  }

  // Verified
  if (record.verified) {
    currentBadges.add('VERIFIED');
  }

  // Top Rated (80+ score)
  if (record.overall >= 80) {
    currentBadges.add('TOP_RATED');
  }

  // Trusted (90+ score)
  if (record.overall >= 90) {
    currentBadges.add('TRUSTED');
  }

  // Power Seller (100+ transactions)
  if (record.stats.totalTransactions >= 100) {
    currentBadges.add('POWER_SELLER');
  }

  // Caution if score drops below 40
  if (record.overall < 40) {
    currentBadges.add('RISKY');
  }

  record.badges = Array.from(currentBadges);
}

/**
 * Record a dispute
 */
function recordDispute(agentId, dispute) {
  const records = disputeRecords.get(agentId) || [];
  const record = {
    id: uuidv4(),
    ...dispute,
    timestamp: new Date().toISOString(),
    status: 'open'
  };

  records.push(record);
  disputeRecords.set(agentId, records);

  // Update reputation
  const reputation = agentReputations.get(agentId);
  if (reputation) {
    reputation.stats.disputedTransactions++;
    checkRiskFlags(reputation);
    calculateReputation(reputation);
    agentReputations.set(agentId, reputation);
  }

  return record;
}

/**
 * Resolve a dispute
 */
function resolveDispute(disputeId, resolution) {
  for (const [agentId, records] of disputeRecords.entries()) {
    const dispute = records.find(d => d.id === disputeId);
    if (dispute) {
      dispute.status = 'resolved';
      dispute.resolution = resolution;
      dispute.resolvedAt = new Date().toISOString();

      // Update reputation based on resolution
      const reputation = agentReputations.get(agentId);
      if (reputation) {
        if (resolution.favor === 'buyer') {
          reputation.stats.successfulTransactions--;
        }
        reputation.riskFlags = reputation.riskFlags.filter(f => f !== 'disputed_transaction');
        calculateReputation(reputation);
        agentReputations.set(agentId, reputation);
      }

      return dispute;
    }
  }
  return null;
}

/**
 * Verify agent identity
 */
function verifyAgent(agentId, verificationData) {
  const record = agentReputations.get(agentId);
  if (!record) {
    throw new Error('Agent not found');
  }

  record.verified = true;
  record.verifiedAt = new Date().toISOString();
  record.verifiedBy = verificationData.verifiedBy || 'system';
  record.verificationLevel = verificationData.level || 'basic';

  checkBadges(record);
  calculateReputation(record);
  agentReputations.set(agentId, record);

  verificationRecords.set(agentId, {
    ...verificationData,
    verifiedAt: record.verifiedAt,
    verificationId: uuidv4()
  });

  return record;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Agent Reputation Service',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalAgents: agentReputations.size,
      verifiedAgents: Array.from(agentReputations.values()).filter(r => r.verified).length,
      blockedAgents: Array.from(agentReputations.values()).filter(r => r.blocked).length
    }
  });
});

/**
 * Create reputation record
 * POST /api/reputation
 */
app.post('/api/reputation', (req, res) => {
  try {
    const { agentId, agentType } = req.body;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }

    const record = createReputationRecord(agentId, agentType);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get reputation record
 * GET /api/reputation/:agentId
 */
app.get('/api/reputation/:agentId', (req, res) => {
  const record = agentReputations.get(req.params.agentId);
  if (!record) {
    return res.status(404).json({ error: 'Reputation record not found' });
  }
  res.json(record);
});

/**
 * Get reputation with trust score
 * GET /api/reputation/:agentId/trust
 */
app.get('/api/reputation/:agentId/trust', (req, res) => {
  const record = agentReputations.get(req.params.agentId);
  if (!record) {
    return res.status(404).json({ error: 'Reputation record not found' });
  }

  res.json({
    agentId: record.agentId,
    trustScore: record.overall,
    level: record.level,
    badges: record.badges.map(b => BADGES[b] || { name: b, icon: '?' }),
    verified: record.verified,
    riskFlags: record.riskFlags,
    blocked: record.blocked,
    summary: {
      transactions: record.stats.totalTransactions,
      successRate: record.stats.totalTransactions > 0
        ? ((record.stats.successfulTransactions / record.stats.totalTransactions) * 100).toFixed(1) + '%'
        : 'N/A',
      avgResponseTime: record.stats.averageResponseTime.toFixed(1) + 's'
    }
  });
});

/**
 * Record transaction
 * POST /api/reputation/:agentId/transactions
 */
app.post('/api/reputation/:agentId/transactions', (req, res) => {
  try {
    const { success, disputed, volume, responseTime, type, partnerId } = req.body;

    const record = recordTransaction(req.params.agentId, {
      success,
      disputed,
      volume,
      responseTime,
      type,
      partnerId
    });

    const reputation = agentReputations.get(req.params.agentId);
    res.json({ transaction: record, reputation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get transaction history
 * GET /api/reputation/:agentId/transactions
 */
app.get('/api/reputation/:agentId/transactions', (req, res) => {
  const records = transactionRecords.get(req.params.agentId) || [];
  const { limit = 50, offset = 0 } = req.query;

  res.json({
    total: records.length,
    transactions: records.slice(-limit - offset, -offset || undefined)
  });
});

/**
 * Record dispute
 * POST /api/reputation/:agentId/disputes
 */
app.post('/api/reputation/:agentId/disputes', (req, res) => {
  try {
    const dispute = recordDispute(req.params.agentId, req.body);
    const reputation = agentReputations.get(req.params.agentId);
    res.json({ dispute, reputation });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Resolve dispute
 * POST /api/disputes/:disputeId/resolve
 */
app.post('/api/disputes/:disputeId/resolve', (req, res) => {
  try {
    const dispute = resolveDispute(req.params.disputeId, req.body);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found' });
    }
    res.json(dispute);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Verify agent
 * POST /api/reputation/:agentId/verify
 */
app.post('/api/reputation/:agentId/verify', (req, res) => {
  try {
    const record = verifyAgent(req.params.agentId, req.body);
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Block agent
 * POST /api/reputation/:agentId/block
 */
app.post('/api/reputation/:agentId/block', (req, res) => {
  try {
    const record = agentReputations.get(req.params.agentId);
    if (!record) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    record.blocked = true;
    record.blockedAt = new Date().toISOString();
    record.blockReason = req.body.reason || 'Policy violation';
    record.badges.push('BLOCKED');

    agentReputations.set(req.params.agentId, record);
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Unblock agent
 * POST /api/reputation/:agentId/unblock
 */
app.post('/api/reputation/:agentId/unblock', (req, res) => {
  try {
    const record = agentReputations.get(req.params.agentId);
    if (!record) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    record.blocked = false;
    record.blockedAt = null;
    record.blockReason = null;
    record.badges = record.badges.filter(b => b !== 'BLOCKED');

    agentReputations.set(req.params.agentId, record);
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get leaderboard
 * GET /api/leaderboard
 */
app.get('/api/leaderboard', (req, res) => {
  const { type, limit = 20 } = req.query;

  let agents = Array.from(agentReputations.values());

  if (type) {
    agents = agents.filter(a => a.agentType === type);
  }

  agents.sort((a, b) => b.overall - a.overall);

  const leaderboard = agents.slice(0, limit).map((a, i) => ({
    rank: i + 1,
    agentId: a.agentId,
    agentType: a.agentType,
    overall: a.overall,
    level: a.level,
    badges: a.badges,
    transactions: a.stats.totalTransactions
  }));

  res.json({ leaderboard });
});

/**
 * Get network stats
 * GET /api/stats
 */
app.get('/api/stats', (req, res) => {
  const all = Array.from(agentReputations.values());

  res.json({
    totalAgents: all.length,
    verifiedAgents: all.filter(a => a.verified).length,
    blockedAgents: all.filter(a => a.blocked).length,
    avgTrustScore: (all.reduce((sum, a) => sum + a.overall, 0) / all.length).toFixed(1),
    byLevel: {
      platinum: all.filter(a => a.level === 'platinum').length,
      gold: all.filter(a => a.level === 'gold').length,
      silver: all.filter(a => a.level === 'silver').length,
      bronze: all.filter(a => a.level === 'bronze').length
    },
    totalTransactions: all.reduce((sum, a) => sum + a.stats.totalTransactions, 0),
    totalDisputes: all.reduce((sum, a) => sum + a.stats.disputedTransactions, 0)
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT REPUTATION SERVICE                            ║
║                  Version 1.0.0                                 ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Trust Factors:                                              ║
║    Transaction Success  → 30%                                ║
║    Response Time        → 15%                                ║
║    Dispute Rate         → 20%                                ║
║    Identity Verified    → 15%                                ║
║    Longevity            → 10%                                ║
║    Consistency          → 10%                                ║
╠══════════════════════════════════════════════════════════════╣
║  Badges:                                                      ║
║    ✓ Verified  ⭐ Top Rated  🛡️ Trusted  ⚡ Power Seller     ║
║    🌱 Newcomer  ⚠️ Caution  🚫 Blocked                        ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/reputation              Create record         ║
║    GET    /api/reputation/:id         Get reputation         ║
║    GET    /api/reputation/:id/trust   Get trust score       ║
║    POST   /api/reputation/:id/transactions  Record tx       ║
║    POST   /api/reputation/:id/verify  Verify agent         ║
║    GET    /api/leaderboard            Get leaderboard        ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
