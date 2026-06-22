import { Router } from 'express';
const router = Router();

router.get('/overview', (req, res) => {
  res.json({
    success: true,
    stats: {
      totalViews: 1500000,
      totalEngagement: 250000,
      avgWatchTime: 4.5,
      subscribers: 50000,
      revenue: 125000
    }
  });
});

router.get('/trends', (req, res) => {
  const trends = [
    { topic: 'AI', velocity: 85, sentiment: 'positive' },
    { topic: 'Tech', velocity: 72, sentiment: 'positive' },
    { topic: 'Sports', velocity: 65, sentiment: 'neutral' }
  ];
  res.json({ success: true, trends });
});

router.get('/sentiment', (req, res) => {
  res.json({
    success: true,
    sentiment: {
      positive: 45,
      neutral: 35,
      negative: 20
    }
  });
});

export default router;
