/**
 * Profile Builder Service
 * Builds unified ecosystem profiles by aggregating data from connected services
 */

import { EcosystemProfile } from '../models/EcosystemProfile';
import { CrossServiceLink } from '../models/CrossServiceLink';
import { hojaiConnector } from './hojaiConnector';
import { rezConnector } from './rezConnector';
import { stayownConnector } from './stayownConnector';
import { adbazaarConnector } from './adbazaarConnector';
import { corpidConnector } from './corpidConnector';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

interface ServiceSummary {
  service: string;
  found: boolean;
  data?: Record<string, unknown>;
}

interface IdentityResolutionResult {
  profile: any;
  isNew: boolean;
  confidence: number;
  matchedServices: string[];
  mergedProfiles: number;
}

class ProfileBuilder {
  /**
   * Build unified profile by aggregating data from all connected services
   */
  async buildUnifiedProfile(profile: any): Promise<any> {
    const identifiers = profile.identifiers.toObject();
    const summaries: Record<string, unknown> = {};
    let totalInteractions = 0;
    const preferredServices: string[] = [];

    // Collect data from each service
    const servicePromises: Promise<ServiceSummary>[] = [];

    if (identifiers.hojaiGenieId) {
      servicePromises.push(this.fetchHojaiData(identifiers.hojaiGenieId));
    }

    if (identifiers.rezConsumerId) {
      servicePromises.push(this.fetchRezData(identifiers.rezConsumerId));
    }

    if (identifiers.stayownGuestId) {
      servicePromises.push(this.fetchStayownData(identifiers.stayownGuestId));
    }

    if (identifiers.adbazaarProfileId) {
      servicePromises.push(this.fetchAdbazaarData(identifiers.adbazaarProfileId));
    }

    if (identifiers.corpidUserId) {
      servicePromises.push(this.fetchCorpIDData(identifiers.corpidUserId));
    }

    // Execute all service fetches concurrently
    const results = await Promise.all(servicePromises);

    // Process results
    for (const result of results) {
      if (result.found && result.data) {
        summaries[result.service] = result.data;

        // Aggregate engagement data
        const data = result.data as any;
        if (data.interactions) totalInteractions += data.interactions;
        if (data.services) preferredServices.push(...data.services);
      }
    }

    // Update profile with aggregated data
    profile.serviceSummaries = summaries;
    profile.engagement.totalInteractions = Math.max(profile.engagement.totalInteractions, totalInteractions);
    profile.engagement.preferredServices = [...new Set([...profile.engagement.preferredServices, ...preferredServices])];

    // Recalculate engagement score
    profile.engagement.engagementScore = this.calculateEngagementScore(profile.engagement);

    // Update activity frequency
    profile.engagement.activityFrequency = this.calculateActivityFrequency(profile.engagement.lastActivity);

    // Update identity resolution confidence
    profile.identityResolution.confidence = Math.min(100,
      profile.identityResolution.confidence + (Object.keys(summaries).length * 5)
    );

    await profile.save();

    return profile;
  }

  /**
   * Fetch HOJAI data
   */
  private async fetchHojaiData(genieId: string): Promise<ServiceSummary> {
    try {
      const [userProfile, interactions] = await Promise.all([
        hojaiConnector.getUserByGenieId(genieId),
        hojaiConnector.getInteractionsSummary(genieId),
      ]);

      if (userProfile) {
        // Update profile name if available
        if (userProfile.name && !profile.profile.name.full) {
          profile.profile.name = userProfile.name;
        }

        return {
          service: 'hojai',
          found: true,
          data: {
            userId: userProfile.userId,
            genieId,
            memoryUsage: userProfile.memoryUsage,
            aiSettings: userProfile.aiSettings,
            interactions: interactions?.totalInteractions || 0,
            topServices: interactions?.topServices || [],
            lastInteraction: interactions?.lastInteraction,
          },
        };
      }

      return { service: 'hojai', found: false };
    } catch (error) {
      logger.warn(`Failed to fetch HOJAI data for ${genieId}:`, error);
      return { service: 'hojai', found: false };
    }
  }

