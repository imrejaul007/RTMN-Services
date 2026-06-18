/**
 * RTMN Finance OS - AI Finance Agent
 *
 * Comprehensive AI agent that can answer all finance questions
 * Uses rule-based responses (can be upgraded to GPT-4/Claude)
 */

import OpenAI from 'openai';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;
const anthropic = ANTHROPIC_API_KEY ? { messages: { create: async () => null } } : null;

// ============================================================
// AI FINANCE AGENT CLASS
// ============================================================

class AIFinanceAgent {
  constructor() {
    this.name = 'Finance AI Agent';
    this.version = '1.0';
    this.capabilities = [
      'financial_health',
      'cash_management',
      'ar_management',
      'ap_management',
      'budget_analysis',
      'tax_compliance',
      'fraud_detection',
      'forecasting',
      'scenario_planning',
      'recommendations',
    ];
  }

  // Main chat handler
  async chat(message, context = {}, db) {
    const lowerMsg = message.toLowerCase();

    // Route to appropriate handler
    if (this.isCashQuestion(lowerMsg)) {
      return this.handleCashQuestion(context, db);
    }
    if (this.isARQuestion(lowerMsg)) {
      return this.handleARQuestion(lowerMsg, context, db);
    }
    if (this.isAPQuestion(lowerMsg)) {
      return this.handleAPQuestion(lowerMsg, context, db);
    }
    if (this.isProfitQuestion(lowerMsg)) {
      return this.handleProfitQuestion(context, db);
    }
    if (this.isBudgetQuestion(lowerMsg)) {
      return this.handleBudgetQuestion(context, db);
    }
    if (this.isHealthQuestion(lowerMsg)) {
      return this.handleHealthQuestion(context, db);
    }
    if (this.isForecastQuestion(lowerMsg)) {
      return this.handleForecastQuestion(context, db);
    }
    if (this.isTaxQuestion(lowerMsg)) {
      return this.handleTaxQuestion(context, db);
    }
    if (this.isAuditQuestion(lowerMsg)) {
      return this.handleAuditQuestion(context, db);
    }

    // Default response
    return this.handleGeneralQuestion(message, context, db);
  }

  // Question type detection
  isCashQuestion(msg) {
    return msg.includes('cash') || msg.includes('bank') || msg.includes('balance') || msg.includes('liquidity');
  }

  isARQuestion(msg) {
    return msg.includes('receivable') || msg.includes('customer') && msg.includes('owe') || msg.includes('invoice') || msg.includes('collection');
  }

  isAPQuestion(msg) {
    return msg.includes('payable') || msg.includes('vendor') && msg.includes('owe') || msg.includes('bill') || msg.includes('payment') && msg.includes('vendor');
  }

  isProfitQuestion(msg) {
    return msg.includes('profit') || msg.includes('revenue') || msg.includes('expense') || msg.includes('margin') || msg.includes('loss');
  }

  isBudgetQuestion(msg) {
    return msg.includes('budget') || msg.includes('spend') || msg.includes('overspend') || msg.includes('forecast');
  }

  isHealthQuestion(msg) {
    return msg.includes('health') || msg.includes('status') || msg.includes('overview') || msg.includes('summary') || msg.includes('how') && msg.includes('company');
  }

  isForecastQuestion(msg) {
    return msg.includes('forecast') || msg.includes('runway') || msg.includes('burn') || msg.includes('predict') || msg.includes('what if');
  }

  isTaxQuestion(msg) {
    return msg.includes('tax') || msg.includes('gst') || msg.includes('tds') || msg.includes('compliance');
  }

  isAuditQuestion(msg) {
    return msg.includes('audit') || msg.includes('fraud') || msg.includes('risk') || msg.includes('anomaly');
  }

  // ============================================================
  // CASH HANDLER
  // ============================================================

  async handleCashQuestion(context, db) {
    const banks = Array.from(db.bankAccounts?.values() || []);
    const totalCash = banks.reduce((sum, b) => sum + b.balance, 0);

    const breakdown = banks.map(b => ({
      name: b.name,
      balance: b.balance,
      type: b.type,
    }));

    const insights = this.generateCashInsights(totalCash, banks);

    return {
      response: `You have ₹${(totalCash / 100000).toFixed(1)}L across ${banks.length} bank accounts.\n\n` +
        breakdown.map(b => `• ${b.name}: ₹${(b.balance / 100000).toFixed(1)}L (${b.type})`).join('\n'),
      data: {
        totalCash,
        breakdown,
        insights,
      },
      actions: [
        { type: 'link', label: 'View Cash Position', endpoint: '/treasury/cash-position' },
        { type: 'link', label: 'View Bank Accounts', endpoint: '/treasury/bank-accounts' },
        { type: 'link', label: 'Cash Flow Forecast', endpoint: '/treasury/forecast' },
      ],
      charts: [
        { type: 'bar', title: 'Cash by Account', data: breakdown },
      ],
    };
  }

