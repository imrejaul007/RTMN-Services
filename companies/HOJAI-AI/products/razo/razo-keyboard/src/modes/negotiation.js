/**
 * Negotiation Mode - Get the Best Deal
 *
 * Consumer Label: 💰 Best Deal
 * Advanced Label: 🤝 Negotiation Mode
 *
 * Powered by SUTAR Negotiation Engine
 * Helps users:
 * - Bargain with sellers
 * - Counter-offer with confidence
 * - Know fair prices
 * - Handle rejection gracefully
 */

const axios = require('axios');

class NegotiationMode {
  constructor(logger, config = {}) {
    this.logger = logger;
    this.config = {
      // Service URLs
      sutarGateway: config.sutarGateway || process.env.SUTAR_GATEWAY_URL || 'http://localhost:4140',
      twinOS: config.twinOS || process.env.TWIN_OS_URL || 'http://localhost:4705',
      discoveryOS: config.discoveryOS || process.env.DISCOVERY_OS_URL || 'http://localhost:4272',

      // Negotiation settings
      maxRounds: config.maxRounds || 5,
      defaultDiscountPercent: config.defaultDiscountPercent || 15,
      ...config
    };

    this.stats = {
      totalNegotiations: 0,
      successfulDeals: 0,
      averageDiscount: 0,
      byCategory: {}
    };

    // Track ongoing negotiations
    this.activeNegotiations = new Map();
  }

  /**
   * Get negotiation mode UI configuration
   */
  getUIConfig() {
    return {
      id: 'negotiation_mode',
      consumer: {
        icon: '💰',
        label: 'Best Deal',
        tagline: 'Get the fair price'
      },
      advanced: {
        icon: '🤝',
        label: 'Negotiation Mode',
        tagline: 'SUTAR-powered counter-offers'
      },
      categories: [
        { id: 'retail', icon: '🛒', label: 'Retail', examples: ['clothes', 'electronics', 'home'] },
        { id: 'food', icon: '🍔', label: 'Food', examples: ['restaurant', 'street food', 'delivery'] },
        { id: 'transport', icon: '🚕', label: 'Transport', examples: ['auto', 'taxi', 'rental'] },
        { id: 'services', icon: '🔧', label: 'Services', examples: ['repair', 'cleaning', 'delivery'] },
        { id: 'rentals', icon: '🏠', label: 'Rentals', examples: ['house', 'car', 'equipment'] },
        { id: 'other', icon: '📦', label: 'Other', examples: ['general', 'misc'] }
      ],
      tactics: [
        { id: 'walk_away', icon: '🚶', label: 'Walk Away', description: 'Show you\'re ready to leave' },
        { id: 'competing_offers', icon: '📋', label: 'Competing Offers', description: 'Mention other sellers' },
        { id: 'bulk_discount', icon: '📦', label: 'Bulk Discount', description: 'Offer to buy more for less' },
        { id: 'cash_discount', icon: '💵', label: 'Cash Discount', description: 'Offer cash payment for discount' },
        { id: 'patience', icon: '⏰', label: 'Patience', description: 'Wait for better timing' },
        { id: 'flattery', icon: '😊', label: 'Build Rapport', description: 'Be friendly first' }
      ]
    };
  }

