/**
 * NonProfit OS
 * Port: 5160
 * Industry: non_profit
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 5160;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());


// ============= AUTH + DATABASE =============
const authBusinesses = new Map();
const authUsers = new Map();
const authSessions = new Map();
const crypto = require('crypto');

let mongoose = null;
let dbConnected = false;
const MONGODB_URI = process.env.MONGODB_URI;
const CRM_HUB_URL = process.env.CRM_HUB_URL || 'http://localhost:4056';
const SERVICE_NAME = process.env.SERVICE_NAME || 'NonProfit OS';

async function initDatabase() {
  if (!MONGODB_URI) {
    console.log('⚠️  MONGODB_URI not set. Running in demo mode (in-memory).');
    return;
  }
  try {
    mongoose = (await import('mongoose')).default;
    await mongoose.connect(MONGODB_URI);
    dbConnected = true;
    console.log('✅ MongoDB connected for', SERVICE_NAME);
  } catch (err) {
    console.error('MongoDB connection failed:', err.message);
  }
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

app.post('/auth/register', (req, res) => {
  const { businessId, email, password, role, businessName } = req.body;
  if (!email || !password || !businessId) {
    return res.status(400).json({ error: 'businessId, email, password required' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = {
    id: 'user_' + Date.now(),
    businessId,
    email,
    passwordHash: hashPassword(password),
    role: role || 'owner',
    name: businessName || email.split('@')[0],
    createdAt: new Date().toISOString()
  };
  authUsers.set(email, user);
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email, businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = authUsers.get(email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = generateToken();
  authSessions.set(token, { userId: user.id, email: user.email, businessId: user.businessId, createdAt: Date.now() });
  res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
});

app.get('/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  res.json({ valid: true, ...session });
});

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.slice(7);
  const session = authSessions.get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.session = session;
  next();
}

async function syncCustomerToCRM(customer, businessId) {
  if (!dbConnected) return;
  try {
    await fetch(`${CRM_HUB_URL}/api/contacts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        industry: 'non_profit',
        businessId,
        loyaltyPoints: customer.loyaltyPoints || 0,
        tier: customer.tier || 'bronze',
      }),
    });
  } catch (err) {
    console.warn('CRM sync failed:', err.message);
  }
}

// ============= END AUTH + DATABASE =============

// ============= NONPROFIT OS DATA =============
const donors = new Map();
const campaigns = new Map();
const beneficiaries = new Map();
const donations = new Map();

// ============= END DATA =============

// ============= TWINS =============
const donorTwin = new Map();
const campaignTwin = new Map();
const beneficiaryTwin = new Map();

// ============= END TWINS =============

// ============= API ROUTES =============

app.get('/api/donors', (req, res) => {
  res.json({ donors: Array.from(donors.values()) });
});

app.post('/api/donors', requireAuth, (req, res) => {
  const donor = { id: 'donor_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  donors.set(donor.id, donor);
  res.json(donor);
});

app.get('/api/donors/:id', (req, res) => {
  const donor = donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Not found' });
  res.json(donor);
});

app.put('/api/donors/:id', requireAuth, (req, res) => {
  const donor = donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Not found' });
  if (donor.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  donors.set(req.params.id, { ...donor, ...req.body });
  res.json(donors.get(req.params.id));
});

app.delete('/api/donors/:id', requireAuth, (req, res) => {
  const donor = donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Not found' });
  if (donor.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  donors.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/campaigns', (req, res) => {
  res.json({ campaigns: Array.from(campaigns.values()) });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const campaign = { id: 'campaign_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  campaigns.set(campaign.id, campaign);
  res.json(campaign);
});

app.get('/api/campaigns/:id', (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  res.json(campaign);
});

app.put('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  if (campaign.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  campaigns.set(req.params.id, { ...campaign, ...req.body });
  res.json(campaigns.get(req.params.id));
});

app.delete('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Not found' });
  if (campaign.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  campaigns.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/beneficiaries', (req, res) => {
  res.json({ beneficiaries: Array.from(beneficiaries.values()) });
});

app.post('/api/beneficiaries', requireAuth, (req, res) => {
  const beneficiarie = { id: 'beneficiarie_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  beneficiaries.set(beneficiarie.id, beneficiarie);
  res.json(beneficiarie);
});

app.get('/api/beneficiaries/:id', (req, res) => {
  const beneficiarie = beneficiaries.get(req.params.id);
  if (!beneficiarie) return res.status(404).json({ error: 'Not found' });
  res.json(beneficiarie);
});

app.put('/api/beneficiaries/:id', requireAuth, (req, res) => {
  const beneficiarie = beneficiaries.get(req.params.id);
  if (!beneficiarie) return res.status(404).json({ error: 'Not found' });
  if (beneficiarie.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  beneficiaries.set(req.params.id, { ...beneficiarie, ...req.body });
  res.json(beneficiaries.get(req.params.id));
});

app.delete('/api/beneficiaries/:id', requireAuth, (req, res) => {
  const beneficiarie = beneficiaries.get(req.params.id);
  if (!beneficiarie) return res.status(404).json({ error: 'Not found' });
  if (beneficiarie.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  beneficiaries.delete(req.params.id);
  res.json({ success: true });
});


app.get('/api/donations', (req, res) => {
  res.json({ donations: Array.from(donations.values()) });
});

app.post('/api/donations', requireAuth, (req, res) => {
  const donation = { id: 'donation_' + Date.now(), ...req.body, tenantId: req.session.businessId, createdAt: new Date().toISOString() };
  donations.set(donation.id, donation);
  res.json(donation);
});

app.get('/api/donations/:id', (req, res) => {
  const donation = donations.get(req.params.id);
  if (!donation) return res.status(404).json({ error: 'Not found' });
  res.json(donation);
});

app.put('/api/donations/:id', requireAuth, (req, res) => {
  const donation = donations.get(req.params.id);
  if (!donation) return res.status(404).json({ error: 'Not found' });
  if (donation.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  donations.set(req.params.id, { ...donation, ...req.body });
  res.json(donations.get(req.params.id));
});

app.delete('/api/donations/:id', requireAuth, (req, res) => {
  const donation = donations.get(req.params.id);
  if (!donation) return res.status(404).json({ error: 'Not found' });
  if (donation.tenantId !== req.session.businessId) return res.status(403).json({ error: 'Access denied' });
  donations.delete(req.params.id);
  res.json({ success: true });
});


// Analytics
app.get('/api/analytics', (req, res) => {
  res.json({
    donorCount: donors.size, campaignCount: campaigns.size, beneficiarieCount: beneficiaries.size, donationCount: donations.size
  });
});

// Twins sync
app.post('/api/twins/sync', requireAuth, (req, res) => {
  const twinData = { donor: Array.from(donorTwin.values()), campaign: Array.from(campaignTwin.values()), beneficiary: Array.from(beneficiaryTwin.values()) };
  res.json({ success: true, synced: twinData });
});

// ============= END ROUTES =============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

// Start server
initDatabase().catch(console.warn);
app.listen(PORT, () => console.log(`✅ NonProfit OS running on port ${PORT}`));

