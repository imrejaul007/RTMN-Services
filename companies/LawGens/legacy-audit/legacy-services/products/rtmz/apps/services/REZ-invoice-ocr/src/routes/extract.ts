import { Router, Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { InvoiceOCRModel, InvoiceOCRStatus } from '../models/InvoiceOCR';
import { ExtractedDataModel } from '../models/ExtractedData';
import { ocrService } from '../services/ocrService';
import { pdfParserService } from '../services/pdfParser';
import { duplicateDetectorService } from '../services/duplicateDetector';
import { storageService } from '../utils/storage';
import { Logger } from '../utils/logger';
import { getTenantContext } from '../middleware/tenant';

const logger = new Logger('extract-routes');
const router = Router();

/**
 * POST /extract - Extract data from uploaded document
 */
router.post('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

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

    // Check if already extracted
    if (invoiceOCR.status === InvoiceOCRStatus.EXTRACTED ||
        invoiceOCR.status === InvoiceOCRStatus.VALIDATED) {
      res.status(400).json({
        success: false,
        error: 'Invoice already extracted',
        message: 'This invoice has already been processed',
        data: {
          status: invoiceOCR.status,
          extractedDataId: invoiceOCR.extractedDataId,
        },
      });
      return;
    }

    // Update status to processing
    invoiceOCR.status = InvoiceOCRStatus.PROCESSING;
    await invoiceOCR.save();

    // Extract content based on file type
    let extractedData;
    let pageCount = 1;

    if (invoiceOCR.fileType === 'pdf') {
      // Extract text from PDF
      const pdfResult = await pdfParserService.extractTextFromPDF(invoiceOCR.filePath);
      pageCount = pdfResult.pageCount;

      // Extract data using Claude
      extractedData = await ocrService.extractFromText(pdfResult.text);
    } else {
      // Process image with Claude's vision
      const imageResult = await pdfParserService.extractTextFromImage(invoiceOCR.filePath);
      extractedData = await ocrService.extractFromImage(
        imageResult.base64Image,
        imageResult.mimeType
      );

      // Update metadata
      invoiceOCR.metadata = {
        imageWidth: imageResult.width,
        imageHeight: imageResult.height,
      };
    }

    // Update metadata with page count
    if (invoiceOCR.fileType === 'pdf') {
      invoiceOCR.metadata = { ...invoiceOCR.metadata, pageCount };
    }

    // Check for duplicates
    const duplicateResult = await duplicateDetectorService.checkDuplicate(
      extractedData,
      tenantContext.tenantId,
      id
    );

    if (duplicateResult.isDuplicate && duplicateResult.duplicateOf) {
      invoiceOCR.status = InvoiceOCRStatus.DUPLICATE;
      invoiceOCR.duplicateOfId = duplicateResult.duplicateOf.invoiceOcrId;
      invoiceOCR.duplicateConfidence = duplicateResult.duplicateOf.confidence;
    } else {
      // Save extracted data
      const extractedDataDoc = new ExtractedDataModel(extractedData);
      await extractedDataDoc.save();

      invoiceOCR.extractedDataId = extractedDataDoc._id;
      invoiceOCR.status = InvoiceOCRStatus.EXTRACTED;
    }

    // Update processing metadata
    invoiceOCR.processingTimeMs = Date.now() - startTime;
    invoiceOCR.claudeModelUsed = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    await invoiceOCR.save();

    logger.info('Invoice extraction completed', {
      invoiceOcrId: id,
      status: invoiceOCR.status,
      processingTimeMs: invoiceOCR.processingTimeMs,
      duplicate: duplicateResult.isDuplicate,
    });

    res.json({
      success: true,
      data: {
        invoiceOcrId: id,
        status: invoiceOCR.status,
        extractedData,
        processingTimeMs: invoiceOCR.processingTimeMs,
        duplicate: duplicateResult.isDuplicate ? {
          duplicateOfId: duplicateResult.duplicateOf?.invoiceOcrId,
          confidence: duplicateResult.duplicateOf?.confidence,
          matchDetails: duplicateResult.duplicateOf?.matchDetails,
        } : undefined,
        message: duplicateResult.isDuplicate
          ? 'This invoice appears to be a duplicate'
          : 'Invoice data extracted successfully',
      },
    });
  } catch (error) {
    // Update status to failed
    await InvoiceOCRModel.findOneAndUpdate(
      { invoiceOcrId: req.params.id },
      {
        status: InvoiceOCRStatus.EXTRACTION_FAILED,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      }
    );

    logger.error('Invoice extraction failed', {
      invoiceOcrId: req.params.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTimeMs: Date.now() - startTime,
    });

    next(error);
  }
});

/**
 * POST /extract/text - Extract from raw text (for testing)
 */
router.post('/text', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { text, invoiceOcrId } = req.body;

    if (!text) {
      res.status(400).json({
        success: false,
        error: 'Text content is required',
      });
      return;
    }

    const extractedData = await ocrService.extractFromText(text);

    // If invoiceOcrId provided, link the extracted data
    if (invoiceOcrId) {
      const invoiceOCR = await InvoiceOCRModel.findOne({
        invoiceOcrId,
        tenantId: tenantContext.tenantId,
      });

      if (invoiceOCR) {
        const extractedDataDoc = new ExtractedDataModel(extractedData);
        await extractedDataDoc.save();

        invoiceOCR.extractedDataId = extractedDataDoc._id;
        invoiceOCR.status = InvoiceOCRStatus.EXTRACTED;
        invoiceOCR.claudeModelUsed = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
        await invoiceOCR.save();
      }
    }

    res.json({
      success: true,
      data: {
        extractedData,
        message: 'Invoice data extracted from text',
      },
    });
  } catch (error) {
    next(error);
  }
});

export const extractRoutes = router;
