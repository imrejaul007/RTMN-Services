/**
 * HOJAI Multi-Tenancy
 */

import { Client } from './client';

export interface Tenant {
  id: string;
  name: string;
  plan: 'starter' | 'growth' | 'enterprise';
  settings: Record<string, any>;
}

export interface TenantContext {
  tenant: Tenant;
  user?: {
    id: string;
    role: string;
  };
}

export class MultiTenancy {
  private client: Client;

  constructor(client: Client) {
    this.client = client;
  }

  async create(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
    return this.client.request('POST', '/tenants', tenant);
  }

  async get(tenantId: string): Promise<Tenant> {
    return this.client.request('GET', `/tenants/${tenantId}`);
  }

  async update(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
    return this.client.request('PATCH', `/tenants/${tenantId}`, updates);
  }

  async delete(tenantId: string): Promise<void> {
    return this.client.request('DELETE', `/tenants/${tenantId}`);
  }

  async list(): Promise<Tenant[]> {
    return this.client.request('GET', '/tenants');
  }

  // Tenant context helpers
  forTenant(tenantId: string): Client {
    const scoped = new Client(this.client.config);
    scoped.setTenant(tenantId);
    return scoped;
  }

  // Isolation helpers
  async isolate(tenantId: string): Promise<void> {
    // Ensure data isolation for tenant
    await this.client.request('POST', `/tenants/${tenantId}/isolate`);
  }

  async migrate(tenantId: string, targetPlan: Tenant['plan']): Promise<void> {
    await this.client.request('POST', `/tenants/${tenantId}/migrate`, { plan: targetPlan });
  }
}
