/**
 * HOJAI SiteOS Loyalty Connector Service
 * Port: 5481
 * Handles points, rewards, tiers, and referrals
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5481;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// API Key Authentication
const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

// Storage helpers
const getFile = (companyId, type) => `${STORAGE_PATH}/siteos-loyalty-${type}-${companyId}.json`;

const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try {
      return JSON.parse(readFileSync(file, 'utf8'));
    } catch (e) {
      return [];
    }
  }
  return [];
};

const saveData = (companyId, type, data) => {
  const file = getFile(companyId, type);
  writeFileSync(file, JSON.stringify(data, null, 2));
};

// Tier configuration
const TIERS = [
  { name: 'bronze', minPoints: 0, discount: 0, perks: ['Basic rewards'] },
  { name: 'silver', minPoints: 1000, discount: 5, perks: ['5% discount', 'Early access'] },
  { name: 'gold', minPoints: 5000, discount: 10, perks: ['10% discount', 'Priority support', 'Free shipping'] },
  { name: 'platinum', minPoints: 15000, discount: 15, perks: ['15% discount', 'VIP support', 'Free shipping', 'Exclusive events'] }
];

// Points earning rules
const EARN_RULES = {
  purchase: { pointsPerRupee: 1, name: 'Purchase' },
  review: { points: 50, name: 'Product Review' },
  referral: { points: 200, name: 'Referral Signup' },
  referralPurchase: { pointsPerRupee: 10, name: 'Referral Purchase Bonus' },
  signup: { points: 100, name: 'Account Signup' },
  birthday: { points: 500, name: 'Birthday Bonus' }
};

// Redeem rules
const REDEEM_RATE = 1; // 1 point = ₹0.01

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'loyalty-connector', port: PORT });
});

// Get tiers
app.get('/api/loyalty/tiers', requireAuth, (req, res) => {
  res.json({ tiers: TIERS });
});

// Get customer tier
app.get('/api/loyalty/tier/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;
  const profiles = loadData(req.companyId, 'profiles');
  const profile = profiles.find(p => p.customerId === customerId);

  if (!profile) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const currentTier = TIERS.find(t => t.name === profile.tier) || TIERS[0];
  const nextTier = TIERS.find(t => t.minPoints > profile.lifetimePoints);

  res.json({
    customerId,
    currentTier: { ...currentTier, points: profile.points },
    nextTier: nextTier || null,
    pointsToNextTier: nextTier ? nextTier.minPoints - profile.lifetimePoints : 0,
    tierProgress: nextTier
      ? Math.round((profile.lifetimePoints / nextTier.minPoints) * 100)
      : 100
  });
});

// Get loyalty balance
app.get('/api/loyalty/balance/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;
  const profiles = loadData(req.companyId, 'profiles');
  const profile = profiles.find(p => p.customerId === customerId);

  if (!profile) {
    return res.json({ customerId, points: 0, tier: 'bronze' });
  }

  res.json({
    customerId,
    points: profile.points,
    lifetimePoints: profile.lifetimePoints,
    tier: profile.tier,
    redeemableValue: Math.round(profile.points * REDEEM_RATE * 100) / 100
  });
});

// Get loyalty profile
app.get('/api/loyalty/profile/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;
  const profiles = loadData(req.companyId, 'profiles');
  const profile = profiles.find(p => p.customerId === customerId);

  if (!profile) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const currentTier = TIERS.find(t => t.name === profile.tier) || TIERS[0];

  res.json({
    ...profile,
    tierPerks: currentTier.perks,
    tierDiscount: currentTier.discount
  });
});

// Create or update loyalty profile
app.post('/api/loyalty/profile', requireAuth, (req, res) => {
  const { customerId, email, name, phone } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required' });
  }

  const profiles = loadData(req.companyId, 'profiles');
  const index = profiles.findIndex(p => p.customerId === customerId);

  const profile = {
    customerId,
    companyId: req.companyId,
    email,
    name,
    phone,
    points: index === -1 ? EARN_RULES.signup.points : profiles[index].points,
    lifetimePoints: index === -1 ? EARN_RULES.signup.points : profiles[index].lifetimePoints,
    tier: 'bronze',
    referralCode: index === -1 ? `REF${customerId.substring(0, 6).toUpperCase()}` : profiles[index].referralCode,
    referralCount: index === -1 ? 0 : profiles[index].referralCount,
    referralEarnings: index === -1 ? 0 : profiles[index].referralEarnings,
    memberSince: index === -1 ? new Date().toISOString() : profiles[index].memberSince,
    lastActivity: new Date().toISOString()
  };

  // Update tier based on lifetime points
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (profile.lifetimePoints >= TIERS[i].minPoints) {
      profile.tier = TIERS[i].name;
      break;
    }
  }

  if (index === -1) {
    profiles.push(profile);
  } else {
    profiles[index] = profile;
  }

  saveData(req.companyId, 'profiles', profiles);

  res.json({ success: true, profile });
});

// Earn points
app.post('/api/loyalty/earn', requireAuth, (req, res) => {
  const { customerId, type, amount, orderId, description } = req.body;

  if (!customerId || !type) {
    return res.status(400).json({ error: 'customerId and type are required' });
  }

  const profiles = loadData(req.companyId, 'profiles');
  const index = profiles.findIndex(p => p.customerId === customerId);

  if (index === -1) {
    // Auto-create profile
    profiles.push({
      customerId,
      companyId: req.companyId,
      points: 0,
      lifetimePoints: 0,
      tier: 'bronze',
      referralCode: `REF${customerId.substring(0, 6).toUpperCase()}`,
      referralCount: 0,
      referralEarnings: 0,
      memberSince: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
    saveData(req.companyId, 'profiles', profiles);
  }

  // Reload after potential save
  const currentProfiles = loadData(req.companyId, 'profiles');
  const profileIndex = currentProfiles.findIndex(p => p.customerId === customerId);

  // Calculate points
  let pointsEarned = 0;
  const rule = EARN_RULES[type];

  if (!rule) {
    return res.status(400).json({ error: `Unknown earn type: ${type}` });
  }

  if (rule.pointsPerRupee && amount) {
    pointsEarned = Math.floor(amount * rule.pointsPerRupee);
  } else if (rule.points) {
    pointsEarned = rule.points;
  }

  // Update profile
  currentProfiles[profileIndex].points += pointsEarned;
  currentProfiles[profileIndex].lifetimePoints += pointsEarned;
  currentProfiles[profileIndex].lastActivity = new Date().toISOString();

  // Check tier upgrade
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (currentProfiles[profileIndex].lifetimePoints >= TIERS[i].minPoints) {
      if (currentProfiles[profileIndex].tier !== TIERS[i].name) {
        currentProfiles[profileIndex].tier = TIERS[i].name;
        currentProfiles[profileIndex].tierUpgrade = true;
        currentProfiles[profileIndex].newTier = TIERS[i].name;
      }
      break;
    }
  }

  saveData(req.companyId, 'profiles', currentProfiles);

  // Record transaction
  const transactions = loadData(req.companyId, 'transactions');
  transactions.push({
    id: uuidv4(),
    customerId,
    type: 'earn',
    earnType: type,
    points: pointsEarned,
    amount: amount || 0,
    orderId,
    description: description || rule.name,
    balance: currentProfiles[profileIndex].points,
    createdAt: new Date().toISOString()
  });
  saveData(req.companyId, 'transactions', transactions);

  res.json({
    success: true,
    pointsEarned,
    newBalance: currentProfiles[profileIndex].points,
    tierUpgrade: currentProfiles[profileIndex].tierUpgrade || false,
    newTier: currentProfiles[profileIndex].newTier || null
  });
});

// Redeem points
app.post('/api/loyalty/redeem', requireAuth, (req, res) => {
  const { customerId, points, orderId, description } = req.body;

  if (!customerId || !points) {
    return res.status(400).json({ error: 'customerId and points are required' });
  }

  const profiles = loadData(req.companyId, 'profiles');
  const index = profiles.findIndex(p => p.customerId === customerId);

  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  if (profiles[index].points < points) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  const redeemValue = points * REDEEM_RATE;

  // Deduct points
  profiles[index].points -= points;
  profiles[index].lastActivity = new Date().toISOString();
  saveData(req.companyId, 'profiles', profiles);

  // Record transaction
  const transactions = loadData(req.companyId, 'transactions');
  transactions.push({
    id: uuidv4(),
    customerId,
    type: 'redeem',
    points: -points,
    redeemValue,
    orderId,
    description: description || 'Points redemption',
    balance: profiles[index].points,
    createdAt: new Date().toISOString()
  });
  saveData(req.companyId, 'transactions', transactions);

  res.json({
    success: true,
    pointsRedeemed: points,
    redeemValue,
    newBalance: profiles[index].points
  });
});

// Get transaction history
app.get('/api/loyalty/transactions/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;
  const { limit = 50, offset = 0 } = req.query;

  const transactions = loadData(req.companyId, 'transactions');
  const customerTxns = transactions
    .filter(t => t.customerId === customerId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(Number(offset), Number(offset) + Number(limit));

  res.json({
    transactions: customerTxns,
    total: transactions.filter(t => t.customerId === customerId).length
  });
});

// Get available rewards
app.get('/api/loyalty/rewards', requireAuth, (req, res) => {
  const rewards = [
    { id: 'discount_5', name: '5% Off', pointsRequired: 500, type: 'discount', value: 5 },
    { id: 'discount_10', name: '10% Off', pointsRequired: 1000, type: 'discount', value: 10 },
    { id: 'discount_15', name: '15% Off', pointsRequired: 2000, type: 'discount', value: 15 },
    { id: 'free_shipping', name: 'Free Shipping', pointsRequired: 300, type: 'shipping' },
    { id: 'cashback_50', name: '₹50 Cashback', pointsRequired: 5000, type: 'cashback', value: 50 },
    { id: 'cashback_100', name: '₹100 Cashback', pointsRequired: 10000, type: 'cashback', value: 100 },
    { id: 'gift_card_200', name: '₹200 Gift Card', pointsRequired: 20000, type: 'giftcard', value: 200 }
  ];

  res.json({ rewards });
});

// Redeem a reward
app.post('/api/loyalty/rewards/:rewardId/redeem', requireAuth, (req, res) => {
  const { rewardId } = req.params;
  const { customerId } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId is required' });
  }

  const rewards = [
    { id: 'discount_5', name: '5% Off', pointsRequired: 500, type: 'discount', value: 5 },
    { id: 'discount_10', name: '10% Off', pointsRequired: 1000, type: 'discount', value: 10 },
    { id: 'discount_15', name: '15% Off', pointsRequired: 2000, type: 'discount', value: 15 },
    { id: 'free_shipping', name: 'Free Shipping', pointsRequired: 300, type: 'shipping' },
    { id: 'cashback_50', name: '₹50 Cashback', pointsRequired: 5000, type: 'cashback', value: 50 },
    { id: 'cashback_100', name: '₹100 Cashback', pointsRequired: 10000, type: 'cashback', value: 100 },
    { id: 'gift_card_200', name: '₹200 Gift Card', pointsRequired: 20000, type: 'giftcard', value: 200 }
  ];

  const reward = rewards.find(r => r.id === rewardId);
  if (!reward) {
    return res.status(404).json({ error: 'Reward not found' });
  }

  const profiles = loadData(req.companyId, 'profiles');
  const index = profiles.findIndex(p => p.customerId === customerId);

  if (index === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  if (profiles[index].points < reward.pointsRequired) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  // Deduct points
  profiles[index].points -= reward.pointsRequired;
  profiles[index].lastActivity = new Date().toISOString();
  saveData(req.companyId, 'profiles', profiles);

  // Generate coupon code
  const couponCode = `LOYALTY${Date.now().toString(36).toUpperCase()}`;

  // Record transaction
  const transactions = loadData(req.companyId, 'transactions');
  transactions.push({
    id: uuidv4(),
    customerId,
    type: 'redeem',
    rewardId,
    rewardName: reward.name,
    points: -reward.pointsRequired,
    couponCode,
    balance: profiles[index].points,
    createdAt: new Date().toISOString()
  });
  saveData(req.companyId, 'transactions', transactions);

  res.json({
    success: true,
    reward: { ...reward, couponCode },
    newBalance: profiles[index].points
  });
});

// Create referral
app.post('/api/loyalty/referral', requireAuth, (req, res) => {
  const { customerId, refereeEmail, refereeName } = req.body;

  if (!customerId || !refereeEmail) {
    return res.status(400).json({ error: 'customerId and refereeEmail are required' });
  }

  const profiles = loadData(req.companyId, 'profiles');
  const profileIndex = profiles.findIndex(p => p.customerId === customerId);

  if (profileIndex === -1) {
    return res.status(404).json({ error: 'Customer not found' });
  }

  const referralCode = profiles[profileIndex].referralCode;
  const referralLink = `https://hojai.ai/ref/${referralCode}`;

  // Record referral
  const referrals = loadData(req.companyId, 'referrals');
  const referral = {
    id: uuidv4(),
    referrerId: customerId,
    refereeEmail,
    refereeName,
    referralCode,
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  referrals.push(referral);
  saveData(req.companyId, 'referrals', referrals);

  res.json({
    success: true,
    referral: {
      code: referralCode,
      link: referralLink,
      pointsOnSignup: EARN_RULES.referral.points,
      pointsOnPurchase: EARN_RULES.referralPurchase.pointsPerRupee
    }
  });
});

// Get referral stats
app.get('/api/loyalty/referrals/:customerId', requireAuth, (req, res) => {
  const { customerId } = req.params;

  const referrals = loadData(req.companyId, 'referrals');
  const customerReferrals = referrals.filter(r => r.referrerId === customerId);

  const profiles = loadData(req.companyId, 'profiles');
  const profile = profiles.find(p => p.customerId === customerId);

  res.json({
    referralCode: profile?.referralCode || null,
    totalReferrals: customerReferrals.length,
    successfulReferrals: customerReferrals.filter(r => r.status === 'converted').length,
    pendingReferrals: customerReferrals.filter(r => r.status === 'pending').length,
    referralEarnings: profile?.referralEarnings || 0,
    referrals: customerReferrals
  });
});

// Reward employee (internal use)
app.post('/api/loyalty/reward-employee', requireAuth, (req, res) => {
  const { employeeId, points, reason } = req.body;

  if (!employeeId || !points) {
    return res.status(400).json({ error: 'employeeId and points are required' });
  }

  // This would integrate with Workforce OS
  const transactions = loadData(req.companyId, 'transactions');
  transactions.push({
    id: uuidv4(),
    type: 'employee_reward',
    employeeId,
    points,
    reason: reason || 'Employee recognition',
    createdAt: new Date().toISOString()
  });
  saveData(req.companyId, 'transactions', transactions);

  res.json({
    success: true,
    pointsAwarded: points,
    employeeId
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Loyalty Connector Service running on port ${PORT}`);
});

export default app;
