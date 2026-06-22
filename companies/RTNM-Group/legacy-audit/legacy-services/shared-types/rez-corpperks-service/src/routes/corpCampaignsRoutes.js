/**
 * CorpPerks Campaigns Routes
 * Gift, Karma, Reward Campaigns
 */

const express = require('express');
const router = express.Router();

// In-memory store
const campaignsStore = [
  {
    id: 'C001',
    name: 'Diwali Gifting 2026',
    type: 'gift',
    status: 'active',
    budget: 500000,
    spent: 125000,
    participants: 250,
    eligibleEmployees: ['E001', 'E002', 'E003'],
    gifts: [{ name: 'Premium Gift Box', value: 2000 }],
    startDate: '2026-10-15',
    endDate: '2026-11-15',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'C002',
    name: 'Plant 1000 Trees',
    type: 'karma',
    status: 'active',
    budget: 100000,
    spent: 45000,
    participants: 180,
    target: 1000,
    current: 420,
    impactType: 'trees',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'C003',
    name: 'Q2 Performance Rewards',
    type: 'reward',
    status: 'draft',
    budget: 200000,
    spent: 0,
    participants: 0,
    criteria: 'Performance rating >= 4',
    rewards: [{ type: 'coins', amount: 5000 }],
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    createdAt: new Date().toISOString(),
  },
];

// Auth middleware
const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  next();
};

// GET /api/campaigns
router.get('/', (req, res) => {
  const { type, status } = req.query;
  let campaigns = campaignsStore;
  if (type) campaigns = campaigns.filter(c => c.type === type);
  if (status) campaigns = campaigns.filter(c => c.status === status);
  res.json({ success: true, data: campaigns });
});

// POST /api/campaigns
router.post('/', requireAuth, (req, res) => {
  const { name, type, budget, startDate, endDate, ...rest } = req.body;

  const campaign = {
    id: `C${Date.now()}`,
    name,
    type,
    status: 'draft',
    budget,
    spent: 0,
    participants: 0,
    startDate,
    endDate,
    ...rest,
    createdAt: new Date().toISOString(),
  };

  campaignsStore.push(campaign);
  res.status(201).json({ success: true, data: campaign });
});

// GET /api/campaigns/:id
router.get('/:id', (req, res) => {
  const campaign = campaignsStore.find(c => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
  res.json({ success: true, data: campaign });
});

// PUT /api/campaigns/:id
router.put('/:id', requireAuth, (req, res) => {
  const idx = campaignsStore.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Campaign not found' });
  campaignsStore[idx] = { ...campaignsStore[idx], ...req.body };
  res.json({ success: true, data: campaignsStore[idx] });
});

// DELETE /api/campaigns/:id
router.delete('/:id', requireAuth, (req, res) => {
  const idx = campaignsStore.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Campaign not found' });
  campaignsStore.splice(idx, 1);
  res.json({ success: true, message: 'Deleted' });
});

// POST /api/campaigns/:id/launch
router.post('/:id/launch', requireAuth, (req, res) => {
  const campaign = campaignsStore.find(c => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
  campaign.status = 'active';
  res.json({ success: true, data: campaign });
});

// POST /api/campaigns/:id/pause
router.post('/:id/pause', requireAuth, (req, res) => {
  const campaign = campaignsStore.find(c => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });
  campaign.status = 'paused';
  res.json({ success: true, data: campaign });
});

// GET /api/campaigns/:id/participants
router.get('/:id/participants', (req, res) => {
  const campaign = campaignsStore.find(c => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  const participants = (campaign.eligibleEmployees || []).map(empId => ({
    employeeId: empId,
    enrolled: true,
    participated: Math.random() > 0.3,
  }));

  res.json({ success: true, data: participants });
});

// GET /api/campaigns/:id/analytics
router.get('/:id/analytics', (req, res) => {
  const campaign = campaignsStore.find(c => c.id === req.params.id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  res.json({
    success: true,
    data: {
      totalBudget: campaign.budget,
      spent: campaign.spent,
      remaining: campaign.budget - campaign.spent,
      utilizationRate: Math.round((campaign.spent / campaign.budget) * 100),
      participants: campaign.participants,
      eligibleCount: campaign.eligibleEmployees?.length || 0,
      participationRate: Math.round((campaign.participants / (campaign.eligibleEmployees?.length || 1)) * 100),
      daysRemaining: Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
    }
  });
});

module.exports = router;
