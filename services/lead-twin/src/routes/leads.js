import { Router } from 'express';

const router = Router();

// In-memory lead storage
const leads = new Map();

// Seed data - 20 realistic leads
const seedLeads = [
  { name: 'Sarah Johnson', email: 'sarah@techcorp.com', company: 'TechCorp', industry: 'Technology', type: 'hot', score: 85 },
  { name: 'Michael Chen', email: 'michael@acme.com', company: 'Acme Corp', industry: 'Retail', type: 'warm', score: 65 },
  { name: 'Emily Rodriguez', email: 'emily.r@globaltech.io', company: 'GlobalTech', industry: 'Technology', type: 'hot', score: 92 },
  { name: 'James Wilson', email: 'jwilson@startup.co', company: 'StartupCo', industry: 'SaaS', type: 'warm', score: 72 },
  { name: 'Lisa Anderson', email: 'lisa@enterprise.net', company: 'Enterprise Solutions', industry: 'Enterprise', type: 'hot', score: 88 },
  { name: 'David Kim', email: 'dkim@nexus.com', company: 'Nexus Industries', industry: 'Healthcare', type: 'warm', score: 68 },
  { name: 'Amanda Foster', email: 'amanda.f@innovate.tech', company: 'InnovateTech', industry: 'Technology', type: 'cold', score: 45 },
  { name: 'Robert Martinez', email: 'rmartinez@corp.biz', company: 'CorpBiz', industry: 'Finance', type: 'warm', score: 62 },
  { name: 'Jennifer Lee', email: 'jlee@cloudops.io', company: 'CloudOps', industry: 'Technology', type: 'hot', score: 78 },
  { name: 'Christopher Brown', email: 'cbrown@datawise.com', company: 'DataWise', industry: 'Analytics', type: 'warm', score: 70 },
  { name: 'Michelle Taylor', email: 'mtaylor@growthco.com', company: 'GrowthCo', industry: 'Marketing', type: 'cold', score: 42 },
  { name: 'Daniel Garcia', email: 'dgarcia@retailmax.com', company: 'RetailMax', industry: 'Retail', type: 'warm', score: 58 },
  { name: 'Stephanie White', email: 'swhite@healthplus.com', company: 'HealthPlus', industry: 'Healthcare', type: 'hot', score: 82 },
  { name: 'Andrew Jackson', email: 'ajackson@finstream.com', company: 'FinStream', industry: 'Finance', type: 'warm', score: 74 },
  { name: 'Nicole Harris', email: 'nharris@cloudscale.io', company: 'CloudScale', industry: 'Technology', type: 'hot', score: 90 },
  { name: 'Kevin Thompson', email: 'kthompson@logistics.co', company: 'LogiTech', industry: 'Logistics', type: 'cold', score: 48 },
  { name: 'Rachel Clark', email: 'rclark@medtech.com', company: 'MedTech Solutions', industry: 'Healthcare', type: 'warm', score: 66 },
  { name: 'Brandon Lewis', email: 'blewis@scaleware.io', company: 'ScaleWare', industry: 'Technology', type: 'cold', score: 38 },
  { name: 'Samantha Walker', email: 'swalker@retailgen.com', company: 'RetailGen', industry: 'Retail', type: 'warm', score: 71 },
  { name: 'Tyler Hall', email: 'thall@digitalsales.co', company: 'DigitalSales', industry: 'Sales', type: 'hot', score: 86 },
];

// Seed leads on startup
seedLeads.forEach((l) => {
  const id = `lead_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  leads.set(id, { id, ...l, createdAt: new Date().toISOString() });
});

console.log(`Seeded ${leads.size} leads`);

// GET /leads - List all leads with filtering
router.get('/', (req, res) => {
  const { q, type, industry, limit } = req.query;
  let results = Array.from(leads.values());

  if (q) {
    results = results.filter(l =>
      l.name?.toLowerCase().includes(q.toLowerCase()) ||
      l.company?.toLowerCase().includes(q.toLowerCase()) ||
      l.email?.toLowerCase().includes(q.toLowerCase())
    );
  }
  if (type) {
    results = results.filter(l => l.type === type);
  }
  if (industry) {
    results = results.filter(l => l.industry === industry);
  }

  res.json({ success: true, leads: results.slice(0, limit || 100), total: results.length });
});

// GET /leads/:id - Get single lead
router.get('/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json({ success: true, lead });
});

// POST /leads - Create new lead
router.post('/', (req, res) => {
  const { name, email, company, phone, industry, type } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  const id = `lead_${Date.now()}`;
  const lead = {
    id,
    name,
    email,
    company,
    phone,
    industry,
    type: type || 'cold',
    score: 50,
    createdAt: new Date().toISOString()
  };
  leads.set(id, lead);
  res.status(201).json({ success: true, lead });
});

// PATCH /leads/:id - Update lead
router.patch('/:id', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const updated = { ...lead, ...req.body, updatedAt: new Date().toISOString() };
  leads.set(req.params.id, updated);
  res.json({ success: true, lead: updated });
});

// DELETE /leads/:id - Delete lead
router.delete('/:id', (req, res) => {
  if (!leads.has(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
  leads.delete(req.params.id);
  res.json({ success: true });
});

export default router;
