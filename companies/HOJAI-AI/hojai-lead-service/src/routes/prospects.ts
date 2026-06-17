import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock prospect database
const prospects: any[] = [
  {
    id: randomUUID(),
    name: 'Sarah Chen',
    email: 'sarah.chen@techvision.io',
    company: 'TechVision Labs',
    title: 'VP of Sales',
    industry: 'Technology',
    size: '201-500',
    tier: 'Hot',
    score: 87,
    status: 'active',
    last_contact: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Follow up on demo feedback',
    source: 'LinkedIn',
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Michael Torres',
    email: 'mtorres@greenleaf.co',
    company: 'GreenLeaf Organics',
    title: 'CEO',
    industry: 'Agriculture',
    size: '51-200',
    tier: 'Hot',
    score: 92,
    status: 'active',
    last_contact: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Contract review meeting',
    source: 'Referral',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Emily Watson',
    email: 'e.watson@urbanhealth.com',
    company: 'Urban Health Systems',
    title: 'Director of Operations',
    industry: 'Healthcare',
    size: '501-1000',
    tier: 'Warm',
    score: 72,
    status: 'active',
    last_contact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Send case study',
    source: 'Webinar',
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'James Kim',
    email: 'jkim@retailmax.com',
    company: 'RetailMax Inc',
    title: 'Head of Digital',
    industry: 'Retail',
    size: '1001-5000',
    tier: 'Warm',
    score: 65,
    status: 'active',
    last_contact: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Schedule discovery call',
    source: 'Cold outreach',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Lisa Park',
    email: 'lisa.park@foodieapp.co',
    company: 'FoodieApp',
    title: 'Founder',
    industry: 'Restaurant',
    size: '1-50',
    tier: 'Cool',
    score: 48,
    status: 'nurturing',
    last_contact: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Add to newsletter',
    source: 'Website form',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'David Miller',
    email: 'dmiller@fitpro.co',
    company: 'FitPro Studios',
    title: 'Owner',
    industry: 'Fitness',
    size: '11-50',
    tier: 'Cold',
    score: 28,
    status: 'dormant',
    last_contact: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Quarterly check-in',
    source: 'Trade show',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Amanda Foster',
    email: 'afoster@luxuryhotels.com',
    company: 'Luxury Hotels Group',
    title: 'COO',
    industry: 'Hotel',
    size: '5000+',
    tier: 'Hot',
    score: 89,
    status: 'active',
    last_contact: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Send proposal',
    source: 'Conference',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Robert Chang',
    email: 'rchang@autoinnovate.io',
    company: 'AutoInnovate',
    title: 'CTO',
    industry: 'Automotive',
    size: '201-500',
    tier: 'Warm',
    score: 68,
    status: 'active',
    last_contact: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Technical deep dive',
    source: 'Partner',
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Jennifer Walsh',
    email: 'jwalsh@beautyspot.com',
    company: 'BeautySpot',
    title: 'Marketing Director',
    industry: 'Beauty',
    size: '51-200',
    tier: 'Cool',
    score: 42,
    status: 'nurturing',
    last_contact: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Share product demo video',
    source: 'Email campaign',
    created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: randomUUID(),
    name: 'Thomas Grant',
    email: 'tgrant@legaltech.com',
    company: 'LegalTech Solutions',
    title: 'Managing Partner',
    industry: 'Legal',
    size: '201-500',
    tier: 'Warm',
    score: 76,
    status: 'active',
    last_contact: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    next_action: 'Pilot program discussion',
    source: 'LinkedIn',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  }
];

// GET /prospects - List prospects
router.get('/', (req: Request, res: Response) => {
  const { limit = '10', tier, status, industry } = req.query;

  let filtered = [...prospects];

  // Filter by tier
  if (tier && typeof tier === 'string') {
    filtered = filtered.filter(p => p.tier.toLowerCase() === tier.toLowerCase());
  }

  // Filter by status
  if (status && typeof status === 'string') {
    filtered = filtered.filter(p => p.status.toLowerCase() === status.toLowerCase());
  }

  // Filter by industry
  if (industry && typeof industry === 'string') {
    filtered = filtered.filter(p => p.industry.toLowerCase() === industry.toLowerCase());
  }

  // Sort by score (highest first)
  filtered.sort((a, b) => b.score - a.score);

  // Apply limit
  const limitNum = Math.min(parseInt(limit as string) || 10, 100);
  const paginated = filtered.slice(0, limitNum);

  // Summary stats
  const stats = {
    total: prospects.length,
    hot: prospects.filter(p => p.tier === 'Hot').length,
    warm: prospects.filter(p => p.tier === 'Warm').length,
    cool: prospects.filter(p => p.tier === 'Cool').length,
    cold: prospects.filter(p => p.tier === 'Cold').length,
    avg_score: Math.round(prospects.reduce((sum, p) => sum + p.score, 0) / prospects.length)
  };

  res.json({
    success: true,
    data: {
      prospects: paginated,
      total: filtered.length,
      stats
    }
  });
});

export default router;
