/**
 * Search Routes
 *
 * Cross-app user/merchant/vendor search
 */

import { Router } from 'express';
import { identityService } from '../services/identityService.js';
import { socialVerificationService } from '../services/socialVerificationService.js';
import type { SearchResult, UserType } from '../models/types.js';

export const searchRoutes = Router();

/**
 * Search users across all apps
 * GET /api/search/users
 */
searchRoutes.get('/search/users', (req, res) => {
  const { q, type, limit = 20 } = req.query;

  if (!q) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_QUERY', message: 'q (query) parameter required' },
      timestamp: new Date().toISOString()
    });
  }

  // Search identities
  const identities = identityService.search(q as string, Number(limit));

  // Convert to search results
  const results: SearchResult[] = identities.map(identity => {
    const profile = identity.merchant || identity.customer || identity.vendor || identity.employee;
    const userType: UserType = identity.merchant ? 'merchant' : identity.customer ? 'customer' : identity.vendor ? 'vendor' : 'employee';
    const name = identity.customer?.name || identity.merchant?.businessName || identity.vendor?.businessName || identity.employee?.name || 'Unknown';
    const location = identity.customer?.location?.city || identity.merchant?.address?.city || identity.vendor?.location?.city || identity.employee?.department;

    return {
      id: identity.id,
      type: userType,
      name,
      phone: identity.primaryPhone,
      email: identity.primaryEmail,
      photo: identity.customer?.avatar || identity.employee?.avatar,
      location,
      matchScore: identity.identityScore,
      matchedOn: getMatchedOn(identity, q as string),
      source: getSource(identity),
      lastSeen: identity.activity.lastActivity
    };
  });

  // Filter by type if specified
  const filtered = type ? results.filter(r => r.type === type) : results;

  res.json({
    success: true,
    data: filtered,
    count: filtered.length,
    query: q,
    timestamp: new Date().toISOString()
  });
});

/**
 * Search merchants
 * GET /api/search/merchants
 */
