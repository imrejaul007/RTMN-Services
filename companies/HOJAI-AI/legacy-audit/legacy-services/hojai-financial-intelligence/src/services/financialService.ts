/**
 * HOJAI Financial Intelligence - Financial Service
 */

import { v4 as uuid } from 'uuid';
import { TransactionModel, InvoiceModel, BudgetModel, FinancialMetricsModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('financial');

export class FinancialService {
  /**
   * Create transaction
   */
  async createTransaction(tenantId: string, data: Record<string, unknown>): Promise<any> {
    const transaction = new TransactionModel({
      transactionId: uuid(),
      tenantId,
      ...data,
      createdAt: new Date()
    });
    await transaction.save();
    logger.info('transaction_created', { tenantId, transactionId: transaction.transactionId });
    return transaction;
  }

  /**
   * Get transactions
   */
  async getTransactions(tenantId: string, filters?: { type?: string; category?: string; startDate?: Date; endDate?: Date }): Promise<any[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filters?.type) query.type = filters.type;
    if (filters?.category) query.category = filters.category;
    if (filters?.startDate || filters?.endDate) {
      query.transactionDate = {};
      if (filters.startDate) (query.transactionDate as any).$gte = filters.startDate;
      if (filters.endDate) (query.transactionDate as any).$lte = filters.endDate;
    }
    return TransactionModel.find(query).sort({ transactionDate: -1 });
  }

  /**
   * Create invoice
   */
  async createInvoice(tenantId: string, data: Record<string, unknown>): Promise<any> {
    const invoice = new InvoiceModel({
      invoiceId: uuid(),
      tenantId,
      ...data,
      createdAt: new Date()
    });
    await invoice.save();
    logger.info('invoice_created', { tenantId, invoiceId: invoice.invoiceId });
    return invoice;
  }

  /**
   * Get invoices
   */
  async getInvoices(tenantId: string, filters?: { status?: string }): Promise<any[]> {
    const query: Record<string, unknown> = { tenantId };
    if (filters?.status) query.status = filters.status;
    return InvoiceModel.find(query).sort({ createdAt: -1 });
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(tenantId: string, invoiceId: string, status: string): Promise<any> {
    const update: Record<string, unknown> = { status };
    if (status === 'paid') update.paidAt = new Date();
    return InvoiceModel.findOneAndUpdate({ tenantId, invoiceId }, { $set: update }, { new: true });
  }

  /**
   * Create budget
   */
  async createBudget(tenantId: string, data: Record<string, unknown>): Promise<any> {
    const budget = new BudgetModel({
      budgetId: uuid(),
      tenantId,
      ...data,
      createdAt: new Date()
    });
    await budget.save();
    logger.info('budget_created', { tenantId, budgetId: budget.budgetId });
    return budget;
  }

  /**
   * Get budgets
   */
  async getBudgets(tenantId: string): Promise<any[]> {
    return BudgetModel.find({ tenantId }).sort({ createdAt: -1 });
  }

  /**
   * Get financial metrics
   */
  async getMetrics(tenantId: string, period: string, startDate: Date, endDate: Date): Promise<any> {
    const cached = await FinancialMetricsModel.findOne({ tenantId, period, startDate, endDate });
    if (cached) return cached;

    // Aggregate transactions
    const transactions = await TransactionModel.find({
      tenantId,
      transactionDate: { $gte: startDate, $lte: endDate }
    });

    let revenue = 0, expenses = 0;
    const revenueBreakdown: Record<string, number> = {};
    const expenseBreakdown: Record<string, number> = {};

    for (const t of transactions) {
      if (t.type === 'income') {
        revenue += t.amount;
        revenueBreakdown[t.category] = (revenueBreakdown[t.category] || 0) + t.amount;
      } else if (t.type === 'expense') {
        expenses += t.amount;
        expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + t.amount;
      }
    }

    const profit = revenue - expenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Calculate cash flow
    const cashInflow = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const cashOutflow = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Calculate burn rate (monthly average)
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const burnRate = daysDiff > 0 ? expenses / (daysDiff / 30) : 0;

    // Calculate runway
    const runway = burnRate > 0 ? cashInflow / burnRate : 365;

    const metrics = await FinancialMetricsModel.create({
      tenantId,
      period,
      startDate,
      endDate,
      revenue: { total: revenue, breakdown: revenueBreakdown },
      expenses: { total: expenses, breakdown: expenseBreakdown },
      profit,
      profitMargin,
      cashInflow,
      cashOutflow,
      netCashFlow: cashInflow - cashOutflow,
      burnRate,
      runway,
      computedAt: new Date()
    });

    return metrics;
  }

  /**
   * Get dashboard summary
   */
  async getDashboard(tenantId: string): Promise<any> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

    const [monthly, quarterly] = await Promise.all([
      this.getMetrics(tenantId, 'month', monthStart, now),
      this.getMetrics(tenantId, 'quarter', quarterStart, now)
    ]);

    // Get invoice summaries
    const invoices = await InvoiceModel.find({ tenantId });
    const overdueInvoices = invoices.filter(i => i.status === 'overdue' || (i.status === 'sent' && new Date(i.dueDate) < now));

    return {
      thisMonth: {
        revenue: monthly.revenue.total,
        expenses: monthly.expenses.total,
        profit: monthly.profit,
        profitMargin: monthly.profitMargin
      },
      thisQuarter: {
        revenue: quarterly.revenue.total,
        expenses: quarterly.expenses.total,
        profit: quarterly.profit
      },
      invoices: {
        pending: invoices.filter(i => i.status === 'sent').length,
        overdue: overdueInvoices.length,
        totalOutstanding: invoices.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.total, 0)
      },
      health: {
        burnRate: monthly.burnRate,
        runway: monthly.runway,
        profitMargin: monthly.profitMargin
      }
    };
  }
}

export const financialService = new FinancialService();
export default financialService;
