import axios from 'axios';
import { Experience, ExperienceTouchpoint, Review } from '../models/HospitalityProfile';

interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
}

interface JourneyStats {
  totalExperiences: number;
  averageSatisfaction: number;
  npsScore: number;
  topTouchpoints: string[];
  commonPainPoints: string[];
  stageBreakdown: Record<string, number>;
}

export class ExperienceSync {
  private journeyIntelligenceUrl: string;
  private feedbackTwinUrl: string;
  private customerTwinUrl: string;
  private eventBusUrl: string;

  // Local storage for offline mode
  private experienceStore: Map<string, Experience> = new Map();
  private reviewStore: Map<string, Review> = new Map();
  private syncedJourneys: Map<string, string> = new Map();

  constructor() {
    this.journeyIntelligenceUrl = process.env.JOURNEY_INTELLIGENCE_URL || 'http://localhost:4761';
    this.feedbackTwinUrl = process.env.FEEDBACK_TWIN_URL || 'http://localhost:3019';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    this.eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';
  }

  // Sync all experiences to Journey Intelligence
  async syncAllExperiences(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    const experiences = Array.from(this.experienceStore.values());

    for (const experience of experiences) {
      const syncResult = await this.syncExperience(experience);
      result.synced += syncResult.synced;
      result.failed += syncResult.failed;
      result.errors.push(...syncResult.errors);
    }

    result.success = result.failed === 0;
    return result;
  }

  // Sync a single experience
  async syncExperience(experience: Experience): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    try {
      // Map experience to Journey Intelligence format
      const journeyData = {
        externalId: experience.id,
        journeyId: experience.journeyId || this.syncedJourneys.get(experience.id),
        guest: {
          id: experience.guestId,
          name: experience.guestName
        },
        property: {
          id: experience.propertyId,
          name: experience.propertyName
        },
        touchpoints: experience.touchpoints.map(tp => ({
          name: tp.name,
          category: tp.category,
          rating: tp.rating,
          notes: tp.notes,
          timestamp: tp.timestamp
        })),
        overallSatisfaction: experience.overallSatisfaction,
        netPromoterScore: experience.netPromoterScore,
        journeyStage: experience.journeyStage,
        painPoints: experience.painPoints,
        highlights: experience.highlights,
        recommendations: experience.recommendations,
        createdAt: experience.createdAt,
        source: 'hospitality-integration',
        lastSyncedAt: new Date().toISOString()
      };

      // Try to sync to Journey Intelligence
      const response = await axios.post(`${this.journeyIntelligenceUrl}/api/journeys`, journeyData, {
        timeout: 5000
      });

      if (response.data?.id) {
        this.syncedJourneys.set(experience.id, response.data.id);
        experience.journeyId = response.data.id;
      }

      result.synced = 1;

      // Publish event
      await this.publishEvent('experience.synced', {
        experienceId: experience.id,
        journeyId: response.data?.id,
        satisfaction: experience.overallSatisfaction
      });

    } catch (error: any) {
      console.error(`[ExperienceSync] Failed to sync experience ${experience.id}:`, error.message);
      result.failed = 1;
      result.errors.push(`${experience.id}: ${error.message}`);

      // Store locally
      this.experienceStore.set(experience.id, experience);
    }