searchRoutes.get('/search/merchants', (req, res) => {
  const { q, category, city, minScore, maxScore, status, limit = 50 } = req.query;

  let merchants = identityService.getByType('merchant', 1000);

  // Filter by query
  if (q) {
    const query = (q as string).toLowerCase();
    merchants = merchants.filter(m => {
      const name = m.merchant?.businessName?.toLowerCase() || '';
      const owner = m.merchant?.ownerName?.toLowerCase() || '';
      const category = m.merchant?.category?.toLowerCase() || '';
      return name.includes(query) || owner.includes(query) || category.includes(query);
    });
  }

  // Filter by category
  if (category) {
    merchants = merchants.filter(m => m.merchant?.category === category);
  }

  // Filter by city
  if (city) {
    merchants = merchants.filter(m => m.merchant?.address?.city === city);
  }

  // Filter by score
  if (minScore) {
    merchants = merchants.filter(m => (m.merchant?.merchantScore || 0) >= Number(minScore));
  }
  if (maxScore) {
    merchants = merchants.filter(m => (m.merchant?.merchantScore || 0) <= Number(maxScore));
  }

  // Filter by status
  if (status) {
    merchants = merchants.filter(m => m.merchant?.leadStatus === status);
  }

  // Limit results
  const limited = merchants.slice(0, Number(limit));

  res.json({
    success: true,
    data: limited.map(m => ({
      id: m.id,
      businessName: m.merchant?.businessName,
      ownerName: m.merchant?.ownerName,
      phone: m.merchant?.phone,
      email: m.merchant?.email,
      category: m.merchant?.category,
      city: m.merchant?.address?.city,
      merchantScore: m.merchant?.merchantScore,
      leadStatus: m.merchant?.leadStatus,
      googleRating: m.merchant?.googleRating,
      hasQRMenu: m.merchant?.hasQRMenu,
      hasLoyalty: m.merchant?.hasLoyalty,
      hasPOS: m.merchant?.hasPOS,
      socialProfiles: m.socialProfiles,
      totalFollowers: socialVerificationService.getTotalFollowers(m.socialProfiles),
      lastContacted: m.merchant?.lastContacted,
      lastSeen: m.activity.lastActivity
    })),
    count: limited.length,
    total: merchants.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Search vendors
 * GET /api/search/vendors
 */
searchRoutes.get('/search/vendors', (req, res) => {
  const { q, city, service, limit = 50 } = req.query;

  let vendors = identityService.getByType('vendor', 1000);

  // Filter by query
  if (q) {
    const query = (q as string).toLowerCase();
    vendors = vendors.filter(v => {
      const name = v.vendor?.businessName?.toLowerCase() || '';
      const contact = v.vendor?.contactName?.toLowerCase() || '';
      return name.includes(query) || contact.includes(query);
    });
  }

  // Filter by city
  if (city) {
    vendors = vendors.filter(v => v.vendor?.location?.city === city);
  }

  // Filter by service
  if (service) {
    vendors = vendors.filter(v => v.vendor?.services?.includes(service as string));
  }

  const limited = vendors.slice(0, Number(limit));

  res.json({
    success: true,
    data: limited.map(v => ({
      id: v.id,
      businessName: v.vendor?.businessName,
      contactName: v.vendor?.contactName,
      phone: v.vendor?.phone,
      email: v.vendor?.email,
      services: v.vendor?.services,
      city: v.vendor?.location?.city,
      rating: v.vendor?.rating,
      completedOrders: v.vendor?.completedOrders,
      socialProfiles: v.socialProfiles,
      totalFollowers: socialVerificationService.getTotalFollowers(v.socialProfiles)
    })),
    count: limited.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Search customers
 * GET /api/search/customers
 */
searchRoutes.get('/search/customers', (req, res) => {
  const { q, city, minLTV, maxLTV, minOrders, limit = 50 } = req.query;

  let customers = identityService.getByType('customer', 1000);

  // Filter by query
  if (q) {
    const query = (q as string).toLowerCase();
    customers = customers.filter(c => {
      const name = c.customer?.name?.toLowerCase() || '';
      const email = c.customer?.email?.toLowerCase() || '';
      return name.includes(query) || email.includes(query);
    });
  }

  // Filter by city
  if (city) {
    customers = customers.filter(c => c.customer?.location?.city === city);
  }

  // Filter by LTV
  if (minLTV) {
    customers = customers.filter(c => (c.customer?.lifetimeValue || 0) >= Number(minLTV));
  }
  if (maxLTV) {
    customers = customers.filter(c => (c.customer?.lifetimeValue || 0) <= Number(maxLTV));
  }

  // Filter by order count
  if (minOrders) {
    customers = customers.filter(c => (c.customer?.totalOrders || 0) >= Number(minOrders));
  }

  const limited = customers.slice(0, Number(limit));

  res.json({
    success: true,
    data: limited.map(c => ({
      id: c.id,
      name: c.customer?.name,
      phone: c.customer?.phone,
      email: c.customer?.email,
      city: c.customer?.location?.city,
      lifetimeValue: c.customer?.lifetimeValue,
      totalOrders: c.customer?.totalOrders,
      avgOrderValue: c.customer?.avgOrderValue,
      loyaltyPoints: c.customer?.loyaltyPoints,
      appUsageScore: c.customer?.appUsageScore,
      lastSeen: c.customer?.lastSeen,
      socialProfiles: c.socialProfiles,
      totalFollowers: socialVerificationService.getTotalFollowers(c.socialProfiles)
    })),
    count: limited.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * Quick lookup by phone
 * GET /api/search/phone/:phone
 */
searchRoutes.get('/search/phone/:phone', (req, res) => {
  const { phone } = req.params;

  const identity = identityService.resolve(phone);

  if (!identity) {
    return res.status(404).json({
      success: false,
      found: false,
      timestamp: new Date().toISOString()
    });
  }

  const profile = identity.merchant || identity.customer || identity.vendor || identity.employee;
  const name = identity.customer?.name || identity.merchant?.businessName || identity.vendor?.businessName || identity.employee?.name || 'Unknown';

  res.json({
    success: true,
    found: true,
    data: {
      id: identity.id,
      type: identity.merchant ? 'merchant' : identity.customer ? 'customer' : identity.vendor ? 'vendor' : 'employee',
      name,
      phone: identity.primaryPhone,
      email: identity.primaryEmail,
      score: identity.identityScore,
      status: identity.status,
      socialProfiles: identity.socialProfiles.length,
      totalFollowers: socialVerificationService.getTotalFollowers(identity.socialProfiles)
    },
    timestamp: new Date().toISOString()
  });
});

// ==================== HELPER FUNCTIONS ====================

function getMatchedOn(identity: any, query: string): SearchResult['matchedOn'] {
  const matched: SearchResult['matchedOn'] = [];

  if (identity.primaryPhone?.includes(query)) matched.push('phone');
  if (identity.primaryEmail?.toLowerCase().includes(query.toLowerCase())) matched.push('email');
  if ((identity.customer?.name || identity.merchant?.businessName || '')?.toLowerCase().includes(query.toLowerCase())) matched.push('name');
  if (identity.merchant?.gstin?.toLowerCase().includes(query.toLowerCase())) matched.push('gstin');

  return matched;
}

function getSource(identity: any): string {
  if (identity.customer) return identity.customer.source;
  if (identity.merchant) return identity.merchant.source;
  if (identity.vendor) return identity.vendor.source;
  if (identity.employee) return identity.employee.source;
  return 'unknown';
}