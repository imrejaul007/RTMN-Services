/**
 * Real Estate OS - AI Company Platform
 *
 * Complete Real Estate Management System
 * Port: 5230
 * Industry: Real Estate (Property Sales, Rentals, Agents, Deals)
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 5230;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

const INDUSTRY = 'realestate';

// In-memory database
const properties = new Map();
const leads = new Map();
const clients = new Map();
const agents = new Map();
const siteVisits = new Map();
const appointments = new Map();
const deals = new Map();
const commissions = new Map();
const documents = new Map();
const campaigns = new Map();
const invoices = new Map();
const payments = new Map();

// Auth
const authUsers = new Map();
const authSessions = new Map();

// Sample data - Properties (5 properties)
const sampleProperties = [
  {
    id: 'PRP001',
    title: 'Sunrise Valley Villa',
    type: 'villa',
    listingType: 'sale',
    price: 8500000,
    pricePerSqft: 8500,
    area: 1000,
    areaUnit: 'sqft',
    bedrooms: 4,
    bathrooms: 3,
    parking: 2,
    address: {
      street: '123 Sunrise Road',
      locality: 'Whitefield',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560066'
    },
    amenities: ['Swimming Pool', 'Garden', 'Gym', 'Club House', '24/7 Security'],
    images: ['villa1.jpg', 'villa2.jpg'],
    status: 'available',
    ownerName: 'Rajesh Kumar',
    ownerPhone: '+91 98765 43210',
    description: 'Beautiful 4BHK villa in premium locality with modern amenities.',
    reraId: 'PRM/KA/RERA/1234/2023',
    verified: true,
    createdAt: '2024-01-15'
  },
  {
    id: 'PRP002',
    title: 'Downtown Studio Apartment',
    type: 'apartment',
    listingType: 'rent',
    price: 35000,
    pricePerSqft: 45,
    area: 550,
    areaUnit: 'sqft',
    bedrooms: 1,
    bathrooms: 1,
    parking: 1,
    address: {
      street: '45 MG Road',
      locality: 'MG Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    },
    amenities: ['Lift', 'Power Backup', 'Security', 'Near Metro'],
    images: ['apt1.jpg', 'apt2.jpg'],
    status: 'available',
    ownerName: 'Priya Sharma',
    ownerPhone: '+91 98765 43211',
    description: 'Compact 1BHK apartment in heart of city, walking distance to metro.',
    reraId: 'PRM/KA/RERA/5678/2023',
    verified: true,
    createdAt: '2024-02-01'
  },
  {
    id: 'PRP003',
    title: 'Lakeside Penthouse',
    type: 'penthouse',
    listingType: 'sale',
    price: 25000000,
    pricePerSqft: 15625,
    area: 1600,
    areaUnit: 'sqft',
    bedrooms: 5,
    bathrooms: 5,
    parking: 3,
    address: {
      street: '78 Ulsoor Lake Road',
      locality: 'Ulsoor',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560008'
    },
    amenities: ['Lake View', 'Private Terrace', 'Home Theater', 'Smart Home', 'Staff Quarters'],
    images: ['pent1.jpg', 'pent2.jpg'],
    status: 'available',
    ownerName: 'Anand Mehta',
    ownerPhone: '+91 98765 43212',
    description: 'Luxury penthouse with panoramic lake views and premium finishes.',
    reraId: 'PRM/KA/RERA/9012/2022',
    verified: true,
    createdAt: '2024-01-20'
  },
  {
    id: 'PRP004',
    title: 'Tech Park Residency',
    type: 'apartment',
    listingType: 'rent',
    price: 55000,
    pricePerSqft: 55,
    area: 1000,
    areaUnit: 'sqft',
    bedrooms: 2,
    bathrooms: 2,
    parking: 1,
    address: {
      street: '120 Outer Ring Road',
      locality: 'Marathahalli',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560037'
    },
    amenities: ['Near IT Park', 'Swimming Pool', 'Gym', 'Children Play Area', 'Club House'],
    images: ['tech1.jpg', 'tech2.jpg'],
    status: 'available',
    ownerName: 'Vikram Singh',
    ownerPhone: '+91 98765 43213',
    description: 'Perfect 2BHK for IT professionals, 5 min to major tech parks.',
    reraId: 'PRM/KA/RERA/3456/2023',
    verified: true,
    createdAt: '2024-03-01'
  },
  {
    id: 'PRP005',
    title: 'Heritage Row House',
    type: 'rowhouse',
    listingType: 'sale',
    price: 12000000,
    pricePerSqft: 10000,
    area: 1200,
    areaUnit: 'sqft',
    bedrooms: 3,
    bathrooms: 3,
    parking: 2,
    address: {
      street: '15 Brigade Road',
      locality: 'Brigade Road',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001'
    },
    amenities: ['Terrace', 'Garden', 'Independent', 'Premium Location'],
    images: ['row1.jpg', 'row2.jpg'],
    status: 'available',
    ownerName: 'Meera Nair',
    ownerPhone: '+91 98765 43214',
    description: 'Classic row house in prime Brigade Road location with terrace.',
    reraId: 'PRM/KA/RERA/7890/2022',
    verified: true,
    createdAt: '2024-02-15'
  }
];
sampleProperties.forEach(p => properties.set(p.id, p));

// Sample data - Leads (4 leads)
const sampleLeads = [
  {
    id: 'LEAD001',
    name: 'Amit Patel',
    email: 'amit.patel@email.com',
    phone: '+91 98765 44100',
    source: 'website',
    budget: { min: 5000000, max: 10000000 },
    propertyType: 'apartment',
    location: 'Whitefield',
    status: 'hot',
    agentId: 'AGT001',
    notes: 'Looking for 3BHK near tech park, ready to close within 30 days',
    lastContact: '2024-06-10',
    nextFollowUp: '2024-06-15',
    createdAt: '2024-06-01'
  },
  {
    id: 'LEAD002',
    name: 'Sneha Gupta',
    email: 'sneha.g@email.com',
    phone: '+91 98765 44101',
    source: 'referral',
    budget: { min: 30000, max: 50000 },
    propertyType: 'apartment',
    location: 'Marathahalli',
    status: 'warm',
    agentId: 'AGT002',
    notes: 'Working professional, needs 2BHK on rent near IT park',
    lastContact: '2024-06-08',
    nextFollowUp: '2024-06-12',
    createdAt: '2024-06-05'
  },
  {
    id: 'LEAD003',
    name: 'Ravi Krishnan',
    email: 'ravi.k@email.com',
    phone: '+91 98765 44102',
    source: 'magicbricks',
    budget: { min: 15000000, max: 25000000 },
    propertyType: 'penthouse',
    location: 'Ulsoor',
    status: 'cold',
    agentId: 'AGT001',
    notes: 'Interested in luxury properties, schedule site visit',
    lastContact: '2024-06-01',
    nextFollowUp: '2024-06-20',
    createdAt: '2024-05-20'
  },
  {
    id: 'LEAD004',
    name: 'Kavitha Reddy',
    email: 'kavitha.r@email.com',
    phone: '+91 98765 44103',
    source: 'justdial',
    budget: { min: 8000000, max: 12000000 },
    propertyType: 'villa',
    location: 'Whitefield',
    status: 'hot',
    agentId: 'AGT003',
    notes: 'Family of 5, needs 4BHK villa with garden',
    lastContact: '2024-06-11',
    nextFollowUp: '2024-06-14',
    createdAt: '2024-06-08'
  }
];
sampleLeads.forEach(l => leads.set(l.id, l));

// Sample data - Agents (3 agents)
const sampleAgents = [
  {
    id: 'AGT001',
    name: 'Deepak Sharma',
    email: 'deepak.sharma@realestate.in',
    phone: '+91 98765 44200',
    specialization: ['Residential', 'Luxury'],
    experience: 8,
    licenseNo: 'RE/KA/2020/1234',
    rating: 4.8,
    totalDeals: 45,
    totalValue: 85000000,
    commission: 2500000,
    avatar: '🏠',
    status: 'active',
    joinDate: '2020-03-15'
  },
  {
    id: 'AGT002',
    name: 'Nisha Verma',
    email: 'nisha.verma@realestate.in',
    phone: '+91 98765 44201',
    specialization: ['Rental', 'Commercial'],
    experience: 5,
    licenseNo: 'RE/KA/2019/5678',
    rating: 4.6,
    totalDeals: 62,
    totalValue: 35000000,
    commission: 1800000,
    avatar: '🏢',
    status: 'active',
    joinDate: '2019-06-01'
  },
  {
    id: 'AGT003',
    name: 'Arjun Nair',
    email: 'arjun.nair@realestate.in',
    phone: '+91 98765 44202',
    specialization: ['Residential', 'Investment'],
    experience: 6,
    licenseNo: 'RE/KA/2018/9012',
    rating: 4.9,
    totalDeals: 38,
    totalValue: 120000000,
    commission: 3200000,
    avatar: '💼',
    status: 'active',
    joinDate: '2018-09-20'
  }
];
sampleAgents.forEach(a => agents.set(a.id, a));

// Sample data - Clients (4 clients)
const sampleClients = [
  { id: 'CLI001', name: 'Rahul Mehta', email: 'rahul.m@email.com', phone: '+91 98765 44300', type: 'buyer', agentId: 'AGT001', status: 'active', budget: 10000000, preferredLocations: ['Whitefield', 'Marathahalli'], createdAt: '2024-05-01' },
  { id: 'CLI002', name: 'Priya Joshi', email: 'priya.j@email.com', phone: '+91 98765 44301', type: 'tenant', agentId: 'AGT002', status: 'active', budget: 50000, preferredLocations: ['MG Road', 'Indiranagar'], createdAt: '2024-05-15' },
  { id: 'CLI003', name: 'Vikram Bhat', email: 'vikram.b@email.com', phone: '+91 98765 44302', type: 'seller', agentId: 'AGT001', status: 'active', propertyId: 'PRP003', askingPrice: 25000000, createdAt: '2024-04-20' },
  { id: 'CLI004', name: 'Anita Desai', email: 'anita.d@email.com', phone: '+91 98765 44303', type: 'investor', agentId: 'AGT003', status: 'active', budget: 50000000, preferredLocations: ['Brigade Road', 'MG Road'], createdAt: '2024-06-01' }
];
sampleClients.forEach(c => clients.set(c.id, c));

// Sample data - Deals (4 deals)
const sampleDeals = [
  {
    id: 'DEAL001',
    title: 'Sunrise Villa Sale',
    type: 'sale',
    propertyId: 'PRP001',
    clientId: 'CLI001',
    agentId: 'AGT001',
    value: 8500000,
    stage: 'negotiation',
    probability: 75,
    expectedClose: '2024-06-30',
    notes: 'Client agreed to 82L, negotiating final price',
    activities: [
      { date: '2024-06-01', action: 'Site visit completed', agent: 'AGT001' },
      { date: '2024-06-05', action: 'Price discussion with owner', agent: 'AGT001' },
      { date: '2024-06-10', action: 'Client LOI submitted', agent: 'AGT001' }
    ],
    createdAt: '2024-06-01'
  },
  {
    id: 'DEAL002',
    title: 'Tech Park Rental',
    type: 'rent',
    propertyId: 'PRP004',
    clientId: 'CLI002',
    agentId: 'AGT002',
    value: 55000,
    stage: 'documentation',
    probability: 90,
    expectedClose: '2024-06-20',
    notes: 'Tenant approved, preparing rental agreement',
    activities: [
      { date: '2024-06-03', action: 'Site visit', agent: 'AGT002' },
      { date: '2024-06-07', action: 'Negotiation complete', agent: 'AGT002' },
      { date: '2024-06-10', action: 'Documents verification', agent: 'AGT002' }
    ],
    createdAt: '2024-06-03'
  },
  {
    id: 'DEAL003',
    title: 'Penthouse Investment',
    type: 'sale',
    propertyId: 'PRP003',
    clientId: 'CLI004',
    agentId: 'AGT003',
    value: 25000000,
    stage: 'site_visit',
    probability: 50,
    expectedClose: '2024-07-15',
    notes: 'Investor evaluating for portfolio expansion',
    activities: [
      { date: '2024-06-08', action: 'Initial inquiry', agent: 'AGT003' },
      { date: '2024-06-12', action: 'Site visit scheduled', agent: 'AGT003' }
    ],
    createdAt: '2024-06-08'
  },
  {
    id: 'DEAL004',
    title: 'Downtown Studio Rent',
    type: 'rent',
    propertyId: 'PRP002',
    clientId: 'CLI002',
    agentId: 'AGT002',
    value: 35000,
    stage: 'closed_won',
    probability: 100,
    closedAt: '2024-06-05',
    notes: 'Completed - Tenant moved in',
    activities: [
      { date: '2024-05-20', action: 'Lead generated', agent: 'AGT002' },
      { date: '2024-05-25', action: 'Site visit', agent: 'AGT002' },
      { date: '2024-06-01', action: 'Agreement signed', agent: 'AGT002' },
      { date: '2024-06-05', action: 'Keys handed over', agent: 'AGT002' }
    ],
    createdAt: '2024-05-20'
  }
];
sampleDeals.forEach(d => deals.set(d.id, d));

// Sample data - Site Visits
const sampleVisits = [
  { id: 'VIS001', propertyId: 'PRP001', clientId: 'CLI001', agentId: 'AGT001', date: '2024-06-01', time: '10:00 AM', status: 'completed', feedback: 'Client liked the property', createdAt: '2024-05-28' },
  { id: 'VIS002', propertyId: 'PRP004', clientId: 'CLI002', agentId: 'AGT002', date: '2024-06-03', time: '3:00 PM', status: 'completed', feedback: 'Perfect for requirements', createdAt: '2024-06-01' },
  { id: 'VIS003', propertyId: 'PRP003', clientId: 'CLI004', agentId: 'AGT003', date: '2024-06-15', time: '11:00 AM', status: 'scheduled', feedback: null, createdAt: '2024-06-10' }
];
sampleVisits.forEach(v => siteVisits.set(v.id, v));

// Sample data - Appointments
const sampleAppointments = [
  { id: 'APT001', agentId: 'AGT001', leadId: 'LEAD001', type: 'follow_up', date: '2024-06-15', time: '4:00 PM', location: 'Office', status: 'scheduled', notes: 'Discuss final terms', createdAt: '2024-06-10' },
  { id: 'APT002', agentId: 'AGT002', leadId: 'LEAD002', type: 'site_visit', date: '2024-06-12', time: '2:00 PM', location: 'PRP004', status: 'scheduled', notes: 'Second property viewing', createdAt: '2024-06-08' }
];
sampleAppointments.forEach(a => appointments.set(a.id, a));

// Sample data - Commissions
const sampleCommissions = [
  { id: 'COM001', agentId: 'AGT002', dealId: 'DEAL004', amount: 52500, type: 'rental', rate: 1.5, status: 'paid', paidAt: '2024-06-10', createdAt: '2024-06-05' },
  { id: 'COM002', agentId: 'AGT001', dealId: null, amount: 127500, type: 'pending', rate: 1.5, status: 'pending', expectedAt: '2024-06-30', createdAt: '2024-06-01' }
];
sampleCommissions.forEach(c => commissions.set(c.id, c));

// Auth functions
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { email, password, role, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email, password required' });
  if (authUsers.has(email)) return res.status(409).json({ error: 'User exists' });
  const user = { id: 'user_' + Date.now(), email, passwordHash: hashPassword(password), role: role || 'agent', name: name || email.split('@')[0], industry: INDUSTRY, createdAt: new Date().toISOString() };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, industry: INDUSTRY, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) return res.status(401).json({ error: 'Invalid token' });
  req.session = session;
  next();
}

// Properties
app.get('/api/properties', requireAuth, (req, res) => {
  const { status, listingType, type, city, minPrice, maxPrice } = req.query;
  let result = Array.from(properties.values());
  if (status) result = result.filter(p => p.status === status);
  if (listingType) result = result.filter(p => p.listingType === listingType);
  if (type) result = result.filter(p => p.type === type);
  if (city) result = result.filter(p => p.address.city.toLowerCase().includes(city.toLowerCase()));
  if (minPrice) result = result.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseInt(maxPrice));
  res.json({ success: true, count: result.length, properties: result });
});

app.get('/api/properties/:id', requireAuth, (req, res) => {
  const property = properties.get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  const relatedLeads = Array.from(leads.values()).filter(l => l.propertyId === property.id);
  const relatedDeals = Array.from(deals.values()).filter(d => d.propertyId === property.id);
  res.json({ success: true, property, relatedLeads, relatedDeals });
});

app.post('/api/properties', requireAuth, (req, res) => {
  const property = { id: 'PRP' + String(properties.size + 1).padStart(3, '0'), ...req.body, status: 'available', verified: false, createdAt: new Date().toISOString().split('T')[0] };
  properties.set(property.id, property);
  res.status(201).json({ success: true, property });
});

app.patch('/api/properties/:id', requireAuth, (req, res) => {
  const property = properties.get(req.params.id);
  if (!property) return res.status(404).json({ error: 'Property not found' });
  const updated = { ...property, ...req.body };
  properties.set(property.id, updated);
  res.json({ success: true, property: updated });
});

app.delete('/api/properties/:id', requireAuth, (req, res) => {
  if (!properties.has(req.params.id)) return res.status(404).json({ error: 'Property not found' });
  properties.delete(req.params.id);
  res.json({ success: true, message: 'Property deleted' });
});

// Leads
app.get('/api/leads', requireAuth, (req, res) => {
  const { status, agentId, source } = req.query;
  let result = Array.from(leads.values());
  if (status) result = result.filter(l => l.status === status);
  if (agentId) result = result.filter(l => l.agentId === agentId);
  if (source) result = result.filter(l => l.source === source);
  res.json({ success: true, count: result.length, leads: result });
});

app.get('/api/leads/:id', requireAuth, (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const agent = agents.get(lead.agentId);
  res.json({ success: true, lead, agent });
});

app.post('/api/leads', requireAuth, (req, res) => {
  const lead = { id: 'LEAD' + String(leads.size + 1).padStart(3, '0'), ...req.body, status: 'new', createdAt: new Date().toISOString().split('T')[0], lastContact: null, nextFollowUp: null };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, lead });
});

app.patch('/api/leads/:id', requireAuth, (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  const updated = { ...lead, ...req.body };
  leads.set(lead.id, updated);
  res.json({ success: true, lead: updated });
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  if (!leads.has(req.params.id)) return res.status(404).json({ error: 'Lead not found' });
  leads.delete(req.params.id);
  res.json({ success: true, message: 'Lead deleted' });
});

// Clients
app.get('/api/clients', requireAuth, (req, res) => {
  const { type, agentId, status } = req.query;
  let result = Array.from(clients.values());
  if (type) result = result.filter(c => c.type === type);
  if (agentId) result = result.filter(c => c.agentId === agentId);
  if (status) result = result.filter(c => c.status === status);
  res.json({ success: true, count: result.length, clients: result });
});

app.get('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const agent = agents.get(client.agentId);
  const clientDeals = Array.from(deals.values()).filter(d => d.clientId === client.id);
  res.json({ success: true, client, agent, deals: clientDeals });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const client = { id: 'CLI' + String(clients.size + 1).padStart(3, '0'), ...req.body, status: 'active', createdAt: new Date().toISOString() };
  clients.set(client.id, client);
  res.status(201).json({ success: true, client });
});

app.patch('/api/clients/:id', requireAuth, (req, res) => {
  const client = clients.get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Client not found' });
  const updated = { ...client, ...req.body };
  clients.set(client.id, updated);
  res.json({ success: true, client: updated });
});

// Agents
app.get('/api/agents', requireAuth, (req, res) => {
  const { specialization, status } = req.query;
  let result = Array.from(agents.values());
  if (specialization) result = result.filter(a => a.specialization.includes(specialization));
  if (status) result = result.filter(a => a.status === status);
  res.json({ success: true, count: result.length, agents: result });
});

app.get('/api/agents/:id', requireAuth, (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const agentLeads = Array.from(leads.values()).filter(l => l.agentId === agent.id);
  const agentDeals = Array.from(deals.values()).filter(d => d.agentId === agent.id);
  const agentCommissions = Array.from(commissions.values()).filter(c => c.agentId === agent.id);
  res.json({ success: true, agent, leads: agentLeads, deals: agentDeals, commissions: agentCommissions });
});

app.post('/api/agents', requireAuth, (req, res) => {
  const agent = { id: 'AGT' + String(agents.size + 1).padStart(3, '0'), ...req.body, status: 'active', rating: 0, totalDeals: 0, totalValue: 0, commission: 0, createdAt: new Date().toISOString() };
  agents.set(agent.id, agent);
  res.status(201).json({ success: true, agent });
});

app.patch('/api/agents/:id', requireAuth, (req, res) => {
  const agent = agents.get(req.params.id);
  if (!agent) return res.status(404).json({ error: 'Agent not found' });
  const updated = { ...agent, ...req.body };
  agents.set(agent.id, updated);
  res.json({ success: true, agent: updated });
});

// Site Visits
app.get('/api/site-visits', requireAuth, (req, res) => {
  const { propertyId, clientId, agentId, status, date } = req.query;
  let result = Array.from(siteVisits.values());
  if (propertyId) result = result.filter(v => v.propertyId === propertyId);
  if (clientId) result = result.filter(v => v.clientId === clientId);
  if (agentId) result = result.filter(v => v.agentId === agentId);
  if (status) result = result.filter(v => v.status === status);
  if (date) result = result.filter(v => v.date === date);
  res.json({ success: true, count: result.length, siteVisits: result });
});

app.get('/api/site-visits/:id', requireAuth, (req, res) => {
  const visit = siteVisits.get(req.params.id);
  if (!visit) return res.status(404).json({ error: 'Site visit not found' });
  const property = properties.get(visit.propertyId);
  const client = clients.get(visit.clientId);
  const agent = agents.get(visit.agentId);
  res.json({ success: true, siteVisit: visit, property, client, agent });
});

app.post('/api/site-visits', requireAuth, (req, res) => {
  const visit = { id: 'VIS' + String(siteVisits.size + 1).padStart(3, '0'), ...req.body, status: 'scheduled', feedback: null, createdAt: new Date().toISOString() };
  siteVisits.set(visit.id, visit);
  res.status(201).json({ success: true, siteVisit: visit });
});

app.patch('/api/site-visits/:id', requireAuth, (req, res) => {
  const visit = siteVisits.get(req.params.id);
  if (!visit) return res.status(404).json({ error: 'Site visit not found' });
  const updated = { ...visit, ...req.body };
  siteVisits.set(visit.id, updated);
  res.json({ success: true, siteVisit: updated });
});

// Appointments
app.get('/api/appointments', requireAuth, (req, res) => {
  const { agentId, type, status, date } = req.query;
  let result = Array.from(appointments.values());
  if (agentId) result = result.filter(a => a.agentId === agentId);
  if (type) result = result.filter(a => a.type === type);
  if (status) result = result.filter(a => a.status === status);
  if (date) result = result.filter(a => a.date === date);
  res.json({ success: true, count: result.length, appointments: result });
});

app.get('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  const lead = leads.get(appointment.leadId);
  res.json({ success: true, appointment, lead });
});

app.post('/api/appointments', requireAuth, (req, res) => {
  const appointment = { id: 'APT' + String(appointments.size + 1).padStart(3, '0'), ...req.body, status: 'scheduled', createdAt: new Date().toISOString() };
  appointments.set(appointment.id, appointment);
  res.status(201).json({ success: true, appointment });
});

app.patch('/api/appointments/:id', requireAuth, (req, res) => {
  const appointment = appointments.get(req.params.id);
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
  const updated = { ...appointment, ...req.body };
  appointments.set(appointment.id, updated);
  res.json({ success: true, appointment: updated });
});

// Deals / Pipeline
app.get('/api/deals', requireAuth, (req, res) => {
  const { stage, agentId, type, status } = req.query;
  let result = Array.from(deals.values());
  if (stage) result = result.filter(d => d.stage === stage);
  if (agentId) result = result.filter(d => d.agentId === agentId);
  if (type) result = result.filter(d => d.type === type);
  if (status) result = result.filter(d => d.status === status);
  res.json({ success: true, count: result.length, deals: result });
});

app.get('/api/deals/:id', requireAuth, (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const property = properties.get(deal.propertyId);
  const client = clients.get(deal.clientId);
  const agent = agents.get(deal.agentId);
  res.json({ success: true, deal, property, client, agent });
});

app.post('/api/deals', requireAuth, (req, res) => {
  const deal = { id: 'DEAL' + String(deals.size + 1).padStart(3, '0'), ...req.body, stage: 'inquiry', probability: 20, activities: [], createdAt: new Date().toISOString() };
  deals.set(deal.id, deal);
  res.status(201).json({ success: true, deal });
});

app.patch('/api/deals/:id', requireAuth, (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const updated = { ...deal, ...req.body };
  deals.set(deal.id, updated);
  res.json({ success: true, deal: updated });
});

app.post('/api/deals/:id/activities', requireAuth, (req, res) => {
  const deal = deals.get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });
  const activity = { date: new Date().toISOString().split('T')[0], ...req.body };
  deal.activities.push(activity);
  deals.set(deal.id, deal);
  res.json({ success: true, deal });
});

// Commissions
app.get('/api/commissions', requireAuth, (req, res) => {
  const { agentId, status, type } = req.query;
  let result = Array.from(commissions.values());
  if (agentId) result = result.filter(c => c.agentId === agentId);
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);
  res.json({ success: true, count: result.length, commissions: result });
});

app.post('/api/commissions', requireAuth, (req, res) => {
  const commission = { id: 'COM' + String(commissions.size + 1).padStart(3, '0'), ...req.body, status: 'pending', createdAt: new Date().toISOString() };
  commissions.set(commission.id, commission);
  res.status(201).json({ success: true, commission });
});

app.patch('/api/commissions/:id', requireAuth, (req, res) => {
  const commission = commissions.get(req.params.id);
  if (!commission) return res.status(404).json({ error: 'Commission not found' });
  const updated = { ...commission, ...req.body };
  commissions.set(commission.id, updated);
  res.json({ success: true, commission: updated });
});

// Documents
app.get('/api/documents', requireAuth, (req, res) => {
  const { propertyId, type, status } = req.query;
  let result = Array.from(documents.values());
  if (propertyId) result = result.filter(d => d.propertyId === propertyId);
  if (type) result = result.filter(d => d.type === type);
  if (status) result = result.filter(d => d.status === status);
  res.json({ success: true, count: result.length, documents: result });
});

app.post('/api/documents', requireAuth, (req, res) => {
  const document = { id: 'DOC' + String(documents.size + 1).padStart(3, '0'), ...req.body, status: 'pending', uploadedAt: new Date().toISOString() };
  documents.set(document.id, document);
  res.status(201).json({ success: true, document });
});

app.patch('/api/documents/:id', requireAuth, (req, res) => {
  const document = documents.get(req.params.id);
  if (!document) return res.status(404).json({ error: 'Document not found' });
  const updated = { ...document, ...req.body };
  documents.set(document.id, updated);
  res.json({ success: true, document: updated });
});

// Campaigns
app.get('/api/campaigns', requireAuth, (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(campaigns.values());
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);
  res.json({ success: true, count: result.length, campaigns: result });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const campaign = { id: 'CAMP' + String(campaigns.size + 1).padStart(3, '0'), ...req.body, status: 'active', leadsGenerated: 0, leadsContacted: 0, conversions: 0, createdAt: new Date().toISOString() };
  campaigns.set(campaign.id, campaign);
  res.status(201).json({ success: true, campaign });
});

app.patch('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const updated = { ...campaign, ...req.body };
  campaigns.set(campaign.id, updated);
  res.json({ success: true, campaign: updated });
});

// Analytics
app.get('/api/analytics/overview', requireAuth, (req, res) => {
  const propertyList = Array.from(properties.values());
  const leadList = Array.from(leads.values());
  const dealList = Array.from(deals.values());

  const totalPropertyValue = propertyList.reduce((sum, p) => sum + p.price, 0);
  const saleProperties = propertyList.filter(p => p.listingType === 'sale');
  const rentProperties = propertyList.filter(p => p.listingType === 'rent');
  const activeDeals = dealList.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');
  const wonDeals = dealList.filter(d => d.stage === 'closed_won');
  const totalDealValue = dealList.reduce((sum, d) => sum + d.value, 0);

  res.json({
    success: true,
    overview: {
      totalProperties: propertyList.length,
      saleProperties: saleProperties.length,
      rentProperties: rentProperties.length,
      totalLead: leadList.length,
      hotLeads: leadList.filter(l => l.status === 'hot').length,
      warmLeads: leadList.filter(l => l.status === 'warm').length,
      coldLeads: leadList.filter(l => l.status === 'cold').length,
      totalDeals: dealList.length,
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      totalDealValue: totalDealValue,
      totalPropertyValue: totalPropertyValue,
      totalAgents: agents.size
    }
  });
});

app.get('/api/analytics/pipeline', requireAuth, (req, res) => {
  const dealList = Array.from(deals.values());
  const pipelineStages = ['inquiry', 'site_visit', 'negotiation', 'documentation', 'closed_won', 'closed_lost'];
  const pipeline = pipelineStages.map(stage => {
    const stageDeals = dealList.filter(d => d.stage === stage);
    return {
      stage,
      count: stageDeals.length,
      value: stageDeals.reduce((sum, d) => sum + d.value, 0),
      deals: stageDeals
    };
  });
  res.json({ success: true, pipeline });
});

app.get('/api/analytics/agents', requireAuth, (req, res) => {
  const agentList = Array.from(agents.values());
  const agentStats = agentList.map(agent => {
    const agentDeals = Array.from(deals.values()).filter(d => d.agentId === agent.id);
    const wonDeals = agentDeals.filter(d => d.stage === 'closed_won');
    const activeDeals = agentDeals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost');
    const agentLeads = Array.from(leads.values()).filter(l => l.agentId === agent.id);
    return {
      agentId: agent.id,
      name: agent.name,
      totalDeals: agentDeals.length,
      wonDeals: wonDeals.length,
      activeDeals: activeDeals.length,
      totalValue: agentDeals.reduce((sum, d) => sum + d.value, 0),
      totalLeads: agentLeads.length,
      hotLeads: agentLeads.filter(l => l.status === 'hot').length,
      rating: agent.rating
    };
  });
  res.json({ success: true, agents: agentStats });
});

app.get('/api/analytics/properties', requireAuth, (req, res) => {
  const propertyList = Array.from(properties.values());
  const propertyStats = propertyList.map(prop => {
    const relatedDeals = Array.from(deals.values()).filter(d => d.propertyId === prop.id);
    const views = Math.floor(Math.random() * 500) + 100;
    const inquiries = Math.floor(Math.random() * 50) + 5;
    return {
      propertyId: prop.id,
      title: prop.title,
      price: prop.price,
      listingType: prop.listingType,
      status: prop.status,
      views,
      inquiries,
      dealCount: relatedDeals.length
    };
  }).sort((a, b) => b.views - a.views);
  res.json({ success: true, properties: propertyStats });
});

// Invoices
app.get('/api/invoices', requireAuth, (req, res) => {
  const { clientId, status } = req.query;
  let result = Array.from(invoices.values());
  if (clientId) result = result.filter(i => i.clientId === clientId);
  if (status) result = result.filter(i => i.status === status);
  res.json({ success: true, count: result.length, invoices: result });
});

app.post('/api/invoices', requireAuth, (req, res) => {
  const { clientId, amount, description, type } = req.body;
  const invoice = { id: 'INV' + Date.now(), invoiceNumber: `RE/2024/${Date.now()}`, clientId, amount, tax: Math.round(amount * 0.18), total: Math.round(amount * 1.18), description: description || 'Real Estate Service', type: type || 'service', status: 'pending', dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], createdAt: new Date().toISOString() };
  invoices.set(invoice.id, invoice);
  res.status(201).json({ success: true, invoice });
});

app.patch('/api/invoices/:id', requireAuth, (req, res) => {
  const invoice = invoices.get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const updated = { ...invoice, ...req.body };
  invoices.set(invoice.id, updated);
  res.json({ success: true, invoice: updated });
});

// Payments
app.get('/api/payments', requireAuth, (req, res) => {
  const { clientId, status, type } = req.query;
  let result = Array.from(payments.values());
  if (clientId) result = result.filter(p => p.clientId === clientId);
  if (status) result = result.filter(p => p.status === status);
  if (type) result = result.filter(p => p.type === type);
  res.json({ success: true, count: result.length, payments: result });
});

app.post('/api/payments', requireAuth, (req, res) => {
  const { clientId, invoiceId, amount, method, type, description } = req.body;
  const payment = { id: 'PAY' + Date.now(), clientId, invoiceId, amount, method: method || 'online', type: type || 'receipt', description: description || 'Payment', status: 'completed', date: new Date().toISOString(), createdAt: new Date().toISOString() };
  payments.set(payment.id, payment);
  res.status(201).json({ success: true, payment });
});

// RTMN Layer Integrations
app.get('/api/layer/intelligence', requireAuth, (req, res) => {
  res.json({ layer: 1, name: 'Intelligence', capabilities: ['Property Valuation AI', 'Price Prediction', 'Market Analysis', 'Lead Scoring AI'], status: 'available' });
});

app.get('/api/layer/customer-growth', requireAuth, (req, res) => {
  res.json({ layer: 2, name: 'Customer Growth', capabilities: ['Lead Generation', 'Property Portals Integration', 'Social Marketing', 'Email Campaigns'], status: 'available' });
});

app.get('/api/layer/commerce', requireAuth, (req, res) => {
  res.json({ layer: 3, name: 'Commerce', capabilities: ['Property Listings', 'Rental Agreements', 'Token Amount', 'Registration'], status: 'available' });
});

app.get('/api/layer/finance', requireAuth, (req, res) => {
  res.json({ layer: 4, name: 'Finance', capabilities: ['EMI Calculator', 'Home Loan Integration', 'Commission Tracking', 'Invoice Management'], status: 'available' });
});

app.get('/api/layer/property', requireAuth, (req, res) => {
  res.json({ layer: 7, name: 'Property', capabilities: ['Property Registry', 'Title Verification', 'RERA Integration', 'Document Management'], status: 'available' });
});

app.get('/api/layers', requireAuth, (req, res) => {
  res.json({ industry: INDUSTRY, service: 'Real Estate OS', layers: 15, version: '2.0.0' });
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Real Estate OS',
    version: '2.0.0',
    port: PORT,
    industry: 'Real Estate',
    timestamp: new Date().toISOString(),
    stats: {
      properties: properties.size,
      leads: leads.size,
      clients: clients.size,
      agents: agents.size,
      deals: deals.size,
      siteVisits: siteVisits.size
    }
  });
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║               REAL ESTATE OS v2.0.0                  ║
║           Complete Real Estate Management             ║
╠══════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                           ║
║  Features:                                             ║
║  • Property Listings (Buy/Rent)                      ║
║  • Lead & Enquiry Management                          ║
║  • Agent Management                                    ║
║  • Client Management                                  ║
║  • Site Visits & Appointments                          ║
║  • Deal Pipeline Management                            ║
║  • Commission Tracking                                 ║
║  • Property Documents                                  ║
║  • Marketing Campaigns                                ║
║  • Analytics & Reporting                              ║
╚══════════════════════════════════════════════════════════╝`);
});
