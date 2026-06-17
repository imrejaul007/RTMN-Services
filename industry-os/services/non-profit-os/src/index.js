/**
 * Non-Profit OS - NGO/Non-Profit Organization Management Platform
 *
 * Complete nonprofit management with donors, beneficiaries, campaigns,
 * donations, grants, volunteers, and impact tracking.
 *
 * Port: 5160
 * Industry: Non-Profit
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5160;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory data stores
const authUsers = new Map();
const authSessions = new Map();
const donors = new Map();
const beneficiaries = new Map();
const campaigns = new Map();
const donations = new Map();
const grants = new Map();
const volunteers = new Map();
const impacts = new Map();

// Sample data counters
let donorIdCounter = 1;
let beneficiaryIdCounter = 1;
let campaignIdCounter = 1;
let donationIdCounter = 1;
let grantIdCounter = 1;
let volunteerIdCounter = 1;
let impactIdCounter = 1;

// Initialize sample data
function initializeSampleData() {
  // Sample Donors (5)
  const sampleDonors = [
    { name: 'Rajesh Kumar', email: 'rajesh.kumar@techcorp.in', phone: '+91-9876543210', type: 'corporate', donationTotal: 150000, donationCount: 12, lastDonation: '2026-05-20', trustScore: 95 },
    { name: 'Priya Sharma', email: 'priya.sharma@gmail.com', phone: '+91-9988776655', type: 'individual', donationTotal: 45000, donationCount: 8, lastDonation: '2026-06-01', trustScore: 88 },
    { name: 'Green Earth Foundation', email: 'contact@greenearth.org', phone: '+91-11-45678900', type: 'foundation', donationTotal: 500000, donationCount: 24, lastDonation: '2026-06-10', trustScore: 100 },
    { name: 'Anand Patel', email: 'anand.patel@business.com', phone: '+91-8765432109', type: 'individual', donationTotal: 75000, donationCount: 5, lastDonation: '2026-04-15', trustScore: 82 },
    { name: 'Women Empowerment Trust', email: 'info@womenempower.org', phone: '+91-22-34567890', type: 'trust', donationTotal: 200000, donationCount: 15, lastDonation: '2026-05-30', trustScore: 92 }
  ];

  sampleDonors.forEach(donor => {
    const id = `DON-${String(donorIdCounter++).padStart(4, '0')}`;
    donors.set(id, { id, ...donor, createdAt: new Date().toISOString() });
  });

  // Sample Beneficiaries (4)
  const sampleBeneficiaries = [
    { name: 'Meera Devi', age: 12, gender: 'female', category: 'education', location: 'Rajasthan', status: 'active', need: 'School supplies and fees', assignedWorker: 'Vikram Singh', documents: ['Aadhar', 'School certificate'] },
    { name: 'Rural Health Center - Barmer', type: 'healthcare', category: 'healthcare', location: 'Barmer, Rajasthan', status: 'active', need: 'Medical equipment', beneficiaryCount: 2500, documents: ['Registration certificate'] },
    { name: 'Sunita Verma', age: 35, gender: 'female', category: 'women_empowerment', location: 'Uttar Pradesh', status: 'active', need: 'Vocational training', assignedWorker: 'Priya Gupta', documents: ['Aadhar'] },
    { name: 'Dropout Children Program', type: 'community', category: 'education', location: 'Madhya Pradesh', status: 'active', need: 'Bridge education', beneficiaryCount: 150, documents: ['NGO registration'] }
  ];

  sampleBeneficiaries.forEach(beneficiary => {
    const id = `BEN-${String(beneficiaryIdCounter++).padStart(4, '0')}`;
    beneficiaries.set(id, { id, ...beneficiary, createdAt: new Date().toISOString() });
  });

  // Sample Campaigns (3)
  const sampleCampaigns = [
    { name: 'Education for Every Child 2026', type: 'education', goal: 500000, raised: 325000, startDate: '2026-01-01', endDate: '2026-12-31', status: 'active', description: 'Providing education to 500 underprivileged children', expenses: 180000, beneficiaries: 280, donors: 45 },
    { name: 'Rural Healthcare Initiative', type: 'healthcare', goal: 750000, raised: 520000, startDate: '2026-03-01', endDate: '2026-08-31', status: 'active', description: 'Setting up 10 mobile health clinics in rural areas', expenses: 340000, beneficiaries: 15000, donors: 62 },
    { name: 'Women Empowerment Program', type: 'women_empowerment', goal: 400000, raised: 400000, startDate: '2025-06-01', endDate: '2026-05-31', status: 'completed', description: 'Vocational training for 200 women', expenses: 395000, beneficiaries: 205, donors: 38 }
  ];

  sampleCampaigns.forEach(campaign => {
    const id = `CAMP-${String(campaignIdCounter++).padStart(4, '0')}`;
    campaigns.set(id, { id, ...campaign, createdAt: new Date().toISOString() });
  });

  // Sample Donations (5)
  const sampleDonations = [
    { donorId: 'DON-0001', campaignId: 'CAMP-0001', amount: 50000, paymentMethod: 'UPI', transactionId: 'TXN001', date: '2026-05-20', status: 'completed', notes: 'Monthly recurring donation' },
    { donorId: 'DON-0002', campaignId: 'CAMP-0001', amount: 10000, paymentMethod: 'Net Banking', transactionId: 'TXN002', date: '2026-06-01', status: 'completed', notes: '' },
    { donorId: 'DON-0003', campaignId: 'CAMP-0002', amount: 100000, paymentMethod: 'Cheque', transactionId: 'TXN003', date: '2026-06-10', status: 'completed', notes: 'Quarterly grant' },
    { donorId: 'DON-0004', campaignId: 'CAMP-0002', amount: 25000, paymentMethod: 'UPI', transactionId: 'TXN004', date: '2026-04-15', status: 'completed', notes: '' },
    { donorId: 'DON-0005', campaignId: 'CAMP-0003', amount: 75000, paymentMethod: 'Bank Transfer', transactionId: 'TXN005', date: '2026-05-30', status: 'completed', notes: 'Final contribution for women program' }
  ];

  sampleDonations.forEach(donation => {
    const id = `DN-${String(donationIdCounter++).padStart(4, '0')}`;
    donations.set(id, { id, ...donation, createdAt: new Date().toISOString() });
  });

  // Sample Grants
  const sampleGrants = [
    { name: 'CSR Grant - TechCorp India', grantor: 'TechCorp India Ltd', amount: 200000, status: 'active', startDate: '2026-01-01', endDate: '2026-12-31', utilization: 125000, conditions: 'Education sector only', category: 'education' },
    { name: 'Government Scheme - NHM', grantor: 'National Health Mission', amount: 500000, status: 'active', startDate: '2026-04-01', endDate: '2027-03-31', utilization: 180000, conditions: 'Rural healthcare', category: 'healthcare' },
    { name: 'Foundation Grant - Green Earth', grantor: 'Green Earth Foundation', amount: 150000, status: 'completed', startDate: '2025-07-01', endDate: '2026-06-30', utilization: 150000, conditions: 'Environmental projects', category: 'environment' }
  ];

  sampleGrants.forEach(grant => {
    const id = `GRT-${String(grantIdCounter++).padStart(4, '0')}`;
    grants.set(id, { id, ...grant, createdAt: new Date().toISOString() });
  });

  // Sample Volunteers
  const sampleVolunteers = [
    { name: 'Amit Singh', email: 'amit.singh@email.com', phone: '+91-9876500001', skills: ['teaching', 'event management'], hoursContributed: 120, assignments: ['Education program', 'Fundraising events'], status: 'active', joinedDate: '2025-06-15' },
    { name: 'Neha Kapoor', email: 'neha.kapoor@email.com', phone: '+91-9876500002', skills: ['medical', 'first aid'], hoursContributed: 85, assignments: ['Healthcare camps'], status: 'active', joinedDate: '2025-09-01' },
    { name: 'Vikram Joshi', email: 'vikram.j@email.com', phone: '+91-9876500003', skills: ['IT', 'social media'], hoursContributed: 200, assignments: ['Digital outreach', 'Website maintenance'], status: 'active', joinedDate: '2024-03-20' },
    { name: 'Sunita Rao', email: 'sunita.rao@email.com', phone: '+91-9876500004', skills: ['counseling', 'teaching'], hoursContributed: 150, assignments: ['Women empowerment', 'Career guidance'], status: 'inactive', joinedDate: '2023-11-10' }
  ];

  sampleVolunteers.forEach(volunteer => {
    const id = `VOL-${String(volunteerIdCounter++).padStart(4, '0')}`;
    volunteers.set(id, { id, ...volunteer, createdAt: new Date().toISOString() });
  });

  // Sample Impact Records
  const sampleImpacts = [
    { category: 'education', metric: 'children_educated', value: 480, period: '2026', description: 'Children provided with education', change: '+12%' },
    { category: 'healthcare', metric: 'patients_served', value: 8500, period: '2026', description: 'Rural patients treated', change: '+25%' },
    { category: 'women_empowerment', metric: 'women_trained', value: 205, period: '2026', description: 'Women completed vocational training', change: '+8%' }
  ];

  sampleImpacts.forEach(impact => {
    const id = `IMP-${String(impactIdCounter++).padStart(4, '0')}`;
    impacts.set(id, { id, ...impact, createdAt: new Date().toISOString() });
  });

  console.log('Non-Profit OS: Sample data initialized');
}

// Auth middleware
function requireAuth(req, res, next) {
  const sessionId = req.headers['x-session-id'];
  if (!sessionId || !authSessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Valid session required' });
  }
  req.session = authSessions.get(sessionId);
  next();
}

// Generate session ID
function generateSessionId() {
  return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// ============ HEALTH & INFO ============

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Non-Profit OS',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      donors: donors.size,
      beneficiaries: beneficiaries.size,
      campaigns: campaigns.size,
      donations: donations.size,
      grants: grants.size,
      volunteers: volunteers.size,
      impacts: impacts.size
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'Non-Profit OS',
    description: 'NGO/Non-Profit Organization Management Platform',
    port: PORT,
    endpoints: {
      health: 'GET /health',
      auth: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/logout'],
      donors: ['GET /api/donors', 'POST /api/donors', 'GET /api/donors/:id', 'PUT /api/donors/:id', 'DELETE /api/donors/:id'],
      beneficiaries: ['GET /api/beneficiaries', 'POST /api/beneficiaries', 'GET /api/beneficiaries/:id', 'PUT /api/beneficiaries/:id', 'DELETE /api/beneficiaries/:id'],
      campaigns: ['GET /api/campaigns', 'POST /api/campaigns', 'GET /api/campaigns/:id', 'PUT /api/campaigns/:id', 'DELETE /api/campaigns/:id', 'GET /api/campaigns/:id/progress'],
      donations: ['GET /api/donations', 'POST /api/donations', 'GET /api/donations/:id', 'GET /api/donations/by-donor/:donorId', 'GET /api/donations/by-campaign/:campaignId'],
      grants: ['GET /api/grants', 'POST /api/grants', 'GET /api/grants/:id', 'PUT /api/grants/:id'],
      volunteers: ['GET /api/volunteers', 'POST /api/volunteers', 'GET /api/volunteers/:id', 'PUT /api/volunteers/:id'],
      impacts: ['GET /api/impacts', 'POST /api/impacts', 'GET /api/impacts/:id'],
      analytics: ['GET /api/analytics/summary', 'GET /api/analytics/fund-utilization'],
      layers: 'GET /api/layers'
    }
  });
});

// ============ AUTH ============

app.post('/api/auth/register', (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  if (authUsers.has(email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const user = { id: `user_${Date.now()}`, email, name, role: role || 'user', createdAt: new Date().toISOString() };
  authUsers.set(email, { ...user, password }); // In production, hash the password!
  const sessionId = generateSessionId();
  authSessions.set(sessionId, { ...user, sessionId, createdAt: new Date().toISOString() });
  res.status(201).json({ message: 'Registered successfully', sessionId, user });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = authUsers.get(email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const sessionId = generateSessionId();
  authSessions.set(sessionId, { ...user, sessionId, createdAt: new Date().toISOString() });
  res.json({ message: 'Login successful', sessionId, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/api/auth/logout', (req, res) => {
  const sessionId = req.headers['x-session-id'];
  if (sessionId) authSessions.delete(sessionId);
  res.json({ message: 'Logged out successfully' });
});

// ============ DONORS ============

app.get('/api/donors', requireAuth, (req, res) => {
  const { type, minDonation, status } = req.query;
  let result = Array.from(donors.values());
  if (type) result = result.filter(d => d.type === type);
  if (minDonation) result = result.filter(d => d.donationTotal >= parseInt(minDonation));
  if (status === 'active') result = result.filter(d => d.lastDonation && new Date(d.lastDonation) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  res.json({ donors: result, count: result.length });
});

app.post('/api/donors', requireAuth, (req, res) => {
  const { name, email, phone, type, notes } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  const id = `DON-${String(donorIdCounter++).padStart(4, '0')}`;
  const donor = { id, name, email, phone, type: type || 'individual', notes, donationTotal: 0, donationCount: 0, trustScore: 50, createdAt: new Date().toISOString() };
  donors.set(id, donor);
  res.status(201).json({ message: 'Donor created', donor });
});

app.get('/api/donors/:id', requireAuth, (req, res) => {
  const donor = donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });

  // Get donation history
  const donationHistory = Array.from(donations.values()).filter(d => d.donorId === donor.id);
  const campaigns = Array.from(campaigns.values()).filter(c => donationHistory.some(d => d.campaignId === c.id));

  res.json({ donor, donationHistory, campaigns });
});

app.put('/api/donors/:id', requireAuth, (req, res) => {
  const donor = donors.get(req.params.id);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  const updated = { ...donor, ...req.body, id: donor.id };
  donors.set(req.params.id, updated);
  res.json({ message: 'Donor updated', donor: updated });
});

app.delete('/api/donors/:id', requireAuth, (req, res) => {
  if (!donors.has(req.params.id)) return res.status(404).json({ error: 'Donor not found' });
  donors.delete(req.params.id);
  res.json({ message: 'Donor deleted' });
});

// ============ BENEFICIARIES ============

app.get('/api/beneficiaries', requireAuth, (req, res) => {
  const { category, status, location } = req.query;
  let result = Array.from(beneficiaries.values());
  if (category) result = result.filter(b => b.category === category);
  if (status) result = result.filter(b => b.status === status);
  if (location) result = result.filter(b => b.location && b.location.toLowerCase().includes(location.toLowerCase()));
  res.json({ beneficiaries: result, count: result.length });
});

app.post('/api/beneficiaries', requireAuth, (req, res) => {
  const { name, age, gender, category, location, need, assignedWorker } = req.body;
  if (!name || !category) {
    return res.status(400).json({ error: 'Name and category required' });
  }
  const id = `BEN-${String(beneficiaryIdCounter++).padStart(4, '0')}`;
  const beneficiary = { id, name, age, gender, category, location, need, assignedWorker, status: 'active', documents: [], createdAt: new Date().toISOString() };
  beneficiaries.set(id, beneficiary);
  res.status(201).json({ message: 'Beneficiary created', beneficiary });
});

app.get('/api/beneficiaries/:id', requireAuth, (req, res) => {
  const beneficiary = beneficiaries.get(req.params.id);
  if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });

  // Get associated campaigns
  const associatedCampaigns = Array.from(campaigns.values()).filter(c =>
    c.beneficiaries > 0 && beneficiary.category === c.type
  );

  res.json({ beneficiary, associatedCampaigns });
});

app.put('/api/beneficiaries/:id', requireAuth, (req, res) => {
  const beneficiary = beneficiaries.get(req.params.id);
  if (!beneficiary) return res.status(404).json({ error: 'Beneficiary not found' });
  const updated = { ...beneficiary, ...req.body, id: beneficiary.id };
  beneficiaries.set(req.params.id, updated);
  res.json({ message: 'Beneficiary updated', beneficiary: updated });
});

app.delete('/api/beneficiaries/:id', requireAuth, (req, res) => {
  if (!beneficiaries.has(req.params.id)) return res.status(404).json({ error: 'Beneficiary not found' });
  beneficiaries.delete(req.params.id);
  res.json({ message: 'Beneficiary deleted' });
});

// ============ CAMPAIGNS ============

app.get('/api/campaigns', requireAuth, (req, res) => {
  const { status, type } = req.query;
  let result = Array.from(campaigns.values());
  if (status) result = result.filter(c => c.status === status);
  if (type) result = result.filter(c => c.type === type);
  res.json({ campaigns: result, count: result.length });
});

app.post('/api/campaigns', requireAuth, (req, res) => {
  const { name, type, goal, description, startDate, endDate } = req.body;
  if (!name || !type || !goal) {
    return res.status(400).json({ error: 'Name, type, and goal required' });
  }
  const id = `CAMP-${String(campaignIdCounter++).padStart(4, '0')}`;
  const campaign = {
    id, name, type, goal, raised: 0, description, startDate, endDate,
    status: 'draft', expenses: 0, beneficiaries: 0, donors: 0, createdAt: new Date().toISOString()
  };
  campaigns.set(id, campaign);
  res.status(201).json({ message: 'Campaign created', campaign });
});

app.get('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  // Get related data
  const campaignDonations = Array.from(donations.values()).filter(d => d.campaignId === campaign.id);
  const donorsList = campaignDonations.map(d => donors.get(d.donorId)).filter(Boolean);

  res.json({ campaign, donations: campaignDonations, donorCount: donorsList.length });
});

app.get('/api/campaigns/:id/progress', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const progress = {
    fundraisingProgress: ((campaign.raised / campaign.goal) * 100).toFixed(1),
    utilizationRate: campaign.raised > 0 ? ((campaign.expenses / campaign.raised) * 100).toFixed(1) : 0,
    donorEngagement: campaign.donors,
    beneficiaryImpact: campaign.beneficiaries,
    daysRemaining: Math.ceil((new Date(campaign.endDate) - new Date()) / (1000 * 60 * 60 * 24)),
    projectedCompletion: campaign.raised > 0 && campaign.donors > 0
      ? (campaign.goal / (campaign.raised / campaign.donors)).toFixed(0) : null
  };

  res.json({ campaignId: campaign.id, campaignName: campaign.name, progress });
});

app.put('/api/campaigns/:id', requireAuth, (req, res) => {
  const campaign = campaigns.get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const updated = { ...campaign, ...req.body, id: campaign.id };
  campaigns.set(req.params.id, updated);
  res.json({ message: 'Campaign updated', campaign: updated });
});

app.delete('/api/campaigns/:id', requireAuth, (req, res) => {
  if (!campaigns.has(req.params.id)) return res.status(404).json({ error: 'Campaign not found' });
  campaigns.delete(req.params.id);
  res.json({ message: 'Campaign deleted' });
});

// ============ DONATIONS ============

app.get('/api/donations', requireAuth, (req, res) => {
  const { status, paymentMethod, startDate, endDate } = req.query;
  let result = Array.from(donations.values());
  if (status) result = result.filter(d => d.status === status);
  if (paymentMethod) result = result.filter(d => d.paymentMethod === paymentMethod);
  if (startDate) result = result.filter(d => new Date(d.date) >= new Date(startDate));
  if (endDate) result = result.filter(d => new Date(d.date) <= new Date(endDate));

  // Enrich with donor and campaign info
  const enriched = result.map(d => ({
    ...d,
    donor: donors.get(d.donorId),
    campaign: campaigns.get(d.campaignId)
  }));

  res.json({ donations: enriched, count: result.length, totalAmount: result.reduce((sum, d) => sum + d.amount, 0) });
});

app.post('/api/donations', requireAuth, (req, res) => {
  const { donorId, campaignId, amount, paymentMethod, notes } = req.body;
  if (!donorId || !campaignId || !amount) {
    return res.status(400).json({ error: 'Donor ID, campaign ID, and amount required' });
  }

  const donor = donors.get(donorId);
  const campaign = campaigns.get(campaignId);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  const id = `DN-${String(donationIdCounter++).padStart(4, '0')}`;
  const donation = {
    id, donorId, campaignId, amount: parseInt(amount), paymentMethod: paymentMethod || 'UPI',
    transactionId: `TXN${Date.now()}`, date: new Date().toISOString().split('T')[0],
    status: 'completed', notes, createdAt: new Date().toISOString()
  };
  donations.set(id, donation);

  // Update donor stats
  donor.donationTotal += donation.amount;
  donor.donationCount += 1;
  donor.lastDonation = donation.date;
  donors.set(donorId, donor);

  // Update campaign
  campaign.raised += donation.amount;
  campaign.donors = new Set([...campaign.donors, donorId]).size ||
    Array.from(donations.values()).filter(d => d.campaignId === campaignId).length;
  campaigns.set(campaignId, campaign);

  res.status(201).json({ message: 'Donation recorded', donation });
});

app.get('/api/donations/:id', requireAuth, (req, res) => {
  const donation = donations.get(req.params.id);
  if (!donation) return res.status(404).json({ error: 'Donation not found' });

  const donor = donors.get(donation.donorId);
  const campaign = campaigns.get(donation.campaignId);

  res.json({ donation, donor, campaign });
});

app.get('/api/donations/by-donor/:donorId', requireAuth, (req, res) => {
  const donorDonations = Array.from(donations.values())
    .filter(d => d.donorId === req.params.donorId)
    .map(d => ({ ...d, campaign: campaigns.get(d.campaignId) }));

  const donor = donors.get(req.params.donorId);
  if (!donor) return res.status(404).json({ error: 'Donor not found' });

  res.json({ donor, donations: donorDonations, totalAmount: donor.donationTotal });
});

app.get('/api/donations/by-campaign/:campaignId', requireAuth, (req, res) => {
  const campaignDonations = Array.from(donations.values())
    .filter(d => d.campaignId === req.params.campaignId)
    .map(d => ({ ...d, donor: donors.get(d.donorId) }));

  const campaign = campaigns.get(req.params.campaignId);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

  res.json({ campaign, donations: campaignDonations, totalAmount: campaign.raised });
});

// ============ GRANTS ============

app.get('/api/grants', requireAuth, (req, res) => {
  const { status, category } = req.query;
  let result = Array.from(grants.values());
  if (status) result = result.filter(g => g.status === status);
  if (category) result = result.filter(g => g.category === category);
  res.json({ grants: result, count: result.length });
});

app.post('/api/grants', requireAuth, (req, res) => {
  const { name, grantor, amount, conditions, category, endDate } = req.body;
  if (!name || !grantor || !amount) {
    return res.status(400).json({ error: 'Name, grantor, and amount required' });
  }
  const id = `GRT-${String(grantIdCounter++).padStart(4, '0')}`;
  const grant = {
    id, name, grantor, amount: parseInt(amount), utilization: 0,
    conditions, category, status: 'active',
    startDate: new Date().toISOString().split('T')[0], endDate,
    createdAt: new Date().toISOString()
  };
  grants.set(id, grant);
  res.status(201).json({ message: 'Grant created', grant });
});

app.get('/api/grants/:id', requireAuth, (req, res) => {
  const grant = grants.get(req.params.id);
  if (!grant) return res.status(404).json({ error: 'Grant not found' });

  const utilizationPercent = ((grant.utilization / grant.amount) * 100).toFixed(1);
  const remaining = grant.amount - grant.utilization;

  res.json({ grant, utilization: { percent: utilizationPercent, remaining, utilized: grant.utilization } });
});

app.put('/api/grants/:id', requireAuth, (req, res) => {
  const grant = grants.get(req.params.id);
  if (!grant) return res.status(404).json({ error: 'Grant not found' });
  const updated = { ...grant, ...req.body, id: grant.id };
  grants.set(req.params.id, updated);
  res.json({ message: 'Grant updated', grant: updated });
});

// ============ VOLUNTEERS ============

app.get('/api/volunteers', requireAuth, (req, res) => {
  const { status, skill } = req.query;
  let result = Array.from(volunteers.values());
  if (status) result = result.filter(v => v.status === status);
  if (skill) result = result.filter(v => v.skills && v.skills.some(s => s.toLowerCase().includes(skill.toLowerCase())));
  res.json({ volunteers: result, count: result.length });
});

app.post('/api/volunteers', requireAuth, (req, res) => {
  const { name, email, phone, skills } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email required' });
  }
  const id = `VOL-${String(volunteerIdCounter++).padStart(4, '0')}`;
  const volunteer = {
    id, name, email, phone, skills: skills || [], hoursContributed: 0,
    assignments: [], status: 'active', joinedDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };
  volunteers.set(id, volunteer);
  res.status(201).json({ message: 'Volunteer registered', volunteer });
});

app.get('/api/volunteers/:id', requireAuth, (req, res) => {
  const volunteer = volunteers.get(req.params.id);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  res.json({ volunteer });
});

app.put('/api/volunteers/:id', requireAuth, (req, res) => {
  const volunteer = volunteers.get(req.params.id);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const updated = { ...volunteer, ...req.body, id: volunteer.id };
  volunteers.set(req.params.id, updated);
  res.json({ message: 'Volunteer updated', volunteer: updated });
});

// ============ IMPACTS ============

app.get('/api/impacts', requireAuth, (req, res) => {
  const { category, period } = req.query;
  let result = Array.from(impacts.values());
  if (category) result = result.filter(i => i.category === category);
  if (period) result = result.filter(i => i.period === period);
  res.json({ impacts: result, count: result.length });
});

app.post('/api/impacts', requireAuth, (req, res) => {
  const { category, metric, value, period, description, change } = req.body;
  if (!category || !metric || value === undefined) {
    return res.status(400).json({ error: 'Category, metric, and value required' });
  }
  const id = `IMP-${String(impactIdCounter++).padStart(4, '0')}`;
  const impact = { id, category, metric, value: parseInt(value), period, description, change, createdAt: new Date().toISOString() };
  impacts.set(id, impact);
  res.status(201).json({ message: 'Impact recorded', impact });
});

app.get('/api/impacts/:id', requireAuth, (req, res) => {
  const impact = impacts.get(req.params.id);
  if (!impact) return res.status(404).json({ error: 'Impact record not found' });
  res.json({ impact });
});

// ============ ANALYTICS ============

app.get('/api/analytics/summary', requireAuth, (req, res) => {
  const totalDonations = Array.from(donations.values()).reduce((sum, d) => sum + d.amount, 0);
  const totalRaised = Array.from(campaigns.values()).reduce((sum, c) => sum + c.raised, 0);
  const totalExpenses = Array.from(campaigns.values()).reduce((sum, c) => sum + c.expenses, 0);
  const activeCampaigns = Array.from(campaigns.values()).filter(c => c.status === 'active');
  const totalBeneficiaries = Array.from(beneficiaries.values()).reduce((sum, b) => sum + (b.beneficiaryCount || 1), 0);
  const totalVolunteerHours = Array.from(volunteers.values()).reduce((sum, v) => sum + v.hoursContributed, 0);
  const activeGrants = Array.from(grants.values()).filter(g => g.status === 'active');
  const grantFunding = activeGrants.reduce((sum, g) => sum + g.amount, 0);

  res.json({
    summary: {
      totalDonations,
      totalRaised,
      totalExpenses,
      netFunds: totalRaised - totalExpenses,
      donorCount: donors.size,
      beneficiaryCount: beneficiaries.size,
      totalBeneficiariesServed: totalBeneficiaries,
      activeCampaigns: activeCampaigns.length,
      campaignGoal: activeCampaigns.reduce((sum, c) => sum + c.goal, 0),
      campaignProgress: activeCampaigns.length > 0
        ? ((activeCampaigns.reduce((sum, c) => sum + c.raised, 0) / activeCampaigns.reduce((sum, c) => sum + c.goal, 0)) * 100).toFixed(1)
        : 0,
      volunteerCount: volunteers.size,
      totalVolunteerHours,
      activeGrants: activeGrants.length,
      grantFunding,
      grantUtilization: grantFunding > 0
        ? ((activeGrants.reduce((sum, g) => sum + g.utilization, 0) / grantFunding) * 100).toFixed(1)
        : 0
    },
    topDonors: Array.from(donors.values())
      .sort((a, b) => b.donationTotal - a.donationTotal)
      .slice(0, 5)
      .map(d => ({ id: d.id, name: d.name, total: d.donationTotal, trustScore: d.trustScore })),
    topCampaigns: Array.from(campaigns.values())
      .filter(c => c.status === 'active')
      .sort((a, b) => b.raised - a.raised)
      .slice(0, 5)
      .map(c => ({ id: c.id, name: c.name, raised: c.raised, goal: c.goal, progress: ((c.raised / c.goal) * 100).toFixed(1) })),
    impactMetrics: Array.from(impacts.values()).slice(0, 10)
  });
});

app.get('/api/analytics/fund-utilization', requireAuth, (req, res) => {
  const campaignsData = Array.from(campaigns.values());
  const grantsData = Array.from(grants.values());

  const totalIncome = campaignsData.reduce((sum, c) => sum + c.raised, 0) +
    grantsData.reduce((sum, g) => sum + g.utilization, 0);
  const totalExpenses = campaignsData.reduce((sum, c) => sum + c.expenses, 0);

  const utilizationByCategory = {};
  campaignsData.forEach(c => {
    if (!utilizationByCategory[c.type]) utilizationByCategory[c.type] = { spent: 0, campaigns: 0 };
    utilizationByCategory[c.type].spent += c.expenses;
    utilizationByCategory[c.type].campaigns += 1;
  });

  res.json({
    fundUtilization: {
      totalIncome,
      totalExpenses,
      utilizationRate: totalIncome > 0 ? ((totalExpenses / totalIncome) * 100).toFixed(1) : 0,
      balance: totalIncome - totalExpenses,
      byCategory: utilizationByCategory,
      incomeSources: {
        donations: campaignsData.reduce((sum, c) => sum + c.raised, 0),
        grants: grantsData.reduce((sum, g) => sum + g.amount, 0)
      }
    }
  });
});

// ============ RTMN LAYERS ============

app.get('/api/layers', (req, res) => {
  res.json({
    layers: [
      { id: 1, name: 'Intelligence', status: 'active', endpoints: ['/api/analytics/summary'] },
      { id: 2, name: 'Customer Growth', status: 'active', endpoints: ['/api/donors'] },
      { id: 3, name: 'Commerce', status: 'active', endpoints: ['/api/donations'] },
      { id: 4, name: 'Financial', status: 'active', endpoints: ['/api/analytics/fund-utilization'] },
      { id: 5, name: 'Workforce', status: 'active', endpoints: ['/api/volunteers'] },
      { id: 6, name: 'Legal & Trust', status: 'active', endpoints: ['/api/grants'] },
      { id: 7, name: 'Property', status: 'inactive' },
      { id: 8, name: 'Health', status: 'active', endpoints: ['/api/beneficiaries'] },
      { id: 9, name: 'Mobility', status: 'inactive' },
      { id: 10, name: 'Identity', status: 'active', auth: true },
      { id: 11, name: 'Memory', status: 'active', endpoint: '/api/auth' },
      { id: 12, name: 'Twins', status: 'active', twins: ['donor-twin', 'beneficiary-twin', 'campaign-twin'] },
      { id: 13, name: 'Automation', status: 'inactive' },
      { id: 14, name: 'Autonomous', status: 'inactive' },
      { id: 15, name: 'Network', status: 'active', endpoints: ['/api/impacts'] }
    ],
    activeLayers: 11,
    totalLayers: 15
  });
});

// Start server
initializeSampleData();

app.listen(PORT, () => {
  console.log(`Non-Profit OS running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`API: http://localhost:${PORT}/api`);
});

module.exports = app;
