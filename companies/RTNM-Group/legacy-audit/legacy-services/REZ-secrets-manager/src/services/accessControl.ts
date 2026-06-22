import { Policy, PolicyDocument } from '../models';
import { ServiceIdentity, ServiceIdentityDocument } from '../models/ServiceIdentity';
import { AuditLog } from '../models/AuditLog';
import { generateApiKey, hashApiKey, verifyApiKey, sha256Hash } from '../utils/encryption';
import { createLogger } from '../utils/logger';
import {
  IAccessPolicy,
  IPolicyRule,
  AccessLevel,
  AuditEventType,
  CreatePolicyInput
} from '../types';

const logger = createLogger('accessControl');

export interface AccessDecision {
  allowed: boolean;
  reason: string;
  policy?: string;
}

export interface PolicyEvaluationContext {
  serviceId: string;
  resource: string;
  action: string;
  metadata?: Record<string, unknown>;
}

export class AccessControlService {
  /**
   * Creates a new access policy
   */
  async createPolicy(
    input: CreatePolicyInput,
    userId: string
  ): Promise<{ success: boolean; policy?: PolicyDocument; error?: string }> {
    try {
      logger.info('Creating policy', { name: input.name, userId });

      // Check if policy with same name exists
      const existing = await Policy.findByName(input.name);
      if (existing) {
        return { success: false, error: `Policy "${input.name}" already exists` };
      }

      const policy = new Policy({
        name: input.name,
        description: input.description,
        rules: input.rules.map(rule => ({
          resource: rule.resource,
          actions: rule.actions,
          conditions: rule.conditions,
          effect: rule.effect
        })),
        priority: input.priority || 0,
        appliesTo: input.appliesTo || [],
        isActive: true,
        createdBy: userId
      });

      await policy.save();

      // Log audit event
      await AuditLog.log(AuditEventType.POLICY_CREATED, {
        policyId: policy._id.toString(),
        userId,
        metadata: {
          name: input.name,
          rulesCount: input.rules.length
        },
        success: true
      });

      logger.info('Policy created successfully', { name: input.name, policyId: policy._id });

      return { success: true, policy };
    } catch (error) {
      logger.error('Failed to create policy', { name: input.name, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create policy'
      };
    }
  }

  /**
   * Gets a policy by ID
   */
  async getPolicy(policyId: string): Promise<PolicyDocument | null> {
    return Policy.findById(policyId);
  }

  /**
   * Gets a policy by name
   */
  async getPolicyByName(name: string): Promise<PolicyDocument | null> {
    return Policy.findByName(name);
  }

  /**
   * Updates a policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<CreatePolicyInput>,
    userId: string
  ): Promise<{ success: boolean; policy?: PolicyDocument; error?: string }> {
    try {
      const policy = await Policy.findById(policyId);

      if (!policy) {
        return { success: false, error: 'Policy not found' };
      }

      if (updates.name) policy.name = updates.name;
      if (updates.description !== undefined) policy.description = updates.description;
      if (updates.rules) {
        policy.rules = updates.rules.map(rule => ({
          resource: rule.resource,
          actions: rule.actions,
          conditions: rule.conditions,
          effect: rule.effect
        }));
      }
      if (updates.priority !== undefined) policy.priority = updates.priority;
      if (updates.appliesTo) policy.appliesTo = updates.appliesTo;

      await policy.save();

      await AuditLog.log(AuditEventType.POLICY_UPDATED, {
        policyId,
        userId,
        metadata: { updatedFields: Object.keys(updates) },
        success: true
      });

      return { success: true, policy };
    } catch (error) {
      logger.error('Failed to update policy', { policyId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update policy'
      };
    }
  }

  /**
   * Deletes a policy
   */
  async deletePolicy(
    policyId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const policy = await Policy.findById(policyId);

      if (!policy) {
        return { success: false, error: 'Policy not found' };
      }

      await Policy.deleteOne({ _id: policyId });

      await AuditLog.log(AuditEventType.POLICY_DELETED, {
        policyId,
        userId,
        success: true
      });

      logger.info('Policy deleted', { policyId });
      return { success: true };
    } catch (error) {
      logger.error('Failed to delete policy', { policyId, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete policy'
      };
    }
  }

  /**
   * Lists all policies
   */
  async listPolicies(options: {
    serviceId?: string;
    active?: boolean;
    limit?: number;
    page?: number;
  } = {}): Promise<{ policies: PolicyDocument[]; total: number }> {
    const query: Record<string, unknown> = {};

    if (options.active !== undefined) {
      query.isActive = options.active;
    }

    if (options.serviceId) {
      query.$or = [
        { appliesTo: options.serviceId },
        { appliesTo: { $size: 0 } }
      ];
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    const [policies, total] = await Promise.all([
      Policy.find(query)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Policy.countDocuments(query)
    ]);

    return { policies, total };
  }

  /**
   * Evaluates access for a given context
   */
  async evaluateAccess(context: PolicyEvaluationContext): Promise<AccessDecision> {
    try {
      const policies = await Policy.findForService(context.serviceId);

      if (policies.length === 0) {
        return {
          allowed: false,
          reason: 'No policies apply to this service'
        };
      }

      // Evaluate each policy
      for (const policy of policies) {
        const result = policy.evaluateAccess(
          context.serviceId,
          context.resource,
          context.action
        );

        if (!result.allowed) {
          await AuditLog.log(AuditEventType.ACCESS_REVOKED, {
            serviceId: context.serviceId,
            policyId: policy._id.toString(),
            metadata: { resource: context.resource, action: context.action },
            success: false,
            errorMessage: result.reason
          });

          return {
            allowed: false,
            reason: result.reason,
            policy: policy.name
          };
        }
      }

      await AuditLog.log(AuditEventType.ACCESS_GRANTED, {
        serviceId: context.serviceId,
        metadata: { resource: context.resource, action: context.action },
        success: true
      });

      return {
        allowed: true,
        reason: 'Access granted by policies'
      };
    } catch (error) {
      logger.error('Access evaluation failed', { context, error });
      return {
        allowed: false,
        reason: 'Access evaluation error'
      };
    }
  }

  /**
   * Checks if a service can access a specific secret
   */
  async canAccessSecret(
    serviceId: string,
    secretName: string,
    requiredAccess: AccessLevel
  ): Promise<boolean> {
    const action = this.accessLevelToAction(requiredAccess);
    return (await this.evaluateAccess({
      serviceId,
      resource: `secrets/${secretName}`,
      action
    })).allowed;
  }

  /**
   * Converts access level to action
   */
  private accessLevelToAction(level: AccessLevel): string {
    switch (level) {
      case AccessLevel.READ:
        return 'read';
      case AccessLevel.WRITE:
        return 'update';
      case AccessLevel.ADMIN:
        return 'grant';
      case AccessLevel.OWNER:
        return '*';
      default:
        return 'read';
    }
  }

  /**
   * Registers a new service identity
   */
  async registerService(
    serviceName: string,
    permissions: string[] = [],
    metadata: Record<string, unknown> = {}
  ): Promise<{ success: boolean; service?: ServiceIdentityDocument; apiKey?: string; error?: string }> {
    try {
      const serviceId = `svc_${sha256Hash(serviceName + Date.now()).substring(0, 16)}`;
      const { key: apiKey, prefix } = generateApiKey();
      const apiKeyHash = await hashApiKey(apiKey);

      const service = new ServiceIdentity({
        serviceId,
        serviceName,
        apiKeyHash,
        permissions,
        metadata,
        isActive: true
      });

      await service.save();

      logger.info('Service registered', { serviceId, serviceName });

      return {
        success: true,
        service,
        apiKey // Only returned once!
      };
    } catch (error) {
      logger.error('Failed to register service', { serviceName, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register service'
      };
    }
  }

  /**
   * Authenticates a service using API key
   */
  async authenticateService(
    apiKey: string
  ): Promise<{ success: boolean; service?: ServiceIdentityDocument; error?: string }> {
    try {
      // We need to find the service by trying all services
      // In production, you'd use a key prefix or store a hash lookup
      const services = await ServiceIdentity.findActive();

      for (const service of services) {
        const isValid = await verifyApiKey(apiKey, service.apiKeyHash);
        if (isValid) {
          // Record access
          service.lastAccessedAt = new Date();
          await service.save();

          await AuditLog.log(AuditEventType.AUTH_SUCCESS, {
            serviceId: service.serviceId,
            success: true
          });

          return { success: true, service };
        }
      }

      await AuditLog.log(AuditEventType.AUTH_FAILURE, {
        metadata: { reason: 'Invalid API key' },
        success: false
      });

      return { success: false, error: 'Invalid API key' };
    } catch (error) {
      logger.error('Authentication failed', { error });
      await AuditLog.log(AuditEventType.AUTH_FAILURE, {
        metadata: { error: error instanceof Error?.message },
        success: false
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * Gets a service by ID
   */
  async getService(serviceId: string): Promise<ServiceIdentityDocument | null> {
    return ServiceIdentity.findByServiceId(serviceId);
  }

  /**
   * Updates service permissions
   */
  async updateServicePermissions(
    serviceId: string,
    permissions: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const service = await ServiceIdentity.findByServiceId(serviceId);
      if (!service) {
        return { success: false, error: 'Service not found' };
      }

      service.permissions = permissions;
      await service.save();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update permissions'
      };
    }
  }

  /**
   * Deactivates a service
   */
  async deactivateService(serviceId: string): Promise<boolean> {
    return ServiceIdentity.deactivate(serviceId);
  }

  /**
   * Reactivates a service
   */
  async activateService(serviceId: string): Promise<boolean> {
    return ServiceIdentity.activate(serviceId);
  }

  /**
   * Gets effective permissions for a service
   */
  async getEffectivePermissions(serviceId: string): Promise<string[]> {
    const service = await ServiceIdentity.findByServiceId(serviceId);

    if (!service || !service.isActive) {
      return [];
    }

    return service.permissions;
  }

  /**
   * Grants temporary access to a secret
   */
  async grantTemporaryAccess(
    serviceId: string,
    secretName: string,
    ttlSeconds: number,
    reason: string
  ): Promise<{ success: boolean; accessToken?: string; expiresAt?: Date; error?: string }> {
    try {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const accessToken = sha256Hash(`${serviceId}:${secretName}:${Date.now()}`);

      // Log the grant
      await AuditLog.log(AuditEventType.ACCESS_GRANTED, {
        serviceId,
        secretName,
        metadata: {
          ttl: ttlSeconds,
          reason,
          accessToken: accessToken.substring(0, 8) + '...'
        },
        success: true
      });

      return {
        success: true,
        accessToken,
        expiresAt
      };
    } catch (error) {
      logger.error('Failed to grant temporary access', { serviceId, secretName, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to grant access'
      };
    }
  }

  /**
   * Revokes all access for a service
   */
  async revokeAllAccess(serviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.deactivateService(serviceId);

      await AuditLog.log(AuditEventType.ACCESS_REVOKED, {
        serviceId,
        metadata: { type: 'all' },
        success: true
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to revoke access'
      };
    }
  }
}

export const accessControlService = new AccessControlService();
export default accessControlService;
