/**
 * RTMN Finance OS - Bank Reconciliation & Cash Flow Forecasting
 */

import express from 'express';
const router = express.Router();

// ============================================================
// BANK RECONCILIATION
// ============================================================

// Get bank statements
router.get('/statements', (req, res) => {
  const { bankAccountId, startDate, endDate } = req.query;

  let statements = Array.from(db.bankStatements?.values() || []);

  if (bankAccountId) statements = statements.filter(s => s.bankAccountId === bankAccountId);
  if (startDate) statements = statements.filter(s => s.date >= startDate);
  if (endDate) statements = statements.filter(s => s.date <= endDate);

  res.json({
    statements,
    total: statements.length,
  });
});

// Import bank statement
router.post('/statements/import', (req, res) => {
  const { bankAccountId, transactions } = req.body;

  const imported = [];
  transactions.forEach(txn => {
    const id = `STMT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const statement = {
      id,
      bankAccountId,
      date: txn.date,
      description: txn.description,
      reference: txn.reference || txn.chequeNo || '',
      debit: txn.debit || 0,
      credit: txn.credit || 0,
      balance: txn.balance,
      type: txn.debit > 0 ? 'debit' : 'credit',
      matched: false,
      matchedTo: null,
      importedAt: new Date().toISOString(),
    };

    db.bankStatements = db.bankStatements || new Map();
    db.bankStatements.set(id, statement);
    imported.push(statement);
  });

  res.json({
    imported: imported.length,
    statements: imported,
  });
});

// Match transactions
router.post('/reconcile/:bankAccountId', (req, res) => {
  const { bankAccountId } = req.params;
  const statements = Array.from(db.bankStatements?.values() || [])
    .filter(s => s.bankAccountId === bankAccountId && !s.matched);

  const journalEntries = Array.from(db.journalEntries.values())
    .filter(je => je.entries?.some(e =>
      e.account === 'BANK' &&
      (e.debit > 0 || e.credit > 0)
    ));

  const matched = [];
  const unmatched = [];

  statements.forEach(stmt => {
    const stmtAmount = stmt.credit || stmt.debit;
    const stmtDate = stmt.date;

    // Find matching journal entry
    const match = journalEntries.find(je => {
      const jeAmount = je.entries.find(e => e.account === 'BANK')?.credit - je.entries.find(e => e.account === 'BANK')?.debit;
      return Math.abs(jeAmount - stmtAmount) < 1 &&
             Math.abs(new Date(je.date) - new Date(stmtDate)) < 3;
    });

    if (match) {
      stmt.matched = true;
      stmt.matchedTo = match.id;
      matched.push(stmt);
    } else {
      unmatched.push(stmt);
    }
  });

  // Update statements
  matched.forEach(stmt => {
    db.bankStatements.set(stmt.id, stmt);
  });

  res.json({
    matched: matched.length,
    unmatched: unmatched.length,
    matchedStatements: matched,
    unmatchedStatements: unmatched,
    reconciliationStatus: unmatched.length === 0 ? 'Complete' : 'Pending',
  });
});

// Bank reconciliation report
router.get('/report/:bankAccountId', (req, res) => {
  const { bankAccountId } = req.params;
  const statements = Array.from(db.bankStatements?.values() || [])
    .filter(s => s.bankAccountId === bankAccountId);

  const matched = statements.filter(s => s.matched);
  const unmatched = statements.filter(s => !s.matched);

  // Calculate book vs bank balance
  const bank = db.bankAccounts.get(bankAccountId);
  const bankBalance = bank?.balance || 0;

  const unclearedCheques = unmatched.filter(s => s.type === 'debit');
  const depositsInTransit = unmatched.filter(s => s.type === 'credit');

  res.json({
    bankAccount: bank?.name || bankAccountId,
    asOfDate: new Date().toISOString(),
    bankBalance,
    bookBalance: bankBalance,
    bankStatementBalance: statements[statements.length - 1]?.balance || bankBalance,
    reconciliation: {
      matched: matched.length,
      unclearedCheques: unclearedCheques.reduce((s, t) => s + t.debit, 0),
      depositsInTransit: depositsInTransit.reduce((s, t) => s + t.credit, 0),
      adjustedBankBalance: bankBalance + unclearedCheques.reduce((s, t) => s + t.debit, 0) - depositsInTransit.reduce((s, t) => s + t.credit, 0),
      adjustedBookBalance: bankBalance,
      difference: 0,
    },
    unmatchedDetails: {
      cheques: unclearedCheques,
      deposits: depositsInTransit,
    },
    status: 'Reconciled',
  });
});

// ============================================================
// CASH FLOW FORECASTING
// ============================================================

// Get cash forecast
router.get('/forecast', (req, res) => {
  const { days } = req.query;
  const forecastDays = parseInt(days) || 30;

  const bankAccounts = Array.from(db.bankAccounts.values());
  const currentCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  // Get scheduled payments (simulated)
  const scheduledPayments = [
    { date: addDays(new Date(), 5).toISOString().split('T')[0], description: 'Rent', amount: 100000, type: 'expense' },
    { date: addDays(new Date(), 7).toISOString().split('T')[0], description: 'Salary', amount: 500000, type: 'expense' },
    { date: addDays(new Date(), 10).toISOString().split('T')[0], description: 'EMI', amount: 50000, type: 'expense' },
    { date: addDays(new Date(), 15).toISOString().split('T')[0], description: 'GST Payment', amount: 80000, type: 'expense' },
    { date: addDays(new Date(), 20).toISOString().split('T')[0], description: 'Vendor Payment', amount: 150000, type: 'expense' },
  ];

  const expectedReceipts = [
    { date: addDays(new Date(), 3).toISOString().split('T')[0], description: 'Customer Payment - Acme', amount: 200000, type: 'receipt' },
    { date: addDays(new Date(), 8).toISOString().split('T')[0], description: 'Customer Payment - TechStart', amount: 100000, type: 'receipt' },
    { date: addDays(new Date(), 12).toISOString().split('T')[0], description: 'Customer Payment - Global', amount: 300000, type: 'receipt' },
    { date: addDays(new Date(), 18).toISOString().split('T')[0], description: 'Customer Payment - ABC Corp', amount: 150000, type: 'receipt' },
  ];

  // Generate daily forecast
  const forecast = [];
  let runningBalance = currentCash;

  for (let i = 0; i < forecastDays; i++) {
    const date = addDays(new Date(), i).toISOString().split('T')[0];
    const dayPayments = scheduledPayments.filter(p => p.date === date);
    const dayReceipts = expectedReceipts.filter(r => r.date === date);

    const totalPayments = dayPayments.reduce((s, p) => s + p.amount, 0);
    const totalReceipts = dayReceipts.reduce((s, r) => s + r.amount, 0);
    const netFlow = totalReceipts - totalPayments;

    runningBalance += netFlow;

    forecast.push({
      date,
      day: i + 1,
      openingBalance: runningBalance - netFlow,
      receipts: totalReceipts,
      payments: totalPayments,
      netFlow,
      closingBalance: runningBalance,
      events: [...dayPayments, ...dayReceipts],
    });
  }

  // Calculate runway
  const runwayDays = forecast.filter(d => d.closingBalance > 0).length;
  const lowestPoint = Math.min(...forecast.map(d => d.closingBalance));

  // Cash warnings
  const warnings = [];
  if (lowestPoint < 100000) {
    warnings.push({
      type: 'critical',
      message: `Cash will drop to ₹${(lowestPoint / 100000).toFixed(1)}L on ${forecast.find(d => d.closingBalance === lowestPoint)?.date}`,
    });
  }
  if (runwayDays < 30) {
    warnings.push({
      type: 'warning',
      message: `Cash runway only ${runwayDays} days`,
    });
  }

  res.json({
    currentCash,
    forecast: forecast.slice(0, 90), // 90 days
    summary: {
      startBalance: currentCash,
      endBalance: runningBalance,
      totalReceipts: forecast.reduce((s, d) => s + d.receipts, 0),
      totalPayments: forecast.reduce((s, d) => s + d.payments, 0),
      netChange: runningBalance - currentCash,
      runwayDays,
      lowestPoint,
      avgDailyBurn: (forecast.reduce((s, d) => s + d.payments - d.receipts, 0) / forecastDays).toFixed(0),
    },
    warnings,
    alerts: warnings.filter(w => w.type === 'critical'),
  });
});

// What-if scenario
router.post('/scenario', (req, res) => {
  const { scenario, params } = req.body;

  const bankAccounts = Array.from(db.bankAccounts.values());
  const baseCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  let scenarioCash = baseCash;
  let scenarioName = 'Base Case';
  let scenarioImpact = 0;

  switch (scenario) {
    case 'revenue_drop_20':
      scenarioName = 'Revenue Drop 20%';
      scenarioImpact = -baseCash * 0.2;
      scenarioCash -= scenarioImpact;
      break;
    case 'revenue_drop_50':
      scenarioName = 'Revenue Drop 50%';
      scenarioImpact = -baseCash * 0.5;
      scenarioCash -= scenarioImpact;
      break;
    case 'delayed_receipts':
      scenarioName = 'Delayed Receipts (30 days)';
      scenarioImpact = -500000;
      scenarioCash -= scenarioImpact;
      break;
    case 'new_hire':
      scenarioName = 'Hire 5 Engineers';
      scenarioImpact = 50000 * 5;
      scenarioCash -= scenarioImpact;
      break;
    case 'marketing_campaign':
      scenarioName = 'Marketing Campaign';
      scenarioImpact = -200000;
      scenarioCash -= scenarioImpact;
      break;
    default:
      scenarioName = scenario;
  }

  const runway30 = scenarioCash > 0 ? '30+ days' : 'Below 30 days';
  const runway60 = scenarioCash - (50000 * 60) > 0 ? '60+ days' : 'Below 60 days';

  res.json({
    scenario: scenarioName,
    baseCash,
    scenarioCash,
    impact: scenarioImpact,
    impactPercent: ((scenarioImpact / baseCash) * 100).toFixed(1),
    runway: {
      current: runway30,
      scenario: scenarioCash > 0 ? '30+ days' : `${Math.floor(scenarioCash / 50000)} days`,
    },
    recommendation: scenarioCash < 100000
      ? '⚠️ Cash reserves running low. Consider fundraising or cost optimization.'
      : '✅ Cash position is healthy. Monitor closely.',
  });
});

// ============================================================
// LIQUIDITY MANAGEMENT
// ============================================================

router.get('/liquidity', (req, res) => {
  const bankAccounts = Array.from(db.bankAccounts.values());
  const totalCash = bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  // Current liabilities
  const liabilities = Array.from(db.bills.values())
    .filter(b => b.status !== 'paid')
    .reduce((sum, b) => sum + b.balance, 0);

  // Quick assets (cash + receivables)
  const receivables = Array.from(db.invoices.values())
    .filter(i => i.status !== 'paid')
    .reduce((sum, i) => sum + i.balance, 0);

  const quickAssets = totalCash + receivables;

  const liquidityRatios = {
    currentRatio: liabilities > 0 ? (quickAssets / liabilities).toFixed(2) : 'N/A',
    quickRatio: liabilities > 0 ? (totalCash / liabilities).toFixed(2) : 'N/A',
    cashRatio: liabilities > 0 ? (totalCash / liabilities).toFixed(2) : 'N/A',
    cashToReceivables: receivables > 0 ? (totalCash / receivables).toFixed(2) : 'N/A',
  };

  const status = liquidityRatios.currentRatio >= 1.5 ? 'Healthy' :
                liquidityRatios.currentRatio >= 1 ? 'Adequate' : 'Attention Needed';

  res.json({
    cash: totalCash,
    receivables,
    quickAssets,
    currentLiabilities: liabilities,
    ratios: liquidityRatios,
    status,
    recommendations: liquidityRatios.currentRatio < 1 ? [
      'Accelerate collections from debtors',
      'Negotiate extended payment terms with vendors',
      'Consider short-term credit facility',
    ] : [],
  });
});

// ============================================================
// WORKING CAPITAL
// ============================================================

router.get('/working-capital', (req, res) => {
  const assets = Array.from(db.accounts.values()).filter(a => a.type === 'asset');
  const liabilities = Array.from(db.accounts.values()).filter(a => a.type === 'liability');

  const currentAssets = assets
    .filter(a => a.category === 'Current Assets')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const currentLiabilities = liabilities
    .filter(a => a.category === 'Current Liabilities')
    .reduce((sum, a) => sum + Math.abs(a.balance), 0);

  const workingCapital = currentAssets - currentLiabilities;

  // Components
  const debtors = Array.from(db.customers.values())
    .reduce((sum, c) => sum + c.balance, 0);

  const creditors = Array.from(db.vendors.values())
    .reduce((sum, v) => sum + v.balance, 0);

  const inventory = assets.find(a => a.id === 'INVENTORY')?.balance || 0;
  const cash = assets.find(a => a.id === 'CASH' || a.id === 'BANK')?.balance || 0;

  res.json({
    workingCapital,
    currentAssets,
    currentLiabilities,
    currentRatio: currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : 'N/A',
    quickRatio: (currentLiabilities > 0 && inventory > 0)
      ? ((currentAssets - inventory) / currentLiabilities).toFixed(2)
      : currentLiabilities > 0 ? (currentAssets / currentLiabilities).toFixed(2) : 'N/A',
    components: {
      cash,
      debtors,
      inventory,
      creditors,
    },
    cycle: {
      dso: debtors > 0 ? ((debtors / 100000) * 30).toFixed(0) : 0, // Days Sales Outstanding
      dpo: creditors > 0 ? ((creditors / 100000) * 30).toFixed(0) : 0, // Days Payable Outstanding
      dio: inventory > 0 ? ((inventory / 50000) * 30).toFixed(0) : 0, // Days Inventory Outstanding
      ccc: 0, // Cash Conversion Cycle
    },
  });
});

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export default router;
