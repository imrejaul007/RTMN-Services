import { Router, Request, Response, NextFunction } from 'express';
import Invoice, { InvoiceStatus } from '../models/Invoice';
import PaymentRecord from '../models/PaymentRecord';

const router = Router();

// GET /api/reports/summary - Get billing summary
router.get('/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter: any = {};
    if (startDate) dateFilter.$gte = new Date(startDate as string);
    if (endDate) dateFilter.$lte = new Date(endDate as string);

    const matchStage: any = { tenantId };
    if (startDate || endDate) {
      matchStage.issueDate = dateFilter;
    }

    // Invoice summary
    const invoiceSummary = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
          avgInvoiceValue: { $avg: '$total' },
        },
      },
    ]);

    // Status breakdown
    const statusBreakdown = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          amount: { $sum: '$total' },
          paidAmount: { $sum: '$paidAmount' },
        },
      },
    ]);

    // Overdue summary
    const overdueSummary = await Invoice.aggregate([
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
          count: { $sum: 1 },
          totalOverdue: { $sum: '$remainingAmount' },
          avgOverdueDays: { $avg: '$overdueDays' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: invoiceSummary[0] || {
          totalInvoices: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          avgInvoiceValue: 0,
        },
        statusBreakdown,
        overdue: overdueSummary[0] || {
          count: 0,
          totalOverdue: 0,
          avgOverdueDays: 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/trends - Get billing trends
router.get('/trends', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { months = 6 } = req.query;

    const monthsNum = parseInt(months as string);
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - monthsNum);

    // Monthly invoice trends
    const monthlyTrends = await Invoice.aggregate([
      {
        $match: {
          tenantId,
          issueDate: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$issueDate' },
            month: { $month: '$issueDate' },
          },
          count: { $sum: 1 },
          total: { $sum: '$total' },
          paid: { $sum: '$paidAmount' },
          outstanding: { $sum: '$remainingAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Format response
    const trends = monthlyTrends.map(t => ({
      year: t._id.year,
      month: t._id.month,
      label: `${t._id.year}-${String(t._id.month).padStart(2, '0')}`,
      invoices: t.count,
      total: Math.round(t.total * 100) / 100,
      paid: Math.round(t.paid * 100) / 100,
      outstanding: Math.round(t.outstanding * 100) / 100,
      collectionRate: t.total > 0 ? Math.round((t.paid / t.total) * 10000) / 100 : 0,
    }));

    res.json({
      success: true,
      data: {
        months: monthsNum,
        trends,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/customers - Customer billing report
router.get('/customers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { page = 1, limit = 20, sortBy = 'total', sortOrder = 'desc' } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const customerReport = await Invoice.aggregate([
      { $match: { tenantId } },
      {
        $group: {
          _id: '$customerId',
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          totalPaid: { $sum: '$paidAmount' },
          totalOutstanding: { $sum: '$remainingAmount' },
          avgInvoiceValue: { $avg: '$total' },
          lastInvoiceDate: { $max: '$issueDate' },
        },
      },
      {
        $project: {
          _id: 0,
          customerId: '$_id',
          totalInvoices: 1,
          totalAmount: { $round: ['$totalAmount', 2] },
          totalPaid: { $round: ['$totalPaid', 2] },
          totalOutstanding: { $round: ['$totalOutstanding', 2] },
          avgInvoiceValue: { $round: ['$avgInvoiceValue', 2] },
          lastInvoiceDate: 1,
          paymentRate: {
            $cond: {
              if: { $gt: ['$totalAmount', 0] },
              then: { $round: [{ $multiply: [{ $divide: ['$totalPaid', '$totalAmount'] }, 100] }, 2] },
              else: 0,
            },
          },
        },
      },
      { $sort: sort },
      { $skip: skip },
      { $limit: parseInt(limit as string) },
    ]);

    const totalCustomers = await Invoice.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$customerId' } },
      { $count: 'total' },
    ]);

    res.json({
      success: true,
      data: customerReport,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: totalCustomers[0]?.total || 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/aging - Aging report
router.get('/aging', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;

    const agingReport = await Invoice.aggregate([
      {
        $match: {
          tenantId,
          status: { $nin: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
          remainingAmount: { $gt: 0 },
        },
      },
      {
        $addFields: {
          daysUntilDue: {
            $divide: [{ $subtract: ['$dueDate', new Date()] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $bucket: {
          groupBy: '$daysUntilDue',
          boundaries: [-Infinity, -1, 1, 31, 61, 91, Infinity],
          default: 'unknown',
          output: {
            count: { $sum: 1 },
            totalAmount: { $sum: '$remainingAmount' },
            invoices: { $push: { invoiceId: '$invoiceId', invoiceNumber: '$invoiceNumber', remainingAmount: '$remainingAmount', daysUntilDue: '$daysUntilDue' } },
          },
        },
      },
    ]);

    // Format aging buckets
    const buckets = {
      overdue: { label: 'Overdue', bucket: agingReport.find(b => b._id === -Infinity) },
      '0-30': { label: '0-30 days', bucket: agingReport.find(b => b._id === 1) },
      '31-60': { label: '31-60 days', bucket: agingReport.find(b => b._id === 31) },
      '61-90': { label: '61-90 days', bucket: agingReport.find(b => b._id === 61) },
      '90+': { label: '90+ days', bucket: agingReport.find(b => b._id === 91) },
    };

    const totalOutstanding = Object.values(buckets).reduce(
      (sum, b) => sum + (b.bucket?.totalAmount || 0),
      0
    );

    res.json({
      success: true,
      data: {
        buckets: Object.entries(buckets).map(([key, value]) => ({
          bucket: key,
          label: value.label,
          count: value.bucket?.count || 0,
          totalAmount: Math.round((value.bucket?.totalAmount || 0) * 100) / 100,
          percentage: totalOutstanding > 0
            ? Math.round(((value.bucket?.totalAmount || 0) / totalOutstanding) * 10000) / 100
            : 0,
        })),
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/tax - Tax report
router.get('/tax', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate, year, quarter } = req.query;

    // Build match query
    const match: any = { tenantId };

    if (year) {
      match.$expr = {
        $eq: [{ $year: '$issueDate' }, parseInt(year as string)],
      };
    }

    if (quarter) {
      const q = parseInt(quarter as string);
      const startMonth = (q - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      match.issueDate = {
        $gte: new Date(parseInt(year as string), startMonth - 1, 1),
        $lte: new Date(parseInt(year as string), endMonth, 0),
      };
    } else if (startDate || endDate) {
      match.issueDate = {};
      if (startDate) match.issueDate.$gte = new Date(startDate as string);
      if (endDate) match.issueDate.$lte = new Date(endDate as string);
    }

    // Group by tax rate
    const taxReport = await Invoice.aggregate([
      { $match: match },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.taxRate',
          taxableAmount: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          taxAmount: { $sum: '$items.taxAmount' },
          lineCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Total tax collected
    const totalTax = taxReport.reduce((sum, t) => sum + t.taxAmount, 0);
    const totalTaxable = taxReport.reduce((sum, t) => sum + t.taxableAmount, 0);

    res.json({
      success: true,
      data: {
        period: { year, quarter, startDate, endDate },
        breakdown: taxReport.map(t => ({
          taxRate: t._id,
          taxableAmount: Math.round(t.taxableAmount * 100) / 100,
          taxAmount: Math.round(t.taxAmount * 100) / 100,
          lineCount: t.lineCount,
        })),
        summary: {
          totalTaxable: Math.round(totalTaxable * 100) / 100,
          totalTax: Math.round(totalTax * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/export - Export data
router.get('/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { type = 'invoices', format = 'json', startDate, endDate } = req.query;

    // Build query
    const query: any = { tenantId };
    if (startDate || endDate) {
      query.issueDate = {};
      if (startDate) query.issueDate.$gte = new Date(startDate as string);
      if (endDate) query.issueDate.$lte = new Date(endDate as string);
    }

    if (type === 'invoices') {
      const invoices = await Invoice.find(query)
        .sort({ issueDate: -1 })
        .lean();

      if (format === 'csv') {
        // Generate CSV
        const headers = ['invoiceId', 'invoiceNumber', 'customerId', 'issueDate', 'dueDate', 'subtotal', 'taxAmount', 'discount', 'total', 'status', 'paidAmount', 'remainingAmount'];
        const csvRows = [headers.join(',')];
        invoices.forEach(inv => {
          csvRows.push([
            inv.invoiceId,
            inv.invoiceNumber,
            inv.customerId,
            inv.issueDate?.toISOString().split('T')[0],
            inv.dueDate?.toISOString().split('T')[0],
            inv.subtotal,
            inv.taxAmount,
            inv.discount,
            inv.total,
            inv.status,
            inv.paidAmount,
            inv.remainingAmount,
          ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=invoices.csv');
        return res.send(csvRows.join('\n'));
      }

      return res.json({ success: true, count: invoices.length, data: invoices });
    }

    if (type === 'payments') {
      const payments = await PaymentRecord.find(query)
        .sort({ date: -1 })
        .lean();

      if (format === 'csv') {
        const headers = ['paymentId', 'invoiceId', 'customerId', 'amount', 'method', 'date', 'status'];
        const csvRows = [headers.join(',')];
        payments.forEach(p => {
          csvRows.push([
            p.paymentId,
            p.invoiceId,
            p.customerId,
            p.amount,
            p.method,
            p.date?.toISOString().split('T')[0],
            p.status,
          ].join(','));
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments.csv');
        return res.send(csvRows.join('\n'));
      }

      return res.json({ success: true, count: payments.length, data: payments });
    }

    res.status(400).json({
      success: false,
      error: 'Invalid export type. Use "invoices" or "payments"',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
