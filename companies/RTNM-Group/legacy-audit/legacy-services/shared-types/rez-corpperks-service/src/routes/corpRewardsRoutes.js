/**
 * CorpPerks Rewards Routes
 * ReZ Coins, Tiers, Rewards Catalog
 */

const express = require('express');
const router = express.Router();

// In-memory stores
const transactionsStore = [];
const catalogItems = [
  { id: 'R001', name: '₹100 Gift Card', points: 1000, category: 'voucher', stock: 100 },
  { id: 'R002', name: '₹500 Gift Card', points: 4500, category: 'voucher', stock: 50 },
  { id: 'R003', name: 'Premium Headphones', points: 5000, category: 'electronics', stock: 20 },
  { id: 'R004', name: 'Smart Watch', points: 10000, category: 'electronics', stock: 10 },
  { id: 'R005', name: 'Day Off', points: 2000, category: 'experience', stock: 999 },
  { id: 'R006', name: 'Extra Meal Budget', points: 500, category: 'benefit', stock: 999 },
];

const tiers = [
  { name: 'Bronze', minPoints: 0, maxPoints: 4999, color: '#cd7f32', benefits: ['5% discount on rewards'] },
  { name: 'Silver', minPoints: 5000, maxPoints: 14999, color: '#c0c0c0', benefits: ['7% discount on rewards', 'Priority support'] },
  { name: 'Gold', minPoints: 15000, maxPoints: 49999, color: '#ffd700', benefits: ['10% discount on rewards', 'Priority support', 'Exclusive access'] },
  { name: 'Platinum', minPoints: 50000, maxPoints: Infinity, color: '#e5e4e2', benefits: ['15% discount on rewards', 'VIP support', 'Early access', 'Personal concierge'] },
];

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// GET /api/rewards/summary
router.get('/summary', (req, res) => {
  const userPoints = 12500;
  const currentTier = tiers.find(t => userPoints >= t.minPoints && userPoints < t.maxPoints) || tiers[0];

  res.json({
    success: true,
    data: {
      balance: userPoints,
      tier: currentTier.name,
      tierColor: currentTier.color,
      nextTier: tiers[tiers.indexOf(currentTier) + 1]?.name || null,
      pointsToNextTier: currentTier.nextTier ? currentTier.nextTier.minPoints - userPoints : 0,
      lifetimeEarned: 25000,
      lifetimeRedeemed: 12500,
    }
  });
});

// GET /api/rewards/transactions
router.get('/transactions', (req, res) => {
  const transactions = [
    { id: 'TX001', type: 'earn', amount: 500, source: 'Referral Bonus', description: 'Referred Jane', createdAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'TX002', type: 'redeem', amount: 1000, source: 'Reward Redemption', description: '₹100 Gift Card', createdAt: new Date(Date.now() - 172800000).toISOString() },
    { id: 'TX003', type: 'earn', amount: 200, source: 'Karma Points', description: 'Completed volunteer event', createdAt: new Date(Date.now() - 259200000).toISOString() },
  ];

  res.json({ success: true, data: transactions });
});

// POST /api/rewards/award
router.post('/award', requireAuth, (req, res) => {
  const { employeeId, points, reason, type } = req.body;

  const transaction = {
    id: `TX${Date.now()}`,
    employeeId,
    type: 'earn',
    amount: points,
    source: 'Company Reward',
    description: reason,
    awardedBy: 'Admin',
    createdAt: new Date().toISOString(),
  };

  transactionsStore.push(transaction);

  res.json({
    success: true,
    data: {
      transaction,
      newBalance: 12500 + points,
      message: `Awarded ${points} ReZ Coins to ${employeeId}`,
    }
  });
});

// POST /api/rewards/bulk-award
router.post('/bulk-award', requireAuth, (req, res) => {
  const { awards } = req.body; // [{ employeeId, points, reason }]

  const results = awards.map(a => ({
    employeeId: a.employeeId,
    status: 'success',
    transactionId: `TX${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
  }));

  res.json({
    success: true,
    data: {
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    }
  });
});

// GET /api/rewards/tiers
router.get('/tiers', (req, res) => {
  res.json({ success: true, data: tiers });
});

// GET /api/rewards/catalog
router.get('/catalog', (req, res) => {
  const { category, page, limit } = req.query;
  let items = catalogItems;
  if (category) items = items.filter(i => i.category === category);

  res.json({
    success: true,
    data: items,
    pagination: { page: parseInt(page) || 1, limit: parseInt(limit) || 10, total: items.length }
  });
});

// POST /api/rewards/redeem
router.post('/redeem', (req, res) => {
  const { itemId } = req.body;
  const userPoints = 12500;

  const item = catalogItems.find(i => i.id === itemId);
  if (!item) return res.status(404).json({ success: false, message: 'Item not found' });

  if (userPoints < item.points) {
    return res.status(400).json({ success: false, message: 'Insufficient points' });
  }

  const redemption = {
    id: `RD${Date.now()}`,
    itemId,
    itemName: item.name,
    pointsRedeemed: item.points,
    remainingPoints: userPoints - item.points,
    status: 'confirmed',
    estimatedDelivery: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  res.json({ success: true, data: redemption });
});

// GET /api/rewards/stats
router.get('/stats', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      totalCoinsDistributed: 500000,
      totalRedemptions: 1250,
      topRewards: catalogItems.slice(0, 3),
      redemptionRate: 68.5,
    }
  });
});

module.exports = router;
