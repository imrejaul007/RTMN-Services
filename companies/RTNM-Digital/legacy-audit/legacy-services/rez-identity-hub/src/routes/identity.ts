/**
 * Identity Routes
 *
 * Identity resolution and management endpoints
 */

import { Router } from 'express';
import { identityService } from '../services/identityService.js';
import { socialVerificationService } from '../services/socialVerificationService.js';
import type { PreCallBrief } from '../models/types.js';

export const identityRoutes = Router();

// Health check already in index.ts

/**
 * Get identity by ID
 * GET /api/identity/:id
 */
identityRoutes.get('/identity/:id', (req, res) => {
  const { id } = req.params;

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Identity ${id} not found` },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: identity,
    timestamp: new Date().toISOString()
  });
});

/**
 * Resolve identity by phone or email
 * POST /api/identity/resolve
 */
identityRoutes.post('/identity/resolve', (req, res) => {
  const { phone, email } = req.body;

  if (!phone && !email) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'phone or email required' },
      timestamp: new Date().toISOString()
    });
  }

  const identity = identityService.resolve(phone, email);

  res.json({
    success: true,
    found: !!identity,
    data: identity,
    timestamp: new Date().toISOString()
  });
});

/**
 * Create new identity
 * POST /api/identity
 */
identityRoutes.post('/identity', (req, res) => {
  const identity = identityService.create(req.body);

  res.status(201).json({
    success: true,
    data: identity,
    timestamp: new Date().toISOString()
  });
});

/**
 * Link identities (same person across apps)
 * POST /api/identity/link
 */
identityRoutes.post('/identity/link', (req, res) => {
  const { sourceId, targetId } = req.body;

  if (!sourceId || !targetId) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'sourceId and targetId required' },
      timestamp: new Date().toISOString()
    });
  }

  const merged = identityService.link(sourceId, targetId);

  if (!merged) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'One or both identities not found' },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    message: 'Identities linked successfully',
    data: merged,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get pre-call research brief
 * GET /api/identity/:id/brief
 *
 * Comprehensive research brief before outreach
 */
identityRoutes.get('/identity/:id/brief', async (req, res) => {
  const { id } = req.params;
  const startTime = Date.now();

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Identity ${id} not found` },
      timestamp: new Date().toISOString()
    });
  }

  // Determine user type and primary profile
  const userType = identity.merchant ? 'merchant' : identity.customer ? 'customer' : 'vendor';
  const profile = identity.merchant || identity.customer || identity.vendor || identity.employee;

  // Generate talking points
  const talkingPoints = generateTalkingPoints(identity, userType);

  // Get display name based on profile type
  const displayName = identity.customer?.name || identity.merchant?.businessName || identity.vendor?.businessName || identity.employee?.name || 'Unknown';

  // Build brief
  const brief: PreCallBrief = {
    identity: {
      id: identity.id,
      name: displayName,
      type: userType,
      primaryPhone: identity.primaryPhone,
      photo: identity.customer?.avatar || identity.employee?.avatar
    },

    profile: {
      customer: identity.customer ? {
        name: identity.customer.name,
        phone: identity.customer.phone,
        email: identity.customer.email,
        location: identity.customer.location,
        walletBalance: identity.customer.walletBalance,
        loyaltyPoints: identity.customer.loyaltyPoints,
        lifetimeValue: identity.customer.lifetimeValue,
        totalOrders: identity.customer.totalOrders,
        avgOrderValue: identity.customer.avgOrderValue,
        appUsageScore: identity.customer.appUsageScore,
        lastSeen: identity.customer.lastSeen,
        favoriteMerchants: identity.customer.favoriteMerchants
      } : undefined,
      merchant: identity.merchant ? {
        businessName: identity.merchant.businessName,
        ownerName: identity.merchant.ownerName,
        phone: identity.merchant.phone,
        email: identity.merchant.email,
        gstin: identity.merchant.gstin,
        category: identity.merchant.category,
        address: identity.merchant.address,
        monthlyRevenue: identity.merchant.monthlyRevenue,
        employeeCount: identity.merchant.employeeCount,
        yearsInBusiness: identity.merchant.yearsInBusiness,
        googleRating: identity.merchant.googleRating,
        googleReviews: identity.merchant.googleReviews,
        hasPOS: identity.merchant.hasPOS,
        posProvider: identity.merchant.posProvider,
        hasQRMenu: identity.merchant.hasQRMenu,
        hasLoyalty: identity.merchant.hasLoyalty,
        hasDelivery: identity.merchant.hasDelivery,
        deliveryPartners: identity.merchant.deliveryPartners,
        merchantScore: identity.merchant.merchantScore,
        leadStatus: identity.merchant.leadStatus,
        lastContacted: identity.merchant.lastContacted
      } : undefined,
      vendor: identity.vendor,
      employee: identity.employee
    },

    social: {
      profiles: identity.socialProfiles,
      totalFollowers: socialVerificationService.getTotalFollowers(identity.socialProfiles),
      verificationScore: socialVerificationService.calculateVerificationScore(identity.socialProfiles)
    },

    activity: {
      appsUsed: getAppsUsed(identity),
      totalOrders: identity.activity.totalTransactions,
      totalSpent: identity.activity.totalSpent,
      loyaltyPoints: identity.customer?.loyaltyPoints || 0,
      lastActive: identity.activity.lastActivity,
      engagementScore: calculateEngagementScore(identity)
    },

    opportunities: {
      open: getOpenOpportunities(identity),
      suggested: getSuggestedProducts(identity),
      suggestedProducts: getSuggestedProducts(identity)
    },

    talkingPoints,

    flags: {
      isFlagged: identity.status === 'flagged',
      reason: identity.status === 'flagged' ? 'Identity flagged for review' : undefined,
      spamRisk: isSpamRisk(identity),
      vfyRisk: identity.identityScore < 50
    },

    research: {
      completedAt: new Date().toISOString(),
      sources: getSources(identity),
      confidence: identity.identityScore,
      timeToResearch: Date.now() - startTime
    }
  };

  res.json({
    success: true,
    data: brief,
    timestamp: new Date().toISOString()
  });
});

