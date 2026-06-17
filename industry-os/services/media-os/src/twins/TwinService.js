/**
 * Media OS - Twin Service
 * Digital Twin Management for Media OS
 * Implements Viewer, Creator, Content, and Campaign Twins
 */

const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const config = require('../config');
const logger = require('../config/database');

// Twin types
const TWIN_TYPES = {
  VIEWER: 'viewer',
  CREATOR: 'creator',
  CONTENT: 'content',
  CAMPAIGN: 'campaign',
  EPISODE: 'episode',
  SERIES: 'series',
  CHANNEL: 'channel',
  PROGRAM: 'program',
  ADVERTISER: 'advertiser',
  SUBSCRIPTION: 'subscription',
  REVENUE: 'revenue',
  COMMUNITY: 'community',
};

/**
 * Base Twin class
 */
class Twin {
  constructor(type, ownerId) {
    this.twinId = `${type}-twin-${uuidv4()}`;
    this.type = type;
    this.ownerId = ownerId;
    this.version = 1;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.syncStatus = 'pending';
    this.data = {};
  }

  async syncToTwinOS() {
    try {
      const response = await axios.post(
        `${config.RTMN_SERVICES.TWIN_OS}/api/twins`,
        {
          twinId: this.twinId,
          type: this.type,
          ownerId: this.ownerId,
          data: this.data,
          version: this.version,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 5000,
        }
      );

      this.syncStatus = 'synced';
      logger.info('Twin synced to TwinOS', { twinId: this.twinId, type: this.type });
      return response.data;
    } catch (error) {
      this.syncStatus = 'failed';
      logger.error('Twin sync failed', { twinId: this.twinId, error: error.message });
      throw error;
    }
  }

  async update(data) {
    this.data = { ...this.data, ...data };
    this.version += 1;
    this.updatedAt = new Date();
    this.syncStatus = 'pending';
    return this;
  }

  toJSON() {
    return {
      twinId: this.twinId,
      type: this.type,
      ownerId: this.ownerId,
      version: this.version,
      data: this.data,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      syncStatus: this.syncStatus,
    };
  }
}

/**
 * Viewer Twin - Complete viewer profile with preferences, behavior, and predictions
 */
class ViewerTwin extends Twin {
  constructor(viewerId, viewerData) {
    super(TWIN_TYPES.VIEWER, viewerId);
    this.initializeFromData(viewerData);
  }

  initializeFromData(data) {
    this.data = {
      // Demographics
      demographics: {
        age: data.profile?.age || data.age,
        gender: data.profile?.gender || data.gender,
        location: data.location || {},
        language: data.preferences?.language || [],
      },

      // Watch patterns
      watchPatterns: {
        favoriteGenres: data.preferences?.genres || [],
        preferredLanguages: data.preferences?.language || [],
        peakWatchTimes: this.extractPeakTimes(data.watchHistory),
        avgSessionDuration: data.metrics?.avgSessionDuration || 0,
        avgWatchDaysPerWeek: data.metrics?.avgWatchDaysPerWeek || 0,
      },

      // Engagement
      engagement: {
        completionRate: data.metrics?.completionRate || 0,
        reWatchRate: data.metrics?.reWatchRate || 0,
        socialShares: data.engagement?.sharesCount || 0,
        commentsPosted: data.engagement?.commentsCount || 0,
        watchlistSize: data.watchlist?.length || 0,
        ratingsGiven: data.engagement?.ratingsCount || 0,
      },

      // Monetization
      monetization: {
        subscriptionTier: data.subscription?.plan || 'free',
        lifetimeValue: data.lifetimeValue || 0,
        monthlySpend: data.metrics?.monthlySpend || 0,
        churnRisk: data.churnRisk || 0,
      },

      // Recommendations
      recommendations: {
        contentAffinity: data.contentAffinity || {},
        personalizedGenres: data.personalizedGenres || [],
        breakTimeContent: data.breakTimeContent || [],
      },

      // Segments
      segments: this.deriveSegments(data),

      // Privacy
      privacy: {
        consentGiven: data.privacy?.dataConsent || false,
        sharingPreferences: data.privacy || {},
      },
    };
  }

