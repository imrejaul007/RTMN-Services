/**
 * Creator Economy Service - Express API
 *
 * Port: 4514
 * Partner ecosystem with revenue sharing and payouts.
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { creatorEconomy, CreatorEconomy } from './creator-economy.js';

const app = express();
const PORT = process.env.PORT || 4514;

app.use(express.json());

// ============================================
// IN-MEMORY STORES
// ============================================

interface PayoutRequest {
  id: string;
  partnerId: string;
  type: 'bank_transfer' | 'upi' | 'paypal' | 'stripe';
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  bankAccount?: {
    accountNumber: string;
    ifsc?: string;
    bankName: string;
    accountHolder: string;
  };
  upiId?: string;
  transactionRef?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

interface WithdrawalLimit {
  minAmount: number;
  maxAmount: number;
  dailyLimit: number;
  monthlyLimit: number;
}

interface PayoutConfig {
  platformFee: number;
  minPayout: number;
  payoutSchedule: 'weekly' | 'monthly' | 'on_demand';
  processingDays: number;
  holidays: string[];
}

const payouts = new Map<string, PayoutRequest>();
const withdrawalLimits: Record<string, WithdrawalLimit> = {
  bronze: { minAmount: 500, maxAmount: 50000, dailyLimit: 50000, monthlyLimit: 200000 },
  silver: { minAmount: 500, maxAmount: 100000, dailyLimit: 100000, monthlyLimit: 500000 },
  gold: { minAmount: 1000, maxAmount: 250000, dailyLimit: 250000, monthlyLimit: 1000000 },
  platinum: { minAmount: 1000, maxAmount: 1000000, dailyLimit: 1000000, monthlyLimit: 5000000 },
};

const payoutConfig: PayoutConfig = {
  platformFee: 2,
  minPayout: 500,
  payoutSchedule: 'weekly',
  processingDays: 2,
  holidays: ['2026-01-26', '2026-08-15', '2026-10-02', '2026-11-04', '2026-12-25'],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return payoutConfig.holidays.includes(dateStr);
}

function getNextPayoutDate(): Date {
  const now = new Date();
  const next = new Date(now);

  switch (payoutConfig.payoutSchedule) {
    case 'weekly':
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      next.setDate(now.getDate() + daysUntilMonday);
      break;
    case 'monthly':
      next.setMonth(now.getMonth() + 1);
      next.setDate(1);
      break;
    case 'on_demand':
      next.setDate(now.getDate() + payoutConfig.processingDays);
      break;
  }

  while (isHoliday(next)) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function getWithdrawalLimit(tier: string): WithdrawalLimit {
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
  const partner = creatorEconomy.registerPartner({ name, type, email, phone, companyId });
  res.json(partner);
});

app.get('/api/partners/:id', (req, res) => {
  const partner = creatorEconomy.getPartner(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  const earnings = creatorEconomy.getPartnerEarnings(req.params.id);
  const certifications = creatorEconomy.getPartnerCertifications(req.params.id);
  const benefits = creatorEconomy.getPartnerBenefits(req.params.id);
  const referrals = creatorEconomy.getReferralStats(req.params.id);
  res.json({ ...partner, earnings, certifications, benefits, referrals });
});

app.get('/api/partners', (req, res) => {
  const { type, status } = req.query;
  const partners = creatorEconomy.listPartners({ type, status } as any);
  res.json({ partners });
});

app.post('/api/partners/:id/activate', (req, res) => {
  const partner = creatorEconomy.activatePartner(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
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
  const revenueShare = creatorEconomy.recordRevenueShare({ partnerId, source, amount, companyId, transactionId });
  emitWebhook('earnings.recorded', { partnerId, source, amount, shareAmount: revenueShare.shareAmount });
  res.json(revenueShare);
});

app.get('/api/partners/:id/earnings', (req, res) => {
  const earnings = creatorEconomy.getPartnerEarnings(req.params.id);
  const pendingPayouts = Array.from(payouts.values())
    .filter(p => p.partnerId === req.params.id && p.status === 'pending');
  const withdrawable = earnings.pending - pendingPayouts.reduce((sum, p) => sum + p.amount, 0);
  res.json({
    ...earnings,
    withdrawable,
    pendingPayouts: pendingPayouts.length,
    nextPayoutDate: getNextPayoutDate().toISOString(),
  });
});

// ============================================
// PAYOUT ROUTES
// ============================================

app.post('/api/payouts', (req, res) => {
  const { partnerId, type, amount, bankAccount, upiId } = req.body;
  if (!partnerId || !type || !amount) {
    return res.status(400).json({ error: 'partnerId, type, and amount are required' });
  }

  const partner = creatorEconomy.getPartner(partnerId);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const earnings = creatorEconomy.getPartnerEarnings(partnerId);
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

  const payout: PayoutRequest = {
    id: `payout_${uuidv4().slice(0, 8)}`,
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

  payouts.set(payout.id, payout);
  emitWebhook('payout.requested', { payoutId: payout.id, partnerId, amount: netAmount, type });
  res.json(payout);
});

app.get('/api/payouts/:id', (req, res) => {
  const payout = payouts.get(req.params.id);
  if (!payout) return res.status(404).json({ error: 'Payout not found' });
  res.json(payout);
});

app.get('/api/payouts', (req, res) => {
  const { partnerId, status } = req.query;
  let list = Array.from(payouts.values());
  if (partnerId) list = list.filter(p => p.partnerId === partnerId);
  if (status) list = list.filter(p => p.status === status);
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ payouts: list });
});

app.post('/api/payouts/:id/process', async (req, res) => {
  const payout = payouts.get(req.params.id);
  if (!payout) return res.status(404).json({ error: 'Payout not found' });
  if (payout.status !== 'pending') {
    return res.status(400).json({ error: 'Payout already processed' });
  }

  payout.status = 'processing';
  payout.updatedAt = new Date().toISOString();

  try {
    await processPayment(payout);
    payout.status = 'completed';
    payout.paidAt = new Date().toISOString();
    payout.transactionRef = `TXN_${Date.now()}`;
    emitWebhook('payout.completed', { payoutId: payout.id, amount: payout.amount, transactionRef: payout.transactionRef });
  } catch (error: any) {
    payout.status = 'failed';
    payout.error = error.message;
  }

  payout.updatedAt = new Date().toISOString();
  payouts.set(payout.id, payout);
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
  emitWebhook('payout.cancelled', { payoutId: payout.id, amount: payout.amount });
  res.json(payout);
});

// ============================================
// DASHBOARD ROUTES
// ============================================

app.get('/api/dashboard/:partnerId', (req, res) => {
  const partner = creatorEconomy.getPartner(req.params.partnerId);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const earnings = creatorEconomy.getPartnerEarnings(req.params.partnerId);
  const referrals = creatorEconomy.getReferralStats(req.params.partnerId);
  const benefits = creatorEconomy.getPartnerBenefits(req.params.partnerId);
  const limits = getWithdrawalLimit(partner.tier);
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
    referrals,
    benefits,
    limits,
    tierProgress: getTierProgress(partner),
    recentPayouts: Array.from(payouts.values())
      .filter(p => p.partnerId === req.params.partnerId)
      .slice(0, 5),
  });
});

app.get('/api/admin/dashboard', (req, res) => {
  const allPartners = creatorEconomy.listPartners();
  const stats = {
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
    topEarners: allPartners.sort((a, b) => b.totalEarnings - a.totalEarnings).slice(0, 10),
  };
  res.json(stats);
});

// ============================================
// CERTIFICATION ROUTES
// ============================================

app.post('/api/certifications', (req, res) => {
  const { partnerId, type, name, score } = req.body;
  if (!partnerId || !type || !name || score === undefined) {
    return res.status(400).json({ error: 'partnerId, type, name, and score are required' });
  }
  const certification = creatorEconomy.issueCertification({ partnerId, type, name, score });
  res.json(certification);
});

app.get('/api/partners/:id/certifications', (req, res) => {
  const certifications = creatorEconomy.getPartnerCertifications(req.params.id);
  res.json({ certifications });
});

// ============================================
// REFERRAL ROUTES
// ============================================

app.post('/api/referrals', (req, res) => {
  const { referrerId, refereeId } = req.body;
  if (!referrerId || !refereeId) {
    return res.status(400).json({ error: 'referrerId and refereeId are required' });
  }
  const referral = creatorEconomy.createReferral(referrerId, refereeId);
  res.json(referral);
});

app.get('/api/partners/:id/referrals', (req, res) => {
  const stats = creatorEconomy.getReferralStats(req.params.id);
  res.json(stats);
});

// ============================================
// WEBHOOKS
// ============================================

const webhooks = new Map<string, { url: string; events: string[] }>();

app.post('/api/webhooks', (req, res) => {
  const { url, events } = req.body;
  const id = `webhook_${uuidv4().slice(0, 8)}`;
  webhooks.set(id, { url, events });
  res.json({ id, url, events });
});

app.delete('/api/webhooks/:id', (req, res) => {
  webhooks.delete(req.params.id);
  res.json({ success: true });
});

function emitWebhook(event: string, data: any) {
  console.log(`[Webhook] ${event}:`, JSON.stringify(data));
}

async function processPayment(payout: PayoutRequest): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.05) resolve();
      else reject(new Error('Payment failed'));
    }, 1000);
  });
}

function getTierProgress(partner: any): any {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const thresholds = { bronze: 0, silver: 50000, gold: 200000, platinum: 1000000 };
  const currentIndex = tiers.indexOf(partner.tier);
  if (currentIndex === tiers.length - 1) {
    return { tier: partner.tier, nextTier: null, progress: 100, amountToNext: 0 };
  }
  const nextTier = tiers[currentIndex + 1];
  const progress = Math.min(100, ((partner.totalEarnings - thresholds[partner.tier]) / (thresholds[nextTier] - thresholds[partner.tier])) * 100);
  const amountToNext = thresholds[nextTier] - partner.totalEarnings;
  return { tier: partner.tier, nextTier, progress, amountToNext };
}

// ============================================
// HEALTH
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'creator-economy',
    version: '1.0.0',
    stats: {
      partners: creatorEconomy.listPartners().length,
      activePartners: creatorEconomy.listPartners({ status: 'active' }).length,
      pendingPayouts: Array.from(payouts.values()).filter(p => p.status === 'pending').length,
      totalPayouts: payouts.size,
    },
  });
});

app.listen(PORT, () => {
  console.log(`💰 Creator Economy running on port ${PORT}`);
  console.log(`   Partners: ${creatorEconomy.listPartners().length}`);
  console.log(`   Platform Fee: ${payoutConfig.platformFee}%`);
  console.log(`   Min Payout: ₹${payoutConfig.minPayout}`);
});

export default app;
