const Fastify = require('fastify');
const cors = require('@fastify/cors');
const { v4: uuidv4 } = require('uuid');

const app = Fastify({ logger: true });

// Stores
const referrals = new Map();
const programs = new Map();
const rewards = new Map();

const defaultProgram = { id: 'default', name: 'Standard Referral', rewardAmount: 50, rewardType: 'credit', status: 'active' };
programs.set('default', defaultProgram);

function initSampleData() {
  const sampleReferrals = [
    { id: 'r1', referrerId: 'u1', refereeId: 'u2', programId: 'default', status: 'completed', reward: 50 },
    { id: 'r2', referrerId: 'u3', refereeId: 'u4', programId: 'default', status: 'pending' },
  ];
  sampleReferrals.forEach(r => referrals.set(r.id, { ...r, createdAt: new Date().toISOString() }));
}

async function start() {
  try {
    await app.register(cors);

    app.get('/health', async () => ({ status: 'healthy', service: 'referral-twin', version: '1.0.0' }));

    // Referrals
    app.get('/api/referrals', async (req, res) => {
      const { status, referrerId } = req.query;
      let result = Array.from(referrals.values());
      if (status) result = result.filter(r => r.status === status);
      if (referrerId) result = result.filter(r => r.referrerId === referrerId);
      return { success: true, count: result.length, referrals: result };
    });

    app.get('/api/referrals/:id', async (req, res) => {
      const ref = referrals.get(req.params.id);
      if (!ref) return res.code(404).send({ success: false, error: 'Referral not found' });
      return { success: true, referral: ref };
    });

    app.post('/api/referrals', async (req, res) => {
      const { referrerId, refereeId, programId, metadata } = req.body;
      if (!referrerId || !refereeId) return res.code(400).send({ success: false, error: 'referrerId and refereeId required' });
      const ref = { id: uuidv4(), referrerId, refereeId, programId: programId || 'default', metadata: metadata || {}, status: 'pending', reward: null, createdAt: new Date().toISOString() };
      referrals.set(ref.id, ref);
      return res.code(201).send({ success: true, referral: ref });
    });

    app.patch('/api/referrals/:id/status', async (req, res) => {
      const ref = referrals.get(req.params.id);
      if (!ref) return res.code(404).send({ success: false, error: 'Referral not found' });
      const { status, reward } = req.body;
      if (status) ref.status = status;
      if (reward !== undefined) ref.reward = reward;
      ref.updatedAt = new Date().toISOString();
      referrals.set(ref.id, ref);
      return { success: true, referral: ref };
    });

    app.delete('/api/referrals/:id', async (req, res) => {
      if (!referrals.has(req.params.id)) return res.code(404).send({ success: false, error: 'Referral not found' });
      referrals.delete(req.params.id);
      return { success: true, message: 'Referral deleted' };
    });

    // Programs
    app.get('/api/programs', async () => ({ success: true, count: programs.size, programs: Array.from(programs.values()) }));

    app.post('/api/programs', async (req, res) => {
      const { name, rewardAmount, rewardType, conditions } = req.body;
      if (!name) return res.code(400).send({ success: false, error: 'Name required' });
      const program = { id: uuidv4(), name, rewardAmount: rewardAmount || 0, rewardType: rewardType || 'credit', conditions: conditions || {}, status: 'active', createdAt: new Date().toISOString() };
      programs.set(program.id, program);
      return res.code(201).send({ success: true, program });
    });

    // Rewards
    app.get('/api/rewards', async () => ({ success: true, count: rewards.size, rewards: Array.from(rewards.values()) }));

    app.post('/api/rewards', async (req, res) => {
      const { referralId, amount, type, recipientId } = req.body;
      if (!referralId || amount === undefined) return res.code(400).send({ success: false, error: 'referralId and amount required' });
      const reward = { id: uuidv4(), referralId, amount, type: type || 'credit', recipientId: recipientId || null, status: 'pending', createdAt: new Date().toISOString() };
      rewards.set(reward.id, reward);
      return res.code(201).send({ success: true, reward });
    });

    // Analytics
    app.get('/api/analytics', async () => {
      const allRefs = Array.from(referrals.values());
      const completed = allRefs.filter(r => r.status === 'completed');
      const totalRewards = completed.reduce((sum, r) => sum + (r.reward || 0), 0);
      return { success: true, analytics: { total: allRefs.length, completed: completed.length, pending: allRefs.length - completed.length, totalRewards } };
    });

    initSampleData();
    await app.listen({ port: 3016, host: '0.0.0.0' });
    console.log('🎁 Referral Twin running on port 3016');
  } catch (err) { app.log.error(err); process.exit(1); }
}

start();

module.exports = app;
