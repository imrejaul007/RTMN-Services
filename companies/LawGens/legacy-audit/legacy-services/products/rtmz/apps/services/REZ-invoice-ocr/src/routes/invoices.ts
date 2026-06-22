import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceOCRModel, InvoiceOCRStatus } from '../models/InvoiceOCR';
import { ExtractedDataModel } from '../models/ExtractedData';
import { getTenantContext } from '../middleware/tenant';
import { Logger } from '../utils/logger';

const logger = new Logger('invoice-routes');
const router = Router();

/**
 * GET /invoices - List processed invoices
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const {
      status,
      fromDate,
      toDate,
      page = '1',
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    const filter: Record<string, unknown> = {
      tenantId: tenantContext.tenantId,
    };

    if (status) {
      filter.status = status;
    }

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) (filter.createdAt as Record<string, Date>).$gte = new Date(fromDate as string);
      if (toDate) (filter.createdAt as Record<string, Date>).$lte = new Date(toDate as string);
    }

    const sortOrderValue = sortOrder === 'asc' ? 1 : -1;
    const sortOptions: Record<string, 1 | -1> = {};
    sortOptions[sortBy as string] = sortOrderValue;

    const [invoices, total] = await Promise.all([
      InvoiceOCRModel.find(filter)
        .sort(sortOptions)
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('extractedDataId'),
      InvoiceOCRModel.countDocuments(filter),
    ]);

    logger.info('Invoices listed', {
      tenantId: tenantContext.tenantId,
      count: invoices.length,
      total,
      page: pageNum,
    });

    res.json({
      success: true,
      data: invoices.map((inv) => ({
        invoiceOcrId: inv.invoiceOcrId,
        status: inv.status,
        originalFileName: inv.originalFileName,
        fileType: inv.fileType,
        fileSize: inv.fileSize,
        extractedData: inv.extractedDataId,
        validationResult: inv.validationResult,
        duplicateOfId: inv.duplicateOfId,
        retryCount: inv.retryCount,
        processingTimeMs: inv.processingTimeMs,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
      })),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        hasMore: (pageNum - 1) * limitNum + invoices.length < total,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /invoices/:id - Get invoice details
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;

    const invoice = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    }).populate('extractedDataId');

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        invoiceOcrId: invoice.invoiceOcrId,
        status: invoice.status,
        originalFileName: invoice.originalFileName,
        fileType: invoice.fileType,
        fileSize: invoice.fileSize,
        mimeType: invoice.mimeType,
        filePath: invoice.filePath,
        extractedData: invoice.extractedDataId,
        validationResult: invoice.validationResult,
        duplicateOfId: invoice.duplicateOfId,
        duplicateConfidence: invoice.duplicateConfidence,
        retryCount: invoice.retryCount,
        lastError: invoice.lastError,
        processingTimeMs: invoice.processingTimeMs,
        claudeModelUsed: invoice.claudeModelUsed,
        metadata: invoice.metadata,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /invoices/:id/retry - Retry failed extraction
 */
