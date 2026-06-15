import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 5230;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

app.use(helmet());
app.use(cors());
app.use(express.json());

// Stores
const properties = new Map();
const listings = new Map();
const leads = new Map();
const agents = new Map();
const viewings = new Map();
const offers = new Map();

function initSampleData() {
  const sampleAgents = [
    { id: 'a1', name: 'Jane Agent', email: 'jane@realestate.com', phone: '555-0101', status: 'active' },
    { id: 'a2', name: 'Bob Agent', email: 'bob@realestate.com', phone: '555-0102', status: 'active' },
  ];
  sampleAgents.forEach(a => agents.set(a.id, { ...a, createdAt: new Date().toISOString() }));
  logger.info('RealEstate OS initialized');
}
initSampleData();

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'realestate-os', version: '1.0.0', timestamp: new Date().toISOString() });
});

// Properties
app.get('/api/properties', (req, res) => {
  const { type, status, minPrice, maxPrice, bedrooms } = req.query;
  let result = Array.from(properties.values());
  if (type) result = result.filter(p => p.type === type);
  if (status) result = result.filter(p => p.status === status);
  if (minPrice) result = result.filter(p => p.price >= parseFloat(minPrice));
  if (maxPrice) result = result.filter(p => p.price <= parseFloat(maxPrice));
  if (bedrooms) result = result.filter(p => p.bedrooms >= parseInt(bedrooms));
  res.json({ success: true, count: result.length, properties: result });
});

app.get('/api/properties/:id', (req, res) => {
  const prop = properties.get(req.params.id);
  if (!prop) return res.status(404).json({ success: false, error: 'Property not found' });
  res.json({ success: true, property: prop });
});

app.post('/api/properties', (req, res) => {
  const { title, type, price, address, bedrooms, bathrooms, sqft, description, features, agentId } = req.body;
  if (!title || !type || !price) {
    return res.status(400).json({ success: false, error: 'Title, type, and price required' });
  }
  const prop = {
    id: uuidv4(),
    title,
    type,
    price: parseFloat(price),
    address: address || {},
    bedrooms: bedrooms || 0,
    bathrooms: bathrooms || 0,
    sqft: sqft || 0,
    description: description || '',
    features: features || [],
    agentId: agentId || null,
    status: 'available',
    views: 0,
    createdAt: new Date().toISOString()
  };
  properties.set(prop.id, prop);
  res.status(201).json({ success: true, property: prop });
});

app.put('/api/properties/:id', (req, res) => {
  const prop = properties.get(req.params.id);
  if (!prop) return res.status(404).json({ success: false, error: 'Property not found' });
  const updated = { ...prop, ...req.body, id: prop.id };
  properties.set(prop.id, updated);
  res.json({ success: true, property: updated });
});

// Listings
app.get('/api/listings', (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(listings.values());
  if (status) result = result.filter(l => l.status === status);
  if (type) result = result.filter(l => l.type === type);
  res.json({ success: true, count: result.length, listings: result });
});

app.post('/api/listings', (req, res) => {
  const { propertyId, type, askingPrice, listingDate, expiresDate } = req.body;
  if (!propertyId) return res.status(400).json({ success: false, error: 'propertyId required' });
  const listing = {
    id: uuidv4(),
    propertyId,
    type: type || 'sale',
    askingPrice: askingPrice || 0,
    listingDate: listingDate || new Date().toISOString(),
    expiresDate: expiresDate || null,
    status: 'active',
    createdAt: new Date().toISOString()
  };
  listings.set(listing.id, listing);
  res.status(201).json({ success: true, listing });
});

// Leads
app.get('/api/leads', (req, res) => {
  const { status, source } = req.query;
  let result = Array.from(leads.values());
  if (status) result = result.filter(l => l.status === status);
  if (source) result = result.filter(l => l.source === source);
  res.json({ success: true, count: result.length, leads: result });
});

