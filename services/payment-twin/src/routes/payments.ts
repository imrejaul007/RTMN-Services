import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { Payment } from '../models';
import { Transaction } from '../models';
import { logger } from '../utils/logger';

const router = Router();

// Validation Schemas
const createPaymentSchema = z.object({
  customerId: z.string().min(1),
  orderId: z.string().optional(),
  invoiceId: z.string().optional(),
  amount: z.number().positive(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']).default('INR'),
  method: z.enum(['card', 'upi', 'netbanking', 'wallet', 'bank_transfer', 'cod', 'crypto']),
  gateway: z.enum(['stripe', 'razorpay', 'paytm', 'phonepe', 'cashfree', 'internal']).default('internal'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  billingAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }).optional(),
  expiresIn: z.number().optional(), // minutes
});

const updatePaymentSchema = z.object({
  status: z.enum(['pending', 'processing', 'success', 'failed', 'refunded', 'partial_refund', 'cancelled', 'expired']).optional(),
  gatewayTransactionId: z.string().optional(),
  gatewayResponse: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const paymentQuerySchema = z.object({
  tenantId: z.string().optional(),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  status: z.string().optional(),
  gateway: z.string().optional(),
  method: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Middleware for tenant extraction
const extractTenant = (req: Request, _res: Response, next: NextFunction): void => {
  req.headers['x-tenant-id'] = req.headers['x-tenant-id'] || 'rtmn';
  next();
};

// Create Payment
router.post('/', extractTenant, async (req: Request, res: Response) => {
  try {
    const validatedData = createPaymentSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string;

    const paymentId = Payment.schema.statics.generatePaymentId(tenantId);

    // Calculate expiration
    const expiresAt = validatedData.expiresIn
      ? new Date(Date.now() + validatedData.expiresIn * 60 * 1000)
      : new Date(Date.now() + 30 * 60 * 1000); // Default 30 minutes

    const payment = new Payment({
      ...validatedData,
      paymentId,
      tenantId,
      status: 'pending',
      expiresAt,
      refundedAmount: 0,
      refundIds: [],
    });

    await payment.save();

    // Create pending transaction
    const transactionId = Transaction.schema.statics.generateTransactionId(tenantId);
    const transaction = new Transaction({
      transactionId,
      tenantId,
      paymentId: payment.paymentId,
      customerId: validatedData.customerId,
      orderId: validatedData.orderId,
      type: 'payment',
      status: 'pending',
      amount: validatedData.amount,
      currency: validatedData.currency,
      netAmount: validatedData.amount,
      paymentMethod: validatedData.method,
      gateway: validatedData.gateway,
      description: 'Payment initiated',
    });

    await transaction.save();

    logger.info('Payment created', {
      paymentId: payment.paymentId,
      tenantId,
      amount: validatedData.amount,
    });

    res.status(201).json({
      success: true,
      data: payment,
      transactionId,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    logger.error('Error creating payment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get All Payments with Filters
router.get('/', extractTenant, async (req: Request, res: Response) => {
  try {
    const query = paymentQuerySchema.parse(req.query);
    const tenantId = req.headers['x-tenant-id'] as string;

    const filter: Record<string, unknown> = { tenantId };

    if (query.customerId) filter.customerId = query.customerId;
    if (query.orderId) filter.orderId = query.orderId;
    if (query.status) filter.status = query.status;
    if (query.gateway) filter.gateway = query.gateway;
    if (query.method) filter.method = query.method;

    if (query.fromDate || query.toDate) {
      filter.createdAt = {};
      if (query.fromDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(query.toDate);
      }
    }

    const skip = (query.page - 1) * query.limit;

    const [payments, total] = await Promise.all([
      Payment.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Payment.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    logger.error('Error fetching payments', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Single Payment
router.get('/:paymentId', extractTenant, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const payment = await Payment.findOne({ paymentId, tenantId }).lean();

    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
      return;
    }

    // Get related transactions
    const transactions = await Transaction.find({ paymentId, tenantId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      data: {
        ...payment,
        transactions,
      },
    });
  } catch (error) {
    logger.error('Error fetching payment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Update Payment
router.patch('/:paymentId', extractTenant, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const validatedData = updatePaymentSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string;

    const payment = await Payment.findOne({ paymentId, tenantId });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
      return;
    }

    // Update fields
    Object.assign(payment, validatedData);

    // If status changed to success, update transaction
    if (validatedData.status === 'success' && !payment.processedAt) {
      payment.processedAt = new Date();

      await Transaction.findOneAndUpdate(
        { paymentId, tenantId, type: 'payment', status: 'pending' },
        {
          status: 'completed',
          completedAt: new Date(),
          gatewayTransactionId: validatedData.gatewayTransactionId,
        }
      );
    }

    await payment.save();

    logger.info('Payment updated', { paymentId, tenantId, updates: validatedData });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }
    logger.error('Error updating payment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Process Payment (Simulate gateway processing)
router.post('/:paymentId/process', extractTenant, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;

    const payment = await Payment.findOne({ paymentId, tenantId });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
      return;
    }

    if (payment.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Payment cannot be processed. Current status: ${payment.status}`,
      });
      return;
    }

    // Check if expired
    if (payment.expiresAt && new Date() > payment.expiresAt) {
      payment.status = 'expired';
      await payment.save();

      await Transaction.findOneAndUpdate(
        { paymentId, tenantId, type: 'payment', status: 'pending' },
        { status: 'cancelled' }
      );

      res.status(400).json({
        success: false,
        error: 'Payment has expired',
      });
      return;
    }

    // Simulate payment processing (in real implementation, call gateway API)
    payment.status = 'processing';
    await payment.save();

    // Update transaction
    await Transaction.findOneAndUpdate(
      { paymentId, tenantId, type: 'payment', status: 'pending' },
      { status: 'pending' }
    );

    // Simulate success (90% success rate for demo)
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      const gatewayTransactionId = `${payment.gateway.toUpperCase()}-${Date.now()}`;

      payment.status = 'success';
      payment.processedAt = new Date();
      payment.gatewayTransactionId = gatewayTransactionId;
      payment.gatewayResponse = {
        status: 'captured',
        gatewayTransactionId,
        timestamp: new Date().toISOString(),
      };

      await payment.save();

      await Transaction.findOneAndUpdate(
        { paymentId, tenantId, type: 'payment' },
        {
          status: 'completed',
          completedAt: new Date(),
          gatewayTransactionId,
        }
      );

      logger.info('Payment processed successfully', {
        paymentId,
        gatewayTransactionId,
      });

      res.json({
        success: true,
        data: payment,
        message: 'Payment processed successfully',
      });
    } else {
      payment.status = 'failed';
      payment.gatewayResponse = {
        status: 'failed',
        error: 'Payment declined',
        timestamp: new Date().toISOString(),
      };

      await payment.save();

      await Transaction.findOneAndUpdate(
        { paymentId, tenantId, type: 'payment' },
        { status: 'failed' }
      );

      logger.warn('Payment processing failed', { paymentId });

      res.status(400).json({
        success: false,
        error: 'Payment processing failed',
        data: payment,
      });
    }
  } catch (error) {
    logger.error('Error processing payment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Cancel Payment
router.post('/:paymentId/cancel', extractTenant, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string;
    const { reason } = req.body;

    const payment = await Payment.findOne({ paymentId, tenantId });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
      return;
    }

    if (!['pending', 'processing'].includes(payment.status)) {
      res.status(400).json({
        success: false,
        error: `Payment cannot be cancelled. Current status: ${payment.status}`,
      });
      return;
    }

    payment.status = 'cancelled';
    payment.metadata = {
      ...payment.metadata,
      cancellationReason: reason || 'Cancelled by user',
      cancelledAt: new Date().toISOString(),
    };

    await payment.save();

    await Transaction.findOneAndUpdate(
      { paymentId, tenantId, type: 'payment', status: { $in: ['pending', 'processing'] } },
      { status: 'cancelled' }
    );

    logger.info('Payment cancelled', { paymentId, reason });

    res.json({
      success: true,
      data: payment,
      message: 'Payment cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling payment', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Payment Stats
router.get('/stats/summary', extractTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    const stats = await Payment.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byGateway: [
            { $group: { _id: '$gateway', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byMethod: [
            { $group: { _id: '$method', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalPayments: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                avgAmount: { $avg: '$amount' },
                successCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
                },
                failedCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
                },
                pendingCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] },
                },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    logger.error('Error fetching payment stats', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