  // ============================================================
  // AR HANDLER
  // ============================================================

  async handleARQuestion(msg, context, db) {
    const customers = Array.from(db.customers?.values() || []);
    const invoices = Array.from(db.invoices?.values() || []);

    const totalReceivable = customers.reduce((sum, c) => sum + c.balance, 0);
    const overdueInvoices = invoices.filter(i => {
      const due = new Date(i.dueDate);
      const today = new Date();
      return due < today && i.status !== 'paid';
    });

    const aging = this.calculateAging(invoices);
    const topCustomers = customers.sort((a, b) => b.balance - a.balance).slice(0, 5);

    let response = `Total receivables: ₹${(totalReceivable / 100000).toFixed(1)}L from ${customers.length} customers.\n\n`;

    if (overdueInvoices.length > 0) {
      response += `⚠️ ${overdueInvoices.length} overdue invoices worth ₹${(overdueInvoices.reduce((s, i) => s + i.balance, 0) / 100000).toFixed(1)}L\n\n`;
    }

    response += `Top 5 customers by balance:\n`;
    topCustomers.forEach(c => {
      response += `• ${c.name}: ₹${(c.balance / 100000).toFixed(1)}L\n`;
    });

    return {
      response,
      data: {
        totalReceivable,
        overdueCount: overdueInvoices.length,
        overdueAmount: overdueInvoices.reduce((s, i) => s + i.balance, 0),
        aging,
        topCustomers,
      },
      actions: [
        { type: 'link', label: 'View AR Aging', endpoint: '/ar/aging' },
        { type: 'link', label: 'View All Invoices', endpoint: '/ar/invoices' },
        { type: 'action', label: 'Send Reminders', action: 'send_reminders' },
      ],
    };
  }

  // ============================================================
  // AP HANDLER
  // ============================================================