  /**
   * Start a new negotiation
   */
  async startNegotiation({ userId, sellerPrice, item, category, context = {} }) {
    this.stats.totalNegotiations++;

    this.logger.info('Starting negotiation', { userId, item, sellerPrice });

    // Get fair price from discovery
    const fairPrice = await this._getFairPrice(item, category);

    // Calculate initial offer
    const initialOffer = Math.round(sellerPrice * (1 - this.config.defaultDiscountPercent / 100));

    // Create negotiation session
    const negotiationId = `neg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const negotiation = {
      id: negotiationId,
      userId,
      item,
      category,
      sellerPrice,
      fairPrice,
      currentOffer: initialOffer,
      targetPrice: fairPrice,
      counterOffers: [],
      round: 1,
      status: 'active',
      startedAt: new Date().toISOString()
    };

    this.activeNegotiations.set(negotiationId, negotiation);

    // Track by category
    this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;

    return {
      success: true,
      negotiationId,
      currentOffer: initialOffer,
      sellerPrice,
      fairPrice,
      targetSavings: Math.round(((sellerPrice - fairPrice) / sellerPrice) * 100),
      recommendedTactics: this._getRecommendedTactics(sellerPrice, fairPrice),
      tips: this._getTips(category),
      round: 1,
      maxRounds: this.config.maxRounds
    };
  }

  /**
   * Counter-offer
   */
  async counterOffer({ negotiationId, yourOffer, message, tactic }) {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return { success: false, error: 'Negotiation not found' };
    }

    if (negotiation.round >= this.config.maxRounds) {
      negotiation.status = 'exhausted';
      return {
        success: false,
        error: 'Max rounds reached',
        recommendation: this._getFinalRecommendation(negotiation)
      };
    }

    negotiation.round++;
    negotiation.currentOffer = yourOffer;
    negotiation.counterOffers.push({ offer: yourOffer, message, tactic, round: negotiation.round });

    this.logger.info('Counter offer made', { negotiationId, offer: yourOffer, round: negotiation.round });

    // Simulate seller response (in real implementation, this would be via chat)
    const sellerResponse = await this._simulateSellerResponse(negotiation, yourOffer);

    if (sellerResponse.accepted) {
      negotiation.status = 'agreed';
      this.stats.successfulDeals++;
      const discount = Math.round(((negotiation.sellerPrice - yourOffer) / negotiation.sellerPrice) * 100);
      this.stats.averageDiscount = (this.stats.averageDiscount + discount) / 2;

      return {
        success: true,
        status: 'agreed',
        finalPrice: yourOffer,
        discountPercent: discount,
        message: sellerResponse.message,
        celebration: this._getCelebration()
      };
    }

    if (sellerResponse.rejected) {
      negotiation.status = 'rejected';
      return {
        success: false,
        status: 'rejected',
        message: sellerResponse.message,
        recommendation: this._getFinalRecommendation(negotiation),
        alternatives: await this._getAlternatives(negotiation)
      };
    }

    // Counter from seller
    negotiation.sellerCounterOffer = sellerResponse.counterOffer;

    return {
      success: true,
      status: 'countered',
      sellerCounterOffer: sellerResponse.counterOffer,
      recommendedResponse: this._getRecommendedCounterResponse(negotiation, sellerResponse.counterOffer),
      tips: this._getTips(negotiation.category),
      round: negotiation.round,
      maxRounds: this.config.maxRounds
    };
  }

  /**
   * Accept current offer
   */
  acceptOffer({ negotiationId }) {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return { success: false, error: 'Negotiation not found' };
    }

    negotiation.status = 'agreed';
    const finalPrice = negotiation.sellerCounterOffer || negotiation.currentOffer;
    const discount = Math.round(((negotiation.sellerPrice - finalPrice) / negotiation.sellerPrice) * 100);

    this.stats.successfulDeals++;
    this.stats.averageDiscount = (this.stats.averageDiscount + discount) / 2;

    this.logger.info('Offer accepted', { negotiationId, finalPrice, discount });

    return {
      success: true,
      status: 'agreed',
      finalPrice,
      originalPrice: negotiation.sellerPrice,
      discountPercent: discount,
      celebration: this._getCelebration()
    };
  }

  /**
   * Walk away from negotiation
   */
  walkAway({ negotiationId }) {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return { success: false, error: 'Negotiation not found' };
    }

    negotiation.status = 'walked_away';

    return {
      success: true,
      status: 'walked_away',
      message: 'Sometimes walking away is the best negotiation tactic!',
      alternatives: this._getAlternatives(negotiation),
      tip: 'Wait a few minutes - sellers often call back with a better price'
    };
  }

  /**
   * Get negotiation status
   */
  getStatus(negotiationId) {
    const negotiation = this.activeNegotiations.get(negotiationId);
    if (!negotiation) {
      return { success: false, error: 'Negotiation not found' };
    }

    return {
      success: true,
      negotiation,
      progress: {
        round: negotiation.round,
        maxRounds: this.config.maxRounds,
        percentComplete: Math.round((negotiation.round / this.config.maxRounds) * 100)
      }
    };
  }

  /**
   * Get stats
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.totalNegotiations > 0
        ? Math.round((this.stats.successfulDeals / this.stats.totalNegotiations) * 100)
        : 0
    };
  }

  // ── Private Methods ───────────────────────────────────────────────────

  async _getFairPrice(item, category) {
    try {
      // Try DiscoveryOS for market prices
      const response = await axios.get(`${this.config.discoveryOS}/api/discovery/prices`, {
        params: { item, category },
        timeout: 2000
      });
      return response.data.fairPrice || response.data.averagePrice;
    } catch (error) {
      this.logger.warn('Could not fetch fair price from DiscoveryOS', { error: error.message });
      // Fallback: estimate 70% of asking price
      return null;
    }
  }

  _getRecommendedTactics(sellerPrice, fairPrice) {
    const gap = sellerPrice - fairPrice;

    if (gap > sellerPrice * 0.3) {
      return ['walk_away', 'competing_offers', 'patience'];
    } else if (gap > sellerPrice * 0.15) {
      return ['competing_offers', 'bulk_discount', 'cash_discount'];
    } else {
      return ['flattery', 'patience', 'bulk_discount'];
    }
  }

  _getTips(category) {
    const tips = {
      retail: [
        '💡 Always start at 50-60% of asking price',
        '💡 "I saw this cheaper elsewhere" often works',
        '💡 End of day = better deals (sellers want to close'
      ],
      food: [
        '💡 " Can you add one more item?" is better than discount',
        '💡 Regular customers get better deals',
        '💡 Order combo instead of asking for discount'
      ],
      transport: [
        '💡 "I\'ll pay cash" gets 10-15% off',
        '💡 Compare 3-4 options before negotiating',
        '💡 Early morning = better rates'
      ],
      services: [
        '💡 "I\'ll refer my friends" is powerful',
        '💡 Off-peak timing gets 20% off',
        '💡 Bundle multiple services'
      ],
      rentals: [
        '💡 Longer lease = lower monthly',
        '💡 Pay upfront for 5-10% off',
        '💡 Check what\'s included/excluded'
      ],
      other: [
        '💡 Confidence is key - don\'t seem desperate',
        '💡 Know your BATNA (best alternative)',
        '💡 Always be willing to walk away'
      ]
    };
    return tips[category] || tips.other;
  }

  async _simulateSellerResponse(negotiation, offer) {
    // In production, this would integrate with actual seller chat
    // For now, simulate realistic seller behavior

    const targetPrice = negotiation.targetPrice;
    const sellerPrice = negotiation.sellerPrice;

    // Calculate how close we are to seller's acceptable range
    const acceptableRange = sellerPrice * 0.85; // Sellers usually accept 15% off
    const excellentRange = sellerPrice * 0.80; // 20% off is excellent

    if (offer <= excellentRange) {
      return {
        accepted: true,
        message: 'Okay, you drive a hard bargain! Deal!'
      };
    }

    if (offer > acceptableRange) {
      return {
        rejected: true,
        message: 'That\'s too low. Best I can do is ₹' + Math.round(acceptableRange)
      };
    }

    // Counter with reasonable reduction
    const counterOffer = Math.round((offer + acceptableRange) / 2);

    return {
      accepted: false,
      rejected: false,
      counterOffer,
      message: `How about ₹${counterOffer}? That's my best price.`
    };
  }

  _getRecommendedCounterResponse(negotiation, sellerCounterOffer) {
    const target = negotiation.targetPrice;
    const counter = sellerCounterOffer;

    if (counter <= target) {
      return {
        recommendation: 'accept',
        message: 'This is at or below fair price. Accept it!',
        autoAccept: true
      };
    }

    // Calculate next offer
    const nextOffer = Math.round((counter + target) / 2);

    return {
      recommendation: 'counter',
      suggestedOffer: nextOffer,
      message: `Counter with ₹${nextOffer}`,
      acceptIfBelow: Math.round(target * 1.1)
    };
  }

  _getFinalRecommendation(negotiation) {
    const { sellerPrice, fairPrice, sellerCounterOffer } = negotiation;

    const finalPrice = sellerCounterOffer || fairPrice;
    const savings = sellerPrice - finalPrice;
    const discountPercent = Math.round((savings / sellerPrice) * 100);

    if (discountPercent >= 15) {
      return {
        decision: 'good_deal',
        message: `This is a good deal! You saved ₹${savings} (${discountPercent}% off)`,
        shouldAccept: true
      };
    }

    if (discountPercent >= 10) {
      return {
        decision: 'fair_deal',
        message: `This is a fair price. You saved ₹${savings} (${discountPercent}% off)`,
        shouldAccept: true
      };
    }

    return {
      decision: 'not_great',
      message: 'You might find better deals elsewhere. Keep looking!',
      shouldAccept: false
    };
  }

  async _getAlternatives(negotiation) {
    try {
      // Get similar items from DiscoveryOS
      const response = await axios.get(`${this.config.discoveryOS}/api/discovery/alternatives`, {
        params: {
          item: negotiation.item,
          category: negotiation.category,
          maxPrice: negotiation.sellerPrice * 0.9
        },
        timeout: 2000
      });
      return response.data.alternatives || [];
    } catch (error) {
      return [
        { message: 'Check nearby markets for price comparison' },
        { message: 'Try bargaining at different times of day' }
      ];
    }
  }

  _getCelebration() {
    const celebrations = [
      '🎉 Great deal! You saved money!',
      '🏆 Expert negotiator right there!',
      '💪 You drive a hard bargain!',
      '🎊 Smart shopping!',
      '⭐ Best deal of the day!'
    ];
    return celebrations[Math.floor(Math.random() * celebrations.length)];
  }
}

module.exports = NegotiationMode;
