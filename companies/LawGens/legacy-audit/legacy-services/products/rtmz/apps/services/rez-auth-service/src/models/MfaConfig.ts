import mongoose, { Schema, Document } from 'mongoose';
import crypto from 'crypto';

/**
 * MFA Configuration Model
 *
 * SECURITY:
 * - secret: Encrypted with AES-256-GCM
 * - backupCodes: Hashed with SHA-256 + salted, then encrypted
 *
 * FIX: Backup codes now use both hashing AND encryption:
 * 1. Hash the backup code (prevents plaintext exposure)
 * 2. Encrypt the hash (prevents rainbow table attacks)
 */

export interface IMfaConfig extends Document {
  userId: mongoose.Types.ObjectId;
  secret: string; // Encrypted TOTP secret (base32)
  isEnabled: boolean;
  backupCodes: Array<{
    code: string; // Hashed AND encrypted backup code
    used: boolean;
    usedAt?: Date;
  }>;
  enabledAt?: Date;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Encryption Configuration ────────────────────────────────────────────────

const ENCRYPTION_KEY = process.env.OTP_TOTP_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error('OTP_TOTP_ENCRYPTION_KEY environment variable is required for MFA security');
}

const ALGORITHM = 'aes-256-gcm';
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'utf8');

// ─── Backup Code Utilities ───────────────────────────────────────────────────

/**
 * Generate a random backup code
 */
export function generateBackupCode(): string {
  // Generate 8 random alphanumeric characters
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[crypto.randomInt(chars.length)];
  }
  // Format as XXXX-XXXX
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Hash and encrypt a backup code
 * 1. Hash with SHA-256 + random salt
 * 2. Encrypt the hash result
 */
export function hashAndEncryptBackupCode(code: string): string {
  // Generate random salt
  const salt = crypto.randomBytes(16);

  // Hash the code with salt
  const hash = crypto.createHash('sha256');
  hash.update(salt);
  hash.update(code.toUpperCase().replace(/-/g, '')); // Normalize: remove dashes, uppercase
  const hashedValue = hash.digest('hex');

  // Encrypt the combined salt:hash
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER.slice(0, 32), iv);

  const encrypted = Buffer.concat([
    cipher.update(`${salt.toString('hex')}:${hashedValue}`, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Verify a backup code against its stored hash
 */
export function verifyBackupCode(code: string, storedHash: string): boolean {
  try {
    // Parse stored hash
    const [ivHex, authTagHex, encryptedHex] = storedHash.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    // Decrypt
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER.slice(0, 32), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');

    // Parse salt:hash
    const [saltHex, hashedValue] = decrypted.split(':');
    const salt = Buffer.from(saltHex, 'hex');

    // Hash the provided code
    const hash = crypto.createHash('sha256');
    hash.update(salt);
    hash.update(code.toUpperCase().replace(/-/g, ''));
    const providedHash = hash.digest('hex');

    // Constant-time comparison
    if (hashedValue.length !== providedHash.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < hashedValue.length; i++) {
      result |= hashedValue.charCodeAt(i) ^ providedHash.charCodeAt(i);
    }

    return result === 0;
  } catch (error) {
    // Invalid stored hash format
    return false;
  }
}

// ─── Schema Definition ──────────────────────────────────────────────────────

const BackupCodeSchema = new Schema({
  code: {
    type: String,
    required: true,
    // FIX: Now stores hashed AND encrypted backup codes
    // Format: iv:authTag:encrypted (hex encoded)
  },
  used: {
    type: Boolean,
    default: false,
    index: true,
  },
  usedAt: {
    type: Date,
    default: null,
  },
}, { _id: false });

const MfaConfigSchema = new Schema<IMfaConfig>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    secret: {
      type: String,
      required: true,
      // Encrypted at rest via AES-256-GCM
    },
    isEnabled: {
      type: Boolean,
      default: false,
      index: true,
    },
    backupCodes: {
      type: [BackupCodeSchema],
      default: [],
    },
    enabledAt: {
      type: Date,
      default: null,
    },
    lastVerifiedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Indexes ─────────────────────────────────────────────────────────────────

MfaConfigSchema.index({ userId: 1, isEnabled: 1 });

// ─── Static Methods ──────────────────────────────────────────────────────────

/**
 * Generate new backup codes for a user
 */
MfaConfigSchema.statics.generateBackupCodes = async function(
  userId: string,
  count: number = 10
): Promise<string[]> {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    codes.push(generateBackupCode());
  }

  // Hash and encrypt all codes
  const hashedCodes = codes.map(code => ({
    code: hashAndEncryptBackupCode(code),
    used: false,
  }));

  // Update user MFA config
  await this.findOneAndUpdate(
    { userId },
    {
      $set: { backupCodes: hashedCodes },
    },
    { upsert: true }
  );

  // Return plaintext codes (only time they're available)
  return codes;
};

/**
 * Verify and consume a backup code
 */
MfaConfigSchema.statics.verifyAndConsumeBackupCode = async function(
  userId: string,
  code: string
): Promise<boolean> {
  const config = await this.findOne({ userId, isEnabled: true });

  if (!config) {
    return false;
  }

  // Find and verify the code
  for (const backupCode of config.backupCodes) {
    if (!backupCode.used && verifyBackupCode(code, backupCode.code)) {
      // Mark as used
      backupCode.used = true;
      backupCode.usedAt = new Date();
      await config.save();
      return true;
    }
  }

  return false;
};

/**
 * Get remaining backup codes count
 */
MfaConfigSchema.statics.getRemainingBackupCodesCount = async function(
  userId: string
): Promise<number> {
  const config = await this.findOne({ userId, isEnabled: true });

  if (!config) {
    return 0;
  }

  return config.backupCodes.filter(c => !c.used).length;
};

export const MfaConfig = mongoose.model<IMfaConfig>('MfaConfig', MfaConfigSchema);