  extractPeakTimes(watchHistory) {
    if (!watchHistory || !Array.isArray(watchHistory)) {
      return [];
    }

    const timeBuckets = {};
    watchHistory.forEach(entry => {
      if (entry.watchedAt) {
        const date = new Date(entry.watchedAt);
        const dayOfWeek = date.getDay();
        const hour = date.getHours();
        const key = `${dayOfWeek}-${hour}`;
        timeBuckets[key] = (timeBuckets[key] || 0) + 1;
      }
    });

    return Object.entries(timeBuckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key]) => {
        const [day, hour] = key.split('-').map(Number);
        return { dayOfWeek: day, hour };
      });
  }

  deriveSegments(data) {
    const segments = [];

    if (data.subscription?.plan !== 'free') {
      segments.push('subscriber');
    }

    if ((data.metrics?.totalWatchTime || 0) > 36000) {
      segments.push('engaged');
    }

    if ((data.churnRisk || 0) > 0.7) {
      segments.push('at_risk');
    }

    if ((data.lifetimeValue || 0) > 5000) {
      segments.push('high_value');
    }

    if ((data.metrics?.avgWatchDaysPerWeek || 0) >= 5) {
      segments.push('daily_viewer');
    }

    return segments;
  }

  updateWatchActivity(watchData) {
    if (watchData.contentType) {
      const currentAffinity = this.data.recommendations.contentAffinity[watchData.contentType] || 0;
      this.data.recommendations.contentAffinity[watchData.contentType] = currentAffinity + 0.1;
    }

    if (watchData.genre) {
      const currentGenres = this.data.watchPatterns.favoriteGenres;
      if (!currentGenres.includes(watchData.genre)) {
        this.data.watchPatterns.favoriteGenres.push(watchData.genre);
      }
    }

    if (watchData.watchTime) {
      const currentAvg = this.data.watchPatterns.avgSessionDuration;
      this.data.watchPatterns.avgSessionDuration = (currentAvg + watchData.watchTime) / 2;
    }

    return this.update(this.data);
  }

  updateEngagement(engagementData) {
    this.data.engagement = {
      ...this.data.engagement,
      ...engagementData,
    };

    // Recalculate segments
    this.data.segments = this.deriveSegments({
      ...this.data,
      ...engagementData,
    });

    return this.update(this.data);
  }
}

/**
 * Creator Twin - Creator profile with audience, revenue, and brand deal management
 */
class CreatorTwin extends Twin {
  constructor(creatorId, creatorData) {
    super(TWIN_TYPES.CREATOR, creatorId);
    this.initializeFromData(creatorData);
  }

  initializeFromData(data) {
    this.data = {
      // Profile
      profile: {
        displayName: data.profile?.displayName || data.name,
        handle: data.profile?.handle || data.handle,
        bio: data.profile?.bio,
        verification: data.profile?.verification?.verified || false,
      },

      // Audience
      audience: {
        demographics: data.audience?.demographics || {},
        totalReach: data.audience?.totalReach || 0,
        engagementRate: data.audience?.avgEngagementRate || 0,
        growthRate: data.audience?.growthRate || 0,
        authenticity: data.audience?.authenticity || 0,
      },

      // Content
      content: {
        categories: data.niche || [],
        avgLikes: data.content?.avgViewsPerVideo ? data.content.avgViewsPerVideo * 0.05 : 0,
        avgComments: data.content?.avgViewsPerVideo ? data.content.avgViewsPerVideo * 0.01 : 0,
        postingFrequency: data.content?.postingFrequency,
      },

      // Monetization
      monetization: {
        monthlyRevenue: data.monetization?.revenue?.thisMonth || 0,
        revenueStreams: data.monetization?.revenue?.breakdown || {},
        activeBrandDeals: (data.brandDeals || []).filter(d => d.status === 'in_progress').length,
        pendingPayments: data.monetization?.revenue?.pending || 0,
      },

      // Brand deals
      brandDeals: {
        active: data.brandDeals?.filter(d => d.status === 'in_progress').length || 0,
        completed: data.brandDeals?.filter(d => d.status === 'completed').length || 0,
        avgDealValue: data.performance?.avgDealValue || 0,
        brandAffinities: this.extractBrandAffinities(data.brandDeals),
      },

      // Performance
      performance: {
        totalEarnings: data.performance?.totalEarnings || 0,
        rating: data.performance?.rating || 0,
        reviewsCount: data.performance?.reviewsCount || 0,
      },

      // Compliance
      compliance: {
        strikeCount: data.compliance?.strikeCount || 0,
        policyViolations: data.compliance?.policyViolations || 0,
      },

      // RTMN connections
      integrations: {
        hasCorpid: !!data.corpid,
        hasWallet: !!data.monetization?.payoutInfo?.bankAccount,
        activeBrandDeals: (data.brandDeals || []).filter(d => d.status === 'in_progress').length,
      },
    };
  }

