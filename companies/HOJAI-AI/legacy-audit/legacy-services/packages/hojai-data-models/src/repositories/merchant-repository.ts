/**
 * Hojai Data Models - Merchant Repository
 * Version: 1.0.0 | Date: May 30, 2026
 */

import { z } from 'zod';
import {
  Merchant,
  MerchantCreateSchema,
  MerchantUpdateSchema,
  MerchantAddressSchema,
  createMerchant,
  addMerchantAddress,
  updateMerchantMetrics,
  verifyMerchant,
  suspendMerchant,
  reactivateMerchant,
  getMerchantSummary,
  calculateMerchantHealth,
} from '../entities/merchant';

/**
 * Merchant Repository
 */
export class MerchantRepository {
  private merchants: Map<string, Merchant> = new Map();

  // ========== CRUD ==========

  async create(
    tenantId: string,
    data: z.infer<typeof MerchantCreateSchema>
  ): Promise<Merchant> {
    const merchant = createMerchant(tenantId, data);
    this.merchants.set(merchant.id, merchant);
    return merchant;
  }

  async findById(id: string): Promise<Merchant | null> {
    return this.merchants.get(id) || null;
  }

  async findBySlug(slug: string): Promise<Merchant | null> {
    for (const merchant of this.merchants.values()) {
      if (merchant.slug === slug) return merchant;
    }
    return null;
  }

  async findByGstin(gstin: string): Promise<Merchant | null> {
    for (const merchant of this.merchants.values()) {
      if (merchant.gstin === gstin) return merchant;
    }
    return null;
  }

  async findByPhone(phone: string): Promise<Merchant | null> {
    for (const merchant of this.merchants.values()) {
      if (merchant.phone === phone) return merchant;
    }
    return null;
  }

  async findByEmail(email: string): Promise<Merchant | null> {
    for (const merchant of this.merchants.values()) {
      if (merchant.email === email) return merchant;
    }
    return null;
  }

  async update(
    id: string,
    data: z.infer<typeof MerchantUpdateSchema>
  ): Promise<Merchant | null> {
    const merchant = this.merchants.get(id);
    if (!merchant) return null;

    const updated: Merchant = {
      ...merchant,
      ...data,
      updated_at: new Date().toISOString(),
    };

    this.merchants.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.merchants.delete(id);
  }

  // ========== ADDRESSES ==========

  async addAddress(
    merchantId: string,
    addressData: z.infer<typeof MerchantAddressSchema>
  ): Promise<Merchant | null> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;

    const updated = addMerchantAddress(merchant, addressData);
    this.merchants.set(merchantId, updated);
    return updated;
  }

  async removeAddress(merchantId: string, addressId: string): Promise<Merchant | null> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;

    merchant.addresses = merchant.addresses.filter(a => a.id !== addressId);
    merchant.updated_at = new Date().toISOString();
    this.merchants.set(merchantId, merchant);
    return merchant;
  }

  // ========== STATUS ==========

  async verify(merchantId: string, verifiedBy: string): Promise<Merchant | null> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;

    const verified = verifyMerchant(merchant, verifiedBy);
    this.merchants.set(merchantId, verified);
    return verified;
  }

  async suspend(merchantId: string): Promise<Merchant | null> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;

    const suspended = suspendMerchant(merchant);
    this.merchants.set(merchantId, suspended);
    return suspended;
  }

  async reactivate(merchantId: string): Promise<Merchant | null> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;

    const reactivated = reactivateMerchant(merchant);
    this.merchants.set(merchantId, reactivated);
    return reactivated;
  }

  // ========== METRICS ==========

  async updateMetrics(
    merchantId: string,
    metrics: {
      total_revenue?: number;
      total_orders?: number;
      total_customers?: number;
      rating?: number;
    }
  ): Promise<Merchant | null> {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;

    const updated = updateMerchantMetrics(merchant, metrics);
    this.merchants.set(merchantId, updated);
    return updated;
  }

  // ========== QUERIES ==========

  async findAll(options?: {
    status?: Merchant['status'];
    business_category?: Merchant['business_category'];
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<Merchant[]> {
    let results = Array.from(this.merchants.values());

    if (options?.status) {
      results = results.filter(m => m.status === options.status);
    }
    if (options?.business_category) {
      results = results.filter(m => m.business_category === options.business_category);
    }
    if (options?.city) {
      results = results.filter(m =>
        m.addresses.some(a => a.city.toLowerCase().includes(options.city!.toLowerCase()))
      );
    }

    // Sort by created_at desc
    results.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    return results.slice(offset, offset + limit);
  }

  async search(query: string): Promise<Merchant[]> {
    const lowerQuery = query.toLowerCase();
    const results = Array.from(this.merchants.values()).filter(m =>
      m.name.toLowerCase().includes(lowerQuery) ||
      m.email.toLowerCase().includes(lowerQuery) ||
      m.phone.includes(query) ||
      m.slug.includes(lowerQuery) ||
      m.gstin?.includes(query) ||
      m.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
      m.categories.some(c => c.toLowerCase().includes(lowerQuery))
    );

    return results;
  }

  // ========== SUMMARY ==========

  async getSummary(merchantId: string) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;
    return getMerchantSummary(merchant);
  }

  async getHealth(merchantId: string) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) return null;
    return calculateMerchantHealth(merchant);
  }

  // ========== STATS ==========

  async count(): Promise<{
    total: number;
    active: number;
    pending: number;
    suspended: number;
  }> {
    const all = Array.from(this.merchants.values());

    return {
      total: all.length,
      active: all.filter(m => m.status === 'active').length,
      pending: all.filter(m => m.status === 'pending').length,
      suspended: all.filter(m => m.status === 'suspended').length,
    };
  }
}
