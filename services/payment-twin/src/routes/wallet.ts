import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { Wallet, Transaction, Payment } from '../models';
import { logger } from '../utils/logger';

const router = Router();

// Validation Schemas
const createWalletSchema = z.object({
  customerId: z.string().min(1),
  businessId: z.string().optional(),
  type: z.enum(['customer', 'merchant', 'business', 'escrow']).default('customer'),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']).default('INR'),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
  perTransactionLimit: z.number().positive().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const topupSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(['card', 'upi', 'netbanking', 'bank_transfer']).optional(),
  gateway: z.enum(['stripe', 'razorpay', 'paytm', 'phonepe', 'cashfree', 'internal']).default('internal'),
  description: z.string().optional(),
});

const withdrawSchema = z.object({
  amount: z.number().positive(),
  paymentMethod: z.enum(['card', 'upi', 'netbanking', 'bank_transfer']).optional(),
  description: z.string().optional(),
});

const transferSchema = z.object({
  toWalletId: z.string().min(1),
  amount: z.number().positive(),
  description: z.string().optional(),
});

const updateWalletSchema = z.object({
  status: z.enum(['active', 'inactive', 'suspended', 'closed']).optional(),
  dailyLimit: z.number().positive().optional(),
  monthlyLimit: z.number().positive().optional(),
  perTransactionLimit: z.number().positive().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  customerName: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const walletQuerySchema = z.object({
  tenantId: z.string().optional(),
  customerId: z.string().optional(),
  businessId: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// Create Wallet
router.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = createWalletSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    // Check if wallet already exists for customer
    const existingWallet = await Wallet.findOne({
      tenantId,
      customerId: validatedData.customerId,
      type: validatedData.type,
      status: { $ne: 'closed' },
    });

    if (existingWallet) {
      res.status(400).json({
        success: false,
        error: 'Wallet already exists for this customer',
        walletId: existingWallet.walletId,
      });
      return;
    }

    const walletId = Wallet.schema.statics.generateWalletId(tenantId);

    const wallet = new Wallet({
      ...validatedData,
      walletId,
      tenantId,
      status: 'active',
    });

    await wallet.save();

    logger.info('Wallet created', {
      walletId: wallet.walletId,
      tenantId,
      customerId: validatedData.customerId,
    });

    res.status(201).json({
      success: true,
      data: wallet,
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
    logger.error('Error creating wallet', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get All Wallets
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = walletQuerySchema.parse(req.query);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const filter: Record<string, unknown> = { tenantId };

    if (query.customerId) filter.customerId = query.customerId;
    if (query.businessId) filter.businessId = query.businessId;
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;

    const skip = (query.page - 1) * query.limit;

    const [wallets, total] = await Promise.all([
      Wallet.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean(),
      Wallet.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: wallets,
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
    logger.error('Error fetching wallets', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Single Wallet
router.get('/:walletId', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId }).lean();

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    // Get recent transactions
    const transactions = await Transaction.find({ walletId, tenantId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      data: {
        ...wallet,
        recentTransactions: transactions,
      },
    });
  } catch (error) {
    logger.error('Error fetching wallet', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Update Wallet
router.patch('/:walletId', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const validatedData = updateWalletSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId });

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    if (wallet.status === 'closed') {
      res.status(400).json({
        success: false,
        error: 'Cannot update a closed wallet',
      });
      return;
    }

    Object.assign(wallet, validatedData);
    await wallet.save();

    logger.info('Wallet updated', { walletId, tenantId, updates: validatedData });

    res.json({
      success: true,
      data: wallet,
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
    logger.error('Error updating wallet', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Topup Wallet
router.post('/:walletId/topup', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const validatedData = topupSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId });

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    if (wallet.status !== 'active') {
      res.status(400).json({
        success: false,
        error: `Cannot topup wallet with status: ${wallet.status}`,
      });
      return;
    }

    // Check limits
    if (validatedData.amount > wallet.perTransactionLimit) {
      res.status(400).json({
        success: false,
        error: 'Amount exceeds per-transaction limit',
        limit: wallet.perTransactionLimit,
      });
      return;
    }

    if (wallet.dailySpent + validatedData.amount > wallet.dailyLimit) {
      res.status(400).json({
        success: false,
        error: 'Amount exceeds daily limit',
        dailyLimit: wallet.dailyLimit,
        dailySpent: wallet.dailySpent,
      });
      return;
    }

    // Credit wallet
    const balanceBefore = wallet.balance;
    wallet.balance += validatedData.amount;
    wallet.availableBalance += validatedData.amount;
    wallet.dailySpent += validatedData.amount;
    wallet.monthlySpent += validatedData.amount;

    // Generate transaction
    const transactionId = Transaction.schema.statics.generateTransactionId(tenantId);

    const transaction = new Transaction({
      transactionId,
      tenantId,
      paymentId: '', // No payment linked for topup
      customerId: wallet.customerId,
      type: 'deposit',
      status: 'completed',
      amount: validatedData.amount,
      currency: wallet.currency,
      netAmount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod || 'internal',
      gateway: validatedData.gateway,
      balanceBefore,
      balanceAfter: wallet.balance,
      walletId: wallet.walletId,
      description: validatedData.description || 'Wallet topup',
      completedAt: new Date(),
    });

    await transaction.save();

    // Add to wallet history
    wallet.transactionHistory.push({
      transactionId,
      type: 'credit',
      amount: validatedData.amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: validatedData.description || 'Wallet topup',
      referenceType: 'topup',
      referenceId: transactionId,
    });

    wallet.lastTransactionAt = new Date();
    wallet.lastTopupAt = new Date();
    await wallet.save();

    logger.info('Wallet topped up', {
      walletId,
      amount: validatedData.amount,
      transactionId,
    });

    res.json({
      success: true,
      data: {
        wallet,
        transaction,
      },
      message: 'Wallet topped up successfully',
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
    logger.error('Error topping up wallet', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Withdraw from Wallet
router.post('/:walletId/withdraw', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const validatedData = withdrawSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId });

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    if (wallet.status !== 'active') {
      res.status(400).json({
        success: false,
        error: `Cannot withdraw from wallet with status: ${wallet.status}`,
      });
      return;
    }

    // Check balance
    if (validatedData.amount > wallet.availableBalance) {
      res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        availableBalance: wallet.availableBalance,
      });
      return;
    }

    // Check limits
    if (validatedData.amount > wallet.perTransactionLimit) {
      res.status(400).json({
        success: false,
        error: 'Amount exceeds per-transaction limit',
        limit: wallet.perTransactionLimit,
      });
      return;
    }

    // Debit wallet
    const balanceBefore = wallet.balance;
    wallet.balance -= validatedData.amount;
    wallet.availableBalance -= validatedData.amount;
    wallet.dailySpent += validatedData.amount;
    wallet.monthlySpent += validatedData.amount;

    // Generate transaction
    const transactionId = Transaction.schema.statics.generateTransactionId(tenantId);

    const transaction = new Transaction({
      transactionId,
      tenantId,
      paymentId: '',
      customerId: wallet.customerId,
      type: 'withdrawal',
      status: 'pending', // Withdrawal needs processing
      amount: validatedData.amount,
      currency: wallet.currency,
      netAmount: validatedData.amount,
      paymentMethod: validatedData.paymentMethod || 'internal',
      balanceBefore,
      balanceAfter: wallet.balance,
      walletId: wallet.walletId,
      description: validatedData.description || 'Wallet withdrawal',
    });

    await transaction.save();

    // Add to wallet history
    wallet.transactionHistory.push({
      transactionId,
      type: 'debit',
      amount: validatedData.amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description: validatedData.description || 'Wallet withdrawal',
      referenceType: 'withdrawal',
      referenceId: transactionId,
    });

    wallet.lastTransactionAt = new Date();
    await wallet.save();

    logger.info('Wallet withdrawal initiated', {
      walletId,
      amount: validatedData.amount,
      transactionId,
    });

    res.json({
      success: true,
      data: {
        wallet,
        transaction,
      },
      message: 'Withdrawal initiated',
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
    logger.error('Error withdrawing from wallet', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Transfer between Wallets
router.post('/:walletId/transfer', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const validatedData = transferSchema.parse(req.body);
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const fromWallet = await Wallet.findOne({ walletId, tenantId });

    if (!fromWallet) {
      res.status(404).json({
        success: false,
        error: 'Source wallet not found',
      });
      return;
    }

    if (fromWallet.status !== 'active') {
      res.status(400).json({
        success: false,
        error: `Cannot transfer from wallet with status: ${fromWallet.status}`,
      });
      return;
    }

    const toWallet = await Wallet.findOne({
      walletId: validatedData.toWalletId,
      tenantId,
    });

    if (!toWallet) {
      res.status(404).json({
        success: false,
        error: 'Destination wallet not found',
      });
      return;
    }

    if (toWallet.status !== 'active') {
      res.status(400).json({
        success: false,
        error: 'Destination wallet is not active',
      });
      return;
    }

    // Check balance
    if (validatedData.amount > fromWallet.availableBalance) {
      res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        availableBalance: fromWallet.availableBalance,
      });
      return;
    }

    // Check limits
    if (validatedData.amount > fromWallet.perTransactionLimit) {
      res.status(400).json({
        success: false,
        error: 'Amount exceeds per-transaction limit',
        limit: fromWallet.perTransactionLimit,
      });
      return;
    }

    // Debit source wallet
    const fromBalanceBefore = fromWallet.balance;
    fromWallet.balance -= validatedData.amount;
    fromWallet.availableBalance -= validatedData.amount;

    // Credit destination wallet
    const toBalanceBefore = toWallet.balance;
    toWallet.balance += validatedData.amount;
    toWallet.availableBalance += validatedData.amount;

    // Generate transactions
    const debitTransactionId = Transaction.schema.statics.generateTransactionId(tenantId);
    const creditTransactionId = Transaction.schema.statics.generateTransactionId(tenantId);

    // Debit transaction
    const debitTransaction = new Transaction({
      transactionId: debitTransactionId,
      tenantId,
      paymentId: '',
      customerId: fromWallet.customerId,
      type: 'transfer',
      status: 'completed',
      amount: validatedData.amount,
      currency: fromWallet.currency,
      netAmount: validatedData.amount,
      paymentMethod: 'internal',
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromWallet.balance,
      walletId: fromWallet.walletId,
      relatedTransactionId: creditTransactionId,
      description: validatedData.description || `Transfer to ${toWallet.walletId}`,
      completedAt: new Date(),
    });

    // Credit transaction
    const creditTransaction = new Transaction({
      transactionId: creditTransactionId,
      tenantId,
      paymentId: '',
      customerId: toWallet.customerId,
      type: 'transfer',
      status: 'completed',
      amount: validatedData.amount,
      currency: toWallet.currency,
      netAmount: validatedData.amount,
      paymentMethod: 'internal',
      balanceBefore: toBalanceBefore,
      balanceAfter: toWallet.balance,
      walletId: toWallet.walletId,
      relatedTransactionId: debitTransactionId,
      description: validatedData.description || `Transfer from ${fromWallet.walletId}`,
      completedAt: new Date(),
    });

    await Promise.all([debitTransaction.save(), creditTransaction.save()]);

    // Update wallet histories
    fromWallet.transactionHistory.push({
      transactionId: debitTransactionId,
      type: 'debit',
      amount: validatedData.amount,
      balanceBefore: fromBalanceBefore,
      balanceAfter: fromWallet.balance,
      description: validatedData.description || `Transfer to ${toWallet.walletId}`,
      referenceType: 'transfer',
      referenceId: creditTransactionId,
    });

    toWallet.transactionHistory.push({
      transactionId: creditTransactionId,
      type: 'credit',
      amount: validatedData.amount,
      balanceBefore: toBalanceBefore,
      balanceAfter: toWallet.balance,
      description: validatedData.description || `Transfer from ${fromWallet.walletId}`,
      referenceType: 'transfer',
      referenceId: debitTransactionId,
    });

    fromWallet.lastTransactionAt = new Date();
    toWallet.lastTransactionAt = new Date();

    await Promise.all([fromWallet.save(), toWallet.save()]);

    logger.info('Wallet transfer completed', {
      fromWalletId: walletId,
      toWalletId: validatedData.toWalletId,
      amount: validatedData.amount,
    });

    res.json({
      success: true,
      data: {
        fromWallet,
        toWallet,
        debitTransaction,
        creditTransaction,
      },
      message: 'Transfer completed successfully',
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
    logger.error('Error transferring between wallets', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Wallet Transactions
router.get('/:walletId/transactions', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { type, status, fromDate, toDate, page = '1', limit = '50' } = req.query;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId });

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    const filter: Record<string, unknown> = { walletId, tenantId };

    if (type) filter.type = type;
    if (status) filter.status = status;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        (filter.createdAt as Record<string, Date>).$gte = new Date(fromDate as string);
      }
      if (toDate) {
        (filter.createdAt as Record<string, Date>).$lte = new Date(toDate as string);
      }
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const skip = (pageNum - 1) * limitNum;

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    logger.error('Error fetching wallet transactions', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Get Wallet Stats
router.get('/:walletId/stats', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId }).lean();

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    const stats = await Transaction.aggregate([
      { $match: { walletId, tenantId } },
      {
        $facet: {
          byType: [
            { $group: { _id: '$type', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalTransactions: { $sum: 1 },
                totalAmount: { $sum: '$amount' },
                credits: {
                  $sum: { $cond: [{ $eq: ['$type', 'deposit'] }, '$amount', 0] },
                },
                debits: {
                  $sum: { $cond: [{ $eq: ['$type', 'withdrawal'] }, '$amount', 0] },
                },
                transfers: {
                  $sum: { $cond: [{ $eq: ['$type', 'transfer'] }, '$amount', 0] },
                },
              },
            },
          ],
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        wallet: {
          walletId: wallet.walletId,
          balance: wallet.balance,
          availableBalance: wallet.availableBalance,
          currency: wallet.currency,
          status: wallet.status,
        },
        stats: stats[0],
      },
    });
  } catch (error) {
    logger.error('Error fetching wallet stats', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// Close Wallet
router.post('/:walletId/close', async (req: Request, res: Response) => {
  try {
    const { walletId } = req.params;
    const { reason } = req.body;
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const wallet = await Wallet.findOne({ walletId, tenantId });

    if (!wallet) {
      res.status(404).json({
        success: false,
        error: 'Wallet not found',
      });
      return;
    }

    if (wallet.balance > 0) {
      res.status(400).json({
        success: false,
        error: 'Cannot close wallet with remaining balance',
        balance: wallet.balance,
      });
      return;
    }

    wallet.status = 'closed';
    wallet.metadata = {
      ...wallet.metadata,
      closedAt: new Date().toISOString(),
      closeReason: reason,
    };

    await wallet.save();

    logger.info('Wallet closed', { walletId, reason });

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet closed successfully',
    });
  } catch (error) {
    logger.error('Error closing wallet', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
