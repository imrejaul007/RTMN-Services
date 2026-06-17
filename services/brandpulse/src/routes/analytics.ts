import { Router, Request, Response } from 'express';
import { Brand } from '../models/Brand';
import { Mention } from '../models/Mention';
import { Sentiment } from '../models/Sentiment';
import { Campaign } from '../models/Campaign';
import { BrandHealthService } from '../services/brandHealth';

const router = Router();
const brandHealthService = new BrandHealthService();

// Get brand health score
router.get('/health/:brandId', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOne({ brandId: req.params.brandId });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const health = await brandHealthService.calculateHealthScore(req.params.brandId);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate health score' });
  }
});

// Get brand overview analytics
router.get('/overview/:brandId', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const [brand, mentions, sentiment, campaigns] = await Promise.all([
      Brand.findOne({ brandId: req.params.brandId }),
      Mention.countDocuments({
        brandId: req.params.brandId,
        publishedAt: { $gte: startDate }
      }),
      Sentiment.findOne({ brandId: req.params.brandId })
        .sort({ 'period.end': -1 }),
      Campaign.find({ brandId: req.params.brandId, status: 'active' })
    ]);

    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Get mention stats by source
    const sourceStats = await Mention.aggregate([
      { $match: { brandId: req.params.brandId, publishedAt: { $gte: startDate } } },
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    // Get sentiment distribution
    const sentimentStats = await Mention.aggregate([
      { $match: { brandId: req.params.brandId, publishedAt: { $gte: startDate } } },
      { $group: { _id: '$sentiment.label', count: { $sum: 1 } } }
    ]);

    res.json({
      brand: {
        name: brand.name,
        healthScore: brand.currentHealth.score,
        industry: brand.industry
      },
      period: { days: Number(days), startDate, endDate: new Date() },
      mentions: {
        total: mentions,
        bySource: sourceStats.reduce((acc: any, s) => { acc[s._id] = s.count; return acc; }, {})
      },
      sentiment: sentiment ? {
        score: sentiment.aggregate.score,
        distribution: sentimentStats.reduce((acc: any, s) => { acc[s._id] = s.count; return acc; }, {})
      } : null,
      activeCampaigns: campaigns.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch overview analytics' });
  }
});

// Get mention volume over time
router.get('/volume/:brandId', async (req: Request, res: Response) => {
  try {
    const { interval = 'day', days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const intervalMs = interval === 'hour' ? 3600000 : interval === 'day' ? 86400000 : 604800000;

    const mentions = await Mention.aggregate([
      {
        $match: {
          brandId: req.params.brandId,
          publishedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $subtract: [
              { $toLong: '$publishedAt' },
              { $mod: [{ $toLong: '$publishedAt' }, intervalMs] }
            ]
          },
          count: { $sum: 1 },
          positive: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] }
          },
          negative: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'negative'] }, 1, 0] }
          },
          neutral: {
            $sum: { $cond: [{ $eq: ['$sentiment.label', 'neutral'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json(mentions.map(m => ({
      timestamp: new Date(m._id),
      total: m.count,
      positive: m.positive,
      negative: m.negative,
      neutral: m.neutral
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch volume analytics' });
  }
});

// Get engagement analytics
router.get('/engagement/:brandId', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const engagement = await Mention.aggregate([
      {
        $match: {
          brandId: req.params.brandId,
          publishedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalLikes: { $sum: { $ifNull: ['$engagement.likes', 0] } },
          totalShares: { $sum: { $ifNull: ['$engagement.shares', 0] } },
          totalComments: { $sum: { $ifNull: ['$engagement.comments', 0] } },
          totalReach: { $sum: { $ifNull: ['$engagement.reach', 0] } },
          avgEngagement: {
            $avg: {
              $add: [
                { $ifNull: ['$engagement.likes', 0] },
                { $multiply: [{ $ifNull: ['$engagement.comments', 0] }, 2] },
                { $multiply: [{ $ifNull: ['$engagement.shares', 0] }, 3] }
              ]
            }
          },
          avgFollowers: { $avg: { $ifNull: ['$author.followers', 0] } }
        }
      }
    ]);

    const topEngaged = await Mention.find({
      brandId: req.params.brandId,
      publishedAt: { $gte: startDate }
    })
      .sort({ 'engagement.reach': -1 })
      .limit(10)
      .select('content author engagement publishedAt source');

    res.json({
      summary: engagement[0] || {
        totalLikes: 0, totalShares: 0, totalComments: 0,
        totalReach: 0, avgEngagement: 0, avgFollowers: 0
      },
      topEngaged
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch engagement analytics' });
  }
});

// Get audience demographics
router.get('/demographics/:brandId', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const locationStats = await Mention.aggregate([
      {
        $match: {
          brandId: req.params.brandId,
          publishedAt: { $gte: startDate },
          'location.country': { $exists: true }
        }
      },
      {
        $group: {
          _id: '$location.country',
          count: { $sum: 1 },
          reach: { $sum: { $ifNull: ['$engagement.reach', 0] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    const languageStats = await Mention.aggregate([
      {
        $match: {
          brandId: req.params.brandId,
          publishedAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      byCountry: locationStats,
      byLanguage: languageStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch demographics' });
  }
});

// Get competitor comparison
router.get('/competitors/:brandId', async (req: Request, res: Response) => {
  try {
    const brand = await Brand.findOne({ brandId: req.params.brandId });
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const competitorNames = brand.competitors;
    const competitors = await Brand.find({ name: { $in: competitorNames } });

    const comparison = await Promise.all([
      brand,
      ...competitors
    ].map(async (b) => {
      const mentionCount = await Mention.countDocuments({
        brandId: b.brandId,
        publishedAt: { $gte: new Date(Date.now() - 30 * 86400000) }
      });
      const sentiment = await Sentiment.findOne({ brandId: b.brandId })
        .sort({ 'period.end': -1 });

      return {
        name: b.name,
        healthScore: b.currentHealth.score,
        mentionCount,
        sentimentScore: sentiment?.aggregate.score || 0
      };
    }));

    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch competitor comparison' });
  }
});

// Get crisis analytics
router.get('/crisis/:brandId', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const crisisMentions = await Mention.find({
      brandId: req.params.brandId,
      isCrisis: true,
      publishedAt: { $gte: startDate }
    }).sort({ publishedAt: -1 });

    // Group crisis mentions by day
    const crisisByDay = crisisMentions.reduce((acc: any, m) => {
      const day = m.publishedAt.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { count: 0, sources: {} };
      acc[day].count++;
      acc[day].sources[m.source] = (acc[day].sources[m.source] || 0) + 1;
      return acc;
    }, {});

    res.json({
      totalCrisis: crisisMentions.length,
      crisisMentions: crisisMentions.slice(0, 50),
      byDay: Object.entries(crisisByDay).map(([date, data]: [any, any]) => ({
        date,
        ...data
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch crisis analytics' });
  }
});

// Get trending topics
router.get('/trending/:brandId', async (req: Request, res: Response) => {
  try {
    const { days = 7, limit = 20 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const mentions = await Mention.find({
      brandId: req.params.brandId,
      publishedAt: { $gte: startDate },
      tags: { $exists: true, $ne: [] }
    });

    // Count tag frequency
    const tagCounts = mentions.reduce((acc: any, m) => {
      m.tags.forEach((tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    }, {});

    const trending = Object.entries(tagCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, Number(limit))
      .map(([tag, count]) => ({ tag, count }));

    res.json(trending);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trending topics' });
  }
});

export default router;
