'use strict';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4290;
const CORPID_URL = process.env.CORPID_URL || 'http://corp-id:4702';

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(rateLimit({ windowMs: 60000, max: 100 }));

const businesses = new Map();
const kybChecks = new Map();
const complianceAlerts = [];

function log(msg) { console.log(`[${new Date().toISOString()}] [compliance-network] ${msg}`); }

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'nexha-compliance-network', version: '0.1.0' }));

// ── Submit KYB check ─────────────────────────────────────────────────
app.post('/api/v1/kyb', async (req, res) => {
  const { businessId, legalName, registrationNumber, jurisdiction, riskTier = 'standard' } = req.body;
  if (!businessId || !legalName) {
    return res.status(400).json({ error: 'businessId and legalName are required' });
  }
  const checkId = `kyb-${uuidv4().slice(0, 12)}`;
  const kyb = {
    id: checkId,
    businessId,
    legalName,
    registrationNumber,
    jurisdiction: jurisdiction || 'IN',
    riskTier,
    status: 'pending',
    checks: {
      identity: 'pending',
      registration: 'pending',
      sanctions: 'pending',
      adverseMedia: 'pending',
    },
    overallRisk: null,
    submittedAt: new Date().toISOString(),
    completedAt: null,
  };

  // Simulate async checks
  setTimeout(() => {
    kyb.checks.identity = 'passed';
    kyb.checks.registration = registrationNumber ? 'passed' : 'skipped';
    kyb.checks.sanctions = Math.random() > 0.05 ? 'passed' : 'flagged';
    kyb.checks.adverseMedia = Math.random() > 0.1 ? 'passed' : 'flagged';
    const failed = Object.values(kyb.checks).filter(s => s === 'flagged').length;
    if (failed === 0) {
      kyb.status = 'approved';
      kyb.overallRisk = 'low';
    } else if (failed <= 2) {
      kyb.status = 'review_required';
      kyb.overallRisk = 'medium';
    } else {
      kyb.status = 'rejected';
      kyb.overallRisk = 'high';
    }
    kyb.completedAt = new Date().toISOString();
    kybChecks.set(checkId, kyb);
    log(`KYB ${checkId}: ${kyb.status} (risk: ${kyb.overallRisk})`);
  }, 500);

  kybChecks.set(checkId, kyb);
  log(`KYB submitted: ${checkId} for ${legalName}`);
  res.status(202).json({ success: true, data: kyb });
});

// ── Get KYB status ───────────────────────────────────────────────────
app.get('/api/v1/kyb/:id', (req, res) => {
  const kyb = kybChecks.get(req.params.id);
  if (!kyb) return res.status(404).json({ error: 'KYB check not found' });
  res.json({ success: true, data: kyb });
});

// ── Register business (post KYB approval) ────────────────────────────
app.post('/api/v1/businesses', async (req, res) => {
  const { businessId, legalName, kybCheckId, sectors, size } = req.body;
  if (!businessId) return res.status(400).json({ error: 'businessId required' });

  // Verify KYB if provided
  if (kybCheckId) {
    const kyb = kybChecks.get(kybCheckId);
    if (!kyb) return res.status(400).json({ error: 'KYB check not found' });
    if (kyb.status !== 'approved') {
      return res.status(400).json({ error: `KYB not approved (status: ${kyb.status})` });
    }
  }

  const business = {
    id: `biz-${uuidv4().slice(0, 12)}`,
    businessId,
    legalName,
    kybCheckId,
    sectors: sectors || [],
    size: size || 'unknown',
    complianceStatus: kybCheckId ? 'verified' : 'unverified',
    registeredAt: new Date().toISOString(),
  };
  businesses.set(business.id, business);
  log(`Business registered: ${business.id} (${legalName})`);
  res.status(201).json({ success: true, data: business });
});

// ── Get business ─────────────────────────────────────────────────────
app.get('/api/v1/businesses/:id', (req, res) => {
  const biz = businesses.get(req.params.id);
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  res.json({ success: true, data: biz });
});

// ── List businesses ───────────────────────────────────────────────────
app.get('/api/v1/businesses', (req, res) => {
  const { status, sector } = req.query;
  let list = [...businesses.values()];
  if (status) list = list.filter(b => b.complianceStatus === status);
  if (sector) list = list.filter(b => b.sectors.includes(sector));
  res.json({ success: true, data: list, total: list.length });
});

// ── Compliance alerts ────────────────────────────────────────────────
app.post('/api/v1/alerts', (req, res) => {
  const { businessId, severity, reason, source } = req.body;
  if (!businessId || !reason) {
    return res.status(400).json({ error: 'businessId and reason are required' });
  }
  const alert = {
    id: `alert-${uuidv4().slice(0, 12)}`,
    businessId,
    severity: severity || 'medium',
    reason,
    source: source || 'system',
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
  complianceAlerts.push(alert);
  log(`ALERT [${severity?.toUpperCase() ?? 'MEDIUM'}]: ${reason} (biz: ${businessId})`);
  res.status(201).json({ success: true, data: alert });
});

app.get('/api/v1/alerts', (req, res) => {
  const { acknowledged } = req.query;
  let list = [...complianceAlerts];
  if (acknowledked === 'false') list = list.filter(a => !a.acknowledged);
  res.json({ success: true, data: list, total: list.length });
});

app.patch('/api/v1/alerts/:id/acknowledge', (req, res) => {
  const alert = complianceAlerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  res.json({ success: true, data: alert });
});

// ── Stats ────────────────────────────────────────────────────────────
app.get('/api/v1/stats', (_req, res) => {
  const allKyb = [...kybChecks.values()];
  res.json({
    businesses: { total: businesses.size },
    kyb: {
      total: allKyb.length,
      approved: allKyb.filter(k => k.status === 'approved').length,
      rejected: allKyb.filter(k => k.status === 'rejected').length,
      pending: allKyb.filter(k => k.status === 'pending').length,
      reviewRequired: allKyb.filter(k => k.status === 'review_required').length,
    },
    alerts: {
      total: complianceAlerts.length,
      unacknowledged: complianceAlerts.filter(a => !a.acknowledged).length,
    },
  });
});

app.listen(PORT, () => {
  log(`Nexha Compliance Network running on port ${PORT}`);
  log(`  CorpID: ${CORPID_URL}`);
});
