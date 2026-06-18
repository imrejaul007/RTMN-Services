/**
 * RTMN Finance OS - Financial Statements Module
 *
 * P&L Statement, Balance Sheet, Cash Flow Statement
 * Port: 4801
 */

import express from 'express';
const router = express.Router();

// ============================================================
// PROFIT & LOSS (P&L) STATEMENT
// ============================================================

router.get('/profit-loss', (req, res) => {
  const { startDate, endDate, period } = req.query;
  const accounts = Array.from(db.accounts.values());

  // Revenue accounts
  const revenueAccounts = accounts.filter(a => a.type === 'revenue');
  const revenue = revenueAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Expense accounts
  const expenseAccounts = accounts.filter(a => a.type === 'expense');
  const expenses = expenseAccounts.reduce((sum, a) => sum + a.balance, 0);

  // Calculate margins
  const grossProfit = revenue;
  const netProfit = revenue - expenses;
  const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100).toFixed(2) : 0;
  const netMargin = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(2) : 0;

  // Breakdown by category
  const revenueBreakdown = revenueAccounts.map(a => ({
    account: a.name,
    code: a.code,
    amount: a.balance,
    percentage: revenue > 0 ? ((a.balance / revenue) * 100).toFixed(2) : 0,
  }));

  const expenseBreakdown = expenseAccounts.map(a => ({
    account: a.name,
    code: a.code,
    amount: a.balance,
    percentage: revenue > 0 ? ((a.balance / revenue) * 100).toFixed(2) : 0,
  }));

  // Sort by amount descending
  revenueBreakdown.sort((a, b) => b.amount - a.amount);
  expenseBreakdown.sort((a, b) => b.amount - a.amount);

  res.json({
    statement: 'Profit & Loss',
    period: period || 'YTD',
    startDate: startDate || '2026-01-01',
    endDate: endDate || new Date().toISOString().split('T')[0],
    revenue: {
      total: revenue,
      breakdown: revenueBreakdown,
    },
    expenses: {
      total: expenses,
      breakdown: expenseBreakdown,
    },
    summary: {
      grossProfit,
      grossMargin,
      netProfit,
      netMargin,
      cogs: expenseAccounts.find(a => a.id === 'COGS')?.balance || 0,
      operatingExpenses: expenses - (expenseAccounts.find(a => a.id === 'COGS')?.balance || 0) - (expenseAccounts.find(a => a.id === 'TAX_EXP')?.balance || 0),
      tax: expenseAccounts.find(a => a.id === 'TAX_EXP')?.balance || 0,
    },
    comparisons: {
      vsBudget: {
        revenue: revenue / 100000,
        budget: 150000,
        variance: ((revenue - 150000) / 150000 * 100).toFixed(2),
      },
      vsLastYear: {
        revenue: revenue,
        lastYear: revenue * 0.85,
        growth: ((revenue - revenue * 0.85) / (revenue * 0.85) * 100).toFixed(2),
      },
    },
  });
});

// ============================================================
// BALANCE SHEET
// ============================================================

router.get('/balance-sheet', (req, res) => {
  const { asOfDate } = req.query;
  const accounts = Array.from(db.accounts.values());

  // Assets
  const assets = accounts.filter(a => a.type === 'asset');
  const currentAssets = assets.filter(a => a.category === 'Current Assets');
  const nonCurrentAssets = assets.filter(a => a.category === 'Non-Current Assets');

  const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + Math.max(0, a.balance) + Math.min(0, a.balance), 0);
  const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

  // Liabilities
  const liabilities = accounts.filter(a => a.type === 'liability');
  const currentLiabilities = liabilities.filter(a => a.category === 'Current Liabilities');
  const nonCurrentLiabilities = liabilities.filter(a => a.category === 'Non-Current Liabilities');

  const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

  // Equity
  const equity = accounts.filter(a => a.type === 'equity');
  const totalEquity = equity.reduce((sum, a) => sum + Math.abs(a.balance), 0);

  // Calculate ratios
  const workingCapital = totalCurrentAssets - totalCurrentLiabilities;
  const debtToEquity = totalEquity > 0 ? (totalLiabilities / totalEquity).toFixed(2) : 0;
  const currentRatio = totalCurrentLiabilities > 0 ? (totalCurrentAssets / totalCurrentLiabilities).toFixed(2) : 0;

  res.json({
    statement: 'Balance Sheet',
    asOfDate: asOfDate || new Date().toISOString().split('T')[0],
    assets: {
      currentAssets: {
        total: totalCurrentAssets,
        breakdown: currentAssets.map(a => ({
          account: a.name,
          code: a.code,
          amount: Math.max(0, a.balance),
        })),
      },
      nonCurrentAssets: {
        total: totalNonCurrentAssets,
        breakdown: nonCurrentAssets.map(a => ({
          account: a.name,
          code: a.code,
          amount: a.balance,
        })),
      },
      total: totalAssets,
    },
    liabilities: {
      currentLiabilities: {
        total: totalCurrentLiabilities,
        breakdown: currentLiabilities.map(a => ({
          account: a.name,
          code: a.code,
          amount: Math.max(0, a.balance),
        })),
      },
      nonCurrentLiabilities: {
        total: totalNonCurrentLiabilities,
        breakdown: nonCurrentLiabilities.map(a => ({
          account: a.name,
          code: a.code,
          amount: Math.max(0, a.balance),
        })),
      },
      total: totalLiabilities,
    },
    equity: {
      total: totalEquity,
      breakdown: equity.map(a => ({
        account: a.name,
        code: a.code,
        amount: Math.abs(a.balance),
      })),
    },
    balanceCheck: {
      totalDebits: totalAssets,
      totalCredits: totalLiabilities + totalEquity,
      isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1,
      difference: totalAssets - (totalLiabilities + totalEquity),
    },
    ratios: {
      workingCapital,
      debtToEquity,
      currentRatio,
      debtToAssets: totalAssets > 0 ? (totalLiabilities / totalAssets * 100).toFixed(2) : 0,
      equityRatio: totalAssets > 0 ? (totalEquity / totalAssets * 100).toFixed(2) : 0,
    },
  });
});

