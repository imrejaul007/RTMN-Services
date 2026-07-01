/**
 * TreasuryOS - Financial Operating System
 *
 * The money command center for FinanceOS
 * Inspired by: Kyriba + SAP Treasury + Oracle Treasury
 *
 * Modules:
 * - CashOS - Real-time cash position
 * - LiquidityOS - Forecasting
 * - BankingOS - Multi-bank management
 * - PaymentOS - Payment execution
 * - FXOS - Foreign exchange
 * - InvestmentOS - Idle cash optimization
 * - DebtOS - Loan management
 * - Treasury Twin - Digital twin for treasury
 */

import { Router } from 'express';

const router = Router();

// ============================================================
// TYPES
// ============================================================

export interface CashPosition {
  entityId: string;
  entityName: string;
  banks: BankAccount[];
  totalCash: number;
  totalInvested: number;
  netCash: number;
  currency: string;
  asOf: Date;
}

export interface BankAccount {
  bankId: string;
  bankName: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'current' | 'deposit';
  balance: number;
  currency: string;
  availableBalance: number;
  pendingTransactions: number;
  lastSync: Date;
}

export interface LiquidityForecast {
  entityId: string;
  horizon: '7d' | '30d' | '90d' | '1y';
  projections: ForecastPeriod[];
  scenarios: 'base' | 'optimistic' | 'pessimistic';
  runway: number; // months
  createdAt: Date;
}

export interface ForecastPeriod {
  date: Date;
  inflows: number;
  outflows: number;
  netCash: number;
  cumulativeCash: number;
}

export interface Payment {
  id: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  currency: string;
  method: 'UPI' | 'NEFT' | 'RTGS' | 'IMPS' | 'SWIFT' | 'ACH' | 'SEPA';
  bankAccount: string;
  scheduledDate: Date;
  status: 'pending' | 'approved' | 'sent' | 'settled' | 'failed';
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: Date;
  failureReason?: string;
}

export interface FXPosition {
  currency: string;
  balance: number;
  inUSD: number;
  exposure: 'hedged' | 'partial' | 'unhedged';
  forwardContracts: ForwardContract[];
}

export interface ForwardContract {
  id: string;
  buyCurrency: string;
  sellCurrency: string;
  amount: number;
  rate: number;
  maturityDate: Date;
  status: 'active' | 'settled' | 'cancelled';
}

export interface Investment {
  id: string;
  type: 'fixed_deposit' | 'mutual_fund' | 'treasury_bill' | 'corporate_bond' | 'money_market';
  issuer: string;
  principal: number;
  currentValue: number;
  returns: number;
  maturityDate?: Date;
  status: 'active' | 'matured' | 'liquidated';
}

export interface Debt {
  id: string;
  lender: string;
  type: 'term_loan' | 'credit_line' | 'bond' | 'vendor_financing';
  principal: number;
  outstanding: number;
  interestRate: number;
  EMI: number;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'paid' | 'defaulted';
  nextPayment: {
    date: Date;
    amount: number;
  };
}

// ============================================================
// IN-MEMORY STORAGE
// ============================================================

const cashPositions = new Map<string, CashPosition>();
const liquidityForecasts = new Map<string, LiquidityForecast>();
const payments = new Map<string, Payment>();
const fxPositions = new Map<string, FXPosition[]>();
const investments = new Map<string, Investment[]>();
const debts = new Map<string, Debt[]>();

// ============================================================
// ROUTES
// ============================================================

/**
 * Get cash position
 */
