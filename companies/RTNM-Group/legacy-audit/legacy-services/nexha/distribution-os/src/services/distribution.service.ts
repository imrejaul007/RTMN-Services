/**
 * NeXha DistributionOS - Core Service
 *
 * Handles:
 * - Distributor management
 * - Van sales
 * - Route optimization
 * - Collections tracking
 * - Retailer management
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import type {
  Distributor,
  VanSale,
  Route,
  Collection,
  CollectionTarget,
  DistributorPerformance,
} from '../types/distribution.js';

// ============================================================================
// Schemas
// ============================================================================

export const CreateDistributorSchema = z.object({
  businessName: z.string().min(2),
  ownerName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  type: z.enum(['distributor', 'wholesaler', 'stockist', 'dealer', 'sub-distributor']),
  territory: z.object({
    regions: z.array(z.string()).min(1),
    cities: z.array(z.string()).min(1),
    zones: z.array(z.string()),
  }),
});

export const CreateVanSaleSchema = z.object({
  distributorId: z.string().uuid(),
  vanId: z.string().uuid(),
  driverId: z.string().uuid(),
  routeId: z.string().uuid(),
  date: z.string().datetime(),
});

export const RecordCollectionSchema = z.object({
  retailerId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'upi', 'card', 'cheque', 'neft']),
  reference: z.string().optional(),
  collectedBy: z.string().uuid(),
  notes: z.string().optional(),
});

export type CreateDistributorInput = z.infer<typeof CreateDistributorSchema>;
export type CreateVanSaleInput = z.infer<typeof CreateVanSaleSchema>;
export type RecordCollectionInput = z.infer<typeof RecordCollectionSchema>;

// ============================================================================
// In-memory Store (Replace with database)
// ============================================================================

interface DistributionStore {
  distributors: Map<string, Distributor>;
  vanSales: Map<string, VanSale>;
  routes: Map<string, Route>;
  collections: Map<string, Collection>;
  collectionTargets: Map<string, CollectionTarget>;
}

const store: DistributionStore = {
  distributors: new Map(),
  vanSales: new Map(),
  routes: new Map(),
  collections: new Map(),
  collectionTargets: new Map(),
};

// ============================================================================
// Distributor Service
// ============================================================================

export class DistributorService {
  /**
   * Create a new distributor
   */
  async createDistributor(input: CreateDistributorInput): Promise<Distributor> {
    const distributor: Distributor = {
      id: randomUUID(),
      businessName: input.businessName,
      ownerName: input.ownerName,
      email: input.email,
      phone: input.phone,
      type: input.type,
      status: 'pending_onboarding',
      territory: input.territory,
      brands: [],
      retailers: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.distributors.set(distributor.id, distributor);
    return distributor;
  }

  /**
   * Get distributor by ID
   */
  async getDistributor(id: string): Promise<Distributor | null> {
    return store.distributors.get(id) || null;
  }

  /**
   * Get all distributors with filters
   */
  async listDistributors(filters?: {
    status?: string;
    type?: string;
    city?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ distributors: Distributor[]; total: number }> {
    let results = Array.from(store.distributors.values());

    if (filters?.status) {
      results = results.filter(d => d.status === filters.status);
    }
    if (filters?.type) {
      results = results.filter(d => d.type === filters.type);
    }
    if (filters?.city) {
      results = results.filter(d =>
        d.territory.cities.some(c => c.toLowerCase().includes(filters.city!.toLowerCase()))
      );
    }

    const total = results.length;

    if (filters?.offset) {
      results = results.slice(filters.offset);
    }
    if (filters?.limit) {
      results = results.slice(0, filters.limit);
    }

    return { distributors: results, total };
  }

  /**
   * Update distributor
   */
  async updateDistributor(id: string, updates: Partial<Distributor>): Promise<Distributor | null> {
    const distributor = store.distributors.get(id);
    if (!distributor) return null;

    const updated = {
      ...distributor,
      ...updates,
      id: distributor.id, // Prevent ID change
      updatedAt: new Date(),
    };

    store.distributors.set(id, updated);
    return updated;
  }

  /**
   * Activate distributor
   */
  async activateDistributor(id: string): Promise<Distributor | null> {
    return this.updateDistributor(id, { status: 'active' });
  }

  /**
   * Suspend distributor
   */
  async suspendDistributor(id: string, reason?: string): Promise<Distributor | null> {
    return this.updateDistributor(id, {
      status: 'suspended',
      metadata: { suspensionReason: reason },
    });
  }

  /**
   * Link retailer to distributor
   */
  async linkRetailer(
    distributorId: string,
    retailer: { retailerId: string; retailerName: string }
  ): Promise<Distributor | null> {
    const distributor = store.distributors.get(distributorId);
    if (!distributor) return null;

    const updated = {
      ...distributor,
      retailers: [
        ...distributor.retailers,
        {
          retailerId: retailer.retailerId,
          retailerName: retailer.retailerName,
          status: 'active',
          since: new Date(),
        },
      ],
      updatedAt: new Date(),
    };

    store.distributors.set(distributorId, updated);
    return updated;
  }

  /**
   * Add brand to distributor
   */
  async addBrand(
    distributorId: string,
    brand: { brandId: string; brandName: string }
  ): Promise<Distributor | null> {
    const distributor = store.distributors.get(distributorId);
    if (!distributor) return null;

    const updated = {
      ...distributor,
      brands: [
        ...distributor.brands,
        {
          brandId: brand.brandId,
          brandName: brand.brandName,
          status: 'active',
          since: new Date(),
        },
      ],
      updatedAt: new Date(),
    };

    store.distributors.set(distributorId, updated);
    return updated;
  }

  /**
   * Update distributor score
   */
  async updateScore(
    distributorId: string,
    score: Distributor['score']
  ): Promise<Distributor | null> {
    return this.updateDistributor(distributorId, { score });
  }

  /**
   * Get distributor performance
   */
  async getPerformance(
    distributorId: string,
    period: { start: Date; end: Date }
  ): Promise<DistributorPerformance | null> {
    const distributor = store.distributors.get(distributorId);
    if (!distributor) return null;

    // Calculate performance metrics from van sales and collections
    const vanSales = Array.from(store.vanSales.values()).filter(
      vs => vs.distributorId === distributorId &&
        vs.date >= period.start &&
        vs.date <= period.end
    );

    const collections = Array.from(store.collections.values()).filter(
      c => {
        const target = store.collectionTargets.get(c.id);
        return target?.distributorId === distributorId &&
          c.collectedAt >= period.start &&
          c.collectedAt <= period.end;
      }
    );

    const totalOrders = vanSales.reduce((sum, vs) => sum + vs.summary.ordersPlaced, 0);
    const totalValue = vanSales.reduce((sum, vs) => sum + vs.summary.orderValue, 0);
    const totalCollected = collections.reduce((sum, c) => sum + c.amount, 0);

    return {
      distributorId,
      period,
      sales: {
        totalOrders,
        totalValue,
        averageOrderValue: totalOrders > 0 ? totalValue / totalOrders : 0,
        growth: 0, // Calculate from previous period
      },
      collections: {
        totalCollected,
        collectionEfficiency: totalValue > 0 ? (totalCollected / totalValue) * 100 : 0,
        overdueAmount: 0, // Calculate from overdue targets
      },
      logistics: {
        routesCovered: vanSales.length,
        retailersVisited: vanSales.reduce((sum, vs) => sum + vs.summary.retailersVisited, 0),
        visitRate: vanSales.length > 0
          ? (vanSales.reduce((sum, vs) => sum + vs.summary.retailersVisited, 0) /
             (vanSales.length * (distributor.retailers.length || 1))) * 100
          : 0,
      },
      inventory: {
        turnoverRate: undefined,
        stockouts: undefined,
        returnRate: undefined,
      },
      overallScore: distributor.score?.overall || 0,
      trends: 'stable',
    };
  }
}

// ============================================================================
// Van Sale Service
// ============================================================================

export class VanSaleService {
  /**
   * Create van sale record
   */
  async createVanSale(input: CreateVanSaleInput): Promise<VanSale> {
    const vanSale: VanSale = {
      id: randomUUID(),
      saleNumber: `VS-${Date.now().toString(36).toUpperCase()}`,
      distributorId: input.distributorId,
      vanId: input.vanId,
      driverId: input.driverId,
      routeId: input.routeId,
      date: new Date(input.date),
      status: 'planned',
      retailers: [],
      inventory: [],
      summary: {
        totalRetailers: 0,
        retailersVisited: 0,
        ordersPlaced: 0,
        orderValue: 0,
        averageOrderValue: 0,
      },
      collectionSummary: {
        totalCollected: 0,
        totalTarget: 0,
        retailersPaid: 0,
        retailersPending: 0,
        overdueAmount: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.vanSales.set(vanSale.id, vanSale);
    return vanSale;
  }

  /**
   * Get van sale by ID
   */
  async getVanSale(id: string): Promise<VanSale | null> {
    return store.vanSales.get(id) || null;
  }

  /**
   * Get van sales for distributor
   */
  async getVanSalesByDistributor(
    distributorId: string,
    date?: Date
  ): Promise<VanSale[]> {
    return Array.from(store.vanSales.values()).filter(
      vs => vs.distributorId === distributorId &&
        (!date || vs.date.toDateString() === date.toDateString())
    );
  }

  /**
   * Start van sale
   */
  async startVanSale(id: string): Promise<VanSale | null> {
    const vanSale = store.vanSales.get(id);
    if (!vanSale) return null;

    const updated = { ...vanSale, status: 'in_progress' as const, updatedAt: new Date() };
    store.vanSales.set(id, updated);
    return updated;
  }

  /**
   * Complete van sale
   */
  async completeVanSale(id: string): Promise<VanSale | null> {
    const vanSale = store.vanSales.get(id);
    if (!vanSale) return null;

    // Calculate summary
    const summary = {
      totalRetailers: vanSale.retailers.length,
      retailersVisited: vanSale.retailers.filter(r => r.visited).length,
      ordersPlaced: vanSale.retailers.filter(r => r.order).length,
      orderValue: vanSale.retailers.reduce(
        (sum, r) => sum + (r.order?.total || 0),
        0
      ),
      averageOrderValue: 0,
    };
    summary.averageOrderValue = summary.ordersPlaced > 0
      ? summary.orderValue / summary.ordersPlaced
      : 0;

    const collectionSummary = {
      totalCollected: vanSale.retailers.reduce(
        (sum, r) => sum + (r.collection?.amount || 0),
        0
      ),
      totalTarget: vanSale.collectionSummary.totalTarget,
      retailersPaid: vanSale.retailers.filter(r => r.collection).length,
      retailersPending: vanSale.retailers.filter(r => !r.collection).length,
      overdueAmount: vanSale.collectionSummary.overdueAmount,
    };

    const updated = {
      ...vanSale,
      status: 'completed' as const,
      summary,
      collectionSummary,
      updatedAt: new Date(),
    };

    store.vanSales.set(id, updated);
    return updated;
  }

  /**
   * Visit retailer during van sale
   */
  async visitRetailer(
    vanSaleId: string,
    retailerId: string
  ): Promise<VanSale | null> {
    const vanSale = store.vanSales.get(vanSaleId);
    if (!vanSale) return null;

    const retailers = vanSale.retailers.map(r =>
      r.retailerId === retailerId
        ? { ...r, visited: true, visitedAt: new Date() }
        : r
    );

    const updated = { ...vanSale, retailers, updatedAt: new Date() };
    store.vanSales.set(vanSaleId, updated);
    return updated;
  }
}

// ============================================================================
// Collection Service
// ============================================================================

export class CollectionService {
  /**
   * Record collection
   */
  async recordCollection(input: RecordCollectionInput): Promise<Collection> {
    const collection: Collection = {
      id: randomUUID(),
      retailerId: input.retailerId,
      amount: input.amount,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      collectedBy: input.collectedBy,
      collectedAt: new Date(),
      receiptNumber: `RC-${Date.now().toString(36).toUpperCase()}`,
    };

    store.collections.set(collection.id, collection);

    // Update collection target if exists
    const targets = Array.from(store.collectionTargets.values()).filter(
      t => t.retailerId === input.retailerId && t.status === 'pending'
    );

    for (const target of targets) {
      const newPaid = (target.paidAmount || 0) + input.amount;
      const status = newPaid >= target.amount ? 'collected' :
        newPaid > 0 ? 'partial' : 'pending';

      store.collectionTargets.set(target.id, {
        ...target,
        paidAmount: newPaid,
        status: status as CollectionTarget['status'],
        paidAt: status === 'collected' ? new Date() : undefined,
        collectedBy: input.collectedBy,
        updatedAt: new Date(),
      });
    }

    return collection;
  }

  /**
   * Get collections for retailer
   */
  async getCollectionsByRetailer(retailerId: string): Promise<Collection[]> {
    return Array.from(store.collections.values())
      .filter(c => c.retailerId === retailerId)
      .sort((a, b) => b.collectedAt.getTime() - a.collectedAt.getTime());
  }

  /**
   * Create collection target
   */
  async createCollectionTarget(
    distributorId: string,
    input: {
      retailerId: string;
      amount: number;
      dueDate: Date;
      routeId?: string;
    }
  ): Promise<CollectionTarget> {
    const target: CollectionTarget = {
      id: randomUUID(),
      distributorId,
      routeId: input.routeId,
      retailerId: input.retailerId,
      amount: input.amount,
      dueDate: input.dueDate,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.collectionTargets.set(target.id, target);
    return target;
  }

  /**
   * Get overdue collections
   */
  async getOverdueCollections(distributorId: string): Promise<CollectionTarget[]> {
    const now = new Date();
    return Array.from(store.collectionTargets.values()).filter(
      t => t.distributorId === distributorId &&
        t.status !== 'collected' &&
        t.dueDate < now
    );
  }
}

// ============================================================================
// Route Service
// ============================================================================

export class RouteService {
  /**
   * Create route
   */
  async createRoute(
    distributorId: string,
    input: {
      name: string;
      days: Route['days'];
      stops: Omit<RouteStop, 'sequence'>[];
    }
  ): Promise<Route> {
    const route: Route = {
      id: randomUUID(),
      routeNumber: `R-${Date.now().toString(36).toUpperCase()}`,
      name: input.name,
      distributorId,
      days: input.days,
      stops: input.stops.map((stop, index) => ({
        ...stop,
        sequence: index + 1,
      })),
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    store.routes.set(route.id, route);
    return route;
  }

  /**
   * Get route with stops
   */
  async getRoute(id: string): Promise<Route | null> {
    return store.routes.get(id) || null;
  }

  /**
   * Get routes for distributor
   */
  async getRoutesByDistributor(distributorId: string): Promise<Route[]> {
    return Array.from(store.routes.values())
      .filter(r => r.distributorId === distributorId && r.status === 'active');
  }

  /**
   * Mark stop as visited
   */
  async markStopVisited(
    routeId: string,
    stopSequence: number,
    status: 'visited' | 'skipped' | 'failed'
  ): Promise<Route | null> {
    const route = store.routes.get(routeId);
    if (!route) return null;

    const stops = route.stops.map(s =>
      s.sequence === stopSequence
        ? {
          ...s,
          status,
          actualArrival: new Date().toISOString().split('T')[1]?.slice(0, 5),
        }
        : s
    );

    const updated = { ...route, stops, updatedAt: new Date() };
    store.routes.set(routeId, updated);
    return updated;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const distributorService = new DistributorService();
export const vanSaleService = new VanSaleService();
export const collectionService = new CollectionService();
export const routeService = new RouteService();
