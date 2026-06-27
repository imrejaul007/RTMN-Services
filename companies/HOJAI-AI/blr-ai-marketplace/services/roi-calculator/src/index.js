/**
 * BLR AI Marketplace — ROI Calculator (port 4259)
 *
 * Compute ROI, payback period, NPV, IRR for AI agent / service investments.
 * Designed for "should we buy this marketplace agent?" / "is our custom
 * training service worth the compute spend?" decisions.
 *
 * Endpoints:
 *   POST /api/calculations              Create + run a calculation
 *   GET  /api/calculations              List calculations
 *   GET  /api/calculations/:id          Get calculation detail
 *   DELETE /api/calculations/:id        Remove calculation
 *   POST /api/calculations/compare      Compare 2+ calculations side-by-side
 *   POST /api/quick-roi                 One-shot simple ROI (single year + investment)
 *   GET  /api/templates                 List built-in scenario templates
 *   GET  /health
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4259;
const SERVICE_NAME = 'sutar-roi-calculator';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

const calculations = new PersistentMap('calculations', { serviceName: 'roi-calculator' });

const TEMPLATES = {
  'agent-purchase': {
    name: 'Marketplace Agent Purchase',
    description: 'Compute ROI of buying/subscribing to a marketplace agent',
    defaults: {
      upfrontCost: 1000,
      monthlyRevenue: 500,
      monthlyCost: 100,
      horizonMonths: 12,
      discountRate: 0.10
    }
  },
  'training-investment': {
    name: 'Custom Training Investment',
    description: 'ROI of investing in custom model training (GPU spend + expected gains)',
    defaults: {
      upfrontCost: 50000,
      monthlyRevenue: 8000,
      monthlyCost: 2000,
      horizonMonths: 24,
      discountRate: 0.12
    }
  },
  'service-rollout': {
    name: 'Internal Service Rollout',
    description: 'ROI of deploying a service for internal use across departments',
    defaults: {
      upfrontCost: 20000,
      monthlyRevenue: 3000,
      monthlyCost: 500,
      horizonMonths: 18,
      discountRate: 0.08
    }
  }
};

function npv(cashFlows, rate) {
  return cashFlows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

function irr(cashFlows, guess = 0.1) {
  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    let npvVal = 0, dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npvVal += cashFlows[t] / denom;
      if (t > 0) dnpv -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(npvVal) < 0.001) return rate;
    if (Math.abs(dnpv) < 0.0001) break;
    const newRate = rate - npvVal / dnpv;
    if (Math.abs(newRate - rate) < 0.0001) return newRate;
    rate = newRate;
    if (rate < -0.99) rate = -0.99;
  }
  return rate;
}

function paybackMonths(cashFlows) {
  let cum = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    cum += cashFlows[i];
    if (cum >= 0) return i;
  }
  return cashFlows.length;
}

function runCalc(input) {
  const { upfrontCost, monthlyRevenue, monthlyCost, horizonMonths, discountRate } = input;
  const cashFlows = [-upfrontCost];
  const monthlyCF = [];
  for (let m = 1; m <= horizonMonths; m++) {
    const cf = monthlyRevenue - monthlyCost;
    monthlyCF.push(cf);
    cashFlows.push(cf);
  }

  const totalRevenue = monthlyRevenue * horizonMonths;
  const totalCost = upfrontCost + monthlyCost * horizonMonths;
  const totalProfit = totalRevenue - totalCost;
  const roi = totalProfit / upfrontCost;
  const payback = paybackMonths(cashFlows);
  const calcNpv = npv(cashFlows, discountRate / 12);
  const calcIrr = irr(cashFlows);

  return {
    totalRevenue: Number(totalRevenue.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    roi: Number(roi.toFixed(4)),
    roiPercent: `${(roi * 100).toFixed(1)}%`,
    paybackMonths: payback,
    paybackLabel: payback < horizonMonths ? `${payback} months` : 'beyond horizon',
    npv: Number(calcNpv.toFixed(2)),
    irr: Number((calcIrr * 12 * 100).toFixed(2)), // annualize
    irrLabel: `${(calcIrr * 12 * 100).toFixed(1)}% annual`,
    breakEven: payback <= horizonMonths
  };
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    sutarLayer: 7,
    layer: 'Economy / ROI',
    port: PORT,
    counts: { calculations: calculations.size, templates: Object.keys(TEMPLATES).length },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/calculations',requireAuth,  (req, res) => {
  const { name, template, ...rest } = req.body || {};
  let input;
  if (template && TEMPLATES[template]) {
    input = { ...TEMPLATES[template].defaults, ...rest };
  } else if (rest.upfrontCost != null && rest.monthlyRevenue != null) {
    input = rest;
  } else {
    return res.status(400).json({ error: 'Provide template + overrides OR upfrontCost + monthlyRevenue + monthlyCost + horizonMonths' });
  }
  try {
    const results = runCalc(input);
    const id = uuid();
    const calc = { id, name: name || template || 'Custom', template: template || null, input, results, createdAt: Date.now() };
    calculations.set(id, calc);
    res.status(201).json({ calculation: calc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/calculations', (req, res) => {
  const rows = Array.from(calculations.values()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  res.json({ count: rows.length, calculations: rows });
});

app.get('/api/calculations/:id', (req, res) => {
  const calc = calculations.get(req.params.id);
  if (!calc) return res.status(404).json({ error: 'Calculation not found' });
  res.json({ calculation: calc });
});

app.delete('/api/calculations/:id',requireAuth,  (req, res) => {
  if (!calculations.has(req.params.id)) return res.status(404).json({ error: 'Not found' });
  calculations.delete(req.params.id);
  res.json({ deleted: true });
});

app.post('/api/calculations/compare',requireAuth,  (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length < 2) return res.status(400).json({ error: 'ids must be array of >= 2' });
  const rows = ids.map(id => calculations.get(id)).filter(Boolean);
  if (rows.length !== ids.length) return res.status(404).json({ error: 'Some IDs not found' });
  res.json({
    comparison: rows.map(r => ({
      id: r.id, name: r.name, template: r.template,
      roi: r.results.roi, npv: r.results.npv, paybackMonths: r.results.paybackMonths, breakEven: r.results.breakEven
    }))
  });
});

app.post('/api/quick-roi',requireAuth,  (req, res) => {
  const { investment, annualGain } = req.body || {};
  if (investment == null || annualGain == null) return res.status(400).json({ error: 'investment and annualGain required' });
  const roi = (annualGain - investment) / investment;
  const paybackYears = annualGain > 0 ? investment / annualGain : null;
  res.json({
    investment,
    annualGain,
    netProfit: annualGain - investment,
    roi: Number(roi.toFixed(4)),
    roiPercent: `${(roi * 100).toFixed(1)}%`,
    paybackYears: paybackYears ? Number(paybackYears.toFixed(2)) : null
  });
});

app.get('/api/templates', (_req, res) => {
  res.json({ count: Object.keys(TEMPLATES).length, templates: Object.entries(TEMPLATES).map(([id, t]) => ({ id, ...t })) });
});

app.get('/', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    sutar: 'Layer 7 — Economy / ROI',
    port: PORT,
    templates: Object.keys(TEMPLATES),
    endpoints: [
      'POST /api/calculations',
      'GET  /api/calculations',
      'GET  /api/calculations/:id',
      'DELETE /api/calculations/:id',
      'POST /api/calculations/compare',
      'POST /api/quick-roi',
      'GET  /api/templates',
      'GET  /health'
    ]
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] templates: ${Object.keys(TEMPLATES).join(', ')}`);
});installGracefulShutdown(server);
