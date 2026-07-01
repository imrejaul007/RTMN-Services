/**
 * IntelligenceOS - Marketing Intelligence & Predictive AI
 * Phase 5: Churn Prediction, LTV Prediction, Conversion, Next Best Action, Trend Detection
 * Date: July 2, 2026
 */

const rtmnHub = require('../services/RTMNMarketingHub');
const logger = require('../config/logger');

class IntelligenceOS {
  constructor() {
    // Default thresholds
    this.THRESHOLDS = {
      churn: { high: 0.7, medium: 0.4, low: 0.2 },
      conversion: { high: 0.7, medium: 0.4, low: 0.2 },
      engagement: { high: 0.6, medium: 0.3, low: 0.1 }
    };
  }

  // ========================================
  // CHURN PREDICTION
  // ========================================

  /**
   * Predict customer churn probability
   * Uses rule-based scoring (can be replaced with ML model)
   */
  async predictChurn(customerId) {
    try {
      const features = await this.extractChurnFeatures(customerId);
      const score = this.calculateChurnScore(features);

      return {
        success: true,
        data: {
          customerId,
          churnProbability: score.probability,
          riskLevel: score.level,
          factors: score.factors,
          recommendedAction: this.getChurnAction(score),
          features
        }
      };
    } catch (error) {
      logger.error('IntelligenceOS.predictChurn error:', error);
      return { success: false, error: error.message };
    }
  }

  async extractChurnFeatures(customerId) {
    // Get data from various sources
    const [customer, orders, interactions, cdpData] = await Promise.allSettled([
      rtmnHub.getCustomerProfile({ customerId }),
      this.getCustomerOrders(customerId),
      this.getCustomerInteractions(customerId),
      rtmnHub.getCDPAudienceInsights(customerId)
    ]);

    const customerData = customer.status === 'fulfilled' ? customer.value : {};
    const orderData = orders.status === 'fulfilled' ? orders.value : [];
    const interactionData = interactions.status === 'fulfilled' ? interactions.value : {};

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000);

    const lastOrder = orderData[0];
    const recentOrders = orderData.filter(o => new Date(o.createdAt) > thirtyDaysAgo);
    const oldOrders = orderData.filter(o => new Date(o.createdAt) <= sixtyDaysAgo);

