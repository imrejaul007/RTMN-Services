/**
 * Genie → Waitron Restaurant Discovery Connector
 *
 * Connects Genie (HOJAI AI) to Waitron's restaurant data
 * Enables personalized restaurant recommendations for customers
 *
 * Flow: Customer asks Genie → Restaurant Discovery → Waitron → Personalized Recommendation
 *
 * @module genie-restaurant-connector
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

export interface Restaurant {
  id: string;
  name: string;
  description?: string;
  cuisine: string[];
  rating?: number;
  reviewCount?: number;
  priceRange?: string;
  address?: string;
  city?: string;
  locality?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  email?: string;
  website?: string;
  operatingHours?: {
    [day: string]: { open: string; close: string };
  };
  features?: string[];
  deliveryAvailable?: boolean;
  takeawayAvailable?: boolean;
  dineInAvailable?: boolean;
  averageDeliveryTime?: number;
  deliveryFee?: number;
  minimumOrder?: number;
  coverImage?: string;
  logo?: string;
  isOpen?: boolean;
  nextCloseTime?: string;
  featured?: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  available: boolean;
  preparationTime?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  spiceLevel?: 'mild' | 'medium' | 'hot' | 'very_hot';
  allergens?: string[];
  modifiers?: Array<{
    name: string;
    options: Array<{ name: string; price: number }>;
  }>;
}

export interface CustomerPreferences {
  customerId: string;
  dietary?: string[];
  cuisinePreferences?: string[];
  favoriteCuisines?: string[];
  priceRange?: string;
  preferredSeating?: string;
  occasions?: string[];
  averageSpend?: number;
  visitFrequency?: string;
  preferredPaymentMethod?: string;
  allergies?: string[];
}

export interface DiscoveryQuery {
  userId?: string;
  query: string;
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    locality?: string;
  };
  preferences?: CustomerPreferences;
  filters?: {
    cuisine?: string[];
    priceRange?: string;
    rating?: number;
    deliveryAvailable?: boolean;
    openNow?: boolean;
  };
  limit?: number;
}

export interface RestaurantRecommendation {
  restaurant: Restaurant;
  score: number;
  reasons: string[];
  matchDetails: {
    cuisineMatch: boolean;
    locationMatch: boolean;
    preferenceMatch: boolean;
    ratingMatch: boolean;
  };
  estimatedDeliveryTime?: number;
  popularItems?: MenuItem[];
  currentOffer?: {
    title: string;
    description: string;
    discount?: number;
    code?: string;
  };
}

export interface DiscoveryResult {
  success: boolean;
  recommendations: RestaurantRecommendation[];
  totalFound: number;
  query: string;
  filters: DiscoveryQuery['filters'];
  personalized: boolean;
  timestamp: string;
}

export class GenieRestaurantConnector {
  private waitronClient: AxiosInstance;
  private restaurantClient: AxiosInstance;

  // Service URLs
  private waitronUrl: string;
  private restaurantUrl: string;

  // Cuisine mapping for better matching
  private cuisineMapping: Record<string, string[]> = {
    'south indian': ['south indian', 'dosa', 'idli', 'vada', 'uttapam', 'biryani'],
    'north indian': ['north indian', 'paneer', 'dal', 'naan', 'curry'],
    'chinese': ['chinese', 'noodles', 'manchurian', 'fried rice', 'dim sum'],
    'italian': ['italian', 'pasta', 'pizza', 'risotto'],
    'continental': ['continental', 'grilled', 'steak', 'salad'],
    'cafe': ['cafe', 'coffee', 'tea', 'sandwich', 'pastry'],
    'fast food': ['fast food', 'burger', 'fries', 'pizza'],
    'biryani': ['biryani', 'hyderabadi', 'chicken biryani', 'mutton biryani'],
    'breakfast': ['breakfast', 'dosa', 'idli', 'poha', 'upma', 'paratha'],
    'desserts': ['desserts', 'ice cream', 'cake', 'pastry', 'sweets']
  };

  constructor(config?: {
    waitronUrl?: string;
    restaurantUrl?: string;
    logger?: winston.Logger;
  }) {
    this.waitronUrl = config?.waitronUrl || process.env.WAITRON_URL || 'http://localhost:4820';
    this.restaurantUrl = config?.restaurantUrl || process.env.REZ_RESTAURANT_URL || 'http://localhost:4017';

    this.waitronClient = axios.create({
      baseURL: this.waitronUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    this.restaurantClient = axios.create({
      baseURL: this.restaurantUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (config?.logger) {
      logger = config.logger;
    }

    logger.info('GenieRestaurantConnector initialized', {
      waitronUrl: this.waitronUrl,
      restaurantUrl: this.restaurantUrl
    });
  }

  /**
   * Discover restaurants based on natural language query
   * This is the main entry point for Genie's restaurant discovery
   */
  async discoverRestaurants(query: DiscoveryQuery): Promise<DiscoveryResult> {
    try {
      logger.info('Processing restaurant discovery query', {
        query: query.query,
        userId: query.userId,
        location: query.location
      });

      // Parse the natural language query
      const parsedQuery = this.parseQuery(query.query);

      // Merge parsed query with explicit filters
      const filters = {
        ...query.filters,
        cuisine: query.filters?.cuisine || parsedQuery.cuisine,
        priceRange: query.filters?.priceRange || parsedQuery.priceRange,
        rating: query.filters?.rating || parsedQuery.minRating,
        openNow: query.filters?.openNow ?? parsedQuery.openNow,
        deliveryAvailable: query.filters?.deliveryAvailable ?? parsedQuery.delivery
      };

      // Get restaurants from Waitron
      const restaurants = await this.getRestaurants({
        ...query,
        filters
      });

      // Score and rank restaurants
      const scoredRestaurants = await this.scoreRestaurants({
        restaurants,
        query: parsedQuery,
        preferences: query.preferences,
        location: query.location
      });

      // Limit results
      const recommendations = scoredRestaurants.slice(0, query.limit || 5);

      logger.info('Discovery complete', {
        totalFound: restaurants.length,
        returned: recommendations.length,
        topMatch: recommendations[0]?.restaurant.name
      });

      return {
        success: true,
        recommendations,
        totalFound: restaurants.length,
        query: query.query,
        filters,
        personalized: !!query.preferences,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Restaurant discovery failed', { error: error.message });
      return {
        success: false,
        recommendations: [],
        totalFound: 0,
        query: query.query,
        filters: query.filters || {},
        personalized: false,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get restaurant details including menu
   */
  async getRestaurantDetails(restaurantId: string, includeMenu: boolean = true): Promise<Restaurant | null> {
    try {
      logger.info('Getting restaurant details', { restaurantId });

      const [restaurantRes, menuRes] = await Promise.allSettled([
        this.restaurantClient.get(`/api/restaurants/${restaurantId}`),
        includeMenu ? this.restaurantClient.get(`/api/menu?restaurantId=${restaurantId}`) : Promise.resolve({ data: null })
      ]);

      const restaurant = restaurantRes.status === 'fulfilled' ? restaurantRes.value.data : null;

      if (!restaurant) {
        return null;
      }

      return {
        ...restaurant,
        id: restaurant.id || restaurantId
      };
    } catch (error: any) {
      logger.error('Failed to get restaurant details', { error: error.message, restaurantId });
      return null;
    }
  }

  /**
   * Get menu for a restaurant
   */
  async getMenu(restaurantId: string, category?: string): Promise<MenuItem[]> {
    try {
      const params: any = { restaurantId };
      if (category) params.category = category;

      const response = await this.restaurantClient.get('/api/menu', { params });

      return (response.data.items || response.data || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        image: item.image,
        available: item.available !== false,
        preparationTime: item.prepTime || item.preparationTime,
        isVegetarian: item.isVegetarian || item.vegetarian,
        isVegan: item.isVegan || item.vegan,
        isGlutenFree: item.isGlutenFree || item.glutenFree,
        spiceLevel: item.spiceLevel,
        allergens: item.allergens
      }));
    } catch (error: any) {
      logger.error('Failed to get menu', { error: error.message, restaurantId });
      return [];
    }
  }

  /**
   * Get personalized recommendations for a customer
   */
  async getPersonalizedRecommendations(params: {
    customerId: string;
    location?: DiscoveryQuery['location'];
    limit?: number;
  }): Promise<RestaurantRecommendation[]> {
    try {
      // Get customer preferences
      const preferences = await this.getCustomerPreferences(params.customerId);

      if (!preferences) {
        return this.getPopularRestaurants(params.limit || 5);
      }

      // Build discovery query from preferences
      const query: DiscoveryQuery = {
        userId: params.customerId,
        query: `I like ${preferences.cuisinePreferences?.join(', ') || 'good food'}`,
        location: params.location,
        preferences,
        limit: params.limit || 5
      };

      const result = await this.discoverRestaurants(query);

      return result.recommendations;
    } catch (error: any) {
      logger.error('Personalized recommendations failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get popular/featured restaurants
   */
  async getPopularRestaurants(limit: number = 5): Promise<RestaurantRecommendation[]> {
    try {
      const response = await this.restaurantClient.get('/api/restaurants', {
        params: { featured: true, limit }
      });

      const restaurants = response.data.restaurants || response.data || [];

      return restaurants.slice(0, limit).map((r: Restaurant) => ({
        restaurant: r,
        score: 80,
        reasons: ['Popular choice', 'Highly rated'],
        matchDetails: {
          cuisineMatch: true,
          locationMatch: true,
          preferenceMatch: false,
          ratingMatch: true
        }
      }));
    } catch (error: any) {
      logger.error('Failed to get popular restaurants', { error: error.message });
      return [];
    }
  }

  /**
   * Check restaurant availability for a time slot
   */
  async checkAvailability(params: {
    restaurantId: string;
    date: string;
    time: string;
    partySize: number;
  }): Promise<{ available: boolean; tables?: Array<{ id: string; seats: number }> }> {
    try {
      const response = await this.restaurantClient.post('/api/reservations/check-availability', {
        restaurantId: params.restaurantId,
        date: params.date,
        time: params.time,
        partySize: params.partySize
      });

      return {
        available: response.data.available ?? true,
        tables: response.data.availableTables
      };
    } catch (error: any) {
      logger.error('Availability check failed', { error: error.message });
      return { available: false };
    }
  }

  // ============ Private Methods ============

  /**
   * Get restaurants with filters
   */
  private async getRestaurants(params: DiscoveryQuery): Promise<Restaurant[]> {
    try {
      const queryParams: any = {};

      if (params.filters?.cuisine?.length) {
        queryParams.cuisine = params.filters.cuisine.join(',');
      }
      if (params.filters?.priceRange) {
        queryParams.priceRange = params.filters.priceRange;
      }
      if (params.filters?.rating) {
        queryParams.minRating = params.filters.rating;
      }
      if (params.filters?.openNow) {
        queryParams.openNow = true;
      }
      if (params.filters?.deliveryAvailable) {
        queryParams.delivery = true;
      }
      if (params.location?.city) {
        queryParams.city = params.location.city;
      }
      if (params.limit) {
        queryParams.limit = params.limit * 2; // Get more, filter down
      }

      const response = await this.restaurantClient.get('/api/restaurants', {
        params: queryParams
      });

      return response.data.restaurants || response.data || [];
    } catch (error: any) {
      logger.error('Failed to get restaurants', { error: error.message });

      // Return empty array on failure
      return [];
    }
  }

  /**
   * Parse natural language query to extract intent and filters
   */
  private parseQuery(query: string): {
    cuisine?: string[];
    priceRange?: string;
    minRating?: number;
    openNow?: boolean;
    delivery?: boolean;
    keywords: string[];
  } {
    const lowerQuery = query.toLowerCase();
    const keywords = lowerQuery.split(/\s+/);

    const result: ReturnType<typeof this.parseQuery> = {
      keywords
    };

    // Detect cuisine
    for (const [cuisine, aliases] of Object.entries(this.cuisineMapping)) {
      if (aliases.some(alias => lowerQuery.includes(alias)) ||
          lowerQuery.includes(cuisine)) {
        result.cuisine = result.cuisine || [];
        result.cuisine.push(cuisine);
      }
    }

    // Detect price range
    if (lowerQuery.includes('cheap') || lowerQuery.includes('budget') || lowerQuery.includes('affordable')) {
      result.priceRange = 'budget';
    } else if (lowerQuery.includes('expensive') || lowerQuery.includes('premium') || lowerQuery.includes('luxury')) {
      result.priceRange = 'premium';
    } else if (lowerQuery.includes('moderate') || lowerQuery.includes('mid-range')) {
      result.priceRange = 'mid';
    }

    // Detect rating requirement
    const ratingMatch = lowerQuery.match(/(\d+\.?\d*)\s*(star|stars|rating)/);
    if (ratingMatch) {
      result.minRating = parseFloat(ratingMatch[1]);
    }

    // Detect open now
    if (lowerQuery.includes('open') || lowerQuery.includes('available') || lowerQuery.includes('now')) {
      result.openNow = true;
    }

    // Detect delivery
    if (lowerQuery.includes('delivery') || lowerQuery.includes('deliver') || lowerQuery.includes('home')) {
      result.delivery = true;
    }

    return result;
  }

  /**
   * Score restaurants based on query and preferences
   */
  private async scoreRestaurants(params: {
    restaurants: Restaurant[];
    query: ReturnType<typeof this.parseQuery>;
    preferences?: CustomerPreferences;
    location?: DiscoveryQuery['location'];
  }): Promise<RestaurantRecommendation[]> {
    const scored: RestaurantRecommendation[] = [];

    for (const restaurant of params.restaurants) {
      let score = 50; // Base score
      const reasons: string[] = [];
      const matchDetails = {
        cuisineMatch: false,
        locationMatch: false,
        preferenceMatch: false,
        ratingMatch: false
      };

      // Rating score (0-25 points)
      if (restaurant.rating) {
        if (restaurant.rating >= 4.5) {
          score += 25;
          reasons.push('Excellent rating');
          matchDetails.ratingMatch = true;
        } else if (restaurant.rating >= 4.0) {
          score += 20;
          reasons.push('Great rating');
        } else if (restaurant.rating >= 3.5) {
          score += 10;
        }
      }

      // Cuisine match (0-20 points)
      if (params.query.cuisine?.length) {
        const restaurantCuisines = (restaurant.cuisine || []).map(c => c.toLowerCase());
        const hasMatch = params.query.cuisine.some(c =>
          restaurantCuisines.some(rc => rc.includes(c) || c.includes(rc))
        );
        if (hasMatch) {
          score += 20;
          reasons.push('Matches your cuisine preference');
          matchDetails.cuisineMatch = true;
        }
      }

      // Preference match (0-15 points)
      if (params.preferences?.cuisinePreferences?.length) {
        const prefCuisines = params.preferences.cuisinePreferences.map(c => c.toLowerCase());
        const restCuisines = (restaurant.cuisine || []).map(c => c.toLowerCase());
        const prefMatch = prefCuisines.some(pc =>
          restCuisines.some(rc => rc.includes(pc) || pc.includes(rc))
        );
        if (prefMatch) {
          score += 15;
          reasons.push('Based on your taste profile');
          matchDetails.preferenceMatch = true;
        }
      }

      // Location match (0-15 points)
      if (params.location && restaurant.latitude && restaurant.longitude) {
        const distance = this.calculateDistance(
          params.location.latitude,
          params.location.longitude,
          restaurant.latitude,
          restaurant.longitude
        );
        if (distance < 2) {
          score += 15;
          reasons.push('Very close to you');
        } else if (distance < 5) {
          score += 10;
          reasons.push('Nearby');
        } else if (distance < 10) {
          score += 5;
        }
        matchDetails.locationMatch = true;
      }

      // Open now bonus (5 points)
      if (restaurant.isOpen && params.query.openNow) {
        score += 5;
      }

      // Delivery bonus (5 points)
      if (restaurant.deliveryAvailable && params.query.delivery) {
        score += 5;
        reasons.push('Delivery available');
      }

      // Featured bonus (5 points)
      if (restaurant.featured) {
        score += 5;
      }

      scored.push({
        restaurant,
        score: Math.min(100, score),
        reasons,
        matchDetails
      });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored;
  }

  /**
   * Get customer preferences from profile service
   */
  private async getCustomerPreferences(customerId: string): Promise<CustomerPreferences | null> {
    try {
      const response = await this.restaurantClient.get(`/api/customers/${customerId}/preferences`);

      if (!response.data) return null;

      return {
        customerId,
        dietary: response.data.dietary,
        cuisinePreferences: response.data.cuisinePreferences || response.data.preferredCuisines,
        favoriteCuisines: response.data.favoriteCuisines,
        priceRange: response.data.priceRange,
        preferredSeating: response.data.preferredSeating,
        occasions: response.data.occasions,
        averageSpend: response.data.averageSpend,
        visitFrequency: response.data.visitFrequency,
        allergies: response.data.allergies
      };
    } catch (error: any) {
      logger.debug('Customer preferences not found', { customerId });
      return null;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; waitron: boolean; restaurant: boolean }> {
    const [waitronHealth, restaurantHealth] = await Promise.all([
      this.waitronClient.get('/health').then(() => true).catch(() => false),
      this.restaurantClient.get('/health').then(() => true).catch(() => false)
    ]);

    return {
      healthy: waitronHealth || restaurantHealth,
      waitron: waitronHealth,
      restaurant: restaurantHealth
    };
  }
}

// Export singleton instance
export const genieRestaurantConnector = new GenieRestaurantConnector();

export default GenieRestaurantConnector;