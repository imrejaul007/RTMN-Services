import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { PersistentStore } from '@rtmn/shared/lib/persistent-store';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { installPhase5 } from '@rtmn/twinos-shared';

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
const PORT = process.env.PORT || 4965;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ============================================================
// Persistent stores
// ============================================================
const referrals = new PersistentStore('referrals', { serviceName: 'referral-twin' });
const programs = new PersistentStore('programs', { serviceName: 'referral-twin' });
const links = new PersistentStore('links', { serviceName: 'referral-twin' });

// Top-level seed data
(async () => {
  await referrals.set('ref-001', {
    id: 'ref-001',
    referrerId: 'user-alice',
    referredEmail: 'bob@example.com',
    referredUserId: 'user-bob',
    status: 'converted',
    code: 'ALICE2026',
    reward: { type: 'credit', amount: 50, currency: 'USD' },
    convertedAt: '2026-05-15T10:00:00Z',
    createdAt: '2026-05-01T10:00:00Z'
  });
  await referrals.set('ref-002', {
    id: 'ref-002',
    referrerId: 'user-alice',
    referredEmail: 'carol@example.com',
    status: 'pending',
    code: 'ALICE2026',
    reward: { type: 'credit', amount: 50, currency: 'USD' },
    createdAt: '2026-06-10T10:00:00Z'
  });
  await programs.set('prog-default', {
    id: 'prog-default',
    name: 'Standard Referral Program',
    rewardType: 'credit',
    rewardAmount: 50,
    currency: 'USD',
    minPurchase: 100,
    validityDays: 90,
    maxReferralsPerUser: 50,
    active: true
  });
  await links.set('lnk-001', {
    id: 'lnk-001',
    code: 'ALICE2026',
    userId: 'user-alice',
    programId: 'prog-default',
    url: 'https://app.example.com/signup?ref=ALICE2026',
    clicks: 145,
    signups: 12,
    conversions: 8,
    createdAt: '2026-01-01'
  });
})();

// ============================================================
// Health & Info
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'referral-twin',
    version: '1.0.0',
    port: PORT,
    counts: { referrals: referrals.size, programs: programs.size, links: links.size },
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Referral Twin',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    capabilities: [
      '/api/referrals - List referrals',
      '/api/referrals/:id - Get referral',
      '/api/referrals - Create referral',
      '/api/referrals/:id - Update status',
      '/api/programs - List programs',
      '/api/programs/:id - Get program',
      '/api/links - List referral links',
      '/api/links - Create link',
      '/api/links/:code - Get link by code',
      '/api/links/:code/click - Track click',
      '/api/rewards - List rewards',
      '/api/stats - Overall stats',
      '/api/leaderboard - Top referrers',
      '/api/fraud/check - Check for fraud'
    ]
  });
});

// ============================================================
// Referrals
// ============================================================
app.get('/api/referrals', (req, res) => {
  const { referrerId, status } = req.query;
  let results = referrals.toArray();
  if (referrerId) results = results.filter(r => r.referrerId === referrerId);
  if (status) results = results.filter(r => r.status === status);
  res.json({ referrals: results, count: results.length });
});

app.get('/api/referrals/:id', (req, res) => {
  const ref = referrals.get(req.params.id);
  if (!ref) return res.status(404).json({ error: 'Referral not found' });
  res.json(ref);
});

app.post('/api/referrals', requireAuth, async (req, res) => {
  const { referrerId, referredEmail, programId, code } = req.body;
  if (!referrerId || !referredEmail) return res.status(400).json({ error: 'referrerId and referredEmail required' });

  const id = `ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const referral = {
    id,
    referrerId,
    referredEmail,
    referredUserId: null,
    status: 'pending',
    code: code || links.toArray()[0]?.code || 'DEFAULT',
    reward: { type: 'credit', amount: 50, currency: 'USD' },
    programId: programId || 'prog-default',
    createdAt: new Date().toISOString()
  };
  await referrals.set(id, referral);
  res.status(201).json(referral);
});

app.patch('/api/referrals/:id', requireAuth, async (req, res) => {
  const ref = referrals.get(req.params.id);
  if (!ref) return res.status(404).json({ error: 'Referral not found' });
  const { status, referredUserId } = req.body;
  if (status) ref.status = status;
  if (referredUserId) ref.referredUserId = referredUserId;
  if (status === 'converted') ref.convertedAt = new Date().toISOString();
  ref.updatedAt = new Date().toISOString();
  await referrals.set(req.params.id, ref);
  res.json(ref);
});

// ============================================================
// Programs
// ============================================================
app.get('/api/programs', (req, res) => {
  res.json({ programs: programs.toArray() });
});

app.get('/api/programs/:id', (req, res) => {
  const prog = programs.get(req.params.id);
  if (!prog) return res.status(404).json({ error: 'Program not found' });
  res.json(prog);
});

app.post('/api/programs', requireAuth, async (req, res) => {
  const { name, rewardType, rewardAmount, currency, minPurchase } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = `prog-${Date.now()}`;
  const prog = {
    id,
    name,
    rewardType: rewardType || 'credit',
    rewardAmount: rewardAmount || 50,
    currency: currency || 'USD',
    minPurchase: minPurchase || 0,
    validityDays: 90,
    maxReferralsPerUser: 50,
    active: true,
    createdAt: new Date().toISOString()
  };
  await programs.set(id, prog);
  res.status(201).json(prog);
});

// ============================================================
// Links
// ============================================================
app.get('/api/links', (req, res) => {
  const { userId, programId } = req.query;
  let results = links.toArray();
  if (userId) results = results.filter(l => l.userId === userId);
  if (programId) results = results.filter(l => l.programId === programId);
  res.json({ links: results });
});

app.get('/api/links/:code', (req, res) => {
  const link = links.find(l => l.code === req.params.code);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json(link);
});

app.post('/api/links', requireAuth, async (req, res) => {
  const { userId, programId, customCode } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const code = customCode || `${userId.toUpperCase().replace(/[^A-Z0-9]/g, '')}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const id = `lnk-${Date.now()}`;
  const link = {
    id,
    code,
    userId,
    programId: programId || 'prog-default',
    url: `https://app.example.com/signup?ref=${code}`,
    clicks: 0,
    signups: 0,
    conversions: 0,
    createdAt: new Date().toISOString()
  };
  await links.set(id, link);
  res.status(201).json(link);
});

