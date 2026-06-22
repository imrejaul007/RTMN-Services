import { Router, Request, Response, NextFunction } from 'express';
import { billingService, InvoiceInput, ReconciliationInput } from '../services/billing.service';
import { logger } from '../utils/logger';
import config from '../config';

const router = Router();

// Request type definitions
interface GenerateInvoiceRequest {
  body: InvoiceInput;
}

interface PayInvoiceRequest {
  params: {
    invoiceId: string;
  };
}

interface ListInvoicesRequest {
  query: {
    corpId: string;
    status?: string;
    limit?: string;
    offset?: string;
  };
}

interface RunSettlementRequest {
  body: {
    startDate: string;
    endDate: string;
    month: string;
  };
}

interface ListSettlementsRequest {
  query: {
    period?: string;
    status?: string;
    limit?: string;
    offset?: string;
  };
}

interface RunReconciliationRequest {
  body: ReconciliationInput;
}

// Middleware for internal service authentication
const internalAuth = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers[config.security.apiKeyHeader.toLowerCase()] as string;
  const internalToken = req.headers['x-internal-token'] as string;

  if (apiKey === config.security.internalToken || internalToken === config.security.internalToken) {
    next();
    return;
  }

  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'Invalid or missing authentication token',
  });
};

/**
 * POST /invoices - Generate a new invoice
 */
router.post('/invoices', internalAuth, async (req: Request<{}, {}, GenerateInvoiceRequest['body']>, res: Response): Promise<void> => {
  try {
    const input: InvoiceInput = {
      fromCorpId: req.body.fromCorpId,
      toCorpId: req.body.toCorpId,
      amount: req.body.amount,
      currency: req.body.currency,
      description: req.body.description,
      dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      lineItems: req.body.lineItems,
      metadata: req.body.metadata,
    };

    // Validate required fields
    if (!input.fromCorpId || !input.toCorpId || !input.amount) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Missing required fields: fromCorpId, toCorpId, amount',
      });
      return;
    }

    // Validate amount
    if (input.amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Amount must be greater than 0',
      });
      return;
    }

    const invoice = await billingService.generateInvoice(input);

    logger.info(`Invoice created via API: ${invoice.invoiceId}`);

    res.status(201).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error generating invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to generate invoice',
    });
  }
});

/**
 * GET /invoices - List invoices for a company
 */
router.get('/invoices', internalAuth, async (req: Request<{}, {}, {}, ListInvoicesRequest['query']>, res: Response): Promise<void> => {
  try {
    const { corpId, status, limit, offset } = req.query;

    if (!corpId) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Missing required query parameter: corpId',
      });
      return;
    }

    const result = await billingService.getInvoices(corpId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.invoices,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 100,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    });
  } catch (error) {
    logger.error('Error listing invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to list invoices',
    });
  }
});

/**
 * GET /invoices/:invoiceId - Get single invoice
 */
router.get('/invoices/:invoiceId', internalAuth, async (req: Request<{ invoiceId: string }>, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const invoice = await billingService.getInvoice(invoiceId);

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Invoice not found: ${invoiceId}`,
      });
      return;
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    logger.error('Error getting invoice:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get invoice',
    });
  }
});

/**
 * POST /invoices/:invoiceId/pay - Pay an invoice
 */
router.post('/invoices/:invoiceId/pay', internalAuth, async (req: Request<PayInvoiceRequest['params']>, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const invoice = await billingService.payInvoice(invoiceId);

    logger.info(`Invoice paid via API: ${invoiceId}`);

    res.json({
      success: true,
      data: invoice,
      message: `Invoice ${invoiceId} has been paid successfully`,
    });
  } catch (error) {
    logger.error(`Error paying invoice ${req.params.invoiceId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to pay invoice';

    if (errorMessage.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: errorMessage,
      });
      return;
    }

    if (errorMessage.includes('already paid') || errorMessage.includes('cancelled')) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: errorMessage,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: errorMessage,
    });
  }
});

/**
 * POST /invoices/:invoiceId/cancel - Cancel an invoice
 */
