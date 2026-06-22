/**
 * HOJAI Real Estate Property Service
 * Property listings, leads, site visits
 * Reuses: RisnaEstate pattern
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface Property {
  id: string;
  title: string;
  type: 'apartment' | 'villa' | 'plot' | 'commercial' | 'land';
  status: 'available' | 'sold' | 'reserved';
  price: number;
  pricePerSqft?: number;
  location: { city: string; locality: string; address?: string };
  bedrooms?: number;
  bathrooms?: number;
  area: { value: number; unit: 'sqft' | 'sqyd' | 'sqm' };
  features: string[];
  images: string[];
  ownerId: string;
  agentId?: string;
  listedAt: string;
  updatedAt: string;
}

interface Lead {
  id: string;
  propertyId: string;
  name: string;
  phone: string;
  email?: string;
  budget: { min: number; max: number };
  requirements: string[];
  source: 'website' | 'whatsapp' | 'referral' | 'agent';
  status: 'new' | 'contacted' | 'qualified' | 'visit_scheduled' | 'visited' | 'negotiating' | 'closed' | 'lost';
  score: number; // 0-100
  notes: string[];
  assignedAgent?: string;
  nextFollowUp?: string;
  createdAt: string;
}

interface SiteVisit {
  id: string;
  leadId: string;
  propertyId: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback?: string;
  priceDiscussed?: number;
  notes?: string;
}

const properties = new Map<string, Property>();
const leads = new Map<string, Lead>();
const siteVisits = new Map<string, SiteVisit>();

// Property CRUD
router.post('/properties', async (req, res) => {
  try {
    const property: Property = {
      ...req.body,
      id: uuidv4(),
      listedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    properties.set(property.id, property);
    res.status(201).json({ success: true, property });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create property' });
  }
});

router.get('/properties', async (req, res) => {
  try {
    const { type, city, minPrice, maxPrice, status } = req.query;
    let result = Array.from(properties.values());

    if (type) result = result.filter(p => p.type === type);
    if (city) result = result.filter(p => p.location.city.toLowerCase() === (city as string).toLowerCase());
    if (minPrice) result = result.filter(p => p.price >= parseInt(minPrice as string));
    if (maxPrice) result = result.filter(p => p.price <= parseInt(maxPrice as string));
    if (status) result = result.filter(p => p.status === status);

    res.json({ properties: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

router.get('/properties/:id', async (req, res) => {
  try {
    const property = properties.get(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });

    // Get related leads
    const relatedLeads = Array.from(leads.values()).filter(l => l.propertyId === req.params.id);
    res.json({ property, leads: relatedLeads });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Lead management
router.post('/leads', async (req, res) => {
  try {
    const lead: Lead = {
      ...req.body,
      id: uuidv4(),
      score: calculateLeadScore(req.body),
      notes: [],
      createdAt: new Date().toISOString(),
    };
    leads.set(lead.id, lead);
    res.status(201).json({ success: true, lead });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

router.get('/leads', async (req, res) => {
  try {
    const { status, agentId, minScore } = req.query;
    let result = Array.from(leads.values());

    if (status) result = result.filter(l => l.status === status);
    if (agentId) result = result.filter(l => l.assignedAgent === agentId);
    if (minScore) result = result.filter(l => l.score >= parseInt(minScore as string));

    result.sort((a, b) => b.score - a.score);
    res.json({ leads: result, count: result.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.patch('/leads/:id', async (req, res) => {
  try {
    const lead = leads.get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const updated = { ...lead, ...req.body, id: lead.id };
    if (req.body.budget || req.body.requirements) {
      updated.score = calculateLeadScore(updated);
    }
    leads.set(lead.id, updated);
    res.json({ success: true, lead: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead' });
  }
});

// Site visits
router.post('/visits', async (req, res) => {
  try {
    const visit: SiteVisit = { ...req.body, id: uuidv4() };
    siteVisits.set(visit.id, visit);
    res.status(201).json({ success: true, visit });
  } catch (error) {
    res.status(500).json({ error: 'Failed to schedule visit' });
  }
});

router.get('/visits', async (req, res) => {
  try {
    const { date, leadId, propertyId } = req.query;
    let result = Array.from(siteVisits.values());

    if (date) result = result.filter(v => v.date === date);
    if (leadId) result = result.filter(v => v.leadId === leadId);
    if (propertyId) result = result.filter(v => v.propertyId === propertyId);

    res.json({ visits: result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch visits' });
  }
});

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const totalProperties = properties.size;
    const availableProperties = Array.from(properties.values()).filter(p => p.status === 'available').length;
    const totalLeads = leads.size;
    const hotLeads = Array.from(leads.values()).filter(l => l.score >= 70).length;
    const closedDeals = Array.from(leads.values()).filter(l => l.status === 'closed').length;
    const scheduledVisits = Array.from(siteVisits.values()).filter(v => v.status === 'scheduled').length;

    res.json({
      properties: { total: totalProperties, available: availableProperties },
      leads: { total: totalLeads, hot: hotLeads },
      deals: { closed: closedDeals, rate: totalLeads > 0 ? Math.round(closedDeals / totalLeads * 100) : 0 },
      visits: { scheduled: scheduledVisits },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

function calculateLeadScore(lead: Partial<Lead>): number {
  let score = 30; // Base score

  if (lead.budget?.min && lead.budget?.max) {
    score += (lead.budget.max >= 10000000) ? 30 : (lead.budget.max >= 5000000) ? 20 : 10;
  }

  if (lead.requirements?.length > 0) score += 15;

  if (lead.source === 'referral') score += 15;
  if (lead.source === 'website') score += 10;

  return Math.min(100, score);
}

export { router, properties, leads, siteVisits };
