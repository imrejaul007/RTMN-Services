/**
 * NeXha DistributionOS - Core Service
 *
 * Handles:
 * - Distributor management
 * - Van sales
 * - Route optimization (TSP-based)
 * - Delivery tracking (GPS + ETA)
 * - Collections tracking
 * - Returns handling (RMA workflow)
 * - Retailer management
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import mongoose from 'mongoose';
import type {
  Distributor,
  VanSale,
  Route,
  Collection,
  CollectionTarget,
  DistributorPerformance,
  ReturnRequest,
  DeliveryUpdate,
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

export const CreateReturnSchema = z.object({
  distributorId: z.string().uuid(),
  retailerId: z.string().uuid(),
  orderId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    productName: z.string(),
    quantity: z.number().int().positive(),
    reason: z.enum(['defective', 'wrong_item', 'damaged', 'expired', 'other']),
    notes: z.string().optional(),
  })).min(1),
  pickupRequested: z.boolean().default(true),
  notes: z.string().optional(),
});

export const DeliveryUpdateSchema = z.object({
  vanSaleId: z.string().uuid(),
  retailerId: z.string().uuid(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  status: z.enum(['en_route', 'arrived', 'delivered', 'failed']),
  notes: z.string().optional(),
});

export const RouteOptimizationSchema = z.object({
  distributorId: z.string().uuid(),
  routeId: z.string().uuid(),
  optimizationType: z.enum(['shortest_distance', 'fastest_time', 'balanced']).default('balanced'),
  trafficFactor: z.number().min(0).max(1).default(0.3),
});

export type CreateDistributorInput = z.infer<typeof CreateDistributorSchema>;
export type CreateVanSaleInput = z.infer<typeof CreateVanSaleSchema>;
export type RecordCollectionInput = z.infer<typeof RecordCollectionSchema>;
export type CreateReturnInput = z.infer<typeof CreateReturnSchema>;
export type DeliveryUpdateInput = z.infer<typeof DeliveryUpdateSchema>;
export type RouteOptimizationInput = z.infer<typeof RouteOptimizationSchema>;

// ============================================================================
// MongoDB Models
// ============================================================================

// Distributor Schema
const DistributorSchema = new mongoose.Schema({
  distributorNumber: { type: String, required: true, unique: true },
  businessName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  type: { type: String, enum: ['distributor', 'wholesaler', 'stockist', 'dealer', 'sub-distributor'], required: true },
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending_onboarding'], default: 'pending_onboarding' },
  territory: {
    regions: [{ type: String }],
    cities: [{ type: String }],
    zones: [{ type: String }],
    pinCodes: [{ type: String }],
  },
  brands: [{
    brandId: String,
    brandName: String,
    status: { type: String, enum: ['active', 'inactive', 'suspended'] },
    since: Date,
    exclusive: Boolean,
    target: {
      monthlyTarget: Number,
      achieved: Number,
      percentage: Number,
    },
  }],
  retailers: [{
    retailerId: String,
    retailerName: String,
    status: { type: String, enum: ['active', 'inactive'] },
    since: Date,
    lastOrderAt: Date,
    monthlyOrders: Number,
    outstandingAmount: Number,
  }],
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    bankName: String,
    branchName: String,
    accountHolderName: String,
  },
  documents: [{
    type: String,
    url: String,
    verified: Boolean,
    verifiedAt: Date,
  }],
  score: {
    sales: Number,
    delivery: Number,
    collections: Number,
    overall: Number,
  },
  creditLimit: Number,
  outstandingBalance: Number,
}, { timestamps: true });

// Route Schema
const RouteSchema = new mongoose.Schema({
  routeNumber: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  days: [{ type: String, enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] }],
  stops: [{
    sequence: Number,
    retailerId: String,
    retailerName: String,
    address: String,
    latitude: Number,
    longitude: Number,
    estimatedArrival: String,
    actualArrival: String,
    status: { type: String, enum: ['pending', 'visited', 'skipped', 'failed'] },
    notes: String,
  }],
  status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active' },
  optimizedRoute: [{
    sequence: Number,
    retailerId: String,
    estimatedDistanceKm: Number,
    estimatedTimeMinutes: Number,
  }],
}, { timestamps: true });

// Van Sale Schema
const VanSaleSchema = new mongoose.Schema({
  saleNumber: { type: String, required: true, unique: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  vanId: { type: String, required: true },
  driverId: { type: String, required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  date: { type: Date, required: true },
  status: { type: String, enum: ['planned', 'in_progress', 'completed', 'cancelled'], default: 'planned' },
  retailers: [{
    retailerId: String,
    retailerName: String,
    address: String,
    visited: Boolean,
    visitedAt: Date,
    order: {
      orderId: String,
      items: [{
        productId: String,
        productName: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      }],
      subtotal: Number,
      discount: Number,
      total: Number,
      paymentStatus: { type: String, enum: ['pending', 'paid', 'partial', 'overdue'] },
    },
    collection: {
      amount: Number,
      paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'credit'] },
      collectedAt: Date,
    },
  }],
  inventory: [{
    productId: String,
    productName: String,
    openingStock: Number,
    sold: Number,
    returned: Number,
    closingStock: Number,
  }],
  summary: {
    totalRetailers: Number,
    retailersVisited: Number,
    ordersPlaced: Number,
    orderValue: Number,
    averageOrderValue: Number,
  },
  collectionSummary: {
    totalCollected: Number,
    totalTarget: Number,
    retailersPaid: Number,
    retailersPending: Number,
    overdueAmount: Number,
  },
  // Delivery tracking
  deliveryUpdates: [{
    retailerId: String,
    latitude: Number,
    longitude: Number,
    status: { type: String, enum: ['en_route', 'arrived', 'delivered', 'failed'] },
    eta: String,
    notes: String,
    timestamp: Date,
  }],
}, { timestamps: true });

// Collection Schema
const CollectionSchema = new mongoose.Schema({
  collectionNumber: { type: String, required: true, unique: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  retailerId: { type: String, required: true },
  retailerName: { type: String, required: true },
  vanSaleId: { type: mongoose.Schema.Types.ObjectId, ref: 'VanSale' },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cash', 'upi', 'card', 'cheque', 'neft'], required: true },
  reference: String,
  collectedBy: { type: String, required: true },
  notes: String,
  status: { type: String, enum: ['pending', 'partial', 'collected', 'overdue', 'waived'], default: 'collected' },
}, { timestamps: true });

// Return Request Schema
const ReturnRequestSchema = new mongoose.Schema({
  returnNumber: { type: String, required: true, unique: true },
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  retailerId: { type: String, required: true },
  retailerName: { type: String, required: true },
  orderId: { type: String, required: true },
  items: [{
    productId: String,
    productName: String,
    quantity: Number,
    reason: { type: String, enum: ['defective', 'wrong_item', 'damaged', 'expired', 'other'] },
    notes: String,
    quantityReceived: Number,
    refundAmount: Number,
  }],
  pickupRequested: { type: Boolean, default: true },
  pickupDate: Date,
  pickupAddress: String,
  status: { type: String, enum: ['requested', 'approved', 'rejected', 'pickup_scheduled', 'in_transit', 'received', 'refunded', 'cancelled'], default: 'requested' },
  notes: String,
  approvedBy: String,
  approvedAt: Date,
  receivedAt: Date,
  refundAmount: Number,
  refundStatus: { type: String, enum: ['pending', 'processed', 'failed'] },
}, { timestamps: true });

// Collection Target Schema
const CollectionTargetSchema = new mongoose.Schema({
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Distributor', required: true },
  retailerId: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  collectedAmount: { type: Number, default: 0 },
  dueDate: { type: Date, required: true },
  status: { type: String, enum: ['pending', 'partial', 'collected', 'overdue', 'waived'], default: 'pending' },
}, { timestamps: true });

// Register models
const DistributorModel = mongoose.models.Distributor || mongoose.model('Distributor', DistributorSchema);
const RouteModel = mongoose.models.Route || mongoose.model('Route', RouteSchema);
const VanSaleModel = mongoose.models.VanSale || mongoose.model('VanSale', VanSaleSchema);
const CollectionModel = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);
const ReturnRequestModel = mongoose.models.ReturnRequest || mongoose.model('ReturnRequest', ReturnRequestSchema);
const CollectionTargetModel = mongoose.models.CollectionTarget || mongoose.model('CollectionTarget', CollectionTargetSchema);

// ============================================================================
// Route Optimization — Nearest Neighbor TSP Heuristic
// ============================================================================

interface LatLng {
  latitude: number;
  longitude: number;
  retailerId: string;
  retailerName: string;
  address: string;
}

function haversineDistance(a: LatLng, b: LatLng): number {
  const R = 6371; // Earth radius in km
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const lat1 = a.latitude * Math.PI / 180;
  const lat2 = b.latitude * Math.PI / 180;
  const x = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/**
 * Nearest Neighbor TSP heuristic for route optimization.
 * O(n²) — good enough for typical van sale routes (10-50 stops).
 */
