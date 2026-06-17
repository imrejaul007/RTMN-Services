import { Router } from 'express';
import { generateId, randomDelay, generateCampaignStats } from '../utils/helpers.js';
import type { Campaign, CampaignStats } from '../types/index.js';

const router = Router();

// In-memory storage for campaigns
const campaigns: Map<string, Campaign> = new Map();

// Initialize demo campaigns
function initDemoCampaigns() {
  const demoCampaigns: Campaign[] = [
    {
      id: 'camp-001',
      name: 'Q2 Enterprise Outreach',
      type: 'multi-channel',
      status: 'running',
      channels: ['email', 'sms'],
      targetAudience: ['enterprise', 'decision_makers'],
      scheduledStart: new Date('2026-06-01'),
      scheduledEnd: new Date('2026-06-30'),
      stats: {
        total: 1500,
        sent: 1450,
        delivered: 1410,
        opened: 635,
        clicked: 159,
        replied: 95,
        converted: 19,
        failed: 50
      },
      createdAt: new Date('2026-05-28'),
      updatedAt: new Date()
    },
    {
      id: 'camp-002',
      name: 'SMB Product Launch',
      type: 'email',
      status: 'scheduled',
      channels: ['email'],
      targetAudience: ['smb', 'startups'],
      scheduledStart: new Date('2026-06-20'),
      scheduledEnd: new Date('2026-07-20'),
      createdAt: new Date('2026-06-10'),
      updatedAt: new Date()
    },
    {
      id: 'camp-003',
      name: 'WhatsApp Follow-up Series',
      type: 'whatsapp',
      status: 'paused',
      channels: ['whatsapp'],
      targetAudience: ['warm_leads', 'existing_contacts'],
      stats: {
        total: 300,
        sent: 180,
        delivered: 175,
        opened: 170,
        clicked: 45,
        replied: 38,
        converted: 8,
        failed: 5
      },
      createdAt: new Date('2026-05-15'),
      updatedAt: new Date()
    }
  ];

  demoCampaigns.forEach(c => campaigns.set(c.id, c));
}

initDemoCampaigns();

// POST /api/campaign/create - Create outreach campaign
router.post('/create', async (req, res) => {
  try {
    const {
      name,
      type,
      channels,
      targetAudience,
      scheduledStart,
      scheduledEnd,
      content,
      settings
    } = req.body;

    if (!name || !type || !channels || channels.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, channels'
      });
    }

    await randomDelay(200, 500);

    const campaignId = generateId('camp');
    const campaign: Campaign = {
      id: campaignId,
      name,
      type,
      status: scheduledStart && new Date(scheduledStart) > new Date() ? 'scheduled' : 'draft',
      channels,
      targetAudience: targetAudience || [],
      scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
      scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    campaigns.set(campaignId, campaign);

    res.json({
      success: true,
      campaign,
      message: `Campaign "${name}" created successfully`
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// GET /api/campaign/:id - Get campaign details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to get campaign' });
  }
});

// POST /api/campaign/:id/execute - Execute campaign
router.post('/:id/execute', async (req, res) => {
  try {
    const { id } = req.params;
    const { leads, dryRun = false } = req.body;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'running') {
      return res.status(400).json({ error: 'Campaign is already running' });
    }

    await randomDelay(500, 1500);

    // Simulate campaign execution
    const targetCount = leads?.length || Math.floor(Math.random() * 200) + 100;
    const stats: CampaignStats = {
      total: targetCount,
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      replied: 0,
      converted: 0,
      failed: 0
    };

    // Simulate sending
    stats.sent = Math.floor(targetCount * 0.95);
    stats.delivered = Math.floor(stats.sent * 0.92);
    stats.opened = Math.floor(stats.delivered * 0.35);
    stats.clicked = Math.floor(stats.opened * 0.20);
    stats.replied = Math.floor(stats.opened * 0.12);
    stats.converted = Math.floor(stats.replied * 0.15);
    stats.failed = targetCount - stats.sent;

    campaign.status = 'running';
    campaign.stats = stats;
    campaign.updatedAt = new Date();
    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      execution: {
        status: 'started',
        targetRecipients: targetCount,
        estimatedCompletion: new Date(Date.now() + targetCount * 1000).toISOString(),
        dryRun
      }
    });
  } catch (error) {
    console.error('Campaign execution error:', error);
    res.status(500).json({ error: 'Failed to execute campaign' });
  }
});

