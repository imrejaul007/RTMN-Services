import cron from 'node-cron';
import { Secret, SecretDocument } from '../models';
import { AuditLog } from '../models/AuditLog';
import { sha256Hash, generateSecureToken } from '../utils/encryption';
import { createLogger } from '../utils/logger';
import { SecretStatus, RotationSchedule, RotationResult, AuditEventType } from '../types';

const logger = createLogger('rotation');

export interface RotationStrategy {
  generateNewValue?(currentValue?: string): string | Promise<string>;
  validateNewValue?(value: string): boolean | Promise<boolean>;
  beforeRotation?(secret: SecretDocument): Promise<void>;
  afterRotation?(secret: SecretDocument, oldValue: string): Promise<void>;
}

export class SecretRotationService {
  private isRunning: boolean = false;
  private cronJob: cron.ScheduledTask | null = null;
  private rotationStrategies: Map<string, RotationStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Registers a rotation strategy for a secret type
   */
  registerStrategy(secretType: string, strategy: RotationStrategy): void {
    this.rotationStrategies.set(secretType, strategy);
    logger.info(`Registered rotation strategy for ${secretType}`);
  }

  /**
   * Registers default rotation strategies
   */
  private registerDefaultStrategies(): void {
    // API Key rotation - generates new random key
    this.registerStrategy('api_key', {
      generateNewValue: () => `sk_${generateSecureToken(32)}`
    });

    // Password rotation - generates secure random password
    this.registerStrategy('password', {
      generateNewValue: () => generateSecureToken(24)
    });

    // Database credentials rotation
    this.registerStrategy('database_credentials', {
      generateNewValue: () => {
        const username = `rez_${generateSecureToken(8)}`;
        const password = generateSecureToken(24);
        return JSON.stringify({ username, password });
      }
    });

    // Service token rotation
    this.registerStrategy('service_token', {
      generateNewValue: () => generateSecureToken(48)
    });

    // TLS certificate rotation
    this.registerStrategy('tls_certificate', {
      generateNewValue: () => generateSecureToken(64) // Placeholder - real impl would generate cert
    });

    // Encryption key rotation
    this.registerStrategy('encryption_key', {
      generateNewValue: () => generateSecureToken(32)
    });
  }

  /**
   * Rotates a specific secret
   */
  async rotateSecret(
    name: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; result?: RotationResult; error?: string }> {
    try {
      logger.info('Starting secret rotation', { name, userId });

      const secret = await Secret.findByName(name);

      if (!secret) {
        return { success: false, error: `Secret "${name}" not found` };
      }

      if (secret.status !== SecretStatus.ACTIVE) {
        return { success: false, error: `Secret is not in ACTIVE status` };
      }

      // Get strategy for this secret type
      const strategy = this.rotationStrategies.get(secret.type);

      // Update status to rotating
      secret.status = SecretStatus.ROTATING;
      await secret.save();

      // Execute before rotation hook
      if (strategy?.beforeRotation) {
        await strategy.beforeRotation(secret);
      }

      // Generate new value
      let newValue: string;
      if (strategy?.generateNewValue) {
        newValue = await strategy.generateNewValue();
      } else {
        // Default: generate random token
        newValue = generateSecureToken(32);
      }

      // Validate new value
      if (strategy?.validateNewValue) {
        const isValid = await strategy.validateNewValue(newValue);
        if (!isValid) {
          secret.status = SecretStatus.ACTIVE;
          await secret.save();
          return { success: false, error: 'Generated value failed validation' };
        }
      }

      // Calculate hashes
      const previousVersion = secret.versions.length;
      const newValueHash = sha256Hash(newValue);

      // Rotate the value
      const previousValueHash = secret.currentValueHash;
      secret.currentValueHash = newValueHash;
      secret.lastRotatedAt = new Date();
      secret.nextRotationAt = this.calculateNextRotationDate(secret.rotationSchedule, secret.rotationConfig.customCronExpression);
      secret.status = SecretStatus.ACTIVE;

      // Add new version
      secret.versions.push({
        version: previousVersion + 1,
        valueHash: newValueHash,
        createdAt: new Date(),
        createdBy: userId,
        reason: reason || 'Manual rotation'
      });

      // Trim versions if needed
      if (secret.versions.length > secret.maxVersions) {
        secret.versions = secret.versions.slice(-secret.maxVersions);
      }

      await secret.save();

      // Execute after rotation hook
      if (strategy?.afterRotation) {
        await strategy.afterRotation(secret, previousValueHash);
      }

      // Log audit event
      await AuditLog.log(AuditEventType.SECRET_ROTATED, {
        secretName: name,
        userId,
        metadata: {
          previousVersion,
          newVersion: previousVersion + 1,
          reason
        },
        success: true
      });

      const result: RotationResult = {
        success: true,
        previousVersion,
        newVersion: previousVersion + 1,
        rotatedAt: new Date(),
        nextRotationAt: secret.nextRotationAt!
      };

      logger.info('Secret rotated successfully', {
        name,
        previousVersion,
        newVersion: previousVersion + 1
      });

      return { success: true, result };
    } catch (error) {
      logger.error('Secret rotation failed', { name, error });

      // Reset status on failure
      const secret = await Secret.findByName(name);
      if (secret) {
        secret.status = SecretStatus.ACTIVE;
        await secret.save();
      }

      await AuditLog.log(AuditEventType.SECRET_ROTATED, {
        secretName: name,
        userId,
        metadata: { reason },
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Rotation failed'
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Rotation failed'
      };
    }
  }

  /**
   * Batch rotate multiple secrets
   */
  async rotateBatch(
    names: string[],
    userId: string
  ): Promise<{ success: string[]; failed: { name: string; error: string }[] }> {
    const success: string[] = [];
    const failed: { name: string; error: string }[] = [];

    for (const name of names) {
      const result = await this.rotateSecret(name, userId);
      if (result.success) {
        success.push(name);
      } else {
        failed.push({ name, error: result.error || 'Unknown error' });
      }
    }

    return { success, failed };
  }

  /**
   * Finds secrets that need rotation
   */
  async findSecretsRequiringRotation(): Promise<SecretDocument[]> {
    const now = new Date();

    return Secret.find({
      status: SecretStatus.ACTIVE,
      nextRotationAt: { $lte: now },
      'rotationConfig.rotateAutomatically': true
    });
  }

  /**
   * Processes all secrets due for rotation
   */
  async processScheduledRotations(): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
  }> {
    if (this.isRunning) {
      logger.warn('Rotation job already running, skipping');
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isRunning = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const secretsToRotate = await this.findSecretsRequiringRotation();
      logger.info(`Found ${secretsToRotate.length} secrets requiring rotation`);

      for (const secret of secretsToRotate) {
        processed++;
        const result = await this.rotateSecret(secret.name, 'system:scheduler');

        if (result.success) {
          succeeded++;
        } else {
          failed++;
          logger.error(`Failed to rotate ${secret.name}`, { error: result.error });
        }
      }

      logger.info(`Rotation job completed`, { processed, succeeded, failed });
    } catch (error) {
      logger.error('Rotation job failed', { error });
    } finally {
      this.isRunning = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Starts the automatic rotation scheduler
   */
  startScheduler(cronExpression: string = '0 */15 * * * *'): void {
    if (this.cronJob) {
      logger.warn('Scheduler already running');
      return;
    }

    this.cronJob = cron.schedule(cronExpression, async () => {
      logger.info('Running scheduled rotation job');
      await this.processScheduledRotations();
    });

    logger.info(`Rotation scheduler started with schedule: ${cronExpression}`);
  }

  /**
   * Stops the automatic rotation scheduler
   */
  stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Rotation scheduler stopped');
    }
  }