router.post('/invoices/:invoiceId/cancel', internalAuth, async (req: Request<PayInvoiceRequest['params']>, res: Response): Promise<void> => {
  try {
    const { invoiceId } = req.params;
    const invoice = await billingService.cancelInvoice(invoiceId);

    logger.info(`Invoice cancelled via API: ${invoiceId}`);

    res.json({
      success: true,
      data: invoice,
      message: `Invoice ${invoiceId} has been cancelled`,
    });
  } catch (error) {
    logger.error(`Error cancelling invoice ${req.params.invoiceId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Failed to cancel invoice';

    if (errorMessage.includes('not found')) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: errorMessage,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: errorMessage,
    });
  }
});

/**
 * POST /settlements/run - Run settlement for a period
 */
router.post('/settlements/run', internalAuth, async (req: Request<{}, {}, RunSettlementRequest['body']>, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, month } = req.body;

    if (!startDate || !endDate || !month) {
      res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Missing required fields: startDate, endDate, month',
      });
      return;
    }

    const settlement = await billingService.runSettlement({
      period: {
        start: new Date(startDate),
        end: new Date(endDate),
        month,
      },
    });

    logger.info(`Settlement run via API: ${settlement.settlementId}`);

    res.json({
      success: true,
      data: settlement,
      message: `Settlement ${settlement.settlementId} completed`,
    });
  } catch (error) {
    logger.error('Error running settlement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to run settlement',
    });
  }
});

/**
 * GET /settlements - Get settlements
 */
router.get('/settlements', internalAuth, async (req: Request<{}, {}, {}, ListSettlementsRequest['query']>, res: Response): Promise<void> => {
  try {
    const { period, status, limit, offset } = req.query;

    const result = await billingService.getSettlements({
      period,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.settlements,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    });
  } catch (error) {
    logger.error('Error listing settlements:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to list settlements',
    });
  }
});

/**
 * GET /settlements/:settlementId - Get single settlement
 */
router.get('/settlements/:settlementId', internalAuth, async (req: Request<{ settlementId: string }>, res: Response): Promise<void> => {
  try {
    const { settlementId } = req.params;
    const settlement = await billingService.getSettlement(settlementId);

    if (!settlement) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Settlement not found: ${settlementId}`,
      });
      return;
    }

    res.json({
      success: true,
      data: settlement,
    });
  } catch (error) {
    logger.error('Error getting settlement:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get settlement',
    });
  }
});

/**
 * POST /reconciliation - Run reconciliation
 */
router.post('/reconciliation', internalAuth, async (req: Request<{}, {}, RunReconciliationRequest['body']>, res: Response): Promise<void> => {
  try {
    const reconciliation = await billingService.reconcile(req.body);

    logger.info(`Reconciliation run via API: ${reconciliation.reconciliationId}`);

    res.json({
      success: true,
      data: reconciliation,
      message: `Reconciliation ${reconciliation.reconciliationId} completed`,
    });
  } catch (error) {
    logger.error('Error running reconciliation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to run reconciliation',
    });
  }
});

/**
 * GET /reconciliation/:reconciliationId - Get reconciliation
 */
router.get('/reconciliation/:reconciliationId', internalAuth, async (req: Request<{ reconciliationId: string }>, res: Response): Promise<void> => {
  try {
    const { reconciliationId } = req.params;
    const reconciliation = await billingService.getReconciliation(reconciliationId);

    if (!reconciliation) {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: `Reconciliation not found: ${reconciliationId}`,
      });
      return;
    }

    res.json({
      success: true,
      data: reconciliation,
    });
  } catch (error) {
    logger.error('Error getting reconciliation:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get reconciliation',
    });
  }
});

/**
 * GET /summary/:corpId - Get billing summary for a company
 */
router.get('/summary/:corpId', internalAuth, async (req: Request<{ corpId: string }>, res: Response): Promise<void> => {
  try {
    const { corpId } = req.params;
    const summary = await billingService.getBillingSummary(corpId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error(`Error getting billing summary for ${req.params.corpId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get billing summary',
    });
  }
});

/**
 * GET /overdue - Get overdue invoices
 */
router.get('/overdue', internalAuth, async (_req: Request, res: Response): Promise<void> => {
  try {
    // Mark overdue invoices first
    await billingService.markOverdueInvoices();

    const overdueInvoices = await billingService.getOverdueInvoices();

    res.json({
      success: true,
      data: overdueInvoices,
      count: overdueInvoices.length,
    });
  } catch (error) {
    logger.error('Error getting overdue invoices:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Failed to get overdue invoices',
    });
  }
});

/**
 * GET /companies - List all registered companies
 */
router.get('/companies', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: config.companies.registry,
    count: config.companies.registry.length,
  });
});

export default router;