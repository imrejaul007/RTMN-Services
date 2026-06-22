import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { InvoiceOCRModel, InvoiceOCRStatus } from '../models/InvoiceOCR';
import { storageService } from '../utils/storage';
import { Logger } from '../utils/logger';
import { getTenantContext } from '../middleware/tenant';

const logger = new Logger('upload-routes');
const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: (parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024),
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and PDF are allowed.'));
    }
  },
});

/**
 * POST /upload - Upload invoice document
 */
router.post('/', upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);

    if (!req.file) {
      res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please upload a PDF or image file (JPG, PNG)',
      });
      return;
    }

    const file = req.file;
    const invoiceOcrId = `ocr_${uuidv4()}`;

    // Save file to storage
    const savedFile = await storageService.saveFile(
      file.buffer,
      file.originalname,
      file.mimetype
    );

    // Determine file type
    let fileType: 'pdf' | 'image' = 'pdf';
    if (file.mimetype.startsWith('image/')) {
      fileType = 'image';
    }

    // Create invoice OCR record
    const invoiceOCR = new InvoiceOCRModel({
      invoiceOcrId,
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      status: InvoiceOCRStatus.UPLOADED,
      originalFileName: file.originalname,
      filePath: savedFile.filePath,
      fileSize: savedFile.fileSize,
      fileType,
      mimeType: savedFile.mimeType,
      retryCount: 0,
    });

    await invoiceOCR.save();

    logger.info('Invoice file uploaded', {
      invoiceOcrId,
      fileName: file.originalname,
      fileSize: savedFile.fileSize,
      tenantId: tenantContext.tenantId,
    });

    res.status(201).json({
      success: true,
      data: {
        invoiceOcrId,
        fileName: file.originalname,
        fileSize: savedFile.fileSize,
        mimeType: savedFile.mimeType,
        status: InvoiceOCRStatus.UPLOADED,
        message: 'File uploaded successfully. Use POST /extract to process the invoice.',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /upload/base64 - Upload invoice as base64 (for mobile apps)
 */
router.post('/base64', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantContext = getTenantContext(req);
    const { base64Data, fileName, mimeType } = req.body;

    if (!base64Data || !fileName || !mimeType) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Please provide base64Data, fileName, and mimeType',
      });
      return;
    }

    // Validate mime type
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(mimeType)) {
      res.status(400).json({
        success: false,
        error: 'Invalid file type',
        message: 'Only JPEG, PNG, and PDF are allowed',
      });
      return;
    }

    const invoiceOcrId = `ocr_${uuidv4()}`;

    // Decode base64
    const buffer = Buffer.from(base64Data, 'base64');

    // Save file
    const savedFile = await storageService.saveFile(buffer, fileName, mimeType);

    // Determine file type
    let fileType: 'pdf' | 'image' = 'pdf';
    if (mimeType.startsWith('image/')) {
      fileType = 'image';
    }

    // Create invoice OCR record
    const invoiceOCR = new InvoiceOCRModel({
      invoiceOcrId,
      tenantId: tenantContext.tenantId,
      userId: tenantContext.userId,
      status: InvoiceOCRStatus.UPLOADED,
      originalFileName: fileName,
      filePath: savedFile.filePath,
      fileSize: savedFile.fileSize,
      fileType,
      mimeType: savedFile.mimeType,
      retryCount: 0,
    });

    await invoiceOCR.save();

    logger.info('Invoice uploaded via base64', {
      invoiceOcrId,
      fileName,
      fileSize: savedFile.fileSize,
      tenantId: tenantContext.tenantId,
    });

    res.status(201).json({
      success: true,
      data: {
        invoiceOcrId,
        fileName,
        fileSize: savedFile.fileSize,
        mimeType: savedFile.mimeType,
        status: InvoiceOCRStatus.UPLOADED,
        message: 'File uploaded successfully. Use POST /extract to process the invoice.',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /upload/:id - Delete uploaded file
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
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

    // Delete file from storage
    try {
      await storageService.deleteFile(invoiceOCR.filePath);
    } catch {
      logger.warn('File not found in storage', { filePath: invoiceOCR.filePath });
    }

    // Delete record
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

export const uploadRoutes = router;
