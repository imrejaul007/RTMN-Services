import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock competitor analysis data
const competitorsData: Record<string, any[]> = {
  'starbucks': [
    { id: randomUUID(), name: 'Starbucks', type: 'direct', market_share: 42, strengths: ['Brand recognition', 'Loyalty program', 'Digital innovation'], weaknesses: ['Premium pricing', 'Market saturation'], recent_moves: ['Oatmilk launch', 'Mobile ordering expansion', 'Digital gift cards'] },
    { id: randomUUID(), name: 'Dunkin', type: 'direct', market_share: 25, strengths: ['Value positioning', 'Speed', 'Morning routine'], weaknesses: ['Limited food menu', 'Brand perception'], recent_moves: ['Beyond Meat partnership', 'App refresh', 'New store format'] },
    { id: randomUUID(), name: 'Dutch Bros', type: 'emerging', market_share: 3, strengths: ['Culture-driven', 'Rapid expansion', 'Energy drinks'], weaknesses: ['Regional concentration', 'Youth-focused'], recent_moves: ['IPO launch', 'East coast expansion', 'Drive-thru innovation'] }
  ],
  'uber': [
    { id: randomUUID(), name: 'Lyft', type: 'direct', market_share: 30, strengths: ['US focus', 'Rider experience', 'Transit integration'], weaknesses: ['Limited international presence', 'Lower driver satisfaction'], recent_moves: ['Transit partnerships', 'Scooter integration', 'Subscription service'] },
    { id: randomUUID(), name: 'Grab', type: 'regional', market_share: 50, strengths: ['Southeast Asia dominance', 'Super app', 'Fintech integration'], weaknesses: ['Profitability challenges', 'Regulatory issues'], recent_moves: ['Financial services expansion', 'Grocery delivery', 'Enterprise solutions'] },
    { id: randomUUID(), name: 'Bolt', type: 'emerging', market_share: 8, strengths: ['European presence', 'Lower fees', 'Fast growth'], weaknesses: ['Limited US presence', 'Brand recognition'], recent_moves: ['US expansion', 'E-scooter service', 'Delivery pilot'] }
  ],
  'marriott': [
    { id: randomUUID(), name: 'Hilton', type: 'direct', market_share: 28, strengths: ['Honors loyalty', 'Brand diversity', 'Digital innovation'], weaknesses: ['Premium positioning', 'Limited lifestyle brands'], recent_moves: ['All-Inclusive expansion', 'Remote workspace concept', 'Connected room tech'] },
    { id: randomUUID(), name: 'Airbnb', type: 'disruptive', market_share: 15, strengths: ['Unique inventory', 'Local experiences', 'Host community'], weaknesses: ['Regulatory risk', 'No consistent service'], recent_moves: ['Experiences expansion', 'Business travel focus', 'Long-term stays'] },
    { id: randomUUID(), name: 'Hyatt', type: 'direct', market_share: 12, strengths: ['Luxury portfolio', 'Small luxury hotels', 'MICE focus'], weaknesses: ['Smaller footprint', 'Limited midscale'], recent_moves: ['Inclusive collection', 'Mindbody partnership', 'Wellbeing focus'] }
  ],
  'default': [
    { id: randomUUID(), name: 'Market Leader A', type: 'direct', market_share: 35, strengths: ['Scale', 'Brand', 'Technology'], weaknesses: ['Agility', 'Innovation'], recent_moves: ['Digital transformation', 'Partnerships', 'New markets'] },
    { id: randomUUID(), name: 'Fast Follower B', type: 'direct', market_share: 25, strengths: ['Speed', 'Cost efficiency', 'Copy innovation'], weaknesses: ['Brand strength', 'Premium positioning'], recent_moves: ['Tech adoption', 'Price optimization', 'Customer focus'] },
    { id: randomUUID(), name: 'Disruptor C', type: 'disruptive', market_share: 10, strengths: ['Innovation', 'Customer experience', 'Agility'], weaknesses: ['Scale', 'Resources'], recent_moves: ['Rapid expansion', 'New segments', 'Model innovation'] }
  ]
};

// GET /competitors - Competitor analysis
router.get('/', (req: Request, res: Response) => {
  const { company } = req.query;

  let companyKey = (company as string)?.toLowerCase().replace(/\s+/g, '') || 'default';
  let competitors = competitorsData[companyKey] || competitorsData['default'];

  // Generate analysis insights
  const analysis = {
    market_composition: {
      total_competitors_analyzed: competitors.length,
      market_share_covered: competitors.reduce((sum, c) => sum + c.market_share, 0),
      competitive_intensity: competitors.length > 3 ? 'high' : 'moderate'
    },
    competitive_dynamics: {
      direct_competitors: competitors.filter(c => c.type === 'direct').length,
      emerging_threats: competitors.filter(c => c.type === 'emerging').length,
      disruptive_forces: competitors.filter(c => c.type === 'disruptive').length
    },
    strategic_insights: {
      common_strengths: [...new Set(competitors.flatMap(c => c.strengths))].slice(0, 5),
      common_moves: [...new Set(competitors.flatMap(c => c.recent_moves))].slice(0, 5)
    }
  };

  res.json({
    success: true,
    data: {
      company: companyKey,
      competitors,
      analysis
    }
  });
});

export default router;
