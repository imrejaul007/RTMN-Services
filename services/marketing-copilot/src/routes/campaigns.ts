import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Campaign } from '../models/Campaign';
import { optimizationService } from '../services/optimization';
import { contentGenerator } from '../services/contentGenerator';

const router = Router();

// Validation schemas
const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['email', 'social', 'ppc', 'content', 'influencer', 'seo']),
  budget: z.number().positive(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  targetAudience: z.object({
    segments: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      size: z.number().positive(),
      characteristics: z.array(z.string()),
      engagementScore: z.number().min(0).max(100),
      conversionRate: z.number().min(0).max(100),
      preferredChannels: z.array(z.string()),
      preferredContentTypes: z.array(z.string()),
      avgOrderValue: z.number().optional(),
      churnRisk: z.enum(['low', 'medium', 'high']).optional()
    })),
    demographics: z.object({
      ageRange: z.object({ min: z.number(), max: z.number() }).optional(),
      gender: z.array(z.string()).optional(),
      location: z.array(z.string()).optional(),
      income: z.object({ min: z.number(), max: z.number() }).optional()
    }).optional(),
    interests: z.array(z.string()).optional(),
    behaviors: z.array(z.string()).optional(),
    customAttributes: z.record(z.any()).optional()
  }),
  channels: z.array(z.string()),
  objectives: z.array(z.string()),
  kpis: z.array(z.object({
    name: z.string(),
    target: z.number(),
    unit: z.string()
  })).optional()
});

// GET /api/marketing/campaigns - List all campaigns
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, type, limit = 50, offset = 0 } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const campaigns = await Campaign.find(filter)
      .skip(Number(offset))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Campaign.countDocuments(filter);

    res.json({
      success: true,
      data: campaigns,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + campaigns.length < total
      }
    });
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

// GET /api/marketing/campaigns/suggestions - Get campaign suggestions
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { industry, objective, budget } = req.query;

    // Generate campaign suggestions based on parameters
    const suggestions = generateCampaignSuggestions({
      industry: industry as string,
      objective: objective as string,
      budget: budget ? Number(budget) : 10000
    });

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate campaign suggestions'
    });
  }
});

// GET /api/marketing/campaigns/:id - Get campaign by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaign'
    });
  }
});

// POST /api/marketing/campaigns - Create new campaign
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createCampaignSchema.parse(req.body);

    const campaign = new Campaign({
      ...validatedData,
      status: 'draft',
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        spend: 0,
        ctr: 0,
        conversionRate: 0,
        roas: 0,
        engagement: 0
      },
      suggestedContent: [],
      abTestRecommendations: []
    });

    await campaign.save();

    res.status(201).json({
      success: true,
      data: campaign
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
      return;
    }
    console.error('Error creating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create campaign'
    });
  }
});

// PUT /api/marketing/campaigns/:id - Update campaign
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update campaign'
    });
  }
});

// DELETE /api/marketing/campaigns/:id - Delete campaign
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete campaign'
    });
  }
});

// POST /api/marketing/campaigns/:id/generate-content - Generate content for campaign
router.post('/:id/generate-content', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    // Generate content suggestions
    const content = await contentGenerator.generateContent({
      topic: campaign.objectives[0] || campaign.name,
      type: 'social',
      targetAudience: campaign.targetAudience.segments.map(s => s.name),
      channels: campaign.channels,
      tone: 'professional',
      length: 'medium',
      includeSEO: true
    });

    // Update campaign with suggestions
    campaign.suggestedContent = [content.content, ...(content.alternatives || [])];
    await campaign.save();

    res.json({
      success: true,
      data: {
        campaignId: campaign._id,
        suggestions: campaign.suggestedContent,
        seo: content.seoSuggestions
      }
    });
  } catch (error) {
    console.error('Error generating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate content'
    });
  }
});

// POST /api/marketing/campaigns/:id/start - Start a campaign
router.post('/:id/start', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    if (campaign.status === 'active') {
      res.status(400).json({
        success: false,
        error: 'Campaign is already active'
      });
      return;
    }

    campaign.status = 'active';
    campaign.startDate = new Date();
    await campaign.save();

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign'
    });
  }
});

// POST /api/marketing/campaigns/:id/pause - Pause a campaign
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    campaign.status = 'paused';
    await campaign.save();

    res.json({
      success: true,
      data: campaign
    });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause campaign'
    });
  }
});

// Helper function to generate campaign suggestions
function generateCampaignSuggestions(params: {
  industry?: string;
  objective?: string;
  budget: number;
}) {
  const suggestions = [];

  // Email campaign suggestion
  suggestions.push({
    id: uuidv4(),
    type: 'email',
    name: `Welcome Series - ${params.industry || 'General'}`,
    description: 'Automated email sequence for new subscribers',
    objectives: ['Build relationship', 'Drive first purchase', 'Brand awareness'],
    suggestedChannels: ['email'],
    estimatedReach: Math.floor(params.budget * 0.1),
    estimatedROI: 350,
    contentTypes: ['Welcome email', 'Product showcase', 'Special offer', 'Testimonial'],
    recommendedDuration: '30 days'
  });

  // Social campaign suggestion
  suggestions.push({
    id: uuidv4(),
    type: 'social',
    name: `Engagement Boost - ${params.industry || 'General'}`,
    description: 'Social media campaign to increase engagement and followers',
    objectives: ['Increase engagement', 'Grow audience', 'Drive traffic'],
    suggestedChannels: ['instagram', 'facebook', 'tiktok'],
    estimatedReach: Math.floor(params.budget * 0.5),
    estimatedROI: 220,
    contentTypes: ['Behind the scenes', 'User-generated content', 'Contests', 'Polls'],
    recommendedDuration: '60 days'
  });

  // PPC campaign suggestion
  suggestions.push({
    id: uuidv4(),
    type: 'ppc',
    name: `Performance Marketing - ${params.industry || 'General'}`,
    description: 'Paid advertising campaign for conversions',
    objectives: ['Drive conversions', 'Increase sales', 'Lead generation'],
    suggestedChannels: ['google_ads', 'facebook_ads', 'linkedin_ads'],
    estimatedReach: Math.floor(params.budget * 0.8),
    estimatedROI: 180,
    contentTypes: ['Product ads', 'Retargeting', 'Lead magnets', 'Landing pages'],
    recommendedDuration: '90 days'
  });

  // Content marketing suggestion
  suggestions.push({
    id: uuidv4(),
    type: 'content',
    name: `Content Authority - ${params.industry || 'General'}`,
    description: 'Long-form content to establish thought leadership',
    objectives: ['SEO', 'Brand authority', 'Organic growth'],
    suggestedChannels: ['blog', 'linkedin', 'youtube'],
    estimatedReach: Math.floor(params.budget * 0.3),
    estimatedROI: 280,
    contentTypes: ['Blog posts', 'Whitepapers', 'Case studies', 'Webinars'],
    recommendedDuration: '120 days'
  });

  return suggestions;
}

export default router;
