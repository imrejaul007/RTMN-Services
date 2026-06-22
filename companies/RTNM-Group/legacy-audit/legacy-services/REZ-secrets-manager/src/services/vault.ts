import { Secret, SecretDocument } from '../models';
import { AuditLog } from '../models/AuditLog';
import { encrypt, decrypt, sha256Hash, generateSecureToken } from '../utils/encryption';
import { createLogger } from '../utils/logger';
import {
  ISecret,
  ISecretVersion,
  SecretType,
  SecretStatus,
  RotationSchedule,
  CreateSecretInput,
  UpdateSecretInput,
  ApiResponse,
  DynamicSecretResult,
  AuditEventType
} from '../types';

const logger = createLogger('vault');

export class VaultService {
  /**
   * Creates a new secret in the vault
   */
  async createSecret(
    input: CreateSecretInput,
    userId: string
  ): Promise<ApiResponse<SecretDocument>> {
    try {
      logger.info('Creating new secret', { name: input.name, type: input.type, userId });

      // Check if secret already exists
      const existing = await Secret.findByName(input.name);
      if (existing) {
        return {
          success: false,
          error: {
            code: 'SECRET_EXISTS',
            message: `Secret with name "${input.name}" already exists`
          },
          timestamp: new Date().toISOString()
        };
      }

      // Encrypt the secret value
      const encryptedValue = encrypt(input.value);

      // Calculate hash for comparison
      const valueHash = sha256Hash(input.value);

      // Calculate next rotation date
      const nextRotationAt = this.calculateNextRotationDate(input.rotationSchedule);

      // Create secret document
      const secret = new Secret({
        name: input.name,
        type: input.type,
        currentValueHash: valueHash,
        versions: [{
          version: 1,
          valueHash,
          createdAt: new Date(),
          createdBy: userId
        }],
        metadata: input.metadata || {},
        tags: input.tags || [],
        rotationSchedule: input.rotationSchedule || RotationSchedule.MANUAL,
        rotationConfig: {
          rotateAutomatically: input.rotationConfig?.rotateAutomatically || false,
          customCronExpression: input.rotationConfig?.customCronExpression,
          rotationWindow: input.rotationConfig?.rotationWindow,
          notifyBeforeRotation: input.rotationConfig?.notifyBeforeRotation
        },
        allowedServices: input.allowedServices || [],
        maxVersions: input.maxVersions || 10,
        status: SecretStatus.ACTIVE,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
        isDynamic: input.isDynamic || false,
        nextRotationAt,
        createdBy: userId
      });

      await secret.save();

      // Log audit event
      await AuditLog.log(AuditEventType.SECRET_CREATED, {
        secretName: input.name,
        userId,
        metadata: {
          type: input.type,
          tags: input.tags,
          rotationSchedule: input.rotationSchedule
        },
        success: true
      });

      logger.info('Secret created successfully', { name: input.name, secretId: secret._id });

      return {
        success: true,
        data: secret,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to create secret', { name: input.name, error });
      return {
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create secret'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Retrieves a secret by name
   */
  async getSecret(
    name: string,
    serviceId: string,
    includeValue: boolean = true
  ): Promise<ApiResponse<SecretDocument>> {
    try {
      logger.info('Retrieving secret', { name, serviceId });

      const secret = await Secret.findByName(name);

      if (!secret) {
        await AuditLog.log(AuditEventType.SECRET_READ, {
          secretName: name,
          serviceId,
          success: false,
          errorMessage: 'Secret not found'
        });

        return {
          success: false,
          error: {
            code: 'SECRET_NOT_FOUND',
            message: `Secret "${name}" not found`
          },
          timestamp: new Date().toISOString()
        };
      }

      // Check if service has access
      if (!secret.canBeAccessedBy(serviceId)) {
        await AuditLog.log(AuditEventType.SECRET_READ, {
          secretName: name,
          serviceId,
          success: false,
          errorMessage: 'Access denied'
        });

        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Service does not have access to this secret'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Check if secret is expired
      if (secret.isExpired()) {
        await AuditLog.log(AuditEventType.SECRET_READ, {
          secretName: name,
          serviceId,
          success: false,
          errorMessage: 'Secret expired'
        });

        return {
          success: false,
          error: {
            code: 'SECRET_EXPIRED',
            message: 'Secret has expired'
          },
          timestamp: new Date().toISOString()
        };
      }

      // Log successful access
      await AuditLog.log(AuditEventType.SECRET_READ, {
        secretName: name,
        serviceId,
        metadata: { accessType: includeValue ? 'value' : 'metadata' },
        success: true
      });

      logger.info('Secret retrieved successfully', { name, serviceId });

      return {
        success: true,
        data: secret,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to retrieve secret', { name, error });
      return {
        success: false,
        error: {
          code: 'RETRIEVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to retrieve secret'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Updates a secret's metadata or value
   */
  async updateSecret(
    name: string,
    input: UpdateSecretInput,
    userId: string
  ): Promise<ApiResponse<SecretDocument>> {
    try {
      logger.info('Updating secret', { name, userId });

      const secret = await Secret.findByName(name);

      if (!secret) {
        return {
          success: false,
          error: {
            code: 'SECRET_NOT_FOUND',
            message: `Secret "${name}" not found`
          },
          timestamp: new Date().toISOString()
        };
      }

      // Update metadata
      if (input.metadata !== undefined) {
        secret.metadata = { ...secret.metadata, ...input.metadata };
      }

      // Update tags
      if (input.tags !== undefined) {
        secret.tags = input.tags;
      }

      // Update rotation settings
      if (input.rotationSchedule !== undefined) {
        secret.rotationSchedule = input.rotationSchedule;
        secret.nextRotationAt = this.calculateNextRotationDate(input.rotationSchedule);
      }

      if (input.rotationConfig !== undefined) {
        secret.rotationConfig = {
          ...secret.rotationConfig,
          ...input.rotationConfig
        };
      }

      // Update allowed services
      if (input.allowedServices !== undefined) {
        secret.allowedServices = input.allowedServices;
      }

      // Update expiry
      if (input.expiresAt !== undefined) {
        secret.expiresAt = new Date(input.expiresAt);
      }

      // Update value if provided
      if (input.value !== undefined) {
        secret.currentValueHash = sha256Hash(input.value);
      }

      await secret.save();

      // Log audit event
      await AuditLog.log(AuditEventType.SECRET_UPDATED, {
        secretName: name,
        userId,
        metadata: {
          updatedFields: Object.keys(input)
        },
        success: true
      });

      logger.info('Secret updated successfully', { name });

      return {
        success: true,
        data: secret,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to update secret', { name, error });
      return {
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update secret'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Deletes a secret
   */
  async deleteSecret(
    name: string,
    userId: string,
    permanent: boolean = false
  ): Promise<ApiResponse<void>> {
    try {
      logger.info('Deleting secret', { name, permanent });

      const secret = await Secret.findByName(name);

      if (!secret) {
        return {
          success: false,
          error: {
            code: 'SECRET_NOT_FOUND',
            message: `Secret "${name}" not found`
          },
          timestamp: new Date().toISOString()
        };
      }

      if (permanent) {
        await Secret.deleteOne({ name });
        logger.info('Secret permanently deleted', { name });
      } else {
        // Soft delete - mark as revoked
        secret.status = SecretStatus.REVOKED;
        await secret.save();
        logger.info('Secret soft deleted (revoked)', { name });
      }

      // Log audit event
      await AuditLog.log(AuditEventType.SECRET_DELETED, {
        secretName: name,
        userId,
        metadata: { permanent },
        success: true
      });

      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to delete secret', { name, error });
      return {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete secret'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Gets version history for a secret
   */
  async getSecretHistory(
    name: string,
    limit: number = 10
  ): Promise<ApiResponse<ISecretVersion[]>> {
    try {
      const secret = await Secret.findByName(name);

      if (!secret) {
        return {
          success: false,
          error: {
            code: 'SECRET_NOT_FOUND',
            message: `Secret "${name}" not found`
          },
          timestamp: new Date().toISOString()
        };
      }

      const versions = secret.versions.slice(-limit).reverse();

      return {
        success: true,
        data: versions,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to get secret history', { name, error });
      return {
        success: false,
        error: {
          code: 'HISTORY_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get secret history'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Lists all secrets (metadata only)
   */
  async listSecrets(
    options: {
      type?: SecretType;
      tag?: string;
      status?: SecretStatus;
      limit?: number;
      page?: number;
    } = {}
  ): Promise<{ secrets: Partial<SecretDocument>[]; total: number }> {
    try {
      const query: Record<string, unknown> = {};

      if (options.type) {
        query.type = options.type;
      }

      if (options.tag) {
        query.tags = options.tag;
      }

      if (options.status) {
        query.status = options.status;
      }

      const page = options.page || 1;
      const limit = options.limit || 20;
      const skip = (page - 1) * limit;

      const [secrets, total] = await Promise.all([
        Secret.find(query)
          .select('-currentValueHash -versions.valueHash')
          .sort({ updatedAt: -1 })
          .skip(skip)
          .limit(limit),
        Secret.countDocuments(query)
      ]);

      return { secrets, total };
    } catch (error) {
      logger.error('Failed to list secrets', { error });
      throw error;
    }
  }

  /**
   * Creates a dynamic secret (temporary credentials)
   */
  async createDynamicSecret(
    name: string,
    ttl: number = 3600
  ): Promise<ApiResponse<DynamicSecretResult>> {
    try {
      logger.info('Creating dynamic secret', { name, ttl });

      const secret = await Secret.findByName(name);

      if (!secret) {
        return {
          success: false,
          error: {
            code: 'SECRET_NOT_FOUND',
            message: `Secret "${name}" not found`
          },
          timestamp: new Date().toISOString()
        };
      }

      // Generate dynamic credentials
      const accessKey = `ak_${generateSecureToken(16)}`;
      const secretKey = generateSecureToken(32);
      const leaseId = `lease_${generateSecureToken(16)}`;
      const expiresAt = new Date(Date.now() + ttl * 1000);

      // Log audit event
      await AuditLog.log(AuditEventType.DYNAMIC_SECRET_CREATED, {
        secretName: name,
        metadata: {
          leaseId,
          expiresAt,
          ttl
        },
        success: true
      });

      logger.info('Dynamic secret created', { name, leaseId });

      return {
        success: true,
        data: {
          success: true,
          secretName: name,
          accessKey,
          secretKey,
          expiresAt,
          leaseId
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to create dynamic secret', { name, error });
      return {
        success: false,
        error: {
          code: 'DYNAMIC_SECRET_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create dynamic secret'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Revokes a dynamic secret lease
   */
  async revokeDynamicSecret(leaseId: string, userId: string): Promise<ApiResponse<void>> {
    try {
      logger.info('Revoking dynamic secret', { leaseId });

      // Log audit event
      await AuditLog.log(AuditEventType.DYNAMIC_SECRET_REVOKED, {
        userId,
        metadata: { leaseId },
        success: true
      });

      return {
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to revoke dynamic secret', { leaseId, error });
      return {
        success: false,
        error: {
          code: 'REVOKE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to revoke dynamic secret'
        },
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Verifies a secret value
   */
  async verifySecret(name: string, value: string): Promise<boolean> {
    const secret = await Secret.findByName(name);
    if (!secret) return false;

    const hash = sha256Hash(value);
    return secret.currentValueHash === hash;
  }

  /**
   * Calculates the next rotation date based on schedule
   */
  private calculateNextRotationDate(schedule?: RotationSchedule): Date {
    const now = new Date();
    const next = new Date(now);

    switch (schedule) {
      case RotationSchedule.DAILY:
        next.setDate(next.getDate() + 1);
        break;
      case RotationSchedule.WEEKLY:
        next.setDate(next.getDate() + 7);
        break;
      case RotationSchedule.MONTHLY:
        next.setMonth(next.getMonth() + 1);
        break;
      case RotationSchedule.QUARTERLY:
        next.setMonth(next.getMonth() + 3);
        break;
      case RotationSchedule.YEARLY:
        next.setFullYear(next.getFullYear() + 1);
        break;
      default:
        // Manual rotation - set far in future
        next.setFullYear(next.getFullYear() + 10);
    }

    return next;
  }
}

export const vaultService = new VaultService();
export default vaultService;
