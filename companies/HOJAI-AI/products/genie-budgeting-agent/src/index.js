/**
 * Genie Budgeting Agent — port 4721.
 *
 * Capabilities: budget-tracking, runway-forecast, variance-analysis, board-reporting.
 *
 * Endpoints:
 *   GET    /health, /ready, /info
 *   POST   /api/v1/budget/track             — log expense or income
 *   POST   /api/v1/budget/forecast          — forecast runway
 *   POST   /api/v1/budget/variance          — actual vs planned variance
 *   POST   /api/v1/budget/board-report      — generate board-ready report
 *   GET    /api/v1/budget/categories        — default expense categories
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = parseInt(process.env.BUDGETING_PORT || '4721');
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUIRE_AUTH = process.env.BUDGETING_REQUIRE_AUTH !== 'false';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function apiResponse(success, data, error) {
  return { success, data, error, timestamp: new Date().toISOString() };
}

function apiKeyAuth(req, res, next) {
  if (!REQUIRE_AUTH) return next();
  const auth = req.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json(apiResponse(false, undefined, 'Auth required'));
  if (HOJAI_API_KEY && token !== HOJAI_API_KEY) return res.status(401).json(apiResponse(false, undefined, 'Invalid key'));
  next();
}

const transactions = []; // { id, companyId, category, amountUsd, type, date, notes }

const CATEGORIES = {
  revenue: ['Product Sales', 'Subscription', 'Services', 'Investment', 'Other Revenue'],
  expense: [
    'Payroll', 'Marketing', 'Sales', 'Engineering', 'Operations',
    'Office & Rent', 'Software & SaaS', 'Travel', 'Legal', 'Accounting',
    'Customer Support', 'Research & Development', 'Misc'
  ]
};

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'genie-budgeting', version: '1.0.0', port: PORT }));
app.get('/ready', (_req, res) => res.json({ ready: true, transactions: transactions.length, port: PORT }));

app.get('/info', (_req, res) => {
  res.json(apiResponse(true, {
    name: 'Genie Budgeting',
    version: '1.0.0',
    capabilities: ['budget-tracking', 'runway-forecast', 'variance-analysis', 'board-reporting']
  }));
});

app.get('/api/v1/budget/categories', (_req, res) => {
  res.json(apiResponse(true, CATEGORIES));
});

app.post('/api/v1/budget/track', apiKeyAuth, (req, res) => {
  const { companyId, category, amountUsd, type, date, notes } = req.body || {};
  if (!companyId || !category || !amountUsd || !type) {
    return res.status(400).json(apiResponse(false, undefined, 'companyId, category, amountUsd, type are required'));
  }
  if (!['revenue', 'expense'].includes(type)) {
    return res.status(400).json(apiResponse(false, undefined, 'type must be revenue or expense'));
  }
  const validCats = CATEGORIES[type];
  if (!validCats.includes(category)) {
    return res.status(400).json(apiResponse(false, undefined, `category must be one of: ${validCats.join(', ')}`));
  }

  const tx = {
    id: 'TX' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    companyId,
    category,
    amountUsd: parseFloat(amountUsd),
    type,
    date: date || new Date().toISOString().slice(0, 10),
    notes: notes || ''
  };
  transactions.push(tx);
  res.status(201).json(apiResponse(true, tx));
});

app.post('/api/v1/budget/forecast', apiKeyAuth, (req, res) => {
  const { companyId, monthlyRevenue, monthlyExpenses, currentCashUsd, months = 12 } = req.body || {};
  if (typeof monthlyRevenue !== 'number' || typeof monthlyExpenses !== 'number' || typeof currentCashUsd !== 'number') {
    return res.status(400).json(apiResponse(false, undefined, 'monthlyRevenue, monthlyExpenses, currentCashUsd (all numbers) required'));
  }

  const forecast = projectRunway(currentCashUsd, monthlyRevenue, monthlyExpenses, months);
  res.json(apiResponse(true, forecast));
});

app.post('/api/v1/budget/variance', apiKeyAuth, (req, res) => {
  const { companyId, period, planned, actual } = req.body || {};
  if (!Array.isArray(planned) || !Array.isArray(actual)) {
    return res.status(400).json(apiResponse(false, undefined, 'planned and actual must be arrays of {category, amountUsd}'));
  }

  const variance = computeVariance(planned, actual);
  res.json(apiResponse(true, {
    companyId,
    period: period || 'current',
    ...variance
  }));
});

app.post('/api/v1/budget/board-report', apiKeyAuth, (req, res) => {
  const { companyId, quarter, transactions: providedTx } = req.body || {};
  const txSource = providedTx || transactions.filter((t) => !companyId || t.companyId === companyId);
  const report = generateBoardReport(companyId || 'all', quarter || 'current', txSource);
  res.json(apiResponse(true, report));
});

// ─── Calculations ──────────────────────────────────────────────────────

function projectRunway(currentCashUsd, monthlyRevenue, monthlyExpenses, months) {
  const monthlyBurn = monthlyExpenses - monthlyRevenue;
  const projection = [];
  let cash = currentCashUsd;

  for (let m = 1; m <= months; m++) {
    cash = cash - monthlyBurn;
    projection.push({
      month: m,
      cashUsd: Math.round(cash * 100) / 100,
      monthlyBurn,
      runwayMonths: monthlyBurn > 0 ? Math.round((cash / monthlyBurn) * 10) / 10 : null
    });
    if (cash < 0) break;
  }

  const runwayMonths = monthlyBurn > 0
    ? Math.round((currentCashUsd / monthlyBurn) * 10) / 10
    : Infinity;

  const defaultOut = {
    companyId: 'unknown',
    currentCashUsd,
    monthlyRevenue,
    monthlyExpenses,
    monthlyBurn,
    runwayMonths,
    status: monthlyBurn <= 0 ? 'profitable' : runwayMonths < 3 ? 'critical' : runwayMonths < 6 ? 'warning' : 'healthy',
    projection,
    recommendation: runwayMonths < 6
      ? 'Cut burn or raise capital within 60 days'
      : 'Runway is healthy; focus on growth'
  };
  return defaultOut;
}

function computeVariance(planned, actual) {
  const variance = [];
  let totalPlanned = 0;
  let totalActual = 0;

  const plannedMap = new Map(planned.map((p) => [p.category, parseFloat(p.amountUsd) || 0]));
  const actualMap = new Map(actual.map((a) => [a.category, parseFloat(a.amountUsd) || 0]));

  // Union of categories
  const cats = new Set([...plannedMap.keys(), ...actualMap.keys()]);
  for (const cat of cats) {
    const p = plannedMap.get(cat) || 0;
    const a = actualMap.get(cat) || 0;
    const diff = a - p;
    const pct = p !== 0 ? Math.round((diff / p) * 1000) / 10 : (a > 0 ? 100 : 0);
    variance.push({
      category: cat,
      planned: p,
      actual: a,
      diff,
      variancePct: pct,
      status: Math.abs(pct) <= 5 ? 'on-track' : Math.abs(pct) <= 15 ? 'minor' : 'major'
    });
    totalPlanned += p;
    totalActual += a;
  }

  return {
    variance: variance.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff)),
    totalPlanned,
    totalActual,
    totalDiff: totalActual - totalPlanned,
    totalVariancePct: totalPlanned > 0 ? Math.round(((totalActual - totalPlanned) / totalPlanned) * 1000) / 10 : 0
  };
}

function generateBoardReport(companyId, quarter, tx) {
  const revenue = tx.filter((t) => t.type === 'revenue').reduce((s, t) => s + t.amountUsd, 0);
  const expenses = tx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amountUsd, 0);
  const net = revenue - expenses;

  // Top categories
  const byCat = {};
  for (const t of tx) {
    if (!byCat[t.category]) byCat[t.category] = { revenue: 0, expense: 0 };
    byCat[t.category][t.type] += t.amountUsd;
  }
  const topCats = Object.entries(byCat)
    .map(([cat, v]) => ({ category: cat, revenue: v.revenue, expense: v.expense, net: v.revenue - v.expense }))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 5);

  return {
    companyId,
    quarter,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRevenueUsd: Math.round(revenue * 100) / 100,
      totalExpensesUsd: Math.round(expenses * 100) / 100,
      netIncomeUsd: Math.round(net * 100) / 100,
      marginPct: revenue > 0 ? Math.round((net / revenue) * 1000) / 10 : 0,
      transactionCount: tx.length
    },
    topCategories: topCats,
    highlights: [
      net > 0 ? `Positive net income of $${Math.round(net).toLocaleString()}` : `Net loss of $${Math.round(-net).toLocaleString()}`,
      `${tx.length} transactions tracked this period`,
      topCats.length > 0 ? `Top driver: ${topCats[0].category} ($${Math.round(Math.abs(topCats[0].net)).toLocaleString()})` : 'No category breakdown available'
    ],
    nextSteps: net < 0
      ? ['Reduce discretionary spending', 'Accelerate receivables', 'Review pricing strategy']
      : ['Reinvest in growth', 'Build 6-month cash buffer', 'Explore new revenue lines']
  };
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[genie-budgeting] listening on :${PORT}`);
    console.log(`[genie-budgeting] auth: ${REQUIRE_AUTH ? 'required' : 'disabled'}`);
  });
}

module.exports = { app, projectRunway, computeVariance, generateBoardReport, CATEGORIES };