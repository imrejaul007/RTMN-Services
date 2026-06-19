/**
 * Domain Routes - Domain-specific consulting
 */

import express from 'express';

const router = express.Router();

/**
 * POST /domain/restaurant/advice
 * Restaurant-specific advice
 */
router.post('/domain/restaurant/advice', async (req, res) => {
  const { userId, type, context } = req.body;

  const adviceTypes = {
    menu: {
      title: 'Menu Optimization',
      tips: [
        'Keep menu size to 15-25 items for optimal kitchen performance',
        'Use high-margin items as focal points',
        'Update seasonal items quarterly',
        'Track item popularity weekly',
        'Price with 65-70% food cost target'
      ]
    },
    operations: {
      title: 'Restaurant Operations',
      tips: [
        'Standardize recipes for consistency',
        'Implement prep checklists',
        'Use inventory management software',
        'Schedule based on historical data',
        'Create opening/closing procedures'
      ]
    },
    marketing: {
      title: 'Restaurant Marketing',
      tips: [
        'Claim and optimize Google Business Profile',
        'Encourage reviews with every meal',
        'Post high-quality food photos daily',
        'Run targeted local ads on Meta',
        'Create a loyalty/rewards program'
      ]
    },
    finance: {
      title: 'Restaurant Finance',
      tips: [
        'Target 5-10% profit margin',
        'Track food cost percentage weekly',
        'Monitor labor cost (30-35% is ideal)',
        'Negotiate supplier terms',
        'Plan for seasonal fluctuations'
      ]
    }
  };

  const advice = adviceTypes[type] || adviceTypes.operations;

  res.json({
    success: true,
    advice
  });
});

/**
 * POST /domain/startup/advice
 * Startup-specific advice
 */
router.post('/domain/startup/advice', async (req, res) => {
  const { userId, stage } = req.body;

  const stages = {
    idea: {
      title: 'Idea Stage',
      tips: [
        'Validate problem exists before building',
        'Talk to 50+ potential customers',
        'Define your MVP feature set',
        'Check for existing competition',
        'Document assumptions to test'
      ]
    },
    mvp: {
      title: 'MVP Stage',
      tips: [
        'Launch in 60-90 days maximum',
        'Focus on one core feature',
        'Track activation and retention',
        'Iterate based on user feedback',
        'Build in public'
      ]
    },
    growth: {
      title: 'Growth Stage',
      tips: [
        'Find repeatable acquisition channel',
        'Optimize unit economics',
        'Build scalable processes',
        'Hire ahead of growth',
        'Maintain culture as you scale'
      ]
    },
    scale: {
      title: 'Scale Stage',
      tips: [
        'Systemize everything',
        'Build management layers',
        'Focus on efficiency',
        'Plan for Series B metrics',
        'Maintain innovation'
      ]
    }
  };

  const advice = stages[stage] || stages.idea;

  res.json({
    success: true,
    advice
  });
});

/**
 * POST /domain/marketing/advice
 * Marketing-specific advice
 */
router.post('/domain/marketing/advice', async (req, res) => {
  const { userId, channel } = req.body;

  const channels = {
    social: {
      title: 'Social Media Marketing',
      tips: [
        'Choose 2-3 platforms max',
        'Post consistently (daily)',
        'Engage with comments within 1 hour',
        'Use short-form video content',
        'Track engagement metrics'
      ]
    },
    content: {
      title: 'Content Marketing',
      tips: [
        'Create content for each stage of funnel',
        'Repurpose content across channels',
        'Focus on SEO-friendly topics',
        'Build an email list',
        'Track content ROI'
      ]
    },
    paid: {
      title: 'Paid Advertising',
      tips: [
        'Start with small budget',
        'Test multiple ad variations',
        'Use retargeting',
        'Track conversion metrics',
        'Optimize based on data'
      ]
    }
  };

  const advice = channels[channel] || {
    title: 'General Marketing',
    tips: [
      'Know your customer avatar deeply',
      'Focus on one channel first',
      'Create valuable content',
      'Build relationships',
      'Track and optimize constantly'
    ]
  };

  res.json({
    success: true,
    advice
  });
});

export default router;
