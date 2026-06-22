/**
 * NeXha FranchiseOS - Core Service
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import type { Franchise, Brand, FranchisePerformance, RoyaltyCalculation } from '../types/franchise.js';

// ============================================================================
// Schemas
// ============================================================================

export const CreateFranchiseSchema = z.object({
  brandId: z.string().uuid(),
  brandName: z.string().min(1),
  locationName: z.string().min(1),
  franchiseeName: z.string().min(2),
  franchiseePhone: z.string().min(10),
  franchiseeEmail: z.string().email(),
  type: z.enum(['owned', 'franchise', 'licensed', 'partner', 'JV']),
  address: z.object({
    street: z.string().optional(),
    city: z.string().min(1),
    state: z.string().min(1),
    zipCode: z.string().optional(),
    country: z.string().optional(),
  }),
  phone: z.string().optional(),
  email: z.string().email().optional(),
});

export const UpdatePerformanceSchema = z.object({
  revenue: z.number().optional(),
  revenueTarget: z.number().optional(),
  orders: z.number().optional(),
  ordersTarget: z.number().optional(),
  customers: z.number().optional(),
  customersTarget: z.number().optional(),
});

export type CreateFranchiseInput = z.infer<typeof CreateFranchiseSchema>;
export type UpdatePerformanceInput = z.infer<typeof UpdatePerformanceSchema>;

// ============================================================================
// In-memory Store
// ============================================================================

interface FranchiseStore {
  franchises: Map<string, Franchise>;
  brands: Map<string, Brand>;
  royaltyCalculations: Map<string, RoyaltyCalculation>;
}

const store: FranchiseStore = {
  franchises: new Map(),
  brands: new Map(),
  royaltyCalculations: new Map(),
};

// ============================================================================
// Franchise Service
// ============================================================================

export class FranchiseService {
  /**
   * Create a new franchise
   */
  async createFranchise(input: CreateFranchiseInput): Promise<Franchise> {
    const franchise: Franchise = {
      id: randomUUID(),
      franchiseNumber: `FR-${Date.now().toString(36).toUpperCase()}`,
      brandId: input.brandId,
      brandName: input.brandName,
      locationId: randomUUID(),
      locationName: input.locationName,
      franchiseeName: input.franchiseeName,
      franchiseePhone: input.franchiseePhone,
      franchiseeEmail: input.franchiseeEmail,
      type: input.type,
      status: 'pending_onboarding',
      address: input.address,
      phone: input.phone,
      email: input.email,
      syncStatus: 'not_configured',
      integrations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.franchises.set(franchise.id, franchise);
    return franchise;
  }

  /**
   * Get franchise by ID
   */
  async getFranchise(id: string): Promise<Franchise | null> {
    return store.franchises.get(id) || null;
  }

  /**
   * Get franchise by number
   */
  async getFranchiseByNumber(franchiseNumber: string): Promise<Franchise | null> {
    return Array.from(store.franchises.values()).find(
      f => f.franchiseNumber === franchiseNumber
    ) || null;
  }

  /**
   * List franchises
   */
  async listFranchises(filters?: {
    brandId?: string;
    status?: Franchise['status'];
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ franchises: Franchise[]; total: number }> {
    let results = Array.from(store.franchises.values());

    if (filters?.brandId) {
      results = results.filter(f => f.brandId === filters.brandId);
    }
    if (filters?.status) {
      results = results.filter(f => f.status === filters.status);
    }
    if (filters?.city) {
      results = results.filter(f =>
        f.address.city.toLowerCase().includes(filters.city!.toLowerCase())
      );
    }

    const total = results.length;

    if (filters?.offset) {
      results = results.slice(filters.offset);
    }
    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return { franchises: results, total };
  }

  /**
   * Update franchise
   */
  async updateFranchise(id: string, updates: Partial<Franchise>): Promise<Franchise | null> {
    const franchise = store.franchises.get(id);
    if (!franchise) return null;

    const updated = { ...franchise, ...updates, updatedAt: new Date() };
    store.franchises.set(id, updated);
    return updated;
  }

  /**
   * Activate franchise
   */
  async activateFranchise(id: string): Promise<Franchise | null> {
    return this.updateFranchise(id, { status: 'active', syncStatus: 'synced' });
  }

  /**
   * Suspend franchise
   */
  async suspendFranchise(id: string, reason?: string): Promise<Franchise | null> {
    return this.updateFranchise(id, {
      status: 'suspended',
      metadata: { suspensionReason: reason },
    });
  }

  /**
   * Update performance
   */
  async updatePerformance(id: string, performance: Partial<FranchisePerformance>): Promise<Franchise | null> {
    const franchise = store.franchises.get(id);
    if (!franchise) return null;

    const updated = {
      ...franchise,
      performance: {
        period: franchise.performance?.period || { start: new Date(), end: new Date() },
        revenue: performance.revenue ?? franchise.performance?.revenue ?? 0,
        revenueTarget: performance.revenueTarget ?? franchise.performance?.revenueTarget ?? 0,
        orders: performance.orders ?? franchise.performance?.orders ?? 0,
        ordersTarget: performance.ordersTarget ?? franchise.performance?.ordersTarget ?? 0,
        customers: performance.customers ?? franchise.performance?.customers ?? 0,
        customersTarget: performance.customersTarget ?? franchise.performance?.customersTarget ?? 0,
        averageOrderValue: franchise.performance?.averageOrderValue ?? 0,
      },
      updatedAt: new Date(),
    };

    // Calculate score
    const revenueAchievement = updated.performance.revenueTarget > 0
      ? (updated.performance.revenue / updated.performance.revenueTarget) * 100
      : 0;
    const ordersAchievement = updated.performance.ordersTarget > 0
      ? (updated.performance.orders / updated.performance.ordersTarget) * 100
      : 0;
    updated.performance.score = (revenueAchievement + ordersAchievement) / 2;

    // Calculate AOV
    if (updated.performance.orders > 0) {
      updated.performance.averageOrderValue = updated.performance.revenue / updated.performance.orders;
    }

    store.franchises.set(id, updated);
    return updated;
  }

  /**
   * Add integration
   */
  async addIntegration(
    id: string,
    integration: Franchise['integrations'][0]
  ): Promise<Franchise | null> {
    const franchise = store.franchises.get(id);
    if (!franchise) return null;

    const updated = {
      ...franchise,
      integrations: [...franchise.integrations, integration],
      updatedAt: new Date(),
    };

    store.franchises.set(id, updated);
    return updated;
  }

  /**
   * Get franchise performance
   */
  async getPerformance(id: string): Promise<FranchisePerformance | null> {
    const franchise = store.franchises.get(id);
    return franchise?.performance || null;
  }
}

// ============================================================================
// Brand Service
// ============================================================================

export class BrandService {
  /**
   * Create brand
   */
  async createBrand(input: {
    name: string;
    type: Brand['type'];
    config?: Partial<Brand['config']>;
  }): Promise<Brand> {
    const brand: Brand = {
      id: randomUUID(),
      name: input.name,
      type: input.type,
      franchises: [],
      stats: {
        totalFranchises: 0,
        activeFranchises: 0,
        totalRevenue: 0,
        averageScore: 0,
        topPerformers: [],
      },
      config: {
        defaultRoyalty: input.config?.defaultRoyalty,
        syncFrequency: input.config?.syncFrequency || 60,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.brands.set(brand.id, brand);
    return brand;
  }

  /**
   * Get brand by ID
   */
  async getBrand(id: string): Promise<Brand | null> {
    return store.brands.get(id) || null;
  }

  /**
   * List brands
   */
  async listBrands(): Promise<Brand[]> {
    return Array.from(store.brands.values());
  }

  /**
   * Get brand stats
   */
  async getBrandStats(id: string): Promise<Brand['stats'] | null> {
    const brand = store.brands.get(id);
    if (!brand) return null;

    const franchises = Array.from(store.franchises.values()).filter(
      f => f.brandId === id
    );

    const active = franchises.filter(f => f.status === 'active');
    const totalRevenue = active.reduce(
      (sum, f) => sum + (f.performance?.revenue || 0),
      0
    );
    const scores = active
      .filter(f => f.performance?.score)
      .map(f => f.performance!.score!);
    const avgScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0;

    return {
      totalFranchises: franchises.length,
      activeFranchises: active.length,
      totalRevenue,
      averageScore: avgScore,
      topPerformers: active
        .sort((a, b) => (b.performance?.score || 0) - (a.performance?.score || 0))
        .slice(0, 5)
        .map(f => f.id),
    };
  }
}

// ============================================================================
// Royalty Service
// ============================================================================

export class RoyaltyService {
  /**
   * Calculate royalty for franchise
   */
  async calculateRoyalty(
    franchiseId: string,
    period: { start: Date; end: Date }
  ): Promise<RoyaltyCalculation | null> {
    const franchise = store.franchises.get(franchiseId);
    if (!franchise) return null;

    const revenue = franchise.performance?.revenue || 0;
    const royaltyConfig = franchise.royalty;

    if (!royaltyConfig) {
      return null;
    }

    let amount = 0;
    if (royaltyConfig.type === 'percentage') {
      amount = revenue * (royaltyConfig.value / 100);
    } else {
      amount = royaltyConfig.value;
    }

    // Apply minimum guarantee
    if (royaltyConfig.minimumGuarantee && amount < royaltyConfig.minimumGuarantee) {
      amount = royaltyConfig.minimumGuarantee;
    }

    const calculation: RoyaltyCalculation = {
      id: randomUUID(),
      franchiseId,
      period,
      revenue,
      royaltyType: royaltyConfig.type,
      royaltyRate: royaltyConfig.value,
      amount,
      status: 'pending',
      dueDate: new Date(period.end.getTime() + 15 * 24 * 60 * 60 * 1000), // 15 days after period end
      createdAt: new Date(),
    };

    store.royaltyCalculations.set(calculation.id, calculation);
    return calculation;
  }

  /**
   * Get royalty calculations
   */
  async getCalculations(filters?: {
    franchiseId?: string;
    status?: RoyaltyCalculation['status'];
  }): Promise<RoyaltyCalculation[]> {
    let results = Array.from(store.royaltyCalculations.values());

    if (filters?.franchiseId) {
      results = results.filter(c => c.franchiseId === filters.franchiseId);
    }
    if (filters?.status) {
      results = results.filter(c => c.status === filters.status);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Mark royalty as paid
   */
  async markPaid(id: string): Promise<RoyaltyCalculation | null> {
    const calculation = store.royaltyCalculations.get(id);
    if (!calculation) return null;

    const updated = {
      ...calculation,
      status: 'paid' as const,
      paidAt: new Date(),
    };

    store.royaltyCalculations.set(id, updated);
    return updated;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const franchiseService = new FranchiseService();
export const brandService = new BrandService();
export const royaltyService = new RoyaltyService();
