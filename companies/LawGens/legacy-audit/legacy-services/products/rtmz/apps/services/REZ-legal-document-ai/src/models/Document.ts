import mongoose, { Document, Schema } from 'mongoose';

export type DocumentStatus = 'uploaded' | 'processing' | 'analyzing' | 'completed' | 'failed';
export type DocumentType = 'contract' | 'agreement' | 'nda' | 'sow' | 'amendment' | 'addendum' | 'policy' | 'terms_of_service' | 'privacy_policy' | 'employment' | 'other';

export interface IDocumentMetadata {
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  uploadedAt: Date;
  processedAt?: Date;
  analyzedAt?: Date;
  pageCount?: number;
  wordCount?: number;
  charCount?: number;
  language?: string;
  version?: string;
  tags: string[];
  customFields?: Record<string, unknown>;
}

export interface IDocument {
  documentId: string;
  tenantId: string;
  userId: string;
  title: string;
  description?: string;
  type: DocumentType;
  status: DocumentStatus;
  filePath: string;
  extractedText?: string;
  metadata: IDocumentMetadata;
  analysisId?: string;
  riskReportId?: string;
  entities?: {
    parties: string[];
    dates: string[];
    amounts: string[];
    jurisdictions: string[];
  };
  error?: string;
  retryCount: number;
  lastError?: string;
}

export interface IDocumentDocument extends IDocument, Document {}

const DocumentMetadataSchema = new Schema<IDocumentMetadata>({
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: true },
  fileType: { type: String, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, required: true },
  processedAt: Date,
  analyzedAt: Date,
  pageCount: Number,
  wordCount: Number,
  charCount: Number,
  language: String,
  version: String,
  tags: [{ type: String }],
  customFields: { type: Schema.Types.Mixed }
}, { _id: false });

const EntitiesSchema = new Schema({
  parties: [{ type: String }],
  dates: [{ type: String }],
  amounts: [{ type: String }],
  jurisdictions: [{ type: String }]
}, { _id: false });

const DocumentSchema = new Schema<IDocumentDocument>({
  documentId: { type: String, required: true, unique: true, index: true },
  tenantId: { type: String, required: true, index: true },
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  description: String,
  type: {
    type: String,
    enum: ['contract', 'agreement', 'nda', 'sow', 'amendment', 'addendum',
           'policy', 'terms_of_service', 'privacy_policy', 'employment', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'analyzing', 'completed', 'failed'],
    default: 'uploaded',
    required: true
  },
  filePath: { type: String, required: true },
  extractedText: String,
  metadata: { type: DocumentMetadataSchema, required: true },
  analysisId: { type: String, index: true },
  riskReportId: { type: String, index: true },
  entities: EntitiesSchema,
  error: String,
  retryCount: { type: Number, default: 0 },
  lastError: String
}, { timestamps: true });

// Compound indexes for common queries
DocumentSchema.index({ tenantId: 1, status: 1 });
DocumentSchema.index({ tenantId: 1, type: 1 });
DocumentSchema.index({ tenantId: 1, createdAt: -1 });
DocumentSchema.index({ userId: 1, createdAt: -1 });
DocumentSchema.index({ 'metadata.tags': 1 });

// Text index for search
DocumentSchema.index({ title: 'text', description: 'text' });

export const DocumentModel = mongoose.model<IDocumentDocument>(
  'Document',
  DocumentSchema
);

// Allowed MIME types
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Max file size (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Document type mapping from extensions
export const EXTENSION_TO_TYPE: Record<string, DocumentType> = {
  '.pdf': 'contract',
  '.doc': 'contract',
  '.docx': 'contract',
  '.txt': 'other'
};