// ============================================================
// CASH FLOW STATEMENT
// ============================================================

router.get('/cash-flow', (req, res) => {
  const { startDate, endDate } = req.query;
  const accounts = Array.from(db.accounts.values());
  const journalEntries = Array.from(db.journalEntries.values());

  // Filter entries by date
  const filteredEntries = journalEntries.filter(e => {
    if (!startDate && !endDate) return true;
    if (startDate && endDate) {
      return e.date >= startDate && e.date <= endDate;
    }
    return true;
  });

  // Operating Activities (simulated based on P&L items)
  const operatingInflows = filteredEntries
    .filter(e => e.entries.some(entry =>
      ['SALES', 'SERVICE', 'OTHER_INC'].includes(entry.account) && entry.credit > 0
    ))
    .reduce((sum, e) => sum + e.entries
      .filter(entry => entry.credit > 0)
      .reduce((s, entry) => s + entry.credit, 0), 0);

  const operatingOutflows = filteredEntries
    .filter(e => e.entries.some(entry =>
      ['SALARY_EXP', 'RENT_EXP', 'OFFICE_EXP', 'MARKETING', 'UTILITIES', 'COGS'].includes(entry.account) && entry.debit > 0
    ))
    .reduce((sum, e) => sum + e.entries
      .filter(entry => entry.debit > 0)
      .reduce((s, entry) => s + entry.debit, 0), 0);

  const netOperating = operatingInflows - operatingOutflows;

  // Investing Activities (simulated)
  const investingInflows = 0; // Asset sales
  const investingOutflows = 50000; // Asset purchases (simulated)
  const netInvesting = investingInflows - investingOutflows;

  // Financing Activities (simulated)
  const financingInflows = 100000; // Loan drawn
  const financingOutflows = 30000; // Loan repayment
  const netFinancing = financingInflows - financingOutflows;

  // Net change in cash
  const netCashChange = netOperating + netInvesting + netFinancing;

  // Beginning and ending cash
  const bankAccounts = Array.from(db.bankAccounts.values());
  const endingCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);
  const beginningCash = endingCash - netCashChange;

  res.json({
    statement: 'Cash Flow Statement',
    period: `${startDate || '2026-01-01'} to ${endDate || new Date().toISOString().split('T')[0]}`,
    summary: {
      beginningCash,
      endingCash,
      netChange: netCashChange,
    },
    operatingActivities: {
      inflows: operatingInflows,
      outflows: operatingOutflows,
      net: netOperating,
      details: [
        { item: 'Cash from customers', amount: operatingInflows },
        { item: 'Cash to suppliers', amount: -operatingOutflows },
      ],
    },
    investingActivities: {
      inflows: investingInflows,
      outflows: investingOutflows,
      net: netInvesting,
      details: [
        { item: 'Purchase of assets', amount: -investingOutflows },
        { item: 'Sale of investments', amount: investingInflows },
      ],
    },
    financingActivities: {
      inflows: financingInflows,
      outflows: financingOutflows,
      net: netFinancing,
      details: [
        { item: 'Proceeds from loan', amount: financingInflows },
        { item: 'Loan repayment', amount: -financingOutflows },
      ],
    },
    reconciliation: {
      operating: netOperating,
      investing: netInvesting,
      financing: netFinancing,
      netChange: netCashChange,
      beginningCash,
      endingCash,
    },
  });
});

// ============================================================
// FINANCIAL RATIOS
// ============================================================

