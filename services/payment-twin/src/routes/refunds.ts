import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Refund, Payment, Transaction, Wallet } from '../models';
import { logger } from '../utils/logger';

const router = Router();

// Validation Schemas
const createRefundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive().optional(), // Optional for full refund
  reason: z.enum([
    'customer_request',
    'duplicate',
    'fraudulent',
    'order_cancelled',
    'service_not_rendered',
    'product_returned',
    'other',
  ]),
  reasonDescription: z.string().optional(),
  initiatedBy: z.string().min(1),
  refundToWallet: z.boolean().default(false),
  notes: z.string().optional(),
});

const updateRefundSchema = z.object({
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  gatewayRefundId: z.string().optional(),
  gatewayResponse: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
});

const refundQuerySchema = z.object({
  tenantId: z.string().optional(),
  customerId: z.string().optional(),
  paymentId: z.string().optional(),
  orderId: z.string().optional(),
  status: z.string().optional(),
  reason: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Create Refund
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createRefundSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    // Find the payment
    const payment = await Payment.findOne({
      paymentId: validatedData.paymentId,
      tenantId,
    });

    if (!payment) {
      res.status(404).json({
        success: false,
        error: 'Payment not found',
      });
      return;
    }

    // Check payment status
    if (!['success', 'partial_refund'].includes(payment.status)) {
      res.status(400).json({
        success: false,
        error: `Cannot refund payment with status: ${payment.status}`,
      });
      return;
    }

    // Calculate refund amount
    const refundAmount = validatedData.amount || (payment.amount - payment.refundedAmount);

    // Validate refund amount
    if (refundAmount <= 0 || refundAmount > payment.amount - payment.refundedAmount) {
      res.status(400).json({
        success: false,
        error: 'Invalid refund amount',
        details: {
          requested: refundAmount,
          maxAvailable: payment.amount - payment.refundedAmount,
        },
      });
      return;
    }

    // Check if this would be a full refund
    const isFullRefund = refundAmount === payment.amount - payment.refundedAmount;

    // Generate refund ID
    const refundId = Refund.schema.statics.generateRefundId(tenantId);

    // Create refund record
    const refund = new Refund({
      refundId,
      tenantId,
      paymentId: payment.paymentId,
      customerId: payment.customerId,
      orderId: payment.orderId,
      amount: refundAmount,
      currency: payment.currency,
      status: 'pending',
      reason: validatedData.reason,
      reasonDescription: validatedData.reasonDescription,
      initiatedBy: validatedData.initiatedBy,
      initiatedAt: new Date(),
      customerEmail: payment.customerEmail,
      customerPhone: payment.customerPhone,
      originalPaymentMethod: payment.method,
      refundToWallet: validatedData.refundToWallet,
      notes: validatedData.notes,
    });

    await refund.save();

    // Update payment status and refunded amount
    const newRefundedAmount = payment.refundedAmount + refundAmount;
    payment.refundedAmount = newRefundedAmount;
    payment.refundIds.push(refundId);

    if (isFullRefund) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partial_refund';
    }

    await payment.save();

    // Create transaction record for refund
    const transactionId = Transaction.schema.statics.generateTransactionId(tenantId);
    const transaction = new Transaction({
      transactionId,
      tenantId,
      paymentId: payment.paymentId,
      customerId: payment.customerId,
      orderId: payment.orderId,
      type: 'refund',
      status: 'pending',
      amount: refundAmount,
      currency: payment.currency,
      netAmount: refundAmount,
      paymentMethod: payment.method,
      gateway: payment.gateway,
      refundId: refund.refundId,
      description: `Refund initiated: ${validatedData.reason}`,
    });

    await transaction.save();

    // If refund to wallet, credit wallet
    if (validatedData.refundToWallet) {
      try {
        let wallet = await Wallet.findOne({
          tenantId,
          customerId: payment.customerId,
          type: 'customer',
          status: 'active',
        });

        if (wallet) {
          const balanceBefore = wallet.balance;
          wallet.balance += refundAmount;
          wallet.availableBalance += refundAmount;

          wallet.transactionHistory.push({
            transactionId,
            type: 'credit',
            amount: refundAmount,
            balanceBefore,
            balanceAfter: wallet.balance,
            description: `Refund for payment ${payment.paymentId}`,
            referenceType: 'refund',
            referenceId: refund.refundId,
          });

          wallet.lastTransactionAt = new Date();
          wallet.lastTopupAt = new Date();
          await wallet.save();

          // Update transaction with wallet info
          transaction.balanceBefore = balanceBefore;
          transaction.balanceAfter = wallet.balance;
          transaction.walletId = wallet.walletId;
          transaction.status = 'completed';
          transaction.completedAt = new Date();
          await transaction.save();

          // Update refund status to completed for wallet refunds
          refund.status = 'completed';
          refund.processedAt = new Date();
          await refund.save();
        }
      } catch (walletError) {
        logger.error('Error crediting wallet', { refundId, walletError });
        // Don't fail the refund, just log
      }
    }

    logger.info('Refund created', {
      refundId,
      paymentId: payment.paymentId,
      amount: refundAmount,
      reason: validatedData.reason,
    });

    res.status(201).json({
      success: true,
      data: refund,
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
    logger.error('Error creating refund', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get All Refunds
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = refundQuerySchema.parse(req.query);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const filter: Record<string, unknown> = { tenantId };

    if (query.customerId) filter.customerId = query.customerId;
    if (query.paymentId) filter.paymentId = query.paymentId;
    if (query.orderId) filter.orderId = query.orderId;
    if (query.status) filter.status = query.status;
    if (query.reason) filter.reason = query.reason;

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

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Refund.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: refunds,
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
    logger.error('Error fetching refunds', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Single Refund
router.get('/:refundId', async (req: Request, res: Response) => {
  try {
    const { refundId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const refund = await Refund.findOne({ refundId, tenantId }).lean();

    if (!refund) {
      res.status(404).json({
        success: false,
        error: 'Refund not found',
      });
      return;
    }

    // Get related payment
    const payment = await Payment.findOne({ paymentId: refund.paymentId, tenantId })
      .select('paymentId amount currency status customerId')
      .lean();

    // Get related transaction
    const transaction = await Transaction.findOne({ refundId, tenantId }).lean();

    res.json({
      success: true,
      data: {
        ...refund,
        payment,
        transaction,
      },
    });
  } catch (error) {
    logger.error('Error fetching refund', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Update Refund
router.patch('/:refundId', async (req: Request, res: Response) => {
  try {
    const { refundId } = req.params;
    const validatedData = updateRefundSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const refund = await Refund.findOne({ refundId, tenantId });

    if (!refund) {
      res.status(404).json({
        success: false,
        error: 'Refund not found',
      });
      return;
    }

    // Update fields
    Object.assign(refund, validatedData);

    // If status changed to completed, update transaction and potentially credit wallet
    if (validatedData.status === 'completed' && !refund.processedAt) {
      refund.processedAt = new Date();

      // Update transaction
      await Transaction.findOneAndUpdate(
        { refundId, tenantId, type: 'refund' },
        {
          status: 'completed',
          completedAt: new Date(),
          gatewayTransactionId: validatedData.gatewayRefundId,
        }
      );

      // Credit wallet if not already done
      if (refund.refundToWallet) {
        const wallet = await Wallet.findOne({
          tenantId,
          customerId: refund.customerId,
          type: 'customer',
          status: 'active',
        });

        if (wallet) {
          const transaction = await Transaction.findOne({ refundId, tenantId });
          if (transaction && transaction.status !== 'completed') {
            const balanceBefore = wallet.balance;
            wallet.balance += refund.amount;
            wallet.availableBalance += refund.amount;

            wallet.transactionHistory.push({
              transactionId: transaction.transactionId,
              type: 'credit',
              amount: refund.amount,
              balanceBefore,
              balanceAfter: wallet.balance,
              description: `Refund for payment ${refund.paymentId}`,
              referenceType: 'refund',
              referenceId: refund.refundId,
            });

            wallet.lastTransactionAt = new Date();
            await wallet.save();

            transaction.balanceBefore = balanceBefore;
            transaction.balanceAfter = wallet.balance;
            transaction.walletId = wallet.walletId;
            transaction.status = 'completed';
            transaction.completedAt = new Date();
            await transaction.save();
          }
        }
      }
    }

    await refund.save();

    logger.info('Refund updated', { refundId, updates: validatedData });

    res.json({
      success: true,
      data: refund,
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
    logger.error('Error updating refund', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Process Refund (Simulate gateway processing)
router.post('/:refundId/process', async (req: Request, res: Response) => {
  try {
    const { refundId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const refund = await Refund.findOne({ refundId, tenantId });

    if (!refund) {
      res.status(404).json({
        success: false,
        error: 'Refund not found',
      });
      return;
    }

    if (refund.status !== 'pending') {
      res.status(400).json({
        success: false,
        error: `Refund cannot be processed. Current status: ${refund.status}`,
      });
      return;
    }

    // Update to processing
    refund.status = 'processing';
    await refund.save();

    // Simulate gateway processing
    const gatewayRefundId = `REF-${Date.now()}`;
    const isSuccess = Math.random() > 0.05; // 95% success rate

    if (isSuccess) {
      refund.status = 'completed';
      refund.processedAt = new Date();
      refund.gatewayRefundId = gatewayRefundId;
      refund.gatewayResponse = {
        status: 'processed',
        gatewayRefundId,
        timestamp: new Date().toISOString(),
      };

      await refund.save();

      // Update transaction
      await Transaction.findOneAndUpdate(
        { refundId, tenantId, type: 'refund' },
        {
          status: 'completed',
          completedAt: new Date(),
          gatewayTransactionId: gatewayRefundId,
        }
      );

      // If not wallet refund, credit wallet
      if (!refund.refundToWallet) {
        try {
          const payment = await Payment.findOne({
            paymentId: refund.paymentId,
            tenantId,
          });

          let wallet = await Wallet.findOne({
            tenantId,
            customerId: refund.customerId,
            type: 'customer',
            status: 'active',
          });

          if (!wallet && payment) {
            // Create wallet if doesn't exist
            wallet = new Wallet({
              walletId: Wallet.schema.statics.generateWalletId(tenantId),
              tenantId,
              customerId: refund.customerId,
              type: 'customer',
              status: 'active',
              currency: refund.currency,
              customerEmail: payment.customerEmail,
              customerPhone: payment.customerPhone,
            });
          }

          if (wallet) {
            const balanceBefore = wallet.balance;
            wallet.balance += refund.amount;
            wallet.availableBalance += refund.amount;

            const transaction = await Transaction.findOne({ refundId, tenantId });

            if (transaction) {
              wallet.transactionHistory.push({
                transactionId: transaction.transactionId,
                type: 'credit',
                amount: refund.amount,
                balanceBefore,
                balanceAfter: wallet.balance,
                description: `Refund credited for payment ${refund.paymentId}`,
                referenceType: 'refund',
                referenceId: refund.refundId,
              });

              transaction.balanceBefore = balanceBefore;
              transaction.balanceAfter = wallet.balance;
              transaction.walletId = wallet.walletId;
              await transaction.save();
            }

            wallet.lastTransactionAt = new Date();
            wallet.lastTopupAt = new Date();
            await wallet.save();
          }
        } catch (walletError) {
          logger.error('Error crediting wallet', { refundId, walletError });
        }
      }

      logger.info('Refund processed successfully', { refundId, gatewayRefundId });

      res.json({
        success: true,
        data: refund,
        message: 'Refund processed successfully',
      });
    } else {
      refund.status = 'failed';
      refund.gatewayResponse = {
        status: 'failed',
        error: 'Refund processing failed',
        timestamp: new Date().toISOString(),
      };

      await refund.save();

      await Transaction.findOneAndUpdate(
        { refundId, tenantId, type: 'refund' },
        { status: 'failed' }
      );

      logger.warn('Refund processing failed', { refundId });

      res.status(400).json({
        success: false,
        error: 'Refund processing failed',
        data: refund,
      });
    }
  } catch (error) {
    logger.error('Error processing refund', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Cancel Refund
router.post('/:refundId/cancel', async (req: Request, res: Response) => {
  try {
    const { refundId } = req.params;
    const { reason } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const refund = await Refund.findOne({ refundId, tenantId });

    if (!refund) {
      res.status(404).json({
        success: false,
        error: 'Refund not found',
      });
      return;
    }

    if (refund.status !== 'pending' && refund.status !== 'processing') {
      res.status(400).json({
        success: false,
        error: `Refund cannot be cancelled. Current status: ${refund.status}`,
      });
      return;
    }

    refund.status = 'cancelled';
    refund.notes = reason ? `${refund.notes || ''} | Cancelled: ${reason}` : refund.notes;

    await refund.save();

    // Update transaction
    await Transaction.findOneAndUpdate(
      { refundId, tenantId, type: 'refund' },
      { status: 'cancelled' }
    );

    // Restore payment refunded amount
    const payment = await Payment.findOne({
      paymentId: refund.paymentId,
      tenantId,
    });

    if (payment) {
      payment.refundedAmount -= refund.amount;
      payment.refundIds = payment.refundIds.filter((id) => id !== refundId);

      if (payment.refundedAmount === 0) {
        payment.status = 'success';
      } else {
        payment.status = 'partial_refund';
      }

      await payment.save();
    }

    logger.info('Refund cancelled', { refundId, reason });

    res.json({
      success: true,
      data: refund,
      message: 'Refund cancelled successfully',
    });
  } catch (error) {
    logger.error('Error cancelling refund', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Refund Stats
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const stats = await Refund.aggregate([
      { $match: { tenantId } },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byReason: [
            { $group: { _id: '$reason', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalRefunds: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                avgAmount: { $avg: '$amount' },
                completedCount: {
                  $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
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
    logger.error('Error fetching refund stats', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
