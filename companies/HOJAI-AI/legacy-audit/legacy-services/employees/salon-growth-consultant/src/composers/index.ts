/**
 * Salon Growth Consultant - Composer Agents
 * Specialized AI agents for salon business optimization
 */

// ============================================
// Retention Agent
// ============================================

export const retentionAgent = {
  /**
   * Identify at-risk clients who need retention campaigns
   */
  identifyAtRiskClients(clients: {
    id: string;
    name: string;
    visitCount: number;
    lastVisit: string;
    avgSpend: number;
    lifecycleStage: string;
  }[]): { clientId: string; riskLevel: 'high' | 'medium' | 'low'; reason: string; recommendedAction: string }[] {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    return clients.map(client => {
      const lastVisitDate = new Date(client.lastVisit);
      let riskLevel: 'high' | 'medium' | 'low' = 'low';
      let reason = '';
      let recommendedAction = 'Continue regular engagement';

      // High risk: dormant or no visit in 60+ days
      if (client.lifecycleStage === 'dormant' || lastVisitDate < sixtyDaysAgo) {
        riskLevel = 'high';
        const daysSince = Math.floor((now.getTime() - lastVisitDate.getTime()) / (24 * 60 * 60 * 1000));
        reason = 'No visit in ' + daysSince + ' days';
        recommendedAction = 'Send reactivation offer with 25% discount';
      }
      // Medium risk: at-risk or no visit in 30+ days
      else if (client.lifecycleStage === 'at_risk' || lastVisitDate < thirtyDaysAgo) {
        riskLevel = 'medium';
        const daysSince = Math.floor((now.getTime() - lastVisitDate.getTime()) / (24 * 60 * 60 * 1000));
        reason = 'No visit in ' + daysSince + ' days';
        recommendedAction = 'Send personalized reminder with favorite services';
      }

      return {
        clientId: client.id,
        riskLevel,
        reason,
        recommendedAction,
      };
    });
  },

  /**
   * Calculate client lifetime value
   */
  calculateCLV(client: {
    visitCount: number;
    avgSpend: number;
    lifecycleStage: string;
  }): number {
    const avgVisitsPerYear = client.lifecycleStage === 'VIP' ? 12 :
      client.lifecycleStage === 'active' ? 8 :
        client.lifecycleStage === 'at_risk' ? 4 : 2;

    return client.avgSpend * avgVisitsPerYear * 3; // 3-year projection
  },
};

// ============================================
// Upsell Agent
// ============================================

export const upsellAgent = {
  /**
   * Generate upsell suggestions for a service
   */
  suggestUpsells(
    currentService: { id: string; name: string; category: string; price: number },
    allServices: { id: string; name: string; category: string; price: number; duration: number }[]
  ): { serviceId: string; name: string; price: number; reason: string; conversionChance: number }[] {
    const suggestions: { serviceId: string; name: string; price: number; reason: string; conversionChance: number }[] = [];

    // Define common upsell patterns
    const upsellPatterns: Record<string, string[]> = {
      'hair': ['Hair Treatment', 'Hair Spa', 'Hair Coloring', 'Hair Wash'],
      'skin': ['Facial', 'Clean-up', 'Gold Facial', 'Anti-aging'],
      'nails': ['Pedicure', 'Manicure', 'Nail Art', 'Nail Treatment'],
      'spa': ['Body Massage', 'Body Scrub', 'Aromatherapy', 'Steam'],
    };

    const relatedServices = upsellPatterns[currentService.category] || [];

    for (const serviceName of relatedServices) {
      const targetService = allServices.find(
        s => s.name.toLowerCase().includes(serviceName.toLowerCase()) && s.id !== currentService.id
      );

      if (targetService) {
        suggestions.push({
          serviceId: targetService.id,
          name: targetService.name,
          price: targetService.price,
          reason: `Complements your ${currentService.name} for a complete look`,
          conversionChance: 0.4,
        });
      }
    }

    return suggestions.slice(0, 3);
  },

  /**
   * Calculate potential revenue from upselling
   */
  calculateUpsellPotential(
    monthlyClients: number,
    avgServiceValue: number,
    upsellRate: number
  ): { potentialRevenue: number; currentRevenue: number; additionalRevenue: number } {
    const currentRevenue = monthlyClients * avgServiceValue;
    const upsellRevenue = currentRevenue * (upsellRate / 100);
    const potentialRevenue = currentRevenue * 1.25; // 25% increase potential

    return {
      potentialRevenue: Math.round(potentialRevenue),
      currentRevenue: Math.round(currentRevenue),
      additionalRevenue: Math.round(upsellRevenue),
    };
  },
};

// ============================================
// Pricing Agent
// ============================================

