import { Router, Request, Response, NextFunction } from 'express';
import { intercompanyLedgerService, CreateEntryInput, EntryFilter } from '../services/intercompany-ledger.service';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

// Request validation helper
const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors: string[] = [];

  if (!req.body.fromCorpId) errors.push('fromCorpId is required');
  if (!req.body.toCorpId) errors.push('toCorpId is required');
  if (!req.body.type) errors.push('type is required');
  if (!req.body.amount || req.body.amount <= 0) errors.push('amount must be greater than 0');
  if (!req.body.description) errors.push('description is required');

  if (errors.length > 0) {
    res.status(400).json({ success: false, errors });
    return;
  }

  // Validate companies
  if (!config.supportedCompanies.includes(req.body.fromCorpId)) {
    res.status(400).json({
      success: false,
      error: `Invalid fromCorpId: ${req.body.fromCorpId}. Must be one of: ${config.supportedCompanies.join(', ')}`,
    });
    return;
  }

  if (!config.supportedCompanies.includes(req.body.toCorpId)) {
    res.status(400).json({
      success: false,
      error: `Invalid toCorpId: ${req.body.toCorpId}. Must be one of: ${config.supportedCompanies.join(', ')}`,
    });
    return;
  }

  // Validate transaction types
  if (!config.transactionTypes.includes(req.body.type)) {
    res.status(400).json({
      success: false,
      error: `Invalid type: ${req.body.type}. Must be one of: ${config.transactionTypes.join(', ')}`,
    });
    return;
  }

  next();
};

/**
 * POST /entries
 * Create a new ledger entry
 */
router.post('/entries', validateRequest, async (req: Request, res: Response) => {
  try {
    const input: CreateEntryInput = {
      fromCorpId: req.body.fromCorpId,
      toCorpId: req.body.toCorpId,
      type: req.body.type,
      amount: req.body.amount,
      currency: req.body.currency || 'INR',
      description: req.body.description,
      metadata: req.body.metadata,
    };

    const entry = await intercompanyLedgerService.createEntry(input);

    logger.info('Entry created via API', { entryId: entry.entryId });

    res.status(201).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('Failed to create entry', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /entries/:corpId
 * Get all entries for a specific company
 */
router.get('/entries/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const filter: EntryFilter = {
      type: req.query.type as EntryFilter['type'],
      status: req.query.status as EntryFilter['status'],
    };

    if (req.query.startDate) {
      filter.startDate = new Date(req.query.startDate as string);
    }
    if (req.query.endDate) {
      filter.endDate = new Date(req.query.endDate as string);
    }

    const entries = await intercompanyLedgerService.getEntries(corpId, filter);

    res.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('Failed to get entries', { corpId: req.params.corpId, error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /entries/between/:fromCorpId/:toCorpId
 * Get entries between two companies
 */
router.get('/entries/between/:fromCorpId/:toCorpId', async (req: Request, res: Response) => {
  try {
    const { fromCorpId, toCorpId } = req.params;
    const entries = await intercompanyLedgerService.getEntriesBetween(fromCorpId, toCorpId);

    res.json({
      success: true,
      data: entries,
      count: entries.length,
    });
  } catch (error) {
    logger.error('Failed to get entries between companies', {
      fromCorpId: req.params.fromCorpId,
      toCorpId: req.params.toCorpId,
      error,
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /balance/:corpId
 * Get balance for a specific company
 */
router.get('/balance/:corpId', async (req: Request, res: Response) => {
  try {
    const { corpId } = req.params;
    const balance = await intercompanyLedgerService.getBalance(corpId);

    res.json({
      success: true,
      data: balance,
    });
  } catch (error) {
    logger.error('Failed to get balance', { corpId: req.params.corpId, error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /balances
 * Get all company balances
 */
router.get('/balances', async (_req: Request, res: Response) => {
  try {
    const balances = await intercompanyLedgerService.getAllBalances();

    res.json({
      success: true,
      data: balances,
      count: balances.length,
    });
  } catch (error) {
    logger.error('Failed to get all balances', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /reconciliation
 * Run reconciliation for all pending entries
 */
router.post('/reconciliation', async (_req: Request, res: Response) => {
  try {
    const result = await intercompanyLedgerService.runReconciliation();

    logger.info('Reconciliation triggered via API', {
      totalEntries: result.totalEntries,
      reconciledEntries: result.reconciledEntries,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Failed to run reconciliation', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /settlement/:fromCorpId/:toCorpId
 * Get settlement summary between two companies
 */
router.get('/settlement/:fromCorpId/:toCorpId', async (req: Request, res: Response) => {
  try {
    const { fromCorpId, toCorpId } = req.params;
    const summary = await intercompanyLedgerService.getSettlementSummary(fromCorpId, toCorpId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Failed to get settlement summary', {
      fromCorpId,
      toCorpId,
      error,
    });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /stats
 * Get network-wide statistics
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await intercompanyLedgerService.getNetworkStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get network stats', { error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /entries/:entryId/cancel
 * Cancel a pending entry
 */
router.post('/entries/:entryId/cancel', async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const entry = await intercompanyLedgerService.cancelEntry(entryId);

    if (!entry) {
      res.status(404).json({
        success: false,
        error: 'Entry not found',
      });
      return;
    }

    res.json({
      success: true,
      data: entry,
    });
  } catch (error) {
    logger.error('Failed to cancel entry', { entryId: req.params.entryId, error });
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * GET /companies
 * Get list of supported companies
 */
router.get('/companies', (__req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      companies: config.supportedCompanies,
      transactionTypes: config.transactionTypes,
    },
  });
});

export default router;
