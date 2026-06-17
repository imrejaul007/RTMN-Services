import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock market signals data
const marketSignals = [
  {
    id: randomUUID(),
    type: 'trend',
    industry: 'restaurant',
    signal: 'Ghost kitchen demand growing 45% YoY in urban markets',
    source: 'Industry Analysis',
    sentiment: 'positive',
    strength: 85,
    timestamp: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'trend',
    industry: 'healthcare',
    signal: 'Telehealth adoption reaching 80% among chronic disease patients',
    source: 'Healthcare Trends Report',
    sentiment: 'positive',
    strength: 92,
    timestamp: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'disruption',
    industry: 'retail',
    signal: 'AR shopping features increasing conversion by 35%',
    source: 'Retail Innovation Labs',
    sentiment: 'opportunity',
    strength: 78,
    timestamp: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'threat',
    industry: 'hotel',
    signal: 'Airbnb listings in city centers up 28%, impacting mid-tier hotels',
    source: 'Hospitality Monitor',
    sentiment: 'negative',
    strength: 65,
    timestamp: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'opportunity',
    industry: 'fitness',
    signal: 'Corporate wellness programs showing 300% ROI in productivity',
    source: 'Corporate Health Index',
    sentiment: 'positive',
    strength: 88,
    timestamp: new Date(Date.now() - 18000000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'trend',
    industry: 'beauty',
    signal: 'Clean beauty market projected to reach $25B by 2027',
    source: 'Beauty Industry Report',
    sentiment: 'positive',
    strength: 81,
    timestamp: new Date(Date.now() - 21600000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'disruption',
    industry: 'education',
    signal: 'AI-powered personalized learning improving outcomes by 40%',
    source: 'EdTech Analytics',
    sentiment: 'opportunity',
    strength: 75,
    timestamp: new Date(Date.now() - 25200000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'threat',
    industry: 'automotive',
    signal: 'EV adoption rate threatening traditional service revenue streams',
    source: 'Auto Industry Intelligence',
    sentiment: 'negative',
    strength: 70,
    timestamp: new Date(Date.now() - 28800000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'opportunity',
    industry: 'realestate',
    signal: 'Remote work driving 60% increase in suburban property demand',
    source: 'Property Market Analysis',
    sentiment: 'positive',
    strength: 85,
    timestamp: new Date(Date.now() - 32400000).toISOString()
  },
  {
    id: randomUUID(),
    type: 'trend',
    industry: 'legal',
    signal: 'Legal tech adoption up 52% among mid-size law firms',
    source: 'Legal Innovation Survey',
    sentiment: 'positive',
    strength: 72,
    timestamp: new Date(Date.now() - 36000000).toISOString()
  }
];

// GET /signals/search - Search market signals
router.get('/search', (req: Request, res: Response) => {
  const { q, limit = '10', industry } = req.query;

  let results = [...marketSignals];

  // Filter by industry if provided
  if (industry && typeof industry === 'string') {
    results = results.filter(s => s.industry.toLowerCase() === industry.toLowerCase());
  }

  // Filter by search query
  if (q && typeof q === 'string') {
    const query = q.toLowerCase();
    results = results.filter(s =>
      s.signal.toLowerCase().includes(query) ||
      s.industry.toLowerCase().includes(query) ||
      s.type.toLowerCase().includes(query)
    );
  }

  // Sort by timestamp (newest first)
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit
  const limitNum = Math.min(parseInt(limit as string) || 10, 50);
  results = results.slice(0, limitNum);

  res.json({
    success: true,
    data: {
      signals: results,
      total: results.length,
      query: q || null,
      industry: industry || null
    }
  });
});

export default router;
