import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE, DocumentType, EXTENSION_TO_TYPE } from '../models/Document';
import logger from './logger';

export interface ParsedDocument {
  documentId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  mimeType: string;
  documentType: DocumentType;
  uploadPath: string;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Validate uploaded file
 */
export function validateFile(
  file: Express.Multer.File,
  customAllowedTypes?: string[]
): ParsedDocument {
  const errors: string[] = [];
  const allowedTypes = customAllowedTypes || ALLOWED_MIME_TYPES;

  // Check file exists
  if (!file) {
    return {
      documentId: '',
      fileName: '',
      fileSize: 0,
      fileType: '',
      mimeType: '',
      documentType: 'other',
      uploadPath: '',
      isValid: false,
      validationErrors: ['No file uploaded']
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    errors.push(`File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)`);
  }

  // Check MIME type
  if (!allowedTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`);
  }

  // Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt'];
  if (!allowedExtensions.includes(ext)) {
    errors.push(`Invalid file extension: ${ext}. Allowed: ${allowedExtensions.join(', ')}`);
  }

  const documentId = `doc_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
  const documentType = EXTENSION_TO_TYPE[ext] || 'other';

  return {
    documentId,
    fileName: file.originalname,
    fileSize: file.size,
    fileType: ext.replace('.', ''),
    mimeType: file.mimetype,
    documentType,
    uploadPath: file.path,
    isValid: errors.length === 0,
    validationErrors: errors
  };
}

/**
 * Generate upload directory path
 */
export function getUploadPath(tenantId: string, documentId: string, fileName: string): string {
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  return path.join(uploadDir, tenantId, String(year), month, documentId, fileName);
}

/**
 * Parse document title from filename
 */
export function parseDocumentTitle(fileName: string): string {
  // Remove extension
  let title = path.basename(fileName, path.extname(fileName));
  // Replace underscores and dashes with spaces
  title = title.replace(/[_-]/g, ' ');
  // Capitalize words
  title = title.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return title;
}

/**
 * Detect document type from content
 */
export function detectDocumentType(content: string, fileName: string): DocumentType {
  const lowerContent = content.toLowerCase();
  const lowerFileName = fileName.toLowerCase();

  // NDA detection
  if (lowerFileName.includes('nda') || lowerFileName.includes('non-disclosure') ||
      lowerContent.includes('non-disclosure agreement') ||
      lowerContent.includes('confidential information') && lowerContent.includes('disclose')) {
    return 'nda';
  }

  // SOW detection
  if (lowerFileName.includes('sow') || lowerFileName.includes('statement of work') ||
      lowerContent.includes('statement of work') ||
      (lowerContent.includes('scope of work') && lowerContent.includes('deliverable'))) {
    return 'sow';
  }

  // Privacy policy
  if (lowerFileName.includes('privacy') || lowerContent.includes('privacy policy') ||
      lowerContent.includes('data collection') && lowerContent.includes('personal information')) {
    return 'privacy_policy';
  }

  // Terms of service
  if (lowerFileName.includes('terms') || lowerContent.includes('terms of service') ||
      lowerContent.includes('terms and conditions') && lowerContent.includes('user')) {
    return 'terms_of_service';
  }

  // Employment
  if (lowerContent.includes('employment agreement') || lowerContent.includes('job description') ||
      lowerContent.includes('compensation') && lowerContent.includes('benefits')) {
    return 'employment';
  }

  // Amendment/Addendum
  if (lowerFileName.includes('amendment') || lowerFileName.includes('addendum') ||
      lowerContent.includes('hereby amend') || lowerContent.includes('addendum to')) {
    return 'amendment';
  }

  // Agreement (generic)
  if (lowerFileName.includes('agreement') || lowerContent.includes('agreement')) {
    return 'agreement';
  }

  return 'contract';
}

/**
 * Extract parties from document content
 */
export function extractParties(content: string): string[] {
  const parties: string[] = [];

  // Pattern: "between [Party A] and [Party B]"
  const betweenPattern = /between\s+([^,]+?)\s+and\s+([^,]+?)(?:\.|,|$)/gi;
  let match;
  while ((match = betweenPattern.exec(content)) !== null) {
    const party1 = match[1].trim();
    const party2 = match[2].trim();
    if (party1.length > 2 && party1.length < 200) parties.push(party1);
    if (party2.length > 2 && party2.length < 200) parties.push(party2);
  }

  // Pattern: "This Agreement is entered into by [Party]"
  const enteredPattern = /by\s+([^,.]+?)(?:\.|,|$)/gi;
  while ((match = enteredPattern.exec(content)) !== null) {
    const party = match[1].trim();
    if (party.length > 2 && party.length < 200 && !parties.includes(party)) {
      parties.push(party);
    }
  }

  return [...new Set(parties)].slice(0, 20);
}

/**
 * Extract dates from document content
 */
export function extractDates(content: string): string[] {
  const dates: string[] = [];

  // Pattern: various date formats
  const datePatterns = [
    /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/g,
    /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/g,
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi,
    /\b(\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/gi
  ];

  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const date = match[1].trim();
      if (date.length > 5 && date.length < 50) {
        dates.push(date);
      }
    }
  }

  return [...new Set(dates)].slice(0, 50);
}

/**
 * Extract monetary amounts from document
 */
export function extractAmounts(content: string): { amount: string; currency: string }[] {
  const amounts: { amount: string; currency: string }[] = [];

  // Pattern: currency amounts
  const currencyPatterns = [
    /\$\s*[\d,]+(?:\.\d{2})?/g,
    /EUR\s*[\d,]+(?:\.\d{2})?/gi,
    /GBP\s*[\d,]+(?:\.\d{2})?/gi,
    /USD\s*[\d,]+(?:\.\d{2})?/gi
  ];

  for (const pattern of currencyPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      amounts.push({
        amount: match[0],
        currency: match[0].startsWith('$') ? 'USD' : match[0].substring(0, 3).trim()
      });
    }
  }

  return amounts.slice(0, 30);
}

export default {
  validateFile,
  getUploadPath,
  parseDocumentTitle,
  detectDocumentType,
  extractParties,
  extractDates,
  extractAmounts
};
