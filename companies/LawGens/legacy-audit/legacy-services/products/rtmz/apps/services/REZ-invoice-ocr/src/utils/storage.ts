import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './logger';

const logger = new Logger('storage');

/**
 * Storage Service - Handle file uploads and storage
 */
export class StorageService {
  private uploadPath: string;
  private maxFileSize: number;
  private allowedMimeTypes: string[];

  constructor() {
    this.uploadPath = process.env.UPLOAD_PATH || './uploads';
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10) * 1024 * 1024; // Convert to bytes
    this.allowedMimeTypes = (process.env.ALLOWED_FILE_TYPES || 'image/jpeg,image/png,application/pdf').split(',');
  }

  /**
   * Ensure upload directory exists
   */
  async ensureUploadDir(): Promise<void> {
    const uploadDir = path.resolve(this.uploadPath);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      logger.info('Created upload directory', { path: uploadDir });
    }
  }

  /**
   * Save uploaded file
   */
  async saveFile(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<{
    filePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }> {
    await this.ensureUploadDir();

    // Validate file type
    if (!this.isAllowedMimeType(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Validate file size
    if (buffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Generate unique filename
    const ext = this.getExtensionFromMimeType(mimeType);
    const uniqueFilename = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadPath, uniqueFilename);

    // Save file
    fs.writeFileSync(filePath, buffer);

    logger.info('File saved successfully', {
      originalFilename,
      fileName: uniqueFilename,
      fileSize: buffer.length,
      mimeType,
    });

    return {
      filePath,
      fileName: uniqueFilename,
      fileSize: buffer.length,
      mimeType,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);

    // Security check - ensure path is within upload directory
    const uploadDir = path.resolve(this.uploadPath);
    if (!absolutePath.startsWith(uploadDir)) {
      throw new Error('Invalid file path');
    }

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
      logger.info('File deleted', { filePath: absolutePath });
    }
  }

  /**
   * Get file as buffer
   */
  async getFile(filePath: string): Promise<Buffer> {
    const absolutePath = path.resolve(filePath);

    // Security check
    const uploadDir = path.resolve(this.uploadPath);
    if (!absolutePath.startsWith(uploadDir)) {
      throw new Error('Invalid file path');
    }

    if (!fs.existsSync(absolutePath)) {
      throw new Error('File not found');
    }

    return fs.readFileSync(absolutePath);
  }

  /**
   * Check if file exists
   */
  fileExists(filePath: string): boolean {
    const absolutePath = path.resolve(filePath);
    return fs.existsSync(absolutePath);
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<{
    size: number;
    createdAt: Date;
    modifiedAt: Date;
    mimeType: string;
  } | null> {
    const absolutePath = path.resolve(filePath);

    // Security check
    const uploadDir = path.resolve(this.uploadPath);
    if (!absolutePath.startsWith(uploadDir)) {
      return null;
    }

    if (!fs.existsSync(absolutePath)) {
      return null;
    }

    const stats = fs.statSync(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    return {
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      mimeType: this.getMimeTypeFromExtension(ext),
    };
  }

  /**
   * Check if mime type is allowed
   */
  private isAllowedMimeType(mimeType: string): boolean {
    return this.allowedMimeTypes.includes(mimeType);
  }

  /**
   * Get file extension from mime type
   */
  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'application/pdf': '.pdf',
      'image/webp': '.webp',
    };
    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Get mime type from file extension
   */
  private getMimeTypeFromExtension(ext: string): string {
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.pdf': 'application/pdf',
      '.webp': 'image/webp',
    };
    return extToMime[ext] || 'application/octet-stream';
  }

  /**
   * Get maximum file size in bytes
   */
  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  /**
   * Get allowed mime types
   */
  getAllowedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  /**
   * Clean up old files (files older than specified days)
   */
  async cleanupOldFiles(maxAgeDays: number = 7): Promise<number> {
    const uploadDir = path.resolve(this.uploadPath);
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let deletedCount = 0;

    if (!fs.existsSync(uploadDir)) {
      return 0;
    }

    const files = fs.readdirSync(uploadDir);

    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = fs.statSync(filePath);

      if (now - stats.mtimeMs > maxAgeMs) {
        fs.unlinkSync(filePath);
        deletedCount++;
        logger.info('Cleaned up old file', { file, ageDays: maxAgeDays });
      }
    }

    return deletedCount;
  }
}

export const storageService = new StorageService();
