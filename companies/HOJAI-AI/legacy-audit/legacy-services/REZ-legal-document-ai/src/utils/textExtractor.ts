import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

export interface TextExtractionResult {
  text: string;
  pageCount?: number;
  wordCount: number;
  charCount: number;
  language?: string;
  metadata: {
    extractedAt: Date;
    sourceFile: string;
    extractionMethod: string;
  };
}

/**
 * Extract text from a PDF file using pdf-parse
 */
export async function extractTextFromPDF(filePath: string): Promise<TextExtractionResult> {
  try {
    const pdfParse = await import('pdf-parse');
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse.default(dataBuffer);

    const text = data.text?.trim() || '';
    const wordCount = countWords(text);
    const charCount = text.length;

    logger.info('PDF text extraction completed', {
      filePath,
      pageCount: data.numpages,
      wordCount,
      charCount
    });

    return {
      text,
      pageCount: data.numpages,
      wordCount,
      charCount,
      metadata: {
        extractedAt: new Date(),
        sourceFile: filePath,
        extractionMethod: 'pdf-parse'
      }
    };
  } catch (error) {
    logger.error('PDF extraction failed', { filePath, error });
    throw new Error(`Failed to extract text from PDF: ${(error as Error).message}`);
  }
}

/**
 * Extract text from a Word document using mammoth
 */
export async function extractTextFromWord(filePath: string): Promise<TextExtractionResult> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });

    const text = result.value?.trim() || '';
    const wordCount = countWords(text);
    const charCount = text.length;

    if (result.messages && result.messages.length > 0) {
      logger.warn('Word extraction had messages', {
        filePath,
        messages: result.messages.map(m => m.message)
      });
    }

    logger.info('Word text extraction completed', {
      filePath,
      wordCount,
      charCount
    });

    return {
      text,
      wordCount,
      charCount,
      metadata: {
        extractedAt: new Date(),
        sourceFile: filePath,
        extractionMethod: 'mammoth'
      }
    };
  } catch (error) {
    logger.error('Word extraction failed', { filePath, error });
    throw new Error(`Failed to extract text from Word document: ${(error as Error).message}`);
  }
}

/**
 * Extract text from a plain text file
 */
export async function extractTextFromFile(filePath: string): Promise<TextExtractionResult> {
  try {
    const text = fs.readFileSync(filePath, 'utf-8').trim();
    const wordCount = countWords(text);
    const charCount = text.length;

    logger.info('Text file extraction completed', {
      filePath,
      wordCount,
      charCount
    });

    return {
      text,
      wordCount,
      charCount,
      metadata: {
        extractedAt: new Date(),
        sourceFile: filePath,
        extractionMethod: 'file-read'
      }
    };
  } catch (error) {
    logger.error('Text file extraction failed', { filePath, error });
    throw new Error(`Failed to read text file: ${(error as Error).message}`);
  }
}

/**
 * Extract text from any supported file type
 */
export async function extractText(filePath: string): Promise<TextExtractionResult> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return extractTextFromPDF(filePath);
    case '.doc':
    case '.docx':
      return extractTextFromWord(filePath);
    case '.txt':
      return extractTextFromFile(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Count words in text
 */
export function countWords(text: string): number {
  if (!text || text.trim() === '') return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Estimate reading time in minutes
 */
export function estimateReadingTime(text: string, wordsPerMinute: number = 200): number {
  const wordCount = countWords(text);
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * Clean extracted text for better processing
 */
export function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/^\d+\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Split text into manageable chunks for analysis
 */
export function chunkText(text: string, maxChunkSize: number = 4000, overlap: number = 200): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if ((currentChunk.length + paragraph.length) > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      const words = currentChunk.split(' ');
      currentChunk = words.slice(-Math.floor(overlap / 5)).join(' ') + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Generate unique ID for text segments
 */
export function generateSegmentId(): string {
  return `seg_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
}

export default {
  extractText,
  extractTextFromPDF,
  extractTextFromWord,
  extractTextFromFile,
  countWords,
  estimateReadingTime,
  cleanText,
  chunkText,
  generateSegmentId
};
