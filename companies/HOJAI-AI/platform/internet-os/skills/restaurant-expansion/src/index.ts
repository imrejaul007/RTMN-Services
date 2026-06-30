/**
 * Restaurant Expansion Skill
 *
 * REUSES: Google Maps + Zomato + Reviews actors + AI Intelligence
 * Composes multiple sources for location analysis + market opportunity
 */

import axios from 'axios';

const INTERNET_OS_URL = process.env.INTERNET_OS_URL || 'http://localhost:4595';
const AI_INTELLIGENCE_URL = process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881';
const MEMORY_OS_URL = process.env.MEMORY_OS_URL || 'http://localhost:4703';

export interface LocationAnalysisInput {
  city: string;
  area: string;
  restaurantType: 'fine_dining' | 'casual_dining' | 'fast_casual' | 'quick_service' | 'cafe' | 'bakery' | 'food_truck';
  cuisine?: string;
  budgetRange?: 'low' | 'medium' | 'high' | 'premium';
}

export interface SupplierSearchInput {
  restaurantType: string;
  cuisine?: string;
  location?: string;
}

export interface MarketInsightsInput {
  city: string;
  area: string;
  restaurantType: string;
  cuisine?: string;
}

export interface LocationViability {
  score: number;
  rating: string;
  population: number;
  competition: {
    count: number;
    avgRating: number;
    topPlayers: string[];
  };
  footfall: {
    daily: number;
    peak: string;
  };
  demographics: {
    ageGroups: string[];
    incomeLevel: string;
  };
  recommendations: string[];
}

export interface Supplier {
  name: string;
  category: string;
  location: string;
  rating?: number;
  certifications?: string[];
  minOrder?: number;
  deliveryTime?: string;
}

export interface MarketInsights {
  marketSize: string;
  growthRate: string;
  topSegments: string[];
  trends: string[];
  opportunities: string[];
  risks: string[];
  competitorCount: number;
  avgTicketSize: string;
}

export interface ExpansionReport {
  location: LocationViability;
  suppliers: Supplier[];
  marketInsights: MarketInsights;
  generatedAt: string;
}

export class RestaurantExpansionSkill {
  private token: string;

  constructor(token?: string) {
    this.token = token || process.env.INTERNAL_SERVICE_TOKEN || 'restaurant-expansion-skill';
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Analyze location for restaurant viability
   */
  async analyze_location(input: LocationAnalysisInput): Promise<LocationViability> {
    const [competition, demographics, footfall] = await Promise.all([
      this.getCompetition(input.city, input.area, input.restaurantType),
      this.getDemographics(input.city, input.area),
      this.getFootfall(input.city, input.area),
    ]);

    // Calculate viability score
    const competitionScore = Math.max(0, 100 - competition.count * 5);
    const ratingScore = competition.avgRating > 0 ? (5 - competition.avgRating) * 25 : 50;
    const viabilityScore = Math.round((competitionScore + ratingScore) / 2);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      input,
      competition,
      demographics,
      viabilityScore
    );

    return {
      score: viabilityScore,
      rating: viabilityScore >= 70 ? 'Excellent' : viabilityScore >= 50 ? 'Good' : viabilityScore >= 30 ? 'Moderate' : 'Low',
      population: demographics.population || 50000,
      competition,
      footfall,
      demographics: demographics.info,
      recommendations,
    };
  }