    return {
      daysSinceLastOrder: lastOrder
        ? Math.floor((now - new Date(lastOrder.createdAt)) / (1000 * 60 * 60 * 24))
        : 999,
      orderFrequency: orderData.length > 0
        ? orderData.length / Math.max(1, Math.floor((now - new Date(orderData[orderData.length - 1]?.createdAt || now)) / (1000 * 60 * 60 * 24 * 30)))
        : 0,
      avgOrderValue: orderData.length > 0
        ? orderData.reduce((sum, o) => sum + (o.total || 0), 0) / orderData.length
        : 0,
      recentOrderCount: recentOrders.length,
      supportTickets: interactionData.supportTickets || 0,
      emailOpenRate: interactionData.emailOpenRate || 0,
      websiteVisits: interactionData.websiteVisits || 0,
      engagementScore: interactionData.engagementScore || 0,
      sessionCount: interactionData.sessionCount || 0,
      totalRevenue: orderData.reduce((sum, o) => sum + (o.total || 0), 0),
      orderCount: orderData.length
    };
  }

  calculateChurnScore(features) {
    let score = 0;
    const factors = [];

    // Recency (30%) - Most important
    if (features.daysSinceLastOrder > 90) {
      score += 30;
      factors.push({ factor: 'No order in 90+ days', impact: 30, weight: 0.3 });
    } else if (features.daysSinceLastOrder > 60) {
      score += 20;
      factors.push({ factor: 'No order in 60+ days', impact: 20, weight: 0.3 });
    } else if (features.daysSinceLastOrder > 30) {
      score += 10;
      factors.push({ factor: 'No order in 30+ days', impact: 10, weight: 0.3 });
    }

    // Frequency (20%)
    if (features.orderFrequency < 0.25) {
      score += 20;
      factors.push({ factor: 'Very low order frequency', impact: 20, weight: 0.2 });
    } else if (features.orderFrequency < 0.5) {
      score += 10;
      factors.push({ factor: 'Low order frequency', impact: 10, weight: 0.2 });
    }

    // Engagement (20%)
    if (features.engagementScore < 0.1) {
      score += 20;
      factors.push({ factor: 'Very low engagement', impact: 20, weight: 0.2 });
    } else if (features.engagementScore < 0.3) {
      score += 10;
      factors.push({ factor: 'Low engagement', impact: 10, weight: 0.2 });
    }

    // Support (15%)
    if (features.supportTickets > 5) {
      score += 15;
      factors.push({ factor: 'High support ticket volume', impact: 15, weight: 0.15 });
    } else if (features.supportTickets > 2) {
      score += 8;
      factors.push({ factor: 'Moderate support tickets', impact: 8, weight: 0.15 });
    }

    // Email (15%)
    if (features.emailOpenRate < 0.1) {
      score += 15;
      factors.push({ factor: 'Not opening emails', impact: 15, weight: 0.15 });
    } else if (features.emailOpenRate < 0.3) {
      score += 8;
      factors.push({ factor: 'Low email engagement', impact: 8, weight: 0.15 });
    }

    const probability = Math.min(score / 100, 1);
    const level = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';

    return { probability, level, score, factors };
  }

  getChurnAction(score) {
    if (score.level === 'high') {
      return {
        action: 'win_back',
        channel: 'whatsapp',
        urgency: 'high',
        offer: 'exclusive_discount',
        message: 'We miss you! Here\'s 25% off your next order.'
      };
    } else if (score.level === 'medium') {
      return {
        action: 'reengage',
        channel: 'email',
        urgency: 'medium',
        offer: 'loyalty_reward',
        message: 'Check out what\'s new and earn points!'
      };
    }
    return {
      action: 'nurture',
      channel: 'email',
      urgency: 'low',
      offer: 'new_arrivals',
      message: 'Stay updated with our latest products.'
    };
  }

  // ========================================
  // CONVERSION PREDICTION
  // ========================================

  /**
   * Predict customer conversion probability
   */
  async predictConversion(customerId, productId = null) {
    try {
      const features = await this.extractConversionFeatures(customerId, productId);
      const score = this.calculateConversionScore(features);

      return {
        success: true,
        data: {
          customerId,
          productId,
          conversionProbability: score.probability,
          riskLevel: score.level,
          recommendedOffer: this.getOfferRecommendation(score),
          optimalChannel: this.getOptimalChannel(features),
          optimalTime: await this.getOptimalSendTime(customerId),
          features
        }
      };
    } catch (error) {
      logger.error('IntelligenceOS.predictConversion error:', error);
      return { success: false, error: error.message };
    }
  }

  async extractConversionFeatures(customerId, productId) {
    const [customer, orders, cdpData, intentProfile] = await Promise.allSettled([
      rtmnHub.getCustomerProfile({ customerId }),
      this.getCustomerOrders(customerId),
      rtmnHub.getCDPAudienceInsights(customerId),
      rtmnHub.getUserIntentProfile(customerId)
    ]);

    const customerData = customer.status === 'fulfilled' ? customer.value : {};
    const orderData = orders.status === 'fulfilled' ? orders.value : [];
    const intentData = intentProfile.status === 'fulfilled' ? intentProfile.value : {};

    return {
      customerId,
      productId,
      ltv: customerData.totalRevenue || 0,
      orderCount: orderData.length,
      avgOrderValue: orderData.length > 0
        ? orderData.reduce((sum, o) => sum + (o.total || 0), 0) / orderData.length
        : 0,
      intentSignals: intentData.intentSignals || [],
      browsingHistory: intentData.browsingHistory || [],
      wishlistItems: intentData.wishlistItems || 0,
      abandonedCart: intentData.abandonedCart || false,
      engagementScore: intentData.engagementScore || 0.5,
      segment: customerData.segment || 'unknown'
    };
  }

  calculateConversionScore(features) {
    let score = 0;

    // Intent signals (30%)
    if (features.intentSignals.length > 5) {
      score += 30;
    } else if (features.intentSignals.length > 2) {
      score += 20;
    } else if (features.intentSignals.length > 0) {
      score += 10;
    }

    // Browsing (20%)
    if (features.browsingHistory.length > 10) {
      score += 20;
    } else if (features.browsingHistory.length > 5) {
      score += 12;
    } else if (features.browsingHistory.length > 0) {
      score += 6;
    }

    // Engagement (20%)
    score += Math.min(features.engagementScore * 20, 20);

    // Cart activity (20%)
    if (features.abandonedCart) {
      score += 20;
    } else if (features.wishlistItems > 3) {
      score += 15;
    } else if (features.wishlistItems > 0) {
      score += 8;
    }

    // LTV (10%)
    if (features.ltv > 10000) {
      score += 10;
    } else if (features.ltv > 5000) {
      score += 6;
    } else if (features.ltv > 1000) {
      score += 3;
    }

    const probability = Math.min(score / 100, 1);
    const level = score > 70 ? 'high' : score > 40 ? 'medium' : 'low';

    return { probability, level, score };
  }

  getOfferRecommendation(score) {
    if (score.level === 'high') {
      return {
        type: 'premium_offer',
        discount: '0%',
        urgency: 'high',
        reason: 'Ready to convert - minimal incentive needed'
      };
    } else if (score.level === 'medium') {
      return {
        type: 'moderate_offer',
        discount: '10-15%',
        urgency: 'medium',
        reason: 'May need small push'
      };
    }
    return {
      type: 'aggressive_offer',
      discount: '20-25%',
      urgency: 'low',
      reason: 'Needs significant incentive'
    };
  }

  getOptimalChannel(features) {
    if (features.wishlistItems > 0 || features.abandonedCart) {
      return 'whatsapp';
    }
    if (features.engagementScore > 0.5) {
      return 'email';
    }
    if (features.orderCount < 2) {
      return 'sms';
    }
    return 'email';
  }

  // ========================================
  // NEXT BEST ACTION
  // ========================================

  /**
   * Get next best action for customer
   */
  async getNextBestAction(customerId) {
    try {
      const [churn, conversion, intent] = await Promise.allSettled([
        this.predictChurn(customerId),
        this.predictConversion(customerId),
        rtmnHub.getUserIntentProfile(customerId)
      ]);

      const churnData = churn.status === 'fulfilled' ? churn.value.data : {};
      const conversionData = conversion.status === 'fulfilled' ? conversion.value.data : {};
      const intentData = intent.status === 'fulfilled' ? intent.value : {};

      // Decision tree
      let action = this.decideAction(churnData, conversionData, intentData);

      return {
        success: true,
        data: {
          customerId,
          action,
          churnPrediction: churnData,
          conversionPrediction: conversionData,
          confidence: this.calculateConfidence(churnData, conversionData)
        }
      };
    } catch (error) {
      logger.error('IntelligenceOS.getNextBestAction error:', error);
      return { success: false, error: error.message };
    }
  }

  decideAction(churnData, conversionData, intentData) {
    // Priority 1: High churn risk
    if (churnData.churnProbability > 0.6) {
      return {
        action: 'win_back',
        priority: 1,
        channel: churnData.recommendedAction?.channel || 'whatsapp',
        message: churnData.recommendedAction?.message || 'We miss you!',
        offer: churnData.recommendedAction?.offer || 'special_discount',
        urgency: 'high'
      };
    }

    // Priority 2: High conversion potential + cart activity
    if (conversionData.conversionProbability > 0.6 && (conversionData.abandonedCart || intentData.abandonedCart)) {
      return {
        action: 'cart_recovery',
        priority: 2,
        channel: 'whatsapp',
        message: 'Complete your purchase!',
        offer: 'free_delivery',
        urgency: 'high'
      };
    }

    // Priority 3: High conversion potential
    if (conversionData.conversionProbability > 0.5) {
      return {
        action: 'convert',
        priority: 3,
        channel: conversionData.optimalChannel || 'email',
        message: 'Ready for checkout?',
        offer: conversionData.recommendedOffer?.type === 'premium_offer' ? null : conversionData.recommendedOffer?.discount,
        urgency: 'medium'
      };
    }

    // Priority 4: Upsell existing customer
    if (conversionData.orderCount > 3) {
      return {
        action: 'upsell',
        priority: 4,
        channel: 'email',
        message: 'Upgrade to premium',
        offer: 'premium_membership',
        urgency: 'low'
      };
    }

    // Default: Nurture
    return {
      action: 'nurture',
      priority: 5,
      channel: 'email',
      message: 'Check out new arrivals',
      offer: null,
      urgency: 'low'
    };
  }

  calculateConfidence(churnData, conversionData) {
    let confidence = 0.5;

    if (churnData.churnProbability !== undefined) confidence += 0.1;
    if (conversionData.conversionProbability !== undefined) confidence += 0.1;

    return Math.min(confidence, 1);
  }

  // ========================================
  // TREND DETECTION
  // ========================================

  /**
   * Detect trending topics and patterns
   */
  async detectTrends(params = {}) {
    try {
      const { category, location, period = 7 } = params;

      // Get data from various sources
      const [socialAnalytics, attribution, growthMetrics] = await Promise.allSettled([
        rtmnHub.getSocialAnalytics({ period }),
        rtmnHub.getAttributionReport({ period }),
        rtmnHub.getGrowthMetrics()
      ]);

      const trends = {
        rising: [],
        falling: [],
        stable: []
      };

      // Process social trends
      if (socialAnalytics.status === 'fulfilled' && socialAnalytics.value.data) {
        const social = socialAnalytics.value.data;
        if (social.topHashtags) {
          social.topHashtags.forEach(tag => {
            if (tag.growth > 50) {
              trends.rising.push({ type: 'hashtag', ...tag });
            } else if (tag.growth < -20) {
              trends.falling.push({ type: 'hashtag', ...tag });
            }
          });
        }
      }

      // Process attribution trends
      if (attribution.status === 'fulfilled' && attribution.value.data) {
        const data = attribution.value.data;
        if (data.topChannels) {
          data.topChannels.forEach(channel => {
            if (channel.growth > 30) {
              trends.rising.push({ type: 'channel', ...channel });
            } else if (channel.growth < -20) {
              trends.falling.push({ type: 'channel', ...channel });
            }
          });
        }
      }

      return {
        success: true,
        data: {
          trends,
          detectedAt: new Date().toISOString(),
          period,
          recommendations: this.generateTrendRecommendations(trends)
        }
      };
    } catch (error) {
      logger.error('IntelligenceOS.detectTrends error:', error);
      return { success: false, error: error.message };
    }
  }

  generateTrendRecommendations(trends) {
    const recommendations = [];

    if (trends.rising.length > 0) {
      recommendations.push({
        type: 'capitalize',
        priority: 'high',
        message: `${trends.rising.length} rising trends detected`,
        actions: trends.rising.slice(0, 3).map(t => ({
          type: t.type,
          name: t.name || t.hashtag,
          action: 'Create content around this trend'
        }))
      });
    }

    if (trends.falling.length > 0) {
      recommendations.push({
        type: 'avoid',
        priority: 'medium',
        message: `${trends.falling.length} declining trends detected`,
        actions: trends.falling.slice(0, 2).map(t => ({
          type: t.type,
          name: t.name || t.hashtag,
          action: 'Pause investment in this trend'
        }))
      });
    }

    return recommendations;
  }

  // ========================================
  // SEGMENT ANALYSIS
  // ========================================

  /**
   * Analyze customer segments
   */
  async analyzeSegments() {
    try {
      const segments = await this.getSegments();

      const analysis = await Promise.all(
        segments.map(async (segment) => {
          const metrics = await this.getSegmentMetrics(segment.id);
          return {
            ...segment,
            metrics,
            health: this.calculateSegmentHealth(metrics),
            recommendations: this.getSegmentRecommendations(segment, metrics)
          };
        })
      );

      return {
        success: true,
        data: {
          segments: analysis,
          summary: this.getSegmentSummary(analysis),
          actionItems: this.getSegmentActionItems(analysis)
        }
      };
    } catch (error) {
      logger.error('IntelligenceOS.analyzeSegments error:', error);
      return { success: false, error: error.message };
    }
  }

  async getSegments() {
    return [
      { id: 'champions', name: 'Champions', description: 'High value, highly engaged' },
      { id: 'loyal', name: 'Loyal', description: 'Consistent buyers' },
      { id: 'potential', name: 'Potential', description: 'Showing interest' },
      { id: 'at_risk', name: 'At Risk', description: 'Declining engagement' },
      { id: 'churned', name: 'Churned', description: 'Inactive for 90+ days' }
    ];
  }

  async getSegmentMetrics(segmentId) {
    // Placeholder - would connect to real data
    return {
      count: Math.floor(Math.random() * 10000),
      avgLTV: Math.floor(Math.random() * 50000),
      avgFrequency: Math.floor(Math.random() * 12),
      churnRate: Math.random() * 0.3,
      revenue: Math.floor(Math.random() * 1000000)
    };
  }

  calculateSegmentHealth(metrics) {
    if (metrics.churnRate < 0.1 && metrics.avgFrequency > 6) return 'healthy';
    if (metrics.churnRate < 0.2) return 'moderate';
    return 'at_risk';
  }

  getSegmentRecommendations(segment, metrics) {
    const recommendations = [];

    if (segment.id === 'champions') {
      recommendations.push('Create referral program', 'Offer VIP experiences');
    }
    if (segment.id === 'at_risk') {
      recommendations.push('Launch win-back campaign', 'Personalized offers');
    }
    if (segment.id === 'potential') {
      recommendations.push('Increase engagement', 'Targeted promotions');
    }

    return recommendations;
  }

  getSegmentSummary(analysis) {
    const total = analysis.reduce((sum, s) => sum + s.metrics.count, 0);
    const revenue = analysis.reduce((sum, s) => sum + s.metrics.revenue, 0);

    return {
      totalCustomers: total,
      totalRevenue: revenue,
      avgRevenuePerCustomer: total > 0 ? revenue / total : 0,
      healthySegments: analysis.filter(s => s.health === 'healthy').length,
      atRiskSegments: analysis.filter(s => s.health === 'at_risk').length
    };
  }

  getSegmentActionItems(analysis) {
    const items = [];

    analysis.filter(s => s.health === 'at_risk').forEach(segment => {
      items.push({
        priority: 'high',
        segment: segment.name,
        action: 'Immediate intervention required',
        reason: `High churn risk: ${(segment.metrics.churnRate * 100).toFixed(1)}%`
      });
    });

    return items;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  async getCustomerOrders(customerId) {
    // Placeholder - would connect to order service
    return [];
  }

  async getCustomerInteractions(customerId) {
    // Placeholder - would connect to engagement service
    return {
      supportTickets: 0,
      emailOpenRate: 0.5,
      websiteVisits: 5,
      engagementScore: 0.5,
      sessionCount: 3
    };
  }

  async getOptimalSendTime(customerId) {
    // Default optimal times based on historical data
    return {
      day: 'Tuesday',
      time: '10:00 AM',
      timezone: 'IST'
    };
  }

  /**
   * Batch predict churn for segment
   */
  async batchPredictChurn(customerIds) {
    const results = await Promise.allSettled(
      customerIds.map(id => this.predictChurn(id))
    );

    const predictions = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value.data);

    const highRisk = predictions.filter(p => p.riskLevel === 'high').length;
    const mediumRisk = predictions.filter(p => p.riskLevel === 'medium').length;
    const lowRisk = predictions.filter(p => p.riskLevel === 'low').length;

    return {
      success: true,
      data: {
        total: predictions.length,
        highRisk,
        mediumRisk,
        lowRisk,
        predictions
      }
    };
  }
}

// Export singleton
const intelligenceOS = new IntelligenceOS();
module.exports = intelligenceOS;
