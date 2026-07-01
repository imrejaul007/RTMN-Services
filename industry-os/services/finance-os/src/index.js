/**
 * RTMN Finance OS v2.1 - Complete with Real-Time Integration
 * Port: 4801
 *
 * This version integrates with:
 * - RABTUL Treasury OS (4055) - Cash, investments, forecasting
 * - RABTUL Payment Service (4001) - Payments, transactions
 * - Revenue Intelligence OS (5400) - AI-powered forecasting
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
// INTEGRATIONS
// ============================================================

const treasury = require('./integrations/treasuryIntegration');
const payments = require('./integrations/paymentIntegration');
const revenue = require('./integrations/revenueIntegration');

// ============================================================
// TAX ROUTES
// ============================================================

const taxRoutes = require('./routes/taxRoutes');
app.use('/api/tax', taxRoutes);

// ============================================================
// DATABASE (Fallback when integrations unavailable)
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
  res.json({ status: 'healthy', service: 'finance-os', version: '2.1', port: PORT });
});

app.get('/api/status', async (req, res) => {
  // Check integration health
  const [treasuryHealth, paymentHealth, revenueHealth] = await Promise.all([
    treasury.healthCheck(),
    payments.healthCheck(),
    revenue.healthCheck()
  ]);

  res.json({
    version: '2.1',
    modules: {
      accounting: true,
      ar: true,
      ap: true,
      treasury: treasuryHealth.healthy,
      budget: true,
      tax: true,
      audit: true,
      payments: paymentHealth.healthy,
      revenue: revenueHealth.healthy
    },
    industries: { connected: 24, type: 'All 24 Industry OS' },
    integrations: {
      treasury: treasuryHealth,
      payments: paymentHealth,
      revenue: revenueHealth
    }
  });
});

// ============================================================
// INTEGRATION HEALTH DASHBOARD
// ============================================================

app.get('/api/integrations/health', async (req, res) => {
  const [treasuryHealth, paymentHealth, revenueHealth] = await Promise.all([
    treasury.healthCheck(),
    payments.healthCheck(),
    revenue.healthCheck()
  ]);

  res.json({
    treasury: treasuryHealth,
    payments: paymentHealth,
    revenue: revenueHealth,
    summary: {
      allHealthy: treasuryHealth.healthy && paymentHealth.healthy && revenueHealth.healthy,
      connectedCount: [
        treasuryHealth.healthy,
        paymentHealth.healthy,
        revenueHealth.healthy
      ].filter(Boolean).length,
      totalCount: 3
    }
  });
});

// ============================================================
// UNIFIED FINANCIAL DASHBOARD (with real data)
// ============================================================

app.get('/api/dashboard/unified', async (req, res) => {
  const { businessId = 'default', industry = 'restaurant' } = req.query;

  try {
    // Fetch from all integrations in parallel
    const [treasuryData, paymentData, revenueData] = await Promise.all([
      treasury.getTreasuryDashboard(businessId),
      payments.getPaymentDashboard(businessId),
      revenue.getRevenueDashboard(businessId, industry)
    ]);

    // Combine with local data
    const accounts = Array.from(db.accounts.values());
    const banks = Array.from(db.bankAccounts.values());
    const customers = Array.from(db.customers.values());
    const vendors = Array.from(db.vendors.values());
    const budgets = Array.from(db.budgets.values());

    // Calculate local metrics
    const localAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0);
    const localRevenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
    const localExpenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0);

    res.json({
      // Local accounting data
      accounting: {
        assets: localAssets,
        revenue: localRevenue,
        expenses: localExpenses,
        profit: localRevenue - localExpenses
      },

      // Real cash from Treasury
      treasury: treasuryData.position ? {
        totalCash: treasuryData.position.totalBalance,
        availableCash: treasuryData.position.availableBalance,
        reservedCash: treasuryData.position.reservedBalance,
        currency: treasuryData.position.currency,
        cashFlow: treasuryData.cashFlow,
        forecast: treasuryData.forecast,
        investments: treasuryData.investments,
        connected: true
      } : {
        totalCash: banks.reduce((s, b) => s + b.balance, 0),
        connected: false,
        note: 'Using local fallback data'
      },

      // Real payment data
      payments: paymentData.stats ? {
        totalVolume: paymentData.stats.totalVolume,
        successfulCount: paymentData.stats.successfulCount,
        failedCount: paymentData.stats.failedCount,
        avgTransactionValue: paymentData.stats.avgTransactionValue,
        successRate: paymentData.stats.successRate,
        refundRate: paymentData.stats.refundRate,
        connected: true
      } : {
        connected: false,
        note: 'Using local fallback data'
      },

      // AI-powered revenue intelligence
      revenue: revenueData.metrics ? {
        mrr: revenueData.metrics.mrr,
        arr: revenueData.metrics.arr,
        growthRate: revenueData.metrics.growthRate,
        churnRate: revenueData.metrics.churnRate,
        nrr: revenueData.metrics.nrr,
        ltv: revenueData.metrics.ltv,
        cac: revenueData.metrics.cac,
        paybackPeriod: revenueData.metrics.paybackPeriod,
        forecast: revenueData.forecast,
        connected: true
      } : {
        mrr: localRevenue,
        connected: false,
        note: 'Using local fallback data'
      },

      // Receivables & Payables
      receivables: customers.reduce((s, c) => s + c.balance, 0),
      payables: vendors.reduce((s, v) => s + v.balance, 0),

      // Budget status
      budgets: {
        allocated: budgets.reduce((s, b) => s + b.allocated, 0),
        spent: budgets.reduce((s, b) => s + b.spent, 0),
        utilization: budgets.length > 0
          ? ((budgets.reduce((s, b) => s + b.spent, 0) / budgets.reduce((s, b) => s + b.allocated, 0)) * 100).toFixed(1)
          : 0
      },

      // Integration status
      integrations: {
        treasury: treasuryData.connected,
        payments: !!paymentData.stats,
        revenue: !!revenueData.metrics
      },

      // Health score
      health: {
        score: calculateHealthScore(treasuryData, paymentData, revenueData),
        status: treasuryData.connected && paymentData.stats && revenueData.metrics ? 'Excellent' : 'Good'
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data', details: error.message });
  }
});

// ============================================================
// TREASURY INTEGRATION ENDPOINTS
// ============================================================

app.get('/api/treasury/cash-position', async (req, res) => {
  const { businessId = 'default' } = req.query;
  const position = await treasury.getCashPosition(businessId);

  if (!position) {
    // Return local fallback
    const banks = Array.from(db.bankAccounts.values());
    return res.json({
      totalBalance: banks.reduce((s, b) => s + b.balance, 0),
      availableBalance: banks.reduce((s, b) => s + b.balance, 0),
      reservedBalance: 0,
      currency: 'INR',
      source: 'local_fallback'
    });
  }

  res.json({ ...position, source: 'treasury' });
});

app.get('/api/treasury/cash-flow', async (req, res) => {
  const { businessId = 'default', period = 'monthly' } = req.query;
  const cashFlow = await treasury.getCashFlow(businessId, period);

  if (!cashFlow) {
    return res.json({ error: 'Treasury not connected', source: 'unavailable' });
  }

  res.json({ ...cashFlow, source: 'treasury' });
});

app.get('/api/treasury/forecast', async (req, res) => {
  const { businessId = 'default' } = req.query;
  const forecast = await treasury.getCashForecast(businessId);

  if (!forecast) {
    return res.json({ error: 'Treasury forecast not available', source: 'unavailable' });
  }

  res.json({ ...forecast, source: 'treasury' });
});

app.get('/api/treasury/investments', async (req, res) => {
  const { businessId = 'default' } = req.query;
  const investments = await treasury.getInvestments(businessId);

  res.json({ investments: investments || [], source: investments ? 'treasury' : 'unavailable' });
});

app.get('/api/treasury/fx-positions', async (req, res) => {
  const { businessId = 'default' } = req.query;
  const fx = await treasury.getFXPositions(businessId);

  res.json({ fx: fx || [], source: fx ? 'treasury' : 'unavailable' });
});

// ============================================================
// PAYMENT INTEGRATION ENDPOINTS
// ============================================================

app.get('/api/payments/stats', async (req, res) => {
  const { businessId = 'default', period = '30d' } = req.query;
  const stats = await payments.getPaymentStats(businessId, period);

  res.json({ ...stats, source: 'payments' });
});

app.get('/api/payments/volume', async (req, res) => {
  const { businessId = 'default', granularity = 'daily' } = req.query;
  const volume = await payments.getPaymentVolume(businessId, granularity);

  res.json({ volume: volume || [], source: volume ? 'payments' : 'unavailable' });
});

app.get('/api/payments/recent', async (req, res) => {
  const { businessId = 'default', limit = 50 } = req.query;
  const transactions = await payments.getRecentTransactions(businessId, parseInt(limit));

  res.json({ transactions, count: transactions.length, source: 'payments' });
});

app.get('/api/payments/failed', async (req, res) => {
  const { businessId = 'default', period = '7d' } = req.query;
  const failed = await payments.getFailedPayments(businessId, period);

  res.json({ failedPayments: failed, count: failed.length, source: 'payments' });
});

// ============================================================
// REVENUE INTEGRATION ENDPOINTS
// ============================================================

app.get('/api/revenue/metrics', async (req, res) => {
  const { businessId = 'default' } = req.query;
  const metrics = await revenue.getRevenueMetrics(businessId);

  res.json({ ...metrics, source: 'revenue_intelligence' });
});

app.get('/api/revenue/forecast', async (req, res) => {
  const { businessId = 'default', period = '12m' } = req.query;
  const forecast = await revenue.getRevenueForecast(businessId, period);

  res.json({ forecast: forecast || [], source: forecast ? 'revenue_intelligence' : 'unavailable' });
});

app.get('/api/revenue/demand', async (req, res) => {
  const { industry = 'restaurant', period = '90d' } = req.query;
  const demand = await revenue.getDemandForecast(industry, period);

  res.json({ ...demand, source: 'revenue_intelligence' });
});

app.get('/api/revenue/cohorts', async (req, res) => {
  const { businessId = 'default' } = req.query;
  const cohorts = await revenue.getCohortAnalysis(businessId);

  res.json({ cohorts: cohorts || [], source: cohorts ? 'revenue_intelligence' : 'unavailable' });
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
// ACCOUNTING (Original endpoints)
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

// Legacy dashboard (kept for backward compatibility)
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
// AI COPILOT (Enhanced with real data)
// ============================================================

app.post('/api/copilot/chat', async (req, res) => {
  const msg = (req.body.message || '').toLowerCase();
  const { businessId = 'default' } = req.body;

  // Try to get real data for responses
  const treasuryData = await treasury.getCashPosition(businessId);
  const paymentData = await payments.getPaymentStats(businessId);
  const revenueData = await revenue.getRevenueMetrics(businessId);

  if (msg.includes('cash') || msg.includes('bank')) {
    if (treasuryData) {
      res.json({
        response: `Real Cash Position from Treasury:\n` +
          `Total: ${formatCurrency(treasuryData.totalBalance)}\n` +
          `Available: ${formatCurrency(treasuryData.availableBalance)}\n` +
          `Reserved: ${formatCurrency(treasuryData.reservedBalance)}`,
        source: 'treasury',
        actions: [{ label: 'View Treasury', endpoint: '/api/treasury/cash-position' }]
      });
    } else {
      const banks = Array.from(db.bankAccounts.values());
      const total = banks.reduce((s, b) => s + b.balance, 0);
      res.json({
        response: `Cash Position: ${formatCurrency(total)}\n\n` +
          banks.map(b => `${b.name}: ${formatCurrency(b.balance)}`).join('\n'),
        source: 'local',
        actions: [{ label: 'View Treasury', endpoint: '/api/dashboard/overview' }]
      });
    }
  } else if (msg.includes('revenue') || msg.includes('profit') || msg.includes('mrr')) {
    if (revenueData && revenueData.mrr) {
      res.json({
        response: `Revenue Metrics from AI:\n` +
          `MRR: ${formatCurrency(revenueData.mrr)}\n` +
          `ARR: ${formatCurrency(revenueData.arr)}\n` +
          `Growth: ${revenueData.growthRate}%\n` +
          `Churn: ${revenueData.churnRate}%\n` +
          `LTV: ${formatCurrency(revenueData.ltv)}`,
        source: 'revenue_intelligence',
        actions: [{ label: 'View Revenue', endpoint: '/api/revenue/metrics' }]
      });
    } else {
      const accounts = Array.from(db.accounts.values());
      const revenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.balance, 0);
      const expenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.balance, 0);
      const profit = revenue - expenses;
      res.json({
        response: `Revenue: ${formatCurrency(revenue)}\n` +
          `Expenses: ${formatCurrency(expenses)}\n` +
          `Net Profit: ${formatCurrency(profit)}`,
        source: 'local',
        actions: [{ label: 'View P&L', endpoint: '/api/dashboard/overview' }]
      });
    }
  } else if (msg.includes('payment') || msg.includes('transaction')) {
    if (paymentData && paymentData.totalVolume) {
      res.json({
        response: `Payment Metrics:\n` +
          `Total Volume: ${formatCurrency(paymentData.totalVolume)}\n` +
          `Successful: ${paymentData.successfulCount}\n` +
          `Failed: ${paymentData.failedCount}\n` +
          `Success Rate: ${paymentData.successRate}%`,
        source: 'payments',
        actions: [{ label: 'View Payments', endpoint: '/api/payments/stats' }]
      });
    } else {
      res.json({
        response: 'Payment service not connected. Connect RABTUL Payment Service for real metrics.',
        source: 'unavailable',
        actions: []
      });
    }
  } else if (msg.includes('budget')) {
    const budgets = Array.from(db.budgets.values());
    const allocated = budgets.reduce((s, b) => s + b.allocated, 0);
    const spent = budgets.reduce((s, b) => s + b.spent, 0);
    const pct = allocated > 0 ? ((spent / allocated) * 100).toFixed(0) : 0;
    res.json({
      response: `Budget: ${formatCurrency(allocated)}\nSpent: ${formatCurrency(spent)} (${pct}%)\n` +
        `Remaining: ${formatCurrency(allocated - spent)}`,
      source: 'local',
      actions: [{ label: 'View Budgets', endpoint: '/api/dashboard/overview' }]
    });
  } else if (msg.includes('forecast') || msg.includes('runway')) {
    const forecast = await treasury.getCashForecast(businessId);
    if (forecast && forecast.runway) {
      res.json({
        response: `Cash Runway: ${forecast.runway} months\n` +
          `Forecast Period: ${forecast.forecastEndDate}`,
        source: 'treasury',
        actions: [{ label: 'View Forecast', endpoint: '/api/treasury/forecast' }]
      });
    } else {
      res.json({
        response: 'Treasury forecast not available. Connect RABTUL Treasury for runway analysis.',
        source: 'unavailable',
        actions: []
      });
    }
  } else {
    res.json({
      response: 'Finance OS can answer:\n' +
        '  Cash: "How much cash?"\n' +
        '  Revenue: "What is our MRR/ARR?"\n' +
        '  Payments: "Show payment stats"\n' +
        '  Budget: "Are we on budget?"\n' +
        '  Forecast: "What is our runway?"\n' +
        '  Industries: "Show me all 24 industries"',
      source: 'local',
      industries: Object.keys(INDUSTRIES)
    });
  }
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function formatCurrency(amount) {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)} K`;
  return `₹${amount}`;
}

function calculateHealthScore(treasury, payments, revenue) {
  let score = 50; // Base score

  if (treasury.connected) score += 20;
  if (payments.stats && payments.stats.totalVolume > 0) score += 15;
  if (revenue.metrics && revenue.metrics.mrr > 0) score += 15;

  return Math.min(100, score);
}

// ============================================================
// START
// ============================================================

initData();
app.listen(PORT, () => {
  console.log(`\nFinance OS v2.1 running on port ${PORT}`);
  console.log(`\nIntegration Status:`);
  console.log(`  Treasury: ${process.env.TREASURY_URL || 'http://localhost:4055'}`);
  console.log(`  Payments: ${process.env.PAYMENT_URL || 'http://localhost:4001'}`);
  console.log(`  Revenue:  ${process.env.REVENUE_URL || 'http://localhost:5400'}`);
  console.log(`\nNew Unified Dashboard:`);
  console.log('/api/dashboard/unified - Real-time data from all sources');
  console.log('/api/integrations/health - Integration status');
  console.log('/api/treasury/* - Cash, forecasting, investments');
  console.log('/api/payments/* - Transaction stats');
  console.log('/api/revenue/* - AI-powered revenue metrics');
  console.log(`\n24 Industry OS Integration:`);
  console.log(Object.entries(INDUSTRIES).map(([k, v]) => `${k}:${v.port}`).join(' | '));
});
