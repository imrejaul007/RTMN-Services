import {
  PlatformOptimizationRequest,
  PlatformOptimizationResponse,
  PlatformListing,
  PlatformMetrics,
} from '../types';

/**
 * Platform Optimizer Service
 * Optimizes restaurant presence on Zomato and Swiggy
 */
export class PlatformOptimizerService {
  private readonly PLATFORM_COMMISSION = {
    zomato: 0.22,  // 22% average
    swiggy: 0.21,  // 21% average
  };

  private readonly DELIVERY_TIME_TARGETS = {
    zomato: 35,    // minutes
    swiggy: 37,    // minutes
  };

  /**
   * Optimize restaurant presence on food delivery platforms
   */
  async optimize(request: PlatformOptimizationRequest): Promise<PlatformOptimizationResponse> {
    // Get relevant listings and metrics
    const listings = request.platform === 'both'
      ? request.listings
      : request.listings.filter(l => l.platform === request.platform);

    const metrics = request.platform === 'both'
      ? request.metrics
      : request.metrics.filter(m => m.platform === request.platform);

    // Generate optimizations
    const profileOptimization = this.optimizeProfile(listings, metrics);
    const menuOptimization = this.optimizeMenu(request.menuItems, listings, metrics);
    const operationalOptimization = this.optimizeOperations(listings, metrics);
    const reviewStrategy = this.developReviewStrategy(metrics);
    const commissionOptimization = this.optimizeCommissions(metrics);

    // Generate prioritized recommendations
    const recommendations = this.generateRecommendations(
      profileOptimization,
      menuOptimization,
      operationalOptimization,
      reviewStrategy,
      commissionOptimization
    );

    return {
      profileOptimization,
      menuOptimization,
      operationalOptimization,
      reviewStrategy,
      commissionOptimization,
      recommendations,
    };
  }

  /**
   * Optimize restaurant profile
   */
  private optimizeProfile(
    listings: PlatformListing[],
    metrics: PlatformMetrics[]
  ): PlatformOptimizationResponse['profileOptimization'] {
    const avgRating = metrics.reduce((sum, m) => sum + m.avgRating, 0) / metrics.length;

    // Photo optimization
    const photoQuality = this.analyzePhotoQuality(listings);
    const photoRecommendation = avgRating >= 4.0
      ? 'Maintain current photo quality with regular updates'
      : 'Add more high-quality photos: 5 food shots, 3 ambiance, 2 team/staff';

    // Description optimization
    const descriptionScore = this.analyzeDescription(listings);
    const descriptionRecommendation = avgRating >= 4.0
      ? 'Description is performing well'
      : 'Add unique selling points, cuisine story, and chef highlights';

    // Badge optimization
    const badges = this.suggestBadges(listings, avgRating);

    return {
      photoQuality: { score: photoQuality, recommendation: photoRecommendation },
      description: { score: descriptionScore, recommendation: descriptionRecommendation },
      badges,
    };
  }

  /**
   * Analyze photo quality based on count and variety
   */
  private analyzePhotoQuality(listings: PlatformListing[]): number {
    let totalScore = 0;
    let count = 0;

    for (const listing of listings) {
      const photoCount = listing.photos?.length || 0;
      let score = 0;

      if (photoCount >= 10) score = 100;
      else if (photoCount >= 7) score = 80;
      else if (photoCount >= 5) score = 60;
      else if (photoCount >= 3) score = 40;
      else score = 20;

      totalScore += score;
      count++;
    }

    return count > 0 ? totalScore / count : 0;
  }

  /**
   * Analyze description quality
   */
  private analyzeDescription(listings: PlatformListing[]): number {
    // Simple heuristic based on listing completeness
    const avgItems = listings.reduce((sum, l) => sum + (l.menuItems?.length || 0), 0) / listings.length;

    if (avgItems >= 30) return 90;
    if (avgItems >= 20) return 75;
    if (avgItems >= 10) return 60;
    return 40;
  }

  /**
   * Suggest relevant badges to pursue
   */
  private suggestBadges(
    listings: PlatformListing[],
    avgRating: number
  ): { current: string[]; recommended: string[]; reason: string } {
    const currentBadges: string[] = [];

    // Determine recommended badges based on performance
    const recommended: string[] = [];

    if (avgRating >= 4.2) {
      recommended.push('Pure Veg', 'Best in [Cuisine]');
    }
    if (avgRating >= 4.0) {
      recommended.push('Order Again', 'Most Loved');
    }
    if (avgRating >= 3.8) {
      recommended.push('Fast Delivery', 'Quality Food');
    }

    // Always recommend
    recommended.push('Bestseller', 'Cost Effective');

    return {
      current: currentBadges,
      recommended: [...new Set(recommended)],
      reason: avgRating >= 4.0
        ? 'Your rating qualifies for premium badges'
        : 'Focus on improving rating to 4.0+ to unlock badges',
    };
  }