  /**
   * Fetch REZ consumer data
   */
  private async fetchRezData(consumerId: string): Promise<ServiceSummary> {
    try {
      const [profile, spending, loyalty] = await Promise.all([
        rezConnector.getConsumerProfile(consumerId),
        rezConnector.getSpendingSummary(consumerId),
        rezConnector.getLoyaltyInfo(consumerId),
      ]);

      if (profile) {
        return {
          service: 'rez',
          found: true,
          data: {
            consumerId: profile.userId,
            totalOrders: spending?.totalOrders || 0,
            totalSpend: spending?.totalSpend || 0,
            favoriteCategories: spending?.favoriteCategories || [],
            lastOrderDate: spending?.lastOrderDate,
            loyaltyPoints: loyalty?.points || 0,
            loyaltyTier: loyalty?.tier || 'bronze',
            paymentMethods: profile.paymentMethods,
            interactions: spending?.totalOrders || 0,
            services: ['rez-consumer'],
          },
        };
      }

      return { service: 'rez', found: false };
    } catch (error) {
      logger.warn(`Failed to fetch REZ data for ${consumerId}:`, error);
      return { service: 'rez', found: false };
    }
  }

  /**
   * Fetch StayOwn data
   */
  private async fetchStayownData(guestId: string): Promise<ServiceSummary> {
    try {
      const [guest, loyalty, staySummary] = await Promise.all([
        stayownConnector.getGuestProfile(guestId),
        stayownConnector.getGuestLoyalty(guestId),
        stayownConnector.getStaySummary(guestId),
      ]);

      if (guest) {
        return {
          service: 'stayown',
          found: true,
          data: {
            guestId: guest.guestId,
            stays: staySummary?.totalStays || 0,
            totalNights: staySummary?.totalNights || 0,
            totalSpend: staySummary?.totalSpend || 0,
            loyaltyTier: loyalty?.tier || guest.loyaltyTier || 'bronze',
            loyaltyPoints: loyalty?.points || guest.loyaltyPoints || 0,
            roomPreferences: guest.preferences?.roomType ? [guest.preferences.roomType] : [],
            amenitiesUsed: [],
            lastStay: staySummary?.lastStay,
            interactions: staySummary?.totalStays || 0,
            services: ['stayown'],
          },
        };
      }

      return { service: 'stayown', found: false };
    } catch (error) {
      logger.warn(`Failed to fetch StayOwn data for ${guestId}:`, error);
      return { service: 'stayown', found: false };
    }
  }

  /**
   * Fetch AdBazaar data
   */
  private async fetchAdbazaarData(profileId: string): Promise<ServiceSummary> {
    try {
      const [profile, engagement, campaigns] = await Promise.all([
        adbazaarConnector.getProfile(profileId),
        adbazaarConnector.getProfileEngagement(profileId),
        adbazaarConnector.getProfileCampaigns(profileId),
      ]);

      if (profile) {
        return {
          service: 'adbazaar',
          found: true,
          data: {
            profileId: profile.profileId,
            adsViewed: engagement?.adsViewed || profile.engagement?.adsViewed || 0,
            clicks: engagement?.adsClicked || profile.engagement?.adsClicked || 0,
            conversions: engagement?.conversions || profile.engagement?.conversions || 0,
            campaignsJoined: campaigns.active.map(c => c.campaignId),
            loyaltyPoints: profile.loyalty?.points || 0,
            interests: profile.demographics?.interests || [],
            interactions: (engagement?.adsViewed || 0) + (engagement?.adsClicked || 0),
            services: ['adbazaar'],
          },
        };
      }

      return { service: 'adbazaar', found: false };
    } catch (error) {
      logger.warn(`Failed to fetch AdBazaar data for ${profileId}:`, error);
      return { service: 'adbazaar', found: false };
    }
  }