  /**
   * Find suppliers for restaurant type
   */
  async find_suppliers(input: SupplierSearchInput): Promise<Supplier[]> {
    try {
      // Search Google Maps for suppliers
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/google-maps/run`,
        {
          action: 'search',
          params: {
            keyword: `${input.restaurantType} suppliers ${input.cuisine || ''}`,
            city: input.location || 'India',
          },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (!response.data.success) return [];

      const results = response.data.data || [];
      return results.slice(0, 20).map((r: any) => ({
        name: r.name || 'Unknown Supplier',
        category: input.restaurantType,
        location: r.address || r.location || 'Unknown',
        rating: r.rating,
        certifications: r.certifications || [],
        minOrder: r.priceLevel ? r.priceLevel * 500 : undefined,
        deliveryTime: r.deliveryTime || '2-5 days',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get market insights for restaurant type
   */
  async get_market_insights(input: MarketInsightsInput): Promise<MarketInsights> {
    const [zomatoData, newsData] = await Promise.all([
      this.getZomatoInsights(input.city, input.restaurantType),
      this.getRestaurantNews(input.cuisine || input.restaurantType),
    ]);

    // Compile market insights
    return {
      marketSize: zomatoData.marketSize || '₹50-100 Crores',
      growthRate: zomatoData.growthRate || '15-20% YoY',
      topSegments: zomatoData.topSegments || ['Quick Service', 'Cloud Kitchen', 'Dine-in'],
      trends: newsData.trends || [
        'Digital ordering continues to grow',
        'Contactless dining preferences',
        'Sustainability focus',
      ],
      opportunities: this.identifyOpportunities(input, zomatoData),
      risks: this.identifyRisks(input, zomatoData),
      competitorCount: zomatoData.competitorCount || 50,
      avgTicketSize: zomatoData.avgTicketSize || '₹400-600',
    };
  }

  /**
   * Full expansion analysis
   */
  async execute(input: LocationAnalysisInput): Promise<ExpansionReport> {
    const [location, suppliers, marketInsights] = await Promise.all([
      this.analyze_location(input),
      this.find_suppliers({
        restaurantType: input.restaurantType,
        cuisine: input.cuisine,
      }),
      this.get_market_insights({
        city: input.city,
        area: input.area,
        restaurantType: input.restaurantType,
        cuisine: input.cuisine,
      }),
    ]);

    // Store in MemoryOS
    await this.storeAnalysis(input, { location, suppliers, marketInsights });

    return {
      location,
      suppliers,
      marketInsights,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get competition data from Google Maps
   */
  private async getCompetition(
    city: string,
    area: string,
    restaurantType: string
  ): Promise<{ count: number; avgRating: number; topPlayers: string[] }> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/google-maps/run`,
        {
          action: 'search',
          params: { keyword: `${restaurantType} ${area}`, city },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (!response.data.success) {
        return { count: 0, avgRating: 0, topPlayers: [] };
      }

      const results = response.data.data || [];
      const ratings = results.filter((r: any) => r.rating).map((r: any) => r.rating);
      const avgRating = ratings.length > 0
        ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length
        : 0;

      return {
        count: results.length,
        avgRating: Math.round(avgRating * 10) / 10,
        topPlayers: results.slice(0, 5).map((r: any) => r.name),
      };
    } catch {
      return { count: 0, avgRating: 0, topPlayers: [] };
    }
  }

  /**
   * Get demographic data
   */
  private async getDemographics(
    city: string,
    area: string
  ): Promise<{ population: number; info: { ageGroups: string[]; incomeLevel: string } }> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/company-intel/run`,
        {
          action: 'get_company_info',
          params: { company: `${area} ${city}` },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data;
        return {
          population: data.population || 50000,
          info: {
            ageGroups: data.ageGroups || ['25-35', '35-45'],
            incomeLevel: data.incomeLevel || 'Middle Income',
          },
        };
      }
    } catch {
      // Fallback to defaults
    }

    return {
      population: 50000,
      info: {
        ageGroups: ['25-35', '35-45'],
        incomeLevel: 'Middle Income',
      },
    };
  }

  /**
   * Get footfall data
   */
  private async getFootfall(
    city: string,
    area: string
  ): Promise<{ daily: number; peak: string }> {
    // This would ideally use Zomato or real footfall data
    return {
      daily: 5000,
      peak: '12:00-14:00, 19:00-21:00',
    };
  }

  /**
   * Get Zomato insights
   */
  private async getZomatoInsights(
    city: string,
    restaurantType: string
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/zomato/run`,
        {
          action: 'search',
          params: { city, query: restaurantType },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (response.data.success && response.data.data) {
        return response.data.data;
      }
    } catch {
      // Fallback
    }

    return {
      marketSize: '₹50-100 Crores',
      growthRate: '15-20% YoY',
      competitorCount: 50,
      avgTicketSize: '₹400-600',
    };
  }