/**
 * Quick summary for display
 * GET /api/identity/:id/summary
 */
identityRoutes.get('/identity/:id/summary', (req, res) => {
  const { id } = req.params;

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `Identity ${id} not found` },
      timestamp: new Date().toISOString()
    });
  }

  const profile = identity.merchant || identity.customer || identity.vendor || identity.employee;
  const userType = identity.merchant ? 'merchant' : identity.customer ? 'customer' : 'vendor';
  const name = identity.customer?.name || identity.merchant?.businessName || identity.vendor?.businessName || identity.employee?.name || 'Unknown';
  const location = identity.customer?.location?.city || identity.merchant?.address?.city || identity.vendor?.location?.city || identity.employee?.department;

  res.json({
    success: true,
    data: {
      id: identity.id,
      name,
      type: userType,
      phone: identity.primaryPhone,
      email: identity.primaryEmail,
      location,
      score: identity.identityScore,
      status: identity.status,
      socialCount: identity.socialProfiles.length,
      totalFollowers: socialVerificationService.getTotalFollowers(identity.socialProfiles),
      lastSeen: identity.activity.lastActivity,
      appsUsed: getAppsUsed(identity)
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get identity stats
 * GET /api/identity/stats
 */
identityRoutes.get('/identity/stats', (req, res) => {
  res.json({
    success: true,
    data: identityService.getStats(),
    timestamp: new Date().toISOString()
  });
});

// ==================== HELPER FUNCTIONS ====================

function generateTalkingPoints(identity: any, userType: string): PreCallBrief['talkingPoints'] {
  const points: PreCallBrief['talkingPoints'] = {
    recentActivity: '',
    achievements: '',
    painPoints: '',
    previousOffers: ''
  };

  if (userType === 'customer') {
    if (identity.customer) {
      // Recent activity
      if (identity.customer.lastOrderDate) {
        const days = Math.floor((Date.now() - new Date(identity.customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24));
        points.recentActivity = `Last order ${days} days ago. Total ${identity.customer.totalOrders} orders.`;
      }

      // Achievements
      if (identity.customer.lifetimeValue && identity.customer.lifetimeValue > 50000) {
        points.achievements = `Premium customer with ₹${identity.customer.lifetimeValue.toLocaleString()} lifetime value`;
      }
      if (identity.customer.loyaltyPoints && identity.customer.loyaltyPoints > 1000) {
        points.achievements += `. Has ${identity.customer.loyaltyPoints} loyalty points.`;
      }

      // Pain points
      const lowEngagement = identity.customer.appUsageScore && identity.customer.appUsageScore < 50;
      if (lowEngagement) {
        points.painPoints = 'App engagement declining. Consider reactivation offer.';
      }
    }
  }

  if (userType === 'merchant') {
    if (identity.merchant) {
      // Recent activity
      if (identity.merchant.lastContacted) {
        const days = Math.floor((Date.now() - new Date(identity.merchant.lastContacted).getTime()) / (1000 * 60 * 60 * 24));
        points.recentActivity = `Last contacted ${days} days ago. Status: ${identity.merchant.leadStatus}.`;
      }

      // Achievements
      if (identity.merchant.googleRating && identity.merchant.googleRating >= 4.5) {
        points.achievements = `Strong rating of ${identity.merchant.googleRating} stars with ${identity.merchant.googleReviews} reviews.`;
      }
      if (identity.merchant.yearsInBusiness && identity.merchant.yearsInBusiness >= 5) {
        points.achievements += ` Established ${identity.merchant.yearsInBusiness} years in business.`;
      }

      // Pain points
      const gaps: string[] = [];
      if (!identity.merchant.hasQRMenu) gaps.push('no QR menu');
      if (!identity.merchant.hasLoyalty) gaps.push('no loyalty program');
      if (!identity.merchant.hasPOS) gaps.push('no POS system');
      if (!identity.merchant.hasDelivery) gaps.push('not on delivery platforms');

      if (gaps.length > 0) {
        points.painPoints = `Has ${gaps.join(', ')}.`;
      }

      // Previous offers
      if (identity.merchant.leadStatus === 'warm') {
        points.previousOffers = 'Previously shown interest. Good time to follow up.';
      }
      if (identity.merchant.leadStatus === 'cold') {
        points.previousOffers = 'Not responsive previously. Try different approach.';
      }
    }
  }

  return points;
}

function getAppsUsed(identity: any): string[] {
  const apps: string[] = [];
  if (identity.customer) apps.push('REZ Consumer');
  if (identity.merchant) apps.push('REZ Merchant');
  if (identity.vendor) apps.push(identity.vendor.source === 'nexha' ? 'Nexha' : 'CorpPerks');
  if (identity.employee) apps.push('CorpPerks');
  return apps;
}

function calculateEngagementScore(identity: any): number {
  let score = 0;

  // Based on identity score
  score += identity.identityScore * 0.3;

  // Based on activity recency
  const lastActivity = new Date(identity.activity.lastActivity);
  const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSinceActivity < 7) score += 30;
  else if (daysSinceActivity < 30) score += 20;
  else if (daysSinceActivity < 90) score += 10;

  // Based on app usage
  score += Math.min(identity.activity.totalAppsUsed * 10, 20);

  return Math.round(Math.min(score, 100));
}

function getOpenOpportunities(identity: any): number {
  let count = 0;

  if (identity.merchant) {
    if (!identity.merchant.hasQRMenu) count++;
    if (!identity.merchant.hasLoyalty) count++;
    if (!identity.merchant.hasPOS) count++;
    if (!identity.merchant.hasDelivery) count++;
  }

  return count;
}

function getSuggestedProducts(identity: any): string[] {
  const products: string[] = [];

  if (identity.merchant) {
    if (!identity.merchant.hasQRMenu) products.push('REZ Menu QR');
    if (!identity.merchant.hasLoyalty) products.push('REZ Loyalty');
    if (!identity.merchant.hasPOS) products.push('REZ POS');
    if (!identity.merchant.hasDelivery) products.push('REZ Delivery');
    if (identity.merchant.googleRating && identity.merchant.googleRating < 4) products.push('REZ Reviews');
    if (identity.merchant.posProvider && identity.merchant.posProvider !== 'REZ') products.push('REZ POS Migration');
  }

  if (identity.customer) {
    if (identity.customer.loyaltyPoints && identity.customer.loyaltyPoints > 5000) products.push('Premium Membership');
    if (!identity.customer.preferences?.cuisine?.length) products.push('Personalized Recommendations');
  }

  return products;
}

function isSpamRisk(identity: any): boolean {
  // Check for red flags
  if (identity.identityScore < 30) return true;
  if (!identity.primaryPhone || identity.primaryPhone.length < 10) return true;
  return false;
}

function getSources(identity: any): string[] {
  const sources: string[] = [];
  if (identity.customer) sources.push('REZ Consumer');
  if (identity.merchant) sources.push('REZ SalesMind');
  if (identity.vendor) sources.push(identity.vendor.source);
  if (identity.employee) sources.push('CorpPerks');
  if (identity.socialProfiles.length > 0) sources.push('Social Media');
  return sources;
}