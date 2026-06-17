import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Same nodes and relationships as query.ts
const nodes = [
  { id: 'company-1', type: 'company', name: 'TechCorp Inc', properties: { industry: 'Technology', employees: 5000, founded: 2010, revenue: '$500M' } },
  { id: 'company-2', type: 'company', name: 'HealthFirst Medical', properties: { industry: 'Healthcare', employees: 1200, founded: 2005, revenue: '$200M' } },
  { id: 'company-3', type: 'company', name: 'Global Retail Chain', properties: { industry: 'Retail', employees: 15000, founded: 1990, revenue: '$5B' } },
  { id: 'company-4', type: 'company', name: 'FoodService Pro', properties: { industry: 'Restaurant', employees: 800, founded: 2015, revenue: '$80M' } },
  { id: 'company-5', type: 'company', name: 'AutoTech Solutions', properties: { industry: 'Automotive', employees: 2000, founded: 2008, revenue: '$350M' } },
  { id: 'person-1', type: 'person', name: 'Sarah Johnson', properties: { title: 'CEO', company: 'TechCorp Inc', linkedin: 'linkedin.com/in/sarahj' } },
  { id: 'person-2', type: 'person', name: 'Michael Chen', properties: { title: 'VP Sales', company: 'TechCorp Inc', linkedin: 'linkedin.com/in/michaelchen' } },
  { id: 'person-3', type: 'person', name: 'Emily Rodriguez', properties: { title: 'CTO', company: 'HealthFirst Medical', linkedin: 'linkedin.com/in/emilyr' } },
  { id: 'person-4', type: 'person', name: 'David Kim', properties: { title: 'Director IT', company: 'Global Retail Chain', linkedin: 'linkedin.com/in/davidkim' } },
  { id: 'person-5', type: 'person', name: 'Lisa Park', properties: { title: 'Head of Marketing', company: 'FoodService Pro', linkedin: 'linkedin.com/in/lisapark' } },
  { id: 'product-1', type: 'product', name: 'CloudPlatform', properties: { company: 'TechCorp Inc', category: 'SaaS', price: '$999/mo', users: '10K+' } },
  { id: 'product-2', type: 'product', name: 'HealthAnalytics', properties: { company: 'HealthFirst Medical', category: 'Healthcare IT', price: '$2,500/mo', users: '500+' } },
  { id: 'product-3', type: 'product', name: 'RetailPOS', properties: { company: 'Global Retail Chain', category: 'POS', price: '$149/mo', users: '50K+' } },
  { id: 'product-4', type: 'product', name: 'RestaurantOS', properties: { company: 'FoodService Pro', category: 'Restaurant Tech', price: '$199/mo', users: '5K+' } },
  { id: 'location-1', type: 'location', name: 'San Francisco, CA', properties: { type: 'city', region: 'West Coast', country: 'USA' } },
  { id: 'location-2', type: 'location', name: 'New York, NY', properties: { type: 'city', region: 'East Coast', country: 'USA' } },
  { id: 'location-3', type: 'location', name: 'Austin, TX', properties: { type: 'city', region: 'South', country: 'USA' } },
  { id: 'event-1', type: 'event', name: 'TechSummit 2026', properties: { date: '2026-03-15', location: 'San Francisco, CA', attendees: 5000 } },
  { id: 'event-2', type: 'event', name: 'Healthcare Innovation Forum', properties: { date: '2026-04-20', location: 'New York, NY', attendees: 2000 } }
];

// GET /search - Search entities
router.get('/', (req: Request, res: Response) => {
  const { q, type, limit = '20' } = req.query;

  if (!q || typeof q !== 'string') {
    res.status(400).json({
      success: false,
      error: 'Query parameter q is required'
    });
    return;
  }

  let results = [...nodes];

  // Filter by type if provided
  if (type && typeof type === 'string') {
    results = results.filter(n => n.type.toLowerCase() === type.toLowerCase());
  }

  // Search by name, id, or properties
  const query = q.toLowerCase();
  results = results.filter(n => {
    // Match name
    if (n.name.toLowerCase().includes(query)) return true;
    // Match id
    if (n.id.toLowerCase().includes(query)) return true;
    // Match properties
    for (const [key, value] of Object.entries(n.properties)) {
      if (String(value).toLowerCase().includes(query)) return true;
    }
    return false;
  });

  // Sort by relevance (exact match first)
  results.sort((a, b) => {
    const aExact = a.name.toLowerCase() === query;
    const bExact = b.name.toLowerCase() === query;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.name.localeCompare(b.name);
  });

  // Apply limit
  const limitNum = Math.min(parseInt(limit as string) || 20, 100);
  results = results.slice(0, limitNum);

  // Group by type
  const byType = nodes
    .filter(n => n.type)
    .reduce((acc, n) => {
      if (!acc[n.type]) acc[n.type] = [];
      return acc;
    }, {} as Record<string, any[]>);

  results.forEach(n => {
    if (!byType[n.type]) byType[n.type] = [];
    byType[n.type].push(n);
  });

  res.json({
    success: true,
    data: {
      results,
      total: results.length,
      query: q,
      type: type || null,
      types: Object.keys(byType)
    }
  });
});

export default router;
