/**
 * NeXha DistributionOS - Core Types
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const DistributorTypeSchema = z.enum([
  'distributor',
  'wholesaler',
  'stockist',
  'dealer',
  'sub-distributor',
]);

export type DistributorType = z.infer<typeof DistributorTypeSchema>;

export const DistributorStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending_onboarding',
]);

export type DistributorStatus = z.infer<typeof DistributorStatusSchema>;

export const OrderTypeSchema = z.enum([
  'van_sale',
  'route_sale',
  'online_order',
  'phone_order',
  'prescription',
]);

export type OrderType = z.infer<typeof OrderTypeSchema>;

export const PaymentCollectionStatusSchema = z.enum([
  'pending',
  'partial',
  'collected',
  'overdue',
  'waived',
]);

export type PaymentCollectionStatus = z.infer<typeof PaymentCollectionStatusSchema>;

// ============================================================================
// Distributor Entity
// ============================================================================

export interface Distributor {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  type: DistributorType;
  status: DistributorStatus;
  territory: Territory;
  brands: BrandAssociation[];
  retailers: RetailerLink[];
  bankDetails?: BankDetails;
  documents?: Document[];
  score?: DistributorScore;
  creditLimit?: number;
  outstandingBalance?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Territory {
  regions: string[];
  cities: string[];
  zones: string[];
  pinCodes?: string[];
  coverage?: {
    totalTowns: number;
    totalRetailers: number;
    totalPopulation?: number;
  };
}

export interface BrandAssociation {
  brandId: string;
  brandName: string;
  status: 'active' | 'inactive' | 'suspended';
  since: Date;
  exclusive?: boolean;
  target?: {
    monthlyTarget: number;
    achieved: number;
    percentage: number;
  };
}

export interface RetailerLink {
  retailerId: string;
  retailerName: string;
  status: 'active' | 'inactive';
  since: Date;
  lastOrderAt?: Date;
  monthlyOrders?: number;
  outstandingAmount?: number;
}

export interface BankDetails {
  accountNumber: string;
  ifscCode: string;
  bankName: string;
  branchName: string;
  accountHolderName: string;
}

export interface Document {
  type: 'gst_certificate' | 'pan_card' | 'address_proof' | 'trade_license' | 'other';
  url: string;
  verified: boolean;
  verifiedAt?: Date;
}

export interface DistributorScore {
  overall: number;
  sales: ScoreComponent;
  collections: ScoreComponent;
  logistics: ScoreComponent;
  compliance: ScoreComponent;
}

export interface ScoreComponent {
  score: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: Date;
}

// ============================================================================
// Van Sale
// ============================================================================

export interface VanSale {
  id: string;
  saleNumber: string;
  distributorId: string;
  vanId: string;
  driverId: string;
  routeId: string;
  date: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  retailers: VanSaleRetailer[];
  inventory: VanInventoryItem[];
  summary: VanSaleSummary;
  collectionSummary: CollectionSummary;
  createdAt: Date;
  updatedAt: Date;
}

export interface VanSaleRetailer {
  retailerId: string;
  retailerName: string;
  address: string;
  visited: boolean;
  visitedAt?: Date;
  order?: VanSaleOrder;
  collection?: Collection;
}

export interface VanSaleOrder {
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  paymentStatus: 'pending' | 'paid' | 'partial' | 'overdue';
  paymentMethod?: 'cash' | 'upi' | 'card' | 'credit';
}

export interface OrderItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface VanInventoryItem {
  productId: string;
  productName: string;
  sku: string;
  batchNumber?: string;
  openingStock: number;
  sold: number;
  returned: number;
  closingStock: number;
}

export interface VanSaleSummary {
  totalRetailers: number;
  retailersVisited: number;
  ordersPlaced: number;
  orderValue: number;
  averageOrderValue: number;
}

export interface Collection {
  id: string;
  retailerId: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'cheque' | 'neft';
  reference?: string;
  collectedBy: string;
  collectedAt: Date;
  receiptNumber?: string;
}

export interface CollectionSummary {
  totalCollected: number;
  totalTarget: number;
  retailersPaid: number;
  retailersPending: number;
  overdueAmount: number;
}

// ============================================================================
// Route
// ============================================================================

export interface Route {
  id: string;
  routeNumber: string;
  name: string;
  distributorId: string;
  vehicleId?: string;
  driverId?: string;
  days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  stops: RouteStop[];
  estimatedDistance?: number;
  estimatedDuration?: number;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface RouteStop {
  sequence: number;
  retailerId: string;
  retailerName: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  estimatedArrival?: string;
  actualArrival?: string;
  status: 'pending' | 'visited' | 'skipped' | 'failed';
  notes?: string;
}

// ============================================================================
// Retailer (for Distribution)
// ============================================================================

export interface DistributionRetailer {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email?: string;
  address: Address;
  territory: {
    region?: string;
    city: string;
    zone?: string;
  };
  type: 'retailer' | 'pharmacy' | 'kirana' | 'modern_trade' | 'hospital' | 'clinic';
  status: 'active' | 'inactive' | 'prospect';
  distributorId: string;
  linkedAt: Date;
  lastOrderAt?: Date;
  monthlyOrders?: number;
  outstandingBalance?: number;
  creditLimit?: number;
  paymentTerms?: number; // days
  metadata?: Record<string, unknown>;
}

export interface Address {
  street?: string;
  city: string;
  state: string;
  zipCode?: string;
  country?: string;
  coordinates?: { lat: number; lng: number };
}

// ============================================================================
// Collections
// ============================================================================

export interface CollectionTarget {
  id: string;
  distributorId: string;
  routeId?: string;
  retailerId: string;
  amount: number;
  dueDate: Date;
  status: PaymentCollectionStatus;
  paidAmount?: number;
  paidAt?: Date;
  collectedBy?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CollectionReport {
  distributorId: string;
  period: { start: Date; end: Date };
  summary: {
    totalTarget: number;
    totalCollected: number;
    collectionEfficiency: number;
    overdueAmount: number;
    overdueCount: number;
  };
  byRetailer: Array<{
    retailerId: string;
    retailerName: string;
    target: number;
    collected: number;
    pending: number;
  }>;
  byDay: Array<{
    date: string;
    collected: number;
    count: number;
  }>;
}

// ============================================================================
// Performance Analytics
// ============================================================================

export interface DistributorPerformance {
  distributorId: string;
  period: { start: Date; end: Date };
  sales: {
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    growth: number;
  };
  collections: {
    totalCollected: number;
    collectionEfficiency: number;
    overdueAmount: number;
  };
  logistics: {
    routesCovered: number;
    retailersVisited: number;
    visitRate: number;
    averageDeliveryTime?: number;
  };
  inventory: {
    turnoverRate?: number;
    stockouts?: number;
    returnRate?: number;
  };
  overallScore: number;
  trends: 'improving' | 'stable' | 'declining';
}
