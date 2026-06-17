/**
 * StayOwn Loyalty Engine
 *
 * Hotel guest loyalty and rewards management system
 *
 * Features:
 * - Membership tiers
 * - Points system
 * - Rewards catalog
 * - Points expiration
 * - Birthday/Anniversary rewards
 * - Referral rewards
 * - VIP treatment
 *
 * Port: 6061
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 6061;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// ============================================
// DATA STORES
// ============================================

// Membership profiles
const members = new Map();

// Membership tiers
const tiers = new Map();

// Rewards catalog
const rewards = new Map();

// Point transactions
const transactions = new Map();

// Tier upgrades/downgrades
const tierHistory = new Map();

// Referral codes
const referralCodes = new Map();

// Points policies
const policies = new Map();

// ============================================
// AUTHENTICATION
// ============================================

const authUsers = new Map();
const authSessions = new Map();

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  const user = { id: 'user_' + Date.now(), businessId, email, passwordHash: hashPassword(password), role: 'loyalty_admin', createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, role: user.role });
  res.json({ token, user: { id: user.id, email } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId: user.businessId, role: user.role });
  res.json({ token, user: { id: user.id, email } });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

// ============================================
// TIER CONFIGURATION
// ============================================

// Initialize default tiers
tiers.set('bronze', {
  id: 'bronze',
  name: 'Bronze',
  minPoints: 0,
  maxPoints: 4999,
  benefits: [
    '5% discount on rooms',
    'Late checkout (subject to availability)',
    'Welcome drink',
    'Free WiFi'
  ],
  earnRate: 1.0, // 1 point per $1
  redeemRate: 0.01, // $0.01 per point
  anniversaryBonus: 500,
  birthdayBonus: 250
});

tiers.set('silver', {
  id: 'silver',
  name: 'Silver',
  minPoints: 5000,
  maxPoints: 19999,
  benefits: [
    '10% discount on rooms',
    'Late checkout (2 PM)',
    'Room upgrade (subject to availability)',
    'Welcome amenity',
    'Early check-in (subject to availability)',
    '10% off F&B'
  ],
  earnRate: 1.25,
  redeemRate: 0.012,
  anniversaryBonus: 1500,
  birthdayBonus: 750
});

tiers.set('gold', {
  id: 'gold',
  name: 'Gold',
  minPoints: 20000,
  maxPoints: 49999,
  benefits: [
    '15% discount on rooms',
    'Late checkout (4 PM)',
    'Guaranteed room upgrade',
    'Welcome amenity + fruit basket',
    'Early check-in (12 PM)',
    '15% off F&B',
    'Airport transfer (1 per stay)',
    'Access to Executive Lounge'
  ],
  earnRate: 1.5,
  redeemRate: 0.015,
  anniversaryBonus: 3000,
  birthdayBonus: 1500
});

tiers.set('platinum', {
  id: 'platinum',
  name: 'Platinum',
  minPoints: 50000,
  maxPoints: Infinity,
  benefits: [
    '20% discount on rooms',
    'Guaranteed late checkout (6 PM)',
    'Suite upgrade (subject to availability)',
    'Butler service',
    'Complimentary breakfast',
    'Airport transfers (2 per stay)',
    'Guaranteed Executive Lounge access',
    'Spa credit ($50 per stay)',
    'Personal concierge',
    'Priority reservations'
  ],
  earnRate: 2.0,
  redeemRate: 0.02,
  anniversaryBonus: 5000,
  birthdayBonus: 2500
});

// Get tiers
app.get('/api/tiers', (req, res) => {
  res.json({ tiers: Array.from(tiers.values()) });
});

// ============================================
// MEMBERS
// ============================================

// Public enrollment
app.post('/api/enroll', (req, res) => {
  const { businessId, name, email, phone, dateOfBirth, nationality, preferences } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: 'name, email, phone required' });
  }

  const memberId = 'member_' + Date.now();
  const memberNumber = 'L' + Date.now().toString().slice(-8);

  // Check for existing member
  const existing = Array.from(members.values()).find(m => m.email === email && m.businessId === businessId);
  if (existing) {
    return res.status(409).json({ error: 'Member already exists', memberId: existing.id, memberNumber: existing.memberNumber });
  }

  const member = {
    id: memberId,
    businessId: businessId || 'default',
    memberNumber,
    name,
    email,
    phone,
    dateOfBirth,
    nationality,
    preferences: preferences || {},
    tier: 'bronze',
    currentPoints: 0,
    lifetimePoints: 0,
    availablePoints: 0,
    expiringPoints: 0,
    stays: 0,
    nights: 0,
    totalSpend: 0,
    lastStay: null,
    enrollmentDate: new Date().toISOString(),
    status: 'active', // active, suspended, closed
    marketingConsent: true,
    birthdayAcknowledged: false,
    anniversaryAcknowledged: false
  };

  members.set(memberId, member);

  // Create tier history entry
  tierHistory.set(memberId, [{
    tier: 'bronze',
    date: new Date().toISOString(),
    reason: 'Enrollment'
  }]);

  // Generate referral code
  const referralCode = generateReferralCode(memberId);
  member.referralCode = referralCode;
  members.set(memberId, member);

  res.status(201).json({ member, message: 'Successfully enrolled!' });
});

// Get member (public - by email or member number)
app.get('/api/members/lookup', (req, res) => {
  const { email, memberNumber, phone } = req.query;

  let member;
  if (email) {
    member = Array.from(members.values()).find(m => m.email === email);
  } else if (memberNumber) {
    member = Array.from(members.values()).find(m => m.memberNumber === memberNumber);
  } else if (phone) {
    member = Array.from(members.values()).find(m => m.phone === phone);
  }

  if (!member) {
    return res.status(404).json({ error: 'Member not found' });
  }

  // Return public-safe data
  res.json({
    id: member.id,
    memberNumber: member.memberNumber,
    name: member.name,
    tier: member.tier,
    currentPoints: member.currentPoints,
    availablePoints: member.availablePoints,
    benefits: tiers.get(member.tier)?.benefits || [],
    nextTier: getNextTier(member.tier)
  });
});

// Get member (admin)
app.get('/api/members', requireAuth, (req, res) => {
  const { tier, status, search } = req.query;
  const businessId = req.session.businessId;

  let memberList = Array.from(members.values()).filter(m => m.businessId === businessId);

  if (tier) memberList = memberList.filter(m => m.tier === tier);
  if (status) memberList = memberList.filter(m => m.status === status);
  if (search) {
    const searchLower = search.toLowerCase();
    memberList = memberList.filter(m =>
      m.name.toLowerCase().includes(searchLower) ||
      m.email.toLowerCase().includes(searchLower) ||
      m.memberNumber.toLowerCase().includes(searchLower)
    );
  }

  memberList.sort((a, b) => b.lifetimePoints - a.lifetimePoints);

  res.json({ members: memberList, count: memberList.length });
});

// Get single member
app.get('/api/members/:id', requireAuth, (req, res) => {
  const member = members.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const tierInfo = tiers.get(member.tier);
  const transactionHistory = Array.from(transactions.values())
    .filter(t => t.memberId === member.id)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 50);

  const memberTierHistory = tierHistory.get(member.id) || [];

  res.json({
    ...member,
    tierBenefits: tierInfo?.benefits || [],
    nextTier: getNextTier(member.tier),
    pointsToNextTier: getPointsToNextTier(member),
    transactionHistory,
    tierHistory: memberTierHistory
  });
});

// Update member
app.patch('/api/members/:id', requireAuth, (req, res) => {
  const member = members.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const allowedUpdates = ['name', 'phone', 'dateOfBirth', 'nationality', 'preferences', 'marketingConsent', 'status'];
  allowedUpdates.forEach(field => {
    if (req.body[field] !== undefined) {
      member[field] = req.body[field];
    }
  });

  members.set(member.id, member);
  res.json(member);
});

// ============================================
// POINTS MANAGEMENT
// ============================================

// Earn points
app.post('/api/points/earn', requireAuth, (req, res) => {
  const { memberId, amount, type, description, bookingId, stayDate } = req.body;

  if (!memberId || !amount || !type) {
    return res.status(400).json({ error: 'memberId, amount, type required' });
  }

  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const tier = tiers.get(member.tier);
  const earnedPoints = Math.floor(amount * (tier?.earnRate || 1));

  // Record transaction
  const transactionId = 'txn_' + Date.now();
  const transaction = {
    id: transactionId,
    memberId,
    type: 'earn',
    category: type, // stay, dining, spa, promotion, bonus
    description: description || `${type} - ${amount}`,
    baseAmount: amount,
    points: earnedPoints,
    multiplier: tier?.earnRate || 1,
    bookingId,
    stayDate,
    date: new Date().toISOString(),
    businessId: member.businessId
  };

  transactions.set(transactionId, transaction);

  // Update member
  member.currentPoints += earnedPoints;
  member.lifetimePoints += earnedPoints;
  member.availablePoints += earnedPoints;
  member.totalSpend += amount;

  if (type === 'stay') {
    member.stays++;
    member.nights += req.body.nights || 1;
    member.lastStay = stayDate || new Date().toISOString();
  }

  // Check for tier upgrade
  checkTierUpgrade(member);

  // Check for expiring points
  checkExpiringPoints(member);

  members.set(member.id, member);

  res.json({
    transaction,
    member: {
      id: member.id,
      currentPoints: member.currentPoints,
      availablePoints: member.availablePoints,
      tier: member.tier
    },
    pointsEarned: earnedPoints
  });
});

// Redeem points
app.post('/api/points/redeem', requireAuth, (req, res) => {
  const { memberId, points, rewardId, description } = req.body;

  if (!memberId || !points) {
    return res.status(400).json({ error: 'memberId, points required' });
  }

  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  if (member.availablePoints < points) {
    return res.status(400).json({ error: 'Insufficient points', available: member.availablePoints, requested: points });
  }

  const transactionId = 'txn_' + Date.now();
  const redemptionValue = points * (tiers.get(member.tier)?.redeemRate || 0.01);

  const transaction = {
    id: transactionId,
    memberId,
    type: 'redeem',
    category: 'redemption',
    description: description || 'Points redemption',
    points: -points,
    redemptionValue,
    rewardId,
    date: new Date().toISOString(),
    businessId: member.businessId
  };

  transactions.set(transactionId, transaction);

  member.currentPoints -= points;
  member.availablePoints -= points;

  members.set(member.id, member);

  res.json({
    transaction,
    member: {
      id: member.id,
      currentPoints: member.currentPoints,
      availablePoints: member.availablePoints
    },
    redemptionValue
  });
});

// Adjust points (admin)
app.post('/api/points/adjust', requireAuth, (req, res) => {
  const { memberId, points, reason } = req.body;

  if (!memberId || !points === undefined || !reason) {
    return res.status(400).json({ error: 'memberId, points, reason required' });
  }

  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const transactionId = 'txn_' + Date.now();
  const transaction = {
    id: transactionId,
    memberId,
    type: points > 0 ? 'adjustment_credit' : 'adjustment_debit',
    category: 'adjustment',
    description: reason,
    points: points,
    date: new Date().toISOString(),
    adjustedBy: req.session.email,
    businessId: member.businessId
  };

  transactions.set(transactionId, transaction);

  member.currentPoints += points;
  member.availablePoints = Math.max(0, member.availablePoints + points);
  if (points > 0) member.lifetimePoints += points;

  checkTierUpgrade(member);
  members.set(member.id, member);

  res.json({ transaction, member });
});

// Get points transactions
app.get('/api/members/:id/transactions', requireAuth, (req, res) => {
  const { type, fromDate, toDate, limit = 50 } = req.query;

  let txns = Array.from(transactions.values()).filter(t => t.memberId === req.params.id);

  if (type) txns = txns.filter(t => t.type === type);
  if (fromDate) txns = txns.filter(t => t.date >= fromDate);
  if (toDate) txns = txns.filter(t => t.date <= toDate);

  txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  txns = txns.slice(0, parseInt(limit));

  res.json({ transactions: txns, count: txns.length });
});

// ============================================
// REWARDS CATALOG
// ============================================

// Initialize sample rewards
rewards.set('reward_1', { id: 'reward_1', name: 'Free Night Stay', category: 'stay', points: 10000, description: 'One complimentary room night (standard room)', tierRequired: 'silver', quantity: 100, redeemed: 0, active: true });
rewards.set('reward_2', { id: 'reward_2', name: 'Room Upgrade', category: 'stay', points: 5000, description: 'Complimentary room upgrade to next category', tierRequired: 'bronze', quantity: -1, redeemed: 0, active: true });
rewards.set('reward_3', { id: 'reward_3', name: 'Late Checkout', category: 'stay', points: 2000, description: 'Extended checkout until 4 PM', tierRequired: 'bronze', quantity: -1, redeemed: 0, active: true });
rewards.set('reward_4', { id: 'reward_4', name: 'Early Check-in', category: 'stay', points: 2000, description: 'Early check-in from 10 AM', tierRequired: 'bronze', quantity: -1, redeemed: 0, active: true });
rewards.set('reward_5', { id: 'reward_5', name: 'Dinner for Two', category: 'dining', points: 8000, description: 'Complimentary dinner at our restaurant', tierRequired: 'silver', quantity: 50, redeemed: 0, active: true });
rewards.set('reward_6', { id: 'reward_6', name: 'Spa Treatment', category: 'spa', points: 12000, description: '60-minute signature massage', tierRequired: 'gold', quantity: 30, redeemed: 0, active: true });
rewards.set('reward_7', { id: 'reward_7', name: 'Airport Transfer', category: 'experience', points: 6000, description: 'One-way airport transfer', tierRequired: 'silver', quantity: -1, redeemed: 0, active: true });
rewards.set('reward_8', { id: 'reward_8', name: 'Afternoon Tea', category: 'dining', points: 3000, description: 'Afternoon tea for two', tierRequired: 'bronze', quantity: -1, redeemed: 0, active: true });

// Get rewards catalog
app.get('/api/rewards', (req, res) => {
  const { category, tier } = req.query;
  let rewardList = Array.from(rewards.values()).filter(r => r.active);

  if (category) rewardList = rewardList.filter(r => r.category === category);

  const rewardListWithTier = rewardList.map(r => ({
    ...r,
    tierRequiredName: tiers.get(r.tierRequired)?.name || r.tierRequired,
    available: r.quantity === -1 || r.quantity - r.redeemed > 0
  }));

  if (tier) {
    const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
    const userTierIndex = tierOrder.indexOf(tier);
    rewardListWithTier.forEach(r => {
      r.unlocked = tierOrder.indexOf(r.tierRequired) <= userTierIndex;
    });
  }

  res.json({ rewards: rewardListWithTier });
});

// Get single reward
app.get('/api/rewards/:id', (req, res) => {
  const reward = rewards.get(req.params.id);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });
  res.json(reward);
});

// Create reward
app.post('/api/rewards', requireAuth, (req, res) => {
  const { name, category, points, description, tierRequired, quantity } = req.body;

  if (!name || !points) {
    return res.status(400).json({ error: 'name, points required' });
  }

  const rewardId = 'reward_' + Date.now();
  const reward = {
    id: rewardId,
    name,
    category: category || 'general',
    points,
    description,
    tierRequired: tierRequired || 'bronze',
    quantity: quantity || -1, // -1 = unlimited
    redeemed: 0,
    active: true,
    createdAt: new Date().toISOString()
  };

  rewards.set(rewardId, reward);
  res.status(201).json(reward);
});

// Redeem reward
app.post('/api/rewards/:id/redeem', requireAuth, (req, res) => {
  const { memberId } = req.body;

  const reward = rewards.get(req.params.id);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  // Check tier
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  if (tierOrder.indexOf(member.tier) < tierOrder.indexOf(reward.tierRequired)) {
    return res.status(403).json({ error: `${tiers.get(reward.tierRequired)?.name} tier required` });
  }

  // Check points
  if (member.availablePoints < reward.points) {
    return res.status(400).json({ error: 'Insufficient points' });
  }

  // Check quantity
  if (reward.quantity !== -1 && reward.quantity - reward.redeemed <= 0) {
    return res.status(400).json({ error: 'Reward out of stock' });
  }

  // Redeem points
  const transactionId = 'txn_' + Date.now();
  transactions.set(transactionId, {
    id: transactionId,
    memberId,
    type: 'redeem',
    category: 'reward',
    description: `Redeemed: ${reward.name}`,
    points: -reward.points,
    rewardId: reward.id,
    rewardName: reward.name,
    date: new Date().toISOString(),
    businessId: member.businessId
  });

  member.currentPoints -= reward.points;
  member.availablePoints -= reward.points;
  members.set(member.id, member);

  // Update reward count
  reward.redeemed++;
  rewards.set(reward.id, reward);

  res.json({
    success: true,
    reward: { id: reward.id, name: reward.name },
    pointsRedeemed: reward.points,
    redemptionCode: 'RC' + Date.now().toString().slice(-8),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
  });
});

// ============================================
// BIRTHDAY & ANNIVERSARY
// ============================================

// Get birthday rewards
app.get('/api/rewards/birthday', (req, res) => {
  const birthdayRewards = [
    { id: 'bday_1', name: 'Birthday Free Night', points: 0, description: 'Complimentary room night on your birthday', tierRequired: 'bronze' },
    { id: 'bday_2', name: 'Birthday Dinner', points: 0, description: 'Complimentary dinner at our restaurant', tierRequired: 'silver' },
    { id: 'bday_3', name: 'Birthday Spa', points: 0, description: '60-minute spa treatment', tierRequired: 'gold' }
  ];
  res.json({ birthdayRewards });
});

// Claim birthday reward
app.post('/api/birthday/claim', requireAuth, (req, res) => {
  const { memberId, rewardId } = req.body;

  const member = members.get(memberId);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  if (member.birthdayAcknowledged) {
    return res.status(400).json({ error: 'Birthday reward already claimed this year' });
  }

  const reward = rewards.get(rewardId);
  if (!reward) return res.status(404).json({ error: 'Reward not found' });

  // Award bonus points
  const tier = tiers.get(member.tier);
  const bonusPoints = tier?.birthdayBonus || 250;

  const transactionId = 'txn_' + Date.now();
  transactions.set(transactionId, {
    id: transactionId,
    memberId,
    type: 'bonus',
    category: 'birthday',
    description: 'Birthday bonus',
    points: bonusPoints,
    date: new Date().toISOString(),
    businessId: member.businessId
  });

  member.currentPoints += bonusPoints;
  member.availablePoints += bonusPoints;
  member.lifetimePoints += bonusPoints;
  member.birthdayAcknowledged = true;
  members.set(member.id, member);

  res.json({ success: true, bonusPoints, message: 'Happy Birthday!' });
});

// ============================================
// REFERRALS
// ============================================

// Get referral bonus
app.get('/api/referrals/bonus', (req, res) => {
  res.json({
    referrerBonus: 2000,
    refereeBonus: 500,
    description: 'Refer a friend and both get rewarded!'
  });
});

// Apply referral code
app.post('/api/referrals/apply', (req, res) => {
  const { referralCode, newMemberData } = req.body;

  const referrer = Array.from(members.values()).find(m => m.referralCode === referralCode);
  if (!referrer) {
    return res.status(404).json({ error: 'Invalid referral code' });
  }

  // Create new member
  const memberId = 'member_' + Date.now();
  const memberNumber = 'L' + Date.now().toString().slice(-8);

  const newMember = {
    id: memberId,
    businessId: referrer.businessId,
    memberNumber,
    name: newMemberData.name,
    email: newMemberData.email,
    phone: newMemberData.phone,
    tier: 'bronze',
    currentPoints: 0,
    lifetimePoints: 0,
    availablePoints: 0,
    stays: 0,
    nights: 0,
    enrollmentDate: new Date().toISOString(),
    status: 'active',
    referredBy: referrer.id
  };

  members.set(memberId, newMember);

  // Award referee bonus
  const transactionId = 'txn_' + Date.now();
  transactions.set(transactionId, {
    id: transactionId,
    memberId,
    type: 'bonus',
    category: 'referral',
    description: 'Referral sign-up bonus',
    points: 500,
    date: new Date().toISOString(),
    businessId: newMember.businessId
  });

  newMember.currentPoints += 500;
  newMember.availablePoints += 500;
  newMember.lifetimePoints += 500;
  members.set(memberId, newMember);

  // Award referrer bonus (will be applied when referee completes first stay)
  referrer.pendingReferralBonus = referrer.pendingReferralBonus || 0;
  referrer.pendingReferralBonus += 2000;
  members.set(referrer.id, referrer);

  res.status(201).json({ member: newMember, message: 'Enrolled successfully with referral bonus!' });
});

// ============================================
// TIER MANAGEMENT
// ============================================

// Manual tier adjustment
app.post('/api/members/:id/tier', requireAuth, (req, res) => {
  const { tier, reason } = req.body;

  const member = members.get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found' });

  const oldTier = member.tier;
  member.tier = tier;
  members.set(member.id, member);

  // Record tier change
  const history = tierHistory.get(member.id) || [];
  history.push({ tier, previousTier: oldTier, date: new Date().toISOString(), reason, changedBy: req.session.email });
  tierHistory.set(member.id, history);

  res.json({ member, previousTier: oldTier, newTier: tier });
});

// ============================================
// ANALYTICS
// ============================================

app.get('/api/analytics', requireAuth, (req, res) => {
  const businessId = req.session.businessId;
  const memberList = Array.from(members.values()).filter(m => m.businessId === businessId);

  const byTier = {};
  memberList.forEach(m => {
    byTier[m.tier] = (byTier[m.tier] || 0) + 1;
  });

  const totalPoints = memberList.reduce((sum, m) => sum + m.currentPoints, 0);
  const totalIssued = memberList.reduce((sum, m) => sum + m.lifetimePoints, 0);
  const totalRedeemed = Array.from(transactions.values())
    .filter(t => t.businessId === businessId && t.type === 'redeem')
    .reduce((sum, t) => sum + Math.abs(t.points), 0);

  const thisMonth = Array.from(transactions.values())
    .filter(t => t.businessId === businessId && t.date.startsWith(new Date().toISOString().slice(0, 7)));

  res.json({
    members: {
      total: memberList.length,
      active: memberList.filter(m => m.status === 'active').length,
      byTier
    },
    points: {
      totalIssued,
      totalRedeemed,
      outstanding: totalIssued - totalRedeemed,
      totalValue: (totalIssued - totalRedeemed) * 0.015
    },
    thisMonth: {
      enrollments: thisMonth.filter(t => t.type === 'earn' && t.category === 'signup').length,
      redemptions: thisMonth.filter(t => t.type === 'redeem').length,
      pointsEarned: thisMonth.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.points, 0),
      pointsRedeemed: Math.abs(thisMonth.filter(t => t.type === 'redeem').reduce((sum, t) => sum + t.points, 0))
    },
    topMembers: memberList.sort((a, b) => b.lifetimePoints - a.lifetimePoints).slice(0, 10).map(m => ({
      memberNumber: m.memberNumber,
      name: m.name,
      tier: m.tier,
      lifetimePoints: m.lifetimePoints,
      stays: m.stays
    }))
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'StayOwn Loyalty Engine',
    port: PORT,
    members: members.size,
    rewards: rewards.size,
    transactions: transactions.size,
    tiers: tiers.size,
    timestamp: new Date().toISOString()
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateReferralCode(memberId) {
  const code = 'REF' + memberId.slice(-6).toUpperCase();
  referralCodes.set(code, memberId);
  return code;
}

function getNextTier(currentTier) {
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(currentTier);
  if (currentIndex < tierOrder.length - 1) {
    const nextTierId = tierOrder[currentIndex + 1];
    return { id: nextTierId, name: tiers.get(nextTierId)?.name, minPoints: tiers.get(nextTierId)?.minPoints };
  }
  return null;
}

function getPointsToNextTier(member) {
  const nextTier = getNextTier(member.tier);
  if (!nextTier) return null;
  return Math.max(0, nextTier.minPoints - member.lifetimePoints);
}

function checkTierUpgrade(member) {
  const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
  for (let i = tierOrder.length - 1; i >= 0; i--) {
    const tierId = tierOrder[i];
    const tier = tiers.get(tierId);
    if (tier && member.lifetimePoints >= tier.minPoints && member.tier !== tierId) {
      const oldTier = member.tier;
      member.tier = tierId;
      // Record upgrade
      const history = tierHistory.get(member.id) || [];
      history.push({ tier: tierId, previousTier: oldTier, date: new Date().toISOString(), reason: 'Points threshold reached' });
      tierHistory.set(member.id, history);
      return { upgraded: true, from: oldTier, to: tierId };
    }
  }
  return { upgraded: false };
}

function checkExpiringPoints(member) {
  // Points expire after 24 months of inactivity
  // This is a simplified version
  const lastTransaction = Array.from(transactions.values())
    .filter(t => t.memberId === member.id && t.type === 'earn')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

  if (!lastTransaction) return;

  const monthsSinceLastEarn = (Date.now() - new Date(lastTransaction.date).getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSinceLastEarn >= 24) {
    member.expiringPoints = member.availablePoints;
  }
}

// ============================================
// START
// ============================================

app.listen(PORT, () => {
  console.log('🏆 StayOwn Loyalty Engine running on port ' + PORT);
  console.log('💎 ' + tiers.size + ' tiers | ' + rewards.size + ' rewards');
});
