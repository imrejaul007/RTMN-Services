import { v4 as uuidv4 } from 'uuid';
import { Invoice, Settlement, Reconciliation, IInvoice } from '../models/billing.model';
import { logger } from '../utils/logger';
import config from '../config';

export interface InvoiceInput {
  fromCorpId: string;
  toCorpId: string;
  amount: number;
  currency?: string;
  description?: string;
  dueDate?: Date;
  lineItems?: {
    description: string;
    quantity: number;
    unitPrice: number;
  }[];
  metadata?: Record<string, unknown>;
}

export interface SettlementInput {
  period: {
    start: Date;
    end: Date;
    month: string;
  };
}

export interface ReconciliationInput {
  period: {
    start: Date;
    end: Date;
    month: string;
  };
  companies?: string[];
}

class BillingService {
  /**
   * Generate a new invoice between two companies
   */
  async generateInvoice(input: InvoiceInput): Promise<IInvoice> {
    try {
      const invoiceId = `INV-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      const lineItems = input.lineItems || [
        {
          description: input.description || 'Service charges',
          quantity: 1,
          unitPrice: input.amount,
          total: input.amount,
        },
      ];

      const dueDate = input.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const invoice = new Invoice({
        invoiceId,
        fromCorpId: input.fromCorpId,
        toCorpId: input.toCorpId,
        amount: input.amount,
        currency: input.currency || config.settlement.defaultCurrency,
        description: input.description || '',
        status: 'pending',
        dueDate,
        lineItems,
        metadata: input.metadata,
      });

      await invoice.save();

      logger.info(`Invoice generated: ${invoiceId}`, {
        fromCorpId: input.fromCorpId,
        toCorpId: input.toCorpId,
        amount: input.amount,
      });

      return invoice;
    } catch (error) {
      logger.error('Failed to generate invoice:', error);
      throw error;
    }
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string): Promise<IInvoice> {
    try {
      const invoice = await Invoice.findOne({ invoiceId });

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      if (invoice.status === 'paid') {
        throw new Error(`Invoice already paid: ${invoiceId}`);
      }

      if (invoice.status === 'cancelled') {
        throw new Error(`Cannot pay cancelled invoice: ${invoiceId}`);
      }

      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.paidAmount = invoice.amount;

      await invoice.save();

      logger.info(`Invoice paid: ${invoiceId}`, {
        amount: invoice.amount,
        paidAt: invoice.paidAt,
      });

      return invoice;
    } catch (error) {
      logger.error(`Failed to pay invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Run settlement for a specific period
   */
  async runSettlement(input: SettlementInput): Promise<typeof Settlement.prototype> {
    try {
      const settlementId = `SET-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      // Get all pending invoices for the period
      const pendingInvoices = await Invoice.find({
        createdAt: {
          $gte: input.period.start,
          $lte: input.period.end,
        },
        status: 'pending',
      });

      // Build settlement transactions
      const transactions = pendingInvoices.map((inv) => ({
        invoiceId: inv.invoiceId,
        fromCorpId: inv.fromCorpId,
        toCorpId: inv.toCorpId,
        amount: inv.amount,
        currency: inv.currency,
        status: 'pending' as const,
      }));

      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

      const settlement = new Settlement({
        settlementId,
        period: input.period,
        transactions,
        totalAmount,
        currency: config.settlement.defaultCurrency,
        status: 'processing',
        summary: {
          totalTransactions: transactions.length,
          totalVolume: totalAmount,
          settledCount: 0,
          pendingCount: transactions.length,
        },
      });

      // Process settlement - mark invoices as settled
      for (const transaction of transactions) {
        await Invoice.findOneAndUpdate(
          { invoiceId: transaction.invoiceId },
          {
            status: 'paid',
            paidAt: new Date(),
            paidAmount: transaction.amount,
          }
        );
        transaction.status = 'settled';
      }

      settlement.status = 'completed';
      settlement.executedAt = new Date();
      settlement.summary.settledCount = transactions.length;
      settlement.summary.pendingCount = 0;

      await settlement.save();

      logger.info(`Settlement completed: ${settlementId}`, {
        totalTransactions: transactions.length,
        totalAmount,
        period: input.period.month,
      });

      return settlement;
    } catch (error) {
      logger.error('Failed to run settlement:', error);
      throw error;
    }
  }

  /**
   * Reconcile accounts across all companies
   */
  async reconcile(input?: ReconciliationInput): Promise<typeof Reconciliation.prototype> {
    try {
      const reconciliationId = `REC-${Date.now()}-${uuidv4().substring(0, 8).toUpperCase()}`;

      const now = new Date();
      const period = input?.period || {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0),
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      };

      const companies = input?.companies || config.companies.registry;

      // Get all invoices for the period
      const invoices = await Invoice.find({
        createdAt: {
          $gte: period.start,
          $lte: period.end,
        },
      });

      // Calculate expected balances for each company
      const balances: { corpId: string; expectedBalance: number; actualBalance: number; difference: number }[] = [];
      const companyBalances: Record<string, number> = {};

      for (const company of companies) {
        companyBalances[company] = 0;
      }

      for (const invoice of invoices) {
        // Company owes money (fromCorpId)
        if (companyBalances[invoice.fromCorpId] !== undefined) {
          companyBalances[invoice.fromCorpId] -= invoice.amount;
        }
        // Company receives money (toCorpId)
        if (companyBalances[invoice.toCorpId] !== undefined) {
          companyBalances[invoice.toCorpId] += invoice.amount;
        }
      }

      // For now, actualBalance equals expectedBalance (placeholder for external system integration)
      for (const [corpId, expectedBalance] of Object.entries(companyBalances)) {
        balances.push({
          corpId,
          expectedBalance,
          actualBalance: expectedBalance, // Would come from external system
          difference: 0,
        });
      }

      // Find discrepancies
      const discrepancies: {
        companyId: string;
        type: 'amount_mismatch' | 'missing_transaction' | 'duplicate_transaction';
        description: string;
        amount: number;
      }[] = [];

      for (const balance of balances) {
        if (Math.abs(balance.difference) > config.settlement.reconciliationThreshold) {
          discrepancies.push({
            companyId: balance.corpId,
            type: 'amount_mismatch',
            description: `Balance discrepancy detected: expected ${balance.expectedBalance}, actual ${balance.actualBalance}`,
            amount: Math.abs(balance.difference),
          });
        }
      }

      const reconciliation = new Reconciliation({
        reconciliationId,
        period,
        companies,
        discrepancies,
        balances,
        status: discrepancies.length > 0 ? 'in_progress' : 'completed',
        completedAt: discrepancies.length === 0 ? new Date() : undefined,
      });

      await reconciliation.save();

      logger.info(`Reconciliation completed: ${reconciliationId}`, {
        companiesCount: companies.length,
        discrepanciesCount: discrepancies.length,
        period: period.month,
      });

      return reconciliation;
    } catch (error) {
      logger.error('Failed to reconcile accounts:', error);
      throw error;
    }
  }

  /**
   * Get all invoices for a company (as sender or receiver)
   */
  async getInvoices(corpId: string, options?: { status?: string; limit?: number; offset?: number }): Promise<{ invoices: IInvoice[]; total: number }> {
    try {
      const query: Record<string, unknown> = {
        $or: [{ fromCorpId: corpId }, { toCorpId: corpId }],
      };

      if (options?.status) {
        query.status = options.status;
      }

      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      const [invoices, total] = await Promise.all([
        Invoice.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit),
        Invoice.countDocuments(query),
      ]);

      return { invoices, total };
    } catch (error) {
      logger.error(`Failed to get invoices for ${corpId}:`, error);
      throw error;
    }
  }

  /**
   * Get all settlements
   */
  async getSettlements(options?: { period?: string; status?: string; limit?: number; offset?: number }): Promise<{ settlements: InstanceType<typeof Settlement>[]; total: number }> {
    try {
      const query: Record<string, unknown> = {};

      if (options?.period) {
        query['period.month'] = options.period;
      }

      if (options?.status) {
        query.status = options.status;
      }

      const limit = options?.limit || 50;
      const offset = options?.offset || 0;

      const [settlements, total] = await Promise.all([
        Settlement.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit),
        Settlement.countDocuments(query),
      ]);

      return { settlements, total };
    } catch (error) {
      logger.error('Failed to get settlements:', error);
      throw error;
    }
  }

  /**
   * Get single invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<IInvoice | null> {
    return Invoice.findOne({ invoiceId });
  }

  /**
   * Get single settlement by ID
   */
  async getSettlement(settlementId: string): Promise<InstanceType<typeof Settlement> | null> {
    return Settlement.findOne({ settlementId });
  }

  /**
   * Get single reconciliation by ID
   */
  async getReconciliation(reconciliationId: string): Promise<InstanceType<typeof Reconciliation> | null> {
    return Reconciliation.findOne({ reconciliationId });
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string): Promise<IInvoice> {
    try {
      const invoice = await Invoice.findOne({ invoiceId });

      if (!invoice) {
        throw new Error(`Invoice not found: ${invoiceId}`);
      }

      if (invoice.status === 'paid') {
        throw new Error(`Cannot cancel paid invoice: ${invoiceId}`);
      }

      invoice.status = 'cancelled';
      await invoice.save();

      logger.info(`Invoice cancelled: ${invoiceId}`);

      return invoice;
    } catch (error) {
      logger.error(`Failed to cancel invoice ${invoiceId}:`, error);
      throw error;
    }
  }

  /**
   * Get overdue invoices
   */
  async getOverdueInvoices(): Promise<IInvoice[]> {
    return Invoice.find({
      status: 'pending',
      dueDate: { $lt: new Date() },
    }).sort({ dueDate: 1 });
  }

  /**
   * Mark overdue invoices
   */
  async markOverdueInvoices(): Promise<number> {
    const result = await Invoice.updateMany(
      {
        status: 'pending',
        dueDate: { $lt: new Date() },
      },
      {
        $set: { status: 'overdue' },
      }
    );

    if (result.modifiedCount > 0) {
      logger.info(`Marked ${result.modifiedCount} invoices as overdue`);
    }

    return result.modifiedCount;
  }

  /**
   * Get billing summary for a company
   */
  async getBillingSummary(corpId: string): Promise<{
    totalOwed: number;
    totalReceivable: number;
    pendingInvoices: number;
    overdueInvoices: number;
    paidInvoices: number;
  }> {
    const invoices = await Invoice.find({
      $or: [{ fromCorpId: corpId }, { toCorpId: corpId }],
    });

    let totalOwed = 0;
    let totalReceivable = 0;
    let pendingInvoices = 0;
    let overdueInvoices = 0;
    let paidInvoices = 0;

    for (const invoice of invoices) {
      if (invoice.fromCorpId === corpId) {
        totalOwed += invoice.amount;
      }
      if (invoice.toCorpId === corpId) {
        totalReceivable += invoice.amount;
      }

      switch (invoice.status) {
        case 'pending':
          pendingInvoices++;
          break;
        case 'overdue':
          overdueInvoices++;
          break;
        case 'paid':
          paidInvoices++;
          break;
      }
    }

    return {
      totalOwed,
      totalReceivable,
      pendingInvoices,
      overdueInvoices,
      paidInvoices,
    };
  }
}

export const billingService = new BillingService();
export default billingService;