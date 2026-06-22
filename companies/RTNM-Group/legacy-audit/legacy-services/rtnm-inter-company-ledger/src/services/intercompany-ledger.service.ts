import { v4 as uuidv4 } from 'uuid';
import {
  LedgerEntry,
  CompanyBalance,
  ILedgerEntry,
  ICompanyBalance,
  EntryType,
  Currency,
} from '../models/intercompany-ledger.model';
import logger from '../utils/logger';
import config from '../config';

export interface CreateEntryInput {
  fromCorpId: string;
  toCorpId: string;
  type: EntryType;
  amount: number;
  currency?: Currency;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface EntryFilter {
  fromCorpId?: string;
  toCorpId?: string;
  type?: EntryType;
  status?: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  startDate?: Date;
  endDate?: Date;
}

export interface BalanceInfo {
  corpId: string;
  revenue: number;
  cost: number;
  net: number;
  pendingRevenue: number;
  pendingCost: number;
  pendingNet: number;
  lastSettledAt?: Date;
  updatedAt: Date;
}

export interface ReconciliationResult {
  totalEntries: number;
  reconciledEntries: number;
  errors: string[];
  summary: {
    totalRevenue: number;
    totalCost: number;
    netSettlement: number;
  };
}

class IntercompanyLedgerService {
  /**
   * Create a new ledger entry
   */
  async createEntry(input: CreateEntryInput): Promise<ILedgerEntry> {
    const { fromCorpId, toCorpId, type, amount, currency = 'INR', description, metadata } = input;

    // Validate companies
    if (!config.supportedCompanies.includes(fromCorpId as typeof config.supportedCompanies[number])) {
      throw new Error(`Invalid fromCorpId: ${fromCorpId}`);
    }
    if (!config.supportedCompanies.includes(toCorpId as typeof config.supportedCompanies[number])) {
      throw new Error(`Invalid toCorpId: ${toCorpId}`);
    }
    if (!config.transactionTypes.includes(type as typeof config.transactionTypes[number])) {
      throw new Error(`Invalid transaction type: ${type}`);
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate companies are different
    if (fromCorpId === toCorpId) {
      throw new Error('Cannot create entry between same company');
    }

    const entry = new LedgerEntry({
      entryId: `LED-${uuidv4().substring(0, 8).toUpperCase()}`,
      fromCorpId,
      toCorpId,
      type,
      amount,
      currency,
      description,
      metadata: metadata || {},
      status: 'PENDING',
    });

    await entry.save();

    // Update company balances
    await this.updateBalances(entry);

    logger.info('Ledger entry created', {
      entryId: entry.entryId,
      fromCorpId,
      toCorpId,
      type,
      amount,
      currency,
    });

    return entry;
  }

  /**
   * Get entries for a specific company (as sender or receiver)
   */
  async getEntries(corpId: string, filter?: EntryFilter): Promise<ILedgerEntry[]> {
    const query: Record<string, unknown> = {
      $or: [{ fromCorpId: corpId }, { toCorpId: corpId }],
    };

    if (filter?.fromCorpId) {
      query.fromCorpId = filter.fromCorpId;
    }
    if (filter?.toCorpId) {
      query.toCorpId = filter.toCorpId;
    }
    if (filter?.type) {
      query.type = filter.type;
    }
    if (filter?.status) {
      query.status = filter.status;
    }
    if (filter?.startDate || filter?.endDate) {
      query.createdAt = {};
      if (filter.startDate) {
        (query.createdAt as Record<string, Date>).$gte = filter.startDate;
      }
      if (filter.endDate) {
        (query.createdAt as Record<string, Date>).$lte = filter.endDate;
      }
    }

    const entries = await LedgerEntry.find(query)
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return entries as ILedgerEntry[];
  }

  /**
   * Get entries between two companies
   */
  async getEntriesBetween(fromCorpId: string, toCorpId: string): Promise<ILedgerEntry[]> {
    const entries = await LedgerEntry.find({
      $or: [
        { fromCorpId, toCorpId },
        { fromCorpId: toCorpId, toCorpId: fromCorpId },
      ],
    })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return entries as ILedgerEntry[];
  }

  /**
   * Get balance for a specific company
   */
  async getBalance(corpId: string): Promise<BalanceInfo> {
    let balance = await CompanyBalance.findOne({ corpId }).lean().exec();

    if (!balance) {
      // Create a new balance record
      balance = await CompanyBalance.create({
        corpId,
        revenue: 0,
        cost: 0,
        net: 0,
        pendingRevenue: 0,
        pendingCost: 0,
      });
    }

    const balanceInfo: BalanceInfo = {
      corpId,
      revenue: balance.revenue,
      cost: balance.cost,
      net: balance.net,
      pendingRevenue: balance.pendingRevenue,
      pendingCost: balance.pendingCost,
      pendingNet: balance.pendingRevenue - balance.pendingCost,
      lastSettledAt: balance.lastSettledAt,
      updatedAt: balance.updatedAt,
    };

    return balanceInfo;
  }

  /**
   * Get all company balances
   */
  async getAllBalances(): Promise<BalanceInfo[]> {
    const balances = await CompanyBalance.find().lean().exec();

    return balances.map((balance) => ({
      corpId: balance.corpId,
      revenue: balance.revenue,
      cost: balance.cost,
      net: balance.net,
      pendingRevenue: balance.pendingRevenue,
      pendingCost: balance.pendingCost,
      pendingNet: balance.pendingRevenue - balance.pendingCost,
      lastSettledAt: balance.lastSettledAt,
      updatedAt: balance.updatedAt,
    }));
  }

  /**
   * Run reconciliation for all pending entries
   */
  async runReconciliation(): Promise<ReconciliationResult> {
    const errors: string[] = [];
    let reconciledCount = 0;

    // Get all pending entries
    const pendingEntries = await LedgerEntry.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .lean()
      .exec();

    const totalEntries = pendingEntries.length;
    let totalRevenue = 0;
    let totalCost = 0;

    for (const entry of pendingEntries) {
      try {
        // Mark entry as completed
        await LedgerEntry.findByIdAndUpdate(entry._id, {
          status: 'COMPLETED',
          reconciledAt: new Date(),
        });

        // Move from pending to settled
        await this.settleEntry(entry as ILedgerEntry);

        reconciledCount++;
        totalRevenue += entry.amount;

        logger.info('Entry reconciled', {
          entryId: entry.entryId,
          fromCorpId: entry.fromCorpId,
          toCorpId: entry.toCorpId,
          amount: entry.amount,
        });
      } catch (error) {
        const errorMsg = `Failed to reconcile entry ${entry.entryId}: ${error}`;
        errors.push(errorMsg);
        logger.error('Reconciliation error', { entryId: entry.entryId, error });
      }
    }

    // Update last settled timestamp for all affected companies
    const affectedCorps = new Set<string>();
    pendingEntries.forEach((entry) => {
      affectedCorps.add(entry.fromCorpId);
      affectedCorps.add(entry.toCorpId);
    });

    await CompanyBalance.updateMany(
      { corpId: { $in: Array.from(affectedCorps) } },
      { lastSettledAt: new Date() }
    );

    totalCost = totalRevenue; // In inter-company, revenue = cost

    const result: ReconciliationResult = {
      totalEntries,
      reconciledEntries: reconciledCount,
      errors,
      summary: {
        totalRevenue,
        totalCost,
        netSettlement: totalRevenue - totalCost,
      },
    };

    logger.info('Reconciliation completed', {
      totalEntries,
      reconciledCount,
      errorCount: errors.length,
    });

    return result;
  }

  /**
   * Update company balances after creating an entry
   */
  private async updateBalances(entry: ILedgerEntry): Promise<void> {
    // toCorpId receives revenue (pending)
    await CompanyBalance.findOneAndUpdate(
      { corpId: entry.toCorpId },
      {
        $inc: { pendingRevenue: entry.amount },
      },
      { upsert: true, new: true }
    );

    // fromCorpId has cost (pending)
    await CompanyBalance.findOneAndUpdate(
      { corpId: entry.fromCorpId },
      {
        $inc: { pendingCost: entry.amount },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Settle an entry (move from pending to settled)
   */
  private async settleEntry(entry: ILedgerEntry): Promise<void> {
    // Move from pending to settled for receiver (revenue)
    await CompanyBalance.findOneAndUpdate(
      { corpId: entry.toCorpId },
      {
        $inc: {
          pendingRevenue: -entry.amount,
          revenue: entry.amount,
        },
      }
    );

    // Move from pending to settled for payer (cost)
    await CompanyBalance.findOneAndUpdate(
      { corpId: entry.fromCorpId },
      {
        $inc: {
          pendingCost: -entry.amount,
          cost: entry.amount,
        },
      }
    );

    // Recalculate net for both companies
    await this.recalculateNet(entry.toCorpId);
    await this.recalculateNet(entry.fromCorpId);
  }

  /**
   * Recalculate net balance for a company
   */
  private async recalculateNet(corpId: string): Promise<void> {
    const balance = await CompanyBalance.findOne({ corpId });
    if (balance) {
      balance.net = balance.revenue - balance.cost;
      await balance.save();
    }
  }

  /**
   * Cancel a pending entry
   */
  async cancelEntry(entryId: string): Promise<ILedgerEntry | null> {
    const entry = await LedgerEntry.findOne({ entryId });

    if (!entry) {
      return null;
    }

    if (entry.status !== 'PENDING') {
      throw new Error(`Cannot cancel entry with status: ${entry.status}`);
    }

    // Mark as cancelled
    entry.status = 'CANCELLED';
    await entry.save();

    // Reverse the balance updates
    await CompanyBalance.findOneAndUpdate(
      { corpId: entry.toCorpId },
      { $inc: { pendingRevenue: -entry.amount } }
    );
    await CompanyBalance.findOneAndUpdate(
      { corpId: entry.fromCorpId },
      { $inc: { pendingCost: -entry.amount } }
    );

    logger.info('Entry cancelled', { entryId });

    return entry;
  }

  /**
   * Get settlement summary between two companies
   */
  async getSettlementSummary(fromCorpId: string, toCorpId: string): Promise<{
    fromOwesTo: number;
    toOwesFrom: number;
    netSettlement: number;
    pendingEntries: number;
  }> {
    const entries = await LedgerEntry.find({
      $or: [
        { fromCorpId, toCorpId, status: 'PENDING' },
        { fromCorpId: toCorpId, toCorpId: fromCorpId, status: 'PENDING' },
      ],
    }).lean();

    let fromOwesTo = 0;
    let toOwesFrom = 0;

    for (const entry of entries) {
      if (entry.fromCorpId === fromCorpId && entry.toCorpId === toCorpId) {
        fromOwesTo += entry.amount;
      } else {
        toOwesFrom += entry.amount;
      }
    }

    return {
      fromOwesTo,
      toOwesFrom,
      netSettlement: fromOwesTo - toOwesFrom,
      pendingEntries: entries.length,
    };
  }

  /**
   * Get network-wide statistics
   */
  async getNetworkStats(): Promise<{
    totalEntries: number;
    totalVolume: number;
    pendingVolume: number;
    settledVolume: number;
    activeCompanies: number;
    topRevenueCompanies: Array<{ corpId: string; revenue: number }>;
    topCostCompanies: Array<{ corpId: string; cost: number }>;
  }> {
    const stats = await LedgerEntry.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: 1 },
          totalVolume: { $sum: '$amount' },
          pendingVolume: {
            $sum: { $cond: [{ $eq: ['$status', 'PENDING'] }, '$amount', 0] },
          },
          settledVolume: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, '$amount', 0] },
          },
        },
      },
    ]);

    const activeCompanies = await CompanyBalance.countDocuments({
      $or: [{ revenue: { $gt: 0 } }, { cost: { $gt: 0 } }],
    });

    const topRevenue = await CompanyBalance.find()
      .sort({ revenue: -1 })
      .limit(5)
      .select('corpId revenue')
      .lean();

    const topCost = await CompanyBalance.find()
      .sort({ cost: -1 })
      .limit(5)
      .select('corpId cost')
      .lean();

    return {
      totalEntries: stats[0]?.totalEntries || 0,
      totalVolume: stats[0]?.totalVolume || 0,
      pendingVolume: stats[0]?.pendingVolume || 0,
      settledVolume: stats[0]?.settledVolume || 0,
      activeCompanies,
      topRevenueCompanies: topRevenue.map((c) => ({ corpId: c.corpId, revenue: c.revenue })),
      topCostCompanies: topCost.map((c) => ({ corpId: c.corpId, cost: c.cost })),
    };
  }
}

export const intercompanyLedgerService = new IntercompanyLedgerService();
export default intercompanyLedgerService;