import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock industry trends data
const industryTrends: Record<string, any[]> = {
  restaurant: [
    { id: randomUUID(), trend: 'Ghost Kitchens', growth: 45, status: 'accelerating', insights: ['Delivery-first model', 'Multiple brand concepts', 'Lower overhead'] },
    { id: randomUUID(), trend: 'Sustainable Dining', growth: 32, status: 'growing', insights: ['Farm-to-table sourcing', 'Zero-waste initiatives', 'Plant-based options'] },
    { id: randomUUID(), trend: 'AI-Powered Menu Optimization', growth: 28, status: 'emerging', insights: ['Dynamic pricing', 'Personalized recommendations', 'Inventory prediction'] },
    { id: randomUUID(), trend: 'Contactless Experience', growth: 55, status: 'accelerating', insights: ['QR code ordering', 'Mobile payments', 'Kitchen displays'] }
  ],
  healthcare: [
    { id: randomUUID(), trend: 'Telehealth Expansion', growth: 80, status: 'accelerating', insights: ['Virtual consultations', 'Remote monitoring', 'Mental health apps'] },
    { id: randomUUID(), trend: 'AI Diagnostics', growth: 42, status: 'growing', insights: ['Image analysis', 'Symptom checkers', 'Predictive analytics'] },
    { id: randomUUID(), trend: 'Value-Based Care', growth: 35, status: 'growing', insights: ['Outcome-based pricing', 'Preventive focus', 'Care coordination'] },
    { id: randomUUID(), trend: 'Health Wearables', growth: 48, status: 'accelerating', insights: ['Continuous monitoring', 'Early warning systems', 'Data integration'] }
  ],
  hotel: [
    { id: randomUUID(), trend: ' contactless Check-in', growth: 72, status: 'accelerating', insights: ['Mobile keys', 'Digital concierge', 'Automated check-out'] },
    { id: randomUUID(), trend: 'Bleisure Travel', growth: 38, status: 'growing', insights: ['Extended stays', 'Work-friendly rooms', 'Business amenities'] },
    { id: randomUUID(), trend: 'Personalized Experiences', growth: 41, status: 'growing', insights: ['Guest preference learning', 'Custom recommendations', 'Loyalty integration'] },
    { id: randomUUID(), trend: 'Sustainable Hotels', growth: 29, status: 'growing', insights: ['Energy efficiency', 'Water conservation', 'Local sourcing'] }
  ],
  retail: [
    { id: randomUUID(), trend: 'Omnichannel Integration', growth: 65, status: 'accelerating', insights: ['Buy online pickup in-store', 'Unified inventory', 'Cross-channel loyalty'] },
    { id: randomUUID(), trend: 'Augmented Reality Shopping', growth: 52, status: 'growing', insights: ['Virtual try-on', 'AR product visualization', 'In-store navigation'] },
    { id: randomUUID(), trend: 'Subscription Models', growth: 44, status: 'growing', insights: ['Curated boxes', 'Replenishment services', 'Exclusive access'] },
    { id: randomUUID(), trend: 'Micro-Fulfillment Centers', growth: 38, status: 'emerging', insights: ['Same-day delivery', 'Local inventory', 'Robotic picking'] }
  ],
  fitness: [
    { id: randomUUID(), trend: 'Hybrid Fitness', growth: 58, status: 'accelerating', insights: ['Home + gym blend', 'Live streaming', 'On-demand classes'] },
    { id: randomUUID(), trend: 'Corporate Wellness', growth: 45, status: 'growing', insights: ['Gym partnerships', 'Mental health programs', 'Incentive systems'] },
    { id: randomUUID(), trend: 'Wearable Integration', growth: 62, status: 'accelerating', insights: ['Heart rate zones', 'Recovery tracking', 'Sleep optimization'] },
    { id: randomUUID(), trend: 'Personalization AI', growth: 35, status: 'emerging', insights: ['Adaptive workouts', 'Nutrition planning', 'Goal tracking'] }
  ],
  default: [
    { id: randomUUID(), trend: 'Digital Transformation', growth: 55, status: 'accelerating', insights: ['Cloud adoption', 'Process automation', 'Data analytics'] },
    { id: randomUUID(), trend: 'Customer Experience Focus', growth: 48, status: 'growing', insights: ['Personalization', 'Omnichannel', 'Self-service'] },
    { id: randomUUID(), trend: 'Sustainability Initiatives', growth: 42, status: 'growing', insights: ['Green operations', 'ESG reporting', 'Circular economy'] },
    { id: randomUUID(), trend: 'AI/ML Integration', growth: 65, status: 'accelerating', insights: ['Predictive analytics', 'Automation', 'Intelligence'] }
  ]
};

// GET /trends - Get industry trends
router.get('/', (req: Request, res: Response) => {
  const { industry } = req.query;

  let trends: any[];
  let industryKey = (industry as string)?.toLowerCase() || 'default';

  if (industryTrends[industryKey]) {
    trends = industryTrends[industryKey];
  } else {
    // Return trends for multiple industries
    const multiIndustryTrends = Object.entries(industryTrends).map(([ind, tr]) => ({
      industry: ind,
      trends: tr
    }));
    res.json({
      success: true,
      data: {
        industries: multiIndustryTrends,
        totalIndustries: multiIndustryTrends.length
      }
    });
    return;
  }

  res.json({
    success: true,
    data: {
      industry: industryKey,
      trends,
      summary: {
        total: trends.length,
        accelerating: trends.filter(t => t.status === 'accelerating').length,
        growing: trends.filter(t => t.status === 'growing').length,
        emerging: trends.filter(t => t.status === 'emerging').length
      }
    }
  });
});

export default router;
