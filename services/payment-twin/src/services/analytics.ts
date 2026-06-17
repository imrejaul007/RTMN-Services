import { Payment, Transaction, Refund, Wallet } from '../models';
import { logger } from '../utils/logger';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PaymentAnalytics {
  totalPayments: number;
  successfulPayments: number;
  failedPayments: number;
  pendingPayments: number;
  totalAmount: number;
  successfulAmount: number;
  failedAmount: number;
  avgAmount: number;
  successRate: number;
  byStatus: Array<{ _id: string; count: number; total: number }>;
  byGateway: Array<{ _id: string; count: number; total: number }>;
  byMethod: Array<{ _id: string; count: number; total: number }>;
  dailyTrend: Array<{ date: string; count: number; amount: number }>;
}

export interface RefundAnalytics {
  totalRefunds: number;
  completedRefunds: number;
  pendingRefunds: number;
  totalAmount: number;
  avgAmount: number;
  refundRate: number;
  byStatus: Array<{ _id: string; count: number; total: number }>;
  byReason: Array<{ _id: string; count: number; total: number }>;
  dailyTrend: Array<{ date: string; count: number; amount: number }>;
}

export interface WalletAnalytics {
  totalWallets: number;
  activeWallets: number;
  totalBalance: number;
  avgBalance: number;
  totalTopups: number;
  totalWithdrawals: number;
  byType: Array<{ _id: string; count: number; balance: number }>;
  byStatus: Array<{ _id: string; count: number }>;
  topWallets: Array<{ walletId: string; customerId: string; balance: number }>;
}

export interface TransactionAnalytics {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  totalAmount: number;
  byType: Array<{ _id: string; count: number; total: number }>;
  byStatus: Array<{ _id: string; count: number; total: number }>;
  byMethod: Array<{ _id: string; count: number; total: number }>;
  hourlyTrend: Array<{ hour: number; count: number; amount: number }>;
  dailyTrend: Array<{ date: string; count: number; amount: number }>;
}

export interface CustomerAnalytics {
  totalCustomers: number;
  payingCustomers: number;
  returningCustomers: number;
  avgRevenuePerCustomer: number;
  topCustomers: Array<{ customerId: string; totalPayments: number; totalAmount: number }>;
  customerSegments: Array<{ segment: string; count: number; totalAmount: number }>;
}

/**
 * Get payment analytics for a tenant
 */
export async function getPaymentAnalytics(
  tenantId: string,
  dateRange?: DateRange
): Promise<PaymentAnalytics> {
  try {
    const match: Record<string, unknown> = { tenantId };

    if (dateRange) {
      match.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalPayments: { $sum: 1 },
                successfulPayments: {
                  $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
                },
                failedPayments: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                },
                pendingPayments: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                },
                totalAmount: { $sum: '$amount' },
                successfulAmount: {
                  $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] },
                },
                failedAmount: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, '$amount', 0] },
                },
                avgAmount: { $avg: '$amount' },
              },
            },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byGateway: [
            { $group: { _id: '$gateway', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byMethod: [
            { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          dailyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],
        },
      },
    ];

    const result = await Payment.aggregate(pipeline);
    const overview = result[0]?.overview[0] || {};
    const successRate = overview.totalPayments > 0
      ? (overview.successfulPayments / overview.totalPayments) * 100
      : 0;

    return {
      totalPayments: overview.totalPayments || 0,
      successfulPayments: overview.successfulPayments || 0,
      failedPayments: overview.failedPayments || 0,
      pendingPayments: overview.pendingPayments || 0,
      totalAmount: overview.totalAmount || 0,
      successfulAmount: overview.successfulAmount || 0,
      failedAmount: overview.failedAmount || 0,
      avgAmount: overview.avgAmount || 0,
      successRate,
      byStatus: result[0]?.byStatus || [],
      byGateway: result[0]?.byGateway || [],
      byMethod: result[0]?.byMethod || [],
      dailyTrend: result[0]?.dailyTrend.map((d: { _id: string; count: number; amount: number }) => ({
        date: d._id,
        count: d.count,
        amount: d.amount,
      })) || [],
    };
  } catch (error) {
    logger.error('Error getting payment analytics', { tenantId, error });
    throw error;
  }
}

/**
 * Get refund analytics for a tenant
 */