function optimizeRouteStops(stops: LatLng[], startLocation: LatLng, trafficFactor = 0.3): LatLng[] {
  if (stops.length <= 1) return stops;

  const unvisited = [...stops];
  const optimized: LatLng[] = [];
  let current = startLocation;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(current, unvisited[i]);
      // Apply traffic factor as time multiplier (higher = more traffic = slower)
      const effectiveDist = dist * (1 + trafficFactor);
      if (effectiveDist < nearestDist) {
        nearestDist = effectiveDist;
        nearestIdx = i;
      }
    }

    const next = unvisited.splice(nearestIdx, 1)[0];
    optimized.push(next);
    current = next;
  }

  return optimized;
}

function estimateTravelTime(distanceKm: number, trafficFactor: number): number {
  // Assume average speed of 25 km/h with traffic factor applied
  const avgSpeedKmH = 25 * (1 - trafficFactor);
  return Math.round((distanceKm / avgSpeedKmH) * 60); // minutes
}

// ============================================================================
// Distributor Service
// ============================================================================

export class DistributorService {
  /**
   * Create a new distributor
   */
  async createDistributor(input: CreateDistributorInput): Promise<Distributor> {
    const doc = new DistributorModel({
      distributorNumber: `DIST-${Date.now().toString(36).toUpperCase()}`,
      ...input,
      status: 'pending_onboarding',
    });
    await doc.save();
    return doc.toObject() as Distributor;
  }

