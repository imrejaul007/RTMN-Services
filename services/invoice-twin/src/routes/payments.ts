import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import PaymentRecord from '../models/PaymentRecord';
import Invoice, { InvoiceStatus, PaymentMethod } from '../models/Invoice';

const router = Router();

// GET /api/payments - List all payments
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const {
      page = 1,
      limit = 20,
      invoiceId,
      customerId,
      method,
      status,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
    } = req.query;

    // Build query
    const query: any = { tenantId };

    if (invoiceId) query.invoiceId = invoiceId;
    if (customerId) query.customerId = customerId;
    if (method) query.method = method;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    // Pagination
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const sort: any = { [sortBy as string]: sortOrder === 'desc' ? -1 : 1 };

    const [payments, total] = await Promise.all([
      PaymentRecord.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit as string))
        .lean(),
      PaymentRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/stats - Get payment statistics
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { startDate, endDate } = req.query;

    // Default to current month
    const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get stats by payment method
    const byMethod = await PaymentRecord.getPaymentStats(tenantId, start, end);

    // Get total payments
    const totalPayments = await PaymentRecord.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: start, $lte: end },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amount' },
          avgPayment: { $avg: '$amount' },
        },
      },
    ]);

    // Get refunded payments
    const refunds = await PaymentRecord.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: start, $lte: end },
          status: 'refunded',
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    // Get pending payments
    const pending = await PaymentRecord.aggregate([
      {
        $match: {
          tenantId,
          date: { $gte: start, $lte: end },
          status: 'pending',
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        period: { start: start.toISOString(), end: end.toISOString() },
        totalPayments: totalPayments[0] || { count: 0, total: 0, avgPayment: 0 },
        refunds: refunds[0] || { count: 0, total: 0 },
        pending: pending[0] || { count: 0, total: 0 },
        byMethod,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:id - Get single payment
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const payment = await PaymentRecord.findOne({ paymentId: id, tenantId }).lean();

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Get associated invoice
    const invoice = await Invoice.findOne({ invoiceId: payment.invoiceId, tenantId }).lean();

    res.json({
      success: true,
      data: {
        ...payment,
        invoice,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments - Create standalone payment (not linked to invoice)
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { invoiceId, customerId, amount, method, date, reference, notes, transactionId } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid payment amount is required',
      });
    }

    if (!customerId) {
      return res.status(400).json({
        success: false,
        error: 'customerId is required',
      });
    }

    const paymentId = uuidv4();
    const paymentDate = date ? new Date(date) : new Date();

    const payment = new PaymentRecord({
      paymentId,
      invoiceId: invoiceId || 'standalone',
      tenantId,
      customerId,
      amount,
      method: method || PaymentMethod.BANK_TRANSFER,
      date: paymentDate,
      reference,
      notes,
      transactionId,
      status: 'completed',
    });

    await payment.save();

    // If linked to invoice, update invoice
    if (invoiceId) {
      const invoice = await Invoice.findOne({ invoiceId, tenantId });
      if (invoice && invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.CANCELLED) {
        invoice.recordPayment({
          amount,
          method: method || PaymentMethod.BANK_TRANSFER,
          date: paymentDate,
          reference,
          transactionId,
        });
        await invoice.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/payments/:id/refund - Refund a payment
router.post('/:id/refund', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { reason } = req.body;

    const payment = await PaymentRecord.findOne({ paymentId: id, tenantId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: 'Payment has already been refunded',
      });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Only completed payments can be refunded',
      });
    }

    // Mark as refunded
    payment.markAsRefunded(reason);
    await payment.save();

    // Update invoice if linked
    if (payment.invoiceId !== 'standalone') {
      const invoice = await Invoice.findOne({ invoiceId: payment.invoiceId, tenantId });
      if (invoice) {
        invoice.paidAmount -= payment.amount;
        invoice.remainingAmount += payment.amount;

        if (invoice.paidAmount <= 0) {
          invoice.status = InvoiceStatus.SENT;
          invoice.paidAt = undefined;
        } else {
          invoice.status = InvoiceStatus.PARTIAL;
        }

        await invoice.save();
      }
    }

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/payments/:id - Update payment
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { reference, notes, status } = req.body;

    const payment = await PaymentRecord.findOne({ paymentId: id, tenantId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Only allow updates to pending payments
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending payments can be updated',
      });
    }

    if (reference) payment.reference = reference;
    if (notes) payment.notes = notes;
    if (status) payment.status = status;

    await payment.save();

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: payment,
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.tenantId;
    const { id } = req.params;

    const payment = await PaymentRecord.findOne({ paymentId: id, tenantId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
    }

    // Only allow deletion of pending payments
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending payments can be deleted',
      });
    }

    await PaymentRecord.deleteOne({ paymentId: id, tenantId });

    res.json({
      success: true,
      message: 'Payment deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
