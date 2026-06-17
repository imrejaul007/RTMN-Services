import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';

const router = Router();

// Mock knowledge graph data
interface KGNode {
  id: string;
  type: string;
  name: string;
  properties: Record<string, any>;
}

interface KGRelationship {
  from: string;
  to: string;
  type: string;
  properties: Record<string, any>;
}

// Nodes
const nodes: KGNode[] = [
  // Companies
  { id: 'company-1', type: 'company', name: 'TechCorp Inc', properties: { industry: 'Technology', employees: 5000, founded: 2010, revenue: '$500M' } },
  { id: 'company-2', type: 'company', name: 'HealthFirst Medical', properties: { industry: 'Healthcare', employees: 1200, founded: 2005, revenue: '$200M' } },
  { id: 'company-3', type: 'company', name: 'Global Retail Chain', properties: { industry: 'Retail', employees: 15000, founded: 1990, revenue: '$5B' } },
  { id: 'company-4', type: 'company', name: 'FoodService Pro', properties: { industry: 'Restaurant', employees: 800, founded: 2015, revenue: '$80M' } },
  { id: 'company-5', type: 'company', name: 'AutoTech Solutions', properties: { industry: 'Automotive', employees: 2000, founded: 2008, revenue: '$350M' } },

  // People
  { id: 'person-1', type: 'person', name: 'Sarah Johnson', properties: { title: 'CEO', company: 'TechCorp Inc', linkedin: 'linkedin.com/in/sarahj' } },
  { id: 'person-2', type: 'person', name: 'Michael Chen', properties: { title: 'VP Sales', company: 'TechCorp Inc', linkedin: 'linkedin.com/in/michaelchen' } },
  { id: 'person-3', type: 'person', name: 'Emily Rodriguez', properties: { title: 'CTO', company: 'HealthFirst Medical', linkedin: 'linkedin.com/in/emilyr' } },
  { id: 'person-4', type: 'person', name: 'David Kim', properties: { title: 'Director IT', company: 'Global Retail Chain', linkedin: 'linkedin.com/in/davidkim' } },
  { id: 'person-5', type: 'person', name: 'Lisa Park', properties: { title: 'Head of Marketing', company: 'FoodService Pro', linkedin: 'linkedin.com/in/lisapark' } },

  // Products
  { id: 'product-1', type: 'product', name: 'CloudPlatform', properties: { company: 'TechCorp Inc', category: 'SaaS', price: '$999/mo', users: '10K+' } },
  { id: 'product-2', type: 'product', name: 'HealthAnalytics', properties: { company: 'HealthFirst Medical', category: 'Healthcare IT', price: '$2,500/mo', users: '500+' } },
  { id: 'product-3', type: 'product', name: 'RetailPOS', properties: { company: 'Global Retail Chain', category: 'POS', price: '$149/mo', users: '50K+' } },
  { id: 'product-4', type: 'product', name: 'RestaurantOS', properties: { company: 'FoodService Pro', category: 'Restaurant Tech', price: '$199/mo', users: '5K+' } },

  // Locations
  { id: 'location-1', type: 'location', name: 'San Francisco, CA', properties: { type: 'city', region: 'West Coast', country: 'USA' } },
  { id: 'location-2', type: 'location', name: 'New York, NY', properties: { type: 'city', region: 'East Coast', country: 'USA' } },
  { id: 'location-3', type: 'location', name: 'Austin, TX', properties: { type: 'city', region: 'South', country: 'USA' } },

  // Events
  { id: 'event-1', type: 'event', name: 'TechSummit 2026', properties: { date: '2026-03-15', location: 'San Francisco, CA', attendees: 5000 } },
  { id: 'event-2', type: 'event', name: 'Healthcare Innovation Forum', properties: { date: '2026-04-20', location: 'New York, NY', attendees: 2000 } }
];