export async function getRefundAnalytics(
  tenantId: string,
  dateRange?: DateRange
): Promise<RefundAnalytics> {
  try {
    const match: Record<string, unknown> = { tenantId };

    if (dateRange) {
      match.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalRefunds: { $sum: 1 },
                completedRefunds: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                pendingRefunds: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                },
                totalAmount: { $sum: '$amount' },
                avgAmount: { $avg: '$amount' },
              },
            },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byReason: [
            { $group: { _id: '$reason', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          dailyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],
        },
      },
    ];

    const result = await Refund.aggregate(pipeline);
    const overview = result[0]?.overview[0] || {};

    // Get total payments for refund rate calculation
    const totalPayments = await Payment.countDocuments({ tenantId });
    const totalSuccessfulPayments = await Payment.countDocuments({
      tenantId,
      status: 'success',
    });
    const refundRate = totalSuccessfulPayments > 0
      ? (overview.totalRefunds / totalSuccessfulPayments) * 100
      : 0;

    return {
      totalRefunds: overview.totalRefunds || 0,
      completedRefunds: overview.completedRefunds || 0,
      pendingRefunds: overview.pendingRefunds || 0,
      totalAmount: overview.totalAmount || 0,
      avgAmount: overview.avgAmount || 0,
      refundRate,
      byStatus: result[0]?.byStatus || [],
      byReason: result[0]?.byReason || [],
      dailyTrend: result[0]?.dailyTrend.map((d: { _id: string; count: number; amount: number }) => ({
        date: d._id,
        count: d.count,
        amount: d.amount,
      })) || [],
    };
  } catch (error) {
    logger.error('Error getting refund analytics', { tenantId, error });
    throw error;
  }
}

/**
 * Get wallet analytics for a tenant
 */
export async function getWalletAnalytics(
  tenantId: string,
  dateRange?: DateRange
): Promise<WalletAnalytics> {
  try {
    const match: Record<string, unknown> = { tenantId };

    const pipeline = [
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalWallets: { $sum: 1 },
                activeWallets: {
                  $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] },
                },
                totalBalance: { $sum: '$balance' },
                avgBalance: { $avg: '$balance' },
              },
            },
          ],
          byType: [
            {
              $group: {
                _id: '$type',
                count: { $sum: 1 },
                balance: { $sum: '$balance' },
              },
            },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } },
          ],
          topWallets: [
            { $sort: { balance: -1 } },
            { $limit: 10 },
            {
              $project: {
                walletId: 1,
                customerId: 1,
                balance: 1,
              },
            },
          ],
        },
      },
    ];

    const result = await Wallet.aggregate(pipeline);
    const overview = result[0]?.overview[0] || {};

    // Get transaction stats
    const transactionMatch: Record<string, unknown> = { tenantId, walletId: { $exists: true } };
    if (dateRange) {
      transactionMatch.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const transactionStats = await Transaction.aggregate([
      { $match: transactionMatch },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
        },
      },
    ]);

    const transactionMap = transactionStats.reduce((acc, t) => {
      acc[t._id] = t.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalWallets: overview.totalWallets || 0,
      activeWallets: overview.activeWallets || 0,
      totalBalance: overview.totalBalance || 0,
      avgBalance: overview.avgBalance || 0,
      totalTopups: transactionMap['deposit'] || 0,
      totalWithdrawals: transactionMap['withdrawal'] || 0,
      byType: result[0]?.byType || [],
      byStatus: result[0]?.byStatus || [],
      topWallets: result[0]?.topWallets || [],
    };
  } catch (error) {
    logger.error('Error getting wallet analytics', { tenantId, error });
    throw error;
  }
}

/**
 * Get transaction analytics for a tenant
 */
