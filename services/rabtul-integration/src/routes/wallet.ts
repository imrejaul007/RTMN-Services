import { Router, Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { RABTULWalletProfile, createRABTULWalletProfile } from '../models/RABTULProfile';

const router = Router();

// In-memory store for demo (replace with database in production)
const wallets = new Map<string, RABTULWalletProfile>();
const transactions: Array<{
  id: string;
  walletId: string;
  type: 'credit' | 'debit';
  amount: number;
  balance: number;
  description?: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}> =([]);

// RABTUL Wallet Service URL
const RABTUL_WALLET_URL = process.env.RABTUL_WALLET_URL || 'http://localhost:4004';

/**
 * POST /api/wallet/create
 * Create a new wallet
 */
router.post('/create', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, currency, walletType, dailyLimit, monthlyLimit } = req.body;

    if (!corpid) {
      return res.status(400).json({ error: 'corpid is required' });
    }

    const wallet = createRABTULWalletProfile({
      corpid,
      currency: currency || 'INR',
      walletType: walletType || 'personal',
      dailyLimit,
      monthlyLimit,
      status: 'active'
    });

    // Sync to Payment Twin
    try {
      await axios.post(`${process.env.PAYMENT_TWIN_URL || 'http://localhost:3018'}/api/wallet`, {
        id: wallet.id,
        corpid: wallet.corpid,
        balance: wallet.balance,
        currency: wallet.currency,
        type: wallet.walletType,
        status: wallet.status,
        source: 'rabtul-wallet'
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync wallet to Payment Twin', { error: err });
    }

    wallets.set(wallet.id, wallet);

    res.status(201).json({
      success: true,
      data: wallet,
      message: 'Wallet created successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wallet/:id
 * Get wallet details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const wallet = wallets.get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wallet/corpid/:corpid
 * Get all wallets for a corpid
 */
router.get('/corpid/:corpid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid } = req.params;

    const userWallets = Array.from(wallets.values()).filter(w => w.corpid === corpid);

    res.json({
      success: true,
      data: userWallets
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wallet/:id/deposit
 * Deposit funds to wallet
 */
router.post('/:id/deposit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, description, source } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const wallet = wallets.get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    const transaction = {
      id: uuidv4(),
      walletId: id,
      type: 'credit' as const,
      amount,
      balance: wallet.balance + amount,
      description: description || `Deposit from ${source || 'external'}`,
      status: 'completed' as const,
      createdAt: new Date()
    };

    transactions.push(transaction);

    wallet.balance += amount;
    wallet.updatedAt = new Date();
    wallets.set(id, wallet);

    // Sync to Payment Twin
    try {
      await axios.post(`${process.env.PAYMENT_TWIN_URL || 'http://localhost:3018'}/api/transaction`, {
        type: 'credit',
        walletId: wallet.id,
        corpid: wallet.corpid,
        amount,
        balance: wallet.balance,
        referenceId: transaction.id,
        source: 'rabtul-wallet'
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync deposit to Payment Twin', { error: err });
    }

    res.json({
      success: true,
      data: {
        wallet,
        transaction
      },
      message: 'Deposit successful'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wallet/:id/withdraw
 * Withdraw funds from wallet
 */
router.post('/:id/withdraw', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, description, destination } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const wallet = wallets.get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.status !== 'active') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const transaction = {
      id: uuidv4(),
      walletId: id,
      type: 'debit' as const,
      amount,
      balance: wallet.balance - amount,
      description: description || `Withdrawal to ${destination || 'external'}`,
      status: 'completed' as const,
      createdAt: new Date()
    };

    transactions.push(transaction);

    wallet.balance -= amount;
    wallet.updatedAt = new Date();
    wallets.set(id, wallet);

    // Sync to Payment Twin
    try {
      await axios.post(`${process.env.PAYMENT_TWIN_URL || 'http://localhost:3018'}/api/transaction`, {
        type: 'debit',
        walletId: wallet.id,
        corpid: wallet.corpid,
        amount,
        balance: wallet.balance,
        referenceId: transaction.id,
        source: 'rabtul-wallet'
      }, {
        headers: { 'X-Request-ID': req.headers['x-request-id'] }
      });
    } catch (err) {
      req.app.locals.logger?.warn('Failed to sync withdrawal to Payment Twin', { error: err });
    }

    res.json({
      success: true,
      data: {
        wallet,
        transaction
      },
      message: 'Withdrawal successful'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/wallet/:id/transfer
 * Transfer funds between wallets
 */
router.post('/:id/transfer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { toWalletId, amount, description } = req.body;

    if (!toWalletId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'toWalletId and valid amount are required' });
    }

    const fromWallet = wallets.get(id);
    const toWallet = wallets.get(toWalletId);

    if (!fromWallet) {
      return res.status(404).json({ error: 'Source wallet not found' });
    }

    if (!toWallet) {
      return res.status(404).json({ error: 'Destination wallet not found' });
    }

    if (fromWallet.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const transferId = uuidv4();

    // Debit from source
    fromWallet.balance -= amount;
    fromWallet.updatedAt = new Date();
    wallets.set(id, fromWallet);

    // Credit to destination
    toWallet.balance += amount;
    toWallet.updatedAt = new Date();
    wallets.set(toWalletId, toWallet);

    const debitTx = {
      id: uuidv4(),
      walletId: id,
      type: 'debit' as const,
      amount,
      balance: fromWallet.balance,
      description: description || `Transfer to ${toWalletId}`,
      status: 'completed' as const,
      createdAt: new Date()
    };

    const creditTx = {
      id: uuidv4(),
      walletId: toWalletId,
      type: 'credit' as const,
      amount,
      balance: toWallet.balance,
      description: description || `Transfer from ${id}`,
      status: 'completed' as const,
      createdAt: new Date()
    };

    transactions.push(debitTx, creditTx);

    res.json({
      success: true,
      data: {
        transferId,
        fromWallet,
        toWallet,
        debitTransaction: debitTx,
        creditTransaction: creditTx
      },
      message: 'Transfer successful'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/wallet/:id/transactions
 * Get wallet transaction history
 */
router.get('/:id/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const wallet = wallets.get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const walletTransactions = transactions
      .filter(t => t.walletId === id)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: walletTransactions,
      pagination: {
        total: transactions.filter(t => t.walletId === id).length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/wallet/:id/freeze
 * Freeze wallet
 */
router.put('/:id/freeze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const wallet = wallets.get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    wallet.status = 'frozen';
    wallet.updatedAt = new Date();
    wallets.set(id, wallet);

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet frozen successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/wallet/:id/unfreeze
 * Unfreeze wallet
 */
router.put('/:id/unfreeze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const wallet = wallets.get(id);

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    wallet.status = 'active';
    wallet.updatedAt = new Date();
    wallets.set(id, wallet);

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet unfrozen successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