// Relationships
const relationships: KGRelationship[] = [
  { from: 'person-1', to: 'company-1', type: 'CEO_OF', properties: { since: 2015 } },
  { from: 'person-2', to: 'company-1', type: 'WORKS_AT', properties: { since: 2018, department: 'Sales' } },
  { from: 'person-3', to: 'company-2', type: 'CTO_OF', properties: { since: 2019 } },
  { from: 'person-4', to: 'company-3', type: 'WORKS_AT', properties: { since: 2020, department: 'IT' } },
  { from: 'person-5', to: 'company-4', type: 'WORKS_AT', properties: { since: 2021, department: 'Marketing' } },
  { from: 'person-1', to: 'person-2', type: 'REPORTS_TO', properties: {} },
  { from: 'person-2', to: 'person-5', type: 'COLLEAGUE_OF', properties: { context: 'Sales-Marketing' } },
  { from: 'company-1', to: 'product-1', type: 'PRODUCES', properties: { since: 2018 } },
  { from: 'company-2', to: 'product-2', type: 'PRODUCES', properties: { since: 2017 } },
  { from: 'company-3', to: 'product-3', type: 'PRODUCES', properties: { since: 2016 } },
  { from: 'company-4', to: 'product-4', type: 'PRODUCES', properties: { since: 2019 } },
  { from: 'company-1', to: 'company-2', type: 'PARTNER_OF', properties: { type: 'technology' } },
  { from: 'company-1', to: 'company-3', type: 'CUSTOMER_OF', properties: { product: 'CloudPlatform', value: '$100K' } },
  { from: 'company-4', to: 'company-3', type: 'CUSTOMER_OF', properties: { product: 'RetailPOS', value: '$50K' } },
  { from: 'company-1', to: 'location-1', type: 'LOCATED_IN', properties: {} },
  { from: 'company-2', to: 'location-2', type: 'LOCATED_IN', properties: {} },
  { from: 'company-3', to: 'location-3', type: 'LOCATED_IN', properties: {} },
  { from: 'event-1', to: 'company-1', type: 'SPONSORED_BY', properties: {} },
  { from: 'event-1', to: 'location-1', type: 'HELD_AT', properties: {} },
  { from: 'person-1', to: 'event-1', type: 'ATTENDED', properties: { role: 'speaker' } },
  { from: 'person-2', to: 'event-1', type: 'ATTENDED', properties: { role: 'attendee' } },
  { from: 'product-1', to: 'product-2', type: 'INTEGRATES_WITH', properties: { type: 'API' } },
  { from: 'product-1', to: 'product-3', type: 'INTEGRATES_WITH', properties: { type: 'native' } }
];

// GET /query - Query knowledge graph
router.get('/', (req: Request, res: Response) => {
  const { entity, relationship } = req.query;

  if (!entity && !relationship) {
    res.status(400).json({
      success: false,
      error: 'Either entity or relationship parameter is required'
    });
    return;
  }

  let results: any[] = [];

  if (entity && typeof entity === 'string') {
    // Find all relationships for this entity
    const entityLower = entity.toLowerCase();

    // Find matching nodes
    const matchingNodes = nodes.filter(n =>
      n.name.toLowerCase().includes(entityLower) ||
      n.id.toLowerCase().includes(entityLower) ||
      n.type.toLowerCase().includes(entityLower)
    );

    if (matchingNodes.length > 0) {
      // For each matching node, find relationships
      for (const node of matchingNodes) {
        const outgoing = relationships.filter(r => r.from === node.id);
        const incoming = relationships.filter(r => r.to === node.id);

        results.push({
          node,
          outgoing: outgoing.map(r => ({
            ...r,
            target: nodes.find(n => n.id === r.to)
          })),
          incoming: incoming.map(r => ({
            ...r,
            source: nodes.find(n => n.id === r.from)
          }))
        });
      }
    }
  }

  if (relationship && typeof relationship === 'string') {
    // Find all relationships of this type
    const relLower = relationship.toLowerCase();
    const matchingRels = relationships.filter(r =>
      r.type.toLowerCase().includes(relLower) ||
      r.type.toLowerCase() === relLower
    );

    results = matchingRels.map(r => ({
      relationship: r,
      source: nodes.find(n => n.id === r.from),
      target: nodes.find(n => n.id === r.to)
    }));
  }

  res.json({
    success: true,
    data: {
      results,
      total: results.length,
      query: { entity, relationship }
    }
  });
});

export default router;