router.get('/ratios', (req, res) => {
  const accounts = Array.from(db.accounts.values());
  const customers = Array.from(db.customers.values());
  const vendors = Array.from(db.vendors.values());
  const bankAccounts = Array.from(db.bankAccounts.values());

  // Calculate totals
  const assets = accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const liabilities = accounts.filter(a => a.type === 'liability').reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const equity = accounts.filter(a => a.type === 'equity').reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const revenue = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);
  const expenses = accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0);
  const profit = revenue - expenses;

  const currentAssets = accounts
    .filter(a => a.type === 'asset' && a.category === 'Current Assets')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const currentLiabilities = accounts
    .filter(a => a.type === 'liability' && a.category === 'Current Liabilities')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const receivables = customers.reduce((sum, c) => sum + c.balance, 0);
  const payables = vendors.reduce((sum, v) => sum + v.balance, 0);
  const cash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);
  const inventory = accounts.find(a => a.id === 'INVENTORY')?.balance || 0;

  // Liquidity Ratios
  const currentRatio = currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : 0;
  const quickRatio = currentLiabilities > 0 ? ((currentAssets - inventory) / currentLiabilities).toFixed(2) : 0;
  const cashRatio = currentLiabilities > 0 ? (cash / currentLiabilities).toFixed(2) : 0;

  // Profitability Ratios
  const profitMargin = revenue > 0 ? ((profit / revenue) * 100).toFixed(2) : 0;
  const grossMargin = revenue > 0 ? ((revenue - (accounts.find(a => a.id === 'COGS')?.balance || 0) / revenue * 100).toFixed(2) : 0;
  const roa = assets > 0 ? ((profit / assets) * 100).toFixed(2) : 0;
  const roe = equity > 0 ? ((profit / equity) * 100).toFixed(2) : 0;

  // Efficiency Ratios
  const assetTurnover = assets > 0 ? (revenue / assets).toFixed(2) : 0;
  const dso = revenue > 0 ? ((receivables / revenue) * 365).toFixed(0) : 0;
  const dpo = expenses > 0 ? ((payables / expenses) * 365).toFixed(0) : 0;

  // Leverage Ratios
  const debtToEquity = equity > 0 ? (liabilities / equity).toFixed(2) : 0;
  const debtToAssets = assets > 0 ? (liabilities / assets * 100).toFixed(2) : 0;
  const interestCoverage = expenses > 0 ? (profit / (expenses * 0.05)).toFixed(2) : 0; // Assuming 5% interest

  // Cash Ratios
  const operatingCashFlow = profit + 100000; // Simulated
  const cashFlowMargin = revenue > 0 ? ((operatingCashFlow / revenue) * 100).toFixed(2) : 0;

  res.json({
    date: new Date().toISOString(),
    liquidity: {
      currentRatio: parseFloat(currentRatio),
      quickRatio: parseFloat(quickRatio),
      cashRatio: parseFloat(cashRatio),
      workingCapital: currentAssets - currentLiabilities,
      interpretation: currentRatio >= 1.5 ? 'Healthy' : currentRatio >= 1 ? 'Acceptable' : 'Needs Attention',
    },
    profitability: {
      profitMargin: parseFloat(profitMargin),
      grossMargin: parseFloat(grossMargin),
      roa: parseFloat(roa),
      roe: parseFloat(roe),
      interpretation: profitMargin >= 20 ? 'Excellent' : profitMargin >= 10 ? 'Good' : 'Needs Improvement',
    },
    efficiency: {
      assetTurnover: parseFloat(assetTurnover),
      dso: parseInt(dso),
      dpo: parseInt(dpo),
      cashConversionCycle: parseInt(dso) + parseInt(dso) - parseInt(dpo),
    },
    leverage: {
      debtToEquity: parseFloat(debtToEquity),
      debtToAssets: parseFloat(debtToAssets),
      interestCoverage: parseFloat(interestCoverage),
      interpretation: debtToEquity <= 1 ? 'Conservative' : debtToEquity <= 2 ? 'Moderate' : 'Aggressive',
    },
    cash: {
      operatingCashFlow,
      cashFlowMargin: parseFloat(cashFlowMargin),
      freeCashFlow: operatingCashFlow - 50000, // Assuming capex
    },
    summary: {
      overallScore: calculateOverallScore({
        currentRatio: parseFloat(currentRatio),
        profitMargin: parseFloat(profitMargin),
        roe: parseFloat(roe),
        debtToEquity: parseFloat(debtToEquity),
      }),
      healthStatus: getHealthStatus({
        currentRatio: parseFloat(currentRatio),
        profitMargin: parseFloat(profitMargin),
        cashFlowMargin: parseFloat(cashFlowMargin),
      }),
    },
  });
});

// ============================================================
// COMPARATIVE STATEMENTS
// ============================================================

