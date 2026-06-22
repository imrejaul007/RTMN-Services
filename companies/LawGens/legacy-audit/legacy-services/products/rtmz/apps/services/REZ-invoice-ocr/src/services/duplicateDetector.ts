import { ExtractedData } from '../models/ExtractedData';
import { InvoiceOCRModel } from '../models/InvoiceOCR';
import { Logger } from '../utils/logger';

const logger = new Logger('duplicate-detector');

/**
 * Duplicate Detector Service - Detect duplicate invoices using similarity
 */
export class DuplicateDetectorService {
  private similarityThreshold: number;

  constructor(similarityThreshold: number = 0.8) {
    this.similarityThreshold = similarityThreshold;
  }

  /**
   * Check if an invoice is a duplicate
   */
  async checkDuplicate(
    extractedData: ExtractedData,
    tenantId: string,
    excludeOcrId?: string
  ): Promise<{
    isDuplicate: boolean;
    duplicateOf?: {
      invoiceOcrId: string;
      confidence: number;
      matchDetails: string[];
    };
    similarityScore: number;
  }> {
    logger.info('Checking for duplicate invoice', {
      invoiceNumber: extractedData.invoiceNumber,
      vendorGstin: extractedData.vendorGstin,
      tenantId,
    });

    const matchDetails: string[] = [];
    let maxSimilarity = 0;
    let duplicateMatch: { invoiceOcrId: string; confidence: number } | null = null;

    // Build query for potential duplicates
    const query: Record<string, unknown> = {
      tenantId,
      status: { $in: ['extracted', 'validated'] },
    };

    if (excludeOcrId) {
      query.invoiceOcrId = { $ne: excludeOcrId };
    }

    try {
      // Find potential duplicates by invoice number or vendor
      const potentialDuplicates = await InvoiceOCRModel.find(query)
        .populate('extractedDataId')
        .limit(50);

      for (const doc of potentialDuplicates) {
        const existingData = (doc.extractedDataId as unknown as ExtractedData);

        if (!existingData) continue;

        const similarity = this.calculateSimilarity(extractedData, existingData);

        if (similarity > this.similarityThreshold && similarity > maxSimilarity) {
          maxSimilarity = similarity;
          duplicateMatch = {
            invoiceOcrId: doc.invoiceOcrId,
            confidence: similarity,
          };

          // Build match details
          if (extractedData.invoiceNumber === existingData.invoiceNumber) {
            matchDetails.push('Same invoice number');
          }
          if (extractedData.vendorGstin && existingData.vendorGstin &&
              extractedData.vendorGstin === existingData.vendorGstin) {
            matchDetails.push('Same vendor GSTIN');
          }
          if (extractedData.vendorName === existingData.vendorName) {
            matchDetails.push('Same vendor name');
          }
          if (extractedData.totalAmount === existingData.totalAmount) {
            matchDetails.push('Same total amount');
          }
          if (extractedData.invoiceDate === existingData.invoiceDate) {
            matchDetails.push('Same invoice date');
          }
        }
      }

      const result = {
        isDuplicate: duplicateMatch !== null,
        duplicateOf: duplicateMatch ? {
          ...duplicateMatch,
          matchDetails,
        } : undefined,
        similarityScore: maxSimilarity,
      };

      logger.info('Duplicate check completed', {
        isDuplicate: result.isDuplicate,
        similarityScore: result.similarityScore,
      });

      return result;
    } catch (error) {
      logger.error('Error checking for duplicates', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Calculate similarity between two invoices
   */
  private calculateSimilarity(invoice1: ExtractedData, invoice2: ExtractedData): number {
    const scores: { weight: number; score: number }[] = [];

    // Invoice number match (high weight)
    if (invoice1.invoiceNumber && invoice2.invoiceNumber) {
      const invoiceMatch = this.stringSimilarity(invoice1.invoiceNumber, invoice2.invoiceNumber);
      scores.push({ weight: 0.4, score: invoiceMatch });
    }

    // Vendor GSTIN match (high weight)
    if (invoice1.vendorGstin && invoice2.vendorGstin) {
      const gstinMatch = invoice1.vendorGstin === invoice2.vendorGstin ? 1 : 0;
      scores.push({ weight: 0.3, score: gstinMatch });
    }

    // Vendor name similarity
    if (invoice1.vendorName && invoice2.vendorName) {
      const vendorMatch = this.stringSimilarity(invoice1.vendorName, invoice2.vendorName);
      scores.push({ weight: 0.1, score: vendorMatch });
    }

    // Invoice date match
    if (invoice1.invoiceDate && invoice2.invoiceDate) {
      const dateMatch = invoice1.invoiceDate === invoice2.invoiceDate ? 1 : 0;
      scores.push({ weight: 0.1, score: dateMatch });
    }

    // Total amount match
    if (invoice1.totalAmount && invoice2.totalAmount) {
      const amountDiff = Math.abs(invoice1.totalAmount - invoice2.totalAmount);
      const amountMatch = amountDiff === 0 ? 1 : amountDiff < 1 ? 0.5 : 0;
      scores.push({ weight: 0.1, score: amountMatch });
    }

    // Calculate weighted average
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    if (totalWeight === 0) return 0;

    const weightedSum = scores.reduce((sum, s) => sum + (s.score * s.weight), 0);
    return weightedSum / totalWeight;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private stringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const distance = this.levenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    // Create a matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Find all potential duplicates for a given invoice
   */
  async findAllDuplicates(
    extractedData: ExtractedData,
    tenantId: string
  ): Promise<{
    duplicates: {
      invoiceOcrId: string;
      similarityScore: number;
      matchReasons: string[];
    }[];
  }> {
    const query: Record<string, unknown> = {
      tenantId,
      status: { $in: ['extracted', 'validated'] },
    };

    const potentialDuplicates = await InvoiceOCRModel.find(query)
      .populate('extractedDataId')
      .limit(100);

    const duplicates: {
      invoiceOcrId: string;
      similarityScore: number;
      matchReasons: string[];
    }[] = [];

    for (const doc of potentialDuplicates) {
      const existingData = (doc.extractedDataId as unknown as ExtractedData);

      if (!existingData) continue;

      const similarity = this.calculateSimilarity(extractedData, existingData);

      if (similarity >= this.similarityThreshold) {
        const matchReasons: string[] = [];

        if (extractedData.invoiceNumber === existingData.invoiceNumber) {
          matchReasons.push('Same invoice number');
        }
        if (extractedData.vendorGstin && existingData.vendorGstin &&
            extractedData.vendorGstin === existingData.vendorGstin) {
          matchReasons.push('Same vendor GSTIN');
        }
        if (extractedData.vendorName === existingData.vendorName) {
          matchReasons.push('Same vendor name');
        }
        if (extractedData.totalAmount === existingData.totalAmount) {
          matchReasons.push('Same total amount');
        }
        if (extractedData.invoiceDate === existingData.invoiceDate) {
          matchReasons.push('Same invoice date');
        }

        duplicates.push({
          invoiceOcrId: doc.invoiceOcrId,
          similarityScore: similarity,
          matchReasons,
        });
      }
    }

    // Sort by similarity score
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

    return { duplicates };
  }

  /**
   * Update similarity threshold
   */
  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be between 0 and 1');
    }
    this.similarityThreshold = threshold;
  }
}

export const duplicateDetectorService = new DuplicateDetectorService();