  /**
   * Optimize menu for platform success
   */
  private optimizeMenu(
    menuItems: { id: string; name: string; category: string; price: number; popularity?: number }[],
    listings: PlatformListing[],
    metrics: PlatformMetrics[]
  ): PlatformOptimizationResponse['menuOptimization'] {
    // Find spotlight items (high popularity + good margin)
    const sortedByPopularity = [...menuItems].sort((a, b) =>
      (b.popularity || 50) - (a.popularity || 50)
    );

    const spotlightItems = sortedByPopularity.slice(0, 5).map(item => ({
      itemId: item.id,
      name: item.name,
      reason: `${item.popularity || 50}% popularity in ${item.category}`,
      action: 'Feature prominently and ensure 100% availability',
    }));

    // Pricing strategy
    const avgPrice = menuItems.reduce((sum, m) => sum + m.price, 0) / menuItems.length;
    const pricingStrategy = this.developPricingStrategy(menuItems, avgPrice, metrics);

    // Packaging recommendations
    const packagingCharge = listings.reduce((sum, l) => sum + l.packagingCharge, 0) / listings.length;
    const packagingRecommendation = packagingCharge > 20
      ? 'Consider reducing packaging charge to improve conversion'
      : 'Packaging charge is competitive';

    return {
      spotlightItems,
      pricingStrategy,
      packagingRecommendation: {
        charge: packagingCharge,
        suggestion: packagingRecommendation,
      },
    };
  }

  /**
   * Develop platform-specific pricing strategy
   */
  private developPricingStrategy(
    menuItems: { id: string; name: string; price: number }[],
    avgPrice: number,
    metrics: PlatformMetrics[]
  ): { approach: string; rationale: string; expectedImpact: number } {
    const avgAOV = metrics.reduce((sum, m) => sum + m.avgOrderValue, 0) / metrics.length;

    // Compare platform AOV to overall
    if (avgAOV > avgPrice * 1.2) {
      return {
        approach: 'Bundle & Combo Strategy',
        rationale: 'Your AOV is higher than menu avg - customers are already buying combos. Promote value combos.',
        expectedImpact: 15,
      };
    }

    if (avgAOV < avgPrice * 0.8) {
      return {
        approach: 'Value Tier Introduction',
        rationale: 'AOV is lower than expected. Introduce ₹99-199 value items to increase basket size.',
        expectedImpact: 20,
      };
    }

    return {
      approach: 'Balanced Pricing',
      rationale: 'AOV is aligned with menu pricing. Focus on upselling and cross-selling.',
      expectedImpact: 10,
    };
  }

  /**
   * Optimize operational aspects
   */
  private optimizeOperations(
    listings: PlatformListing[],
    metrics: PlatformMetrics[]
  ): PlatformOptimizationResponse['operationalOptimization'] {
    // Delivery time optimization
    const avgDeliveryTime = listings.reduce((sum, l) => sum + l.deliveryTime, 0) / listings.length;
    const targetTime = listings[0]?.platform === 'zomato' ? 35 : 37;

    const deliveryRecommendations: string[] = [];
    if (avgDeliveryTime > targetTime + 10) {
      deliveryRecommendations.push('Partner with multiple delivery executives');
      deliveryRecommendations.push('Implement prep-ahead for expected orders');
      deliveryRecommendations.push('Optimize kitchen workflow for platform orders');
    }
    if (avgDeliveryTime > targetTime + 5) {
      deliveryRecommendations.push('Add buffer time to estimated delivery');
    }

    // Availability optimization
    const unavailableItems = listings.flatMap(l =>
      l.menuItems.filter(m => !m.available).map(m => m.name)
    );
    const availableItems = listings.flatMap(l =>
      l.menuItems.filter(m => m.available).map(m => m.name)
    );

    return {
      deliveryTime: {
        current: Math.round(avgDeliveryTime),
        target: targetTime,
        recommendations: deliveryRecommendations,
      },
      availability: {
        itemsToEnable: availableItems.filter((_, i) => i % 3 === 0), // Suggest enabling some
        itemsToDisable: unavailableItems.slice(0, 3), // Suggest disabling consistently unavailable
      },
      busyHours: this.developBusyHoursStrategy(),
    };
  }

