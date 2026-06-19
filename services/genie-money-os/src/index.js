const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const budgetRoutes = require('./routes/budget');
const expensesRoutes = require('./routes/expenses');
const savingsRoutes = require('./routes/savings');
const investmentsRoutes = require('./routes/investments');
const goalsRoutes = require('./routes/goals');
const insightsRoutes = require('./routes/insights');

const app = express();
const PORT = process.env.PORT || 4724;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
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

app.listen(PORT, () => {
  console.log(`💰 Genie Money OS running on port ${PORT}`);
});

module.exports = app;