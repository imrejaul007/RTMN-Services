const { requireAuth } = require('@rtmn/shared/auth');
const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { installReadinessRoutes, autoSeed, normalizeSeedData } = require('@rtmn/shared/lib/genie-readiness');
const cors = require('cors');
const helmet = require('helmet');

const budgetRoutes = require('./routes/budget');
const expensesRoutes = require('./routes/expenses');
const savingsRoutes = require('./routes/savings');
const investmentsRoutes = require('./routes/investments');
const goalsRoutes = require('./routes/goals');
const insightsRoutes = require('./routes/insights');

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


// Phase A: persistent stores for demo data (transactions / budgets / goals)
const transactionsStore = new PersistentMap('transactions', { serviceName: 'genie-money-os' });
const budgetsStore = new PersistentMap('budgets', { serviceName: 'genie-money-os' });
const goalsStore = new PersistentMap('goals', { serviceName: 'genie-money-os' });

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4724;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


app.use(requireAuth);// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/budget', budgetRoutes);
app.use('/expenses', expensesRoutes);
app.use('/savings', savingsRoutes);
app.use('/investments', investmentsRoutes);
app.use('/goals', goalsRoutes);
app.use('/insights', insightsRoutes);

// Phase A: persistent store endpoints (transactions / budgets / goals)
app.get('/api/money/transactions', (req, res) => {
  const items = Array.from(transactionsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, transactions: items });
});
app.get('/api/money/budgets', (req, res) => {
  const items = Array.from(budgetsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, budgets: items });
});
app.get('/api/money/goals', (req, res) => {
  const items = Array.from(goalsStore.entries()).map(([k, v]) => ({ id: k, ...v }));
  res.json({ total: items.length, goals: items });
});

// Health check
app.get('/health', (req, res) => { res.json({ status: 'healthy', service: 'Genie', port: PORT }); });
app.get('/', (req, res) => {
  res.json({
    service: 'Genie Money OS',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    endpoints: [
      '/budget - Budget creation and tracking',
      '/expenses - Expense logging and categorization',
      '/savings - Savings accounts and progress',
      '/investments - Investment tracking and insights',
      '/goals - Financial goals and milestones',
      '/insights - AI financial insights and recommendations'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Phase A: production-readiness routes (LLM + DB health + combined)
installReadinessRoutes(app, { serviceName: 'genie-money-os' });

// Phase A: idempotent demo-data seeding
const seedPlans = [
  {
    store: transactionsStore,
    items: normalizeSeedData([
      { id: 'tx1', userId: 'user-001', amount: 450, category: 'groceries', merchant: 'BigBasket', date: '2026-06-22' },
      { id: 'tx2', userId: 'user-001', amount: 120, category: 'transport', merchant: 'Uber', date: '2026-06-22' },
      { id: 'tx3', userId: 'user-001', amount: 1800, category: 'rent', merchant: 'Landlord', date: '2026-06-21' },
      { id: 'tx4', userId: 'user-002', amount: 250, category: 'dining', merchant: 'Truffles', date: '2026-06-23' },
      { id: 'tx5', userId: 'user-002', amount: 80, category: 'coffee', merchant: 'Blue Tokai', date: '2026-06-23' },
    ]),
  },
  {
    store: budgetsStore,
    items: normalizeSeedData([
      { id: 'b1', userId: 'user-001', category: 'groceries', limit: 6000, spent: 2400, period: 'monthly' },
      { id: 'b2', userId: 'user-001', category: 'dining', limit: 3000, spent: 1800, period: 'monthly' },
      { id: 'b3', userId: 'user-002', category: 'entertainment', limit: 2000, spent: 800, period: 'monthly' },
      { id: 'b4', userId: 'user-002', category: 'transport', limit: 2500, spent: 1100, period: 'monthly' },
      { id: 'b5', userId: 'user-003', category: 'shopping', limit: 5000, spent: 4200, period: 'monthly' },
    ]),
  },
  {
    store: goalsStore,
    items: normalizeSeedData([
      { id: 'g1', userId: 'user-001', name: 'Emergency Fund', target: 100000, saved: 45000, deadline: '2026-12-31' },
      { id: 'g2', userId: 'user-001', name: 'Goa Vacation', target: 50000, saved: 12000, deadline: '2026-10-15' },
      { id: 'g3', userId: 'user-002', name: 'New Laptop', target: 150000, saved: 80000, deadline: '2026-08-30' },
      { id: 'g4', userId: 'user-002', name: 'Home Down Payment', target: 1000000, saved: 250000, deadline: '2028-03-31' },
      { id: 'g5', userId: 'user-003', name: 'Wedding Fund', target: 500000, saved: 125000, deadline: '2027-06-30' },
    ]),
  },
];
const seeded = autoSeed(seedPlans, { serviceName: 'genie-money-os' });
if (seeded) console.log('[genie-money-os] demo data seeded');



const server = app.listen(PORT, () => {
  console.log(`💰 Genie Money OS running on port ${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;