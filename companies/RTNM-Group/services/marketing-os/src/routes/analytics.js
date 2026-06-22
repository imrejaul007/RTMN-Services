import express from 'express';
import { campaignRegistry, channelRegistry, contentLibrary } from '../index.js';

const router = express.Router();

/**
 * GET /api/analytics
 * Get marketing analytics overview
 */
router.get('/', async (req, res) => {
  try {
    const campaigns = Array.from(campaignRegistry.values());
    const channels = Array.from(channelRegistry.values());
    const content = Array.from(contentLibrary.values());

    const analytics = {
      overview: {
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalChannels: channels.length,
        totalContent: content.length
      },
      byIndustry: aggregateByIndustry(campaigns),
      topCampaigns: getTopCampaigns(campaigns),
      channelPerformance: aggregateChannelMetrics(channels)
    };

    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function aggregateByIndustry(campaigns) {
  const byIndustry = {};

  for (const campaign of campaigns) {
    const industry = campaign.industry;
    if (!byIndustry[industry]) {
      byIndustry[industry] = { count: 0, budget: 0, spend: 0 };
    }
    byIndustry[industry].count++;
    byIndustry[industry].budget += campaign.budget || 0;
    byIndustry[industry].spend += campaign.metrics?.spend || 0;
  }

  return byIndustry;
}

function getTopCampaigns(campaigns) {
  return campaigns
    .filter(c => c.metrics?.conversions > 0)
    .sort((a, b) => (b.metrics?.conversions || 0) - (a.metrics?.conversions || 0))
    .slice(0, 10)
    .map(c => ({
      id: c.id,
      name: c.name,
      industry: c.industry,
      conversions: c.metrics?.conversions || 0,
      roi: calculateROI(c)
    }));
}

function calculateROI(campaign) {
  const spend = campaign.metrics?.spend || 0;
  const revenue = (campaign.metrics?.conversions || 0) * 100; // Assume $100 per conversion
  return spend > 0 ? ((revenue - spend) / spend * 100).toFixed(2) : 0;
}

function aggregateChannelMetrics(channels) {
  const metrics = { impressions: 0, clicks: 0, conversions: 0 };

  for (const channel of channels) {
    metrics.impressions += channel.metrics?.impressions || 0;
    metrics.clicks += channel.metrics?.clicks || 0;
    metrics.conversions += channel.metrics?.conversions || 0;
  }

  metrics.ctr = metrics.impressions > 0
    ? (metrics.clicks / metrics.impressions * 100).toFixed(2)
    : 0;

  return metrics;
}

/**
 * GET /api/analytics/campaigns
 * Campaign performance analytics
 */
router.get('/campaigns', async (req, res) => {
  try {
    const { industry, period } = req.query;

    let campaigns = Array.from(campaignRegistry.values());
    if (industry) campaigns = campaigns.filter(c => c.industry === industry);

    res.json({
      success: true,
      count: campaigns.length,
      campaigns: campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        metrics: c.metrics,
        roi: calculateROI(c)
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/analytics/channels
 * Channel performance analytics
 */
router.get('/channels', async (req, res) => {
  try {
    const channels = Array.from(channelRegistry.values());

    res.json({
      success: true,
      count: channels.length,
      channels: channels.map(c => ({
        id: c.id,
        name: c.name,
        type: c.type,
        metrics: c.metrics
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
