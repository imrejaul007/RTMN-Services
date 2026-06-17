/**
 * Offer Generator Service
 * Generates contextual cross-service offers
 */

import { EcosystemProfile } from '../models/EcosystemProfile';
import mongoose from 'mongoose';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

interface OfferContext {
  trigger: 'purchase' | 'refund' | 'loyalty' | 'birthday' | 'inactivity' | 'cross_sell';
  relatedService?: string;
  originalAmount?: number;
  originalService?: string;
}

interface OfferPreferences {
  maxValue?: number;
  categories?: string[];
  excludeServices?: string[];
}

interface GeneratedOffer {
  offerId: string;
  title: string;
  description: string;
  offerType: 'discount' | 'voucher' | 'upgrade' | 'cashback' | 'points' | 'service';
  category: 'hotel' | 'restaurant' | 'retail' | 'healthcare' | 'entertainment' | 'cross-service';
  value: {
    amount?: number;
    percentage?: number;
    points?: number;
    serviceType?: string;
  };
  confidence: number;
  reasoning: string;
  expiresIn: number; // hours
}

// Offer schema for temporary offer storage
const GeneratedOfferSchema = new mongoose.Schema({
  offerId: { type: String, required: true, unique: true },
  profileId: { type: String, required: true, index: true },
  tenantId: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  offerType: { type: String, required: true },
  category: { type: String, required: true },
  value: mongoose.Schema.Types.Mixed,
  confidence: { type: Number, default: 0 },
  reasoning: { type: String },
  trigger: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const GeneratedOfferModel = mongoose.models.GeneratedOffer ||
  mongoose.model('GeneratedOffer', GeneratedOfferSchema);

class OfferGenerator {
  /**
   * Generate contextual offers for a profile
   */
  async generateOffers(
    profile: any,
    context: OfferContext,
    preferences?: OfferPreferences
  ): Promise<GeneratedOffer[]> {
    const offers: GeneratedOffer[] = [];

    // Generate offers based on trigger type
    switch (context.trigger) {
      case 'purchase':
        offers.push(...this.generatePurchaseOffers(profile, context, preferences));
        break;
      case 'refund':
        offers.push(...this.generateRefundOffers(profile, context, preferences));
        break;
      case 'loyalty':
        offers.push(...this.generateLoyaltyOffers(profile, preferences));
        break;
      case 'birthday':
        offers.push(...this.generateBirthdayOffers(profile, preferences));
        break;
      case 'inactivity':
        offers.push(...this.generateReengagementOffers(profile, preferences));
        break;
      case 'cross_sell':
        offers.push(...this.generateCrossSellOffers(profile, context, preferences));
        break;
    }

    // Store generated offers in database
    for (const offer of offers) {
      await GeneratedOfferModel.create({
        offerId: offer.offerId,
        profileId: profile.profileId,
        tenantId: profile.tenantId,
        ...offer,
        expiresAt: new Date(Date.now() + offer.expiresIn * 60 * 60 * 1000),
        trigger: context.trigger,
      });
    }

    return offers;
  }

  /**
   * Generate offers for purchase context
   */
  private generatePurchaseOffers(
    profile: any,
    context: OfferContext,
    preferences?: OfferPreferences
  ): GeneratedOffer[] {
    const offers: GeneratedOffer[] = [];
    const summaries = profile.serviceSummaries;

    // If purchased from one service, offer from another
    if (context.originalService) {
      const crossServiceOffers = this.getCrossServiceRecommendations(context.originalService);
      for (const rec of crossServiceOffers) {
        offers.push({
          offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: rec.title,
          description: rec.description,
          offerType: 'voucher',
          category: rec.category,
          value: {
            amount: rec.value,
            serviceType: rec.serviceType,
          },
          confidence: 85,
          reasoning: `Cross-service offer for ${context.originalService} purchase`,
          expiresIn: 168, // 7 days
        });
      }
    }

    // Loyalty tier upgrade offer
    if (summaries?.rez?.loyaltyTier && ['bronze', 'silver'].includes(summaries.rez.loyaltyTier)) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Accelerate Your Loyalty Status',
        description: 'Complete 3 more orders to reach the next loyalty tier and unlock exclusive benefits.',
        offerType: 'points',
        category: 'cross-service',
        value: {
          points: 500,
        },
        confidence: 80,
        reasoning: 'Loyalty tier upgrade opportunity',
        expiresIn: 720, // 30 days
      });
    }

    return offers;
  }

  /**
   * Generate offers for refund context
   * Instead of cash, offer vouchers to other services
   */
  private generateRefundOffers(
    profile: any,
    context: OfferContext,
    preferences?: OfferPreferences
  ): GeneratedOffer[] {
    const offers: GeneratedOffer[] = [];
    const refundAmount = context.originalAmount || 0;
    const summaries = profile.serviceSummaries;

    // Hotel voucher instead of refund
    if (refundAmount >= 50 && !preferences?.excludeServices?.includes('stayown')) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Enjoy a Complimentary Hotel Stay',
        description: `Instead of a cash refund, enjoy a ${Math.min(1, refundAmount / 100)} night complimentary stay at any StayOwn property. Experience luxury hospitality on us!`,
        offerType: 'voucher',
        category: 'hotel',
        value: {
          amount: Math.max(500, refundAmount * 1.2), // 20% bonus
          serviceType: 'hotel-stay',
        },
        confidence: 90,
        reasoning: 'Hotel voucher offered as alternative to cash refund',
        expiresIn: 720, // 30 days
      });
    }

    // Restaurant voucher if they've ordered before
    if (summaries?.rez?.totalOrders && summaries.rez.totalOrders > 0 && !preferences?.excludeServices?.includes('rez')) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Culinary Experience Voucher',
        description: 'Treat yourself to a complimentary dining experience at partner restaurants.',
        offerType: 'voucher',
        category: 'restaurant',
        value: {
          amount: Math.max(200, refundAmount * 0.5),
          serviceType: 'restaurant-credit',
        },
        confidence: 85,
        reasoning: 'Restaurant credit for active REZ customer',
        expiresIn: 336, // 14 days
      });
    }

    // Loyalty points if they have an account
    if (summaries?.rez?.loyaltyPoints !== undefined) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Bonus Loyalty Points',
        description: `Receive ${Math.floor(refundAmount)} bonus points added to your loyalty account.`,
        offerType: 'points',
        category: 'cross-service',
        value: {
          points: Math.floor(refundAmount) * 2,
        },
        confidence: 80,
        reasoning: 'Loyalty points compensation for refund',
        expiresIn: 720, // 30 days
      });
    }

    return offers;
  }

  /**
   * Generate loyalty milestone offers
   */
  private generateLoyaltyOffers(
    profile: any,
    preferences?: OfferPreferences
  ): GeneratedOffer[] {
    const offers: GeneratedOffer[] = [];
    const summaries = profile.serviceSummaries;

    // Check for StayOwn loyalty tier
    if (summaries?.stayown) {
      const stayTier = summaries.stayown.loyaltyTier || 'bronze';
      if (stayTier === 'silver') {
        offers.push({
          offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Gold Status Upgrade',
          description: 'Congratulations! As a token of appreciation, enjoy complimentary room upgrades and late check-out.',
          offerType: 'upgrade',
          category: 'hotel',
          value: {
            serviceType: 'room-upgrade',
          },
          confidence: 95,
          reasoning: 'Silver tier member eligible for Gold upgrade',
          expiresIn: 1440, // 60 days
        });
      }
    }

    // REZ loyalty bonus
    if (summaries?.rez?.loyaltyPoints) {
      const points = summaries.rez.loyaltyPoints;
      if (points > 5000) {
        offers.push({
          offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'VIP Exclusive Offer',
          description: 'As a valued VIP member, enjoy 20% off your next order plus free delivery.',
          offerType: 'discount',
          category: 'cross-service',
          value: {
            percentage: 20,
          },
          confidence: 90,
          reasoning: 'High loyalty points balance',
          expiresIn: 168, // 7 days
        });
      }
    }

    return offers;
  }

  /**
   * Generate birthday offers
   */
  private generateBirthdayOffers(
    profile: any,
    preferences?: OfferPreferences
  ): GeneratedOffer[] {
    const offers: GeneratedOffer[] = [];

    // Multi-service birthday bundle
    offers.push({
      offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: 'Happy Birthday Bundle',
      description: 'Celebrate with complimentary experiences across our ecosystem: free hotel night, restaurant meal, and spa treatment.',
      offerType: 'service',
      category: 'cross-service',
      value: {
        serviceType: 'birthday-bundle',
      },
      confidence: 95,
      reasoning: 'Birthday celebration offer',
      expiresIn: 336, // 14 days
    });

    // Hotel birthday offer
    if (!preferences?.excludeServices?.includes('stayown')) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Birthday Stay Gift',
        description: 'Enjoy a complimentary night stay at any StayOwn property on your special day.',
        offerType: 'voucher',
        category: 'hotel',
        value: {
          amount: 3000,
          serviceType: 'hotel-night',
        },
        confidence: 90,
        reasoning: 'Birthday hotel stay offer',
        expiresIn: 168, // 7 days
      });
    }

    return offers;
  }

  /**
   * Generate re-engagement offers for inactive users
   */
  private generateReengagementOffers(
    profile: any,
    preferences?: OfferPreferences
  ): GeneratedOffer[] {
    const offers: GeneratedOffer[] = [];
    const engagement = profile.engagement;

    // Calculate inactivity days
    const daysInactive = Math.floor(
      (Date.now() - new Date(engagement.lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysInactive >= 30) {
      // Come back offer
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'We Miss You!',
        description: "It's been a while! Here's a special offer to welcome you back.",
        offerType: 'voucher',
        category: 'cross-service',
        value: {
          amount: 500,
        },
        confidence: 85,
        reasoning: `User inactive for ${daysInactive} days`,
        expiresIn: 168, // 7 days
      });

      // Personalized based on preferred services
      if (engagement.preferredServices.includes('stayown')) {
        offers.push({
          offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          title: 'Return Guest Special',
          description: 'Book your next stay with 30% off and complimentary breakfast.',
          offerType: 'discount',
          category: 'hotel',
          value: {
            percentage: 30,
          },
          confidence: 80,
          reasoning: 'Previous hotel guest re-engagement',
          expiresIn: 336, // 14 days
        });
      }
    }

    return offers;
  }

  /**
   * Generate cross-sell offers
   */
  private generateCrossSellOffers(
    profile: any,
    context: OfferContext,
    preferences?: OfferPreferences
  ): GeneratedOffer[] {
    const offers: GeneratedOffer[] = [];
    const summaries = profile.serviceSummaries;

    // If they're a hotel guest, offer restaurant
    if (context.relatedService === 'stayown' && summaries?.rez) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Dining Credit',
        description: 'Enjoy 15% off at partner restaurants when you show your hotel key.',
        offerType: 'discount',
        category: 'restaurant',
        value: {
          percentage: 15,
        },
        confidence: 85,
        reasoning: 'Cross-sell from hotel to restaurant',
        expiresIn: 168, // 7 days
      });
    }

    // If they're a frequent restaurant customer, offer hotel
    if (summaries?.rez?.totalOrders && summaries.rez.totalOrders > 10) {
      offers.push({
        offerId: `OFFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: 'Hotel Discovery Rate',
        description: 'As one of our valued diners, enjoy an exclusive 25% off your first hotel stay.',
        offerType: 'discount',
        category: 'hotel',
        value: {
          percentage: 25,
        },
        confidence: 80,
        reasoning: 'Cross-sell from restaurant to hotel for frequent customer',
        expiresIn: 720, // 30 days
      });
    }

    return offers;
  }

  /**
   * Get cross-service recommendations based on original service
   */
  private getCrossServiceRecommendations(
    originalService: string
  ): Array<{
    title: string;
    description: string;
    category: 'hotel' | 'restaurant' | 'retail' | 'healthcare' | 'entertainment' | 'cross-service';
    value: number;
    serviceType: string;
  }> {
    const recommendations: Record<string, Array<{
      title: string;
      description: string;
      category: 'hotel' | 'restaurant' | 'retail' | 'healthcare' | 'entertainment' | 'cross-service';
      value: number;
      serviceType: string;
    }>> = {
      'restaurant-os': [
        {
          title: 'Hotel Stay Voucher',
          description: 'Enjoy a complimentary night at StayOwn properties.',
          category: 'hotel',
          value: 500,
          serviceType: 'hotel-night',
        },
        {
          title: 'Spa Experience',
          description: 'Relax with a complimentary spa treatment.',
          category: 'entertainment',
          value: 300,
          serviceType: 'spa',
        },
      ],
      'hotel-os': [
        {
          title: 'Dining Credit',
          description: 'Enjoy complimentary dining at partner restaurants.',
          category: 'restaurant',
          value: 200,
          serviceType: 'restaurant-credit',
        },
        {
          title: 'Retail Shopping Credit',
          description: 'Get exclusive shopping deals.',
          category: 'retail',
          value: 150,
          serviceType: 'shopping-credit',
        },
      ],
      'retail-os': [
        {
          title: 'Hotel Experience',
          description: 'Upgrade your shopping to a hotel stay.',
          category: 'hotel',
          value: 400,
          serviceType: 'hotel-stay',
        },
        {
          title: 'Restaurant Voucher',
          description: 'Enjoy a complimentary meal.',
          category: 'restaurant',
          value: 250,
          serviceType: 'restaurant-credit',
        },
      ],
    };

    return recommendations[originalService] || [
      {
        title: 'Ecosystem Welcome Offer',
        description: 'Explore our services with a special welcome bonus.',
        category: 'cross-service',
        value: 300,
        serviceType: 'credit',
      },
    ];
  }

  /**
   * Generate contextual cross-service offer (specific use case)
   */
  async generateContextualCrossServiceOffer(
    profile: any,
    triggerType: string,
    originalAmount?: number,
    originalService?: string,
    excludeServices?: string[]
  ): Promise<GeneratedOffer[]> {
    const context: OfferContext = {
      trigger: triggerType as OfferContext['trigger'],
      originalAmount,
      originalService,
    };

    const preferences: OfferPreferences = {
      excludeServices,
    };

    return this.generateOffers(profile, context, preferences);
  }

  /**
   * Get user's generated offers
   */
  async getUserOffers(profileId: string): Promise<any[]> {
    const now = new Date();
    return GeneratedOfferModel.find({
      profileId,
      expiresAt: { $gt: now },
      used: false,
    }).sort({ createdAt: -1 });
  }

  /**
   * Mark offer as used
   */
  async markOfferUsed(offerId: string): Promise<boolean> {
    const result = await GeneratedOfferModel.updateOne(
      { offerId },
      { used: true }
    );
    return result.modifiedCount > 0;
  }
}

// Singleton instance
export const offerGenerator = new OfferGenerator();
export default offerGenerator;
