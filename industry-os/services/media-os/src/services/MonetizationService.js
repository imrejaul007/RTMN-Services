/**
 * Media OS - Monetization Service
 * Handles all monetization operations with RTMN integration
 */

const axios = require('axios');
const config = require('../config');
const logger = require('../config/database');
const { rtmnService } = require('./RTMNIntegration');

/**
 * Monetization Service
 * Manages subscriptions, PPV, advertising, and revenue
 */
class MonetizationService {
  constructor() {
    this.adbazaarClient = rtmnService.clients.ADBAZAAR_DSP;
    this.rabtulClient = rtmnService.clients.RABTUL_WALLET;
  }

  // ============================================
  // SUBSCRIPTION OPERATIONS
  // ============================================

  /**
   * Create subscription for viewer
   */
  async createSubscription(viewerId, planId, paymentDetails) {
    try {
      // Get plan details
      const Plan = require('../models/Plan');
      const plan = await Plan.findById(planId);

      if (!plan) {
        throw new Error('Plan not found');
      }

      // Calculate pricing
      const billingCycle = paymentDetails.billingCycle || 'monthly';
      const basePrice = plan.pricing[billingCycle];
      const tax = basePrice * (plan.pricing.tax / 100);
      const total = basePrice + tax;

      // Create subscription record
      const Subscription = require('../models/Subscription');
      const Viewer = require('../models/Viewer');

      const viewer = await Viewer.findById(viewerId);
      if (!viewer) {
        throw new Error('Viewer not found');
      }

      // Calculate end date based on billing cycle
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === 'monthly') endDate.setMonth(endDate.getMonth() + 1);
      else if (billingCycle === 'quarterly') endDate.setMonth(endDate.getMonth() + 3);
      else if (billingCycle === 'yearly') endDate.setFullYear(endDate.getFullYear() + 1);

      const subscription = new Subscription({
        viewerId: viewer._id,
        plan: {
          type: plan.type,
          name: plan.displayName,
        },
        pricing: {
          amount: basePrice,
          currency: plan.pricing.currency,
          billingCycle,
          tax,
        },
        startDate,
        endDate,
        nextBillingDate: endDate,
        payment: {
          method: paymentDetails.method || 'card',
          autoRenew: true,
        },
        status: 'active',
      });

      // Process payment
      if (paymentDetails.paymentMethod !== 'gift') {
        const paymentResult = await this.processPayment(viewerId, total, plan.pricing.currency, {
          type: 'subscription',
          planId,
          subscriptionId: subscription._id,
        });

        if (!paymentResult.success) {
          subscription.status = 'pending';
        }

        subscription.transactionId = paymentResult.transactionId;
      }

      await subscription.save();

      // Update viewer
      viewer.subscription = {
        plan: plan.type,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.payment.autoRenew,
      };
      await viewer.save();

      logger.info('Subscription created', { viewerId, planId, amount: total });

      return {
        success: true,
        subscription,
        plan,
        payment: paymentResult,
      };
    } catch (error) {
      logger.error('Subscription creation failed', { viewerId, error: error.message });
      throw error;
    }
  }

  /**
   * Process payment via RABTUL
   */
  async processPayment(userId, amount, currency, metadata) {
    try {
      const result = await rtmnService.createPaymentIntent(amount, currency, {
        userId,
        source: 'media-os',
        ...metadata,
      });

      return {
        success: true,
        transactionId: result.transactionId,
        paymentUrl: result.paymentUrl,
      };
    } catch (error) {
      logger.error('Payment processing failed', { userId, amount, error: error.message });

      // Return mock success for development
      if (config.NODE_ENV === 'development') {
        return {
          success: true,
          transactionId: `DEV-${Date.now()}`,
          mock: true,
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Renew subscription
   */
  async renewSubscription(subscriptionId) {
    try {
      const Subscription = require('../models/Subscription');
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Calculate new period
      const billingCycle = subscription.pricing.billingCycle;
      const newStartDate = new Date(subscription.endDate);
      const newEndDate = new Date(newStartDate);

      if (billingCycle === 'monthly') newEndDate.setMonth(newEndDate.getMonth() + 1);
      else if (billingCycle === 'quarterly') newEndDate.setMonth(newEndDate.getMonth() + 3);
      else if (billingCycle === 'yearly') newEndDate.setFullYear(newEndDate.getFullYear() + 1);

      // Process payment
      const paymentResult = await this.processPayment(
        subscription.viewerId,
        subscription.pricing.amount + subscription.pricing.tax,
        subscription.pricing.currency,
        { type: 'subscription_renewal', subscriptionId: subscription._id }
      );

      if (paymentResult.success) {
        subscription.startDate = newStartDate;
        subscription.endDate = newEndDate;
        subscription.nextBillingDate = newEndDate;
        subscription.transactionId = paymentResult.transactionId;
        subscription.status = 'active';
      } else {
        subscription.status = 'expired';
      }

      await subscription.save();

      return {
        success: paymentResult.success,
        subscription,
      };
    } catch (error) {
      logger.error('Subscription renewal failed', { subscriptionId, error: error.message });
      throw error;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId, reason, immediate = false) {
    try {
      const Subscription = require('../models/Subscription');
      const subscription = await Subscription.findById(subscriptionId);

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      subscription.status = 'cancelled';
      subscription.payment.autoRenew = false;
      subscription.cancellation = {
        reason,
        cancelledAt: new Date(),
        effectiveDate: immediate ? new Date() : subscription.endDate,
      };

      await subscription.save();

      logger.info('Subscription cancelled', { subscriptionId, reason });

      return { success: true, subscription };
    } catch (error) {
      logger.error('Subscription cancellation failed', { subscriptionId, error: error.message });
      throw error;
    }
  }

  // ============================================
  // PPV OPERATIONS
  // ============================================

  /**
   * Purchase/rent content (PPV)
   */
  async purchaseContent(viewerId, contentId, type, options = {}) {
    try {
      const Content = require('../models/Content');
      const PPVTransaction = require('../models/PPV');

      const content = await Content.findById(contentId);
      if (!content) {
        throw new Error('Content not found');
      }

      // Check for existing purchase/rental
      const existing = await PPVTransaction.findOne({
        viewerId,
        contentId,
        type,
        status: { $ne: 'expired' },
      });

      if (existing) {
        if (type === 'purchase') {
          return { success: true, transaction: existing, alreadyOwned: true };
        } else if (existing.type === 'rental' && !existing.isExpired) {
          return { success: true, transaction: existing, alreadyRented: true };
        }
      }

      // Calculate price
      let price, duration;
      if (type === 'rental') {
        price = content.pricing?.rent || 99;
        duration = content.pricing?.rentDuration || 48;
      } else if (type === 'early_access') {
        price = content.pricing?.earlyAccess || 299;
        duration = null;
      } else {
        price = content.pricing?.buy || 499;
        duration = null;
      }

      const tax = price * 0.18; // 18% GST
      const total = price + tax;

      // Create transaction
      const transaction = new PPVTransaction({
        viewerId,
        contentId,
        type,
        pricing: {
          base: price,
          tax,
          total,
        },
        rental: {
          duration,
          startTime: type === 'rental' ? new Date() : undefined,
          expiresAt: type === 'rental' ? new Date(Date.now() + duration * 60 * 60 * 1000) : undefined,
        },
        status: 'pending',
      });

      // Process payment
      const paymentResult = await this.processPayment(viewerId, total, 'INR', {
        type: 'ppv',
        contentId,
        purchaseType: type,
      });

      if (paymentResult.success) {
        await transaction.activate();
      }

      await transaction.save();

      logger.info('PPV transaction created', { viewerId, contentId, type, amount: total });

      return {
        success: paymentResult.success,
        transaction,
      };
    } catch (error) {
      logger.error('PPV purchase failed', { viewerId, contentId, type, error: error.message });
      throw error;
    }
  }

  /**
   * Check if viewer has access to content
   */
  async hasAccess(viewerId, contentId) {
    try {
      const Viewer = require('../models/Viewer');
      const Subscription = require('../models/Subscription');
      const PPVTransaction = require('../models/PPV');

      // Check subscription
      const subscription = await Subscription.findOne({
        viewerId,
        status: 'active',
        endDate: { $gt: new Date() },
      });

      if (subscription) {
        // Check if content is available on their plan
        const Plan = require('../models/Plan');
        const plan = await Plan.findOne({ type: subscription.plan.type });
        if (plan?.contentAccess?.allContent) {
          return { hasAccess: true, type: 'subscription', plan: subscription.plan.type };
        }
      }

      // Check PPV purchase
      const ppv = await PPVTransaction.findOne({
        viewerId,
        contentId,
        type: 'purchase',
        status: 'active',
      });

      if (ppv) {
        return { hasAccess: true, type: 'ppv_purchase' };
      }

      // Check PPV rental
      const rental = await PPVTransaction.findOne({
        viewerId,
        contentId,
        type: 'rental',
        status: 'active',
        'rental.expiresAt': { $gt: new Date() },
      });

      if (rental) {
        return {
          hasAccess: true,
          type: 'ppv_rental',
          expiresAt: rental.rental.expiresAt,
        };
      }

      // Check free content
      const Content = require('../models/Content');
      const content = await Content.findById(contentId);
      if (content?.rights?.monetizationTypes?.includes('free')) {
        return { hasAccess: true, type: 'free' };
      }

      return { hasAccess: false };
    } catch (error) {
      logger.error('Access check failed', { viewerId, contentId, error: error.message });
      return { hasAccess: false, error: error.message };
    }
  }

  // ============================================
  // ADVERTISING OPERATIONS (AdBazaar Integration)
  // ============================================

  /**
   * Get targeted ad for viewer
   */
  async getAdForViewer(viewerId, contentId, slotDetails) {
    try {
      // Get viewer data for targeting
      const Viewer = require('../models/Viewer');
      const viewer = await Viewer.findById(viewerId);

      if (!viewer) {
        return { ad: null, reason: 'Viewer not found' };
      }

      // Get content data
      const Content = require('../models/Content');
      const content = await Content.findById(contentId);

      // Query AdBazaar DSP
      const adResponse = await this.queryAdBazaar({
        viewer: {
          segments: viewer.segments || [],
          demographics: {
            age: viewer.profile?.age,
            gender: viewer.profile?.gender,
            location: viewer.location,
          },
        },
        content: {
          genres: content?.genres || [],
          type: content?.type,
          rating: content?.rating,
        },
        slot: slotDetails,
      });

      return adResponse;
    } catch (error) {
      logger.error('Ad selection failed', { viewerId, contentId, error: error.message });

      // Return fallback ad
      return {
        ad: {
          id: 'fallback',
          type: 'house_ads',
          creative: 'https://cdn.rtmn.in/ads/house-default.jpg',
          targetUrl: 'https://rtmn.vercel.app',
        },
        fallback: true,
      };
    }
  }

  /**
   * Query AdBazaar DSP
   */
  async queryAdBazaar(targeting) {
    try {
      const response = await this.adbazaarClient.post('/api/ads/targeted', {
        viewerTwin: targeting.viewer?.segments?.[0],
        demographics: targeting.viewer?.demographics,
        contentCategories: targeting.content?.genres,
        slot: targeting.slot,
      });

      return {
        ad: response.data.ad,
        campaignId: response.data.campaignId,
      };
    } catch (error) {
      logger.warn('AdBazaar query failed, using fallback', { error: error.message });
      return { ad: null, reason: 'ad_server_unavailable' };
    }
  }

  /**
   * Track ad impression
   */
  async trackImpression(campaignId, viewerId, contentId, slotId) {
    try {
      // Update campaign stats
      const Campaign = require('../models/Campaign');
      await Campaign.findByIdAndUpdate(campaignId, {
        $inc: { 'performance.impressions': 1 },
      });

      // Track via AdBazaar
      await rtmnService.trackConversion({
        type: 'impression',
        campaignId,
        viewerId,
        contentId,
        slotId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Impression tracking failed', { campaignId, error: error.message });
      return { success: false };
    }
  }

  /**
   * Track ad click
   */
  async trackClick(campaignId, viewerId, contentId) {
    try {
      const Campaign = require('../models/Campaign');
      const campaign = await Campaign.findById(campaignId);

      if (campaign) {
        campaign.performance.clicks += 1;
        campaign.performance.ctr = (campaign.performance.clicks / campaign.performance.impressions) * 100;
        await campaign.save();
      }

      await rtmnService.trackConversion({
        type: 'click',
        campaignId,
        viewerId,
        contentId,
      });

      return { success: true };
    } catch (error) {
      logger.error('Click tracking failed', { campaignId, error: error.message });
      return { success: false };
    }
  }

  // ============================================
  // REVENUE OPERATIONS
  // ============================================

  /**
   * Get revenue dashboard
   */
  async getRevenueDashboard(period = 'monthly') {
    try {
      const Revenue = require('../models/Revenue');

      const currentPeriod = await Revenue.getCurrentPeriod(period);
      const trend = await Revenue.getTrend(period, 6);

      return {
        current: currentPeriod || {},
        trend: trend?.[0] || {},
        period,
      };
    } catch (error) {
      logger.error('Revenue dashboard failed', { error: error.message });
      return { error: error.message };
    }
  }

  /**
   * Calculate revenue share for content
   */
  async calculateRevenueShare(contentId, revenueData) {
    try {
      const License = require('../models/License');

      // Get active licenses
      const licenses = await License.find({
        contentId,
        status: 'active',
      });

      if (!licenses.length) {
        return {
          platform: 100,
          contentOwner: 0,
          breakdown: [],
        };
      }

      // Calculate share
      const breakdown = [];
      let contentOwnerShare = 0;

      for (const license of licenses) {
        const share = await license.calculateRoyalty(revenueData.total, 'svod');
        contentOwnerShare += share;
        breakdown.push({
          licenseId: license._id,
          rightsHolder: license.licensor.name,
          share: share,
        });
      }

      const platformShare = revenueData.total - contentOwnerShare;

      return {
        total: revenueData.total,
        platform: platformShare,
        contentOwner: contentOwnerShare,
        breakdown,
      };
    } catch (error) {
      logger.error('Revenue share calculation failed', { contentId, error: error.message });
      throw error;
    }
  }
}

// Export singleton
const monetizationService = new MonetizationService();

module.exports = monetizationService;
