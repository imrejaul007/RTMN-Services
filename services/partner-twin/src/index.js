const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const app = express();
const PORT = 4892;
app.use(helmet());
app.use(cors());
app.use(express.json());

const partners = new Map();
const relationships = new Map();

// Initialize sample partners
const samplePartners = [
  { id: 'part-1', name: 'TechSupply Co', type: 'vendor', category: 'technology', status: 'active', contact: { email: 'sales@techsupply.com', phone: '+1-555-0100' }, rating: 4.5, totalRevenue: 500000, relationshipSince: '2022-01-15' },
  { id: 'part-2', name: 'Global Logistics', type: 'vendor', category: 'logistics', status: 'active', contact: { email: 'ops@globallog.com' }, rating: 4.2, totalRevenue: 250000, relationshipSince: '2023-03-01' },
  { id: 'part-3', name: 'Enterprise Corp', type: 'customer', category: 'enterprise', status: 'active', contact: { email: 'buyer@enterprise.com' }, rating: 4.8, totalRevenue: 1000000, relationshipSince: '2021-06-01' }
];
samplePartners.forEach(p => partners.set(p.id, p));

// Get all partners
app.get('/api/partners', (req, res) => {
  const { type, category, status, search } = req.query;
  let result = Array.from(partners.values());
  if (type) result = result.filter(p => p.type === type);
  if (category) result = result.filter(p => p.category === category);
  if (status) result = result.filter(p => p.status === status);
  if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  res.json({ partners: result, total: result.length });
});

// Get partner
app.get('/api/partners/:id', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json(partner);
});

// Create partner
app.post('/api/partners', (req, res) => {
  const { name, type, category, contact } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const partner = { id: `part-${uuidv4().slice(0, 8)}`, name, type: type || 'vendor', category: category || 'general', status: 'active', contact: contact || {}, rating: 0, totalRevenue: 0, relationshipSince: new Date().toISOString().split('T')[0], createdAt: new Date().toISOString() };
  partners.set(partner.id, partner);
  res.status(201).json(partner);
});

// Update partner
app.put('/api/partners/:id', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  Object.assign(partner, req.body);
  res.json(partner);
});

// Get partner analytics
app.get('/api/partners/:id/analytics', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json({ partnerId: partner.id, partnerName: partner.name, totalRevenue: partner.totalRevenue, rating: partner.rating, relationshipSince: partner.relationshipSince });
});

app.get('/api/statistics', (req, res) => {
  const all = Array.from(partners.values());
  res.json({ totalPartners: all.length, vendors: all.filter(p => p.type === 'vendor').length, customers: all.filter(p => p.type === 'customer').length, activePartners: all.filter(p => p.status === 'active').length });
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'partner-twin', port: PORT, partners: partners.size }));
app.listen(PORT, () => console.log('Partner Twin running on port ' + PORT));
