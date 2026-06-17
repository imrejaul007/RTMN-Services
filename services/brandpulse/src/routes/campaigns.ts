import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Campaign } from '../models/Campaign';
import { Mention } from '../models/Mention';

const router = Router();

// Get all campaigns for a brand
router.get('/brand/:brandId', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const query: any = { brandId: req.params.brandId };

    if (status) query.status = status;

    const campaigns = await Campaign.find(query).sort({ scheduledStart: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get campaign by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.id });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Create campaign
router.post('/', async (req: Request, res: Response) => {
  try {
    const campaignId = `CAMP-${uuidv4().slice(0, 8).toUpperCase()}`;

    const campaign = new Campaign({
      campaignId,
      ...req.body
    });

    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: req.params.id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Update campaign status
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const update: any = { status };

    if (status === 'active' && !update.actualStart) {
      update.actualStart = new Date();
    } else if (['completed', 'cancelled'].includes(status) && !update.actualEnd) {
      update.actualEnd = new Date();
    }

    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: req.params.id },
      update,
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update campaign status' });
  }
});

// Get campaign performance
router.get('/:id/performance', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.id });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Calculate performance metrics from mentions
    const startDate = campaign.actualStart || campaign.scheduledStart;
    const endDate = campaign.actualEnd || campaign.scheduledEnd || new Date();

    const mentions = await Mention.find({
      brandId: campaign.brandId,
      publishedAt: { $gte: startDate, $lte: endDate },
      $or: [
        { content: { $regex: campaign.hashtags.join('|'), $options: 'i' } },
        { content: { $regex: campaign.keywords.join('|'), $options: 'i' } }
      ]
    });

    const performance = {
      mentions: mentions.length,
      reach: mentions.reduce((acc, m) => acc + (m.engagement.reach || 0), 0),
      impressions: mentions.reduce((acc, m) => acc + (m.engagement.shares || 0) * 10, 0),
      engagement: mentions.reduce((acc, m) => {
        return acc + (m.engagement.likes || 0) + (m.engagement.comments || 0) * 2;
      }, 0),
      sentiment: {
        positive: mentions.filter(m => m.sentiment.label === 'positive').length,
        neutral: mentions.filter(m => m.sentiment.label === 'neutral').length,
        negative: mentions.filter(m => m.sentiment.label === 'negative').length
      }
    };

    res.json({
      campaign: {
        name: campaign.name,
        status: campaign.status,
        scheduledStart: campaign.scheduledStart,
        scheduledEnd: campaign.scheduledEnd
      },
      targets: campaign.targets,
      current: performance,
      progress: {
        mentions: campaign.targets.mentions
          ? Math.round((performance.mentions / campaign.targets.mentions) * 100)
          : null,
        reach: campaign.targets.reach
          ? Math.round((performance.reach / campaign.targets.reach) * 100)
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch performance' });
  }
});

// Add milestone to campaign
router.post('/:id/milestones', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: req.params.id },
      {
        $push: {
          milestones: req.body
        }
      },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign.milestones);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add milestone' });
  }
});

// Get campaign alerts
router.get('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOne({ campaignId: req.params.id });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign.alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// Add alert to campaign
router.post('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOneAndUpdate(
      { campaignId: req.params.id },
      {
        $push: {
          alerts: {
            ...req.body,
            timestamp: new Date()
          }
        }
      },
      { new: true }
    );

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json(campaign.alerts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add alert' });
  }
});

// Delete campaign
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findOneAndDelete({ campaignId: req.params.id });
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;