  extractBrandAffinities(brandDeals) {
    if (!brandDeals || !Array.isArray(brandDeals)) {
      return [];
    }

    const brandCounts = {};
    brandDeals.forEach(deal => {
      if (deal.brandName) {
        brandCounts[deal.brandName] = (brandCounts[deal.brandName] || 0) + 1;
      }
    });

    return Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brand]) => brand);
  }

  updateRevenue(revenueData) {
    this.data.monetization = {
      ...this.data.monetization,
      ...revenueData,
    };
    return this.update(this.data);
  }

  addBrandDeal(deal) {
    if (!this.data.brandDeals) {
      this.data.brandDeals = { active: 0, completed: 0, avgDealValue: 0, brandAffinities: [] };
    }
    this.data.brandDeals.active += 1;
    if (deal.brandName) {
      this.data.brandDeals.brandAffinities = this.extractBrandAffinities([...this.data.brandDeals.brandAffinities, deal]);
    }
    return this.update(this.data);
  }
}

/**
 * Content Twin - Content metadata, performance, and recommendations
 */
class ContentTwin extends Twin {
  constructor(contentId, contentData) {
    super(TWIN_TYPES.CONTENT, contentId);
    this.initializeFromData(contentData);
  }

  initializeFromData(data) {
    this.data = {
      // Metadata
      metadata: {
        title: data.title,
        description: data.synopsis || data.description,
        genres: data.genres || [],
        language: data.language,
        rating: data.rating,
        releaseDate: data.releaseDate,
        runtime: data.duration,
        cast: data.cast?.map(c => c.name) || [],
        crew: data.crew?.map(c => c.name) || [],
      },

      // Rights
      rights: {
        territories: data.rights?.territories || [],
        licenseStart: data.rights?.licenseStart,
        licenseEnd: data.rights?.licenseEnd,
        exclusivity: data.rights?.exclusivity || false,
        monetizationTypes: data.rights?.monetizationTypes || [],
      },

      // Performance
      performance: {
        totalViews: data.performance?.views || 0,
        uniqueViewers: data.performance?.uniqueViewers || 0,
        avgWatchTime: data.performance?.avgWatchTime || 0,
        completionRate: data.performance?.completionRate || 0,
        engagementRate: data.performance?.engagementRate || 0,
        sentiment: data.performance?.sentiment || 0.5,
        trending: data.performance?.trending || false,
        velocity: data.performance?.velocity || 0,
      },

      // Recommendations
      recommendations: {
        similarContent: data.recommendations?.similarContent || [],
        watchNext: data.recommendations?.watchNext || [],
        bundleOpportunities: data.recommendations?.bundleOpportunities || [],
      },

      // Segments
      targetAudience: this.extractTargetAudience(data),

      // Availability
      availability: {
        regions: data.availability?.regions || [],
        platforms: data.availability?.platforms || [],
        isAvailable: this.checkAvailability(data),
      },

      // Type-specific
      typeSpecific: this.getTypeSpecificData(data),
    };
  }

  extractTargetAudience(data) {
    // Would be calculated from viewer analytics
    return {
      primaryAge: '18-35',
      secondaryAge: '35-50',
      gender: 'all',
      interests: data.genres || [],
    };
  }

  checkAvailability(data) {
    if (data.status !== 'published') return false;

    const now = new Date();
    if (data.rights?.licenseEnd && new Date(data.rights.licenseEnd) < now) {
      return false;
    }

    return true;
  }

  getTypeSpecificData(data) {
    switch (data.type) {
      case 'series':
        return {
          totalEpisodes: data.totalEpisodes || 0,
          currentEpisode: data.currentEpisode || 0,
          seasons: data.season?.seasonNumber || 1,
        };
      case 'podcast':
        return {
          episodeCount: data.episodeCount || 0,
          platforms: data.platforms || [],
          avgListeners: data.avgListeners || 0,
        };
      case 'movie':
        return {
          boxOffice: data.performance?.boxOffice,
          awards: data.awards || [],
        };
      default:
        return {};
    }
  }

  updatePerformance(performanceData) {
    this.data.performance = {
      ...this.data.performance,
      ...performanceData,
    };

    // Update trending status based on velocity
    if ((this.data.performance.velocity || 0) > 1000) {
      this.data.performance.trending = true;
    }

    return this.update(this.data);
  }

  updateRights(rightsData) {
    this.data.rights = {
      ...this.data.rights,
      ...rightsData,
    };
    this.data.availability.isAvailable = this.checkAvailability({ ...this.data, rights: this.data.rights });
    return this.update(this.data);
  }
}