router.post('/:id/retry', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;
    const maxRetries = 3;

    const invoice = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
      return;
    }

    // Check retry count
    if (invoice.retryCount >= maxRetries) {
      res.status(400).json({
        success: false,
        error: 'Maximum retry attempts reached',
        message: `Cannot retry. Maximum of ${maxRetries} retries allowed.`,
      });
      return;
    }

    // Only retry if extraction failed
    if (invoice.status !== InvoiceOCRStatus.EXTRACTION_FAILED &&
        invoice.status !== InvoiceOCRStatus.UPLOADED) {
      res.status(400).json({
        success: false,
        error: 'Cannot retry',
        message: 'Only invoices with failed extraction can be retried',
        currentStatus: invoice.status,
      });
      return;
    }

    // Reset status and increment retry count
    invoice.status = InvoiceOCRStatus.UPLOADED;
    invoice.retryCount += 1;
    invoice.lastError = undefined;
    await invoice.save();

    logger.info('Invoice retry initiated', {
      invoiceOcrId: id,
      retryCount: invoice.retryCount,
      tenantId: tenantContext.tenantId,
    });

    res.json({
      success: true,
      data: {
        invoiceOcrId: id,
        status: invoice.status,
        retryCount: invoice.retryCount,
        message: 'Retry initiated. Please call POST /extract to process the invoice.',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /invoices/:id/export - Export invoice in various formats
 */
router.get('/:id/export', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;
    const { format = 'json' } = req.query;

    const invoice = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    }).populate('extractedDataId');

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
      return;
    }

    const extractedData = invoice.extractedDataId as unknown as Record<string, unknown>;

    if (!extractedData) {
      res.status(400).json({
        success: false,
        error: 'No extracted data available',
        message: 'Please extract the invoice first',
      });
      return;
    }

    const exportData = {
      ...extractedData,
      invoiceOcrId: invoice.invoiceOcrId,
      originalFileName: invoice.originalFileName,
      exportedAt: new Date().toISOString(),
      tenantId: tenantContext.tenantId,
    };

    switch (format) {
      case 'csv':
        const csv = convertToCSV(exportData);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${id}.csv"`);
        res.send(csv);
        break;

      case 'json':
      default:
        res.json({
          success: true,
          data: exportData,
        });
        break;
    }

    logger.info('Invoice exported', {
      invoiceOcrId: id,
      format,
      tenantId: tenantContext.tenantId,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /invoices/:id - Delete invoice
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;

    const invoice = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    });

    if (!invoice) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
      return;
    }

    // Delete extracted data if exists
    if (invoice.extractedDataId) {
      await ExtractedDataModel.findByIdAndDelete(invoice.extractedDataId);
    }

    // Delete invoice record
    await InvoiceOCRModel.deleteOne({ invoiceOcrId: id });

    logger.info('Invoice deleted', {
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    });

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /invoices/stats - Get invoice statistics
 */
router.get('/stats/summary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);

    const [
      totalCount,
      uploadedCount,
      processingCount,
      extractedCount,
      validatedCount,
      failedCount,
      duplicateCount,
    ] = await Promise.all([
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId }),
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId, status: InvoiceOCRStatus.UPLOADED }),
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId, status: InvoiceOCRStatus.PROCESSING }),
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId, status: InvoiceOCRStatus.EXTRACTED }),
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId, status: InvoiceOCRStatus.VALIDATED }),
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId, status: InvoiceOCRStatus.EXTRACTION_FAILED }),
      InvoiceOCRModel.countDocuments({ tenantId: tenantContext.tenantId, status: InvoiceOCRStatus.DUPLICATE }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalCount,
        byStatus: {
          uploaded: uploadedCount,
          processing: processingCount,
          extracted: extractedCount,
          validated: validatedCount,
          failed: failedCount,
          duplicate: duplicateCount,
        },
        validationRate: extractedCount > 0
          ? ((validatedCount / extractedCount) * 100).toFixed(2) + '%'
          : '0%',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Helper function to convert JSON to CSV
 */
function convertToCSV(data: Record<string, unknown>): string {
  const flatData: Record<string, string> = {};

  // Flatten nested objects
  const flatten = (obj: Record<string, unknown>, prefix: string = ''): void => {
    for (const key in obj) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, newKey);
      } else if (Array.isArray(value)) {
        flatData[newKey] = JSON.stringify(value);
      } else {
        flatData[newKey] = String(value ?? '');
      }
    }
  };

  flatten(data);

  const headers = Object.keys(flatData);
  const rows = headers.map((header) => {
    let value = flatData[header];
    // Escape quotes and wrap in quotes if contains comma
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      value = `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  });

  return `${headers.join(',')}\n${rows.join(',')}`;
}

export { router as invoiceRoutes };