  /**
   * Develop strategy for busy hours
   */
  private developBusyHoursStrategy(): { strategy: string; items: { itemId: string; name: string; discount?: number }[] } {
    return {
      strategy: 'Offer 10-15% off during off-peak hours (2PM-5PM, 9PM-11PM) to balance demand',
      items: [], // Would populate based on actual data
    };
  }

  /**
   * Develop review strategy for platforms
   */
  private developReviewStrategy(metrics: PlatformMetrics[]): PlatformOptimizationResponse['reviewStrategy'] {
    const avgRating = metrics.reduce((sum, m) => sum + m.avgRating, 0) / metrics.length;
    const totalReviews = metrics.reduce((sum, m) => sum + m.reviewCount, 0);

    // Calculate reviews needed for target rating
    const targetRating = 4.5;
    const reviewsNeeded = avgRating < targetRating
      ? Math.ceil((targetRating * (totalReviews + 100) - avgRating * totalReviews) / 5)
      : 0;

    return {
      targetRating,
      neededReviews: Math.max(0, reviewsNeeded),
      reviewSources: [
        { source: 'In-app prompt', weight: 40, action: 'Request review 30 min after delivery' },
        { source: 'SMS follow-up', weight: 30, action: 'Send SMS with review link' },
        { source: 'WhatsApp', weight: 20, action: 'Personal message with review request' },
        { source: 'Email', weight: 10, action: 'Include review CTA in order confirmation' },
      ],
    };
  }

  /**
   * Optimize commission structure
   */
  private optimizeCommissions(metrics: PlatformMetrics[]): PlatformOptimizationResponse['commissionOptimization'] {
    const avgCommission = metrics.reduce((sum, m) => sum + m.commission / m.gmV * 100, 0) / metrics.length;

    return {
      currentCommission: avgCommission,
      recommendedCommission: Math.min(avgCommission, 20), // Target 20%
      subsidyStrategy: {
        minimumOrder: 300,
        maxSubsidy: 50,
      },
    };
  }