export async function getTransactionAnalytics(
  tenantId: string,
  dateRange?: DateRange
): Promise<TransactionAnalytics> {
  try {
    const match: Record<string, unknown> = { tenantId };

    if (dateRange) {
      match.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const pipeline = [
      { $match: match },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                completedTransactions: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
                },
                pendingTransactions: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                },
                totalAmount: { $sum: '$amount' },
              },
            },
          ],
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byMethod: [
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          hourlyTrend: [
            {
              $group: {
                _id: { $hour: '$createdAt' },
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
              },
            },
            { $sort: { _id: 1 } },
          ],
          dailyTrend: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
              },
            },
            { $sort: { _id: 1 } },
            { $limit: 30 },
          ],
        },
      },
    ];

    const result = await Transaction.aggregate(pipeline);
    const overview = result[0]?.overview[0] || {};

    return {
      totalTransactions: overview.totalTransactions || 0,
      completedTransactions: overview.completedTransactions || 0,
      pendingTransactions: overview.pendingTransactions || 0,
      totalAmount: overview.totalAmount || 0,
      byType: result[0]?.byType || [],
      byStatus: result[0]?.byStatus || [],
      byMethod: result[0]?.byMethod || [],
      hourlyTrend: result[0]?.hourlyTrend.map((h: { _id: number; count: number; amount: number }) => ({
        hour: h._id,
        count: h.count,
        amount: h.amount,
      })) || [],
      dailyTrend: result[0]?.dailyTrend.map((d: { _id: string; count: number; amount: number }) => ({
        date: d._id,
        count: d.count,
        amount: d.amount,
      })) || [],
    };
  } catch (error) {
    logger.error('Error getting transaction analytics', { tenantId, error });
    throw error;
  }
}

/**
 * Get customer analytics for a tenant
 */
export async function getCustomerAnalytics(
  tenantId: string,
  dateRange?: DateRange
): Promise<CustomerAnalytics> {
  try {
    const paymentMatch: Record<string, unknown> = { tenantId };

    if (dateRange) {
      paymentMatch.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const pipeline = [
      { $match: paymentMatch },
      {
        $group: {
          _id: '$customerId',
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
          },
        },
      },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalCustomers: { $sum: 1 },
                payingCustomers: {
                  $sum: { $cond: [{ $gt: ['$totalAmount', 0] }, 1, 0] },
                },
                returningCustomers: {
                  $sum: { $cond: [{ $gt: ['$totalPayments', 1] }, 1, 0] },
                },
                totalRevenue: { $sum: '$totalAmount' },
              },
            },
          ],
          topCustomers: [
            { $sort: { totalAmount: -1 } },
            { $limit: 10 },
          ],
          customerSegments: [
            {
              $bucket: {
                boundaries: [0, 1000, 5000, 10000, 50000, Infinity],
                groupBy: '$totalAmount',
                default: 'Other',
                output: {
                  count: { $sum: 1 },
                  totalAmount: { $sum: '$totalAmount' },
                },
              },
            },
          ],
        },
      },
    ];

    const result = await Payment.aggregate(pipeline);
    const overview = result[0]?.overview[0] || {};
    const avgRevenuePerCustomer = overview.totalCustomers > 0
      ? overview.totalRevenue / overview.totalCustomers
      : 0;

    // Map segments to readable names
    const segmentNames: Record<string, string> = {
      '0': '0-1K',
      '1000': '1K-5K',
      '5000': '5K-10K',
      '10000': '10K-50K',
      '50000': '50K+',
      'Other': 'Other',
    };

    return {
      totalCustomers: overview.totalCustomers || 0,
      payingCustomers: overview.payingCustomers || 0,
      returningCustomers: overview.returningCustomers || 0,
      avgRevenuePerCustomer,
      topCustomers: result[0]?.topCustomers.map((c: { _id: string; totalPayments: number; totalAmount: number }) => ({
        customerId: c._id,
        totalPayments: c.totalPayments,
        totalAmount: c.totalAmount,
      })) || [],
      customerSegments: result[0]?.customerSegments.map((s: { _id: string; count: number; totalAmount: number }) => ({
        segment: segmentNames[s._id] || s._id,
        count: s.count,
        totalAmount: s.totalAmount,
      })) || [],
    };
  } catch (error) {
    logger.error('Error getting customer analytics', { tenantId, error });
    throw error;
  }
}

/**
 * Get dashboard summary for a tenant
 */
export async function getDashboardSummary(
  tenantId: string
): Promise<{
  payments: PaymentAnalytics;
  refunds: RefundAnalytics;
  wallets: WalletAnalytics;
}> {
  try {
    const [payments, refunds, wallets] = await Promise.all([
      getPaymentAnalytics(tenantId),
      getRefundAnalytics(tenantId),
      getWalletAnalytics(tenantId),
    ]);

    return { payments, refunds, wallets };
  } catch (error) {
    logger.error('Error getting dashboard summary', { tenantId, error });
    throw error;
  }
}
