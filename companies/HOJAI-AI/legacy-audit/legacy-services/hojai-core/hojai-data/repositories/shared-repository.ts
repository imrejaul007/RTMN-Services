/**
 * Hojai Shared - Repository
 * Version: 1.0.0 | Date: June 12, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository, createIndexes, standardIndexes } from './base-repository.js';
import {
  SharedTenant,
  SharedApiKey,
  SharedWebhookConfig,
  TenantPlan,
  TenantStatus
} from '../entities/index.js';

// ============================================
// TENANT REPOSITORY
// ============================================

export class TenantRepository extends BaseRepository<SharedTenant> {
  constructor(db: Db) {
    super(db, 'shared_tenants', 'system'); // System-level collection
  }

  /**
   * Find by plan
   */
  async findByPlan(plan: TenantPlan): Promise<SharedTenant[]> {
    return this.findMany({ plan } as Partial<SharedTenant>);
  }

  /**
   * Find by status
   */
  async findByStatus(status: TenantStatus): Promise<SharedTenant[]> {
    return this.findMany({ status } as Partial<SharedTenant>);
  }

  /**
   * Get all tenants
   */
  async findAll(): Promise<SharedTenant[]> {
    return this.collection.find({}).toArray();
  }

  /**
   * Create tenant with quota
   */
  async createWithQuota(data: {
    name: string;
    plan: TenantPlan;
  }): Promise<SharedTenant> {
    const quotas: Record<TenantPlan, { api_calls: number; storage: number; users: number }> = {
      free: { api_calls: 1000, storage: 100, users: 5 },
      starter: { api_calls: 10000, storage: 1000, users: 25 },
      pro: { api_calls: 100000, storage: 10000, users: 100 },
      enterprise: { api_calls: -1, storage: -1, users: -1 }
    };

    return this.create({
      name: data.name,
      plan: data.plan,
      quota: quotas[data.plan],
      usage: { api_calls: 0, storage: 0, users: 0 },
      status: 'trial'
    });
  }

  /**
   * Update quota
   */
  async updateQuota(id: string, quota: Partial<SharedTenant['quota']>): Promise<void> {
    const tenant = await this.findById(id);
    if (!tenant) return;

    await this.updateOne(
      { id } as Partial<SharedTenant>,
      {
        quota: { ...tenant.quota, ...quota }
      } as Partial<SharedTenant>
    );
  }

  /**
   * Update usage
   */
  async incrementUsage(id: string, field: keyof SharedTenant['usage']): Promise<void> {
    await this.collection.updateOne(
      { id } as any,
      { $inc: { [`usage.${field}`]: 1 } }
    );
  }

  /**
   * Activate tenant
   */
  async activate(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<SharedTenant>,
      { status: 'active' } as Partial<SharedTenant>
    );
  }

  /**
   * Suspend tenant
   */
  async suspend(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<SharedTenant>,
      { status: 'suspended' } as Partial<SharedTenant>
    );
  }
}

// ============================================
// API KEY REPOSITORY
// ============================================

export class ApiKeyRepository extends BaseRepository<SharedApiKey> {
  constructor(db: Db, tenantId: string) {
    super(db, 'shared_api_keys', tenantId);
  }

  /**
   * Find by key
   */
  async findByKey(key: string): Promise<SharedApiKey | null> {
    return this.collection.findOne({ key } as any);
  }

  /**
   * Find active keys
   */
  async findActive(): Promise<SharedApiKey[]> {
    return this.findMany({ status: 'active' } as Partial<SharedApiKey>);
  }

  /**
   * Revoke key
   */
  async revoke(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<SharedApiKey>,
      { status: 'revoked' } as Partial<SharedApiKey>
    );
  }

  /**
   * Update last used
   */
  async updateLastUsed(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<SharedApiKey>,
      { last_used: new Date().toISOString() } as Partial<SharedApiKey>
    );
  }

  /**
   * Check if key is valid
   */
  async isValidKey(key: string): Promise<boolean> {
    const apiKey = await this.findByKey(key);
    if (!apiKey) return false;
    if (apiKey.status !== 'active') return false;
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) return false;
    return true;
  }

  /**
   * Create API key
   */
  async createKey(data: {
    name: string;
    permissions?: string[];
    expiresAt?: string;
  }): Promise<SharedApiKey> {
    const key = `hk_${this.generateId()}`;
    return this.create({
      key,
      name: data.name,
      permissions: data.permissions || ['read'],
      expires_at: data.expiresAt,
      status: 'active'
    });
  }
}

// ============================================
// WEBHOOK REPOSITORY
// ============================================

export class WebhookRepository extends BaseRepository<SharedWebhookConfig> {
  constructor(db: Db, tenantId: string) {
    super(db, 'shared_webhooks', tenantId);
  }

  /**
   * Find by URL
   */
  async findByUrl(url: string): Promise<SharedWebhookConfig | null> {
    return this.findOne({ url } as Partial<SharedWebhookConfig>);
  }

  /**
   * Find active webhooks
   */
  async findActive(): Promise<SharedWebhookConfig[]> {
    return this.findMany({ status: 'active' } as Partial<SharedWebhookConfig>);
  }

  /**
   * Find webhooks for event
   */
  async findForEvent(eventType: string): Promise<SharedWebhookConfig[]> {
    const allWebhooks = await this.findActive();
    return allWebhooks.filter(webhook =>
      webhook.events.includes(eventType) || webhook.events.includes('*')
    );
  }

  /**
   * Deactivate webhook
   */
  async deactivate(id: string): Promise<void> {
    await this.updateOne(
      { id } as Partial<SharedWebhookConfig>,
      { status: 'inactive' } as Partial<SharedWebhookConfig>
    );
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    id: string,
    data: Partial<Pick<SharedWebhookConfig, 'url' | 'events' | 'retries'>>
  ): Promise<void> {
    await this.updateOne(
      { id } as Partial<SharedWebhookConfig>,
      data as Partial<SharedWebhookConfig>
    );
  }
}

// ============================================
// INDEX CREATION
// ============================================

export async function createSharedIndexes(db: Db): Promise<void> {
  // Tenant indexes
  const tenantsCollection = db.collection('shared_tenants');
  await createIndexes(tenantsCollection, [
    standardIndexes.by_tenant_id,
    { key: { plan: 1 }, name: 'idx_plan' },
    { key: { status: 1 }, name: 'idx_status' }
  ]);

  // API Key indexes
  const apiKeysCollection = db.collection('shared_api_keys');
  await createIndexes(apiKeysCollection, [
    standardIndexes.by_tenant_created,
    { key: { key: 1 }, name: 'idx_key', unique: true } as any,
    { key: { tenant_id: 1, status: 1 }, name: 'idx_tenant_status' }
  ]);

  // Webhook indexes
  const webhooksCollection = db.collection('shared_webhooks');
  await createIndexes(webhooksCollection, [
    standardIndexes.by_tenant_created,
    { key: { tenant_id: 1, status: 1 }, name: 'idx_tenant_status' }
  ]);
}
