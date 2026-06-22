/**
 * GlamAI → DO App Beauty Discovery Connector
 *
 * Connects Genie (DO App) to GlamAI salon discovery
 * Enables personalized beauty salon recommendations
 *
 * Flow: Customer asks Genie → Beauty Discovery → GlamAI → Personalized Recommendation
 *
 * @module glamai-beauty-discovery-connector
 * @version 1.0.0
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console({ format: winston.format.combine(winston.format.colorize(), winston.format.simple()) })]
});

export interface Salon {
  id: string;
  name: string;
  description?: string;
  services: string[];
  rating: number;
  reviewCount?: number;
  priceRange: { min: number; max: number };
  address: string;
  locality: string;
  city: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  images?: string[];
  amenities?: string[];
  openingHours?: { [day: string]: { open: string; close: string } };
  specialties?: string[];
  isOpen?: boolean;
  distance?: number;
}

export interface CustomerPreferences {
  customerId: string;
  hairType?: string;
  hairCondition?: string;
  skinType?: string;
  preferredServices?: string[];
  budget?: string;
  preferredGender?: 'male' | 'female' | 'unisex';
  allergies?: string[];
  previousServices?: string[];
  favoriteSalons?: string[];
}

export interface SalonRecommendation {
  salon: Salon;
  score: number;
  reasons: string[];
  matchDetails: {
    serviceMatch: boolean;
    locationMatch: boolean;
    preferenceMatch: boolean;
    priceMatch: boolean;
  };
  popularServices?: string[];
  currentOffers?: Array<{ title: string; discount?: number }>;
}

export interface DiscoveryResult {
  success: boolean;
  recommendations: SalonRecommendation[];
  totalFound: number;
  query: string;
  personalized: boolean;
  timestamp: string;
}

export class BeautyDiscoveryConnector {
  private client: AxiosInstance;
  private glamaiUrl: string;
  private waitronUrl: string;

  constructor(config?: { glamaiUrl?: string; waitronUrl?: string; logger?: winston.Logger }) {
    this.glamaiUrl = config?.glamaiUrl || process.env.GLAMAI_URL || 'http://localhost:4830';
    this.waitronUrl = config?.waitronUrl || process.env.WAITRON_URL || 'http://localhost:4820';

    this.client = axios.create({
      baseURL: this.glamaiUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (config?.logger) Object.assign(logger, config.logger);
    logger.info('BeautyDiscoveryConnector initialized', { glamaiUrl: this.glamaiUrl });
  }

  /**
   * Discover salons based on natural language query
   * Main entry point for Genie → Salon discovery
   */
  async discoverSalons(params: {
    query: string;
    userId?: string;
    latitude?: number;
    longitude?: number;
    city?: string;
    preferences?: CustomerPreferences;
    limit?: number;
  }): Promise<DiscoveryResult> {
    try {
      logger.info('Processing beauty discovery query', { query: params.query, userId: params.userId });

      // Parse natural language query
      const parsedQuery = this.parseQuery(params.query);

      // Get customer preferences if userId provided
      let preferences = params.preferences;
      if (params.userId && !preferences) {
        preferences = await this.getCustomerPreferences(params.userId);
      }

      // Build search filters
      const filters = {
        services: parsedQuery.services,
        locality: parsedQuery.locality,
        rating: parsedQuery.minRating,
        gender: parsedQuery.gender,
        openNow: parsedQuery.openNow,
        priceRange: parsedQuery.priceRange
      };

      // Search salons
      const salons = await this.searchSalons({
        city: params.city || 'Bangalore',
        filters,
        limit: params.limit || 5
      });

      // Score and rank
      const recommendations = this.scoreSalons(salons, parsedQuery, preferences);

      logger.info('Discovery complete', {
        totalFound: salons.length,
        returned: recommendations.length,
        topMatch: recommendations[0]?.salon.name
      });

      return {
        success: true,
        recommendations: recommendations.slice(0, params.limit || 5),
        totalFound: salons.length,
        query: params.query,
        personalized: !!preferences,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Beauty discovery failed', { error: error.message });
      return { success: false, recommendations: [], totalFound: 0, query: params.query, personalized: false, timestamp: new Date().toISOString() };
    }
  }

  /**
   * Get personalized recommendations for customer
   */
  async getPersonalizedRecommendations(params: {
    customerId: string;
    location?: { latitude: number; longitude: number };
    limit?: number;
  }): Promise<SalonRecommendation[]> {
    try {
      const preferences = await this.getCustomerPreferences(params.customerId);
      if (!preferences) return this.getPopularSalons(params.limit || 5);

      const query = `salons for ${preferences.preferredServices?.join(', ') || 'beauty services'}`;
      const result = await this.discoverSalons({
        query,
        userId: params.customerId,
        preferences,
        latitude: params.location?.latitude,
        longitude: params.location?.longitude,
        limit: params.limit || 5
      });

      return result.recommendations;
    } catch (error: any) {
      logger.error('Personalized recommendations failed', { error: error.message });
      return [];
    }
  }

  /**
   * Get salon details with services
   */
  async getSalonDetails(salonId: string): Promise<Salon | null> {
    try {
      const response = await this.client.get(`/api/salons/${salonId}`);
      return response.data;
    } catch (error: any) {
      logger.error('Failed to get salon details', { error: error.message, salonId });
      return null;
    }
  }

  /**
   * Get services offered by salon
   */
  async getSalonServices(salonId: string): Promise<Array<{ id: string; name: string; price: number; duration: number; category: string }>> {
    try {
      const response = await this.client.get(`/api/salons/${salonId}/services`);
      return response.data.services || [];
    } catch (error: any) {
      logger.error('Failed to get salon services', { error: error.message, salonId });
      return [];
    }
  }

  /**
   * Book appointment
   */
  async bookAppointment(params: {
    salonId: string;
    customerId: string;
    serviceId: string;
    stylistId?: string;
    date: string;
    time: string;
  }): Promise<{ success: boolean; appointmentId?: string; error?: string }> {
    try {
      const response = await this.client.post('/api/appointments', {
        salonId: params.salonId,
        customerId: params.customerId,
        serviceId: params.serviceId,
        stylistId: params.stylistId,
        date: params.date,
        time: params.time
      });

      return { success: true, appointmentId: response.data.appointmentId };
    } catch (error: any) {
      logger.error('Booking failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  // ============ Private Methods ============

  private async getCustomerPreferences(customerId: string): Promise<CustomerPreferences | null> {
    try {
      const response = await this.client.get(`/api/customers/${customerId}/preferences`);
      return response.data;
    } catch {
      return null;
    }
  }

  private async searchSalons(params: {
    city: string;
    filters: { services?: string[]; locality?: string; rating?: number; gender?: string; openNow?: boolean; priceRange?: string };
    limit: number;
  }): Promise<Salon[]> {
    try {
      const queryParams: any = { city: params.city, limit: params.limit };
      if (params.filters.services?.length) queryParams.services = params.filters.services.join(',');
      if (params.filters.locality) queryParams.locality = params.filters.locality;
      if (params.filters.rating) queryParams.minRating = params.filters.rating;

      const response = await this.client.get('/api/salons', { params: queryParams });
      return response.data.salons || response.data || [];
    } catch (error: any) {
      logger.error('Salon search failed', { error: error.message });
      return [];
    }
  }

  private parseQuery(query: string): {
    services: string[];
    locality?: string;
    minRating?: number;
    gender?: string;
    openNow: boolean;
    priceRange?: string;
  } {
    const lower = query.toLowerCase();
    const result: any = { services: [], openNow: false };

    const serviceKeywords: Record<string, string[]> = {
      'haircut': ['haircut', 'hair cut', 'trim', 'styling'],
      'hair coloring': ['hair color', 'hair colouring', 'coloring', 'dye', 'highlights'],
      'facial': ['facial', 'clean up', 'glow', 'skin care'],
      'manicure': ['manicure', 'nail art', 'nails'],
      'pedicure': ['pedicure', 'foot care'],
      'massage': ['massage', 'spa', 'body massage'],
      'waxing': ['waxing', 'hair removal'],
      'bridal': ['bridal', 'wedding', 'makeup'],
      'makeup': ['makeup', 'make-up', 'mua']
    };

    for (const [service, keywords] of Object.entries(serviceKeywords)) {
      if (keywords.some(k => lower.includes(k))) result.services.push(service);
    }

    if (lower.includes('salon')) result.services.push('salon');
    if (lower.includes('spa')) result.services.push('spa');

    if (lower.includes('rating') && lower.match(/(\d+\.?\d*)\s*star/)) {
      result.minRating = parseFloat(lower.match(/(\d+\.?\d*)/)?.[1] || '4');
    }

    if (lower.includes('male') || lower.includes('gents') || lower.includes('barber')) result.gender = 'male';
    else if (lower.includes('female') || lower.includes('ladies')) result.gender = 'female';

    if (lower.includes('open') || lower.includes('now') || lower.includes('available')) result.openNow = true;

    if (lower.includes('cheap') || lower.includes('budget')) result.priceRange = 'budget';
    else if (lower.includes('premium') || lower.includes('luxury')) result.priceRange = 'premium';

    const localityMatch = lower.match(/(?:in|near|at)\s+([a-z\s]+?)(?:\s|,|$)/);
    if (localityMatch) result.locality = localityMatch[1].trim();

    return result;
  }

  private scoreSalons(salons: Salon[], query: any, preferences?: CustomerPreferences): SalonRecommendation[] {
    return salons.map(salon => {
      let score = 50;
      const reasons: string[] = [];
      const matchDetails = { serviceMatch: false, locationMatch: false, preferenceMatch: false, priceMatch: false };

      if (salon.rating >= 4.5) { score += 25; reasons.push('Excellent rating'); }
      else if (salon.rating >= 4.0) { score += 15; reasons.push('Good rating'); }

      if (query.services.some((s: string) => salon.services?.some(sv => sv.toLowerCase().includes(s)))) {
        score += 20;
        reasons.push('Matches requested services');
        matchDetails.serviceMatch = true;
      }

      if (preferences?.preferredServices?.some((s: string) => salon.services?.some(sv => sv.toLowerCase().includes(s)))) {
        score += 15;
        reasons.push('Based on your preferences');
        matchDetails.preferenceMatch = true;
      }

      if (preferences?.favoriteSalons?.includes(salon.id)) {
        score += 30;
        reasons.push('One of your favorites');
      }

      if (salon.isOpen) { score += 5; reasons.push('Currently open'); }

      return { salon, score: Math.min(100, score), reasons, matchDetails };
    }).sort((a, b) => b.score - a.score);
  }

  private async getPopularSalons(limit: number): Promise<SalonRecommendation[]> {
    try {
      const response = await this.client.get('/api/salons', { params: { featured: true, limit } });
      const salons = response.data.salons || response.data || [];
      return salons.map((s: Salon) => ({ salon: s, score: 80, reasons: ['Popular choice'], matchDetails: { serviceMatch: true, locationMatch: true, preferenceMatch: false, priceMatch: true } }));
    } catch {
      return [];
    }
  }

  async healthCheck(): Promise<{ healthy: boolean }> {
    try {
      await this.client.get('/health');
      return { healthy: true };
    } catch { return { healthy: false }; }
  }
}

export const beautyDiscoveryConnector = new BeautyDiscoveryConnector();