  /**
   * Fetch CorpID data
   */
  private async fetchCorpIDData(userId: string): Promise<ServiceSummary> {
    try {
      const [user, verification, links] = await Promise.all([
        corpidConnector.getUser(userId),
        corpidConnector.getVerificationStatus(userId),
        corpidConnector.getLinkedServices(userId),
      ]);

      if (user) {
        return {
          service: 'corpid',
          found: true,
          data: {
            userId: user.userId,
            verified: user.verified,
            verificationLevel: user.verificationLevel,
            trustScore: user.trustScore,
            linkedServices: links.map(l => l.serviceId),
            interactions: 0,
            services: ['corpid'],
          },
        };
      }

      return { service: 'corpid', found: false };
    } catch (error) {
      logger.warn(`Failed to fetch CorpID data for ${userId}:`, error);
      return { service: 'corpid', found: false };
    }
  }

  /**
   * Resolve identity across services
   */
  async resolveIdentity(
    tenantId: string,
    identifiers: Record<string, string>,
    mergeExisting: boolean = true,
    confidenceThreshold: number = 50
  ): Promise<IdentityResolutionResult> {
    const matchedServices: string[] = [];
    const foundProfiles: any[] = [];

    // Search each service for matching profiles
    const searchPromises: Promise<void>[] = [];

    if (identifiers.email) {
      searchPromises.push(this.searchByEmail(identifiers.email, foundProfiles, matchedServices));
    }

    if (identifiers.phone) {
      searchPromises.push(this.searchByPhone(identifiers.phone, foundProfiles, matchedServices));
    }

    await Promise.all(searchPromises);

    if (foundProfiles.length === 0) {
      // Create new profile
      const newProfile = await EcosystemProfile.resolveIdentity(tenantId, identifiers);
      return {
        profile: newProfile.profile,
        isNew: true,
        confidence: newProfile.confidence,
        matchedServices: [],
        mergedProfiles: 0,
      };
    }

    if (foundProfiles.length === 1) {
      // Single match - update and return
      const profile = foundProfiles[0];

      // Add any new identifiers
      Object.keys(identifiers).forEach(key => {
        if (identifiers[key] && !profile.identifiers[key]) {
          profile.identifiers[key] = identifiers[key];
          profile.identityResolution.sources.push(key);
          profile.identityResolution.confidence = Math.min(100, profile.identityResolution.confidence + 5);
        }
      });

      await profile.save();

      return {
        profile,
        isNew: false,
        confidence: profile.identityResolution.confidence,
        matchedServices,
        mergedProfiles: 0,
      };
    }

    // Multiple matches - merge if confidence is high enough
    const baseProfile = foundProfiles[0];

    if (mergeExisting && baseProfile.identityResolution.confidence >= confidenceThreshold) {
      for (let i = 1; i < foundProfiles.length; i++) {
        await baseProfile.mergeIdentifiers(foundProfiles[i]);
      }

      // Add new identifiers
      Object.keys(identifiers).forEach(key => {
        if (identifiers[key] && !baseProfile.identifiers[key]) {
          baseProfile.identifiers[key] = identifiers[key];
          if (!baseProfile.identityResolution.sources.includes(key)) {
            baseProfile.identityResolution.sources.push(key);
          }
        }
      });

      await baseProfile.save();

      return {
        profile: baseProfile,
        isNew: false,
        confidence: baseProfile.identityResolution.confidence,
        matchedServices,
        mergedProfiles: foundProfiles.length - 1,
      };
    }

    // Not merging - return primary with confidence warning
    return {
      profile: baseProfile,
      isNew: false,
      confidence: baseProfile.identityResolution.confidence,
      matchedServices,
      mergedProfiles: 0,
    };
  }