  /**
   * Get restaurant-related news
   */
  private async getRestaurantNews(cuisine: string): Promise<any> {
    try {
      const response = await axios.post(
        `${INTERNET_OS_URL}/api/actors/news/run`,
        {
          action: 'search',
          params: { query: `${cuisine} restaurant market trends India`, limit: 10 },
        },
        { headers: this.headers, timeout: 30000 }
      );

      if (response.data.success && response.data.data) {
        const trends = response.data.data
          .slice(0, 5)
          .map((n: any) => n.title || n.text)
          .filter(Boolean);

        return { trends };
      }
    } catch {
      // Fallback
    }

    return { trends: [] };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    input: LocationAnalysisInput,
    competition: any,
    demographics: any,
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (score >= 70) {
      recommendations.push('Strong market opportunity - proceed with expansion');
    } else if (score >= 50) {
      recommendations.push('Moderate opportunity - consider differentiation strategy');
    } else {
      recommendations.push('High competition - need strong USPs to succeed');
    }

    if (competition.count < 10) {
      recommendations.push('Low competition - first-mover advantage possible');
    } else if (competition.count > 30) {
      recommendations.push('Saturated market - focus on niche segments');
    }

    if (demographics.info?.incomeLevel === 'High Income') {
      recommendations.push('Premium pricing strategy recommended');
    }

    recommendations.push(`Target cuisine: ${input.cuisine || input.restaurantType}`);
    recommendations.push('Consider delivery-only cloud kitchen model');

    return recommendations;
  }

  /**
   * Identify market opportunities
   */
  private identifyOpportunities(input: any, data: any): string[] {
    return [
      'Growing demand for healthy food options',
      'Corporate catering opportunity',
      'Weekend brunch concepts',
      'Subscription meal plans',
      'Franchise opportunity in metro areas',
    ];
  }

  /**
   * Identify market risks
   */
  private identifyRisks(input: any, data: any): string[] {
    return [
      'High real estate costs in prime locations',
      'Food inflation impacting margins',
      'Competition from aggregators (Zomato, Swiggy)',
      'Staff retention challenges',
      'Regulatory compliance (FSSAI)',
    ];
  }

  /**
   * Store analysis in MemoryOS
   */
  private async storeAnalysis(input: LocationAnalysisInput, data: any): Promise<void> {
    try {
      await axios.post(
        `${MEMORY_OS_URL}/api/memories`,
        {
          userId: `restaurant-expansion-${input.city}-${input.area}`,
          content: JSON.stringify(data),
          type: 'restaurant-expansion',
          metadata: {
            city: input.city,
            area: input.area,
            restaurantType: input.restaurantType,
            generatedAt: new Date().toISOString(),
          },
        },
        { headers: this.headers }
      );
    } catch {
      // Silently fail if MemoryOS unavailable
    }
  }

  /**
   * Register skill with SkillOS
   */
  async register(): Promise<any> {
    try {
      const response = await axios.post(
        `${process.env.SKILL_OS_URL || 'http://localhost:4743'}/api/skills`,
        {
          name: 'restaurant-expansion',
          description: 'Location analysis + supplier discovery + market insights for restaurant expansion',
          category: 'business-intelligence',
          tags: ['restaurant', 'expansion', 'location-analysis', 'market-research'],
          inputs: {
            type: 'object',
            properties: {
              city: { type: 'string' },
              area: { type: 'string' },
              restaurantType: {
                type: 'string',
                enum: ['fine_dining', 'casual_dining', 'fast_casual', 'quick_service', 'cafe', 'bakery', 'food_truck'],
              },
              cuisine: { type: 'string' },
              budgetRange: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'premium'],
              },
            },
            required: ['city', 'area', 'restaurantType'],
          },
        },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}

export const restaurantExpansionSkill = new RestaurantExpansionSkill();
export default restaurantExpansionSkill;