export const pricingAgent = {
  /**
   * Calculate optimal price for a service
   */
  calculateOptimalPrice(
    service: { name: string; category: string; cost: number; popularity: number; duration: number },
    competitorPrices?: { name: string; price: number }[]
  ): { optimalPrice: number; minPrice: number; maxPrice: number; strategy: string } {
    // Industry standard margins
    const targetMargin = 0.65; // 65% margin

    // Base price calculation from cost + margin
    const basePrice = service.cost / (1 - targetMargin);

    // Popularity adjustment (premium for popular services)
    const popularityMultiplier = 1 + (service.popularity - 50) / 200;

    // Duration adjustment
    const durationMultiplier = Math.sqrt(service.duration / 30); // 30 min baseline

    // Calculate recommended price
    let optimalPrice = basePrice * popularityMultiplier * durationMultiplier;

    // Competitor adjustment if available
    if (competitorPrices && competitorPrices.length > 0) {
      const competitorAvg = competitorPrices.reduce((sum, c) => sum + c.price, 0) / competitorPrices.length;
      optimalPrice = (optimalPrice + competitorAvg) / 2;
    }

    // Round to nearest 50
    optimalPrice = Math.round(optimalPrice / 50) * 50;

    return {
      optimalPrice,
      minPrice: Math.round((optimalPrice * 0.8) / 50) * 50,
      maxPrice: Math.round((optimalPrice * 1.3) / 50) * 50,
      strategy: service.popularity > 70 ? 'premium' : service.popularity > 40 ? 'competitive' : 'value',
    };
  },

  /**
   * Calculate price elasticity
   */
  calculatePriceElasticity(
    basePrice: number,
    currentDemand: number,
    proposedPrice: number
  ): { elasticity: number; demandChange: number; shouldIncrease: boolean } {
    const elasticity = Math.abs((currentDemand - (currentDemand * (basePrice / proposedPrice))) / (proposedPrice - basePrice));
    const demandChange = ((basePrice - proposedPrice) / basePrice) * 100;
    const shouldIncrease = proposedPrice > basePrice && elasticity < 1;

    return {
      elasticity: Math.round(elasticity * 100) / 100,
      demandChange: Math.round(demandChange),
      shouldIncrease,
    };
  },
};

// ============================================
// Campaign Agent
// ============================================

export const campaignAgent = {
  /**
   * Generate campaign ideas for salon
   */
  generateCampaigns(goals: 'acquire' | 'retain' | 'upsell' | 'all'): {
    name: string;
    type: 'acquisition' | 'retention' | 'upsell';
    description: string;
    targetAudience: string;
    expectedImpact: number;
    cost: number;
    duration: string;
  }[] {
    const campaigns = [];

    if (goals === 'acquire' || goals === 'all') {
      campaigns.push(
        {
          name: 'New Client Welcome',
          type: 'acquisition' as const,
          description: 'First-time visitors get 30% off their first service',
          targetAudience: 'New clients in the area',
          expectedImpact: 20,
          cost: 5000,
          duration: '2 weeks',
        },
        {
          name: 'Referral Rewards',
          type: 'acquisition' as const,
          description: 'Existing clients get ₹500 credit for each referral',
          targetAudience: 'Happy existing clients',
          expectedImpact: 15,
          cost: 3000,
          duration: 'Ongoing',
        },
        {
          name: 'Social Media Contest',
          type: 'acquisition' as const,
          description: 'Share a transformation photo to win a free service',
          targetAudience: 'Social media followers',
          expectedImpact: 25,
          cost: 2000,
          duration: '1 week',
        }
      );
    }

    if (goals === 'retain' || goals === 'all') {
      campaigns.push(
        {
          name: 'Win-Back Campaign',
          type: 'retention' as const,
          description: 'Lapsed clients get exclusive reactivation offer',
          targetAudience: 'Clients who haven\'t visited in 45+ days',
          expectedImpact: 18,
          cost: 2000,
          duration: '2 weeks',
        },
        {
          name: 'Birthday Special',
          type: 'retention' as const,
          description: 'Free add-on service for members on their birthday',
          targetAudience: 'All members with birthdays this month',
          expectedImpact: 30,
          cost: 3000,
          duration: 'Monthly',
        },
        {
          name: 'Loyalty Milestone',
          type: 'retention' as const,
          description: 'Celebrate client anniversaries with special rewards',
          targetAudience: 'Clients with 1+ year relationship',
          expectedImpact: 22,
          cost: 4000,
          duration: 'Quarterly',
        }
      );
    }

    if (goals === 'upsell' || goals === 'all') {
      campaigns.push(
        {
          name: 'Package Promotion',
          type: 'upsell' as const,
          description: 'Buy 4 sessions, get the 5th free',
          targetAudience: 'Regular clients',
          expectedImpact: 35,
          cost: 5000,
          duration: '3 weeks',
        },
        {
          name: 'Premium Upgrade',
          type: 'upsell' as const,
          description: 'Try our premium treatment at 20% off',
          targetAudience: 'Clients who always choose basic services',
          expectedImpact: 20,
          cost: 3000,
          duration: '2 weeks',
        }
      );
    }

    return campaigns;
  },
};