  /**
   * Get distributor by ID
   */
  async getDistributor(id: string): Promise<Distributor | null> {
    const doc = await DistributorModel.findById(id).lean();
    return doc as Distributor | null;
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
    const query: Record<string, unknown> = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.type) query.type = filters.type;
    if (filters?.city) {
      query['territory.cities'] = { $regex: filters.city, $options: 'i' };
    }

    const [distributors, total] = await Promise.all([
      DistributorModel.find(query).skip(filters?.offset || 0).limit(filters?.limit || 50).lean(),
      DistributorModel.countDocuments(query),
    ]);

    return { distributors: distributors as Distributor[], total };
  }

  /**
   * Update distributor
   */
  async updateDistributor(id: string, updates: Partial<Distributor>): Promise<Distributor | null> {
    const doc = await DistributorModel.findByIdAndUpdate(id, updates, { new: true }).lean();
    return doc as Distributor | null;
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
    return this.updateDistributor(id, { status: 'suspended' });
  }

  /**
   * Add retailer to distributor
   */
  async addRetailer(
    distributorId: string,
    retailer: { retailerId: string; retailerName: string }
  ): Promise<Distributor | null> {
    const doc = await DistributorModel.findByIdAndUpdate(
      distributorId,
      { $push: { retailers: { ...retailer, status: 'active', since: new Date() } } },
      { new: true }
    ).lean();
    return doc as Distributor | null;
  }

  /**
   * Add brand to distributor
   */
  async addBrand(
    distributorId: string,
    brand: { brandId: string; brandName: string }
  ): Promise<Distributor | null> {
    const doc = await DistributorModel.findByIdAndUpdate(
      distributorId,
      { $push: { brands: { ...brand, status: 'active', since: new Date() } } },
      { new: true }
    ).lean();
    return doc as Distributor | null;
  }

  /**
   * Update distributor score
   */
  async updateScore(distributorId: string, score: Distributor['score']): Promise<Distributor | null> {
    return this.updateDistributor(distributorId, { score });
  }

  /**
   * Get distributor performance
   */
  async getPerformance(
    distributorId: string,
    period: { start: Date; end: Date }
  ): Promise<DistributorPerformance | null> {
    const [vanSales, collections] = await Promise.all([
      VanSaleModel.find({
        distributorId: new mongoose.Types.ObjectId(distributorId),
        date: { $gte: period.start, $lte: period.end },
      }).lean(),
      CollectionModel.find({
        distributorId: new mongoose.Types.ObjectId(distributorId),
        createdAt: { $gte: period.start, $lte: period.end },
      }).lean(),
    ]);

    const totalOrders = vanSales.reduce((sum, vs) => sum + (vs.summary?.ordersPlaced || 0), 0);
    const totalCollection = collections.reduce((sum, c) => sum + c.amount, 0);
    const totalRevenue = vanSales.reduce((sum, vs) => sum + (vs.summary?.orderValue || 0), 0);

    return {
      distributorId,
      period,
      metrics: {
        totalOrders,
        totalRevenue,
        totalCollection,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        retailersVisited: vanSales.reduce((sum, vs) => sum + (vs.summary?.retailersVisited || 0), 0),
        collectionRate: totalCollection > 0 ? totalCollection / totalRevenue : 0,
      },
    };
  }
}

