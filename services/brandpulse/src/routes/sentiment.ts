import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Sentiment } from '../models/Sentiment';
import { Mention } from '../models/Mention';
import { SentimentAnalysisService } from '../services/sentimentAnalysis';

const router = Router();
const sentimentService = new SentimentAnalysisService();

// Get sentiment history
router.get('/brand/:brandId', async (req: Request, res: Response) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    const query: any = { brandId: req.params.brandId };

    if (period) query['period.type'] = period;
    if (startDate || endDate) {
      query['period.start'] = {};
      if (startDate) query['period.start'].$gte = new Date(startDate as string);
      if (endDate) query['period.start'].$lte = new Date(endDate as string);
    }

    const sentiments = await Sentiment.find(query)
      .sort({ 'period.start': -1 })
      .limit(90);

    res.json(sentiments);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sentiment history' });
  }
});

// Get latest sentiment for brand
router.get('/brand/:brandId/latest', async (req: Request, res: Response) => {
  try {
    const sentiment = await Sentiment.findOne({ brandId: req.params.brandId })
      .sort({ 'period.end': -1 });

    if (!sentiment) {
      return res.status(404).json({ error: 'No sentiment data found' });
    }
    res.json(sentiment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sentiment' });
  }
});

// Analyze text sentiment
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { text, language = 'en' } = req.body;
    const result = await sentimentService.analyzeText(text, language);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze sentiment' });
  }
});

// Get sentiment by source
router.get('/sources/:brandId', async (req: Request, res: Response) => {
  try {
    const sentiment = await Sentiment.findOne({ brandId: req.params.brandId })
      .sort({ 'period.end': -1 });

    if (!sentiment) {
      return res.status(404).json({ error: 'No sentiment data found' });
    }

    res.json(sentiment.bySource);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sentiment by source' });
  }
});

// Get sentiment trends
router.get('/trends/:brandId', async (req: Request, res: Response) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    const sentiments = await Sentiment.find({
      brandId: req.params.brandId,
      'period.type': 'daily',
      'period.start': { $gte: startDate }
    }).sort({ 'period.start': 1 });

    const trend = {
      direction: 'stable' as const,
      averageScore: 0,
      volatility: 0,
      dataPoints: sentiments.length
    };

    if (sentiments.length > 0) {
      const scores = sentiments.map(s => s.aggregate.score);
      trend.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

      if (sentiments.length >= 2) {
        const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
        const secondHalf = scores.slice(Math.floor(scores.length / 2));
        const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

        if (secondAvg > firstAvg + 0.1) trend.direction = 'improving';
        else if (secondAvg < firstAvg - 0.1) trend.direction = 'declining';
      }
    }

    res.json({ trend, data: sentiments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

// Generate sentiment report
router.get('/report/:brandId', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const query: any = { brandId: req.params.brandId };
    if (startDate && endDate) {
      query['period.start'] = { $gte: new Date(startDate as string) };
      query['period.end'] = { $lte: new Date(endDate as string) };
    }

    const sentiments = await Sentiment.find(query)
      .sort({ 'period.start': -1 })
      .limit(30);

    // Aggregate stats
    const stats = {
      total: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      avgScore: 0,
      topPositiveKeywords: [] as string[],
      topNegativeKeywords: [] as string[]
    };

    sentiments.forEach(s => {
      stats.total += s.aggregate.total;
      stats.positive += s.aggregate.positive;
      stats.neutral += s.aggregate.neutral;
      stats.negative += s.aggregate.negative;
    });

    if (stats.total > 0) {
      stats.avgScore = ((stats.positive - stats.negative) / stats.total);
    }

    // Get keyword distribution from recent data
    const recentSentiment = sentiments[0];
    if (recentSentiment) {
      stats.topPositiveKeywords = recentSentiment.topPositiveKeywords.slice(0, 10).map(k => k.keyword);
      stats.topNegativeKeywords = recentSentiment.topNegativeKeywords.slice(0, 10).map(k => k.keyword);
    }

    res.json({ stats, history: sentiments });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// Calculate real-time sentiment from mentions
router.post('/calculate/:brandId', async (req: Request, res: Response) => {
  try {
    const { hours = 24 } = req.query;
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - Number(hours));

    const mentions = await Mention.find({
      brandId: req.params.brandId,
      publishedAt: { $gte: startDate }
    });

    const sentimentId = `SENT-${uuidv4().slice(0, 12).toUpperCase()}`;

    const bySource: any = {};
    mentions.forEach(m => {
      if (!bySource[m.source]) {
        bySource[m.source] = { positive: 0, neutral: 0, negative: 0, total: 0 };
      }
      bySource[m.source].total++;
      bySource[m.source][m.sentiment.label]++;
    });

    const aggregate = {
      score: mentions.length > 0
        ? mentions.reduce((acc, m) => acc + m.sentiment.score, 0) / mentions.length
        : 0,
      positive: mentions.filter(m => m.sentiment.label === 'positive').length,
      neutral: mentions.filter(m => m.sentiment.label === 'neutral').length,
      negative: mentions.filter(m => m.sentiment.label === 'negative').length,
      total: mentions.length
    };

    const sentiment = new Sentiment({
      sentimentId,
      brandId: req.params.brandId,
      period: {
        start: startDate,
        end: new Date(),
        type: 'hourly'
      },
      aggregate,
      bySource,
      trending: {
        direction: 'stable',
        changePercent: 0,
        velocity: 0
      }
    });

    await sentiment.save();
    res.json(sentiment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate sentiment' });
  }
});

export default router;
