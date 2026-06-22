/**
 * RTMN Finance Copilot Service
 *
 * Port: 4930
 * Purpose: AI-powered financial analysis and insights
 *
 * Features:
 * - Cash Flow Forecasting
 * - Budget Analysis
 * - Anomaly Detection
 * - Refund Analysis
 * - Fraud Detection
 * - Financial Reports
 * - KPI Tracking
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.FINANCE_COPILOT_PORT || 4930;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ============================================================
// DATA STORES
// ============================================================

const reports = new PersistentMap('reports', { serviceName: 'finance-copilot' });
const alerts = new PersistentMap('alerts', { serviceName: 'finance-copilot' });
const insights = new PersistentMap('insights', { serviceName: 'finance-copilot' });
const kpis = new PersistentMap('kpis', { serviceName: 'finance-copilot' });

// Initialize KPIs
kpis.set('revenue', {
  id: 'revenue',
  name: 'Revenue',
  value: 1250000,
  change: 12.5,
  trend: 'up',
  target: 1500000
});

kpis.set('expenses', {
  id: 'expenses',
  name: 'Expenses',
  value: 780000,
  change: -3.2,
  trend: 'down',
  target: 800000
});

kpis.set('profit', {
  id: 'profit',
  name: 'Net Profit',
  value: 470000,
  change: 18.7,
  trend: 'up',
  target: 500000
});

kpis.set('burnRate', {
  id: 'burnRate',
  name: 'Burn Rate',
  value: 65000,
  change: -5.1,
  trend: 'down',
  target: 60000
});

kpis.set('arr', {
  id: 'arr',
  name: 'ARR',
  value: 4800000,
  change: 24.3,
  trend: 'up',
  target: 5000000
});

kpis.set('cac', {
  id: 'cac',
  name: 'Customer Acquisition Cost',
  value: 250,
  change: -8.5,
  trend: 'down',
  target: 200
});

kpis.set('ltv', {
  id: 'ltv',
  name: 'Lifetime Value',
  value: 2800,
  change: 15.2,
  trend: 'up',
  target: 3000
});

kpis.set('quickRatio', {
  id: 'quickRatio',
  name: 'Quick Ratio',
  value: 1.8,
  change: 0.1,
  trend: 'up',
  target: 2.0
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Finance Copilot',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    stats: {
      reports: reports.size,
      alerts: alerts.size,
      kpis: kpis.size
    }
  });
});

// ============================================================
// CASH FLOW FORECASTING
// ============================================================

app.post('/api/cashflow/forecast',requireAuth,  (req, res) => {
  const { currentCash, transactions, months = 6 } = req.body;

  const cash = currentCash || 500000;
  const monthlyBurn = transactions?.burnRate || 65000;
  const monthlyRevenue = transactions?.revenue || 208000;

  const forecast = [];
  let projectedCash = cash;

  for (let i = 1; i <= months; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() + i);

    // Add some variance
    const variance = (Math.random() - 0.5) * 0.1;
    const netFlow = monthlyRevenue - monthlyBurn;
    projectedCash += netFlow * (1 + variance);

    forecast.push({
      month: date.toISOString().slice(0, 7),
      projectedCash: Math.round(projectedCash),
      revenue: Math.round(monthlyRevenue * (1 + variance * 0.5)),
      expenses: Math.round(monthlyBurn * (1 + variance * 0.3)),
      netFlow: Math.round(netFlow * (1 + variance))
    });
  }

  // Calculate runway
  let runwayMonths = 0;
  let checkCash = cash;
  while (checkCash > 0 && runwayMonths < 60) {
    checkCash += (monthlyRevenue - monthlyBurn);
    runwayMonths++;
  }

  res.json({
    success: true,
    forecast: {
      currentCash: cash,
      runwayMonths: runwayMonths >= 60 ? '60+' : runwayMonths,
      months: forecast,
      recommendations: getCashFlowRecommendations(forecast)
    }
  });
});

// ============================================================
// BUDGET ANALYSIS
// ============================================================

app.post('/api/budget/analyze',requireAuth,  (req, res) => {
  const { budget, actual } = req.body;

  if (!budget || !actual) {
    return res.status(400).json({ success: false, error: 'Budget and actual data required' });
  }

  const analysis = [];
  let totalBudget = 0;
  let totalActual = 0;

  Object.entries(budget).forEach(([category, amount]) => {
    const actualAmount = actual[category] || 0;
    const variance = actualAmount - amount;
    const variancePercent = amount > 0 ? ((variance / amount) * 100).toFixed(1) : 0;

    analysis.push({
      category,
      budget: amount,
      actual: actualAmount,
      variance,
      variancePercent: parseFloat(variancePercent),
      status: variancePercent > 10 ? 'over' : variancePercent < -10 ? 'under' : 'on-track'
    });

    totalBudget += amount;
    totalActual += actualAmount;
  });

  const overallVariance = totalActual - totalBudget;
  const overallVariancePercent = totalBudget > 0 ? ((overallVariance / totalBudget) * 100).toFixed(1) : 0;

  res.json({
    success: true,
    analysis: {
      categories: analysis,
      total: {
        budget: totalBudget,
        actual: totalActual,
        variance: overallVariance,
        variancePercent: parseFloat(overallVariancePercent)
      },
      insights: getBudgetInsights(analysis)
    }
  });
});

// ============================================================
// ANOMALY DETECTION
// ============================================================

app.post('/api/anomaly/detect',requireAuth,  (req, res) => {
  const { transactions, threshold = 2 } = req.body;

  if (!transactions || !Array.isArray(transactions)) {
    return res.status(400).json({ success: false, error: 'Transactions array required' });
  }

  // Calculate basic statistics
  const amounts = transactions.map(t => t.amount);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // Find anomalies
  const anomalies = transactions.filter(t => {
    const zScore = Math.abs((t.amount - mean) / stdDev);
    return zScore > threshold;
  }).map(t => ({
    ...t,
    zScore: parseFloat(((t.amount - mean) / stdDev).toFixed(2)),
    deviation: parseFloat((t.amount - mean).toFixed(2))
  }));

  res.json({
    success: true,
    detection: {
      totalTransactions: transactions.length,
      anomaliesFound: anomalies.length,
      anomalyRate: ((anomalies.length / transactions.length) * 100).toFixed(1),
      anomalies,
      statistics: {
        mean: parseFloat(mean.toFixed(2)),
        stdDev: parseFloat(stdDev.toFixed(2)),
        threshold
      }
    }
  });
});

// ============================================================
// REFUND ANALYSIS
// ============================================================

app.post('/api/refund/analyze',requireAuth,  (req, res) => {
  const { refunds } = req.body;

  if (!refunds || !Array.isArray(refunds)) {
    return res.status(400).json({ success: false, error: 'Refunds array required' });
  }

  const totalRefunds = refunds.reduce((sum, r) => sum + r.amount, 0);
  const refundRate = (totalRefunds / (refunds[0]?.revenue || 100000) * 100).toFixed(1);

  // Categorize refunds
  const byCategory = {};
  const byReason = {};
  const byProduct = {};

  refunds.forEach(r => {
    byCategory[r.category] = (byCategory[r.category] || 0) + r.amount;
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
    byProduct[r.productId] = (byProduct[r.productId] || 0) + r.amount;
  });

  // Find patterns
  const patterns = [];

  // High value refunds
  const highValue = refunds.filter(r => r.amount > 500);
  if (highValue.length > 0) {
    patterns.push({
      type: 'high_value',
      severity: 'medium',
      description: `${highValue.length} refunds over $500 detected`,
      total: highValue.reduce((sum, r) => sum + r.amount, 0)
    });
  }

  // Repeat refunders
  const byCustomer = {};
  refunds.forEach(r => {
    byCustomer[r.customerId] = (byCustomer[r.customerId] || 0) + 1;
  });
  const repeatRefunders = Object.entries(byCustomer).filter(([, count]) => count > 2);
  if (repeatRefunders.length > 0) {
    patterns.push({
      type: 'repeat_refunder',
      severity: 'high',
      description: `${repeatRefunders.length} customers with 3+ refunds`,
      customers: repeatRefunders.map(([id, count]) => ({ customerId: id, count }))
    });
  }

  res.json({
    success: true,
    analysis: {
      totalRefunds,
      refundRate: parseFloat(refundRate),
      count: refunds.length,
      averageRefund: parseFloat((totalRefunds / refunds.length).toFixed(2)),
      byCategory,
      byReason,
      byProduct,
      patterns,
      recommendations: getRefundRecommendations(patterns)
    }
  });
});

// ============================================================
// FINANCIAL REPORTS
// ============================================================

app.get('/api/reports/:type', (req, res) => {
  const { type } = req.params;
  const { period = 'monthly' } = req.query;

  let report = {};

  switch (type) {
    case 'income':
      report = {
        title: 'Income Statement',
        period,
        revenue: {
          subscriptions: 950000,
          oneTime: 180000,
          services: 120000,
          total: 1250000
        },
        expenses: {
          cogs: 250000,
          marketing: 180000,
          sales: 150000,
          engineering: 120000,
          gAndA: 80000,
          total: 780000
        },
        netIncome: 470000,
        ebitda: 520000,
        margins: {
          gross: 76,
          ebitda: 41.6,
          net: 37.6
        }
      };
      break;

    case 'balance':
      report = {
        title: 'Balance Sheet',
        period,
        assets: {
          cash: 1200000,
          receivables: 350000,
          prepaids: 50000,
          total: 1600000
        },
        liabilities: {
          payables: 180000,
          deferred: 220000,
          total: 400000
        },
        equity: 1200000
      };
      break;

    case 'cashflow':
      report = {
        title: 'Cash Flow Statement',
        period,
        operating: 480000,
        investing: -120000,
        financing: -50000,
        netCash: 310000,
        beginningCash: 890000,
        endingCash: 1200000
      };
      break;

    case 'arr':
      report = {
        title: 'ARR Metrics',
        period,
        arr: 4800000,
        growth: 24.3,
        netNewARR: 940000,
        churnARR: 180000,
        expansionARR: 520000,
        logos: {
          total: 450,
          new: 45,
          churned: 12,
          expansion: 38
        },
        metrics: {
          nrr: 112,
          arrPerCustomer: 10667,
          arrPerEmployee: 240000
        }
      };
      break;

    default:
      return res.status(404).json({ success: false, error: 'Report type not found' });
  }

  // Save report
  const reportId = `report-${uuidv4().slice(0, 8)}`;
  reports.set(reportId, { id: reportId, type, period, generatedAt: new Date().toISOString() });

  res.json({
    success: true,
    report
  });
});

// ============================================================
// KPI TRACKING
// ============================================================

app.get('/api/kpis', (req, res) => {
  const allKpis = Array.from(kpis.values());

  res.json({
    success: true,
    kpis: allKpis,
    summary: {
      onTarget: allKpis.filter(k => {
        const variance = Math.abs(k.value - k.target) / k.target;
        return variance < 0.1;
      }).length,
      atRisk: allKpis.filter(k => {
        const variance = (k.value - k.target) / k.target;
        return variance < -0.1;
      }).length,
      exceeded: allKpis.filter(k => {
        const variance = (k.value - k.target) / k.target;
        return variance > 0.1;
      }).length
    }
  });
});

app.get('/api/kpis/:id', (req, res) => {
  const kpi = kpis.get(req.params.id);
  if (!kpi) {
    return res.status(404).json({ success: false, error: 'KPI not found' });
  }

  // Generate trend data
  const trend = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    trend.push({
      month: date.toISOString().slice(0, 7),
      value: Math.round(kpi.value * (0.9 + Math.random() * 0.2))
    });
  }

  res.json({
    success: true,
    kpi,
    trend
  });
});

// ============================================================
// ALERTS
// ============================================================

app.post('/api/alerts',requireAuth,  (req, res) => {
  const { type, severity, message, metric, threshold } = req.body;

  const alert = {
    id: `alert-${uuidv4().slice(0, 8)}`,
    type,
    severity,
    message,
    metric,
    threshold,
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  alerts.set(alert.id, alert);

  res.status(201).json({
    success: true,
    alert
  });
});

app.get('/api/alerts', (req, res) => {
  const { severity, status } = req.query;

  let result = Array.from(alerts.values());

  if (severity) result = result.filter(a => a.severity === severity);
  if (status) result = result.filter(a => a.status === status);

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({
    success: true,
    alerts: result
  });
});

// ============================================================
// AI INSIGHTS
// ============================================================

app.get('/api/insights', (req, res) => {
  const insights = [
    {
      id: 'ins-001',
      type: 'opportunity',
      title: 'Revenue Opportunity',
      description: 'B2B segment shows 34% higher LTV. Consider increasing marketing spend by 20%.',
      impact: 'high',
      action: 'Increase B2B marketing allocation'
    },
    {
      id: 'ins-002',
      type: 'risk',
      title: 'Churn Risk',
      description: 'Enterprise customers with 3+ support tickets in 30 days have 45% higher churn risk.',
      impact: 'medium',
      action: 'Implement proactive outreach for at-risk accounts'
    },
    {
      id: 'ins-003',
      type: 'efficiency',
      title: 'Unit Economics Improvement',
      description: 'CAC decreased 8.5% while LTV increased 15%. Payback period reduced to 2.1 months.',
      impact: 'positive',
      action: 'Maintain current acquisition channels'
    },
    {
      id: 'ins-004',
      type: 'forecast',
      title: 'Growth Trajectory',
      description: 'Current growth rate suggests reaching $5M ARR by Q4 if trends continue.',
      impact: 'positive',
      action: 'Plan infrastructure scaling for Q4'
    },
    {
      id: 'ins-005',
      type: 'efficiency',
      title: 'Expense Optimization',
      description: 'Marketing spend efficiency improved 23%. Consider reallocating 10% from low-performing campaigns.',
      impact: 'medium',
      action: 'Audit underperforming ad channels'
    }
  ];

  res.json({
    success: true,
    insights
  });
});

// ============================================================
// FRAUD DETECTION
// ============================================================

app.post('/api/fraud/detect',requireAuth,  (req, res) => {
  const { transaction, customerHistory } = req.body;

  let riskScore = 0;
  const riskFactors = [];

  // Amount risk
  if (transaction.amount > 10000) {
    riskScore += 0.25;
    riskFactors.push('high_transaction_amount');
  }

  // Velocity risk
  if (customerHistory?.transactions24h > 5) {
    riskScore += 0.3;
    riskFactors.push('velocity_anomaly');
  }

  // New account risk
  if (customerHistory?.accountAge < 7) {
    riskScore += 0.2;
    riskFactors.push('new_account');
  }

  // Location mismatch
  if (transaction.locationMismatch) {
    riskScore += 0.15;
    riskFactors.push('location_mismatch');
  }

  // Device risk
  if (transaction.newDevice) {
    riskScore += 0.1;
    riskFactors.push('new_device');
  }

  const risk = riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low';

  res.json({
    success: true,
    fraudDetection: {
      riskScore: parseFloat(riskScore.toFixed(2)),
      risk,
      factors: riskFactors,
      recommendation: risk === 'high' ? 'block' : risk === 'medium' ? 'review' : 'allow',
      actions: getFraudActions(risk, riskFactors)
    }
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getCashFlowRecommendations(forecast) {
  const recommendations = [];

  const avgCash = forecast.reduce((sum, f) => sum + f.projectedCash, 0) / forecast.length;
  const minCash = Math.min(...forecast.map(f => f.projectedCash));

  if (minCash < 200000) {
    recommendations.push({
      type: 'urgent',
      message: 'Cash runway below $200K in the next 6 months. Consider fundraising or reducing burn.'
    });
  }

  if (forecast[forecast.length - 1].projectedCash > forecast[0].projectedCash * 1.5) {
    recommendations.push({
      type: 'positive',
      message: 'Strong cash growth trajectory. Consider strategic investments.'
    });
  }

  return recommendations;
}

function getBudgetInsights(analysis) {
  const insights = [];

  const overBudget = analysis.filter(a => a.status === 'over');
  if (overBudget.length > 0) {
    insights.push({
      type: 'warning',
      message: `${overBudget.length} categories over budget. Total overage: $${overBudget.reduce((sum, a) => sum + a.variance, 0).toLocaleString()}`
    });
  }

  const underBudget = analysis.filter(a => a.status === 'under');
  if (underBudget.length > 0) {
    insights.push({
      type: 'info',
      message: `${underBudget.length} categories under budget. Consider reallocation.`
    });
  }

  return insights;
}

function getRefundRecommendations(patterns) {
  const recommendations = [];

  patterns.forEach(p => {
    if (p.type === 'high_value') {
      recommendations.push({
        action: 'Review high-value refunds',
        reason: `$${p.total} in high-value refunds`
      });
    }
    if (p.type === 'repeat_refunder') {
      recommendations.push({
        action: 'Investigate repeat refunders',
        reason: `${p.customers.length} customers with multiple refunds`
      });
    }
  });

  return recommendations;
}

function getFraudActions(risk, factors) {
  const actions = [];

  if (risk === 'high') {
    actions.push('block_transaction');
    actions.push('alert_fraud_team');
    actions.push('freeze_account');
  } else if (risk === 'medium') {
    actions.push('require_verification');
    actions.push('manual_review');
    actions.push('send_otp');
  }

  return actions;
}

// ============================================================
// ERROR HANDLING
// ============================================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ============================================================
// START SERVER
// ============================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[Finance Copilot] Service started on port ${PORT}`);
  console.log(`[Finance Copilot] ${kpis.size} KPIs tracked`);
  console.log(`[Finance Copilot] Ready for analysis`);
});
installGracefulShutdown(server);

module.exports = app;
