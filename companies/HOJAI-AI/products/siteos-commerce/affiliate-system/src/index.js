/**
 * HOJAI SiteOS Affiliate System
 * Port: 5493
 * Partner tracking, commissions, payouts
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 5493;
const STORAGE_PATH = process.env.STORAGE_PATH || '/tmp';

app.use(helmet());
app.use(cors());
app.use(express.json());

const requireAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers.authorization?.replace('Bearer ', '');
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.companyId = req.headers['x-company-id'] || 'default';
  next();
};

const getFile = (companyId, type) => `${STORAGE_PATH}/affiliate-${type}-${companyId}.json`;
const loadData = (companyId, type) => {
  const file = getFile(companyId, type);
  if (existsSync(file)) {
    try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return []; }
  }
  return [];
};
const saveData = (companyId, type, data) => {
  writeFileSync(getFile(companyId, type), JSON.stringify(data, null, 2));
};

// Commission types
const COMMISSION_TYPES = {
  CPS: { name: 'Cost Per Sale', default: 10 }, // % of sale
  CPL: { name: 'Cost Per Lead', default: 50 }, // fixed per lead
  CPA: { name: 'Cost Per Action', default: 25 }  // fixed per action
};

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'affiliate-system', port: PORT });
});

// Register partner
app.post('/api/partners', requireAuth, (req, res) => {
  const { name, email, phone, company, type = 'affiliate', commissionType = 'CPS', commissionValue } = req.body;
  if (!name || !email) return res.status(400).json({ error: 'name and email required' });

  const partner = {
    id: uuidv4(),
    companyId: req.companyId,
    name, email, phone, company,
    type,
    code: `REF${Date.now().toString(36).toUpperCase()}`,
    commissionType,
    commissionValue: commissionValue || COMMISSION_TYPES[commissionType].default,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  const partners = loadData(req.companyId, 'partners');
  partners.push(partner);
  saveData(req.companyId, 'partners', partners);

  res.json({ success: true, partner });
});

// Get partners
app.get('/api/partners', requireAuth, (req, res) => {
  const { status, search } = req.query;
  let partners = loadData(req.companyId, 'partners');

  if (status) partners = partners.filter(p => p.status === status);
  if (search) {
    const s = search.toLowerCase();
    partners = partners.filter(p => p.name.toLowerCase().includes(s) || p.email.toLowerCase().includes(s));
  }

  res.json({ partners });
});

// Get partner by code
app.get('/api/partners/code/:code', requireAuth, (req, res) => {
  const partners = loadData(req.companyId, 'partners');
  const partner = partners.find(p => p.code === req.params.code);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });
  res.json({ partner });
});

// Update partner
app.put('/api/partners/:id', requireAuth, (req, res) => {
  const partners = loadData(req.companyId, 'partners');
  const index = partners.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Partner not found' });

  partners[index] = { ...partners[index], ...req.body, id: req.params.id };
  saveData(req.companyId, 'partners', partners);
  res.json({ success: true, partner: partners[index] });
});

// Create referral link click
app.post('/api/links/click', (req, res) => {
  const { code, visitorId, source } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });

  const partners = loadData('global', 'partners');
  const partner = partners.find(p => p.code === code);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  const click = {
    id: uuidv4(),
    partnerId: partner.id,
    visitorId,
    source,
    clickedAt: new Date().toISOString(),
    converted: false
  };

  const clicks = loadData(partner.companyId, 'clicks');
  clicks.push(click);
  saveData(partner.companyId, 'clicks', clicks);

  res.json({ success: true, click });
});

// Record conversion (sale/lead/action)
app.post('/api/conversions', requireAuth, (req, res) => {
  const { partnerCode, visitorId, type, value, orderId } = req.body;
  if (!partnerCode || !type) return res.status(400).json({ error: 'partnerCode and type required' });

  const partners = loadData(req.companyId, 'partners');
  const partner = partners.find(p => p.code === partnerCode);
  if (!partner) return res.status(404).json({ error: 'Partner not found' });

  // Calculate commission
  let commission = 0;
  if (type === 'sale' && partner.commissionType === 'CPS') {
    commission = (value * partner.commissionValue) / 100;
  } else if (type === 'lead' && partner.commissionType === 'CPL') {
    commission = partner.commissionValue;
  } else if (type === 'action' && partner.commissionType === 'CPA') {
    commission = partner.commissionValue;
  }

  const conversion = {
    id: uuidv4(),
    companyId: req.companyId,
    partnerId: partner.id,
    partnerCode,
    visitorId,
    type,
    value: value || 0,
    commission,
    orderId,
    status: 'pending',
    paidAt: null,
    createdAt: new Date().toISOString()
  };

  const conversions = loadData(req.companyId, 'conversions');
  conversions.push(conversion);
  saveData(req.companyId, 'conversions', conversions);

  res.json({ success: true, conversion });
});

// Get conversions for partner
app.get('/api/conversions/:partnerId', requireAuth, (req, res) => {
  const conversions = loadData(req.companyId, 'conversions')
    .filter(c => c.partnerId === req.params.partnerId);
  res.json({ conversions });
});

// Partner stats
app.get('/api/partners/:id/stats', requireAuth, (req, res) => {
  const conversions = loadData(req.companyId, 'conversions')
    .filter(c => c.partnerId === req.params.id);
  const clicks = loadData(req.companyId, 'clicks')
    .filter(c => c.partnerId === req.params.id);

  const sales = conversions.filter(c => c.type === 'sale');
  const pendingCommission = conversions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission, 0);
  const paidCommission = conversions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission, 0);

  res.json({
    clicks: clicks.length,
    conversions: conversions.length,
    sales: sales.length,
    totalCommission: pendingCommission + paidCommission,
    pendingCommission,
    paidCommission,
    conversionRate: clicks.length > 0 ? ((conversions.length / clicks.length) * 100).toFixed(2) : 0
  });
});

// Request payout
app.post('/api/payouts', requireAuth, (req, res) => {
  const { partnerId, method, details } = req.body;
  if (!partnerId) return res.status(400).json({ error: 'partnerId required' });

  const conversions = loadData(req.companyId, 'conversions')
    .filter(c => c.partnerId === partnerId && c.status === 'pending');

  if (conversions.length === 0) {
    return res.status(400).json({ error: 'No pending commissions to payout' });
  }

  const amount = conversions.reduce((sum, c) => sum + c.commission, 0);

  const payout = {
    id: uuidv4(),
    companyId: req.companyId,
    partnerId,
    amount,
    method,
    details,
    status: 'pending',
    paidAt: null,
    conversions: conversions.map(c => c.id),
    createdAt: new Date().toISOString()
  };

  const payouts = loadData(req.companyId, 'payouts');
  payouts.push(payout);
  saveData(req.companyId, 'payouts', payouts);

  res.json({ success: true, payout });
});

// Approve payout
app.post('/api/payouts/:id/approve', requireAuth, (req, res) => {
  const payouts = loadData(req.companyId, 'payouts');
  const index = payouts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Payout not found' });

  payouts[index].status = 'approved';
  payouts[index].approvedAt = new Date().toISOString();
  saveData(req.companyId, 'payouts', payouts);

  // Mark conversions as paid
  const conversions = loadData(req.companyId, 'conversions');
  payouts[index].conversions.forEach(convId => {
    const cIndex = conversions.findIndex(c => c.id === convId);
    if (cIndex !== -1) {
      conversions[cIndex].status = 'paid';
      conversions[cIndex].paidAt = new Date().toISOString();
    }
  });
  saveData(req.companyId, 'conversions', conversions);

  res.json({ success: true, payout: payouts[index] });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Affiliate System running on port ${PORT}`);
});

export default app;
