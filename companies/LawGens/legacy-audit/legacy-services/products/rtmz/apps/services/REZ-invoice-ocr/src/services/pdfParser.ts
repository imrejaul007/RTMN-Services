import fs from 'fs';
import path from 'path';
import pdf from 'pdf-parse';
import sharp from 'sharp';
import { Logger } from '../utils/logger';

const logger = new Logger('pdf-parser');

/**
 * PDF Parser Service - Extract text and images from PDF and image files
 */
export class PDFParserService {
  /**
   * Extract text content from PDF file
   */
  async extractTextFromPDF(filePath: string): Promise<{
    text: string;
    pageCount: number;
    metadata?: {
      title?: string;
      author?: string;
      creationDate?: Date;
    };
  }> {
    logger.info('Extracting text from PDF', { filePath });

    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      const result = {
        text: data.text,
        pageCount: data.numpages,
        metadata: data.info ? {
          title: data.info.Title,
          author: data.info.Author,
          creationDate: data.info.CreationDate
            ? new Date(data.info.CreationDate)
            : undefined,
        } : undefined,
      };

      logger.info('PDF text extraction completed', {
        pageCount: result.pageCount,
        textLength: result.text.length,
      });

      return result;
    } catch (error) {
      logger.error('PDF text extraction failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text content from image file (JPG, PNG)
   */
  async extractTextFromImage(filePath: string): Promise<{
    base64Image: string;
    mimeType: string;
    width: number;
    height: number;
  }> {
    logger.info('Processing image for OCR', { filePath });

    try {
      const ext = path.extname(filePath).toLowerCase();
      let mimeType: string;

      switch (ext) {
        case '.jpg':
        case '.jpeg':
          mimeType = 'image/jpeg';
          break;
        case '.png':
          mimeType = 'image/png';
          break;
        case '.webp':
          mimeType = 'image/webp';
          break;
        default:
          throw new Error(`Unsupported image format: ${ext}`);
      }

      // Get image metadata
      const metadata = await sharp(filePath).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      // For images, we don't extract text here - we pass the image to Claude
      // Claude's vision model will handle the OCR
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      const result = {
        base64Image,
        mimeType,
        width: metadata.width,
        height: metadata.height,
      };

      logger.info('Image processed successfully', {
        width: result.width,
        height: result.height,
        mimeType: result.mimeType,
      });

      return result;
    } catch (error) {
      logger.error('Image processing failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        filePath,
      });
      throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content from file (auto-detect type)
   */
  async extractContent(filePath: string): Promise<{
    type: 'pdf' | 'image';
    text?: string;
    base64Image?: string;
    mimeType: string;
    pageCount?: number;
    metadata?: {
      width?: number;
      height?: number;
      title?: string;
      author?: string;
    };
  }> {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.pdf') {
      const pdfResult = await this.extractTextFromPDF(filePath);
      return {
        type: 'pdf',
        text: pdfResult.text,
        mimeType: 'application/pdf',
        pageCount: pdfResult.pageCount,
        metadata: {
          title: pdfResult.metadata?.title,
          author: pdfResult.metadata?.author,
        },
      };
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      const imageResult = await this.extractTextFromImage(filePath);
      return {
        type: 'image',
        base64Image: imageResult.base64Image,
        mimeType: imageResult.mimeType,
        metadata: {
          width: imageResult.width,
          height: imageResult.height,
        },
      };
    } else {
      throw new Error(`Unsupported file type: ${ext}`);
    }
  }

  /**
   * Convert PDF pages to images for processing
   */
  async pdfToImages(filePath: string, options?: {
    dpi?: number;
    pageNumbers?: number[];
  }): Promise<{
    pages: {
      pageNumber: number;
      base64Image: string;
      width: number;
      height: number;
    }[];
  }> {
    logger.info('Converting PDF to images', { filePath });

    // Note: This requires pdf-poppler or similar library
    // For now, we'll return a placeholder implementation
    // In production, you would use pdf-poppler or pdf-lib with canvas

    const pageInfo = await this.extractTextFromPDF(filePath);

    // For a full implementation, you would:
    // 1. Use pdf-poppler to convert each page to an image
    // 2. Return the base64 encoded images
    // 3. Process each page separately with Claude's vision model

    logger.warn('PDF to image conversion not fully implemented', {
      message: 'This would require pdf-poppler or similar library for full PDF page extraction',
      pageCount: pageInfo.pageCount,
    });

    return {
      pages: [{
        pageNumber: 1,
        base64Image: '',
        width: 0,
        height: 0,
      }],
    };
  }

  /**
   * Validate PDF file
   */
  async validatePDF(filePath: string): Promise<{
    isValid: boolean;
    pageCount: number;
    encrypted: boolean;
    error?: string;
  }> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);

      return {
        isValid: true,
        pageCount: data.numpages,
        encrypted: false, // pdf-parse doesn't expose this directly
      };
    } catch (error) {
      return {
        isValid: false,
        pageCount: 0,
        encrypted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate image file
   */
  async validateImage(filePath: string): Promise<{
    isValid: boolean;
    width: number;
    height: number;
    format: string;
    error?: string;
  }> {
    try {
      const metadata = await sharp(filePath).metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Could not read image dimensions');
      }

      return {
        isValid: true,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format || 'unknown',
      };
    } catch (error) {
      return {
        isValid: false,
        width: 0,
        height: 0,
        format: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const pdfParserService = new PDFParserService();