  async handleAPQuestion(msg, context, db) {
    const vendors = Array.from(db.vendors?.values() || []);
    const bills = Array.from(db.bills?.values() || []);

    const totalPayable = vendors.reduce((sum, v) => sum + v.balance, 0);
    const pendingBills = bills.filter(b => b.status !== 'paid');
    const dueThisWeek = pendingBills.filter(b => {
      const due = new Date(b.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return due <= weekFromNow;
    });

    let response = `Total payables: ₹${(totalPayable / 100000).toFixed(1)}L to ${vendors.length} vendors.\n\n`;

    if (dueThisWeek.length > 0) {
      response += `📅 ${dueThisWeek.length} bills due this week (₹${(dueThisWeek.reduce((s, b) => s + b.balance, 0) / 100000).toFixed(1)}L)\n`;
      response += `• ${dueThisWeek.slice(0, 3).map(b => `${b.billNumber}: ₹${(b.balance / 1000).toFixed(0)}K`).join('\n• ') + '\n';
    }

    return {
      response,
      data: {
        totalPayable,
        pendingBills: pendingBills.length,
        dueThisWeek: dueThisWeek.length,
        dueThisWeekAmount: dueThisWeek.reduce((s, b) => s + b.balance, 0),
      },
      actions: [
        { type: 'link', label: 'View AP Aging', endpoint: '/ap/aging' },
        { type: 'link', label: 'Process Payments', endpoint: '/ap/payment-run' },
      ],
    };
  }

  // ============================================================
  // PROFIT HANDLER
  // ============================================================

  async handleProfitQuestion(context, db) {
    const accounts = Array.from(db.accounts?.values() || []);

    const revenue = accounts
      .filter(a => a.type === 'revenue')
      .reduce((sum, a) => sum + a.balance, 0);

    const expenses = accounts
      .filter(a => a.type === 'expense')
      .reduce((sum, a) => sum + a.balance, 0);

    const profit = revenue - expenses;
    const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;

    const revenueBreakdown = accounts
      .filter(a => a.type === 'revenue')
      .map(a => ({ name: a.name, value: a.balance }));

    const expenseBreakdown = accounts
      .filter(a => a.type === 'expense')
      .map(a => ({ name: a.name, value: a.balance }));

    let response = `Revenue: ₹${(revenue / 100000).toFixed(1)}L\n`;
    response += `Expenses: ₹${(expenses / 100000).toFixed(1)}L\n`;
    response += `Net Profit: ₹${(profit / 100000).toFixed(1)}L (${margin}% margin)\n\n`;

    if (profit > 0) {
      response += '✅ Profitable operation\n';
    } else {
      response += '⚠️ Operating at a loss\n';
    }

    return {
      response,
      data: {
        revenue,
        expenses,
        profit,
        margin: parseFloat(margin),
        revenueBreakdown,
        expenseBreakdown,
      },
      actions: [
        { type: 'link', label: 'View P&L', endpoint: '/financial/profit-loss' },
        { type: 'link', label: 'View Trial Balance', endpoint: '/trial-balance' },
      ],
      charts: [
        { type: 'bar', title: 'Revenue vs Expenses', data: [{ name: 'Revenue', value: revenue }, { name: 'Expenses', value: expenses }, { name: 'Profit', value: profit }] },
      ],
    };
  }

  // ============================================================
  // BUDGET HANDLER
  // ============================================================

  async handleBudgetQuestion(context, db) {
    const budgets = Array.from(db.budgets?.values() || []);

    const totalAllocated = budgets.reduce((sum, b) => sum + b.allocated, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const spentPercent = totalAllocated > 0 ? ((totalSpent / totalAllocated) * 100).toFixed(0) : 0;

    const overBudget = budgets.filter(b => b.spent > b.allocated);
    const underBudget = budgets.filter(b => b.spent < b.allocated * 0.8);

    let response = `Total budget: ₹${(totalAllocated / 100000).toFixed(1)}L\n`;
    response += `Spent: ₹${(totalSpent / 100000).toFixed(1)}L (${spentPercent}%)\n`;
    response += `Remaining: ₹${((totalAllocated - totalSpent) / 100000).toFixed(1)}L\n\n`;

    if (overBudget.length > 0) {
      response += `⚠️ Over budget: ${overBudget.map(b => `${b.department}`).join(', ')}\n`;
    }

    const deptBreakdown = budgets.map(b => ({
      department: b.department,
      allocated: b.allocated,
      spent: b.spent,
      variance: b.allocated - b.spent,
      percent: ((b.spent / b.allocated) * 100).toFixed(0),
    }));

    return {
      response,
      data: {
        totalAllocated,
        totalSpent,
        remaining: totalAllocated - totalSpent,
        percentUsed: parseInt(spentPercent),
        departmentBreakdown: deptBreakdown,
      },
      actions: [
        { type: 'link', label: 'View All Budgets', endpoint: '/budgets' },
        { type: 'link', label: 'Budget Report', endpoint: '/budgets/report' },
      ],
      charts: [
        { type: 'bar', title: 'Budget by Department', data: deptBreakdown },
      ],
    };
  }

  // ============================================================
  // HEALTH HANDLER
  // ============================================================

  async handleHealthQuestion(context, db) {
    const accounts = Array.from(db.accounts?.values() || []);
    const customers = Array.from(db.customers?.values() || []);
    const vendors = Array.from(db.vendors?.values() || []);
    const banks = Array.from(db.bankAccounts?.values() || []);

    const revenue = accounts.filter(a => a.type === 'revenue').reduce((sum, a) => sum + a.balance, 0);
    const expenses = accounts.filter(a => a.type === 'expense').reduce((sum, a) => sum + a.balance, 0);
    const profit = revenue - expenses;
    const totalCash = banks.reduce((sum, b) => sum + b.balance, 0);
    const receivables = customers.reduce((sum, c) => sum + c.balance, 0);
    const payables = vendors.reduce((sum, v) => sum + v.balance, 0);

    // Calculate health score
    let healthScore = 50;

    // Profitability (+20)
    if (profit > 0) healthScore += 20;
    else healthScore -= 20;

    // Liquidity (+15)
    if (totalCash > payables * 0.5) healthScore += 15;
    else if (totalCash > payables * 0.25) healthScore += 10;

    // Efficiency (+15)
    if (receivables < revenue * 0.3) healthScore += 15;
    else if (receivables < revenue * 0.5) healthScore += 10;

    healthScore = Math.min(100, Math.max(0, healthScore));

    const status = healthScore >= 75 ? 'Excellent' :
                   healthScore >= 60 ? 'Good' :
                   healthScore >= 40 ? 'Fair' : 'Needs Attention';

    let response = `📊 Financial Health Score: ${healthScore}/100 (${status})\n\n`;
    response += `💰 Cash: ₹${(totalCash / 100000).toFixed(1)}L\n`;
    response += `📈 Revenue: ₹${(revenue / 100000).toFixed(1)}L\n`;
    response += `💸 Expenses: ₹${(expenses / 100000).toFixed(1)}L\n`;
    response += `📊 Profit: ₹${(profit / 100000).toFixed(1)}L\n`;
    response += `📋 Receivables: ₹${(receivables / 100000).toFixed(1)}L\n`;
    response += `📑 Payables: ₹${(payables / 100000).toFixed(1)}L\n\n`;

    response += status === 'Excellent' ? '✅ Business is performing well\n' :
               status === 'Good' ? '👍 Business is stable\n' :
               status === 'Fair' ? '⚠️ Some areas need attention\n' : '🚨 Immediate action required\n';

    return {
      response,
      data: {
        healthScore,
        status,
        cash: totalCash,
        revenue,
        expenses,
        profit,
        receivables,
        payables,
      },
      actions: [
        { type: 'link', label: 'View Dashboard', endpoint: '/dashboard/overview' },
        { type: 'link', label: 'View Financials', endpoint: '/financial/profit-loss' },
      ],
    };
  }

  // ============================================================
  // FORECAST HANDLER
  // ============================================================

  async handleForecastQuestion(context, db) {
    const banks = Array.from(db.bankAccounts?.values() || []);
    const cash = banks.reduce((sum, b) => sum + b.balance, 0);

    // Simulated monthly burn rate
    const monthlyBurn = 320000; // ₹32L
    const runway = cash / monthlyBurn;

    let response = `Cash runway: ${runway.toFixed(1)} months\n`;
    response += `Current cash: ₹${(cash / 100000).toFixed(1)}L\n`;
    response += `Monthly burn: ₹${(monthlyBurn / 100000).toFixed(1)}L\n\n`;

    if (runway < 6) {
      response += `🚨 Warning: Less than 6 months runway!\n`;
      response += `Recommendations:\n`;
      response += `• Accelerate collections\n`;
      response += `• Reduce discretionary spend\n`;
      response += `• Consider fundraising\n`;
    } else if (runway < 12) {
      response += `⚠️ 6-12 months runway - monitor closely\n`;
    } else {
      response += `✅ Healthy runway (>12 months)\n`;
    }

    return {
      response,
      data: {
        cash,
        monthlyBurn,
        runway: runway.toFixed(1),
        projections: [
          { month: 'Month 1', cash: cash - monthlyBurn },
          { month: 'Month 3', cash: cash - monthlyBurn * 3 },
          { month: 'Month 6', cash: cash - monthlyBurn * 6 },
          { month: 'Month 12', cash: cash - monthlyBurn * 12 },
        ],
      },
      actions: [
        { type: 'link', label: 'Cash Forecast', endpoint: '/treasury/forecast' },
        { type: 'link', label: 'Scenario Planning', endpoint: '/treasury/scenario' },
      ],
      alerts: runway < 6 ? ['Low runway warning'] : [],
    };
  }

  // ============================================================
  // TAX HANDLER
  // ============================================================

  async handleTaxQuestion(context, db) {
    const GST_RATE = 0.18;
    const invoices = Array.from(db.invoices?.values() || []);
    const bills = Array.from(db.bills?.values() || []);

    const outputGST = invoices.reduce((sum, i) => sum + (i.tax || 0), 0) * GST_RATE;
    const inputGST = bills.reduce((sum, b) => sum + (b.tax || 0) * GST_RATE, 0);
    const GSTPayable = outputGST - inputGST;

    let response = `GST Summary:\n`;
    response += `Output GST (collected): ₹${(outputGST / 100000).toFixed(1)}L\n`;
    response += `Input GST (paid): ₹${(inputGST / 100000).toFixed(1)}L\n`;
    response += `GST Payable: ₹${(GSTPayable / 100000).toFixed(1)}L\n\n`;
    response += `📅 Filing due: 20th of next month\n`;
    response += `⚠️ Ensure all invoices have valid GSTIN\n`;

    return {
      response,
      data: {
        outputGST,
        inputGST,
        GSTPayable: Math.max(0, GSTPayable),
        refund: Math.max(0, inputGST - outputGST),
      },
      actions: [
        { type: 'link', label: 'View GST Summary', endpoint: '/tax/gst/summary' },
        { type: 'link', label: 'Compliance Calendar', endpoint: '/tax/compliance/calendar' },
      ],
    };
  }

  // ============================================================
  // AUDIT HANDLER
  // ============================================================

  async handleAuditQuestion(context, db) {
    const invoices = Array.from(db.invoices?.values() || []);
    const expenses = Array.from(db.expenses?.values() || []);
    const journalEntries = Array.from(db.journalEntries?.values() || []);

    let riskCount = 0;
    const risks = [];

    // Check for anomalies
    const duplicateAmounts = {};
    invoices.forEach(inv => {
      const key = `${inv.customerId}-${inv.total}`;
      if (duplicateAmounts[key]) {
        risks.push(`⚠️ Duplicate invoice: ${inv.invoiceNumber}`);
        riskCount++;
      }
      duplicateAmounts[key] = inv.id;
    });

    // Check for large round amounts
    journalEntries.forEach(je => {
      const amount = je.entries.reduce((s, e) => s + e.debit, 0);
      if (amount > 100000 && amount % 100000 === 0) {
        risks.push(`Large round amount: ₹${amount / 100000}L in ${je.reference}`);
        riskCount++;
      }
    });

    let response = riskCount === 0 ?
      '✅ No audit risks detected' :
      `⚠️ ${riskCount} potential risks found:\n\n${risks.slice(0, 5).join('\n')}`;

    return {
      response,
      data: {
        riskCount,
        risks: risks.slice(0, 10),
        auditStatus: riskCount === 0 ? 'Clear' : 'Needs Review',
      },
      actions: [
        { type: 'link', label: 'Fraud Detection', endpoint: '/audit/fraud-detection' },
        { type: 'link', label: 'Compliance Check', endpoint: '/audit/compliance' },
      ],
    };
  }

  // ============================================================
  // GENERAL HANDLER
  // ============================================================

  async handleGeneralQuestion(message, context, db) {
    return {
      response: `I can help with:\n\n` +
        `💰 Cash & Banking - "How much cash do we have?"\n` +
        `📋 Receivables - "Who owes us?"\n` +
        `📑 Payables - "Who do we owe?"\n` +
        `📈 Profit - "What's our profit margin?"\n` +
        `📊 Budget - "Are we on budget?"\n` +
        `🔮 Forecast - "What's our runway?"\n` +
        `📋 Tax - "What's our GST?"\n` +
        `🔍 Audit - "Any risks?"\n\n` +
        `What would you like to know?`,
      suggestions: [
        'How much cash do we have?',
        'Who owes us money?',
        'What\'s our profit margin?',
        'Are we on budget?',
        'What\'s our runway?',
      ],
    };
  }

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  generateCashInsights(cash, banks) {
    const insights = [];

    if (cash > 5000000) {
      insights.push({ type: 'positive', message: 'Strong cash position' });
    } else if (cash > 1000000) {
      insights.push({ type: 'neutral', message: 'Adequate cash reserves' });
    } else {
      insights.push({ type: 'warning', message: 'Cash reserves running low' });
    }

    const operatingCash = banks
      .filter(b => b.type === 'checking')
      .reduce((s, b) => s + b.balance, 0);

    if (operatingCash < 500000) {
      insights.push({ type: 'warning', message: 'Operating cash low' });
    }

    return insights;
  }

  calculateAging(invoices) {
    const today = new Date();
    const aging = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };

    invoices.filter(i => i.status !== 'paid').forEach(inv => {
      const due = new Date(inv.dueDate);
      const days = Math.floor((today - due) / (1000 * 60 * 60 * 24));

      if (days <= 0) aging.current += inv.balance;
      else if (days <= 30) aging['1-30'] += inv.balance;
      else if (days <= 60) aging['31-60'] += inv.balance;
      else if (days <= 90) aging['61-90'] += inv.balance;
      else aging['90+'] += inv.balance;
    });

    return aging;
  }
}

export const aiFinanceAgent = new AIFinanceAgent();
export default aiFinanceAgent;