router.get('/comparative', (req, res) => {
  const { periods } = req.query;
  const periodsList = periods ? periods.split(',') : ['2026-Q1', '2026-Q2'];

  // Simulated comparative data
  const comparativeData = {
    '2026-Q1': {
      revenue: 450000,
      expenses: 380000,
      profit: 70000,
      assets: 2500000,
      liabilities: 500000,
      equity: 2000000,
      cash: 890000,
    },
    '2026-Q2': {
      revenue: 520000,
      expenses: 410000,
      profit: 110000,
      assets: 2800000,
      liabilities: 480000,
      equity: 2320000,
      cash: 796000,
    },
  };

  const periodsData = periodsList.map(period => ({
    period,
    ...comparativeData[period] || comparativeData['2026-Q2'],
  }));

  // Calculate changes
  const current = periodsData[periodsData.length - 1];
  const previous = periodsData[periodsData.length - 2] || current;

  res.json({
    periods: periodsData,
    changes: {
      revenue: {
        change: current.revenue - previous.revenue,
        percent: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue * 100).toFixed(2) : 0,
        trend: current.revenue > previous.revenue ? 'up' : 'down',
      },
      expenses: {
        change: current.expenses - previous.expenses,
        percent: previous.expenses > 0 ? ((current.expenses - previous.expenses) / previous.expenses * 100).toFixed(2) : 0,
        trend: current.expenses < previous.expenses ? 'improved' : 'worse',
      },
      profit: {
        change: current.profit - previous.profit,
        percent: previous.profit > 0 ? ((current.profit - previous.profit) / previous.profit * 100).toFixed(2) : 0,
        trend: current.profit > previous.profit ? 'up' : 'down',
      },
      cash: {
        change: current.cash - previous.cash,
        percent: previous.cash > 0 ? ((current.cash - previous.cash) / previous.cash * 100).toFixed(2) : 0,
        trend: current.cash > previous.cash ? 'up' : 'down',
      },
    },
    horizontalAnalysis: periodsData.map((period, index) => ({
      period,
      revenue: period.revenue,
      expenses: period.expenses,
      profit: period.profit,
      basePeriod: index === 0,
    })),
    verticalAnalysis: {
      revenue: 100,
      expenses: (current.expenses / current.revenue * 100).toFixed(2),
      profit: (current.profit / current.revenue * 100).toFixed(2),
      breakdown: {
        cogs: 35,
        salaries: 25,
        marketing: 10,
        rent: 8,
        other: 22,
      },
    },
  });
});

// ============================================================
// COMMON SIZE STATEMENTS
// ============================================================

router.get('/common-size', (req, res) => {
  const accounts = Array.from(db.accounts.values());
  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((sum, a) => sum + Math.abs(a.balance), 0);
  const revenue = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);

  res.json({
    statement: 'Common Size Statement',
    balanceSheet: {
      totalAssets,
      assets: accounts
        .filter(a => a.type === 'asset')
        .map(a => ({
          account: a.name,
          amount: Math.abs(a.balance),
          percentage: totalAssets > 0 ? (Math.abs(a.balance) / totalAssets * 100).toFixed(2) : 0,
        })),
    },
    incomeStatement: {
      revenue,
      items: accounts
        .filter(a => a.type === 'revenue' || a.type === 'expense')
        .map(a => ({
          account: a.name,
          amount: a.balance,
          percentage: revenue > 0 ? (a.balance / revenue * 100).toFixed(2) : 0,
        })),
    },
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function calculateOverallScore(metrics) {
  let score = 50;

  // Current ratio contribution
  if (metrics.currentRatio >= 2) score += 15;
  else if (metrics.currentRatio >= 1.5) score += 10;
  else if (metrics.currentRatio >= 1) score += 5;

  // Profit margin contribution
  if (metrics.profitMargin >= 20) score += 20;
  else if (metrics.profitMargin >= 10) score += 15;
  else if (metrics.profitMargin >= 5) score += 10;

  // ROE contribution
  if (metrics.roe >= 20) score += 15;
  else if (metrics.roe >= 10) score += 10;
  else if (metrics.roe >= 0) score += 5;

  // Debt to equity contribution
  if (metrics.debtToEquity <= 1) score += 10;
  else if (metrics.debtToEquity <= 2) score += 5;

  return Math.min(100, score);
}

function getHealthStatus(metrics) {
  if (metrics.currentRatio >= 1.5 && metrics.profitMargin >= 10 && metrics.cashFlowMargin >= 10) {
    return 'Excellent';
  }
  if (metrics.currentRatio >= 1 && metrics.profitMargin >= 5 && metrics.cashFlowMargin >= 5) {
    return 'Good';
  }
  if (metrics.currentRatio >= 1 && metrics.profitMargin >= 0) {
    return 'Fair';
  }
  return 'Needs Attention';
}

export default router;
