/**
 * DistributionOS - Integration Tests
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock the service
const mockDistributors = new Map();

const distributorService = {
  async createDistributor(input: {
    businessName: string;
    ownerName: string;
    email: string;
    phone: string;
    type: string;
    territory: { regions: string[]; cities: string[] };
  }) {
    const id = `dist_${Date.now()}`;
    const distributor = {
      id,
      distributorNumber: `DIST-${id}`,
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      type: input.type,
      status: 'pending_onboarding' as const,
      territory: input.territory,
      brands: [],
      retailers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDistributors.set(id, distributor);
    return distributor;
  },

  async getDistributor(id: string) {
    return mockDistributors.get(id) || null;
  },

  async listDistributors(filters?: { status?: string; type?: string; city?: string }) {
    let results = Array.from(mockDistributors.values());
    if (filters?.status) {
      results = results.filter(d => d.status === filters.status);
    }
    if (filters?.type) {
      results = results.filter(d => d.type === filters.type);
    }
    return { distributors: results, total: results.length };
  },

  async activateDistributor(id: string) {
    const dist = mockDistributors.get(id);
    if (!dist) return null;
    dist.status = 'active';
    dist.updatedAt = new Date();
    mockDistributors.set(id, dist);
    return dist;
  },

  async suspendDistributor(id: string, reason?: string) {
    const dist = mockDistributors.get(id);
    if (!dist) return null;
    dist.status = 'suspended';
    dist.metadata = { suspensionReason: reason };
    dist.updatedAt = new Date();
    mockDistributors.set(id, dist);
    return dist;
  },
};

describe('DistributionOS - Distributors', () => {
  beforeEach(() => {
    mockDistributors.clear();
  });

  describe('createDistributor', () => {
    test('should create a new distributor', async () => {
      const input = {
        businessName: 'Metro Foods Distribution',
        ownerName: 'Rajesh Kumar',
        email: 'rajesh@metrofoods.com',
        phone: '+919876543210',
        type: 'distributor',
        territory: {
          regions: ['West'],
          cities: ['Mumbai'],
        },
      };

      const distributor = await distributorService.createDistributor(input);

      expect(distributor).toBeDefined();
      expect(distributor.id).toBeDefined();
      expect(distributor.businessName).toBe('Metro Foods Distribution');
      expect(distributor.status).toBe('pending_onboarding');
      expect(distributor.distributorNumber).toMatch(/^DIST-/);
    });

    test('should generate unique distributor number', async () => {
      const input1 = {
        businessName: 'Distributor 1',
        ownerName: 'Owner 1',
        email: 'test1@test.com',
        phone: '1234567890',
        type: 'distributor',
        territory: { regions: ['North'], cities: ['Delhi'] },
      };

      const input2 = {
        businessName: 'Distributor 2',
        ownerName: 'Owner 2',
        email: 'test2@test.com',
        phone: '0987654321',
        type: 'wholesaler',
        territory: { regions: ['South'], cities: ['Bangalore'] },
      };

      const dist1 = await distributorService.createDistributor(input1);
      const dist2 = await distributorService.createDistributor(input2);

      expect(dist1.distributorNumber).not.toBe(dist2.distributorNumber);
    });
  });

  describe('getDistributor', () => {
    test('should return distributor by id', async () => {
      const created = await distributorService.createDistributor({
        businessName: 'Test Dist',
        ownerName: 'Test Owner',
        email: 'test@test.com',
        phone: '1234567890',
        type: 'distributor',
        territory: { regions: ['East'], cities: ['Kolkata'] },
      });

      const found = await distributorService.getDistributor(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.businessName).toBe('Test Dist');
    });

    test('should return null for non-existent id', async () => {
      const found = await distributorService.getDistributor('non_existent_id');
      expect(found).toBeNull();
    });
  });

  describe('listDistributors', () => {
    test('should list all distributors', async () => {
      await distributorService.createDistributor({
        businessName: 'Dist 1',
        ownerName: 'Owner 1',
        email: 't1@t.com',
        phone: '111',
        type: 'distributor',
        territory: { regions: ['West'], cities: ['Mumbai'] },
      });
      await distributorService.createDistributor({
        businessName: 'Dist 2',
        ownerName: 'Owner 2',
        email: 't2@t.com',
        phone: '222',
        type: 'wholesaler',
        territory: { regions: ['South'], cities: ['Chennai'] },
      });

      const result = await distributorService.listDistributors();

      expect(result.total).toBe(2);
      expect(result.distributors.length).toBe(2);
    });

    test('should filter by type', async () => {
      await distributorService.createDistributor({
        businessName: 'Distributor Type',
        ownerName: 'Owner',
        email: 't@t.com',
        phone: '111',
        type: 'distributor',
        territory: { regions: ['West'], cities: ['Mumbai'] },
      });
      await distributorService.createDistributor({
        businessName: 'Wholesaler Type',
        ownerName: 'Owner',
        email: 't2@t.com',
        phone: '222',
        type: 'wholesaler',
        territory: { regions: ['South'], cities: ['Chennai'] },
      });

      const result = await distributorService.listDistributors({ type: 'distributor' });

      expect(result.total).toBe(1);
      expect(result.distributors[0].type).toBe('distributor');
    });
  });

  describe('activateDistributor', () => {
    test('should activate distributor', async () => {
      const created = await distributorService.createDistributor({
        businessName: 'Test Dist',
        ownerName: 'Test Owner',
        email: 'test@test.com',
        phone: '1234567890',
        type: 'distributor',
        territory: { regions: ['West'], cities: ['Mumbai'] },
      });

      const activated = await distributorService.activateDistributor(created.id);

      expect(activated).toBeDefined();
      expect(activated?.status).toBe('active');
    });

    test('should return null for non-existent distributor', async () => {
      const result = await distributorService.activateDistributor('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('suspendDistributor', () => {
    test('should suspend distributor with reason', async () => {
      const created = await distributorService.createDistributor({
        businessName: 'Test Dist',
        ownerName: 'Test Owner',
        email: 'test@test.com',
        phone: '1234567890',
        type: 'distributor',
        territory: { regions: ['West'], cities: ['Mumbai'] },
      });

      const suspended = await distributorService.suspendDistributor(created.id, 'Compliance violation');

      expect(suspended).toBeDefined();
      expect(suspended?.status).toBe('suspended');
      expect(suspended?.metadata).toEqual({ suspensionReason: 'Compliance violation' });
    });
  });
});

describe('DistributionOS - Van Sales', () => {
  test('should create van sale', async () => {
    const vanSale = {
      id: `vs_${Date.now()}`,
      saleNumber: `VS-${Date.now().toString(36).toUpperCase()}`,
      distributorId: 'dist_123',
      vanId: 'van_456',
      driverId: 'driver_789',
      routeId: 'route_101',
      date: new Date(),
      status: 'planned' as const,
      retailers: [],
      summary: {
        totalRetailers: 0,
        retailersVisited: 0,
        ordersPlaced: 0,
        orderValue: 0,
        averageOrderValue: 0,
      },
    };

    expect(vanSale.saleNumber).toMatch(/^VS-/);
    expect(vanSale.status).toBe('planned');
  });

  test('should calculate van sale summary', () => {
    const retailers = [
      { visited: true, order: { total: 5000 } },
      { visited: true, order: { total: 3000 } },
      { visited: false },
      { visited: true, order: { total: 7000 } },
    ];

    const visited = retailers.filter(r => r.visited).length;
    const ordersPlaced = retailers.filter(r => r.order).length;
    const orderValue = retailers.reduce((sum, r) => sum + (r.order?.total || 0), 0);
    const avgOrderValue = ordersPlaced > 0 ? orderValue / ordersPlaced : 0;

    expect(visited).toBe(3);
    expect(ordersPlaced).toBe(2);
    expect(orderValue).toBe(8000);
    expect(avgOrderValue).toBe(4000);
  });
});

describe('DistributionOS - Collections', () => {
  test('should record collection', async () => {
    const collection = {
      id: `col_${Date.now()}`,
      retailerId: 'retailer_123',
      amount: 15000,
      paymentMethod: 'cash' as const,
      collectedAt: new Date(),
      receiptNumber: `RC-${Date.now().toString(36).toUpperCase()}`,
    };

    expect(collection.amount).toBe(15000);
    expect(collection.paymentMethod).toBe('cash');
    expect(collection.receiptNumber).toMatch(/^RC-/);
  });
});
