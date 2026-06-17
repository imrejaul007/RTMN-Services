/**
 * Journey Tracker Service
 * Tracks touchpoints and manages customer journeys
 */

import { v4 as uuidv4 } from 'uuid';
import { CustomerJourney, CustomerJourneyDocument } from '../models/Journey';
import { Touchpoint, TouchpointDocument } from '../models/Touchpoint';
import {
  JourneyStage,
  TouchpointType,
  TrackTouchpointRequest,
  CreateJourneyRequest,
  TouchpointSource,
  AttributionModel
} from '../types';
import { logger } from '../utils/logger';

export class JourneyTracker {
  /**
   * Create a new customer journey
   */
  async createJourney(request: CreateJourneyRequest): Promise<CustomerJourneyDocument> {
    const tenantId = request.tenantId || 'public';
    const initialStage = request.initialStage || JourneyStage.AWARENESS;

    // Check if journey already exists
    let journey = await CustomerJourney.findByCustomerAndTenant(
      request.customerId,
      tenantId
    );

    if (journey) {
      logger.warn(`Journey already exists for customer ${request.customerId}`);
      return journey;
    }

    // Create new journey
    journey = new CustomerJourney({
      customerId: request.customerId,
      tenantId,
      currentStage: initialStage,
      stages: [
        {
          stage: initialStage,
          enteredAt: new Date(),
          metadata: request.metadata
        }
      ],
      touchpoints: [],
      metadata: request.metadata || {}
    });

    await journey.save();
    logger.info(`Created journey for customer ${request.customerId}, stage: ${initialStage}`);

    return journey;
  }

  /**
   * Track a touchpoint and update journey
   */
  async trackTouchpoint(request: TrackTouchpointRequest): Promise<TouchpointDocument> {
    const tenantId = request.tenantId || 'public';
    const timestamp = request.timestamp || new Date();

    // Get or create journey
    let journey = await CustomerJourney.findByCustomerAndTenant(
      request.customerId,
      tenantId
    );

    if (!journey) {
      journey = await this.createJourney({
        customerId: request.customerId,
        tenantId,
        initialStage: JourneyStage.AWARENESS
      });
    }

    // Create touchpoint
    const touchpointId = uuidv4();
    const touchpoint = new Touchpoint({
      touchpointId,
      customerId: request.customerId,
      tenantId,
      type: request.type,
      source: request.source,
      journeyId: journey._id?.toString(),
      timestamp,
      duration: request.duration,
      revenue: request.revenue,
      metadata: request.metadata || {},
      properties: request.properties || {},
      sessionId: request.sessionId,
      deviceInfo: request.deviceInfo,
      location: request.location,
      converted: request.type === TouchpointType.PURCHASE
    });

    await touchpoint.save();

    // Update journey
    journey.touchpoints.push(touchpoint._id);

    // Update value if revenue
    if (request.revenue) {
      journey.addValue(request.revenue);
    }

    // Check for stage transitions
    const newStage = this.determineStage(request.type, journey.currentStage);
    if (newStage !== journey.currentStage) {
      await journey.advanceStage(newStage, touchpointId);
    }

    // Mark converted if purchase
    if (request.type === TouchpointType.PURCHASE && !journey.convertedAt) {
      await journey.markConverted();
    }

    logger.info(`Tracked touchpoint ${touchpointId} for customer ${request.customerId}`);

    return touchpoint;
  }

  /**
   * Determine journey stage based on touchpoint type
   */
  private determineStage(
    touchpointType: TouchpointType,
    currentStage: JourneyStage
  ): JourneyStage {
    const stageMap: Record<TouchpointType, JourneyStage> = {
      [TouchpointType.AD]: JourneyStage.AWARENESS,
      [TouchpointType.WEBSITE]: JourneyStage.CONSIDERATION,
      [TouchpointType.SEARCH]: JourneyStage.CONSIDERATION,
      [TouchpointType.SOCIAL]: JourneyStage.AWARENESS,
      [TouchpointType.EMAIL]: JourneyStage.CONSIDERATION,
      [TouchpointType.SIGNUP]: JourneyStage.ACQUISITION,
      [TouchpointType.APP]: JourneyStage.ACTIVATION,
      [TouchpointType.CALL]: JourneyStage.ACTIVATION,
      [TouchpointType.CHAT]: JourneyStage.ACTIVATION,
      [TouchpointType.PURCHASE]: JourneyStage.ACQUISITION,
      [TouchpointType.DELIVERY]: JourneyStage.ACTIVATION,
      [TouchpointType.SUPPORT]: JourneyStage.RETENTION,
      [TouchpointType.REVIEW]: JourneyStage.RETENTION,
      [TouchpointType.REPEAT]: JourneyStage.RETENTION,
      [TouchpointType.REFERRAL]: JourneyStage.REFERRAL
    };

    return stageMap[touchpointType] || currentStage;
  }

  /**
   * Get customer's journey with all touchpoints
   */
  async getCustomerJourney(
    customerId: string,
    tenantId: string
  ): Promise<CustomerJourneyDocument | null> {
    return CustomerJourney.findByCustomerAndTenant(customerId, tenantId)
      .populate('touchpoints')
      .exec();
  }

