/**
 * Hojai Data Models - Repository Pattern
 * Version: 1.0.0 | Date: May 30, 2026
 *
 * Tenant-scoped repository pattern for all entities.
 */

import { z } from 'zod';
import { BaseEntity } from '../index';

// ============================================
// BASE REPOSITORY
// ============================================

/**
 * Base repository interface
 */
export interface IRepository<T extends BaseEntity> {
  create(data: unknown): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Partial<T>): Promise<T | null>;
  findMany(filter?: Partial<T>, options?: FindOptions): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

/**
 * Find options
 */
export interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
}

/**
 * Abstract base repository
 */
export abstract class BaseRepository<T extends BaseEntity> {
  protected tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * Scope query to tenant
   */
  protected scopeFilter(filter: Partial<T> = {}): Partial<T> {
    return { ...filter, tenant_id: this.tenantId } as Partial<T>;
  }

  /**
   * Generate tenant-scoped ID
   */
  protected generateId(prefix: string): string {
    return `${prefix}_${this.tenantId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================
// TENANT REPOSITORY
// ============================================

import {
  Tenant,
  TenantPlan,
  TenantStatus,
  createTenant,
  upgradeTenantPlan,
  suspendTenant,
  reactivateTenant,
  churnTenant,
  TenantCreateSchema,
  TenantUpdateSchema,
} from '../entities/tenant';

/**
 * Tenant repository
 */
export class TenantRepository {
  private tenants: Map<string, Tenant> = new Map();

  async create(data: z.infer<typeof TenantCreateSchema>): Promise<Tenant> {
    const tenant = createTenant(data);
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async findById(id: string): Promise<Tenant | null> {
    return this.tenants.get(id) || null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    for (const tenant of this.tenants.values()) {
      if (tenant.slug === slug) return tenant;
    }
    return null;
  }

  async update(
    id: string,
    data: z.infer<typeof TenantUpdateSchema>
  ): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;

    const updated: Tenant = {
      ...tenant,
      ...data,
      contact: data.contact ? { ...tenant.contact, ...data.contact } : tenant.contact,
      branding: data.branding ? { ...tenant.branding, ...data.branding } : tenant.branding,
      updated_at: new Date().toISOString(),
    };

    this.tenants.set(id, updated);
    return updated;
  }

  async upgradePlan(id: string, plan: TenantPlan): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;

    const updated = upgradeTenantPlan(tenant, plan);
    this.tenants.set(id, updated);
    return updated;
  }

  async suspend(id: string): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;

    const updated = suspendTenant(tenant);
    this.tenants.set(id, updated);
    return updated;
  }

  async reactivate(id: string): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;

    const updated = reactivateTenant(tenant);
    this.tenants.set(id, updated);
    return updated;
  }

  async churn(id: string): Promise<Tenant | null> {
    const tenant = this.tenants.get(id);
    if (!tenant) return null;

    const updated = churnTenant(tenant);
    this.tenants.set(id, updated);
    return updated;
  }

  async findAll(options?: FindOptions): Promise<Tenant[]> {
    const tenants = Array.from(this.tenants.values());
    return tenants.slice(options?.skip || 0, options?.limit || tenants.length);
  }
}

// ============================================
// CONSENT REPOSITORY
// ============================================

import {
  Consent,
  ConsentPurpose,
  ConsentSource,
  ConsentChannel,
  grantConsent,
  denyConsent,
  withdrawConsent,
  isConsentValid,
  getCustomerConsentPreference,
  ConsentCreateSchema,
  Consent,
} from '../entities/consent';

/**
 * Consent repository
 */
export class ConsentRepository {
  private consents: Map<string, Consent> = new Map();

  async create(
    tenantId: string,
    customerId: string,
    purpose: ConsentPurpose,
    granted: boolean,
    channel: ConsentChannel = 'app'
  ): Promise<Consent> {
    const data = { customer_id: customerId, purpose, channel };
    const consent = granted
      ? grantConsent(tenantId, ConsentCreateSchema.parse(data))
      : denyConsent(tenantId, ConsentCreateSchema.parse(data));

    this.consents.set(consent.id, consent);
    return consent;
  }

  async findById(id: string): Promise<Consent | null> {
    return this.consents.get(id) || null;
  }

  async findByCustomer(customerId: string): Promise<Consent[]> {
    const results: Consent[] = [];
    for (const consent of this.consents.values()) {
      if (consent.customer_id === customerId) {
        results.push(consent);
      }
    }
    return results;
  }

  async findValidByCustomer(customerId: string): Promise<Consent[]> {
    const consents = await this.findByCustomer(customerId);
    return consents.filter(isConsentValid);
  }

  async withdraw(
    id: string,
    reason?: string
  ): Promise<Consent | null> {
    const consent = this.consents.get(id);
    if (!consent) return null;

    const updated = withdrawConsent(consent, reason);
    this.consents.set(id, updated);
    return updated;
  }

  async getPreference(customerId: string, tenantId: string): Promise<{
    marketing: boolean;
    communication: boolean;
    allOptOut: boolean;
  }> {
    const consents = await this.findByCustomer(customerId);
    const pref = getCustomerConsentPreference(customerId, tenantId, consents);
    return {
      marketing: !pref.marketing_opt_out,
      communication: !pref.all_communication_opt_out,
      allOptOut: pref.all_communication_opt_out,
    };
  }
}

// ============================================
// CUSTOMER REPOSITORY
// ============================================

import {
  Customer,
  createCustomer,
  updateCustomerMetrics,
  updateCustomerRisk,
  CustomerCreateSchema,
  CustomerUpdateSchema,
} from '../entities/customer';

/**
 * Customer repository
 */
export class CustomerRepository {
  private customers: Map<string, Customer> = new Map();

  async create(
    tenantId: string,
    data: z.infer<typeof CustomerCreateSchema>
  ): Promise<Customer> {
    const customer = createCustomer(tenantId, data);
    this.customers.set(customer.id, customer);
    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customers.get(id) || null;
  }

  async findByPhone(phone: string): Promise<Customer | null> {
    for (const customer of this.customers.values()) {
      if (customer.phone === phone) return customer;
    }
    return null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    for (const customer of this.customers.values()) {
      if (customer.email === email) return customer;
    }
    return null;
  }

  async findMany(options?: FindOptions): Promise<Customer[]> {
    const customers = Array.from(this.customers.values());
    return customers.slice(options?.skip || 0, options?.limit || customers.length);
  }

  async update(
    id: string,
    data: z.infer<typeof CustomerUpdateSchema>
  ): Promise<Customer | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;

    const updated: Customer = {
      ...customer,
      ...data,
      preferences: data.preferences
        ? { ...customer.preferences, ...data.preferences }
        : customer.preferences,
      updated_at: new Date().toISOString(),
    };

    this.customers.set(id, updated);
    return updated;
  }

  async updateMetrics(
    id: string,
    metrics: {
      lifetime_value?: number;
      order_count?: number;
      last_order_date?: string;
    }
  ): Promise<Customer | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;

    const updated = updateCustomerMetrics(customer, metrics);
    this.customers.set(id, updated);
    return updated;
  }

  async updateRisk(
    id: string,
    risk: 'low' | 'medium' | 'high',
    engagementScore: number
  ): Promise<Customer | null> {
    const customer = this.customers.get(id);
    if (!customer) return null;

    const updated = updateCustomerRisk(customer, risk, engagementScore);
    this.customers.set(id, updated);
    return updated;
  }

  async count(): Promise<number> {
    return this.customers.size;
  }

  async delete(id: string): Promise<boolean> {
    return this.customers.delete(id);
  }
}

// ============================================
// TYPE EXPORTS
// ============================================

export type { IRepository, FindOptions };
export { BaseRepository };
export { TenantRepository, ConsentRepository, CustomerRepository };
