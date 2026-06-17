import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// In-memory ledger (replace with database in production)
interface LedgerEntry {
  id: string;
  corpid: string;
  type: 'credit' | 'debit' | 'fee' | 'refund' | 'adjustment';
  amount: number;
  currency: string;
  balance: number;
  description: string;
  reference?: {
    type: 'payment' | 'wallet' | 'transfer' | 'fee' | 'refund';
    id: string;
  };
  metadata?: Record<string, any>;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  createdAt: Date;
  completedAt?: Date;
}

const ledger: Map<string, LedgerEntry[]> = new Map();
const balanceByCorpId: Map<string, number> = new Map();

/**
 * POST /api/ledger/entry
 * Create ledger entry
 */
router.post('/entry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, type, amount, currency, description, reference, metadata } = req.body;

    if (!corpid || !type || !amount) {
      return res.status(400).json({ error: 'corpid, type, and amount are required' });
    }

    if (!['credit', 'debit', 'fee', 'refund', 'adjustment'].includes(type)) {
      return res.status(400).json({ error: 'Invalid transaction type' });
    }

    // Get current balance
    let currentBalance = balanceByCorpId.get(corpid) || 0;

    // Calculate new balance based on transaction type
    let newBalance = currentBalance;
    if (['credit', 'refund'].includes(type)) {
      newBalance += amount;
    } else if (['debit', 'fee'].includes(type)) {
      if (currentBalance < amount) {
        return res.status(400).json({ error: 'Insufficient balance for debit' });
      }
      newBalance -= amount;
    } else if (type === 'adjustment') {
      newBalance = amount; // Adjustment sets absolute balance
    }

    const entry: LedgerEntry = {
      id: uuidv4(),
      corpid,
      type,
      amount,
      currency: currency || 'INR',
      balance: newBalance,
      description,
      reference,
      metadata,
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    };

    // Store entry
    const entries = ledger.get(corpid) || [];
    entries.push(entry);
    ledger.set(corpid, entries);

    // Update balance
    balanceByCorpId.set(corpid, newBalance);

    res.status(201).json({
      success: true,
      data: entry,
      message: 'Ledger entry created'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ledger/:corpid
 * Get ledger entries for corpid
 */
router.get('/:corpid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid } = req.params;
    const { limit = 50, offset = 0, type, startDate, endDate } = req.query;

    let entries = ledger.get(corpid) || [];

    // Apply filters
    if (type) {
      entries = entries.filter(e => e.type === type);
    }

    if (startDate) {
      const start = new Date(startDate as string);
      entries = entries.filter(e => e.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      entries = entries.filter(e => e.createdAt <= end);
    }

    // Sort by date descending
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const paginatedEntries = entries.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: paginatedEntries,
      balance: balanceByCorpId.get(corpid) || 0,
      pagination: {
        total: entries.length,
        limit: Number(limit),
        offset: Number(offset)
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ledger/:corpid/balance
 * Get current balance for corpid
 */
router.get('/:corpid/balance', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid } = req.params;

    const balance = balanceByCorpId.get(corpid) || 0;
    const entries = ledger.get(corpid) || [];

    // Calculate totals
    const totals = {
      credits: entries.filter(e => e.type === 'credit' && e.status === 'completed')
        .reduce((sum, e) => sum + e.amount, 0),
      debits: entries.filter(e => e.type === 'debit' && e.status === 'completed')
        .reduce((sum, e) => sum + e.amount, 0),
      refunds: entries.filter(e => e.type === 'refund' && e.status === 'completed')
        .reduce((sum, e) => sum + e.amount, 0),
      fees: entries.filter(e => e.type === 'fee' && e.status === 'completed')
        .reduce((sum, e) => sum + e.amount, 0)
    };

    res.json({
      success: true,
      data: {
        corpid,
        balance,
        totals,
        currency: 'INR',
        lastUpdated: entries.length > 0 ? entries[entries.length - 1].createdAt : null
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ledger/:corpid/entry/:entryId
 * Get specific ledger entry
 */
router.get('/:corpid/entry/:entryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, entryId } = req.params;

    const entries = ledger.get(corpid) || [];
    const entry = entries.find(e => e.id === entryId);

    if (!entry) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ledger/:corpid/reverse/:entryId
 * Reverse a ledger entry
 */
router.post('/:corpid/reverse/:entryId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, entryId } = req.params;
    const { reason } = req.body;

    const entries = ledger.get(corpid) || [];
    const entryIndex = entries.findIndex(e => e.id === entryId);

    if (entryIndex === -1) {
      return res.status(404).json({ error: 'Ledger entry not found' });
    }

    const originalEntry = entries[entryIndex];

    if (originalEntry.status === 'reversed') {
      return res.status(400).json({ error: 'Entry already reversed' });
    }

    // Mark original as reversed
    originalEntry.status = 'reversed';
    entries[entryIndex] = originalEntry;

    // Create reversal entry
    const reversalType = originalEntry.type === 'credit' ? 'debit' :
                          originalEntry.type === 'debit' ? 'credit' : 'adjustment';

    const currentBalance = balanceByCorpId.get(corpid) || 0;
    let newBalance = currentBalance;

    if (reversalType === 'credit') {
      newBalance += originalEntry.amount;
    } else if (reversalType === 'debit') {
      newBalance -= originalEntry.amount;
    }

    const reversalEntry: LedgerEntry = {
      id: uuidv4(),
      corpid,
      type: reversalType,
      amount: originalEntry.amount,
      currency: originalEntry.currency,
      balance: newBalance,
      description: `Reversal of ${entryId}: ${reason || 'No reason provided'}`,
      reference: {
        type: 'refund',
        id: entryId
      },
      metadata: {
        reversedEntryId: entryId,
        originalType: originalEntry.type
      },
      status: 'completed',
      createdAt: new Date(),
      completedAt: new Date()
    };

    entries.push(reversalEntry);
    ledger.set(corpid, entries);
    balanceByCorpId.set(corpid, newBalance);

    res.json({
      success: true,
      data: {
        originalEntry,
        reversalEntry
      },
      message: 'Entry reversed successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ledger/reconcile
 * Reconcile ledger entries
 */
router.post('/reconcile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid, startDate, endDate } = req.body;

    if (!corpid) {
      return res.status(400).json({ error: 'corpid is required' });
    }

    const entries = ledger.get(corpid) || [];

    let filteredEntries = entries;

    if (startDate) {
      const start = new Date(startDate);
      filteredEntries = filteredEntries.filter(e => e.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      filteredEntries = filteredEntries.filter(e => e.createdAt <= end);
    }

    // Calculate reconciliation
    const reconciliation = {
      totalCredits: filteredEntries.filter(e => e.type === 'credit' && e.status !== 'failed')
        .reduce((sum, e) => sum + e.amount, 0),
      totalDebits: filteredEntries.filter(e => e.type === 'debit' && e.status !== 'failed')
        .reduce((sum, e) => sum + e.amount, 0),
      totalRefunds: filteredEntries.filter(e => e.type === 'refund' && e.status !== 'failed')
        .reduce((sum, e) => sum + e.amount, 0),
      totalFees: filteredEntries.filter(e => e.type === 'fee' && e.status !== 'failed')
        .reduce((sum, e) => sum + e.amount, 0),
      netChange: 0,
      failedTransactions: filteredEntries.filter(e => e.status === 'failed').length,
      reversedEntries: filteredEntries.filter(e => e.status === 'reversed').length,
      entriesCount: filteredEntries.length
    };

    reconciliation.netChange = reconciliation.totalCredits +
      reconciliation.totalRefunds - reconciliation.totalDebits - reconciliation.totalFees;

    res.json({
      success: true,
      data: {
        corpid,
        period: { startDate, endDate },
        ...reconciliation,
        currentBalance: balanceByCorpId.get(corpid) || 0
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ledger/export/:corpid
 * Export ledger entries
 */
router.get('/export/:corpid', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { corpid } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    let entries = ledger.get(corpid) || [];

    // Apply date filters
    if (startDate) {
      const start = new Date(startDate as string);
      entries = entries.filter(e => e.createdAt >= start);
    }

    if (endDate) {
      const end = new Date(endDate as string);
      entries = entries.filter(e => e.createdAt <= end);
    }

    // Sort by date ascending for export
    entries.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (format === 'csv') {
      const csvHeader = 'id,corpid,type,amount,currency,balance,description,status,createdAt,completedAt\n';
      const csvRows = entries.map(e =>
        `${e.id},${e.corpid},${e.type},${e.amount},${e.currency},${e.balance},"${e.description}",${e.status},${e.createdAt.toISOString()},${e.completedAt?.toISOString() || ''}`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=ledger-${corpid}-${Date.now()}.csv`);
      res.send(csvHeader + csvRows);
    } else {
      res.json({
        success: true,
        data: {
          corpid,
          exportedAt: new Date(),
          count: entries.length,
          entries
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