  /**
   * Search for profiles by email across services
   */
  private async searchByEmail(
    email: string,
    foundProfiles: any[],
    matchedServices: string[]
  ): Promise<void> {
    try {
      // Search HOJAI
      const hojaiUser = await hojaiConnector.getUserProfile(email);
      if (hojaiUser) {
        matchedServices.push('hojai');
      }

      // Search REZ
      const rezUser = await rezConnector.findConsumerByIdentifier(email, 'email');
      if (rezUser) {
        matchedServices.push('rez-consumer');
        foundProfiles.push(rezUser);
      }

      // Search StayOwn
      const stayownGuest = await stayownConnector.findGuestByIdentifier(email, 'email');
      if (stayownGuest) {
        matchedServices.push('stayown');
      }

      // Search AdBazaar
      const adbazaarProfile = await adbazaarConnector.findProfileByIdentifier(email, 'email');
      if (adbazaarProfile) {
        matchedServices.push('adbazaar');
      }

      // Search CorpID
      const corpidUser = await corpidConnector.findUserByIdentifier(email, 'email');
      if (corpidUser) {
        matchedServices.push('corpid');
      }
    } catch (error) {
      logger.warn(`Search by email failed:`, error);
    }
  }

  /**
   * Search for profiles by phone across services
   */
  private async searchByPhone(
    phone: string,
    foundProfiles: any[],
    matchedServices: string[]
  ): Promise<void> {
    try {
      // Search REZ
      const rezUser = await rezConnector.findConsumerByIdentifier(phone, 'phone');
      if (rezUser) {
        matchedServices.push('rez-consumer');
        foundProfiles.push(rezUser);
      }

      // Search StayOwn
      const stayownGuest = await stayownConnector.findGuestByIdentifier(phone, 'phone');
      if (stayownGuest) {
        matchedServices.push('stayown');
      }

      // Search CorpID
      const corpidUser = await corpidConnector.findUserByIdentifier(phone, 'phone');
      if (corpidUser) {
        matchedServices.push('corpid');
      }
    } catch (error) {
      logger.warn(`Search by phone failed:`, error);
    }
  }

  /**
   * Calculate engagement score
   */
  private calculateEngagementScore(engagement: any): number {
    let score = 0;

    // Recency factor (up to 30 points)
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(engagement.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );
    score += Math.max(0, 30 - daysSinceActivity);

    // Frequency factor (up to 30 points)
    const frequencyScores: Record<string, number> = {
      daily: 30,
      weekly: 20,
      monthly: 10,
      rare: 0,
    };
    score += frequencyScores[engagement.activityFrequency] || 0;

    // Interactions factor (up to 20 points)
    score += Math.min(20, engagement.totalInteractions / 10);

    // Preferred services count (up to 20 points)
    score += Math.min(20, engagement.preferredServices.length * 5);

    return Math.round(score);
  }

  /**
   * Calculate activity frequency
   */
  private calculateActivityFrequency(lastActivity: Date): 'daily' | 'weekly' | 'monthly' | 'rare' {
    const daysSinceActivity = Math.floor(
      (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceActivity <= 1) return 'daily';
    if (daysSinceActivity <= 7) return 'weekly';
    if (daysSinceActivity <= 30) return 'monthly';
    return 'rare';
  }

  /**
   * Create cross-service links based on shared identifiers
   */
  async createCrossServiceLinks(profile: any): Promise<CrossServiceLink[]> {
    const identifiers = profile.identifiers.toObject();
    const links: CrossServiceLink[] = [];

    // Create household link if we have multiple phone matches
    if (identifiers.phone) {
      const householdLink = await CrossServiceLink.findOrCreateHousehold(
        profile.tenantId,
        identifiers.phone,
        Object.entries(identifiers)
          .filter(([_, value]) => value)
          .map(([service, entityId]) => ({
            service: this.getServiceForIdentifier(service),
            entityType: 'user',
            entityId: entityId as string,
          }))
      );
      links.push(householdLink);
    }

    return links;
  }

  /**
   * Map identifier key to service name
   */
  private getServiceForIdentifier(key: string): string {
    const mapping: Record<string, string> = {
      corpidUserId: 'corpid',
      hojaiGenieId: 'hojai',
      rezConsumerId: 'rez-consumer',
      rezMerchantId: 'rez-merchant',
      stayownGuestId: 'stayown',
      adbazaarProfileId: 'adbazaar',
    };
    return mapping[key] || 'unknown';
  }
}

// Singleton instance
export const profileBuilder = new ProfileBuilder();
export default profileBuilder;
