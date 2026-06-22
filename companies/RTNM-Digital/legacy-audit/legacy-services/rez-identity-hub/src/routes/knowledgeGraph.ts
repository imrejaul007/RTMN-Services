/**
 * Knowledge Graph Routes
 *
 * Access comprehensive user data from ALL sources
 */

import { Router } from 'express';
import { identityService } from '../services/identityService.js';
import { knowledgeGraphService, DATA_SOURCES, type ComprehensiveUserProfile } from '../models/knowledgeGraph.js';

export const knowledgeGraphRoutes = Router();

/**
 * Get full knowledge graph for a user
 * GET /api/knowledge/:userId
 *
 * Returns comprehensive profile with data from ALL sources
 */
knowledgeGraphRoutes.get('/knowledge/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // First get the identity
    const identity = identityService.getById(userId);

    if (!identity) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Build comprehensive profile from all sources
    const profile = await buildComprehensiveProfile(identity);

    res.json({
      success: true,
      data: profile,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get data from specific source
 * GET /api/knowledge/:userId/source/:sourceName
 */
knowledgeGraphRoutes.get('/knowledge/:userId/source/:sourceName', async (req, res) => {
  try {
    const { userId, sourceName } = req.params;

    const identity = identityService.getById(userId);

    if (!identity) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
        timestamp: new Date().toISOString()
      });
    }

    // Fetch from specific source
    const sourceData = await fetchFromSource(sourceName, identity);

    res.json({
      success: true,
      data: {
        userId,
        source: sourceName,
        data: sourceData,
        sourceConfig: DATA_SOURCES[sourceName]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get aggregated insights
 * GET /api/knowledge/:userId/insights
 */
knowledgeGraphRoutes.get('/knowledge/:userId/insights', async (req, res) => {
  try {
    const { userId } = req.params;

    const identity = identityService.getById(userId);

    if (!identity) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
        timestamp: new Date().toISOString()
      });
    }

    const profile = await buildComprehensiveProfile(identity);
    const insights = knowledgeGraphService.calculateInsights(profile);

    res.json({
      success: true,
      data: {
        userId,
        insights,
        breakdown: {
          totalValue: insights.totalValue,
          riskFactors: getRiskFactors(profile),
          engagementDrivers: getEngagementDrivers(profile),
          valueDrivers: getValueDrivers(profile),
          churnIndicators: getChurnIndicators(profile),
          upsellOpportunities: getUpsellOpportunities(profile)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'CALCULATION_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get comparison across similar users
 * GET /api/knowledge/:userId/compare
 */
knowledgeGraphRoutes.get('/knowledge/:userId/compare', async (req, res) => {
  try {
    const { userId } = req.params;
    const { segment = 'all' } = req.query;

    const identity = identityService.getById(userId);

    if (!identity) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' },
        timestamp: new Date().toISOString()
      });
    }

    const profile = await buildComprehensiveProfile(identity);
    const insights = knowledgeGraphService.calculateInsights(profile);

    // Get segment averages (would come from analytics in production)
    const segmentStats = getSegmentStats(profile, segment as string);

    res.json({
      success: true,
      data: {
        userId,
        userMetrics: {
          totalValue: insights.totalValue,
          engagementScore: insights.engagementScore,
          valueScore: insights.valueScore,
          riskScore: insights.riskScore
        },
        segmentAverages: segmentStats,
        percentile: calculatePercentile(insights.valueScore, segmentStats),
        comparison: {
          aboveAverage: insights.valueScore > segmentStats.avgValueScore,
          difference: insights.valueScore - segmentStats.avgValueScore
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'COMPARISON_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get all data sources status
 * GET /api/knowledge/sources
 */
knowledgeGraphRoutes.get('/knowledge/sources', (req, res) => {
  const sources = Object.entries(DATA_SOURCES).map(([key, config]) => ({
    id: key,
    name: config.name,
    port: config.port,
    syncFrequency: config.syncFrequency,
    status: config.status,
    lastSync: config.lastSync
  }));

  res.json({
    success: true,
    data: {
      totalSources: sources.length,
      activeSources: sources.filter(s => s.status === 'active').length,
      sources
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Sync data from a source
 * POST /api/knowledge/sync/:sourceName
 */
knowledgeGraphRoutes.post('/knowledge/sync/:sourceName', async (req, res) => {
  try {
    const { sourceName } = req.params;
    const { userId } = req.body;

    if (!DATA_SOURCES[sourceName]) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_SOURCE', message: 'Unknown data source' },
        timestamp: new Date().toISOString()
      });
    }

    // Update last sync time
    DATA_SOURCES[sourceName].lastSync = new Date().toISOString();

    res.json({
      success: true,
      data: {
        source: sourceName,
        syncedAt: DATA_SOURCES[sourceName].lastSync,
        userId: userId || 'all'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'SYNC_FAILED', message: error.message },
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== HELPER FUNCTIONS ====================

async function buildComprehensiveProfile(identity: any): Promise<ComprehensiveUserProfile> {
  const profile: ComprehensiveUserProfile = {
    identity: {
      userId: identity.id,
      primaryPhone: identity.primaryPhone,
      primaryEmail: identity.primaryEmail,
      verified: identity.status === 'verified',
      verificationMethods: identity.status === 'verified' ? ['phone', 'email'] : []
    },
    insights: {
      totalValue: 0,
      riskScore: 0,
      engagementScore: 0,
      valueScore: 0,
      churnRisk: 'medium',
      upsellPotential: 'medium',
      sentiment: 'neutral',
      lastActive: identity.activity.lastActivity,
      dataCompleteness: 0,
      dataSources: [],
      dataFreshness: {}
    },
    metadata: {
      createdAt: identity.createdAt,
      updatedAt: identity.updatedAt,
      lastFullSync: new Date().toISOString(),
      version: '1.0.0'
    }
  };

  const activeSources: string[] = [];

  // REZ Consumer data
  if (identity.customer) {
    profile.consumer = {
      name: identity.customer.name,
      dateOfBirth: identity.customer.dateOfBirth,
      gender: identity.customer.gender,
      location: {
        currentCity: identity.customer.location?.city || '',
        homeAddress: identity.customer.location?.address
      },
      wallet: {
        balance: identity.customer.walletBalance || 0,
        coins: 0,
        cashbackEarned: 0,
        cashbackSpent: 0
      },
      loyalty: {
        points: identity.customer.loyaltyPoints || 0,
        tier: 'bronze',
        pointsEarned: identity.customer.lifetimeValue || 0,
        pointsRedeemed: 0
      },
      orders: {
        total: identity.customer.totalOrders || 0,
        totalSpent: identity.customer.lifetimeValue || 0,
        avgOrderValue: identity.customer.avgOrderValue || 0,
        lastOrderDate: identity.customer.lastOrderDate,
        favoriteMerchants: identity.customer.favoriteMerchants || [],
        favoriteCategories: []
      },
      preferences: {
        cuisine: identity.customer.preferences?.cuisine || [],
        brands: identity.customer.preferences?.brands || [],
        paymentMethods: [],
        notificationPrefs: {
          push: identity.customer.pushEnabled || false,
          email: identity.customer.emailEnabled || false,
          sms: true
        }
      },
      engagement: {
        appOpenCount: 0,
        lastActive: identity.customer.lastSeen || '',
        sessionsCount: identity.customer.totalOrders || 0,
        avgSessionDuration: 0
      }
    };
    activeSources.push('REZ Consumer');
  }

  // REZ Merchant data
  if (identity.merchant) {
    profile.merchant = {
      businessName: identity.merchant.businessName,
      ownerName: identity.merchant.ownerName || '',
      businessType: identity.merchant.category,
      category: identity.merchant.category,
      subcategory: identity.merchant.subcategory,
      gstin: identity.merchant.gstin,
      pan: identity.merchant.pan,
      address: {
        full: identity.merchant.address?.address || '',
        city: identity.merchant.address?.city || '',
        state: identity.merchant.address?.state || '',
        pincode: identity.merchant.address?.pincode || '',
        coordinates: identity.merchant.address?.lat ? {
          lat: identity.merchant.address.lat,
          lng: identity.merchant.address.lng
        } : undefined
      },
      contact: {
        phone: identity.merchant.phone,
        whatsapp: identity.merchant.phone,
        email: identity.merchant.email,
        website: identity.merchant.website
      },
      businessMetrics: {
        monthlyRevenue: identity.merchant.monthlyRevenue || 0,
        dailyTransactions: 0,
        avgTransactionValue: 0,
        yearsInBusiness: identity.merchant.yearsInBusiness || 0,
        employeeCount: identity.merchant.employeeCount || 0
      },
      techStack: {
        hasPOS: identity.merchant.hasPOS || false,
        posProvider: identity.merchant.posProvider,
        hasQRMenu: identity.merchant.hasQRMenu || false,
        hasLoyalty: identity.merchant.hasLoyalty || false,
        hasDelivery: identity.merchant.hasDelivery || false,
        deliveryPartners: identity.merchant.deliveryPartners,
        hasOnlineOrdering: false,
        hasTableBooking: false
      },
      ratings: {
        google: identity.merchant.googleRating ? {
          rating: identity.merchant.googleRating,
          reviews: identity.merchant.googleReviews || 0,
          lastUpdated: identity.merchant.updatedAt
        } : undefined
      },
      digitalPresence: {},
      rezekaData: {
        merchantId: identity.merchant.userId,
        score: identity.merchant.merchantScore || 0,
        grade: (identity.merchant.merchantScore || 0) > 75 ? 'A' : (identity.merchant.merchantScore || 0) > 50 ? 'B' : 'C',
        status: identity.merchant.leadStatus || 'cold',
        assignedTo: identity.merchant.assignedTo,
        lastContacted: identity.merchant.lastContacted,
        territory: undefined,
        lastVisit: undefined,
        visitCount: 0
      }
    };
    activeSources.push('REZ Merchant');
  }

  // RABTUL data (mock - would integrate with actual service)
  profile.rabtul = {
    auth: {
      userId: identity.id,
      loginCount: identity.activity.totalTransactions || 0,
      lastLogin: identity.activity.lastActivity,
      mfaEnabled: false,
      loginMethods: ['password', 'otp'],
      devices: []
    },
    payments: {
      totalTransactions: identity.activity.totalTransactions || 0,
      totalAmount: identity.activity.totalSpent || 0,
      successfulPayments: identity.activity.totalTransactions || 0,
      failedPayments: 0,
      avgTransactionValue: identity.activity.totalSpent / (identity.activity.totalTransactions || 1),
      preferredPaymentMethod: 'UPI'
    },
    wallet: {
      currentBalance: profile.consumer?.wallet.balance || 0,
      totalLoaded: identity.activity.totalSpent || 0,
      totalWithdrawn: 0,
      cashbackBalance: profile.consumer?.wallet.balance || 0
    },
    orders: {
      total: identity.activity.totalTransactions || 0,
      pending: 0,
      completed: identity.activity.totalTransactions || 0,
      cancelled: 0,
      totalValue: identity.activity.totalSpent || 0
    }
  };
  activeSources.push('RABTUL');

  // CorpPerks data
  if (identity.employee) {
    profile.corpperks = {
      employee: {
        employeeId: identity.employee.employeeId || identity.id,
        name: identity.employee.name,
        designation: identity.employee.designation || '',
        department: identity.employee.department || '',
        team: identity.employee.team,
        manager: identity.employee.manager,
        joiningDate: identity.createdAt,
        status: 'active'
      },
      organization: {
        companyId: identity.employee.companyId || '',
        companyName: identity.employee.companyName || '',
        companyType: '',
        location: identity.employee.department || ''
      },
      salary: {
        corpId: identity.employee.corpId || '',
        accountNumber: identity.employee.salaryAccount,
        bankName: '',
        monthlySalary: 0,
        salaryDay: 1
      },
      hr: {
        attendanceRate: 95,
        leaveBalance: 0,
        performanceScore: undefined,
        lastAppraisal: undefined
      }
    };
    activeSources.push('CorpPerks');
  }

  // Vendor data
  if (identity.vendor) {
    profile.nexha = {
      vendor: {
        vendorId: identity.vendor.userId || identity.id,
        businessName: identity.vendor.businessName,
        contactName: identity.vendor.contactName,
        services: identity.vendor.services || [],
        certifications: identity.vendor.certifications || [],
        rating: identity.vendor.rating || 0,
        completedOrders: identity.vendor.completedOrders || 0,
        avgDeliveryTime: identity.vendor.avgDeliveryTime || 0
      }
    };
    activeSources.push('Nexha');
  }

  // Social profiles
  (profile.identity as any).socialProfiles = identity.socialProfiles || [];
  if (identity.socialProfiles.length > 0) {
    activeSources.push('Social Media');
  }

  // Update insights
  profile.insights.dataSources = activeSources;
  profile.insights = knowledgeGraphService.calculateInsights(profile);

  return profile;
}

async function fetchFromSource(sourceName: string, identity: any): Promise<any> {
  // This would make actual API calls to each source
  // For now, return mock data based on what we have in identity

  switch (sourceName) {
    case 'rezConsumer':
      return identity.customer || null;

    case 'rezMerchant':
      return identity.merchant || null;

    case 'rabtulAuth':
    case 'rabtulWallet':
    case 'rabtulPayment':
      return {
        userId: identity.id,
        phone: identity.primaryPhone,
        email: identity.primaryEmail
      };

    case 'corpsperks':
      return identity.employee || null;

    case 'nexha':
      return identity.vendor || null;

    case 'genie':
      return {
        memoryCount: 0,
        relationshipCount: identity.socialProfiles?.length || 0
      };

    case 'sada':
      return {
        trustScore: identity.identityScore || 0,
        kycStatus: identity.status === 'verified' ? 'verified' : 'pending'
      };

    default:
      return null;
  }
}

function getRiskFactors(profile: ComprehensiveUserProfile): string[] {
  const factors: string[] = [];

  if (profile.identity.verified) {
    factors.push('Identity unverified');
  }
  if (profile.sada?.trust.trustScore && profile.sada.trust.trustScore < 50) {
    factors.push('Low trust score');
  }
  if (profile.merchant?.techStack.hasPOS === false) {
    factors.push('No POS system - business risk');
  }

  return factors;
}

function getEngagementDrivers(profile: ComprehensiveUserProfile): string[] {
  const drivers: string[] = [];

  if (profile.consumer?.orders.total && profile.consumer.orders.total > 10) {
    drivers.push('Frequent orders');
  }
  if (profile.consumer?.loyalty.points && profile.consumer.loyalty.points > 1000) {
    drivers.push('Active loyalty participant');
  }
  if (profile.merchant?.rezekaData.score && profile.merchant.rezekaData.score > 70) {
    drivers.push('High merchant score');
  }

  return drivers;
}

function getValueDrivers(profile: ComprehensiveUserProfile): string[] {
  const drivers: string[] = [];

  if (profile.consumer?.orders.totalSpent && profile.consumer.orders.totalSpent > 50000) {
    drivers.push('High lifetime value customer');
  }
  if (profile.merchant?.businessMetrics.monthlyRevenue && profile.merchant.businessMetrics.monthlyRevenue > 100000) {
    drivers.push('High revenue merchant');
  }
  if (profile.assetMind?.financial.investmentPortfolio) {
    drivers.push('Investment portfolio holder');
  }

  return drivers;
}

function getChurnIndicators(profile: ComprehensiveUserProfile): string[] {
  const indicators: string[] = [];

  if (profile.consumer?.engagement.lastActive) {
    const daysSince = (Date.now() - new Date(profile.consumer.engagement.lastActive).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 60) {
      indicators.push(`Inactive for ${Math.round(daysSince)} days`);
    }
  }
  if (profile.merchant?.rezekaData.lastContacted) {
    const daysSince = (Date.now() - new Date(profile.merchant.rezekaData.lastContacted).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      indicators.push(`Not contacted for ${Math.round(daysSince)} days`);
    }
  }

  return indicators;
}

function getUpsellOpportunities(profile: ComprehensiveUserProfile): string[] {
  const opportunities: string[] = [];

  if (profile.merchant) {
    if (!profile.merchant.techStack.hasPOS) {
      opportunities.push('REZ POS - No current POS');
    }
    if (!profile.merchant.techStack.hasQRMenu) {
      opportunities.push('REZ Menu QR - No digital menu');
    }
    if (!profile.merchant.techStack.hasLoyalty) {
      opportunities.push('REZ Loyalty - No loyalty program');
    }
    if (!profile.merchant.techStack.hasDelivery) {
      opportunities.push('REZ Delivery - Not on delivery');
    }
  }

  if (profile.consumer) {
    if (profile.consumer.loyalty.tier !== 'platinum') {
      opportunities.push('Upgrade loyalty tier');
    }
    if (profile.consumer.wallet.balance < 500) {
      opportunities.push('Wallet top-up promotion');
    }
  }

  return opportunities;
}

function getSegmentStats(profile: ComprehensiveUserProfile, segment: string): {
  avgValueScore: number;
  avgEngagement: number;
  avgRisk: number;
  count: number;
} {
  // Would fetch from analytics database
  // Return mock stats based on profile type
  if (profile.merchant) {
    return {
      avgValueScore: 65,
      avgEngagement: 55,
      avgRisk: 25,
      count: 15000
    };
  }
  return {
    avgValueScore: 50,
    avgEngagement: 60,
    avgRisk: 20,
    count: 50000
  };
}

function calculatePercentile(value: number, stats: { avgValueScore: number }): number {
  // Simplified percentile calculation
  const diff = value - stats.avgValueScore;
  if (diff > 20) return 90;
  if (diff > 10) return 75;
  if (diff > 0) return 60;
  if (diff > -10) return 40;
  return 25;
}