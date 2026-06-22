/**
 * FranchiseOS - Integration Tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';

// Mock stores
const mockFranchises = new Map();
const mockBrands = new Map();
const mockRoyaltyCalculations = new Map();

const franchiseService = {
  async createFranchise(input: {
    brandId: string;
    brandName: string;
    locationName: string;
    franchiseeName: string;
    franchiseePhone: string;
    franchiseeEmail: string;
    type: string;
    address: { city: string; state: string };
  }) {
    const id = `fr_${Date.now()}`;
    const franchise = {
      id,
      franchiseNumber: `FR-${id}`,
      ...input,
      status: 'pending_onboarding' as const,
      performance: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockFranchises.set(id, franchise);
    return franchise;
  },

  async getFranchise(id: string) {
    return mockFranchises.get(id) || null;
  },

  async listFranchises(filters?: { brandId?: string; status?: string }) {
    let results = Array.from(mockFranchises.values());
    if (filters?.brandId) {
      results = results.filter(f => f.brandId === filters.brandId);
    }
    if (filters?.status) {
      results = results.filter(f => f.status === filters.status);
    }
    return { franchises: results, total: results.length };
  },

  async activateFranchise(id: string) {
    const franchise = mockFranchises.get(id);
    if (!franchise) return null;
    franchise.status = 'active';
    franchise.updatedAt = new Date();
    mockFranchises.set(id, franchise);
    return franchise;
  },

  async updatePerformance(id: string, performance: {
    revenue?: number;
    revenueTarget?: number;
    orders?: number;
    ordersTarget?: number;
  }) {
    const franchise = mockFranchises.get(id);
    if (!franchise) return null;
    franchise.performance = {
      period: { start: new Date(), end: new Date() },
      revenue: performance.revenue || 0,
      revenueTarget: performance.revenueTarget || 0,
      orders: performance.orders || 0,
      ordersTarget: performance.ordersTarget || 0,
      customers: 0,
      customersTarget: 0,
      averageOrderValue: 0,
      score: 0,
    };
    franchise.updatedAt = new Date();
    mockFranchises.set(id, franchise);
    return franchise;
  },
};

const brandService = {
  async createBrand(input: { name: string; type: string }) {
    const id = `brand_${Date.now()}`;
    const brand = {
      id,
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
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockBrands.set(id, brand);
    return brand;
  },

  async getBrand(id: string) {
    return mockBrands.get(id) || null;
  },

  async listBrands() {
    return Array.from(mockBrands.values());
  },
};

const royaltyService = {
  async calculateRoyalty(franchiseId: string, period: { start: Date; end: Date }) {
    const franchise = mockFranchises.get(franchiseId);
    if (!franchise) return null;

    const revenue = franchise.performance?.revenue || 0;
    const amount = revenue * 0.05; // 5% royalty

    const calculation = {
      id: `roy_${Date.now()}`,
      franchiseId,
      period,
      revenue,
      royaltyType: 'percentage' as const,
      royaltyRate: 5,
      amount,
      status: 'pending' as const,
      dueDate: new Date(period.end.getTime() + 15 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    mockRoyaltyCalculations.set(calculation.id, calculation);
    return calculation;
  },

  async getCalculations(filters?: { franchiseId?: string }) {
    let results = Array.from(mockRoyaltyCalculations.values());
    if (filters?.franchiseId) {
      results = results.filter(c => c.franchiseId === filters.franchiseId);
    }
    return results;
  },

  async markPaid(id: string) {
    const calculation = mockRoyaltyCalculations.get(id);
    if (!calculation) return null;
    calculation.status = 'paid';
    calculation.paidAt = new Date();
    mockRoyaltyCalculations.set(id, calculation);
    return calculation;
  },
};

describe('FranchiseOS - Franchises', () => {
  beforeEach(() => {
    mockFranchises.clear();
    mockBrands.clear();
    mockRoyaltyCalculations.clear();
  });

  describe('createFranchise', () => {
    test('should create a franchise', async () => {
      const input = {
        brandId: 'brand_123',
        brandName: 'BurgerBox',
        locationName: 'Mumbai - Central',
        franchiseeName: 'Amit Mehta',
        franchiseePhone: '+919876543210',
        franchiseeEmail: 'amit@burgerbox.com',
        type: 'franchise',
        address: { city: 'Mumbai', state: 'Maharashtra' },
      };

      const franchise = await franchiseService.createFranchise(input);

      expect(franchise).toBeDefined();
      expect(franchise.franchiseNumber).toMatch(/^FR-/);
      expect(franchise.status).toBe('pending_onboarding');
      expect(franchise.brandName).toBe('BurgerBox');
    });
  });

  describe('activateFranchise', () => {
    test('should activate franchise', async () => {
      const franchise = await franchiseService.createFranchise({
        brandId: 'brand_123',
        brandName: 'Test Brand',
        locationName: 'Test Location',
        franchiseeName: 'Test Owner',
        franchiseePhone: '1234567890',
        franchiseeEmail: 'test@test.com',
        type: 'franchise',
        address: { city: 'Delhi', state: 'Delhi' },
      });

      const activated = await franchiseService.activateFranchise(franchise.id);

      expect(activated?.status).toBe('active');
    });
  });

  describe('updatePerformance', () => {
    test('should update performance metrics', async () => {
      const franchise = await franchiseService.createFranchise({
        brandId: 'brand_123',
        brandName: 'Test Brand',
        locationName: 'Test Location',
        franchiseeName: 'Test Owner',
        franchiseePhone: '1234567890',
        franchiseeEmail: 'test@test.com',
        type: 'franchise',
        address: { city: 'Delhi', state: 'Delhi' },
      });

      const updated = await franchiseService.updatePerformance(franchise.id, {
        revenue: 500000,
        revenueTarget: 600000,
        orders: 450,
        ordersTarget: 500,
      });

      expect(updated?.performance).toBeDefined();
      expect(updated?.performance?.revenue).toBe(500000);
      expect(updated?.performance?.orders).toBe(450);
    });

    test('should calculate score based on achievement', async () => {
      const franchise = await franchiseService.createFranchise({
        brandId: 'brand_123',
        brandName: 'Test Brand',
        locationName: 'Test Location',
        franchiseeName: 'Test Owner',
        franchiseePhone: '1234567890',
        franchiseeEmail: 'test@test.com',
        type: 'franchise',
        address: { city: 'Delhi', state: 'Delhi' },
      });

      const updated = await franchiseService.updatePerformance(franchise.id, {
        revenue: 600000,
        revenueTarget: 600000,
        orders: 500,
        ordersTarget: 500,
      });

      // 100% revenue + 100% orders = 100% score
      expect(updated?.performance?.score).toBe(100);
    });
  });
});

describe('FranchiseOS - Royalty', () => {
  beforeEach(() => {
    mockFranchises.clear();
    mockRoyaltyCalculations.clear();
  });

  test('should calculate royalty at 5%', async () => {
    const franchise = await franchiseService.createFranchise({
      brandId: 'brand_123',
      brandName: 'Test Brand',
      locationName: 'Test Location',
      franchiseeName: 'Test Owner',
      franchiseePhone: '1234567890',
      franchiseeEmail: 'test@test.com',
      type: 'franchise',
      address: { city: 'Delhi', state: 'Delhi' },
    });

    // Set performance first
    await franchiseService.updatePerformance(franchise.id, {
      revenue: 1000000,
      revenueTarget: 1000000,
      orders: 500,
      ordersTarget: 500,
    });

    const period = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(),
    };

    const calculation = await royaltyService.calculateRoyalty(franchise.id, period);

    expect(calculation).toBeDefined();
    expect(calculation?.royaltyRate).toBe(5);
    expect(calculation?.amount).toBe(50000); // 5% of 1,000,000
    expect(calculation?.status).toBe('pending');
  });

  test('should mark royalty as paid', async () => {
    const franchise = await franchiseService.createFranchise({
      brandId: 'brand_123',
      brandName: 'Test Brand',
      locationName: 'Test Location',
      franchiseeName: 'Test Owner',
      franchiseePhone: '1234567890',
      franchiseeEmail: 'test@test.com',
      type: 'franchise',
      address: { city: 'Delhi', state: 'Delhi' },
    });

    await franchiseService.updatePerformance(franchise.id, {
      revenue: 1000000,
      revenueTarget: 1000000,
      orders: 500,
      ordersTarget: 500,
    });

    const calculation = await royaltyService.calculateRoyalty(
      franchise.id,
      { start: new Date(), end: new Date() }
    );

    const paid = await royaltyService.markPaid(calculation!.id);

    expect(paid?.status).toBe('paid');
    expect(paid?.paidAt).toBeDefined();
  });
});
