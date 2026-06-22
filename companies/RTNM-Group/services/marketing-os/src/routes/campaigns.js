import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { campaignRegistry, CAMPAIGN_TYPES, CAMPAIGN_STATUS, INDUSTRIES } from '../index.js';

const router = express.Router();

/**
 * GET /api/campaigns
 * List all campaigns
 */
router.get('/', async (req, res) => {
  try {
    const { status, industry, type, limit = 50 } = req.query;

    let campaigns = Array.from(campaignRegistry.values());

    if (status) campaigns = campaigns.filter(c => c.status === status);
    if (industry) campaigns = campaigns.filter(c => c.industry === industry);
    if (type) campaigns = campaigns.filter(c => c.type === type);

    campaigns = campaigns.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      type = CAMPAIGN_TYPES.AWARENESS,
      industry,
      budget,
      channels = [],
      startDate,
      endDate
    } = req.body;

    if (!name || !industry) {
      return res.status(400).json({
        success: false,
        error: 'Name and industry are required'
      });
    }

    const campaignId = `campaign_${uuidv4()}`;
    const campaign = {
      id: campaignId,
      name,
      type,
      industry,
      status: CAMPAIGN_STATUS.DRAFT,
      budget: budget || 0,
      channels,
      startDate,
      endDate,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend: 0
      },
      createdAt: new Date().toISOString()
    };

    campaignRegistry.set(campaignId, campaign);

    res.status(201).json({
      success: true,
      campaign
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/campaigns/:id
 * Get campaign details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = campaignRegistry.get(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/campaigns/:id
 * Update campaign
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const campaign = campaignRegistry.get(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
    }

    const updated = { ...campaign, ...updates, updatedAt: new Date().toISOString() };
    campaignRegistry.set(id, updated);

    res.json({
      success: true,
      campaign: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/campaigns/:id/launch
 * Launch a campaign
 */
router.post('/:id/launch', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = campaignRegistry.get(id);
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    campaign.status = CAMPAIGN_STATUS.ACTIVE;
    campaign.launchedAt = new Date().toISOString();
    campaignRegistry.set(id, campaign);

    res.json({
      success: true,
      message: 'Campaign launched',
      campaign
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/campaigns/industry/:industry
 * Get campaigns for specific industry
 */
router.get('/industry/:industry', async (req, res) => {
  try {
    const { industry } = req.params;

    const campaigns = Array.from(campaignRegistry.values())
      .filter(c => c.industry === industry);

    res.json({
      success: true,
      industry,
      count: campaigns.length,
      campaigns
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
