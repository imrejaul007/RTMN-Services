/**
 * Profile Routes
 *
 * Profile management by type (customer/merchant/vendor/employee)
 */

import { Router } from 'express';
import { identityService } from '../services/identityService.js';
import { socialVerificationService } from '../services/socialVerificationService.js';

export const profileRoutes = Router();

/**
 * Get profile by type and ID
 * GET /api/profile/:type/:id
 */
profileRoutes.get('/profile/:type/:id', (req, res) => {
  const { type, id } = req.params;

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `${type} profile not found` },
      timestamp: new Date().toISOString()
    });
  }

  let profile: any = null;

  switch (type) {
    case 'customer':
      profile = identity.customer;
      break;
    case 'merchant':
      profile = identity.merchant;
      break;
    case 'vendor':
      profile = identity.vendor;
      break;
    case 'employee':
      profile = identity.employee;
      break;
    default:
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TYPE', message: 'Type must be: customer, merchant, vendor, or employee' },
        timestamp: new Date().toISOString()
      });
  }

  if (!profile) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: `${type} profile not found for this identity` },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      ...profile,
      identityId: identity.id,
      socialProfiles: identity.socialProfiles,
      verifiedSocialCount: identity.socialProfiles.filter(p => p.verified).length,
      totalFollowers: socialVerificationService.getTotalFollowers(identity.socialProfiles),
      verificationScore: socialVerificationService.calculateVerificationScore(identity.socialProfiles)
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Create or update profile
 * POST /api/profile
 */
profileRoutes.post('/profile', (req, res) => {
  const { type, phone, email, data } = req.body;

  if (!type || !phone) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'type and phone required' },
      timestamp: new Date().toISOString()
    });
  }

  // Check if identity already exists
  let identity = identityService.resolve(phone, email);

  if (!identity) {
    // Create new identity with this profile
    identity = identityService.create({
      phone,
      email,
      type,
      ...(type === 'customer' && { customer: { userId: `cust_${Date.now()}`, type: 'customer', name: data?.name || '', phone, email } }),
      ...(type === 'merchant' && { merchant: { userId: `merch_${Date.now()}`, type: 'merchant', businessName: data?.businessName || '', phone, email } }),
      ...(type === 'vendor' && { vendor: { userId: `vend_${Date.now()}`, type: 'vendor', businessName: data?.businessName || '', phone, email } }),
      ...(type === 'employee' && { employee: { userId: `emp_${Date.now()}`, type: 'employee', name: data?.name || '', phone, email } })
    });
  }

  res.status(201).json({
    success: true,
    data: identity,
    timestamp: new Date().toISOString()
  });
});

/**
 * Enrich profile with additional data
 * PUT /api/profile/:id/enrich
 */
profileRoutes.put('/profile/:id/enrich', async (req, res) => {
  const { id } = req.params;
  const { website, socialUrls } = req.body;

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Identity not found' },
      timestamp: new Date().toISOString()
    });
  }

  const enrichment: any = {
    enrichedAt: new Date().toISOString()
  };

  // Scrape social profiles from website
  if (website) {
    try {
      const socialProfiles = await socialVerificationService.scrapeFromWebsite(website);

      // Verify each profile
      const verifiedProfiles = await socialVerificationService.verifyAllProfiles(socialProfiles);

      identityService.updateSocialProfiles(id, verifiedProfiles);

      enrichment.socialProfiles = verifiedProfiles;
      enrichment.totalFollowers = socialVerificationService.getTotalFollowers(verifiedProfiles);
      enrichment.verificationScore = socialVerificationService.calculateVerificationScore(verifiedProfiles);
    } catch (error: any) {
      enrichment.socialError = error.message;
    }
  }

  // Add specific social URLs
  if (socialUrls && Array.isArray(socialUrls)) {
    for (const url of socialUrls) {
      const platform = getPlatformFromUrl(url);
      if (platform) {
        const profile = await socialVerificationService.verifyProfile(platform as any, url);
        if (profile) {
          identity.socialProfiles.push(profile);
        }
      }
    }
    identityService.updateSocialProfiles(id, identity.socialProfiles);
  }

  // Update identity score
  identity.identityScore = Math.min(100, identity.identityScore + 10);
  identityService.update(id, { identityScore: identity.identityScore });

  res.json({
    success: true,
    data: {
      identityId: id,
      ...enrichment,
      newScore: identity.identityScore
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get activity across all apps
 * GET /api/profile/:id/activity
 */
profileRoutes.get('/profile/:id/activity', (req, res) => {
  const { id } = req.params;

  const identity = identityService.getById(id);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Identity not found' },
      timestamp: new Date().toISOString()
    });
  }

  // Build activity summary
  const activity: any = {
    identityId: id,
    appsUsed: [],
    totalTransactions: identity.activity.totalTransactions,
    totalSpent: identity.activity.totalSpent,
    totalEarned: identity.activity.totalEarned,
    lastActivity: identity.activity.lastActivity
  };

  if (identity.customer) {
    activity.appsUsed.push({
      app: 'REZ Consumer',
      lastUsed: identity.customer.lastSeen,
      totalOrders: identity.customer.totalOrders,
      totalSpent: identity.customer.lifetimeValue,
      loyaltyPoints: identity.customer.loyaltyPoints
    });
  }

  if (identity.merchant) {
    activity.appsUsed.push({
      app: 'REZ Merchant',
      lastUsed: identity.merchant.lastContacted || identity.merchant.updatedAt,
      merchantScore: identity.merchant.merchantScore,
      leadStatus: identity.merchant.leadStatus,
      monthlyRevenue: identity.merchant.monthlyRevenue
    });
  }

  if (identity.vendor) {
    activity.appsUsed.push({
      app: identity.vendor.source === 'nexha' ? 'Nexha' : 'CorpPerks',
      lastUsed: identity.vendor.updatedAt,
      completedOrders: identity.vendor.completedOrders,
      rating: identity.vendor.rating
    });
  }

  if (identity.employee) {
    activity.appsUsed.push({
      app: 'CorpPerks',
      lastUsed: identity.employee.updatedAt,
      department: identity.employee.department,
      designation: identity.employee.designation
    });
  }

  res.json({
    success: true,
    data: activity,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get all profiles of a type
 * GET /api/profiles/:type
 */
profileRoutes.get('/profiles/:type', (req, res) => {
  const { type } = req.params;
  const { limit = 100 } = req.query;

  const profiles = identityService.getByType(type as any, Number(limit));

  res.json({
    success: true,
    data: profiles,
    count: profiles.length,
    timestamp: new Date().toISOString()
  });
});

// Helper function to detect platform from URL
function getPlatformFromUrl(url: string): string | null {
  if (url.includes('linkedin.com')) return 'linkedin';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  if (url.includes('facebook.com')) return 'facebook';
  if (url.includes('instagram.com')) return 'instagram';
  if (url.includes('youtube.com')) return 'youtube';
  return null;
}