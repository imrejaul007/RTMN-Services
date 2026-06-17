import Invoice, { InvoiceStatus } from '../models/Invoice';
import PaymentRecord from '../models/PaymentRecord';

/**
 * Billing Analytics Service
 * Provides comprehensive analytics and insights for invoice/billing data
 */
export class BillingAnalytics {
  /**
   * Get overall billing metrics for a tenant
   */
  static async getMetrics(tenantId: string, startDate?: Date, endDate?: Date) {
    const matchStage: any = { tenantId };

    if (startDate || endDate) {
      matchStage.issueDate = {};
      if (startDate) matchStage.issueDate.$gte = startDate;
      if (endDate) matchStage.issueDate.$lte = endDate;
    }

    const [invoiceStats, paymentStats, overdueStats] = await Promise.all([
      // Invoice statistics
      Invoice.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            totalValue: { $sum: '$total' },
            totalPaid: { $sum: '$paidAmount' },
            totalOutstanding: { $sum: '$remainingAmount' },
            avgInvoiceValue: { $avg: '$total' },
            minInvoiceValue: { $min: '$total' },
            maxInvoiceValue: { $max: '$total' },
          },
        },
      ]),

      // Payment statistics
      PaymentRecord.aggregate([
        {
          $match: {
            tenantId,
            date: startDate || endDate ? { $gte: startDate, $lte: endDate } : undefined,
            status: 'completed',
          },
        },
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalReceived: { $sum: '$amount' },
            avgPaymentValue: { $avg: '$amount' },
          },
        },
      ]),

      // Overdue statistics
      Invoice.aggregate([
        {
          $match: {
            tenantId,
            status: { $nin: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
            dueDate: { $lt: new Date() },
          },
        },
        {
          $group: {
            _id: null,
            overdueCount: { $sum: 1 },
            overdueValue: { $sum: '$remainingAmount' },
            maxOverdueDays: { $max: '$overdueDays' },
            avgOverdueDays: { $avg: '$overdueDays' },
          },
        },
      ]),
    ]);

    const invoiceData = invoiceStats[0] || {
      totalInvoices: 0,
      totalValue: 0,
      totalPaid: 0,
      totalOutstanding: 0,
      avgInvoiceValue: 0,
      minInvoiceValue: 0,
      maxInvoiceValue: 0,
    };

    const paymentData = paymentStats[0] || {
      totalPayments: 0,
      totalReceived: 0,
      avgPaymentValue: 0,
    };

    const overdueData = overdueStats[0] || {
      overdueCount: 0,
      overdueValue: 0,
      maxOverdueDays: 0,
      avgOverdueDays: 0,
    };

    // Calculate derived metrics
    const collectionRate = invoiceData.totalValue > 0
      ? (invoiceData.totalPaid / invoiceData.totalValue) * 100
      : 0;

    return {
      invoices: {
        count: invoiceData.totalInvoices,
        totalValue: Math.round(invoiceData.totalValue * 100) / 100,
        avgValue: Math.round(invoiceData.avgInvoiceValue * 100) / 100,
        minValue: invoiceData.minInvoiceValue,
        maxValue: invoiceData.maxInvoiceValue,
      },
      payments: {
        count: paymentData.totalPayments,
        totalReceived: Math.round(paymentData.totalReceived * 100) / 100,
        avgValue: Math.round(paymentData.avgPaymentValue * 100) / 100,
      },
      outstanding: {
        amount: Math.round(invoiceData.totalOutstanding * 100) / 100,
        overdueCount: overdueData.overdueCount,
        overdueAmount: Math.round(overdueData.overdueValue * 100) / 100,
      },
      metrics: {
        collectionRate: Math.round(collectionRate * 100) / 100,
        avgOverdueDays: Math.round(overdueData.avgOverdueDays * 10) / 10,
        paymentToInvoiceRatio: invoiceData.totalInvoices > 0
          ? Math.round((paymentData.totalPayments / invoiceData.totalInvoices) * 100) / 100
          : 0,
      },
    };
  }

  /**
   * Get top customers by billing value
   */
  static async getTopCustomers(tenantId: string, limit = 10, startDate?: Date, endDate?: Date) {
    const matchStage: any = { tenantId };

    if (startDate || endDate) {
      matchStage.issueDate = {};
      if (startDate) matchStage.issueDate.$gte = startDate;
      if (endDate) matchStage.issueDate.$lte = endDate;
    }

    return Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customerId',
          invoiceCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          totalPaid: { $sum: '$paidAmount' },
          outstanding: { $sum: '$remainingAmount' },
          lastInvoice: { $max: '$issueDate' },
        },
      },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          invoiceCount: 1,
          totalValue: { $round: ['$totalValue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          outstanding: { $round: ['$outstanding', 2] },
          lastInvoice: 1,
          paymentRate: {
            $round: [
              {
                $multiply: [
                  { $cond: [{ $eq: ['$totalValue', 0] }, 0, { $divide: ['$totalPaid', '$totalValue'] }] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { totalValue: -1 } },
      { $limit: limit },
    ]);
  }

  /**
   * Get revenue by time period
   */
  static async getRevenueByPeriod(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate?: Date,
    endDate?: Date
  ) {
    const matchStage: any = { tenantId };

    if (startDate || endDate) {
      matchStage.issueDate = {};
      if (startDate) matchStage.issueDate.$gte = startDate;
      if (endDate) matchStage.issueDate.$lte = endDate;
    }

    // Group by period
    const groupBy = period === 'day'
      ? { $dateToString: { format: '%Y-%m-%d', date: '$issueDate' } }
      : period === 'week'
        ? { $isoWeek: '$issueDate' }
        : period === 'month'
          ? { $dateToString: { format: '%Y-%m', date: '$issueDate' } }
          : period === 'quarter'
            ? {
                $concat: [
                  { $toString: { $year: '$issueDate' } },
                  '-Q',
                  { $toString: { $ceil: { $divide: [{ $month: '$issueDate' }, 3] } } },
                ],
              }
            : { $year: '$issueDate' };

    return Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupBy,
          invoiceCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          totalPaid: { $sum: '$paidAmount' },
          taxAmount: { $sum: '$taxAmount' },
          discount: { $sum: '$discount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          period: '$_id',
          invoiceCount: 1,
          totalValue: { $round: ['$totalValue', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          taxAmount: { $round: ['$taxAmount', 2] },
          discount: { $round: ['$discount', 2] },
          collectionRate: {
            $round: [
              {
                $multiply: [
                  { $cond: [{ $eq: ['$totalValue', 0] }, 0, { $divide: ['$totalPaid', '$totalValue'] }] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
    ]);
  }

  /**
   * Get invoice status distribution
   */
  static async getStatusDistribution(tenantId: string, startDate?: Date, endDate?: Date) {
    const matchStage: any = { tenantId };

    if (startDate || endDate) {
      matchStage.issueDate = {};
      if (startDate) matchStage.issueDate.$gte = startDate;
      if (endDate) matchStage.issueDate.$lte = endDate;
    }

    const distribution = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$total' },
          paidValue: { $sum: '$paidAmount' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const total = distribution.reduce((sum, d) => sum + d.count, 0);

    return distribution.map(d => ({
      status: d._id,
      count: d.count,
      percentage: total > 0 ? Math.round((d.count / total) * 10000) / 100 : 0,
      totalValue: Math.round(d.totalValue * 100) / 100,
      paidValue: Math.round(d.paidValue * 100) / 100,
      outstanding: Math.round((d.totalValue - d.paidValue) * 100) / 100,
    }));
  }

  /**
   * Get payment method distribution
   */
  static async getPaymentMethodDistribution(tenantId: string, startDate?: Date, endDate?: Date) {
    const matchStage: any = { tenantId, status: 'completed' };

    if (startDate || endDate) {
      matchStage.date = {};
      if (startDate) matchStage.date.$gte = startDate;
      if (endDate) matchStage.date.$lte = endDate;
    }

    const distribution = await PaymentRecord.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgAmount: { $avg: '$amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    const totalAmount = distribution.reduce((sum, d) => sum + d.totalAmount, 0);
    const totalCount = distribution.reduce((sum, d) => sum + d.count, 0);

    return distribution.map(d => ({
      method: d._id,
      count: d.count,
      countPercentage: totalCount > 0 ? Math.round((d.count / totalCount) * 10000) / 100 : 0,
      totalAmount: Math.round(d.totalAmount * 100) / 100,
      amountPercentage: totalAmount > 0 ? Math.round((d.totalAmount / totalAmount) * 10000) / 100 : 0,
      avgAmount: Math.round(d.avgAmount * 100) / 100,
    }));
  }

  /**
   * Get daily payment trends
   */
  static async getPaymentTrends(tenantId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return PaymentRecord.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: startDate },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
          amount: { $round: ['$amount', 2] },
        },
      },
    ]);
  }

  /**
   * Get tax breakdown
   */
  static async getTaxBreakdown(tenantId: string, startDate?: Date, endDate?: Date) {
    const matchStage: any = { tenantId };

    if (startDate || endDate) {
      matchStage.issueDate = {};
      if (startDate) matchStage.issueDate.$gte = startDate;
      if (endDate) matchStage.issueDate.$lte = endDate;
    }

    const taxData = await Invoice.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.taxRate',
          taxableAmount: {
            $sum: { $multiply: ['$items.price', '$items.quantity'] },
          },
          taxAmount: { $sum: '$items.taxAmount' },
          lineCount: { $sum: 1 },
          invoiceCount: { $addToSet: '$invoiceId' },
        },
      },
      {
        $project: {
          _id: 0,
          taxRate: '$_id',
          taxableAmount: { $round: ['$taxableAmount', 2] },
          taxAmount: { $round: ['$taxAmount', 2] },
          lineCount: 1,
          invoiceCount: { $size: '$invoiceCount' },
          effectiveRate: {
            $round: [
              {
                $multiply: [
                  {
                    $cond: [
                      { $eq: ['$taxableAmount', 0] },
                      0,
                      { $divide: ['$taxAmount', '$taxableAmount'] },
                    ],
                  },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { taxRate: 1 } },
    ]);

    const totals = taxData.reduce(
      (acc, t) => ({
        taxableAmount: acc.taxableAmount + t.taxableAmount,
        taxAmount: acc.taxAmount + t.taxAmount,
        lineCount: acc.lineCount + t.lineCount,
      }),
      { taxableAmount: 0, taxAmount: 0, lineCount: 0 }
    );

    return {
      breakdown: taxData,
      totals: {
        taxableAmount: Math.round(totals.taxableAmount * 100) / 100,
        taxAmount: Math.round(totals.taxAmount * 100) / 100,
        lineCount: totals.lineCount,
        avgRate: totals.taxableAmount > 0
          ? Math.round((totals.taxAmount / totals.taxableAmount) * 10000) / 100
          : 0,
      },
    };
  }

  /**
   * Get forecast based on historical data
   */
  static async getForecast(tenantId: string, periods = 3) {
    // Get last 6 months of data
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historical = await Invoice.aggregate([
      {
        $match: {
          tenantId,
          issueDate: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' },
          },
          invoiceCount: { $sum: 1 },
          totalValue: { $sum: '$total' },
          avgValue: { $avg: '$total' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    if (historical.length < 2) {
      return {
        forecast: [],
        message: 'Insufficient data for forecast',
      };
    }

    // Calculate growth rate
    let totalGrowth = 0;
    for (let i = 1; i < historical.length; i++) {
      const prev = historical[i - 1].totalValue;
      const curr = historical[i].totalValue;
      if (prev > 0) {
        totalGrowth += ((curr - prev) / prev) * 100;
      }
    }
    const avgGrowth = totalGrowth / (historical.length - 1);

    // Generate forecast
    const lastData = historical[historical.length - 1];
    const forecast = [];

    let currentDate = new Date(lastData._id.year, lastData._id.month - 1);
    let currentAvgValue = lastData.avgValue;

    for (let i = 0; i < periods; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      currentAvgValue *= (1 + avgGrowth / 100);

      forecast.push({
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        label: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
        projectedAvgValue: Math.round(currentAvgValue * 100) / 100,
        projectedGrowth: Math.round(avgGrowth * 100) / 100,
      });
    }

    return {
      historical: historical.map(h => ({
        year: h._id.year,
        month: h._id.month,
        label: `${h._id.year}-${String(h._id.month).padStart(2, '0')}`,
        invoiceCount: h.invoiceCount,
        totalValue: Math.round(h.totalValue * 100) / 100,
        avgValue: Math.round(h.avgValue * 100) / 100,
      })),
      forecast,
      metrics: {
        avgGrowthRate: Math.round(avgGrowth * 100) / 100,
        lastMonthValue: lastData.totalValue,
        projectedNextValue: Math.round((lastData.totalValue * (1 + avgGrowth / 100)) * 100) / 100,
      },
    };
  }
}

export default BillingAnalytics;
