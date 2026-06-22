/**
 * NeXha FranchiseOS - Core Types
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export const FranchiseTypeSchema = z.enum(['owned', 'franchise', 'licensed', ' JV', 'partner']);
export type FranchiseType = z.infer<typeof FranchiseTypeSchema>;

export const FranchiseStatusSchema = z.enum(['active', 'inactive', 'suspended', 'pending_onboarding', 'terminated']);
export type FranchiseStatus = z.infer<typeof FranchiseStatusSchema>;

export const SyncStatusSchema = z.enum(['synced', 'pending', 'failed', 'not_configured']);
export type SyncStatus = z.infer<typeof SyncStatusSchema>;

// ============================================================================
// Franchise Entity
// ============================================================================

export interface Franchise {
  id: string;
  franchiseNumber: string;
  brandId: string;
  brandName: string;
  locationId: string;
  locationName: string;
  franchiseeName: string;
  franchiseePhone: string;
  franchiseeEmail: string;
  type: FranchiseType;
  status: FranchiseStatus;
  address: Address;
  coordinates?: { lat: number; lng: number };
  phone?: string;
  email?: string;
  timezone?: string;
  businessHours?: BusinessHours;
  contract?: Contract;
  royalty?: RoyaltyConfig;
  performance?: FranchisePerformance;
  syncStatus: SyncStatus;
  integrations: FranchiseIntegration[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street?: string;
  city: string;
  state: string;
  zipCode?: string;
  country?: string;
}

export interface BusinessHours {
  [day: string]: { open: string; close: string; closed?: boolean };
}

export interface Contract {
  contractNumber: string;
  startDate: Date;
  endDate: Date;
  termMonths?: number;
  renewalDate?: Date;
  deposit?: number;
  setupFee?: number;
  documentUrl?: string;
}

export interface RoyaltyConfig {
  type: 'flat' | 'percentage';
  value: number;
  frequency: 'daily' | 'weekly' | 'monthly';
  minimumGuarantee?: number;
  lastCalculatedAt?: Date;
}

export interface FranchisePerformance {
  period: { start: Date; end: Date };
  revenue: number;
  revenueTarget: number;
  orders: number;
  ordersTarget: number;
  customers?: number;
  customersTarget?: number;
  averageOrderValue: number;
  growthRate?: number;
  score?: number;
  ranking?: { withinBrand: number; withinRegion: number };
}

export interface FranchiseIntegration {
  type: 'pos' | 'inventory' | 'menu' | 'loyalty' | 'delivery' | 'analytics';
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSyncAt?: Date;
  config?: Record<string, unknown>;
}

// ============================================================================
// Brand/Headquarters
// ============================================================================

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  type: 'restaurant' | 'salon' | 'fitness' | 'retail' | 'service' | 'other';
  franchises: Franchise[];
  stats: BrandStats;
  config: BrandConfig;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandStats {
  totalFranchises: number;
  activeFranchises: number;
  totalRevenue: number;
  averageScore: number;
  topPerformers: string[];
}

export interface BrandConfig {
  defaultRoyalty?: RoyaltyConfig;
  defaultBusinessHours?: BusinessHours;
  requiredIntegrations?: FranchiseIntegration['type'][];
  syncFrequency?: number; // minutes
}

// ============================================================================
// Sync Management
// ============================================================================

export interface SyncJob {
  id: string;
  franchiseId: string;
  type: 'inventory' | 'menu' | 'orders' | 'pricing' | 'loyalty' | 'analytics';
  status: 'pending' | 'running' | 'completed' | 'failed';
  itemsProcessed: number;
  errors: string[];
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
}

export interface SyncConfig {
  franchiseId: string;
  inventory: {
    enabled: boolean;
    frequency: number;
    autoReorder: boolean;
  };
  menu: {
    enabled: boolean;
    autoUpdate: boolean;
    approvalRequired: boolean;
  };
  pricing: {
    enabled: boolean;
    allowOverrides: boolean;
  };
  loyalty: {
    enabled: boolean;
    syncMembers: boolean;
  };
}

// ============================================================================
// Royalty Management
// ============================================================================

export interface RoyaltyCalculation {
  id: string;
  franchiseId: string;
  period: { start: Date; end: Date };
  revenue: number;
  royaltyType: 'flat' | 'percentage';
  royaltyRate: number;
  amount: number;
  status: 'pending' | 'paid' | 'waived';
  dueDate: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
}

export interface RoyaltyReport {
  brandId: string;
  period: { start: Date; end: Date };
  totalRevenue: number;
  totalRoyalty: number;
  byFranchise: Array<{
    franchiseId: string;
    franchiseName: string;
    revenue: number;
    royalty: number;
  }>;
  pending: number;
  collected: number;
}

// ============================================================================
// Performance Analytics
// ============================================================================

export interface FranchiseBenchmark {
  franchiseId: string;
  metrics: {
    revenue: number;
    orders: number;
    aov: number;
    customers: number;
    score: number;
  };
  benchmarks: {
    brandAverage: number;
    brandTop25: number;
    brandTop10: number;
    regionalAverage?: number;
    nationalAverage?: number;
  };
  percentile: number;
  trend: 'up' | 'down' | 'stable';
  recommendations: string[];
}

export interface FranchiseChurnRisk {
  franchiseId: string;
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
  recommendedActions: string[];
}
