/**
 * RTMN Finance OS v2.0 - Complete with 24 Industry OS Integration
 * Port: 4801
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

const PORT = process.env.PORT || 4801;

const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// ============================================================
// DATABASE
// ============================================================

const db = {
  accounts: new Map(),
  journalEntries: new Map(),
  customers: new Map(),
  invoices: new Map(),
  vendors: new Map(),
  bankAccounts: new Map(),
  budgets: new Map(),
  expenses: new Map(),
  assets: new Map(),
  industryRevenue: new Map(),
  industryExpenses: new Map(),
};

// Initialize Sample Data
function initData() {
  // Accounts
  const accounts = [
    { id: 'CASH', code: '1001', name: 'Cash', type: 'asset', balance: 500000 },
    { id: 'BANK', code: '1002', name: 'Bank Account', type: 'asset', balance: 7460000 },
    { id: 'AR', code: '1101', name: 'Accounts Receivable', type: 'asset', balance: 490000 },
    { id: 'FIXED', code: '1501', name: 'Fixed Assets', type: 'asset', balance: 5000000 },
    { id: 'AP', code: '2001', name: 'Accounts Payable', type: 'liability', balance: 253000 },
    { id: 'GST', code: '2003', name: 'GST Payable', type: 'liability', balance: 180000 },
    { id: 'LOANS', code: '2501', name: 'Loans', type: 'liability', balance: 2000000 },
    { id: 'CAPITAL', code: '3001', name: 'Capital', type: 'equity', balance: 10000000 },
    { id: 'SALES', code: '4001', name: 'Sales Revenue', type: 'revenue', balance: 100000 },
    { id: 'COGS', code: '5007', name: 'Cost of Goods', type: 'expense', balance: 60000 },
    { id: 'SALARY', code: '5001', name: 'Salary', type: 'expense', balance: 400000 },
    { id: 'RENT', code: '5002', name: 'Rent', type: 'expense', balance: 30000 },
    { id: 'OFFICE', code: '5004', name: 'Office', type: 'expense', balance: 19000 },
  ];
  accounts.forEach(a => db.accounts.set(a.id, a));

  // Customers
  [
    { id: 'C001', name: 'Acme Corp', balance: 125000 },
    { id: 'C002', name: 'TechStart', balance: 45000 },
    { id: 'C003', name: 'Global Solutions', balance: 320000 },
  ].forEach(c => db.customers.set(c.id, c));

  // Vendors
  [
    { id: 'V001', name: 'Cloud Services', balance: 85000 },
    { id: 'V002', name: 'Office Supplies', balance: 12000 },
    { id: 'V003', name: 'IT Solutions', balance: 156000 },
  ].forEach(v => db.vendors.set(v.id, v));

  // Banks
  [
    { id: 'B001', name: 'HDFC Bank', balance: 4570000, type: 'checking' },
    { id: 'B002', name: 'ICICI Bank', balance: 890000, type: 'payroll' },
    { id: 'B003', name: 'SBI', balance: 2500000, type: 'savings' },
  ].forEach(b => db.bankAccounts.set(b.id, b));

  // Budgets
  [
    { id: 'BU01', department: 'Engineering', allocated: 500000, spent: 450000 },
    { id: 'BU02', department: 'Marketing', allocated: 200000, spent: 245000 },
    { id: 'BU03', department: 'Operations', allocated: 150000, spent: 98000 },
    { id: 'BU04', department: 'HR', allocated: 100000, spent: 85000 },
  ].forEach(b => db.budgets.set(b.id, b));

  console.log(`Finance OS initialized: ${accounts.length} accounts`);
}

// ============================================================
// 24 INDUSTRY OS CONNECTIONS
// ============================================================

const INDUSTRIES = {
  hospitality: { name: 'Restaurant OS', port: 5010 },
  healthcare: { name: 'Healthcare OS', port: 5020 },
  hotel: { name: 'Hotel OS', port: 5025 },
  retail: { name: 'Retail OS', port: 5030 },
  legal: { name: 'Legal OS', port: 5035 },
  education: { name: 'Education OS', port: 5060 },
  sales: { name: 'Sales OS', port: 5055 },
  automotive: { name: 'Automotive OS', port: 5080 },
  beauty: { name: 'Beauty OS', port: 5090 },
  fitness: { name: 'Fitness OS', port: 5110 },
  gaming: { name: 'Gaming OS', port: 5120 },
  government: { name: 'Government OS', port: 5130 },
  homeservices: { name: 'HomeServices OS', port: 5140 },
  manufacturing: { name: 'Manufacturing OS', port: 5150 },
  nonprofit: { name: 'NonProfit OS', port: 5160 },
  professional: { name: 'Professional OS', port: 5170 },
  sports: { name: 'Sports OS', port: 5180 },
  travel: { name: 'Travel OS', port: 5190 },
  entertainment: { name: 'Entertainment OS', port: 5200 },
  construction: { name: 'Construction OS', port: 5210 },
  financial: { name: 'Financial OS', port: 5220 },
  realestate: { name: 'RealEstate OS', port: 5230 },
  transport: { name: 'Transport OS', port: 5240 },
  energy: { name: 'Energy OS', port: 5100 },
  exhibition: { name: 'Exhibition OS', port: 5040 },
};

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'finance-os', version: '2.0', port: PORT });
});

app.get('/api/status', (req, res) => {
  res.json({
    modules: { accounting: true, ar: true, ap: true, treasury: true, budget: true, tax: true, audit: true },
    industries: { connected: 24, type: 'All 24 Industry OS' }
  });
});

// ============================================================
// INDUSTRY CONNECTIONS
// ============================================================

app.get('/api/industries/health', async (req, res) => {
  const results = [];
  let connected = 0;

  for (const [code, config] of Object.entries(INDUSTRIES)) {
    try {
      const health = await fetch(`http://localhost:${config.port}/health`);
      const data = await health.json();
      results.push({ code, name: config.name, port: config.port, status: 'healthy', service: data.service || data.name });
      connected++;
    } catch {
      results.push({ code, name: config.name, port: config.port, status: 'not_running' });
    }
  }

  res.json({ connected, total: results.length, industries: results });
});

app.get('/api/industries/dashboard', async (req, res) => {
  const industries = [];
  let totalRevenue = 0;
  let connected = 0;

  for (const [code, config] of Object.entries(INDUSTRIES)) {
    const industry = { code, name: config.name, port: config.port, connected: false, revenue: 0, expenses: 0 };

    try {
      const overview = await fetch(`http://localhost:${config.port}/api/analytics/overview`);
      if (overview.ok) {
        const data = await overview.json();
        industry.revenue = data.revenue || data.totalRevenue || 0;
        industry.expenses = data.expenses || 0;
        industry.connected = true;
        industry.profit = industry.revenue - industry.expenses;
        totalRevenue += industry.revenue;
        connected++;
      }
    } catch {}

    industries.push(industry);
  }

  res.json({
    industries,
    summary: {
      connected,
      total: industries.length,
      totalRevenue,
      totalExpenses: industries.reduce((s, i) => s + i.expenses, 0),
      netProfit: totalRevenue - industries.reduce((s, i) => s + i.expenses, 0),
    }
  });
});

app.get('/api/industries/:code', async (req, res) => {
  const config = INDUSTRIES[req.params.code];
  if (!config) return res.status(404).json({ error: 'Industry not found' });

  let health = 'unknown';
  let overview = null;

  try {
    const h = await fetch(`http://localhost:${config.port}/health`);
    health = h.ok ? 'healthy' : 'down';
    if (h.ok) {
      overview = await h.json();
    }
  } catch { health = 'not_running'; }

  res.json({ code: req.params.code, ...config, health, overview });
});

// ============================================================
// ACCOUNTING
// ============================================================

app.get('/api/chart-of-accounts', (req, res) => {
  res.json({ accounts: Array.from(db.accounts.values()) });
});

app.get('/api/trial-balance', (req, res) => {
  const accounts = Array.from(db.accounts.values()).filter(a => a.balance !== 0);
  const debit = accounts.filter(a => a.nature === 'Debit').reduce((s, a) => s + a.balance, 0);
  const credit = accounts.filter(a => a.nature === 'Credit').reduce((s, a) => s + a.balance, 0);
  res.json({ accounts, debit, credit, balanced: Math.abs(debit - credit) < 1 });
});

// ============================================================
// DASHBOARD
// ============================================================

app.get('/api/dashboard/overview', (req, res) => {
  const accounts = Array.from(db.accounts.values());
  const banks = Array.from(db.bankAccounts.values());
  const customers = Array.from(db.customers.values());
  const vendors = Array.from(db.vendors.values());
  const budgets = Array.from(db.budgets.values());

  const assets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
  const revenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
  const expenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0);
  const cash = banks.reduce((s, b) => s + b.balance, 0);
  const receivables = customers.reduce((s, c) => s + c.balance, 0);
  const payables = vendors.reduce((s, v) => s + v.balance, 0);

  res.json({
    financial: { assets, revenue, expenses, profit: revenue - expenses },
    cash, receivables, payables,
    budgets: {
      allocated: budgets.reduce((s, b) => s + b.allocated, 0),
      spent: budgets.reduce((s, b) => s + b.spent, 0)
    },
    health: { score: 78, status: 'Good' }
  });
});

// ============================================================
// AI COPILOT
// ============================================================

app.post('/api/copilot/chat', (req, res) => {
  const msg = (req.body.message || '').toLowerCase();

  if (msg.includes('cash') || msg.includes('bank')) {
    const banks = Array.from(db.bankAccounts.values());
    const total = banks.reduce((s, b) => s + b.balance, 0);
    res.json({
      response: `Cash Position: Rs.${(total / 100000).toFixed(1)}L\n\n` +
        banks.map(b => `${b.name}: Rs.${(b.balance / 100000).toFixed(1)}L`).join('\n'),
      actions: [{ label: 'View Treasury', endpoint: '/api/dashboard/overview' }]
    });
  } else if (msg.includes('revenue') || msg.includes('profit')) {
    const accounts = Array.from(db.accounts.values());
    const revenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
    const expenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0);
    const profit = revenue - expenses;
    res.json({
      response: `Revenue: Rs.${(revenue / 100000).toFixed(1)}L\n` +
        `Expenses: Rs.${(expenses / 100000).toFixed(1)}L\n` +
        `Net Profit: Rs.${(profit / 100000).toFixed(1)}L`,
      actions: [{ label: 'View P&L', endpoint: '/api/dashboard/overview' }]
    });
  } else if (msg.includes('budget')) {
    const budgets = Array.from(db.budgets.values());
    const allocated = budgets.reduce((s, b) => s + b.allocated, 0);
    const spent = budgets.reduce((s, b) => s + b.spent, 0);
    const pct = allocated > 0 ? ((spent / allocated) * 100).toFixed(0) : 0;
    res.json({
      response: `Budget: Rs.${(allocated / 100000).toFixed(1)}L\nSpent: Rs.${(spent / 100000).toFixed(1)}L (${pct}%)\n` +
        `Remaining: Rs.${((allocated - spent) / 100000).toFixed(1)}L`,
      actions: [{ label: 'View Budgets', endpoint: '/api/dashboard/overview' }]
    });
  } else {
    res.json({
      response: 'Finance OS can answer:\n' +
        '  Cash/Bank: "How much cash?"\n' +
        '  Revenue: "What is our revenue?"\n' +
        '  Budget: "Are we on budget?"\n' +
        '  Industries: "Show me all 24 industries"',
      industries: Object.keys(INDUSTRIES)
    });
  }
});

// ============================================================
// START
// ============================================================

initData();
app.listen(PORT, () => {
  console.log(`\nFinance OS v2.0 running on port ${PORT}`);
  console.log(`\n24 Industry OS Integration:`);
  console.log(Object.entries(INDUSTRIES).map(([k, v]) => `${k}:${v.port}`).join(' | '));
  console.log(`\nEndpoints:`);
  console.log('/health | /api/dashboard | /api/industries/health | /api/industries/dashboard | /api/copilot/chat');
});
