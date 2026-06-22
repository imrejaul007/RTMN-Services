/**
 * Identity Service
 *
 * Core identity management - resolution, linking, enrichment
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  UnifiedIdentity,
  UserType,
  IdentityStatus,
  CustomerProfile,
  MerchantProfile,
  VendorProfile,
  EmployeeProfile,
  SocialProfile
} from '../models/types.js';

// In-memory store (replace with DB in production)
const identities: Map<string, UnifiedIdentity> = new Map();
const phoneIndex: Map<string, string> = new Map(); // phone -> identityId
const emailIndex: Map<string, string> = new Map(); // email -> identityId

// Seed sample identities
const seedIdentities: UnifiedIdentity[] = [
  {
    id: 'id_001',
    primaryPhone: '+919876543210',
    primaryEmail: 'rahul.sharma@email.com',
    linkedIdentities: {
      customerId: 'cust_001',
      merchantId: 'merch_001'
    },
    customer: {
      userId: 'cust_001',
      type: 'customer',
      name: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul.sharma@email.com',
      location: { city: 'Mumbai', state: 'Maharashtra' },
      walletBalance: 2500,
      loyaltyPoints: 4500,
      lifetimeValue: 85000,
      totalOrders: 127,
      avgOrderValue: 670,
      appUsageScore: 85,
      createdAt: '2023-06-15T10:00:00Z',
      updatedAt: '2024-01-10T14:30:00Z',
      lastSeen: '2024-01-15T09:22:00Z',
      source: 'app'
    },
    merchant: {
      userId: 'merch_001',
      type: 'merchant',
      businessName: 'Sharma Food Court',
      ownerName: 'Rahul Sharma',
      phone: '+919876543210',
      email: 'rahul@sharmafood.com',
      gstin: '27AABCU9603R1ZM',
      category: 'Restaurant',
      address: { city: 'Mumbai', state: 'Maharashtra', address: 'Shop 12, Linking Road, Bandra West' },
      monthlyRevenue: 450000,
      employeeCount: 25,
      yearsInBusiness: 8,
      googleRating: 4.5,
      googleReviews: 234,
      hasPOS: true,
      posProvider: 'Old POS',
      hasQRMenu: false,
      hasLoyalty: false,
      hasDelivery: true,
      deliveryPartners: ['Zomato', 'Swiggy'],
      merchantScore: 72,
      leadStatus: 'warm',
      createdAt: '2023-01-20T10:00:00Z',
      updatedAt: '2024-01-12T11:00:00Z',
      lastContacted: '2024-01-05T16:00:00Z',
      source: 'discovery'
    },
    socialProfiles: [],
    identityScore: 95,
    status: 'verified',
    activity: {
      totalAppsUsed: 3,
      lastActivity: '2024-01-15T09:22:00Z',
      totalTransactions: 127,
      totalSpent: 85000,
      totalEarned: 12000
    },
    createdAt: '2023-01-20T10:00:00Z',
    updatedAt: '2024-01-15T09:22:00Z',
    lastResolved: '2024-01-15T09:22:00Z'
  },
  {
    id: 'id_002',
    primaryPhone: '+919988776655',
    primaryEmail: 'priya.patel@email.com',
    linkedIdentities: {
      customerId: 'cust_002',
      merchantId: 'merch_002'
    },
    customer: {
      userId: 'cust_002',
      type: 'customer',
      name: 'Priya Patel',
      phone: '+919988776655',
      email: 'priya.patel@email.com',
      location: { city: 'Ahmedabad', state: 'Gujarat' },
      walletBalance: 1500,
      loyaltyPoints: 1200,
      lifetimeValue: 32000,
      totalOrders: 45,
      avgOrderValue: 710,
      appUsageScore: 62,
      createdAt: '2023-09-01T10:00:00Z',
      updatedAt: '2024-01-14T18:00:00Z',
      lastSeen: '2024-01-14T18:00:00Z',
      source: 'referral'
    },
    merchant: {
      userId: 'merch_002',
      type: 'merchant',
      businessName: 'Patel Threads - Textile',
      ownerName: 'Priya Patel',
      phone: '+919988776655',
      email: 'priya@patelthreads.com',
      gstin: '24AAIPP1234P1Z5',
      category: 'Retail - Clothing',
      address: { city: 'Ahmedabad', state: 'Gujarat', address: 'CG Road, Navrangpura' },
      monthlyRevenue: 180000,
      employeeCount: 8,
      yearsInBusiness: 12,
      googleRating: 4.8,
      googleReviews: 156,
      hasPOS: false,
      hasQRMenu: false,
      hasLoyalty: false,
      hasDelivery: false,
      merchantScore: 88,
      leadStatus: 'hot',
      createdAt: '2023-08-15T10:00:00Z',
      updatedAt: '2024-01-10T10:00:00Z',
      lastContacted: '2024-01-08T14:00:00Z',
      source: 'referral'
    },
    socialProfiles: [],
    identityScore: 90,
    status: 'verified',
    activity: {
      totalAppsUsed: 2,
      lastActivity: '2024-01-14T18:00:00Z',
      totalTransactions: 45,
      totalSpent: 32000,
      totalEarned: 4500
    },
    createdAt: '2023-08-15T10:00:00Z',
    updatedAt: '2024-01-14T18:00:00Z',
    lastResolved: '2024-01-14T18:00:00Z'
  }
];

// Initialize seed data
seedIdentities.forEach(id => {
  identities.set(id.id, id);
  if (id.primaryPhone) phoneIndex.set(id.primaryPhone, id.id);
  if (id.primaryEmail) emailIndex.set(id.primaryEmail, id.id);
});

export class IdentityService {
  /**
   * Resolve identity by phone or email
   */
  resolve(phone?: string, email?: string): UnifiedIdentity | null {
    if (!phone && !email) return null;

    // Try phone first
    if (phone) {
      const normalizedPhone = this.normalizePhone(phone);
      const identityId = phoneIndex.get(normalizedPhone);
      if (identityId) {
        return identities.get(identityId) || null;
      }
    }

    // Try email
    if (email) {
      const normalizedEmail = email.toLowerCase();
      const identityId = emailIndex.get(normalizedEmail);
      if (identityId) {
        return identities.get(identityId) || null;
      }
    }

    return null;
  }

  /**
   * Get identity by ID
   */
  getById(id: string): UnifiedIdentity | null {
    return identities.get(id) || null;
  }

  /**
   * Create new identity
   */
  create(data: {
    phone?: string;
    email?: string;
    name?: string;
    type?: UserType;
    customer?: Partial<CustomerProfile>;
    merchant?: Partial<MerchantProfile>;
    vendor?: Partial<VendorProfile>;
    employee?: Partial<EmployeeProfile>;
  }): UnifiedIdentity {
    const id = uuidv4();
    const now = new Date().toISOString();

    const identity: UnifiedIdentity = {
      id,
      primaryPhone: data.phone || '',
      primaryEmail: data.email,
      linkedIdentities: {},
      customer: data.customer as CustomerProfile | undefined,
      merchant: data.merchant as MerchantProfile | undefined,
      vendor: data.vendor as VendorProfile | undefined,
      employee: data.employee as EmployeeProfile | undefined,
      socialProfiles: [],
      identityScore: 50,
      status: 'unverified',
      activity: {
        totalAppsUsed: 0,
        lastActivity: now,
        totalTransactions: 0,
        totalSpent: 0,
        totalEarned: 0
      },
      createdAt: now,
      updatedAt: now,
      lastResolved: now
    };

    // Set linked identity IDs
    if (identity.customer?.userId) {
      identity.linkedIdentities.customerId = identity.customer.userId;
    }
    if (identity.merchant?.userId) {
      identity.linkedIdentities.merchantId = identity.merchant.userId;
    }
    if (identity.vendor?.userId) {
      identity.linkedIdentities.vendorId = identity.vendor.userId;
    }
    if (identity.employee?.userId) {
      identity.linkedIdentities.employeeId = identity.employee.userId;
    }

    // Index by phone/email
    if (identity.primaryPhone) {
      phoneIndex.set(this.normalizePhone(identity.primaryPhone), id);
    }
    if (identity.primaryEmail) {
      emailIndex.set(identity.primaryEmail.toLowerCase(), id);
    }

    identities.set(id, identity);
    return identity;
  }

  /**
   * Link existing identities (same person across apps)
   */
  link(sourceId: string, targetId: string): UnifiedIdentity | null {
    const source = identities.get(sourceId);
    const target = identities.get(targetId);

    if (!source || !target) return null;

    // Merge into source identity
    if (target.customer && !source.customer) {
      source.customer = target.customer;
      source.linkedIdentities.customerId = target.customer.userId;
    }
    if (target.merchant && !source.merchant) {
      source.merchant = target.merchant;
      source.linkedIdentities.merchantId = target.merchant.userId;
    }
    if (target.vendor && !source.vendor) {
      source.vendor = target.vendor;
      source.linkedIdentities.vendorId = target.vendor.userId;
    }
    if (target.employee && !source.employee) {
      source.employee = target.employee;
      source.linkedIdentities.employeeId = target.employee.userId;
    }

    // Update indices
    if (target.primaryPhone && !source.primaryPhone) {
      source.primaryPhone = target.primaryPhone;
      phoneIndex.set(this.normalizePhone(target.primaryPhone), sourceId);
    }
    if (target.primaryEmail && !source.primaryEmail) {
      source.primaryEmail = target.primaryEmail;
      emailIndex.set(target.primaryEmail.toLowerCase(), sourceId);
    }

    // Recalculate identity score
    source.identityScore = this.calculateIdentityScore(source);
    source.updatedAt = new Date().toISOString();

    // Remove merged identity
    identities.delete(targetId);
    phoneIndex.delete(this.normalizePhone(target.primaryPhone));
    if (target.primaryEmail) emailIndex.delete(target.primaryEmail.toLowerCase());

    return source;
  }

  /**
   * Update profile
   */
  update(id: string, updates: Partial<UnifiedIdentity>): UnifiedIdentity | null {
    const identity = identities.get(id);
    if (!identity) return null;

    Object.assign(identity, updates, { updatedAt: new Date().toISOString() });
    return identity;
  }

  /**
   * Add/update social profiles
   */
  updateSocialProfiles(id: string, profiles: SocialProfile[]): UnifiedIdentity | null {
    const identity = identities.get(id);
    if (!identity) return null;

    identity.socialProfiles = profiles;
    identity.updatedAt = new Date().toISOString();
    return identity;
  }

  /**
   * Search identities
   */
  search(query: string, limit = 20): UnifiedIdentity[] {
    const normalizedQuery = query.toLowerCase();
    const results: UnifiedIdentity[] = [];

    for (const identity of identities.values()) {
      let score = 0;
      const matchedOn: string[] = [];

      // Match by phone
      if (identity.primaryPhone?.includes(query)) {
        score += 50;
        matchedOn.push('phone');
      }

      // Match by email
      if (identity.primaryEmail?.toLowerCase().includes(normalizedQuery)) {
        score += 40;
        matchedOn.push('email');
      }

      // Match by name
      const name = identity.customer?.name || identity.merchant?.businessName || identity.vendor?.businessName || '';
      if (name.toLowerCase().includes(normalizedQuery)) {
        score += 30;
        matchedOn.push('name');
      }

      // Match by GSTIN
      if (identity.merchant?.gstin?.toLowerCase().includes(normalizedQuery)) {
        score += 60;
        matchedOn.push('gstin');
      }

      if (score > 0) {
        results.push({ ...identity, identityScore: score } as UnifiedIdentity);
      }
    }

    return results.sort((a, b) => b.identityScore - a.identityScore).slice(0, limit);
  }

  /**
   * Get all identities of a specific type
   */
  getByType(type: UserType, limit = 100): UnifiedIdentity[] {
    const results: UnifiedIdentity[] = [];

    for (const identity of identities.values()) {
      switch (type) {
        case 'customer':
          if (identity.customer) results.push(identity);
          break;
        case 'merchant':
          if (identity.merchant) results.push(identity);
          break;
        case 'vendor':
          if (identity.vendor) results.push(identity);
          break;
        case 'employee':
          if (identity.employee) results.push(identity);
          break;
      }
    }

    return results.slice(0, limit);
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+?91/, '');
  }

  /**
   * Calculate identity resolution score
   */
  private calculateIdentityScore(identity: UnifiedIdentity): number {
    let score = 0;

    // Phone verified
    if (identity.primaryPhone) score += 25;

    // Email verified
    if (identity.primaryEmail) score += 25;

    // Has customer profile
    if (identity.customer) score += 15;

    // Has merchant profile
    if (identity.merchant) score += 15;

    // Has social profiles
    if (identity.socialProfiles.length > 0) score += 20;

    return Math.min(score, 100);
  }

  /**
   * Get stats
   */
  getStats(): {
    total: number;
    byType: Record<UserType, number>;
    verified: number;
    unverified: number;
  } {
    const stats = {
      total: identities.size,
      byType: { customer: 0, merchant: 0, vendor: 0, employee: 0, partner: 0, unknown: 0 } as Record<UserType, number>,
      verified: 0,
      unverified: 0
    };

    for (const identity of identities.values()) {
      if (identity.customer) stats.byType.customer++;
      if (identity.merchant) stats.byType.merchant++;
      if (identity.vendor) stats.byType.vendor++;
      if (identity.employee) stats.byType.employee++;
      if (identity.status === 'verified') stats.verified++;
      else stats.unverified++;
    }

    return stats;
  }
}

export const identityService = new IdentityService();