/**
 * Campaign Twin - Ad campaign tracking and optimization
 */
class CampaignTwin extends Twin {
  constructor(campaignId, campaignData) {
    super(TWIN_TYPES.CAMPAIGN, campaignId);
    this.initializeFromData(campaignData);
  }

  initializeFromData(data) {
    this.data = {
      // Basic info
      basic: {
        name: data.name,
        advertiser: data.advertiser,
        objective: data.objective,
        status: data.status,
      },

      // Schedule
      schedule: {
        startDate: data.schedule?.startDate,
        endDate: data.schedule?.endDate,
        isActive: this.checkIfActive(data),
      },

      // Budget
      budget: {
        total: data.budget?.total || 0,
        spent: data.budget?.spent || 0,
        remaining: data.budget?.remaining || data.budget?.total || 0,
        utilization: data.budget?.total ? (data.budget.spent / data.budget.total) * 100 : 0,
      },

      // Performance
      performance: {
        impressions: data.performance?.impressions || 0,
        clicks: data.performance?.clicks || 0,
        conversions: data.performance?.conversions || 0,
        ctr: data.performance?.ctr || 0,
        cpm: data.performance?.cpm || 0,
        cpc: data.performance?.cpc || 0,
        roas: data.performance?.roas || 0,
        frequency: data.performance?.frequency || 1,
        reach: data.performance?.reach || 0,
        brandSafety: data.performance?.brandSafety || 100,
      },

      // Targeting
      targeting: {
        demographics: data.targeting?.demographics || {},
        content: data.targeting?.content || {},
        viewerTwins: data.targeting?.viewerTwins || [],
      },

      // Optimization
      optimization: {
        recommendedBid: this.calculateRecommendedBid(data),
        recommendedBudget: this.calculateRecommendedBudget(data),
        targetAudience: this.suggestAudienceImprovements(data),
      },

      // Status
      health: this.calculateCampaignHealth(data),
    };
  }

  checkIfActive(data) {
    const now = new Date();
    return data.status === 'active' &&
           (!data.schedule?.endDate || new Date(data.schedule.endDate) >= now) &&
           (data.budget?.remaining || 0) > 0;
  }

  calculateRecommendedBid(data) {
    // Simple recommendation based on objective
    const benchmarks = {
      awareness: { cpm: 150 },
      consideration: { cpm: 200 },
      conversion: { cpm: 300 },
      traffic: { cpm: 180 },
      engagement: { cpm: 220 },
    };

    const benchmark = benchmarks[data.objective] || benchmarks.consideration;
    return {
      recommendedCPM: benchmark.cpm,
      currentCPM: data.performance?.cpm || 0,
      suggestion: (data.performance?.cpm || 0) < benchmark.cpm
        ? 'Consider increasing bid for better results'
        : 'Bid is competitive',
    };
  }

  calculateRecommendedBudget(data) {
    const daysRemaining = data.schedule?.endDate
      ? Math.ceil((new Date(data.schedule.endDate) - new Date()) / (1000 * 60 * 60 * 24))
      : 30;

    return {
      dailyBudget: (data.budget?.remaining || 0) / Math.max(daysRemaining, 1),
      recommendedDaily: Math.ceil((data.budget?.total || 100000) / 30),
    };
  }

  suggestAudienceImprovements(data) {
    // Analyze current targeting and suggest improvements
    const suggestions = [];

    if (!data.targeting?.demographics?.locations?.length) {
      suggestions.push('Consider adding location targeting for better relevance');
    }

    if ((data.performance?.frequency || 1) > 5) {
      suggestions.push('High frequency - consider broadening audience');
    }

    if ((data.performance?.ctr || 0) < 0.5) {
      suggestions.push('Low CTR - consider testing new creatives');
    }

    return suggestions;
  }

  calculateCampaignHealth(data) {
    let score = 100;
    const issues = [];

    // Check budget utilization
    const utilization = (data.budget?.spent || 0) / (data.budget?.total || 1);
    if (utilization > 0.9) {
      score -= 20;
      issues.push('Budget nearly exhausted');
    }

    // Check CTR
    if ((data.performance?.ctr || 0) < 0.3) {
      score -= 30;
      issues.push('CTR below benchmark');
    }

    // Check brand safety
    if ((data.performance?.brandSafety || 100) < 90) {
      score -= 20;
      issues.push('Brand safety concerns');
    }

    return { score: Math.max(0, score), issues };
  }