// GET /api/campaign/:id/results - Get campaign results
router.get('/:id/results', async (req, res) => {
  try {
    const { id } = req.params;
    const { refresh = false } = req.query;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (refresh === 'true' && campaign.status === 'running') {
      // Simulate updated stats
      await randomDelay(100, 300);
      if (campaign.stats) {
        campaign.stats.opened = Math.min(
          campaign.stats.opened + Math.floor(Math.random() * 10),
          campaign.stats.delivered
        );
      }
    }

    const results = {
      overview: {
        campaignId: id,
        name: campaign.name,
        status: campaign.status,
        channels: campaign.channels,
        dateRange: {
          start: campaign.scheduledStart,
          end: campaign.scheduledEnd
        }
      },
      stats: campaign.stats || generateCampaignStats(),
      performance: {
        deliveryRate: campaign.stats
          ? ((campaign.stats.delivered / campaign.stats.sent) * 100).toFixed(1) + '%'
          : '0%',
        openRate: campaign.stats
          ? ((campaign.stats.opened / campaign.stats.delivered) * 100).toFixed(1) + '%'
          : '0%',
        clickRate: campaign.stats
          ? ((campaign.stats.clicked / campaign.stats.opened) * 100).toFixed(1) + '%'
          : '0%',
        replyRate: campaign.stats
          ? ((campaign.stats.replied / campaign.stats.opened) * 100).toFixed(1) + '%'
          : '0%',
        conversionRate: campaign.stats
          ? ((campaign.stats.converted / campaign.stats.replied) * 100).toFixed(1) + '%'
          : '0%'
      },
      channelBreakdown: campaign.channels.map(channel => ({
        channel,
        sent: Math.floor((campaign.stats?.sent || 0) / campaign.channels.length),
        delivered: Math.floor((campaign.stats?.delivered || 0) / campaign.channels.length),
        opened: Math.floor((campaign.stats?.opened || 0) / campaign.channels.length),
        replied: Math.floor((campaign.stats?.replied || 0) / campaign.channels.length)
      })),
      timeline: [
        { date: '2026-06-01', event: 'Campaign started', recipients: campaign.stats?.sent || 0 },
        { date: '2026-06-05', event: 'First responses received', recipients: Math.floor((campaign.stats?.replied || 0) * 0.3) },
        { date: '2026-06-10', event: 'Peak engagement', recipients: Math.floor((campaign.stats?.opened || 0) * 0.5) },
        { date: new Date().toISOString().split('T')[0], event: 'Latest update', recipients: campaign.stats?.sent || 0 }
      ]
    };

    res.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error('Get campaign results error:', error);
    res.status(500).json({ error: 'Failed to get campaign results' });
  }
});

// POST /api/campaign/:id/pause - Pause campaign
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'running') {
      return res.status(400).json({ error: 'Campaign is not running' });
    }

    await randomDelay(100, 300);

    campaign.status = 'paused';
    campaign.updatedAt = new Date();
    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

// POST /api/campaign/:id/resume - Resume campaign
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'paused') {
      return res.status(400).json({ error: 'Campaign is not paused' });
    }

    await randomDelay(100, 300);

    campaign.status = 'running';
    campaign.updatedAt = new Date();
    campaigns.set(id, campaign);

    res.json({
      success: true,
      campaign,
      message: 'Campaign resumed successfully'
    });
  } catch (error) {
    console.error('Resume campaign error:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

// GET /api/campaign - List all campaigns
router.get('/', async (req, res) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;

    let filtered = Array.from(campaigns.values());

    if (status) {
      filtered = filtered.filter(c => c.status === status);
    }
    if (type) {
      filtered = filtered.filter(c => c.type === type);
    }

    // Sort by updated date
    filtered.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    const total = filtered.length;
    const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      campaigns: paginated,
      summary: {
        total,
        running: filtered.filter(c => c.status === 'running').length,
        paused: filtered.filter(c => c.status === 'paused').length,
        completed: filtered.filter(c => c.status === 'completed').length,
        scheduled: filtered.filter(c => c.status === 'scheduled').length
      },
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + paginated.length < total
      }
    });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Failed to list campaigns' });
  }
});

// DELETE /api/campaign/:id - Delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = campaigns.get(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status === 'running') {
      return res.status(400).json({ error: 'Cannot delete a running campaign' });
    }

    campaigns.delete(id);

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
