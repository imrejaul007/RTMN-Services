import crypto from 'crypto';
import { logger } from '../utils/logger.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

interface EncryptionConfig {
  encryptionKey: string;
}

interface EncryptedData {
  iv: string;
  authTag: string;
  data: string;
  salt: string;
}

class EncryptionService {
  private encryptionKey: Buffer | null = null;
  private readonly sensitiveFields = [
    'email',
    'phone',
    'name',
    'address',
    'dateOfBirth',
    'ssn',
    'creditCard',
    'bankAccount',
    'aadhaar',
    'pan',
    'passport',
    'emergencyContact',
  ];

  initialize(config: EncryptionConfig): void {
    if (!config.encryptionKey) {
      throw new Error('Encryption key is required');
    }
    this.encryptionKey = crypto.scryptSync(
      config.encryptionKey,
      'hojai-salt',
      KEY_LENGTH
    );
    logger.info('Encryption service initialized');
  }

  isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  encryptSensitiveData(data: Record<string, unknown>): Record<string, string> {
    if (!this.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }

    const encrypted: Record<string, string> = {};

    for (const field of this.sensitiveFields) {
      if (field in data && data[field] !== undefined && data[field] !== null) {
        const value = String(data[field]);
        encrypted[field] = this.encrypt(value);
      }
    }

    return encrypted;
  }

  decryptSensitiveData(
    encryptedData: Record<string, string>
  ): Record<string, string> {
    if (!this.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }

    const decrypted: Record<string, string> = {};

    for (const [field, encryptedValue] of Object.entries(encryptedData)) {
      try {
        decrypted[field] = this.decrypt(encryptedValue);
      } catch (error) {
        logger.error(`Failed to decrypt field ${field}`, { error });
        throw error;
      }
    }

    return decrypted;
  }

  hashForLookup(data: string): string {
    const salt = crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(data, salt, ITERATIONS, 64, 'sha512');
    return `${salt.toString('hex')}:${hash.toString('hex')}`;
  }

  verifyHash(data: string, hash: string): boolean {
    try {
      const [saltHex, originalHash] = hash.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const verificationHash = crypto.pbkdf2Sync(
        data,
        salt,
        ITERATIONS,
        64,
        'sha512'
      );
      return crypto.timingSafeEqual(
        Buffer.from(originalHash, 'hex'),
        verificationHash
      );
    } catch {
      return false;
    }
  }

  private encrypt(plaintext: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    const encryptedData: EncryptedData = {
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      data: encrypted,
      salt: crypto.randomBytes(SALT_LENGTH).toString('hex'),
    };

    return Buffer.from(JSON.stringify(encryptedData)).toString('base64');
  }

  private decrypt(ciphertext: string): string {
    if (!this.encryptionKey) {
      throw new Error('Encryption service not initialized');
    }

    const encryptedData: EncryptedData = JSON.parse(
      Buffer.from(ciphertext, 'base64').toString('utf8')
    );

    const iv = Buffer.from(encryptedData.iv, 'hex');
    const authTag = Buffer.from(encryptedData.authTag, 'hex');

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      this.encryptionKey,
      iv
    );
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  encryptField(fieldName: string, value: string): string {
    if (!this.sensitiveFields.includes(fieldName)) {
      logger.warn(`Field ${fieldName} is not in sensitive fields list`);
    }
    return this.encrypt(value);
  }

  decryptField(fieldName: string, encryptedValue: string): string {
    if (!this.sensitiveFields.includes(fieldName)) {
      logger.warn(`Field ${fieldName} is not in sensitive fields list`);
    }
    return this.decrypt(encryptedValue);
  }

  isSensitiveField(fieldName: string): boolean {
    return this.sensitiveFields.includes(fieldName);
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const saltBuffer = salt ? Buffer.from(salt, 'hex') : crypto.randomBytes(SALT_LENGTH);
    const hash = crypto.pbkdf2Sync(password, saltBuffer, ITERATIONS, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt: saltBuffer.toString('hex'),
    };
  }

  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const saltBuffer = Buffer.from(salt, 'hex');
      const verificationHash = crypto.pbkdf2Sync(
        password,
        saltBuffer,
        ITERATIONS,
        64,
        'sha512'
      );
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        verificationHash
      );
    } catch {
      return false;
    }
  }
}

export const encryptionService = new EncryptionService();