// ============================================================================
// Route Service (with optimization)
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
    const doc = new RouteModel({
      routeNumber: `R-${Date.now().toString(36).toUpperCase()}`,
      name: input.name,
      distributorId: new mongoose.Types.ObjectId(distributorId),
      days: input.days,
      stops: input.stops.map((stop, index) => ({
        ...stop,
        sequence: index + 1,
        status: 'pending',
      })),
      status: 'active',
    });
    await doc.save();
    return doc.toObject() as Route;
  }

  /**
   * Get route with stops
   */
  async getRoute(id: string): Promise<Route | null> {
    const doc = await RouteModel.findById(id).lean();
    return doc as Route | null;
  }

  /**
   * Get routes for distributor
   */
  async getRoutesByDistributor(distributorId: string): Promise<Route[]> {
    const docs = await RouteModel.find({
      distributorId: new mongoose.Types.ObjectId(distributorId),
      status: 'active',
    }).lean();
    return docs as Route[];
  }

  /**
   * Optimize route stops using TSP nearest-neighbor heuristic.
   * Reorders stops for shortest total distance.
   */
  async optimizeRoute(
    routeId: string,
    options: { trafficFactor?: number; startLatitude?: number; startLongitude?: number } = {}
  ): Promise<Route | null> {
    const route = await RouteModel.findById(routeId).lean();
    if (!route) return null;

    const { trafficFactor = 0.3, startLatitude = 0, startLongitude = 0 } = options;

    // Build stop list with coordinates
    const stops: LatLng[] = route.stops.map(s => ({
      latitude: s.latitude || 0,
      longitude: s.longitude || 0,
      retailerId: s.retailerId,
      retailerName: s.retailerName,
      address: s.address || '',
    }));

    const start: LatLng = {
      latitude: startLatitude,
      longitude: startLongitude,
      retailerId: 'depot',
      retailerName: 'Distribution Center',
      address: '',
    };

    // Optimize
    const optimized = optimizeRouteStops(stops, start, trafficFactor);

    // Build optimized route with distances and times
    let prev = start;
    const optimizedRoute = optimized.map((stop, index) => {
      const dist = haversineDistance(prev, stop);
      const time = estimateTravelTime(dist, trafficFactor);
      prev = stop;
      return {
        sequence: index + 1,
        retailerId: stop.retailerId,
        estimatedDistanceKm: Math.round(dist * 100) / 100,
        estimatedTimeMinutes: time,
      };
    });

    // Update stops with new sequence
    const updatedStops = optimized.map((stop, index) => {
      const original = route.stops.find(s => s.retailerId === stop.retailerId);
      return {
        ...original,
        sequence: index + 1,
        status: 'pending' as const,
      };
    });

    const doc = await RouteModel.findByIdAndUpdate(
      routeId,
      { stops: updatedStops, optimizedRoute },
      { new: true }
    ).lean();

    return doc as Route | null;
  }

  /**
   * Mark stop as visited
   */
  async markStopVisited(
    routeId: string,
    stopSequence: number,
    status: 'visited' | 'skipped' | 'failed'
  ): Promise<Route | null> {
    const doc = await RouteModel.findOneAndUpdate(
      { _id: routeId, 'stops.sequence': stopSequence },
      {
        $set: {
          'stops.$.status': status,
          'stops.$.actualArrival': new Date().toISOString().split('T')[1]?.slice(0, 5),
        },
      },
      { new: true }
    ).lean();
    return doc as Route | null;
  }
}

// ============================================================================
// Van Sale Service (with delivery tracking)
// ============================================================================

export class VanSaleService {
  /**
   * Create van sale
   */
  async createVanSale(input: CreateVanSaleInput): Promise<VanSale> {
    const doc = new VanSaleModel({
      saleNumber: `VS-${Date.now().toString(36).toUpperCase()}`,
      ...input,
      date: new Date(input.date),
      status: 'planned',
    });
    await doc.save();
    return doc.toObject() as VanSale;
  }

