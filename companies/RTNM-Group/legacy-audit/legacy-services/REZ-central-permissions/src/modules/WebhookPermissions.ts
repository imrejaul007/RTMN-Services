/**
 * REZ Central Permissions - Webhook Permissions Module
 * Handles webhook-based permission checks
 */

import { v4 as uuidv4 } from 'uuid';
import { PermissionResult, WebhookPermission } from '../types';

interface WebhookPermissionRequest {
  webhookId: string;
  event: string;
  resource: string;
}

interface CreateWebhookPermissionRequest {
  webhookId: string;
  merchantId: string;
  allowedEvents: string[];
  allowedResources: string[];
  sourceIPs?: string[];
}

// In-memory webhook permission store
const webhookStore = new Map<string, WebhookPermission>();

// Event to resource mapping
const eventResourceMap: Record<string, string> = {
  'order.created': 'order',
  'order.updated': 'order',
  'order.cancelled': 'order',
  'order.completed': 'order',
  'order.refunded': 'order',
  'payment.created': 'payment',
  'payment.completed': 'payment',
  'payment.failed': 'payment',
  'payment.refunded': 'payment',
  'product.created': 'product',
  'product.updated': 'product',
  'product.deleted': 'product',
  'inventory.low': 'inventory',
  'inventory.updated': 'inventory',
  'customer.created': 'customer',
  'customer.updated': 'customer',
  'merchant.updated': 'merchant',
  'store.updated': 'store',
};

// Wildcard event patterns
const wildcardEvents = ['*', 'all', 'everything'];

export class WebhookPermissions {
  /**
   * Check webhook permission for event
   */
  async check(request: WebhookPermissionRequest): Promise<PermissionResult> {
    const { webhookId, event, resource } = request;

    const permission = webhookStore.get(webhookId);

    if (!permission) {
      return {
        granted: false,
        reason: 'Webhook permission not found',
        evaluated_policies: [],
        evaluation_time_ms: 0,
      };
    }

    if (!permission.is_active) {
      return {
        granted: false,
        reason: 'Webhook is inactive',
        evaluated_policies: [webhookId],
        evaluation_time_ms: 0,
      };
    }

    // Check event permission
    if (!this.isEventAllowed(event, permission.allowed_events)) {
      return {
        granted: false,
        reason: `Event '${event}' not allowed for this webhook`,
        evaluated_policies: [webhookId],
        evaluation_time_ms: 0,
      };
    }

    // Check resource permission
    if (!this.isResourceAllowed(resource, permission.allowed_resources)) {
      return {
        granted: false,
        reason: `Resource '${resource}' not allowed for this webhook`,
        evaluated_policies: [webhookId],
        evaluation_time_ms: 0,
      };
    }

    return {
      granted: true,
      reason: 'Webhook permission granted',
      matched_policy: webhookId,
      evaluated_policies: [webhookId],
      evaluation_time_ms: 0,
    };
  }