  updatePerformance(performanceData) {
    this.data.performance = {
      ...this.data.performance,
      ...performanceData,
    };

    // Recalculate health
    this.data.health = this.calculateCampaignHealth({
      ...this.data,
      performance: this.data.performance,
    });

    return this.update(this.data);
  }
}

/**
 * Twin Service - Manages all digital twins
 */
class TwinService {
  constructor() {
    this.twins = new Map();
    this.syncInterval = 60000; // 1 minute
    this.startSyncWorker();
  }

  /**
   * Create a new twin
   */
  createTwin(type, ownerId, data) {
    let twin;

    switch (type) {
      case TWIN_TYPES.VIEWER:
        twin = new ViewerTwin(ownerId, data);
        break;
      case TWIN_TYPES.CREATOR:
        twin = new CreatorTwin(ownerId, data);
        break;
      case TWIN_TYPES.CONTENT:
        twin = new ContentTwin(ownerId, data);
        break;
      case TWIN_TYPES.CAMPAIGN:
        twin = new CampaignTwin(ownerId, data);
        break;
      default:
        twin = new Twin(type, ownerId);
        twin.data = data;
    }

    this.twins.set(twin.twinId, twin);
    logger.info('Twin created', { twinId: twin.twinId, type });

    // Sync to TwinOS Hub
    twin.syncToTwinOS().catch(err => {
      logger.error('Initial twin sync failed', { twinId: twin.twinId, error: err.message });
    });

    return twin;
  }

  /**
   * Get twin by ID
   */
  getTwin(twinId) {
    return this.twins.get(twinId);
  }

  /**
   * Get twin by owner and type
   */
  getTwinByOwner(ownerId, type) {
    for (const twin of this.twins.values()) {
      if (twin.ownerId === ownerId && twin.type === type) {
        return twin;
      }
    }
    return null;
  }

  /**
   * Update twin
   */
  updateTwin(twinId, data) {
    const twin = this.twins.get(twinId);
    if (!twin) {
      throw new Error('Twin not found');
    }

    twin.update(data);
    twin.syncToTwinOS().catch(err => {
      logger.error('Twin update sync failed', { twinId, error: err.message });
    });

    return twin;
  }

  /**
   * Delete twin
   */
  deleteTwin(twinId) {
    const twin = this.twins.get(twinId);
    if (twin) {
      this.twins.delete(twinId);
      logger.info('Twin deleted', { twinId });
      return true;
    }
    return false;
  }

  /**
   * Get all twins for an owner
   */
  getTwinsByOwner(ownerId) {
    const result = [];
    for (const twin of this.twins.values()) {
      if (twin.ownerId === ownerId) {
        result.push(twin);
      }
    }
    return result;
  }

  /**
   * Search twins
   */
  searchTwins(query) {
    const results = [];
    for (const twin of this.twins.values()) {
      if (this.matchesQuery(twin, query)) {
        results.push(twin);
      }
    }
    return results;
  }

  matchesQuery(twin, query) {
    const searchString = JSON.stringify(twin.data).toLowerCase();
    return searchString.includes(query.toLowerCase());
  }

  /**
   * Sync worker - periodically syncs twins to TwinOS Hub
   */
  startSyncWorker() {
    setInterval(async () => {
      const pendingTwins = Array.from(this.twins.values()).filter(
        t => t.syncStatus === 'pending'
      );

      for (const twin of pendingTwins) {
        try {
          await twin.syncToTwinOS();
        } catch (error) {
          logger.error('Sync worker failed', { twinId: twin.twinId, error: error.message });
        }
      }

      if (pendingTwins.length > 0) {
        logger.info(`Synced ${pendingTwins.length} twins`);
      }
    }, this.syncInterval);
  }

  /**
   * Get twin stats
   */
  getStats() {
    const stats = {
      total: this.twins.size,
      byType: {},
      syncStatus: {
        synced: 0,
        pending: 0,
        failed: 0,
      },
    };

    for (const twin of this.twins.values()) {
      // Count by type
      stats.byType[twin.type] = (stats.byType[twin.type] || 0) + 1;

      // Count by sync status
      stats.syncStatus[twin.syncStatus] = (stats.syncStatus[twin.syncStatus] || 0) + 1;
    }

    return stats;
  }
}

// Export singleton instance and classes
const twinService = new TwinService();

module.exports = {
  twinService,
  Twin,
  ViewerTwin,
  CreatorTwin,
  ContentTwin,
  CampaignTwin,
  TWIN_TYPES,
};
