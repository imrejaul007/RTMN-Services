/**
 * REZ Central Permissions - Main Permission Engine
 * Orchestrates RBAC + ABAC evaluation with caching and audit
 */

import { v4 as uuidv4 } from 'uuid';
import {
  PermissionCheck,
  PermissionRequest,
  PermissionResult,
  PermissionConfig,
  PermissionContext,
  AuditEntry,
  Policy,
  UserType,
  Action,
} from './types';
import { RBACEngine } from './RBACEngine';
import { ABACEngine } from './ABACEngine';
import { PolicyEngine } from './policies/PolicyEngine';
import { PermissionCache } from './cache/PermissionCache';
import { AccessAudit } from './audit/AccessAudit';
import { MerchantPermissions } from './modules/MerchantPermissions';
import { ConsumerPermissions } from './modules/ConsumerPermissions';
import { AdminPermissions } from './modules/AdminPermissions';
import { StaffPermissions } from './modules/StaffPermissions';
import { APIKeyPermissions } from './modules/APIKeyPermissions';
import { WebhookPermissions } from './modules/WebhookPermissions';

export class PermissionEngine {
  private rbac: RBACEngine;
  private abac: ABACEngine;
  private policyEngine: PolicyEngine;
  private cache: PermissionCache;
  private audit: AccessAudit;
  private merchantPerms: MerchantPermissions;
  private consumerPerms: ConsumerPermissions;
  private adminPerms: AdminPermissions;
  private staffPerms: StaffPermissions;
  private apiKeyPerms: APIKeyPermissions;
  private webhookPerms: WebhookPermissions;

  private config: PermissionConfig;