  /**
   * Schedules a one-time rotation
   */
  scheduleRotation(name: string, scheduledTime: Date, userId: string): void {
    const now = new Date();
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay <= 0) {
      logger.warn('Scheduled time is in the past');
      return;
    }

    setTimeout(async () => {
      logger.info(`Executing scheduled rotation for ${name}`);
      await this.rotateSecret(name, userId, 'Scheduled rotation');
    }, delay);

    logger.info(`Scheduled rotation for ${name} at ${scheduledTime.toISOString()}`);
  }

  /**
   * Cancels a scheduled rotation
   */
  cancelScheduledRotation(name: string): void {
    // In a production system, you'd track scheduled rotations in a database
    logger.info(`Cancelled scheduled rotation for ${name}`);
  }

  /**
   * Calculates the next rotation date
   */
  private calculateNextRotationDate(
    schedule: RotationSchedule,
    customCronExpression?: string
  ): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule) {
      case RotationSchedule.DAILY:
        next.setDate(next.getDate() + 1);
        next.setHours(0, 0, 0, 0);
        break;
      case RotationSchedule.WEEKLY:
        next.setDate(next.getDate() + 7);
        next.setHours(0, 0, 0, 0);
        break;
      case RotationSchedule.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        break;
      case RotationSchedule.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        next.setDate(1);
        next.setHours(0, 0, 0, 0);
        break;
      case RotationSchedule.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        next.setMonth(0, 1);
        next.setHours(0, 0, 0, 0);
        break;
      case RotationSchedule.CUSTOM:
        if (customCronExpression) {
          // Parse cron expression to get next date
          // This is simplified - in production use a proper cron parser
          next.setHours(next.getHours() + 1);
        }
        break;
      default:
        // Manual rotation
        next.setFullYear(next.getFullYear() + 10);
    }

    return next;
  }

  /**
   * Gets rotation status for a secret
   */
  async getRotationStatus(name: string): Promise<{
    status: string;
    lastRotated?: Date;
    nextRotation?: Date;
    schedule: string;
  } | null> {
    const secret = await Secret.findByName(name);

    if (!secret) {
      return null;
    }

    return {
      status: secret.status,
      lastRotated: secret.lastRotatedAt,
      nextRotation: secret.nextRotationAt,
      schedule: secret.rotationSchedule
    };
  }
}

export const secretRotationService = new SecretRotationService();
export default secretRotationService;