    return result;
  }

  // Create new experience from booking data
  async createExperienceFromStay(
    guestId: string,
    guestName: string,
    propertyId: string,
    propertyName: string,
    bookingId: string,
    checkIn: string,
    checkOut: string,
    diningVisits: { restaurantId: string; restaurantName: string; rating?: number }[],
    overallRating: number,
    feedback?: string
  ): Promise<Experience> {
    const experienceId = `EXP-${Date.now()}`;

    const touchpoints: ExperienceTouchpoint[] = [
      {
        name: 'Check-in Process',
        category: 'check-in',
        rating: overallRating,
        timestamp: checkIn
      },
      {
        name: 'Room Quality',
        category: 'room',
        rating: overallRating,
        notes: 'Room accommodation'
      },
      {
        name: 'Overall Stay',
        category: 'service',
        rating: overallRating,
        notes: feedback
      }
    ];

    // Add dining touchpoints
    for (const dining of diningVisits) {
      touchpoints.push({
        name: dining.restaurantName,
        category: 'dining',
        rating: dining.rating || overallRating,
        timestamp: checkIn
      });
    }

    touchpoints.push({
      name: 'Check-out Process',
      category: 'check-out',
      rating: overallRating,
      timestamp: checkOut
    });

    const experience: Experience = {
      id: experienceId,
      guestId,
      guestName,
      guestName,
      propertyId,
      propertyName,
      touchpoints,
      overallSatisfaction: overallRating,
      netPromoterScore: this.calculateNPS(overallRating),
      journeyStage: 'post-stay',
      painPoints: this.extractPainPoints(feedback),
      highlights: this.extractHighlights(feedback),
      recommendations: [],
      createdAt: new Date().toISOString()
    };

    this.experienceStore.set(experienceId, experience);

    // Sync to Journey Intelligence
    await this.syncExperience(experience);

    return experience;
  }

  // Get experience by ID
  async getExperienceById(experienceId: string): Promise<Experience | null> {
    return this.experienceStore.get(experienceId) || null;
  }

  // Get experiences by guest
  async getExperiencesByGuest(guestId: string): Promise<Experience[]> {
    return Array.from(this.experienceStore.values())
      .filter(e => e.guestId === guestId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Sync review to Feedback Twin
  async syncReview(review: Review): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: []
    };

    this.reviewStore.set(review.id, review);

    try {
      const feedbackData = {
        externalId: review.id,
        feedbackTwinId: review.feedbackTwinId,
        type: 'review',
        subtype: review.type,
        guest: {
          id: review.guestId,
          name: review.guestName
        },
        entity: {
          propertyId: review.propertyId,
          propertyName: review.propertyName,
          restaurantId: review.restaurantId
        },
        bookingId: review.bookingId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        pros: review.pros,
        cons: review.cons,
        wouldRecommend: review.wouldRecommend,
        status: review.status,
        ownerResponse: review.ownerResponse,
        ownerRespondedAt: review.ownerRespondedAt,
        helpful: review.helpful,
        createdAt: review.createdAt,
        source: 'hospitality-integration',
        lastSyncedAt: new Date().toISOString()
      };

      const response = await axios.post(`${this.feedbackTwinUrl}/api/feedback`, feedbackData, {
        timeout: 5000
      });

      if (response.data?.id) {
        review.feedbackTwinId = response.data.id;
      }

      result.synced = 1;

      // Publish event
      await this.publishEvent('feedback.review.created', {
        reviewId: review.id,
        feedbackTwinId: response.data?.id,
        rating: review.rating,
        type: review.type
      });

    } catch (error: any) {
      console.error(`[ExperienceSync] Failed to sync review ${review.id}:`, error.message);
      result.failed = 1;
      result.errors.push(`${review.id}: ${error.message}`);
    }

    return result;
  }

  // Get all reviews
  async getAllReviews(): Promise<Review[]> {
    return Array.from(this.reviewStore.values());
  }

  // Get reviews by property
  async getReviewsByProperty(propertyId: string): Promise<Review[]> {
    return Array.from(this.reviewStore.values())
      .filter(r => r.propertyId === propertyId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Get journey statistics
  async getJourneyStats(): Promise<JourneyStats> {
    const experiences = Array.from(this.experienceStore.values());

    const stats: JourneyStats = {
      totalExperiences: experiences.length,
      averageSatisfaction: 0,
      npsScore: 0,
      topTouchpoints: [],
      commonPainPoints: [],
      stageBreakdown: {}
    };

    if (experiences.length === 0) {
      return stats;
    }

    // Calculate average satisfaction
    const totalSatisfaction = experiences.reduce((sum, e) => sum + e.overallSatisfaction, 0);
    stats.averageSatisfaction = totalSatisfaction / experiences.length;

    // Calculate NPS
    const npsScores = experiences.map(e => e.netPromoterScore || 0);
    const promoters = npsScores.filter(s => s >= 9).length;
    const detractors = npsScores.filter(s => s <= 6).length;
    stats.npsScore = ((promoters - detractors) / experiences.length) * 100;

    // Top touchpoints
    const touchpointCounts = new Map<string, number>();
    for (const exp of experiences) {
      for (const tp of exp.touchpoints) {
        touchpointCounts.set(tp.name, (touchpointCounts.get(tp.name) || 0) + 1);
      }
    }
    stats.topTouchpoints = Array.from(touchpointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Common pain points
    const painPointCounts = new Map<string, number>();
    for (const exp of experiences) {
      for (const pain of exp.painPoints) {
        painPointCounts.set(pain, (painPointCounts.get(pain) || 0) + 1);
      }
    }
    stats.commonPainPoints = Array.from(painPointCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    // Stage breakdown
    for (const exp of experiences) {
      stats.stageBreakdown[exp.journeyStage] = (stats.stageBreakdown[exp.journeyStage] || 0) + 1;
    }

    return stats;
  }

  // Create experience from service request feedback
  async createExperienceFromServiceRequest(
    guestId: string,
    guestName: string,
    propertyId: string,
    propertyName: string,
    requestType: string,
    satisfaction: number,
    notes?: string
  ): Promise<Experience> {
    const experienceId = `EXP-SVC-${Date.now()}`;

    const touchpoints: ExperienceTouchpoint[] = [
      {
        name: `${requestType} Service`,
        category: 'service',
        rating: satisfaction,
        notes
      }
    ];

    const experience: Experience = {
      id: experienceId,
      guestId,
      guestName,
      propertyId,
      propertyName,
      touchpoints,
      overallSatisfaction: satisfaction,
      netPromoterScore: this.calculateNPS(satisfaction),
      journeyStage: 'stay',
      painPoints: satisfaction < 3 ? [`Service issue: ${requestType}`] : [],
      highlights: satisfaction >= 4 ? [`Good ${requestType} service`] : [],
      recommendations: [],
      createdAt: new Date().toISOString()
    };

    this.experienceStore.set(experienceId, experience);
    await this.syncExperience(experience);

    return experience;
  }

  // Helper: Calculate NPS from satisfaction
  private calculateNPS(satisfaction: number): number {
    if (satisfaction >= 9) return 10;
    if (satisfaction >= 7) return 8;
    if (satisfaction >= 5) return 5;
    return 3;
  }

  // Helper: Extract pain points from feedback text
  private extractPainPoints(feedback?: string): string[] {
    if (!feedback) return [];

    const painKeywords = [
      'slow', 'dirty', 'cold', 'noisy', 'broken', 'late',
      'rude', 'expensive', 'waiting', 'problem', 'issue'
    ];

    const points: string[] = [];
    const lowerFeedback = feedback.toLowerCase();

    for (const keyword of painKeywords) {
      if (lowerFeedback.includes(keyword)) {
        points.push(`Mentioned: ${keyword}`);
      }
    }

    return points;
  }

  // Helper: Extract highlights from feedback text
  private extractHighlights(feedback?: string): string[] {
    if (!feedback) return [];

    const highlightKeywords = [
      'great', 'excellent', 'amazing', 'friendly', 'clean',
      'comfortable', 'helpful', 'quick', 'wonderful', 'perfect'
    ];

    const highlights: string[] = [];
    const lowerFeedback = feedback.toLowerCase();

    for (const keyword of highlightKeywords) {
      if (lowerFeedback.includes(keyword)) {
        highlights.push(`Mentioned: ${keyword}`);
      }
    }

    return highlights;
  }

  // Publish event to Event Bus
  private async publishEvent(eventType: string, payload: any): Promise<void> {
    try {
      await axios.post(`${this.eventBusUrl}/api/events`, {
        type: eventType,
        source: 'experience-sync',
        payload,
        timestamp: new Date().toISOString()
      }, { timeout: 3000 });
    } catch (error) {
      // Event Bus may not be available
    }
  }

  // Get pending syncs
  async getPendingSyncs(): Promise<Experience[]> {
    const unsynced: Experience[] = [];

    for (const [id, journeyId] of this.syncedJourneys) {
      if (!journeyId) {
        const experience = this.experienceStore.get(id);
        if (experience) {
          unsynced.push(experience);
        }
      }
    }

    for (const [id, experience] of this.experienceStore) {
      if (!this.syncedJourneys.has(id)) {
        unsynced.push(experience);
      }
    }

    return unsynced;
  }

  // Clear local storage
  clear(): void {
    this.experienceStore.clear();
    this.reviewStore.clear();
    this.syncedJourneys.clear();
  }
}