app.post('/api/links/:code/click', requireAuth, async (req, res) => {
  const link = links.find(l => l.code === req.params.code);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  link.clicks = (link.clicks || 0) + 1;
  await links.set(link.id, link);
  res.json(link);
});

// ============================================================
// Rewards
// ============================================================
app.get('/api/rewards', (req, res) => {
  const { userId } = req.query;
  let results = referrals.toArray().filter(r => r.status === 'converted');
  if (userId) results = results.filter(r => r.referrerId === userId);
  const totalReward = results.reduce((sum, r) => sum + (r.reward?.amount || 0), 0);
  res.json({ rewards: results, count: results.length, totalReward, currency: 'USD' });
});

// ============================================================
// Leaderboard
// ============================================================
app.get('/api/leaderboard', (req, res) => {
  const referrerMap = new Map();
  referrals.toArray().forEach(r => {
    if (!referrerMap.has(r.referrerId)) {
      referrerMap.set(r.referrerId, { userId: r.referrerId, totalReferrals: 0, conversions: 0, pendingReward: 0 });
    }
    const stat = referrerMap.get(r.referrerId);
    stat.totalReferrals++;
    if (r.status === 'converted') {
      stat.conversions++;
      stat.pendingReward += r.reward?.amount || 0;
    }
  });
  const leaderboard = Array.from(referrerMap.values())
    .sort((a, b) => b.conversions - a.conversions)
    .slice(0, 10);
  res.json({ leaderboard });
});

// ============================================================
// Fraud Detection
// ============================================================
app.post('/api/fraud/check', requireAuth, (req, res) => {
  const { referrerId, referredEmail, ipAddress } = req.body;
  if (!referrerId || !referredEmail) return res.status(400).json({ error: 'referrerId and referredEmail required' });

  const riskFactors = [];
  // Check if referred email matches referrer patterns
  const referrerRefs = referrals.find(r => r.referrerId === referrerId);
  if (referrerRefs.length > 20) riskFactors.push({ factor: 'high_volume', severity: 'medium' });
  // Check duplicate emails
  const duplicates = referrerRefs.filter(r => r.referredEmail === referredEmail);
  if (duplicates.length > 0) riskFactors.push({ factor: 'duplicate_email', severity: 'high' });
  // Check self-referral
  if (referredEmail.includes(referrerId)) riskFactors.push({ factor: 'self_referral', severity: 'critical' });

  const riskScore = riskFactors.reduce((score, f) => {
    return score + (f.severity === 'critical' ? 0.5 : f.severity === 'high' ? 0.3 : 0.1);
  }, 0);

  res.json({
    referrerId,
    referredEmail,
    riskScore: Math.min(1, riskScore),
    riskLevel: riskScore > 0.7 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
    riskFactors,
    shouldBlock: riskScore > 0.7
  });
});

// ============================================================
// Stats
// ============================================================
app.get('/api/stats', (req, res) => {
  const allRefs = referrals.toArray();
  res.json({
    referrals: {
      total: allRefs.length,
      pending: allRefs.filter(r => r.status === 'pending').length,
      converted: allRefs.filter(r => r.status === 'converted').length,
      expired: allRefs.filter(r => r.status === 'expired').length
    },
    programs: { total: programs.size, active: programs.toArray().filter(p => p.active).length },
    links: { total: links.size, totalClicks: links.toArray().reduce((sum, l) => sum + (l.clicks || 0), 0) }
  });
});

// ============================================================
// Error handlers
// ============================================================
// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'referral',
  store: typeof referrals !== 'undefined' ? referrals : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: referrals.size }),
})

app.use((req, res) => res.status(404).json({ error: 'Not found', path: req.path }));
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});




;
const server = app.listen(PORT, () => console.log(`🔗 Referral Twin running on port ${PORT}`));installGracefulShutdown(server, phase5Cleanup);
