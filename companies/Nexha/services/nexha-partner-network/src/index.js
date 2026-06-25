'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4297;
const CORPID_URL = process.env.CORPID_URL || 'http://corp-id:4702';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

const partners = new Map();
const relationships = new Map();
const onboardingApplications = new Map();

function log(msg) { console.log(`[${new Date().toISOString()}] [partner-network] ${msg}`); }

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexha-partner-network', version: '0.1.0' }));

// ── Register partner ─────────────────────────────────────────────────
app.post('/api/v1/partners', (req, res) => {
  const { name, type, capabilities, contactEmail, region } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'name and type are required' });
  }
  const id = `partner-${uuidv4().slice(0, 12)}`;
  const partner = {
    id,
    name,
    type,
    capabilities: capabilities || [],
    contactEmail,
    region: region || 'IN',
    tier: 'basic',
    status: 'active',
    onboardingStatus: 'completed',
    registeredAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
  };
  partners.set(id, partner);
  log(`Partner registered: ${id} (${name}, ${type})`);
  res.status(201).json({ success: true, data: partner });
});

// ── Get partner ──────────────────────────────────────────────────────
app.get('/api/v1/partners/:id', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json({ success: true, data: partner });
});

// ── List partners ────────────────────────────────────────────────────
app.get('/api/v1/partners', (req, res) => {
  const { type, region, status, capability } = req.query;
  let list = [...partners.values()];
  if (type) list = list.filter(p => p.type === type);
  if (region) list = list.filter(p => p.region === region);
  if (status) list = list.filter(p => p.status === status);
  if (capability) list = list.filter(p => p.capabilities.includes(capability));
  res.json({ success: true, data: list, total: list.length });
});

// ── Update partner ────────────────────────────────────────────────────
app.put('/api/v1/partners/:id', (req, res) => {
  const partner = partners.get(req.params.id);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  const { capabilities, tier, contactEmail } = req.body;
  if (capabilities) partner.capabilities = capabilities;
  if (tier) partner.tier = tier;
  if (contactEmail) partner.contactEmail = contactEmail;
  partner.lastActivity = new Date().toISOString();
  res.json({ success: true, data: partner });
});

// ── Create relationship ────────────────────────────────────────────────
app.post('/api/v1/relationships', (req, res) => {
  const { partnerA, partnerB, type, terms = {} } = req.body;
  if (!partnerA || !partnerB) {
    return res.status(400).json({ error: 'partnerA and partnerB are required' });
  }
  if (partnerA === partnerB) {
    return res.status(400).json({ error: 'Cannot create relationship with self' });
  }
  const id = `rel-${uuidv4().slice(0, 12)}`;
  const relationship = {
    id,
    partners: [partnerA, partnerB],
    type: type || 'strategic',
    terms,
    status: 'active',
    trustScore: 75,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  relationships.set(id, relationship);
  log(`Relationship created: ${id} (${partnerA} ↔ ${partnerB}, ${type})`);
  res.status(201).json({ success: true, data: relationship });
});

// ── Get relationships for a partner ─────────────────────────────────
app.get('/api/v1/partners/:id/relationships', (req, res) => {
  const list = [...relationships.values()].filter(r => r.partners.includes(req.params.id));
  res.json({ success: true, data: list, total: list.length });
});

// ── Update relationship ──────────────────────────────────────────────
app.put('/api/v1/relationships/:id', (req, res) => {
  const rel = relationships.get(req.params.id);
  if (!rel) return res.status(404).json({ error: 'Relationship not found' });
  const { status, trustScore, terms } = req.body;
  if (status) rel.status = status;
  if (trustScore != null) rel.trustScore = trustScore;
  if (terms) rel.terms = { ...rel.terms, ...terms };
  rel.updatedAt = new Date().toISOString();
  res.json({ success: true, data: rel });
});

// ── Onboarding application ───────────────────────────────────────────
app.post('/api/v1/onboarding/apply', (req, res) => {
  const { companyName, type, contactEmail, capabilities, region } = req.body;
  if (!companyName || !contactEmail) {
    return res.status(400).json({ error: 'companyName and contactEmail are required' });
  }
  const appId = `onboard-${uuidv4().slice(0, 12)}`;
  const application = {
    id: appId,
    companyName,
    type,
    contactEmail,
    capabilities: capabilities || [],
    region: region || 'IN',
    status: 'submitted',
    checklist: {
      businessInfo: 'pending',
      kyb: 'pending',
      contract: 'pending',
      bankDetails: 'pending',
      apiIntegration: 'pending',
    },
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };
  onboardingApplications.set(appId, application);
  log(`Onboarding application: ${appId} (${companyName})`);
  res.status(201).json({ success: true, data: application });
});

app.get('/api/v1/onboarding/:id', (req, res) => {
  const app = onboardingApplications.get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  res.json({ success: true, data: app });
});

app.patch('/api/v1/onboarding/:id/checklist', (req, res) => {
  const app = onboardingApplications.get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });
  const { item, status } = req.body;
  if (!item || !status) return res.status(400).json({ error: 'item and status are required' });
  app.checklist[item] = status;
  const allDone = Object.values(app.checklist).every(s => s === 'completed');
  if (allDone && app.status !== 'approved') {
    app.status = 'approved';
    app.reviewedAt = new Date().toISOString();
    log(`Onboarding approved: ${app.id} — ${app.companyName}`);
  }
  res.json({ success: true, data: app });
});

// ── Stats ────────────────────────────────────────────────────────────
app.get('/api/v1/stats', (_req, res) => {
  const allPartners = [...partners.values()];
  const allRels = [...relationships.values()];
  res.json({
    partners: { total: allPartners.length, active: allPartners.filter(p => p.status === 'active').length },
    relationships: { total: allRels.length, active: allRels.filter(r => r.status === 'active').length },
    onboarding: {
      submitted: [...onboardingApplications.values()].filter(a => a.status === 'submitted').length,
      approved: [...onboardingApplications.values()].filter(a => a.status === 'approved').length,
    },
  });
});

app.listen(PORT, () => {
  log(`Nexha Partner Network running on port ${PORT}`);
  log(`  CorpID: ${CORPID_URL}`);
});
