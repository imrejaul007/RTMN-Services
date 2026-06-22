import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
const router = Router();
const campaigns = new Map();

router.get('/campaigns', (req, res) => {
  const { status, advertiserId } = req.query;
  let list = Array.from(campaigns.values());
  if (status) list = list.filter(c => c.status === status);
  if (advertiserId) list = list.filter(c => c.advertiserId === advertiserId);
  res.json({ success: true, campaigns: list });
});

router.get('/campaigns/:id', (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  res.json({ success: true, campaign });
});

router.post('/campaigns', (req, res) => {
  const { advertiserId, name, budget, targeting, format } = req.body;
  if (!advertiserId || !name) return res.status(400).json({ error: 'Missing required fields' });

  const campaign = {
    campaignId: uuidv4(), advertiserId, name, budget, targeting, format,
    status: 'active', spent: 0, impressions: 0, clicks: 0, conversions: 0,
    cpm: 0, ctr: 0, roi: 0,
    createdAt: new Date().toISOString()
  };
  campaigns.set(campaign.campaignId, campaign);
  res.status(201).json({ success: true, campaign });
});

router.post('/campaigns/:id/optimize', (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  campaign.cpm = Math.round(50 + Math.random() * 100);
  campaign.ctr = Math.round((2 + Math.random() * 8) * 100) / 100;
  res.json({ success: true, campaign });
});

export default router;