  /**
   * Generate prioritized recommendations
   */
  private generateRecommendations(
    profileOptimization: PlatformOptimizationResponse['profileOptimization'],
    menuOptimization: PlatformOptimizationResponse['menuOptimization'],
    operationalOptimization: PlatformOptimizationResponse['operationalOptimization'],
    reviewStrategy: PlatformOptimizationResponse['reviewStrategy'],
    commissionOptimization: PlatformOptimizationResponse['commissionOptimization']
  ): PlatformOptimizationResponse['recommendations'] {
    const recommendations: PlatformOptimizationResponse['recommendations'] = [];

    // Photo quality recommendation
    if (profileOptimization.photoQuality.score < 70) {
      recommendations.push({
        priority: 1,
        action: 'Upload 10+ high-quality photos to each platform listing',
        effort: 'low',
        impact: 15,
        timeline: '1-2 weeks',
      });
    }

    // Delivery time recommendation
    if (operationalOptimization.deliveryTime.current > operationalOptimization.deliveryTime.target + 10) {
      recommendations.push({
        priority: 2,
        action: 'Reduce delivery time by optimizing kitchen workflow',
        effort: 'high',
        impact: 20,
        timeline: '2-4 weeks',
      });
    }

    // Review strategy recommendation
    if (reviewStrategy.neededReviews > 0) {
      recommendations.push({
        priority: 3,
        action: `Generate ${reviewStrategy.neededReviews} additional positive reviews through multi-channel outreach`,
        effort: 'medium',
        impact: 15,
        timeline: '4-8 weeks',
      });
    }

    // Menu optimization recommendation
    if (menuOptimization.spotlightItems.length > 0) {
      recommendations.push({
        priority: 4,
        action: 'Feature top 5 items prominently and ensure availability',
        effort: 'low',
        impact: 10,
        timeline: '1 week',
      });
    }

    // Commission optimization
    if (commissionOptimization.currentCommission > commissionOptimization.recommendedCommission) {
      recommendations.push({
        priority: 5,
        action: 'Negotiate commission rate or optimize ad spend to offset costs',
        effort: 'medium',
        impact: 5,
        timeline: 'Ongoing',
      });
    }

    // Add spotlight items recommendation
    recommendations.push({
      priority: 6,
      action: 'Ensure all spotlight items have high-quality photos and descriptions',
      effort: 'low',
      impact: 8,
      timeline: '1 week',
    });

    return recommendations.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Compare platforms and recommend allocation
   */
  async comparePlatforms(
    zomatoMetrics: PlatformMetrics,
    swiggyMetrics: PlatformMetrics
  ): Promise<{
    recommendation: 'zomato' | 'swiggy' | 'balanced';
    rationale: string;
    allocation: { zomato: number; swiggy: number };
  }> {
    const zomatoROAS = zomatoMetrics.gmV / (zomatoMetrics.gmV * this.PLATFORM_COMMISSION.zomato);
    const swiggyROAS = swiggyMetrics.gmV / (swiggyMetrics.gmV * this.PLATFORM_COMMISSION.swiggy);

    const zomatoScore = zomatoMetrics.avgRating * (zomatoMetrics.conversionRate || 0.05) * zomatoROAS;
    const swiggyScore = swiggyMetrics.avgRating * (swiggyMetrics.conversionRate || 0.05) * swiggyROAS;

    if (zomatoScore > swiggyScore * 1.2) {
      return {
        recommendation: 'zomato',
        rationale: 'Zomato shows 20%+ better performance metrics',
        allocation: { zomato: 60, swiggy: 40 },
      };
    }

    if (swiggyScore > zomatoScore * 1.2) {
      return {
        recommendation: 'swiggy',
        rationale: 'Swiggy shows 20%+ better performance metrics',
        allocation: { zomato: 40, swiggy: 60 },
      };
    }

    return {
      recommendation: 'balanced',
      rationale: 'Both platforms perform similarly - recommend balanced presence',
      allocation: { zomato: 50, swiggy: 50 },
    };
  }

  /**
   * Generate platform optimization report
   */
  async generateReport(request: PlatformOptimizationRequest, response: PlatformOptimizationResponse): Promise<string> {
    const comparison = request.platform === 'both'
      ? await this.comparePlatforms(request.metrics[0], request.metrics[1])
      : null;

    return `
# PLATFORM OPTIMIZATION REPORT
Generated: ${new Date().toISOString()}
Restaurant ID: ${request.restaurantId}
Platforms: ${request.platform.toUpperCase()}

## PROFILE OPTIMIZATION
### Photo Quality Score: ${response.profileOptimization.photoQuality.score}/100
${response.profileOptimization.photoQuality.recommendation}

### Description Score: ${response.profileOptimization.description.score}/100
${response.profileOptimization.description.recommendation}

### Badge Recommendations
Current: ${response.profileOptimization.badges.current.join(', ') || 'None'}
Recommended: ${response.profileOptimization.badges.recommended.join(', ')}
Reason: ${response.profileOptimization.badges.reason}

## MENU OPTIMIZATION
### Spotlight Items
${response.menuOptimization.spotlightItems.map(i => `- ${i.name}: ${i.reason}`).join('\n')}

### Pricing Strategy
Approach: ${response.menuOptimization.pricingStrategy.approach}
${response.menuOptimization.pricingStrategy.rationale}
Expected Impact: ${response.menuOptimization.pricingStrategy.expectedImpact}%

### Packaging
Current Charge: ₹${response.menuOptimization.packagingRecommendation.charge}
${response.menuOptimization.packagingRecommendation.suggestion}

## OPERATIONAL OPTIMIZATION
### Delivery Time
Current: ${response.operationalOptimization.deliveryTime.current} min
Target: ${response.operationalOptimization.deliveryTime.target} min
${response.operationalOptimization.deliveryTime.recommendations.join('\n')}

### Busy Hours Strategy
${response.operationalOptimization.busyHours.strategy}

## REVIEW STRATEGY
Target Rating: ${response.reviewStrategy.targetRating}/5
Reviews Needed: ${response.reviewStrategy.neededReviews}
${response.reviewStrategy.reviewSources.map(s => `- ${s.source} (${s.weight}%): ${s.action}`).join('\n')}

## COMMISSION OPTIMIZATION
Current Commission: ${response.commissionOptimization.currentCommission.toFixed(0)}%
Recommended: ${response.commissionOptimization.recommendedCommission.toFixed(0)}%
Min Order for Subsidy: ₹${response.commissionOptimization.subsidyStrategy.minimumOrder}
Max Subsidy: ₹${response.commissionOptimization.subsidyStrategy.maxSubsidy}

## PRIORITIZED RECOMMENDATIONS
${response.recommendations.map(r => `${r.priority}. [${r.effort.toUpperCase()} - ${r.timeline}] ${r.action} (Impact: ${r.impact}%)`).join('\n')}

${comparison ? `
## PLATFORM COMPARISON
Recommended Focus: ${comparison.recommendation.toUpperCase()}
${comparison.rationale}
Allocation: Zomato ${comparison.allocation.zomato}% | Swiggy ${comparison.allocation.swiggy}%
` : ''}
`.trim();
  }
}

export const platformOptimizerService = new PlatformOptimizerService();