router.get('/cash/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    let position = cashPositions.get(entityId);

    if (!position) {
      // Create placeholder
      position = {
        entityId,
        entityName: 'Entity',
        banks: [],
        totalCash: 0,
        totalInvested: 0,
        netCash: 0,
        currency: 'INR',
        asOf: new Date(),
      };
    }

    res.json({ success: true, position });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Update cash position
 */
router.post('/cash/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { banks, currency } = req.body;

    const totalCash = banks.reduce((sum: number, b: any) => sum + b.balance, 0);
    const totalInvested = banks.reduce((sum: number, b: any) => sum + (b.investedBalance || 0), 0);

    const position: CashPosition = {
      entityId,
      entityName: req.body.entityName || 'Entity',
      banks: banks || [],
      totalCash,
      totalInvested,
      netCash: totalCash + totalInvested,
      currency: currency || 'INR',
      asOf: new Date(),
    };

    cashPositions.set(entityId, position);

    res.json({ success: true, position });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get liquidity forecast
 */
router.get('/liquidity/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const forecast = liquidityForecasts.get(entityId);

    res.json({ success: true, forecast });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Generate liquidity forecast
 */
router.post('/liquidity/:entityId/forecast', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { horizon = '30d', inflows, outflows } = req.body;

    // Generate forecast periods
    const periods = generateForecastPeriods(horizon, inflows, outflows);

    const forecast: LiquidityForecast = {
      entityId,
      horizon,
      projections: periods,
      scenarios: 'base',
      runway: calculateRunway(periods),
      createdAt: new Date(),
    };

    liquidityForecasts.set(entityId, forecast);

    res.json({ success: true, forecast });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Create payment
 */
router.post('/payments', async (req, res) => {
  try {
    const { vendorId, vendorName, amount, currency, method, bankAccount, scheduledDate } = req.body;

    if (!vendorId || !amount || !method) {
      return res.status(400).json({
        success: false,
        error: 'vendorId, amount, and method are required',
      });
    }

    const payment: Payment = {
      id: crypto.randomUUID(),
      vendorId,
      vendorName: vendorName || 'Vendor',
      amount,
      currency: currency || 'INR',
      method,
      bankAccount: bankAccount || 'default',
      scheduledDate: new Date(scheduledDate) || new Date(),
      status: 'pending',
      approvalRequired: amount > 100000, // > 1L needs approval
    };

    payments.set(payment.id, payment);

    res.status(201).json({ success: true, payment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Approve payment
 */
router.post('/payments/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const payment = payments.get(id);
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    payment.status = 'approved';
    payment.approvedBy = approvedBy;
    payment.approvedAt = new Date();

    payments.set(id, payment);

    res.json({ success: true, payment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get FX positions
 */
router.get('/fx/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const positions = fxPositions.get(entityId) || [];

    // Calculate total exposure
    const totalExposure = positions.reduce(
      (sum, p) => sum + (p.exposure === 'unhedged' ? p.inUSD : 0),
      0
    );

    res.json({ success: true, positions, totalExposure });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add forward contract
 */
router.post('/fx/:entityId/contracts', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { buyCurrency, sellCurrency, amount, rate, maturityDate } = req.body;

    const contract: FXPosition = {
      currency: buyCurrency,
      balance: amount,
      inUSD: amount * rate,
      exposure: 'hedged',
      forwardContracts: [{
        id: crypto.randomUUID(),
        buyCurrency,
        sellCurrency,
        amount,
        rate,
        maturityDate: new Date(maturityDate),
        status: 'active',
      }],
    };

    const existing = fxPositions.get(entityId) || [];
    existing.push(contract);
    fxPositions.set(entityId, existing);

    res.status(201).json({ success: true, contract });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get investments
 */
router.get('/investments/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const entityInvestments = investments.get(entityId) || [];

    const summary = {
      totalInvested: entityInvestments.reduce((sum, i) => sum + i.principal, 0),
      totalValue: entityInvestments.reduce((sum, i) => sum + i.currentValue, 0),
      totalReturns: entityInvestments.reduce((sum, i) => sum + i.returns, 0),
      byType: groupByType(entityInvestments),
    };

    res.json({ success: true, investments: entityInvestments, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add investment
 */
router.post('/investments/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { type, issuer, principal, maturityDate } = req.body;

    const investment: Investment = {
      id: crypto.randomUUID(),
      type,
      issuer,
      principal,
      currentValue: principal,
      returns: 0,
      maturityDate: maturityDate ? new Date(maturityDate) : undefined,
      status: 'active',
    };

    const existing = investments.get(entityId) || [];
    existing.push(investment);
    investments.set(entityId, existing);

    res.status(201).json({ success: true, investment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get debts
 */
router.get('/debts/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const entityDebts = debts.get(entityId) || [];

    const summary = {
      totalDebt: entityDebts.reduce((sum, d) => sum + d.outstanding, 0),
      monthlyEMI: entityDebts.reduce((sum, d) => sum + d.EMI, 0),
      nextPayment: entityDebts.reduce((min, d) =>
        d.nextPayment.date < min.date ? d.nextPayment : min
      , entityDebts[0]?.nextPayment || { date: new Date(), amount: 0 }),
    };

    res.json({ success: true, debts: entityDebts, summary });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Treasury dashboard
 */
router.get('/dashboard/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;

    const cash = cashPositions.get(entityId);
    const forecast = liquidityForecasts.get(entityId);
    const fx = fxPositions.get(entityId) || [];
    const inv = investments.get(entityId) || [];
    const debtList = debts.get(entityId) || [];

    const dashboard = {
      entityId,
      cash: {
        total: cash?.netCash || 0,
        currency: cash?.currency || 'INR',
        lastUpdated: cash?.asOf,
      },
      liquidity: {
        runway: forecast?.runway || 0,
        horizon: forecast?.horizon || '30d',
      },
      fx: {
        exposure: fx.reduce((sum, p) => sum + (p.exposure === 'unhedged' ? p.inUSD : 0), 0),
        hedged: fx.reduce((sum, p) => sum + (p.exposure === 'hedged' ? p.inUSD : 0), 0),
      },
      investments: {
        total: inv.reduce((sum, i) => sum + i.currentValue, 0),
        returns: inv.reduce((sum, i) => sum + i.returns, 0),
      },
      debt: {
        outstanding: debtList.reduce((sum, d) => sum + d.outstanding, 0),
        monthlyEMI: debtList.reduce((sum, d) => sum + d.EMI, 0),
      },
      alerts: generateTreasuryAlerts(cash, forecast, fx),
      generatedAt: new Date(),
    };

    res.json({ success: true, dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// HELPERS
// ============================================================

function generateForecastPeriods(horizon: string, inflows: any[], outflows: any[]): ForecastPeriod[] {
  const periods: ForecastPeriod[] = [];
  const days = horizon === '7d' ? 7 : horizon === '30d' ? 30 : horizon === '90d' ? 90 : 365;

  let cumulativeCash = inflows?.reduce((s: number, i: any) => s + i.amount, 0) || 0;

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const inflow = inflows?.find((f: any) => f.day === i)?.amount || 0;
    const outflow = outflows?.find((f: any) => f.day === i)?.amount || 0;

    cumulativeCash += inflow - outflow;

    periods.push({
      date,
      inflows: inflow,
      outflows: outflow,
      netCash: inflow - outflow,
      cumulativeCash,
    });
  }

  return periods;
}

function calculateRunway(periods: ForecastPeriod[]): number {
  const avgMonthlyBurn = periods.reduce((sum, p) => sum + p.outflows, 0) / (periods.length / 30);
  const avgMonthlyInflow = periods.reduce((sum, p) => sum + p.inflows, 0) / (periods.length / 30);
  const netMonthlyBurn = avgMonthlyInflow - avgMonthlyBurn;

  if (netMonthlyBurn <= 0) return 999; // Profitable

  const startingCash = periods[0]?.cumulativeCash || 0;
  return Math.floor(startingCash / netMonthlyBurn);
}

function groupByType(investments: Investment[]): Record<string, number> {
  return investments.reduce((acc, inv) => {
    acc[inv.type] = (acc[inv.type] || 0) + inv.currentValue;
    return acc;
  }, {} as Record<string, number>);
}

function generateTreasuryAlerts(cash: any, forecast: any, fx: FXPosition[]): string[] {
  const alerts: string[] = [];

  if (!cash || cash.netCash < 1000000) {
    alerts.push('⚠️ Low cash balance');
  }

  if (forecast && forecast.runway < 6) {
    alerts.push('🔴 Runway under 6 months');
  }

  const unhedged = fx.filter(p => p.exposure === 'unhedged');
  if (unhedged.length > 0) {
    const exposure = unhedged.reduce((sum, p) => sum + p.inUSD, 0);
    if (exposure > 100000) {
      alerts.push(`⚠️ ${unhedged.length} currencies unhedged`);
    }
  }

  return alerts;
}

export default router;