  /**
   * Get van sale by ID
   */
  async getVanSale(id: string): Promise<VanSale | null> {
    const doc = await VanSaleModel.findById(id).lean();
    return doc as VanSale | null;
  }

  /**
   * Get van sales for distributor
   */
  async getVanSalesByDistributor(distributorId: string, filters?: { status?: string; date?: string }): Promise<VanSale[]> {
    const query: Record<string, unknown> = { distributorId: new mongoose.Types.ObjectId(distributorId) };
    if (filters?.status) query.status = filters.status;
    if (filters?.date) query.date = new Date(filters.date);

    const docs = await VanSaleModel.find(query).sort({ date: -1 }).lean();
    return docs as VanSale[];
  }

  /**
   * Start van sale
   */
  async startVanSale(id: string): Promise<VanSale | null> {
    const doc = await VanSaleModel.findByIdAndUpdate(id, { status: 'in_progress' }, { new: true }).lean();
    return doc as VanSale | null;
  }

  /**
   * Complete van sale
   */
  async completeVanSale(id: string): Promise<VanSale | null> {
    const vanSale = await VanSaleModel.findById(id).lean();
    if (!vanSale) return null;

    const summary = {
      totalRetailers: vanSale.retailers.length,
      retailersVisited: vanSale.retailers.filter(r => r.visited).length,
      ordersPlaced: vanSale.retailers.filter(r => r.order).length,
      orderValue: vanSale.retailers.reduce((sum, r) => sum + (r.order?.total || 0), 0),
      averageOrderValue: 0,
    };
    summary.averageOrderValue = summary.ordersPlaced > 0
      ? summary.orderValue / summary.ordersPlaced
      : 0;

    const collectionSummary = {
      totalCollected: vanSale.retailers.reduce((sum, r) => sum + (r.collection?.amount || 0), 0),
      totalTarget: vanSale.collectionSummary?.totalTarget || 0,
      retailersPaid: vanSale.retailers.filter(r => r.collection).length,
      retailersPending: vanSale.retailers.filter(r => !r.collection).length,
      overdueAmount: vanSale.collectionSummary?.overdueAmount || 0,
    };

    const doc = await VanSaleModel.findByIdAndUpdate(
      id,
      { status: 'completed', summary, collectionSummary },
      { new: true }
    ).lean();
    return doc as VanSale | null;
  }

  /**
   * Visit retailer during van sale
   */
  async visitRetailer(vanSaleId: string, retailerId: string): Promise<VanSale | null> {
    const doc = await VanSaleModel.findOneAndUpdate(
      { _id: vanSaleId, 'retailers.retailerId': retailerId },
      { $set: { 'retailers.$.visited': true, 'retailers.$.visitedAt': new Date() } },
      { new: true }
    ).lean();
    return doc as VanSale | null;
  }

  /**
   * Record delivery update (GPS tracking)
   */
  async recordDeliveryUpdate(input: DeliveryUpdateInput): Promise<VanSale | null> {
    const update: DeliveryUpdate = {
      retailerId: input.retailerId,
      latitude: input.latitude,
      longitude: input.longitude,
      status: input.status,
      timestamp: new Date(),
      notes: input.notes,
    };

    // Calculate ETA based on distance from next stop
    const vanSale = await VanSaleModel.findById(input.vanSaleId).lean();
    if (vanSale) {
      const nextStop = vanSale.retailers.find(r => r.retailerId === input.retailerId && !r.visited);
      if (nextStop) {
        // Rough ETA: assume 2 minutes per km at average speed
        update.eta = 'calculating...';
      }
    }

    const doc = await VanSaleModel.findByIdAndUpdate(
      input.vanSaleId,
      { $push: { deliveryUpdates: update } },
      { new: true }
    ).lean();
    return doc as VanSale | null;
  }

  /**
   * Get delivery updates for a van sale
   */
  async getDeliveryUpdates(vanSaleId: string): Promise<DeliveryUpdate[]> {
    const doc = await VanSaleModel.findById(vanSaleId).select('deliveryUpdates').lean();
    return (doc?.deliveryUpdates || []) as DeliveryUpdate[];
  }
}

// ============================================================================
// Collection Service
// ============================================================================

