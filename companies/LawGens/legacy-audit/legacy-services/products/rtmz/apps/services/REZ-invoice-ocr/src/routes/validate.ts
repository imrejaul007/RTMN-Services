import { Router, Request, Response, NextFunction } from 'express';
import { InvoiceOCRModel, InvoiceOCRStatus, ValidationResult } from '../models/InvoiceOCR';
import { ExtractedDataModel, ExtractedData } from '../models/ExtractedData';
import { validatorService } from '../services/validator';
import { duplicateDetectorService } from '../services/duplicateDetector';
import { Logger } from '../utils/logger';
import { getTenantContext } from '../middleware/tenant';

const logger = new Logger('validate-routes');
const router = Router();

/**
 * POST /validate/:id - Validate extracted invoice data
 */
router.post('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;

    // Find invoice OCR record
    const invoiceOCR = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    });

    if (!invoiceOCR) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
        message: `No invoice found with ID: ${id}`,
      });
      return;
    }

    // Check if invoice has been extracted
    if (!invoiceOCR.extractedDataId) {
      res.status(400).json({
        success: false,
        error: 'Invoice not extracted',
        message: 'Please extract the invoice first using POST /extract',
      });
      return;
    }

    // Get extracted data
    const extractedData = await ExtractedDataModel.findById(invoiceOCR.extractedDataId);

    if (!extractedData) {
      res.status(404).json({
        success: false,
        error: 'Extracted data not found',
      });
      return;
    }

    // Validate the data
    const validationResult = validatorService.validate(extractedData.toObject() as ExtractedData);

    // Update invoice with validation result
    invoiceOCR.validationResult = validationResult;

    if (validationResult.isValid) {
      invoiceOCR.status = InvoiceOCRStatus.VALIDATED;
    } else {
      invoiceOCR.status = InvoiceOCRStatus.VALIDATION_FAILED;
    }

    await invoiceOCR.save();

    logger.info('Invoice validation completed', {
      invoiceOcrId: id,
      isValid: validationResult.isValid,
      errorCount: validationResult.errors.length,
      warningCount: validationResult.warnings.length,
    });

    res.json({
      success: true,
      data: {
        invoiceOcrId: id,
        status: invoiceOCR.status,
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        message: validationResult.isValid
          ? 'Invoice data is valid'
          : 'Invoice data has validation errors',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /validate/:id - Get validation result for an invoice
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;

    const invoiceOCR = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    });

    if (!invoiceOCR) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
      return;
    }

    if (!invoiceOCR.validationResult) {
      res.status(404).json({
        success: false,
        error: 'Validation not yet performed',
        message: 'Please run POST /validate/:id first',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        invoiceOcrId: id,
        status: invoiceOCR.status,
        isValid: invoiceOCR.validationResult.isValid,
        errors: invoiceOCR.validationResult.errors,
        warnings: invoiceOCR.validationResult.warnings,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /validate/:id/revalidate - Re-validate after corrections
 */
router.post('/:id/revalidate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { id } = req.params;
    const { correctedData } = req.body;

    const invoiceOCR = await InvoiceOCRModel.findOne({
      invoiceOcrId: id,
      tenantId: tenantContext.tenantId,
    });

    if (!invoiceOCR) {
      res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
      return;
    }

    if (!invoiceOCR.extractedDataId) {
      res.status(400).json({
        success: false,
        error: 'Invoice not extracted',
      });
      return;
    }

    let extractedData = await ExtractedDataModel.findById(invoiceOCR.extractedDataId);

    // If corrected data provided, update the extracted data
    if (correctedData) {
      await ExtractedDataModel.findByIdAndUpdate(invoiceOCR.extractedDataId, correctedData);
      extractedData = await ExtractedDataModel.findById(invoiceOCR.extractedDataId);
    }

    if (!extractedData) {
      res.status(404).json({
        success: false,
        error: 'Extracted data not found',
      });
      return;
    }

    // Validate
    const validationResult = validatorService.validate(extractedData.toObject() as ExtractedData);

    // Update
    invoiceOCR.validationResult = validationResult;
    invoiceOCR.status = validationResult.isValid
      ? InvoiceOCRStatus.VALIDATED
      : InvoiceOCRStatus.VALIDATION_FAILED;
    await invoiceOCR.save();

    res.json({
      success: true,
      data: {
        invoiceOcrId: id,
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        message: validationResult.isValid
          ? 'Invoice data validated successfully'
          : 'Invoice data still has validation errors',
      },
    });
  } catch (error) {
    next(error);
  }
});

export const validateRoutes = router;
