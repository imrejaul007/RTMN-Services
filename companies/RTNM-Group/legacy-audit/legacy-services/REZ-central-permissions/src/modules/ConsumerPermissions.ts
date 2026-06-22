/**
 * REZ Central Permissions - Consumer Permissions Module
 * Handles consumer-specific permission checks
 */

import { PermissionResult, Action } from '../types';

interface ConsumerPermissionRequest {
  consumerId: string;
  userId: string;
  action: Action;
  resource: string;
  resourceId?: string;
}

// Consumer resource permissions
const consumerResourcePermissions: Record<string, Action[]> = {
  order: ['create', 'read', 'update', 'delete'],
  cart: ['create', 'read', 'update', 'delete'],
  wishlist: ['create', 'read', 'update', 'delete'],
  review: ['create', 'read', 'update', 'delete'],
  wallet: ['read', 'update'],
  address: ['create', 'read', 'update', 'delete'],
  payment_method: ['create', 'read', 'update', 'delete'],
  notification: ['read', 'update'],
  profile: ['read', 'update'],
};

// Consumer tier permissions
const tierPermissions: Record<string, { resource: string; actions: Action[] }[]> = {
  premium: [
    { resource: '*', actions: ['create', 'read', 'update', 'delete'] },
  ],
  gold: [
    { resource: 'order', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'cart', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'wishlist', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'review', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'wallet', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'address', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'payment_method', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'notification', actions: ['read', 'update'] },
    { resource: 'profile', actions: ['read', 'update'] },
  ],
  silver: [
    { resource: 'order', actions: ['create', 'read', 'update'] },
    { resource: 'cart', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'wishlist', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'review', actions: ['create', 'read'] },
    { resource: 'wallet', actions: ['read', 'update'] },
    { resource: 'address', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'payment_method', actions: ['read', 'update'] },
    { resource: 'notification', actions: ['read', 'update'] },
    { resource: 'profile', actions: ['read', 'update'] },
  ],
  basic: [
    { resource: 'order', actions: ['create', 'read', 'update'] },
    { resource: 'cart', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'wishlist', actions: ['read'] },
    { resource: 'review', actions: ['create', 'read'] },
    { resource: 'wallet', actions: ['read'] },
    { resource: 'address', actions: ['read', 'update'] },
    { resource: 'payment_method', actions: ['read'] },
    { resource: 'notification', actions: ['read'] },
    { resource: 'profile', actions: ['read', 'update'] },
  ],
};

export class ConsumerPermissions {
  private consumerTiers = new Map<string, string>();
  private resourceOwnership = new Map<string, Set<string>>(); // resourceId -> ownerIds

  /**
   * Check consumer permission
   */
  async check(request: ConsumerPermissionRequest): Promise<PermissionResult> {
    const { consumerId, userId, action, resource, resourceId } = request;

    // Verify user is the consumer
    if (consumerId !== userId) {
      return {
        granted: false,
        reason: 'Consumer can only access their own resources',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Get consumer tier
    const tier = this.consumerTiers.get(consumerId) || 'basic';
    const tierPerms = tierPermissions[tier];

    if (!tierPerms) {
      return {
        granted: false,
        reason: 'Invalid consumer tier',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    // Check tier permissions
    for (const perm of tierPerms) {
      // Wildcard resource
      if (perm.resource === '*') {
        if (perm.actions.includes(action)) {
          return {
            granted: true,
            reason: `Access granted via ${tier} tier`,
            matched_policy: `consumer_${tier}`,
            evaluated_policies: [`consumer_${tier}`],
            evaluation_time_ms: 0,
          };
        }
      }

      // Exact resource match
      if (perm.resource === resource) {
        if (perm.actions.includes(action)) {
          // Check resource ownership if resourceId provided
          if (resourceId) {
            const owners = this.resourceOwnership.get(resourceId);
            if (owners && !owners.has(consumerId)) {
              continue;
            }
          }

          return {
            granted: true,
            reason: `Access granted via ${tier} tier`,
            matched_policy: `consumer_${tier}`,
            evaluated_policies: [`consumer_${tier}`],
            evaluation_time_ms: 0,
          };
        }
      }
    }

    return {
      granted: false,
      reason: `Action '${action}' on resource '${resource}' not permitted for ${tier} tier`,
      evaluated_policies: [`consumer_${tier}`],
      evaluation_time_ms: 0,
    };
  }

  /**
   * Set consumer tier
   */
  setTier(consumerId: string, tier: string): void {
    if (!tierPermissions[tier]) {
      throw new Error(`Invalid tier: ${tier}`);
    }
    this.consumerTiers.set(consumerId, tier);
  }

  /**
   * Get consumer tier
   */
  getTier(consumerId: string): string {
    return this.consumerTiers.get(consumerId) || 'basic';
  }

  /**
   * Set resource ownership
   */
  setResourceOwnership(resourceId: string, ownerIds: string[]): void {
    this.resourceOwnership.set(resourceId, new Set(ownerIds));
  }

  /**
   * Grant resource access to consumer
   */
  grantResourceAccess(resourceId: string, consumerId: string): void {
    const owners = this.resourceOwnership.get(resourceId) || new Set();
    owners.add(consumerId);
    this.resourceOwnership.set(resourceId, owners);
  }

  /**
   * Revoke resource access from consumer
   */
  revokeResourceAccess(resourceId: string, consumerId: string): void {
    const owners = this.resourceOwnership.get(resourceId);
    if (owners) {
      owners.delete(consumerId);
      if (owners.size === 0) {
        this.resourceOwnership.delete(resourceId);
      }
    }
  }

  /**
   * Check if consumer owns resource
   */
  ownsResource(consumerId: string, resourceId: string): boolean {
    const owners = this.resourceOwnership.get(resourceId);
    return owners?.has(consumerId) || false;
  }

  /**
   * Get available consumer tiers
   */
  getAvailableTiers(): string[] {
    return Object.keys(tierPermissions);
  }

  /**
   * Get available actions for a resource
   */
  getResourceActions(resource: string, tier?: string): Action[] {
    const effectiveTier = tier || 'basic';
    const tierPerms = tierPermissions[effectiveTier];

    if (!tierPerms) {
      return [];
    }

    for (const perm of tierPerms) {
      if (perm.resource === resource) {
        return perm.actions;
      }
    }

    return [];
  }
}
