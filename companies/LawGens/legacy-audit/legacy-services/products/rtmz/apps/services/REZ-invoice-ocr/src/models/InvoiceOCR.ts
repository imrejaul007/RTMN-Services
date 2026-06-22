import mongoose, { Schema, Document, Model } from 'mongoose';
import { ExtractedData, ExtractedDataDocument } from './ExtractedData';

/**
 * Invoice OCR Processing Status
 */
export enum InvoiceOCRStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  EXTRACTED = 'extracted',
  VALIDATED = 'validated',
  VALIDATION_FAILED = 'validation_failed',
  EXTRACTION_FAILED = 'extraction_failed',
  DUPLICATE = 'duplicate',
}

/**
 * Validation Result for Invoice
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

/**
 * Invoice OCR Document
 */
export interface InvoiceOCR {
  invoiceOcrId: string;
  tenantId: string;
  userId?: string;
  status: InvoiceOCRStatus;
  originalFileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  extractedDataId?: mongoose.Types.ObjectId;
  extractedData?: ExtractedData;
  validationResult?: ValidationResult;
  duplicateOfId?: string;
  duplicateConfidence?: number;
  retryCount: number;
  lastError?: string;
  processingTimeMs?: number;
  claudeModelUsed?: string;
  rawClaudeResponse?: string;
  metadata?: {
    pageCount?: number;
    imageWidth?: number;
    imageHeight?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceOCRDocument extends Omit<InvoiceOCR, 'extractedDataId'>, Document {
  _id: mongoose.Types.ObjectId;
  extractedDataId?: mongoose.Types.ObjectId;
}

interface IInvoiceOCRModel extends Model<InvoiceOCRDocument> {
  findByTenant(tenantId: string, options?: {
    status?: InvoiceOCRStatus;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ invoices: InvoiceOCRDocument[]; total: number }>;

  findDuplicates(invoiceOcrId: string, similarityThreshold?: number): Promise<InvoiceOCRDocument[]>;

  updateStatus(
    invoiceOcrId: string,
    status: InvoiceOCRStatus,
    additionalFields?: Partial<InvoiceOCRDocument>
  ): Promise<InvoiceOCRDocument | null>;
}

const ValidationErrorSchema = new Schema({
  field: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['error'], default: 'error' },
}, { _id: false });

const ValidationWarningSchema = new Schema({
  field: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['warning'], default: 'warning' },
}, { _id: false });

const ValidationResultSchema = new Schema({
  isValid: { type: Boolean, required: true },
  errors: { type: [ValidationErrorSchema], default: [] },
  warnings: { type: [ValidationWarningSchema], default: [] },
}, { _id: false });

const InvoiceOCRSchema = new Schema<InvoiceOCRDocument, IInvoiceOCRModel>({
  invoiceOcrId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  tenantId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: String,
    index: true,
  },
  status: {
    type: String,
    required: true,
    enum: Object.values(InvoiceOCRStatus),
    default: InvoiceOCRStatus.UPLOADED,
    index: true,
  },
  originalFileName: {
    type: String,
    required: true,
  },
  filePath: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
  },
  mimeType: {
    type: String,
    required: true,
  },
  extractedDataId: {
    type: Schema.Types.ObjectId,
    ref: 'ExtractedData',
  },
  validationResult: {
    type: ValidationResultSchema,
  },
  duplicateOfId: {
    type: String,
    index: true,
  },
  duplicateConfidence: {
    type: Number,
    min: 0,
    max: 1,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  lastError: {
    type: String,
  },
  processingTimeMs: {
    type: Number,
  },
  claudeModelUsed: {
    type: String,
  },
  rawClaudeResponse: {
    type: String,
  },
  metadata: {
    pageCount: { type: Number },
    imageWidth: { type: Number },
    imageHeight: { type: Number },
  },
}, {
  timestamps: true,
  collection: 'invoice_ocr',
});

// Compound indexes
InvoiceOCRSchema.index({ tenantId: 1, status: 1 });
InvoiceOCRSchema.index({ tenantId: 1, createdAt: -1 });
InvoiceOCRSchema.index({ tenantId: 1, userId: 1, createdAt: -1 });
InvoiceOCRSchema.index({ status: 1, createdAt: -1 });

// Static method to find by tenant
InvoiceOCRSchema.statics.findByTenant = async function (
  tenantId: string,
  options?: {
    status?: InvoiceOCRStatus;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  const filter: Record<string, unknown> = { tenantId };

  if (options?.status) filter.status = options.status;
  if (options?.fromDate || options?.toDate) {
    filter.createdAt = {};
    if (options.fromDate) (filter.createdAt as Record<string, Date>).$gte = options.fromDate;
    if (options.toDate) (filter.createdAt as Record<string, Date>).$lte = options.toDate;
  }

  const page = options?.page || 1;
  const limit = options?.limit || 20;
  const skip = (page - 1) * limit;
  const sortBy = options?.sortBy || 'createdAt';
  const sortOrder = options?.sortOrder === 'asc' ? 1 : -1;

  const [invoices, total] = await Promise.all([
    this.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .populate('extractedDataId'),
    this.countDocuments(filter),
  ]);

  return { invoices, total };
};

// Static method to find duplicates
InvoiceOCRSchema.statics.findDuplicates = async function (
  invoiceOcrId: string,
  similarityThreshold: number = 0.8
): Promise<InvoiceOCRDocument[]> {
  const invoice = await this.findOne({ invoiceOcrId });
  if (!invoice) return [];

  // Find invoices with similar invoice numbers or same vendor
  return this.find({
    invoiceOcrId: { $ne: invoiceOcrId },
    tenantId: invoice.tenantId,
    status: { $in: [InvoiceOCRStatus.EXTRACTED, InvoiceOCRStatus.VALIDATED] },
    $or: [
      { 'extractedDataId.invoiceNumber': invoice.extractedData?.invoiceNumber },
      { 'extractedDataId.vendorGstin': invoice.extractedData?.vendorGstin },
    ],
  }).populate('extractedDataId');
};

// Static method to update status
InvoiceOCRSchema.statics.updateStatus = async function (
  invoiceOcrId: string,
  status: InvoiceOCRStatus,
  additionalFields?: Partial<InvoiceOCRDocument>
): Promise<InvoiceOCRDocument | null> {
  return this.findOneAndUpdate(
    { invoiceOcrId },
    {
      status,
      ...additionalFields,
    },
    { new: true }
  );
};

export const InvoiceOCRModel = mongoose.model<InvoiceOCRDocument, IInvoiceOCRModel>(
  'InvoiceOCR',
  InvoiceOCRSchema
);