  /**
   * Check if event is allowed
   */
  private isEventAllowed(event: string, allowedEvents: string[]): boolean {
    // Check for wildcard patterns
    if (allowedEvents.some(e => wildcardEvents.includes(e))) {
      return true;
    }

    // Exact match
    if (allowedEvents.includes(event)) {
      return true;
    }

    // Wildcard resource pattern (e.g., order.*)
    const eventParts = event.split('.');
    if (eventParts.length >= 1) {
      const resourcePattern = `${eventParts[0]}.*`;
      if (allowedEvents.includes(resourcePattern)) {
        return true;
      }

      // Double wildcard (e.g., *.*)
      if (allowedEvents.includes('*.*')) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if resource is allowed
   */
  private isResourceAllowed(resource: string, allowedResources: string[]): boolean {
    // Check for wildcard
    if (allowedResources.includes('*')) {
      return true;
    }

    return allowedResources.includes(resource);
  }

  /**
   * Create webhook permission
   */
  async create(request: CreateWebhookPermissionRequest): Promise<WebhookPermission> {
    const permission: WebhookPermission = {
      id: uuidv4(),
      webhook_id: request.webhookId,
      merchant_id: request.merchantId,
      allowed_events: request.allowedEvents,
      allowed_resources: request.allowedResources,
      source_ips: request.sourceIPs,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    webhookStore.set(permission.id, permission);
    return permission;
  }

  /**
   * Update webhook permission
   */
  async update(
    permissionId: string,
    updates: Partial<Omit<WebhookPermission, 'id' | 'webhook_id' | 'merchant_id' | 'created_at'>>
  ): Promise<WebhookPermission | null> {
    const permission = webhookStore.get(permissionId);
    if (!permission) {
      return null;
    }

    const updated: WebhookPermission = {
      ...permission,
      ...updates,
    };

    webhookStore.set(permissionId, updated);
    return updated;
  }

  /**
   * Add allowed events to webhook
   */
  async addEvents(permissionId: string, events: string[]): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      permission.allowed_events = [...new Set([...permission.allowed_events, ...events])];
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Remove allowed events from webhook
   */
  async removeEvents(permissionId: string, events: string[]): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      permission.allowed_events = permission.allowed_events.filter(e => !events.includes(e));
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Add allowed resources to webhook
   */
  async addResources(permissionId: string, resources: string[]): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      permission.allowed_resources = [...new Set([...permission.allowed_resources, ...resources])];
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Remove allowed resources from webhook
   */
  async removeResources(permissionId: string, resources: string[]): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      permission.allowed_resources = permission.allowed_resources.filter(r => !resources.includes(r));
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Add source IP to webhook
   */
  async addSourceIP(permissionId: string, ip: string): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      if (!permission.source_ips) {
        permission.source_ips = [];
      }
      permission.source_ips.push(ip);
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Remove source IP from webhook
   */
  async removeSourceIP(permissionId: string, ip: string): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission && permission.source_ips) {
      permission.source_ips = permission.source_ips.filter(i => i !== ip);
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Check IP whitelist
   */
  async checkIPWhitelist(permissionId: string, ip: string): Promise<boolean> {
    const permission = webhookStore.get(permissionId);
    if (!permission) {
      return false;
    }

    // If no IPs configured, allow all
    if (!permission.source_ips || permission.source_ips.length === 0) {
      return true;
    }

    return permission.source_ips.includes(ip);
  }

  /**
   * Activate webhook
   */
  async activate(permissionId: string): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      permission.is_active = true;
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Deactivate webhook
   */
  async deactivate(permissionId: string): Promise<void> {
    const permission = webhookStore.get(permissionId);
    if (permission) {
      permission.is_active = false;
      webhookStore.set(permissionId, permission);
    }
  }

  /**
   * Delete webhook permission
   */
  async delete(permissionId: string): Promise<void> {
    webhookStore.delete(permissionId);
  }

  /**
   * Get webhook permission
   */
  async get(permissionId: string): Promise<WebhookPermission | undefined> {
    return webhookStore.get(permissionId);
  }

  /**
   * Get permissions by webhook ID
   */
  async getByWebhook(webhookId: string): Promise<WebhookPermission | undefined> {
    return Array.from(webhookStore.values()).find(p => p.webhook_id === webhookId);
  }

  /**
   * Get permissions by merchant
   */
  async getByMerchant(merchantId: string): Promise<WebhookPermission[]> {
    return Array.from(webhookStore.values()).filter(p => p.merchant_id === merchantId);
  }

  /**
   * Get event to resource mapping
   */
  getEventResource(event: string): string | undefined {
    return eventResourceMap[event];
  }

  /**
   * Get available events
   */
  getAvailableEvents(): string[] {
    return Object.keys(eventResourceMap);
  }

  /**
   * Get available resources
   */
  getAvailableResources(): string[] {
    return [...new Set(Object.values(eventResourceMap))];
  }
}
