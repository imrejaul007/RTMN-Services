/**
 * Hojai Data Platform - Tenant Repository
 * Version: 1.0 | Date: May 29, 2026
 */

import { Db } from 'mongodb';
import { BaseRepository } from './base-repository';
import { Tenant } from '../entities';

/**
 * Tenant Repository
 * Note: Tenant is not tenant-scoped (it's the root entity)
 */
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(db: Db, tenant_id: string) {
    super(db, 'tenants', tenant_id);
  }

  /**
   * Find by slug
   */
  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.collection.findOne({ slug } as any);
  }

  /**
   * Find by email
   */
  async findByEmail(email: string): Promise<Tenant | null> {
    return this.collection.findOne({ email: email.toLowerCase() } as any);
  }

  /**
   * Find by type
   */
  async findByType(type: 'internal' | 'commercial'): Promise<Tenant[]> {
    return this.collection.find({ type } as any).toArray();
  }

  /**
   * Find by industry
   */
  async findByIndustry(industry: string): Promise<Tenant[]> {
    return this.collection.find({ industry } as any).toArray();
  }

  /**
   * Update status
   */
  async updateStatus(
    tenantId: string,
    status: 'active' | 'suspended' | 'churned'
  ): Promise<void> {
    await this.collection.updateOne(
      { id: tenantId } as any,
      {
        $set: {
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'suspended' ? { suspended_at: new Date().toISOString() } : {})
        }
      }
    );
  }

  /**
   * Update plan
   */
  async updatePlan(
    tenantId: string,
    plan: 'starter' | 'professional' | 'enterprise'
  ): Promise<void> {
    await this.collection.updateOne(
      { id: tenantId } as any,
      { $set: { plan, updated_at: new Date().toISOString() } }
    );
  }
}