  /**
   * Get touchpoints for a customer
   */
  async getTouchpoints(
    customerId: string,
    tenantId: string,
    options?: { limit?: number; type?: TouchpointType; dateRange?: { start: Date; end: Date } }
  ): Promise<TouchpointDocument[]> {
    const query: Record<string, unknown> = { customerId, tenantId };

    if (options?.type) {
      query.type = options.type;
    }

    if (options?.dateRange) {
      query.timestamp = {
        $gte: options.dateRange.start,
        $lte: options.dateRange.end
      };
    }

    let queryBuilder = Touchpoint.find(query).sort('-timestamp');

    if (options?.limit) {
      queryBuilder = queryBuilder.limit(options.limit);
    }

    return queryBuilder.exec();
  }

  /**
   * Calculate attribution for touchpoints
   */
  async calculateAttribution(
    customerId: string,
    tenantId: string,
    model: AttributionModel = AttributionModel.LAST_TOUCH
  ): Promise<Record<string, number>> {
    const touchpoints = await Touchpoint.findByCustomer(customerId, tenantId, {
      sort: 'timestamp'
    });

    if (touchpoints.length === 0) {
      return {};
    }

    const totalRevenue = touchpoints.reduce((sum, t) => sum + (t.revenue || 0), 0);

    switch (model) {
      case AttributionModel.LAST_TOUCH: {
        const lastTouch = touchpoints[touchpoints.length - 1];
        return { [lastTouch.type]: totalRevenue };
      }

      case AttributionModel.FIRST_TOUCH: {
        const firstTouch = touchpoints[0];
        return { [firstTouch.type]: totalRevenue };
      }

      case AttributionModel.LINEAR: {
        const weight = 1 / touchpoints.length;
        const attribution: Record<string, number> = {};
        touchpoints.forEach(t => {
          const value = (t.revenue || 0) * weight;
          attribution[t.type] = (attribution[t.type] || 0) + value;
        });
        return attribution;
      }

      case AttributionModel.TIME_DECAY: {
        const attribution: Record<string, number> = {};
        const decayFactor = 0.7; // 70% decay factor
        const touchpointsReversed = [...touchpoints].reverse();

        touchpointsReversed.forEach((t, index) => {
          const weight = Math.pow(decayFactor, index);
          const value = (t.revenue || 0) * weight;
          attribution[t.type] = (attribution[t.type] || 0) + value;
        });
        return attribution;
      }

      case AttributionModel.POSITION_BASED: {
        const attribution: Record<string, number> = {};
        const n = touchpoints.length;

        touchpoints.forEach((t, index) => {
          let weight: number;
          if (n === 1) {
            weight = 1;
          } else if (index === 0) {
            weight = 0.4; // First gets 40%
          } else if (index === n - 1) {
            weight = 0.4; // Last gets 40%
          } else {
            weight = 0.2 / (n - 2); // Middle gets 20% split
          }

          const value = (t.revenue || 0) * weight;
          attribution[t.type] = (attribution[t.type] || 0) + value;
        });
        return attribution;
      }

      default:
        return {};
    }
  }

  /**
   * Get journey statistics for a tenant
   */
  async getJourneyStats(tenantId: string): Promise<{
    totalJourneys: number;
    activeJourneys: number;
    convertedJourneys: number;
    churnedJourneys: number;
    conversionRate: number;
    avgLifetime: number;
    avgValue: number;
    stageDistribution: Record<string, number>;
  }> {
    const journeys = await CustomerJourney.find({ tenantId });

    const totalJourneys = journeys.length;
    const activeJourneys = journeys.filter(
      j => !j.convertedAt && !j.churnedAt
    ).length;
    const convertedJourneys = journeys.filter(j => j.convertedAt).length;
    const churnedJourneys = journeys.filter(j => j.churnedAt).length;
    const conversionRate = totalJourneys > 0
      ? (convertedJourneys / totalJourneys) * 100
      : 0;

    const avgLifetime = journeys.length > 0
      ? journeys.reduce((sum, j) => sum + j.lifetime, 0) / journeys.length
      : 0;

    const avgValue = journeys.length > 0
      ? journeys.reduce((sum, j) => sum + j.value, 0) / journeys.length
      : 0;

    const stageDistribution: Record<string, number> = {};
    journeys.forEach(j => {
      stageDistribution[j.currentStage] =
        (stageDistribution[j.currentStage] || 0) + 1;
    });

    return {
      totalJourneys,
      activeJourneys,
      convertedJourneys,
      churnedJourneys,
      conversionRate,
      avgLifetime,
      avgValue,
      stageDistribution
    };
  }

  /**
   * Mark a journey as churned
   */
  async markChurned(customerId: string, tenantId: string): Promise<void> {
    const journey = await CustomerJourney.findByCustomerAndTenant(
      customerId,
      tenantId
    );

    if (journey && !journey.churnedAt) {
      await journey.markChurned();
      logger.info(`Marked journey as churned for customer ${customerId}`);
    }
  }
}

export const journeyTracker = new JourneyTracker();