app.post('/api/leads', (req, res) => {
  const { name, email, phone, source, propertyId, notes } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const lead = {
    id: uuidv4(),
    name,
    email: email || null,
    phone: phone || null,
    source: source || 'website',
    propertyId: propertyId || null,
    notes: notes || '',
    status: 'new',
    score: 50,
    createdAt: new Date().toISOString()
  };
  leads.set(lead.id, lead);
  res.status(201).json({ success: true, lead });
});

app.patch('/api/leads/:id/status', (req, res) => {
  const lead = leads.get(req.params.id);
  if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
  if (req.body.status) lead.status = req.body.status;
  if (req.body.score) lead.score = req.body.score;
  lead.updatedAt = new Date().toISOString();
  leads.set(lead.id, lead);
  res.json({ success: true, lead });
});

// Agents
app.get('/api/agents', (req, res) => {
  const { status } = req.query;
  let result = Array.from(agents.values());
  if (status) result = result.filter(a => a.status === status);
  res.json({ success: true, count: result.length, agents: result });
});

app.post('/api/agents', (req, res) => {
  const { name, email, phone, license, specialties } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Name required' });
  const agent = {
    id: uuidv4(),
    name,
    email: email || null,
    phone: phone || null,
    license: license || null,
    specialties: specialties || [],
    status: 'active',
    dealsClosed: 0,
    createdAt: new Date().toISOString()
  };
  agents.set(agent.id, agent);
  res.status(201).json({ success: true, agent });
});

// Viewings
app.get('/api/viewings', (req, res) => {
  const { propertyId, status } = req.query;
  let result = Array.from(viewings.values());
  if (propertyId) result = result.filter(v => v.propertyId === propertyId);
  if (status) result = result.filter(v => v.status === status);
  res.json({ success: true, count: result.length, viewings: result });
});

app.post('/api/viewings', (req, res) => {
  const { propertyId, leadId, agentId, date, time, notes } = req.body;
  if (!propertyId || !date) {
    return res.status(400).json({ success: false, error: 'propertyId and date required' });
  }
  const viewing = {
    id: uuidv4(),
    propertyId,
    leadId: leadId || null,
    agentId: agentId || null,
    date,
    time: time || '10:00',
    notes: notes || '',
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  viewings.set(viewing.id, viewing);
  res.status(201).json({ success: true, viewing });
});

// Offers
app.get('/api/offers', (req, res) => {
  const { propertyId, status } = req.query;
  let result = Array.from(offers.values());
  if (propertyId) result = result.filter(o => o.propertyId === propertyId);
  if (status) result = result.filter(o => o.status === status);
  res.json({ success: true, count: result.length, offers: result });
});

app.post('/api/offers', (req, res) => {
  const { propertyId, leadId, amount, contingencies } = req.body;
  if (!propertyId || !amount) {
    return res.status(400).json({ success: false, error: 'propertyId and amount required' });
  }
  const offer = {
    id: uuidv4(),
    propertyId,
    leadId: leadId || null,
    amount: parseFloat(amount),
    contingencies: contingencies || [],
    status: 'pending',
    createdAt: new Date().toISOString()
  };
  offers.set(offer.id, offer);
  res.status(201).json({ success: true, offer });
});

app.patch('/api/offers/:id/respond', (req, res) => {
  const offer = offers.get(req.params.id);
  if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
  const { status } = req.body;
  if (!['accepted', 'rejected', 'countered'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }
  offer.status = status;
  offer.respondedAt = new Date().toISOString();
  offers.set(offer.id, offer);
  res.json({ success: true, offer });
});

// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    success: true,
    analytics: {
      totalProperties: properties.size,
      activeListings: listings.size,
      totalLeads: leads.size,
      newLeads: Array.from(leads.values()).filter(l => l.status === 'new').length,
      totalViewings: viewings.size,
      scheduledViewings: Array.from(viewings.values()).filter(v => v.status === 'scheduled').length,
      totalOffers: offers.size,
      pendingOffers: Array.from(offers.values()).filter(o => o.status === 'pending').length,
      totalAgents: agents.size
    }
  });
});

app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  logger.info(`🏠 RealEstate OS running on port ${PORT}`);
});

export default app;