  constructor(config?: Partial<PermissionConfig>) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      auditEnabled: true,
      defaultDeny: true,
      policyCombineAlgorithm: 'deny-overrides',
      ...config,
    };

    this.rbac = new RBACEngine();
    this.abac = new ABACEngine();
    this.policyEngine = new PolicyEngine(this.config.policyCombineAlgorithm);
    this.cache = new PermissionCache(this.config.cacheTTL);
    this.audit = new AccessAudit();

    // Initialize module-specific permission handlers
    this.merchantPerms = new MerchantPermissions();
    this.consumerPerms = new ConsumerPermissions();
    this.adminPerms = new AdminPermissions();
    this.staffPerms = new StaffPermissions();
    this.apiKeyPerms = new APIKeyPermissions();
    this.webhookPerms = new WebhookPermissions();
  }

  /**
   * Main permission check entry point
   */
  async check(request: PermissionRequest): Promise<PermissionResult> {
    const startTime = Date.now();
    const requestId = uuidv4();

    try {
      // 1. Build full context
      const context: PermissionContext = this.buildContext(request.context);

      // 2. Check cache first
      if (this.config.cacheEnabled) {
        const cached = await this.cache.get(request, request.user_type);
        if (cached) {
          const evaluationTime = Date.now() - startTime;
          return {
            ...cached,
            evaluation_time_ms: evaluationTime,
          };
        }
      }

      // 3. Evaluate RBAC (Role-Based Access Control)
      const rbacResult = await this.rbac.evaluate({
        user_id: request.user_id,
        user_type: request.user_type,
        roles: request.roles,
        resource: request.resource,
        action: request.action,
        resource_id: request.resource_id,
      });

      // 4. If RBAC grants access, evaluate ABAC conditions
      let abacResult: PermissionResult | null = null;
      if (rbacResult.granted) {
        abacResult = await this.abac.evaluate({
          user_id: request.user_id,
          user_type: request.user_type,
          roles: request.roles,
          attributes: request.attributes,
          resource: request.resource,
          resource_id: request.resource_id,
          action: request.action,
          context,
        });
      }

      // 5. Evaluate custom policies
      const policyResult = await this.policyEngine.evaluate({
        subject: {
          id: request.user_id,
          type: request.user_type,
          roles: request.roles,
          attributes: request.attributes,
        },
        resource: {
          type: request.resource,
          id: request.resource_id,
        },
        action: request.action,
        environment: context,
      });

      // 6. Combine results using configured algorithm
      const finalResult = this.combineResults(rbacResult, abacResult, policyResult);

      const evaluationTime = Date.now() - startTime;

      // 7. Build permission result
      const result: PermissionResult = {
        granted: finalResult.granted,
        reason: finalResult.reason,
        matched_policy: finalResult.matched_policy,
        evaluated_policies: [
          ...rbacResult.evaluated_policies,
          ...(abacResult?.evaluated_policies || []),
          ...policyResult.evaluated_policies,
        ],
        evaluation_time_ms: evaluationTime,
        obligations: policyResult.obligations,
        advice: policyResult.advice,
      };

      // 8. Cache the result
      if (this.config.cacheEnabled && result.granted) {
        await this.cache.set(request, request.user_type, result);
      }

      // 9. Audit the decision
      if (this.config.auditEnabled) {
        await this.audit.log({
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          request_id: requestId,
          user_id: request.user_id,
          user_type: request.user_type,
          action: request.action,
          resource: request.resource,
          resource_id: request.resource_id || '',
          decision: result.granted ? 'granted' : 'denied',
          reason: result.reason,
          policies_evaluated: result.evaluated_policies,
          matched_policy: result.matched_policy,
          context,
          evaluation_time_ms: evaluationTime,
          ip_address: context.ip_address,
        });
      }

      return result;
    } catch (error) {
      const evaluationTime = Date.now() - startTime;
      console.error('Permission check failed:', error);

      return {
        granted: false,
        reason: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        evaluated_policies: [],
        evaluation_time_ms: evaluationTime,
      };
    }
  }

  /**
   * Check permissions and return full PermissionCheck object
   */
  async checkFull(request: PermissionRequest): Promise<PermissionCheck> {
    const startTime = Date.now();
    const context: PermissionContext = this.buildContext(request.context);

    const result = await this.check(request);

    return {
      user_id: request.user_id,
      user_type: request.user_type,
      roles: request.roles,
      attributes: request.attributes,
      resource: request.resource,
      resource_id: request.resource_id || '',
      action: request.action,
      context,
      granted: result.granted,
      reason: result.reason,
      policy_matched: result.matched_policy || 'none',
      evaluated_at: new Date().toISOString(),
      evaluation_time_ms: result.evaluation_time_ms,
    };
  }

  /**
   * Batch permission check for multiple actions on same resource
   */
  async checkBatch(request: PermissionRequest): Promise<Map<Action, PermissionResult>> {
    const actions: Action[] = ['create', 'read', 'update', 'delete'];
    const results = new Map<Action, PermissionResult>();

    for (const action of actions) {
      results.set(action, await this.check({
        ...request,
        action,
      }));
    }

    return results;
  }

  /**
   * Check if user has any of the specified roles
   */
  async hasRole(userId: string, roles: string[]): Promise<boolean> {
    return this.rbac.hasRole(userId, roles);
  }

  /**
   * Check if user has specific permission
   */
  async hasPermission(
    userId: string,
    userType: UserType,
    roles: string[],
    resource: string,
    action: Action,
    attributes?: Record<string, unknown>
  ): Promise<boolean> {
    const result = await this.check({
      user_id: userId,
      user_type: userType,
      roles,
      attributes: attributes || {},
      resource,
      action,
    });
    return result.granted;
  }

  /**
   * Module-specific permission checks
   */
  async checkMerchantPermission(
    merchantId: string,
    userId: string,
    action: Action,
    resource: string,
    resourceId?: string
  ): Promise<PermissionResult> {
    return this.merchantPerms.check({
      merchantId,
      userId,
      action,
      resource,
      resourceId,
    });
  }

  async checkConsumerPermission(
    consumerId: string,
    userId: string,
    action: Action,
    resource: string,
    resourceId?: string
  ): Promise<PermissionResult> {
    return this.consumerPerms.check({
      consumerId,
      userId,
      action,
      resource,
      resourceId,
    });
  }

  async checkAdminPermission(
    userId: string,
    action: Action,
    resource: string,
    resourceId?: string
  ): Promise<PermissionResult> {
    return this.adminPerms.check({
      userId,
      action,
      resource,
      resourceId,
    });
  }

  async checkStaffPermission(
    staffId: string,
    storeId: string,
    userId: string,
    action: Action,
    resource: string,
    resourceId?: string
  ): Promise<PermissionResult> {
    return this.staffPerms.check({
      staffId,
      storeId,
      userId,
      action,
      resource,
      resourceId,
    });
  }

  async checkAPIKeyPermission(
    apiKeyId: string,
    action: Action,
    resource: string,
    resourceId?: string
  ): Promise<PermissionResult> {
    return this.apiKeyPerms.check({
      apiKeyId,
      action,
      resource,
      resourceId,
    });
  }

  async checkWebhookPermission(
    webhookId: string,
    event: string,
    resource: string
  ): Promise<PermissionResult> {
    return this.webhookPerms.check({
      webhookId,
      event,
      resource,
    });
  }

  /**
   * Policy management
   */
  async addPolicy(policy: Policy): Promise<void> {
    await this.policyEngine.addPolicy(policy);
    this.cache.invalidateAll();
  }

  async removePolicy(policyId: string): Promise<void> {
    await this.policyEngine.removePolicy(policyId);
    this.cache.invalidateAll();
  }

  async getPolicies(): Promise<Policy[]> {
    return this.policyEngine.getPolicies();
  }

  /**
   * Cache management
   */
  async invalidateCache(userId?: string, resource?: string): Promise<void> {
    if (userId) {
      await this.cache.invalidateByUser(userId);
    }
    if (resource) {
      await this.cache.invalidateByResource(resource);
    }
    if (!userId && !resource) {
      await this.cache.invalidateAll();
    }
  }

  /**
   * Audit queries
   */
  async getAuditLog(filters: {
    user_id?: string;
    resource?: string;
    action?: Action;
    decision?: 'granted' | 'denied';
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditEntry[]> {
    return this.audit.query(filters);
  }

  /**
   * Configuration
   */
  updateConfig(config: Partial<PermissionConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.cacheTTL) {
      this.cache.setTTL(config.cacheTTL);
    }
    if (config.policyCombineAlgorithm) {
      this.policyEngine.setCombineAlgorithm(config.policyCombineAlgorithm);
    }
  }

  getConfig(): PermissionConfig {
    return { ...this.config };
  }

  // Private methods

  private buildContext(context?: Partial<PermissionContext>): PermissionContext {
    return {
      ip_address: context?.ip_address,
      device_trusted: context?.device_trusted ?? false,
      device_id: context?.device_id,
      location: context?.location,
      country: context?.country,
      time_range: context?.time_range,
      amount_threshold: context?.amount_threshold,
      merchant_id: context?.merchant_id,
      store_id: context?.store_id,
      session_age: context?.session_age ?? 0,
      request_origin: context?.request_origin ?? 'web',
    };
  }

  private combineResults(
    rbacResult: PermissionResult,
    abacResult: PermissionResult | null,
    policyResult: PermissionResult
  ): PermissionResult {
    const results = [rbacResult, abacResult, policyResult].filter(Boolean) as PermissionResult[];

    switch (this.config.policyCombineAlgorithm) {
      case 'first-applicable':
        return this.firstApplicable(results);

      case 'deny-overrides':
        return this.denyOverrides(results);

      case 'permit-overrides':
        return this.permitOverrides(results);

      case 'priority-order':
        return this.priorityOrder(results);

      default:
        return this.denyOverrides(results);
    }
  }

  private firstApplicable(results: PermissionResult[]): PermissionResult {
    for (const result of results) {
      if (result.matched_policy) {
        return result;
      }
    }
    return this.config.defaultDeny
      ? { granted: false, reason: 'No matching policy found', evaluated_policies: [], evaluation_time_ms: 0 }
      : { granted: true, reason: 'Default permit (no matching policy)', evaluated_policies: [], evaluation_time_ms: 0 };
  }

  private denyOverrides(results: PermissionResult[]): PermissionResult {
    // If any result is denied, deny takes precedence
    const denied = results.find(r => !r.granted);
    if (denied) {
      return denied;
    }

    // If any result is granted, check for conflicts
    const granted = results.find(r => r.granted);
    if (granted) {
      return granted;
    }

    return this.config.defaultDeny
      ? { granted: false, reason: 'No matching policy found', evaluated_policies: [], evaluation_time_ms: 0 }
      : { granted: true, reason: 'Default permit (no matching policy)', evaluated_policies: [], evaluation_time_ms: 0 };
  }

  private permitOverrides(results: PermissionResult[]): PermissionResult {
    // If any result is granted, permit takes precedence
    const permitted = results.find(r => r.granted);
    if (permitted) {
      return permitted;
    }

    // All results are denied
    const denied = results.find(r => !r.granted);
    if (denied) {
      return denied;
    }

    return this.config.defaultDeny
      ? { granted: false, reason: 'No matching policy found', evaluated_policies: [], evaluation_time_ms: 0 }
      : { granted: true, reason: 'Default permit (no matching policy)', evaluated_policies: [], evaluation_time_ms: 0 };
  }

  private priorityOrder(results: PermissionResult[]): PermissionResult {
    // Results are assumed to be pre-sorted by priority
    const first = results[0];
    if (first) {
      return first;
    }

    return this.config.defaultDeny
      ? { granted: false, reason: 'No matching policy found', evaluated_policies: [], evaluation_time_ms: 0 }
      : { granted: true, reason: 'Default permit (no matching policy)', evaluated_policies: [], evaluation_time_ms: 0 };
  }
}

// Singleton instance for convenience
let engineInstance: PermissionEngine | null = null;

export function getPermissionEngine(config?: Partial<PermissionConfig>): PermissionEngine {
  if (!engineInstance) {
    engineInstance = new PermissionEngine(config);
  }
  return engineInstance;
}

export function resetPermissionEngine(): void {
  engineInstance = null;
}
