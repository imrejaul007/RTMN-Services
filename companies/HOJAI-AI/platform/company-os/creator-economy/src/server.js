/**
 * Creator Economy Service - JavaScript Version
 * Port: 4514
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4514;

app.use(express.json());

// ============================================
// IN-MEMORY STORES
// ============================================

const partners = new Map();
const revenueShares = new Map();
const certifications = new Map();
const referrals = new Map();
const payouts = new Map();

const REVENUE_SHARE_CONFIG = {
  company_creation: { share: 20, description: '20% of first year subscription' },
  subscription: { share: 10, description: '10% recurring monthly' },
  transaction: { share: 2, description: '2% per transaction' },
  referral: { share: 500, description: '₹500 per referral' },
};

const PARTNER_TIERS = {
  bronze: { minEarnings: 0, benefits: ['Basic support', '10% revenue share'] },
  silver: { minEarnings: 50000, benefits: ['Priority support', '15% revenue share', 'Training access'] },
  gold: { minEarnings: 200000, benefits: ['Dedicated support', '20% revenue share', 'Early access', 'Co-marketing'] },
  platinum: { minEarnings: 1000000, benefits: ['Executive support', '25% revenue share', 'Early access', 'Joint ventures'] },
};

const withdrawalLimits = {
  bronze: { minAmount: 500, maxAmount: 50000, dailyLimit: 50000, monthlyLimit: 200000 },
  silver: { minAmount: 500, maxAmount: 100000, dailyLimit: 100000, monthlyLimit: 500000 },
  gold: { minAmount: 1000, maxAmount: 250000, dailyLimit: 250000, monthlyLimit: 1000000 },
  platinum: { minAmount: 1000, maxAmount: 1000000, dailyLimit: 1000000, monthlyLimit: 5000000 },
};

const payoutConfig = {
  platformFee: 2,
  minPayout: 500,
  payoutSchedule: 'weekly',
  processingDays: 2,
  holidays: ['2026-01-26', '2026-08-15', '2026-10-02', '2026-11-04', '2026-12-25'],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getTier(earnings) {
  if (earnings >= 1000000) return 'platinum';
  if (earnings >= 200000) return 'gold';
  if (earnings >= 50000) return 'silver';
  return 'bronze';
}

function getTierBenefits(tier) {
  return PARTNER_TIERS[tier]?.benefits || [];
}

function getWithdrawalLimit(tier) {
  return withdrawalLimits[tier] || withdrawalLimits.bronze;
}

// ============================================
// PARTNER ROUTES
// ============================================

app.post('/api/partners', (req, res) => {
  const { name, type, email, phone, companyId } = req.body;
  if (!name || !type || !email) {
    return res.status(400).json({ error: 'name, type, and email are required' });
  }

  const id = `partner_${uuidv4().slice(0, 8)}`;
  const partner = {
    id,
    name,
    type,
    email,
    phone,
    companyId,
    status: 'pending',
    tier: 'bronze',
    revenueShare: 10,
    totalEarnings: 0,
    createdAt: new Date().toISOString(),
  };

  partners.set(id, partner);
  res.json(partner);
});

app.get('/api/partners/:id', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const earnings = getPartnerEarnings(req.params.id);
  const partnerCerts = Array.from(certifications.values()).filter(c => c.partnerId === req.params.id);
  const partnerReferrals = Array.from(referrals.values()).filter(r => r.referrerId === req.params.id);

  res.json({
    ...partner,
    earnings,
    certifications: partnerCerts,
    benefits: getTierBenefits(partner.tier),
    referrals: {
      total: partnerReferrals.length,
      completed: partnerReferrals.filter(r => r.status === 'completed').length,
      pending: partnerReferrals.filter(r => r.status === 'pending').length,
    },
  });
});

app.get('/api/partners', (req, res) => {
  const { type, status } = req.query;
  let list = Array.from(partners.values());
  if (type) list = list.filter(p => p.type === type);
  if (status) list = list.filter(p => p.status === status);
  res.json({ partners: list });
});

app.post('/api/partners/:id/activate', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  partner.status = 'active';
  partners.set(partner.id, partner);
  res.json(partner);
});

// ============================================
// EARNINGS ROUTES
// ============================================

app.post('/api/earnings', (req, res) => {
  const { partnerId, source, amount, companyId, transactionId } = req.body;
  if (!partnerId || !source || !amount) {
    return res.status(400).json({ error: 'partnerId, source, and amount are required' });
  }

  const config = REVENUE_SHARE_CONFIG[source];
  const sharePercentage = config?.share || 0;
  const shareAmount = (amount * sharePercentage) / 100;

  const id = `share_${uuidv4().slice(0, 8)}`;
  const revenueShare = {
    id,
    partnerId,
    source,
    amount,
    companyId,
    transactionId,
    sharePercentage,
    shareAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  revenueShares.set(id, revenueShare);

  // Update partner earnings
  const partner = partners.get(partnerId);
  if (partner) {
    partner.totalEarnings += shareAmount;
    partner.tier = getTier(partner.totalEarnings);
    partners.set(partner.id, partner);
  }

  res.json(revenueShare);
});

app.get('/api/partners/:id/earnings', (req, res) => {
  const earnings = getPartnerEarnings(req.params.id);
  const pendingPayouts = Array.from(payouts.values())
    .filter(p => p.partnerId === req.params.id && p.status === 'pending');
  const withdrawable = earnings.pending - pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

  res.json({
    ...earnings,
    withdrawable,
    pendingPayouts: pendingPayouts.length,
  });
});

function getPartnerEarnings(partnerId) {
  const shares = Array.from(revenueShares.values()).filter(r => r.partnerId === partnerId);
  const pending = shares.filter(r => r.status === 'pending').reduce((sum, r) => sum + r.shareAmount, 0);
  const paid = shares.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.shareAmount, 0);
  return { pending, paid, history: shares };
}

// ============================================
// PAYOUT ROUTES
// ============================================

app.post('/api/payouts', (req, res) => {
  const { partnerId, type, amount, bankAccount, upiId } = req.body;
  if (!partnerId || !type || !amount) {
    return res.status(400).json({ error: 'partnerId, type, and amount are required' });
  }

  const partner = partners.get(partnerId);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const earnings = getPartnerEarnings(partnerId);
  const limits = getWithdrawalLimit(partner.tier);

  if (amount < limits.minAmount) {
    return res.status(400).json({ error: `Minimum payout is ₹${limits.minAmount}` });
  }
  if (amount > limits.maxAmount) {
    return res.status(400).json({ error: `Maximum payout is ₹${limits.maxAmount}` });
  }
  if (amount > earnings.pending) {
    return res.status(400).json({ error: 'Insufficient earnings' });
  }

  const platformFee = (amount * payoutConfig.platformFee) / 100;
  const netAmount = amount - platformFee;

  const id = `payout_${uuidv4().slice(0, 8)}`;
  const payout = {
    id,
    partnerId,
    type,
    amount: netAmount,
    currency: 'INR',
    status: 'pending',
    bankAccount,
    upiId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  payouts.set(id, payout);
  res.json(payout);
});

app.get('/api/payouts', (req, res) => {
  const { partnerId, status } = req.query;
  let list = Array.from(payouts.values());
  if (partnerId) list = list.filter(p => p.partnerId === partnerId);
  if (status) list = list.filter(p => p.status === status);
  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ payouts: list });
});

app.get('/api/payouts/:id', (req, res) => {
  const payout = payouts.get(req.params.id);
  if (!payout) return res.status(404).json({ error: 'Payout not found' });
  res.json(payout);
});

app.post('/api/payouts/:id/process', (req, res) => {
  const payout = payouts.get(req.params.id);
  if (!payout) return res.status(404).json({ error: 'Payout not found' });
  if (payout.status !== 'pending') {
    return res.status(400).json({ error: 'Payout already processed' });
  }

  payout.status = 'processing';
  payout.updatedAt = new Date().toISOString();
  payouts.set(payout.id, payout);

  // Simulate processing
  setTimeout(() => {
    payout.status = Math.random() > 0.05 ? 'completed' : 'failed';
    if (payout.status === 'completed') {
      payout.transactionRef = `TXN_${Date.now()}`;
      payout.paidAt = new Date().toISOString();
    }
    payout.updatedAt = new Date().toISOString();
    payouts.set(payout.id, payout);
  }, 1000);

  res.json(payout);
});

app.post('/api/payouts/:id/cancel', (req, res) => {
  const payout = payouts.get(req.params.id);
  if (!payout) return res.status(404).json({ error: 'Payout not found' });
  if (payout.status !== 'pending') {
    return res.status(400).json({ error: 'Can only cancel pending payouts' });
  }
  payout.status = 'cancelled';
  payout.updatedAt = new Date().toISOString();
  payouts.set(payout.id, payout);
  res.json(payout);
});

// ============================================
// DASHBOARD ROUTES
// ============================================

app.get('/api/dashboard/:partnerId', (req, res) => {
  const partner = partners.get(req.params.partnerId);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const earnings = getPartnerEarnings(req.params.partnerId);
  const partnerReferrals = Array.from(referrals.values()).filter(r => r.referrerId === req.params.partnerId);
  const pendingPayouts = Array.from(payouts.values())
    .filter(p => p.partnerId === req.params.partnerId && p.status === 'pending');

  res.json({
    partner,
    earnings: {
      total: partner.totalEarnings,
      pending: earnings.pending,
      paid: earnings.paid,
      withdrawable: earnings.pending - pendingPayouts.reduce((sum, p) => sum + p.amount, 0),
    },
    referrals: {
      total: partnerReferrals.length,
      completed: partnerReferrals.filter(r => r.status === 'completed').length,
      pending: partnerReferrals.filter(r => r.status === 'pending').length,
    },
    benefits: getTierBenefits(partner.tier),
    limits: getWithdrawalLimit(partner.tier),
  });
});

app.get('/api/admin/dashboard', (req, res) => {
  const allPartners = Array.from(partners.values());
  res.json({
    totalPartners: allPartners.length,
    activePartners: allPartners.filter(p => p.status === 'active').length,
    byTier: {
      bronze: allPartners.filter(p => p.tier === 'bronze').length,
      silver: allPartners.filter(p => p.tier === 'silver').length,
      gold: allPartners.filter(p => p.tier === 'gold').length,
      platinum: allPartners.filter(p => p.tier === 'platinum').length,
    },
    totalPayouts: Array.from(payouts.values()).reduce((sum, p) => sum + p.amount, 0),
    pendingPayouts: Array.from(payouts.values()).filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0),
    topEarners: allPartners.sort((a, b) => b.totalEarnings - a.totalEarnings).slice(0, 10).map(p => ({
      id: p.id, name: p.name, tier: p.tier, earnings: p.totalEarnings,
    })),
  });
});

// ============================================
// CERTIFICATION ROUTES
// ============================================

app.post('/api/certifications', (req, res) => {
  const { partnerId, type, name, score } = req.body;
  if (!partnerId || !type || !name || score === undefined) {
    return res.status(400).json({ error: 'partnerId, type, name, and score are required' });
  }

  const id = `cert_${uuidv4().slice(0, 8)}`;
  const certification = {
    id,
    partnerId,
    type,
    name,
    issuedAt: new Date().toISOString(),
    status: 'active',
    score,
  };
  certifications.set(id, certification);
  res.json(certification);
});

app.get('/api/partners/:id/certifications', (req, res) => {
  const certs = Array.from(certifications.values()).filter(c => c.partnerId === req.params.id);
  res.json({ certifications: certs });
});

// ============================================
// REFERRAL ROUTES
// ============================================

app.post('/api/referrals', (req, res) => {
  const { referrerId, refereeId } = req.body;
  if (!referrerId || !refereeId) {
    return res.status(400).json({ error: 'referrerId and refereeId are required' });
  }

  const id = `ref_${uuidv4().slice(0, 8)}`;
  const referral = {
    id,
    referrerId,
    refereeId,
    reward: REVENUE_SHARE_CONFIG.referral.share,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  referrals.set(id, referral);
  res.json(referral);
});

app.get('/api/partners/:id/referrals', (req, res) => {
  const partnerReferrals = Array.from(referrals.values()).filter(r => r.referrerId === req.params.id);
  res.json({
    total: partnerReferrals.length,
    completed: partnerReferrals.filter(r => r.status === 'completed').length,
    pending: partnerReferrals.filter(r => r.status === 'pending').length,
  });
});

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'creator-economy',
    version: '1.0.0',
    stats: {
      partners: partners.size,
      activePartners: Array.from(partners.values()).filter(p => p.status === 'active').length,
      pendingPayouts: Array.from(payouts.values()).filter(p => p.status === 'pending').length,
      totalPayouts: payouts.size,
    },
  });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`💰 Creator Economy running on port ${PORT}`);
  console.log(`   Partners: ${partners.size}`);
  console.log(`   Platform Fee: ${payoutConfig.platformFee}%`);
  console.log(`   Min Payout: ₹${payoutConfig.minPayout}`);
});

export default app;
