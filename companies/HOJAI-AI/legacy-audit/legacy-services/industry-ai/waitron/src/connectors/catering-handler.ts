/**
 * Waitron → Corporate Catering Handler
 *
 * Handles corporate catering inquiries and generates RFQs
 * Connects HR Managers to restaurant partners
 *
 * Flow: HR Manager asks CoPilot → Catering Inquiry → RFQ → Restaurant Selection → Proposal
 *
 * @module waitron-catering-handler
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

export interface CateringInquiry {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  eventType: 'daily' | 'meeting' | 'corporate_event' | 'party' | 'training' | 'other';
  eventDate: string;
  eventTime: string;
  partySize: number;
  budget?: {
    perPerson?: number;
    total?: number;
    currency: string;
  };
  dietaryRequirements?: string[];
  cuisinePreference?: string[];
  location: {
    address: string;
    city: string;
    locality?: string;
    latitude?: number;
    longitude?: number;
  };
  deliveryRequired: boolean;
  setupRequired: boolean;
  additionalNotes?: string;
  status: 'pending' | 'matched' | 'quoted' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface RestaurantCapability {
  restaurantId: string;
  restaurantName: string;
  rating: number;
  capacity: {
    min: number;
    max: number;
    comfortable: number;
  };
  cuisine: string[];
  deliveryAvailable: boolean;
  cateringExperience: number; // years
  pastCorporateEvents: number;
  rating: number;
  services: string[];
  certifications?: string[];
  distance?: number; // km from event location
  priceRange: {
    min: number;
    max: number;
  };
  matchScore: number;
  matchReasons: string[];
}

export interface CateringQuote {
  id: string;
  inquiryId: string;
  restaurantId: string;
  restaurantName: string;
  items: Array<{
    name: string;
    description: string;
    quantity: number;
    unit: string;
    pricePerUnit: number;
    totalPrice: number;
  }>;
  menuPackage?: {
    name: string;
    description: string;
    itemsIncluded: string[];
  };
  subtotal: number;
  taxes: number;
  deliveryCharge: number;
  setupCharge: number;
  totalPrice: number;
  pricePerPerson: number;
  validUntil: string;
  estimatedPrepTime: string;
  specialTerms?: string[];
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  createdAt: string;
}

export interface CorporateMatchResult {
  success: boolean;
  inquiry: CateringInquiry;
  matchedRestaurants: RestaurantCapability[];
  rfqCreated: boolean;
  rfqId?: string;
  message: string;
  timestamp: string;
}

export interface CateringProposal {
  inquiry: CateringInquiry;
  recommendedRestaurant: RestaurantCapability;
  quote: CateringQuote;
  alternativeOptions: RestaurantCapability[];
}

export class CateringHandler {
  private restaurantClient: AxiosInstance;
  private nexhaClient: AxiosInstance;
  private copilotClient: AxiosInstance;

  // Service URLs
  private restaurantUrl: string;
  private nexhaUrl: string;
  private copilotUrl: string;

  constructor(config?: {
    restaurantUrl?: string;
    nexhaUrl?: string;
    copilotUrl?: string;
    logger?: winston.Logger;
  }) {
    this.restaurantUrl = config?.restaurantUrl || process.env.REZ_RESTAURANT_URL || 'http://localhost:4017';
    this.nexhaUrl = config?.nexhaUrl || process.env.NEXHA_URL || 'http://localhost:4399';
    this.copilotUrl = config?.copilotUrl || process.env.BUSINESS_COPILOT_URL || 'http://localhost:4002';

    this.restaurantClient = axios.create({
      baseURL: this.restaurantUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.nexhaClient = axios.create({
      baseURL: this.nexhaUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.copilotClient = axios.create({
      baseURL: this.copilotUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (config?.logger) {
      logger = config.logger;
    }

    logger.info('CateringHandler initialized', {
      restaurantUrl: this.restaurantUrl,
      nexhaUrl: this.nexhaUrl
    });
  }

  /**
   * Handle incoming corporate catering inquiry
   * Main entry point for the 2:00 PM flow in the story
   */
  async handleInquiry(params: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    eventType: CateringInquiry['eventType'];
    eventDate: string;
    eventTime: string;
    partySize: number;
    budget?: CateringInquiry['budget'];
    dietaryRequirements?: string[];
    cuisinePreference?: string[];
    location: CateringInquiry['location'];
    deliveryRequired?: boolean;
    setupRequired?: boolean;
    additionalNotes?: string;
  }): Promise<CorporateMatchResult> {
    try {
      logger.info('Processing catering inquiry', {
        companyName: params.companyName,
        partySize: params.partySize,
        eventDate: params.eventDate
      });

      // Step 1: Create inquiry record
      const inquiry = await this.createInquiry(params);

      // Step 2: Find matching restaurants
      const matchedRestaurants = await this.findMatchingRestaurants({
        partySize: params.partySize,
        eventType: params.eventType,
        cuisinePreference: params.cuisinePreference,
        location: params.location,
        budget: params.budget
      });

      if (matchedRestaurants.length === 0) {
        logger.warn('No matching restaurants found', { inquiryId: inquiry.id });
        return {
          success: false,
          inquiry,
          matchedRestaurants: [],
          rfqCreated: false,
          message: 'No restaurants found matching your requirements. Try adjusting party size or location.',
          timestamp: new Date().toISOString()
        };
      }

      // Step 3: Create RFQ via Nexha
      const rfqResult = await this.createRFQ(inquiry, matchedRestaurants);

      // Step 4: Notify top matched restaurants
      await this.notifyMatchedRestaurants(inquiry, matchedRestaurants.slice(0, 3));

      logger.info('Catering inquiry processed', {
        inquiryId: inquiry.id,
        matchedCount: matchedRestaurants.length,
        rfqId: rfqResult?.id
      });

      return {
        success: true,
        inquiry,
        matchedRestaurants,
        rfqCreated: !!rfqResult,
        rfqId: rfqResult?.id,
        message: `Found ${matchedRestaurants.length} restaurants that can handle your ${params.partySize}-person ${params.eventType}.`,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      logger.error('Catering inquiry handling failed', { error: error.message });
      return {
        success: false,
        inquiry: {} as CateringInquiry,
        matchedRestaurants: [],
        rfqCreated: false,
        message: 'Failed to process catering inquiry. Please try again.',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Find restaurants that can handle the catering event
   */
  async findMatchingRestaurants(params: {
    partySize: number;
    eventType: CateringInquiry['eventType'];
    cuisinePreference?: string[];
    location: CateringInquiry['location'];
    budget?: CateringInquiry['budget'];
  }): Promise<RestaurantCapability[]> {
    try {
      logger.info('Finding matching restaurants', {
        partySize: params.partySize,
        eventType: params.eventType
      });

      // Get all catering-capable restaurants
      const response = await this.restaurantClient.get('/api/restaurants', {
        params: {
          catering: true,
          limit: 50
        }
      });

      const restaurants = response.data.restaurants || response.data || [];

      // Score and filter restaurants
      const scored: RestaurantCapability[] = [];

      for (const restaurant of restaurants) {
        const capability = await this.assessCapability(restaurant, params);

        if (capability && capability.matchScore > 40) {
          scored.push(capability);
        }
      }

      // Sort by score
      scored.sort((a, b) => b.matchScore - a.matchScore);

      logger.info('Restaurants scored', {
        total: restaurants.length,
        matched: scored.length
      });

      return scored;
    } catch (error: any) {
      logger.error('Restaurant matching failed', { error: error.message });
      return [];
    }
  }

  /**
   * Assess restaurant's capability for the event
   */
  private async assessCapability(
    restaurant: any,
    params: {
      partySize: number;
      eventType: CateringInquiry['eventType'];
      cuisinePreference?: string[];
      location: CateringInquiry['location'];
      budget?: CateringInquiry['budget'];
    }
  ): Promise<RestaurantCapability | null> {
    let score = 50;
    const reasons: string[] = [];

    // Capacity check (0-30 points)
    const capacity = restaurant.capacity || { min: 10, max: 100, comfortable: 50 };
    if (params.partySize >= capacity.min && params.partySize <= capacity.max) {
      score += 30;
      reasons.push(`Capacity for ${params.partySize} people`);
    } else if (params.partySize <= capacity.max * 1.2) {
      score += 15;
      reasons.push('Slightly over comfortable capacity but manageable');
    } else {
      return null; // Too small
    }

    // Cuisine match (0-25 points)
    if (params.cuisinePreference?.length) {
      const restCuisines = (restaurant.cuisine || []).map((c: string) => c.toLowerCase());
      const matches = params.cuisinePreference.filter(c =>
        restCuisines.some(rc => rc.includes(c.toLowerCase()) || c.toLowerCase().includes(rc))
      );
      if (matches.length > 0) {
        score += 25;
        reasons.push(`Serves ${matches.join(', ')} cuisine`);
      }
    }

    // Distance check (0-15 points)
    if (restaurant.latitude && restaurant.longitude && params.location.latitude && params.location.longitude) {
      const distance = this.calculateDistance(
        params.location.latitude,
        params.location.longitude,
        restaurant.latitude,
        restaurant.longitude
      );

      if (distance < 5) {
        score += 15;
        reasons.push(`${distance.toFixed(1)} km away - quick delivery`);
      } else if (distance < 15) {
        score += 10;
        reasons.push(`${distance.toFixed(1)} km away`);
      } else if (distance < 30) {
        score += 5;
        reasons.push('Delivery available');
      } else {
        score -= 10; // Too far
      }
    }

    // Rating (0-15 points)
    if (restaurant.rating) {
      if (restaurant.rating >= 4.5) {
        score += 15;
        reasons.push('Highly rated');
      } else if (restaurant.rating >= 4.0) {
        score += 10;
        reasons.push('Good ratings');
      } else if (restaurant.rating >= 3.5) {
        score += 5;
      }
    }

    // Budget check (0-10 points)
    if (params.budget?.perPerson && restaurant.priceRange) {
      if (restaurant.priceRange.min <= params.budget.perPerson) {
        score += 10;
        reasons.push('Within budget');
      } else if (restaurant.priceRange.min <= params.budget.perPerson * 1.2) {
        score += 5;
        reasons.push('Slightly over budget');
      }
    }

    // Catering experience bonus
    if (restaurant.cateringExperience && restaurant.cateringExperience >= 3) {
      score += 10;
      reasons.push(`${restaurant.cateringExperience} years catering experience`);
    }

    // Corporate events bonus
    if (restaurant.corporateEvents && restaurant.corporateEvents >= 10) {
      score += 5;
      reasons.push(`${restaurant.corporateEvents} past corporate events`);
    }

    return {
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      rating: restaurant.rating || 3.5,
      capacity: {
        min: capacity.min,
        max: capacity.max,
        comfortable: capacity.comfortable || capacity.max * 0.7
      },
      cuisine: restaurant.cuisine || [],
      deliveryAvailable: restaurant.deliveryAvailable || true,
      cateringExperience: restaurant.cateringExperience || 1,
      pastCorporateEvents: restaurant.corporateEvents || 0,
      services: restaurant.services || ['delivery'],
      certifications: restaurant.certifications,
      priceRange: {
        min: restaurant.priceRange?.min || 150,
        max: restaurant.priceRange?.max || 500
      },
      matchScore: Math.min(100, score),
      matchReasons: reasons
    };
  }

  /**
   * Create inquiry record
   */
  private async createInquiry(params: {
    companyName: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    eventType: CateringInquiry['eventType'];
    eventDate: string;
    eventTime: string;
    partySize: number;
    budget?: CateringInquiry['budget'];
    dietaryRequirements?: string[];
    cuisinePreference?: string[];
    location: CateringInquiry['location'];
    deliveryRequired?: boolean;
    setupRequired?: boolean;
    additionalNotes?: string;
  }): Promise<CateringInquiry> {
    // In production, this would save to database
    const inquiry: CateringInquiry = {
      id: `INQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      companyName: params.companyName,
      contactName: params.contactName,
      contactEmail: params.contactEmail,
      contactPhone: params.contactPhone,
      eventType: params.eventType,
      eventDate: params.eventDate,
      eventTime: params.eventTime,
      partySize: params.partySize,
      budget: params.budget || { currency: 'INR' },
      dietaryRequirements: params.dietaryRequirements,
      cuisinePreference: params.cuisinePreference,
      location: params.location,
      deliveryRequired: params.deliveryRequired ?? true,
      setupRequired: params.setupRequired ?? false,
      additionalNotes: params.additionalNotes,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    logger.info('Catering inquiry created', { inquiryId: inquiry.id });

    return inquiry;
  }

  /**
   * Create RFQ via Nexha
   */
  private async createRFQ(
    inquiry: CateringInquiry,
    restaurants: RestaurantCapability[]
  ): Promise<{ id: string } | null> {
    try {
      const response = await this.nexhaClient.post('/api/rfqs', {
        type: 'catering',
        merchant_id: inquiry.contactEmail, // Using email as merchant ID for corporate
        source: 'waitron-catering',
        items: [
          {
            product_name: `${inquiry.eventType} catering for ${inquiry.partySize} people`,
            quantity: inquiry.partySize,
            unit: 'persons',
            description: `${inquiry.eventType} event on ${inquiry.eventDate} at ${inquiry.location.address}`
          }
        ],
        valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        metadata: {
          inquiryId: inquiry.id,
          companyName: inquiry.companyName,
          dietaryRequirements: inquiry.dietaryRequirements,
          cuisinePreference: inquiry.cuisinePreference,
          deliveryRequired: inquiry.deliveryRequired,
          setupRequired: inquiry.setupRequired
        }
      });

      logger.info('RFQ created via Nexha', { rfqId: response.data?.id });

      return response.data;
    } catch (error: any) {
      logger.warn('Nexha RFQ creation failed, using local RFQ', { error: error.message });
      return { id: `RFQ-${Date.now()}` };
    }
  }

  /**
   * Notify matched restaurants about the inquiry
   */
  private async notifyMatchedRestaurants(
    inquiry: CateringInquiry,
    restaurants: RestaurantCapability[]
  ): Promise<void> {
    for (const restaurant of restaurants) {
      try {
        await this.restaurantClient.post(`/api/restaurants/${restaurant.restaurantId}/catering-inquiries`, {
          inquiryId: inquiry.id,
          inquiry
        });
        logger.info('Restaurant notified', {
          restaurantId: restaurant.restaurantId,
          inquiryId: inquiry.id
        });
      } catch (error: any) {
        logger.warn('Failed to notify restaurant', {
          restaurantId: restaurant.restaurantId,
          error: error.message
        });
      }
    }
  }

  /**
   * Generate catering quote for a restaurant
   */
  async generateQuote(params: {
    inquiryId: string;
    restaurantId: string;
    menuPackage?: {
      name: string;
      description: string;
      items: string[];
      pricePerPerson: number;
    };
    customItems?: Array<{
      name: string;
      description: string;
      quantity: number;
      unit: string;
      pricePerUnit: number;
    }>;
    deliveryCharge?: number;
    setupCharge?: number;
    validDays?: number;
  }): Promise<CateringQuote | null> {
    try {
      logger.info('Generating catering quote', {
        inquiryId: params.inquiryId,
        restaurantId: params.restaurantId
      });

      // Get restaurant details
      const restaurantRes = await this.restaurantClient.get(`/api/restaurants/${params.restaurantId}`);
      const restaurant = restaurantRes.data;

      if (!restaurant) {
        return null;
      }

      // Calculate items and prices
      const items: CateringQuote['items'] = [];
      let subtotal = 0;

      if (params.menuPackage) {
        items.push({
          name: params.menuPackage.name,
          description: params.menuPackage.description,
          quantity: 1,
          unit: 'package',
          pricePerUnit: params.menuPackage.pricePerPerson,
          totalPrice: params.menuPackage.pricePerPerson
        });
        subtotal = params.menuPackage.pricePerPerson;
      }

      if (params.customItems) {
        for (const item of params.customItems) {
          const total = item.quantity * item.pricePerUnit;
          items.push({
            ...item,
            totalPrice: total
          });
          subtotal += total;
        }
      }

      const taxes = subtotal * 0.18; // 18% GST
      const deliveryCharge = params.deliveryCharge || 0;
      const setupCharge = params.setupCharge || 0;
      const totalPrice = subtotal + taxes + deliveryCharge + setupCharge;

      // Get party size from inquiry (stored in memory/cache)
      const partySize = 100; // Would come from inquiry record

      const quote: CateringQuote = {
        id: `QUOTE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        inquiryId: params.inquiryId,
        restaurantId: params.restaurantId,
        restaurantName: restaurant.name,
        items,
        menuPackage: params.menuPackage ? {
          name: params.menuPackage.name,
          description: params.menuPackage.description,
          itemsIncluded: params.menuPackage.items
        } : undefined,
        subtotal,
        taxes,
        deliveryCharge,
        setupCharge,
        totalPrice,
        pricePerPerson: totalPrice / partySize,
        validUntil: new Date(Date.now() + (params.validDays || 7) * 24 * 60 * 60 * 1000).toISOString(),
        estimatedPrepTime: this.estimatePrepTime(partySize),
        status: 'draft',
        createdAt: new Date().toISOString()
      };

      logger.info('Quote generated', {
        quoteId: quote.id,
        totalPrice: quote.totalPrice
      });

      return quote;
    } catch (error: any) {
      logger.error('Quote generation failed', { error: error.message });
      return null;
    }
  }

  /**
   * Handle natural language catering request from CoPilot
   */
  async handleNaturalLanguageRequest(params: {
    request: string;
    userId?: string;
    userContext?: {
      companyName?: string;
      userName?: string;
      email?: string;
      phone?: string;
    };
  }): Promise<{
    understood: boolean;
    inquiry?: Partial<CateringInquiry>;
    needsClarification?: string[];
    result?: CorporateMatchResult;
  }> {
    try {
      // Parse natural language request
      const parsed = this.parseCateringRequest(params.request);

      // Check for missing required fields
      const missing: string[] = [];
      if (!parsed.partySize) missing.push('number of people');
      if (!parsed.eventDate) missing.push('event date');
      if (!parsed.location) missing.push('delivery address');

      if (missing.length > 0) {
        return {
          understood: true,
          inquiry: parsed,
          needsClarification: missing
        };
      }

      // Build full inquiry with user context
      const fullInquiry = {
        ...parsed,
        companyName: parsed.companyName || params.userContext?.companyName || 'Corporate Client',
        contactName: params.userContext?.userName || 'HR Manager',
        contactEmail: params.userContext?.email || 'hr@company.com',
        contactPhone: params.userContext?.phone || ''
      };

      // Process the inquiry
      const result = await this.handleInquiry(fullInquiry);

      return {
        understood: true,
        inquiry: fullInquiry,
        result
      };
    } catch (error: any) {
      logger.error('Natural language parsing failed', { error: error.message });
      return {
        understood: false,
        needsClarification: ['Could not understand request. Please provide details.']
      };
    }
  }

  /**
   * Parse natural language catering request
   */
  private parseCateringRequest(request: string): Partial<CateringInquiry> {
    const lower = request.toLowerCase();

    const result: Partial<CateringInquiry> = {
      status: 'pending'
    };

    // Extract party size
    const partyMatch = lower.match(/(\d+)\s*(?:people|persons|heads|guests)/);
    if (partyMatch) {
      result.partySize = parseInt(partyMatch[1]);
    }

    // Extract date
    const datePatterns = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, // DD/MM/YYYY
      /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?/i, // January 15
      /tomorrow/i,
      /next\s+(\w+)/i
    ];

    for (const pattern of datePatterns) {
      const match = lower.match(pattern);
      if (match) {
        // Simplified date extraction - would need more robust implementation
        result.eventDate = new Date().toISOString().split('T')[0];
        break;
      }
    }

    // Extract event type
    if (lower.includes('meeting')) result.eventType = 'meeting';
    else if (lower.includes('party')) result.eventType = 'party';
    else if (lower.includes('training')) result.eventType = 'training';
    else if (lower.includes('event')) result.eventType = 'corporate_event';
    else result.eventType = 'daily';

    // Extract cuisine
    const cuisines = ['indian', 'chinese', 'italian', 'continental', 'south indian', 'north indian'];
    result.cuisinePreference = cuisines.filter(c => lower.includes(c));

    // Extract location (simplified)
    const locationMatch = lower.match(/in\s+([a-z\s]+?)(?:\s+on|$|,)/i);
    if (locationMatch) {
      result.location = {
        address: locationMatch[1].trim(),
        city: 'Bangalore' // Default city
      };
    }

    // Extract delivery requirement
    result.deliveryRequired = !lower.includes('pickup');

    return result;
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
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
   * Estimate prep time based on party size
   */
  private estimatePrepTime(partySize: number): string {
    if (partySize <= 50) return '2 hours';
    if (partySize <= 100) return '3 hours';
    if (partySize <= 200) return '4 hours';
    return '5+ hours';
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    restaurant: boolean;
    nexha: boolean;
  }> {
    const [restaurantHealth, nexhaHealth] = await Promise.all([
      this.restaurantClient.get('/health').then(() => true).catch(() => false),
      this.nexhaClient.get('/health').then(() => true).catch(() => false)
    ]);

    return {
      healthy: restaurantHealth || nexhaHealth,
      restaurant: restaurantHealth,
      nexha: nexhaHealth
    };
  }
}

// Export singleton instance
export const cateringHandler = new CateringHandler();

export default CateringHandler;