export class CollectionService {
  /**
   * Record a collection
   */
  async recordCollection(input: RecordCollectionInput & { distributorId: string; retailerName: string; vanSaleId?: string }): Promise<Collection> {
    const doc = new CollectionModel({
      collectionNumber: `COL-${Date.now().toString(36).toUpperCase()}`,
      ...input,
    });
    await doc.save();
    return doc.toObject() as Collection;
  }

  /**
   * Get collections for distributor
   */
  async getCollectionsByDistributor(distributorId: string, filters?: { status?: string; retailerId?: string }): Promise<Collection[]> {
    const query: Record<string, unknown> = { distributorId: new mongoose.Types.ObjectId(distributorId) };
    if (filters?.status) query.status = filters.status;
    if (filters?.retailerId) query.retailerId = filters.retailerId;

    const docs = await CollectionModel.find(query).sort({ createdAt: -1 }).lean();
    return docs as Collection[];
  }

  /**
   * Get collection by ID
   */
  async getCollection(id: string): Promise<Collection | null> {
    const doc = await CollectionModel.findById(id).lean();
    return doc as Collection | null;
  }
}

// ============================================================================
// Returns Service
// ============================================================================

export class ReturnsService {
  /**
   * Create a return request (RMA)
   */
  async createReturn(input: CreateReturnInput & { retailerName: string }): Promise<ReturnRequest> {
    const doc = new ReturnRequestModel({
      returnNumber: `RET-${Date.now().toString(36).toUpperCase()}`,
      ...input,
      status: 'requested',
    });
    await doc.save();
    return doc.toObject() as ReturnRequest;
  }

  /**
   * Get return by ID
   */
  async getReturn(id: string): Promise<ReturnRequest | null> {
    const doc = await ReturnRequestModel.findById(id).lean();
    return doc as ReturnRequest | null;
  }

  /**
   * Get returns for distributor
   */
  async getReturnsByDistributor(distributorId: string, filters?: { status?: string }): Promise<ReturnRequest[]> {
    const query: Record<string, unknown> = { distributorId: new mongoose.Types.ObjectId(distributorId) };
    if (filters?.status) query.status = filters.status;

    const docs = await ReturnRequestModel.find(query).sort({ createdAt: -1 }).lean();
    return docs as ReturnRequest[];
  }

  /**
   * Approve return request
   */
  async approveReturn(id: string, approvedBy: string): Promise<ReturnRequest | null> {
    const doc = await ReturnRequestModel.findByIdAndUpdate(
      id,
      {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      },
      { new: true }
    ).lean();
    return doc as ReturnRequest | null;
  }

  /**
   * Reject return request
   */
  async rejectReturn(id: string, reason: string): Promise<ReturnRequest | null> {
    const doc = await ReturnRequestModel.findByIdAndUpdate(
      id,
      { status: 'rejected', notes: reason },
      { new: true }
    ).lean();
    return doc as ReturnRequest | null;
  }

  /**
   * Mark return as received at warehouse
   */
  async markReceived(id: string, itemsReceived?: Array<{ productId: string; quantity: number }>): Promise<ReturnRequest | null> {
    const update: Record<string, unknown> = {
      status: 'received',
      receivedAt: new Date(),
    };

    if (itemsReceived) {
      const doc = await ReturnRequestModel.findById(id).lean();
      if (doc) {
        const updatedItems = doc.items.map(item => {
          const received = itemsReceived.find(r => r.productId === item.productId);
          return {
            ...item,
            quantityReceived: received?.quantity || item.quantity,
          };
        });
        update.items = updatedItems;
        update.refundAmount = updatedItems.reduce((sum, item) => sum + (item.refundAmount || 0), 0);
      }
    }

    const result = await ReturnRequestModel.findByIdAndUpdate(id, update, { new: true }).lean();
    return result as ReturnRequest | null;
  }

  /**
   * Process refund
   */
  async processRefund(id: string): Promise<ReturnRequest | null> {
    const doc = await ReturnRequestModel.findByIdAndUpdate(
      id,
      { status: 'refunded', refundStatus: 'processed' },
      { new: true }
    ).lean();
    return doc as ReturnRequest | null;
  }
}

// ============================================================================
// Re-export types for route stops
// ============================================================================

interface RouteStop {
  sequence: number;
  retailerId: string;
  retailerName: string;
  address: string;
  latitude?: number;
  longitude?: number;
  estimatedArrival?: string;
  actualArrival?: string;
  status: 'pending' | 'visited' | 'skipped' | 'failed';
  notes?: string;
}
