/**
 * Social Routes
 *
 * Social media verification and profile management
 */

import { Router } from 'express';
import { identityService } from '../services/identityService.js';
import { socialVerificationService } from '../services/socialVerificationService.js';

export const socialRoutes = Router();

/**
 * Verify social media accounts
 * POST /api/social/verify
 */
socialRoutes.post('/social/verify', async (req, res) => {
  try {
    const { profiles } = req.body;

    if (!profiles || !Array.isArray(profiles)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'profiles array required' },
        timestamp: new Date().toISOString()
      });
    }

    // Verify each profile
    const verifiedProfiles = await socialVerificationService.verifyAllProfiles(profiles);

    res.json({
      success: true,
      data: {
        profiles: verifiedProfiles,
        totalFollowers: socialVerificationService.getTotalFollowers(verifiedProfiles),
        verificationScore: socialVerificationService.calculateVerificationScore(verifiedProfiles),
        verifiedCount: verifiedProfiles.filter(p => p.verified).length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'VERIFICATION_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get verified social profiles for a user
 * GET /api/social/:userId
 */
socialRoutes.get('/social/:userId', (req, res) => {
  const { userId } = req.params;

  const identity = identityService.getById(userId);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    success: true,
    data: {
      userId,
      profiles: identity.socialProfiles,
      totalFollowers: socialVerificationService.getTotalFollowers(identity.socialProfiles),
      verificationScore: socialVerificationService.calculateVerificationScore(identity.socialProfiles),
      verifiedCount: identity.socialProfiles.filter(p => p.verified).length,
      verifiedAt: identity.socialProfiles[0]?.verifiedAt
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Scrape social media for a user/company
 * POST /api/social/scrape
 */
socialRoutes.post('/social/scrape', async (req, res) => {
  try {
    const { url, businessName } = req.body;

    if (!url && !businessName) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PARAMS', message: 'url or businessName required' },
        timestamp: new Date().toISOString()
      });
    }

    let profiles: any[] = [];

    if (url) {
      // Scrape from website
      profiles = await socialVerificationService.scrapeFromWebsite(url);
    } else if (businessName) {
      // Search for profiles by name
      profiles = await socialVerificationService.searchProfiles(businessName);
    }

    // Verify each profile
    const verifiedProfiles = await socialVerificationService.verifyAllProfiles(profiles);

    res.json({
      success: true,
      data: {
        profiles: verifiedProfiles,
        totalFollowers: socialVerificationService.getTotalFollowers(verifiedProfiles),
        verificationScore: socialVerificationService.calculateVerificationScore(verifiedProfiles),
        source: url ? 'website' : 'search'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SCRAPE_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Link social profiles to identity
 * POST /api/social/link
 */
socialRoutes.post('/social/link', (req, res) => {
  const { identityId, profiles } = req.body;

  if (!identityId || !profiles) {
    return res.status(400).json({
      success: false,
      error: { code: 'MISSING_PARAMS', message: 'identityId and profiles required' },
      timestamp: new Date().toISOString()
    });
  }

  const identity = identityService.getById(identityId);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Identity not found' },
      timestamp: new Date().toISOString()
    });
  }

  // Add new profiles
  const existingPlatforms = new Set(identity.socialProfiles.map(p => p.platform));
  const newProfiles = profiles.filter((p: any) => !existingPlatforms.has(p.platform));

  identityService.updateSocialProfiles(identityId, [...identity.socialProfiles, ...newProfiles]);

  res.json({
    success: true,
    data: {
      identityId,
      totalProfiles: identity.socialProfiles.length + newProfiles.length,
      newProfiles: newProfiles.length,
      totalFollowers: socialVerificationService.getTotalFollowers([...identity.socialProfiles, ...newProfiles])
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get social media summary across platform
 * GET /api/social/summary/:userId
 */
socialRoutes.get('/social/summary/:userId', (req, res) => {
  const { userId } = req.params;

  const identity = identityService.getById(userId);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
      timestamp: new Date().toISOString()
    });
  }

  const profiles = identity.socialProfiles;

  // Build platform summary
  const summary = {
    linkedin: profiles.filter(p => p.platform === 'linkedin')[0] || null,
    facebook: profiles.filter(p => p.platform === 'facebook')[0] || null,
    instagram: profiles.filter(p => p.platform === 'instagram')[0] || null,
    twitter: profiles.filter(p => p.platform === 'twitter')[0] || null,
    youtube: profiles.filter(p => p.platform === 'youtube')[0] || null
  };

  res.json({
    success: true,
    data: {
      userId,
      platforms: summary,
      totalProfiles: profiles.length,
      verifiedProfiles: profiles.filter(p => p.verified).length,
      totalFollowers: socialVerificationService.getTotalFollowers(profiles),
      verificationScore: socialVerificationService.calculateVerificationScore(profiles)
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Check if user has social media presence
 * GET /api/social/check/:userId
 */
socialRoutes.get('/social/check/:userId', (req, res) => {
  const { userId } = req.params;

  const identity = identityService.getById(userId);

  if (!identity) {
    return res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'User not found' },
      timestamp: new Date().toISOString()
    });
  }

  const profiles = identity.socialProfiles;

  // Check presence by platform
  const hasPresence = {
    linkedin: profiles.some(p => p.platform === 'linkedin'),
    facebook: profiles.some(p => p.platform === 'facebook'),
    instagram: profiles.some(p => p.platform === 'instagram'),
    twitter: profiles.some(p => p.platform === 'twitter'),
    youtube: profiles.some(p => p.platform === 'youtube')
  };

  // Calculate presence score
  const presentCount = Object.values(hasPresence).filter(Boolean).length;
  const presenceScore = (presentCount / 5) * 100;

  res.json({
    success: true,
    data: {
      userId,
      hasPresence,
      totalProfiles: profiles.length,
      presenceScore,
      recommendation: presentCount === 0
        ? 'No social media presence detected. Consider verifying profiles.'
        : presentCount < 3
          ? 'Limited social presence. More platforms could increase trust.'
          : 'Good social media presence across multiple platforms.'
    },
    timestamp: new Date().toISOString()
  });
});