import axios, { AxiosInstance } from 'axios';
import { PropertyProfile } from '../models/PropertyProfile';

/**
 * CustomerOpsBridge Service
 * Handles communication with Customer Twins (Asset, Customer, Lead)
 */

interface TwinConfig {
  url: string;
  timeout: number;
}

interface CustomerProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  type: 'buyer' | 'seller' | 'renter' | 'landlord' | 'prospect' | 'lead';
  interests?: string[];
  stage?: string;
  source?: string;
  metadata?: Record<string, any>;
}

interface LeadData {
  id?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  source: string;
  interest: string;
  propertyId?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  priority: 'low' | 'medium' | 'high';
  notes?: string;
  createdAt: string;
}

interface BookingData {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  propertyId: string;
  bookingDate: string;
  bookingTime: string;
  purpose: string;
  status: string;
  notes?: string;
}

interface InquiryData {
  id: string;
  customerId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  propertyId?: string;
  inquiryType: string;
  message: string;
  source?: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface NotificationPayload {
  type: string;
  message: string;
  channel?: 'email' | 'sms' | 'push' | 'in_app';
  metadata?: Record<string, any>;
}

export class CustomerOpsBridge {
  private assetTwinClient: AxiosInstance;
  private customerTwinClient: AxiosInstance;
  private leadTwinClient: AxiosInstance;
  private areaTwinClient: AxiosInstance;
  private eventBusClient: AxiosInstance;
  private logger: any;

  constructor(logger: any) {
    this.logger = logger;

    // Initialize twin clients
    this.assetTwinClient = axios.create({
      baseURL: process.env.ASSET_TWIN_URL || 'http://localhost:3015',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.customerTwinClient = axios.create({
      baseURL: process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.leadTwinClient = axios.create({
      baseURL: process.env.LEAD_TWIN_URL || 'http://localhost:3018',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.areaTwinClient = axios.create({
      baseURL: process.env.AREA_TWIN_URL || 'http://localhost:3019',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.eventBusClient = axios.create({
      baseURL: process.env.EVENT_BUS_URL || 'http://localhost:4510',
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.logger.info('CustomerOpsBridge initialized with twin connections');
  }

  /**
   * Check health of a specific twin
   */
  async checkTwinHealth(twinName: string): Promise<boolean> {
    try {
      const clients = {
        assetTwin: this.assetTwinClient,
        customerTwin: this.customerTwinClient,
        leadTwin: this.leadTwinClient,
        areaTwin: this.areaTwinClient
      };

      const client = clients[twinName as keyof typeof clients];
      if (!client) return false;

      await client.get('/health');
      return true;
    } catch (error) {
      this.logger.warn(`Twin health check failed for ${twinName}:`, error);
      return false;
    }
  }

  // ==================== Asset Twin Operations ====================

  /**
   * Sync property to Asset Twin
   */
  async syncPropertyToAssetTwin(property: PropertyProfile): Promise<{ success: boolean; twinId?: string; error?: string }> {
    try {
      const assetData = this.transformPropertyToAsset(property);

      const response = await this.assetTwinClient.post('/api/assets', assetData);

      this.logger.info(`Property ${property.id} synced to Asset Twin as ${response.data.id}`);

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      this.logger.error(`Failed to sync property to Asset Twin:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Update property in Asset Twin
   */
  async updatePropertyInAssetTwin(twinId: string, property: PropertyProfile): Promise<boolean> {
    try {
      const assetData = this.transformPropertyToAsset(property);

      await this.assetTwinClient.put(`/api/assets/${twinId}`, assetData);

      this.logger.info(`Property ${property.id} updated in Asset Twin`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update property in Asset Twin:`, error.message);
      return false;
    }
  }

  /**
   * Remove property from Asset Twin
   */
  async removePropertyFromAssetTwin(twinId: string): Promise<boolean> {
    try {
      await this.assetTwinClient.delete(`/api/assets/${twinId}`);

      this.logger.info(`Property removed from Asset Twin: ${twinId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to remove property from Asset Twin:`, error.message);
      return false;
    }
  }

  /**
   * Transform PropertyProfile to Asset Twin format
   */
  private transformPropertyToAsset(property: PropertyProfile) {
    return {
      id: property.twinId,
      assetType: 'real_estate',
      assetSubType: property.details.propertyType,
      name: property.title,
      description: property.description,
      value: property.pricing.price,
      currency: property.pricing.currency,
      location: {
        address: property.location.address,
        city: property.location.city,
        state: property.location.state,
        country: property.location.country,
        pincode: property.location.pincode,
        coordinates: property.location.coordinates
      },
      specifications: {
        area: property.details.carpetArea,
        areaUnit: property.details.carpetAreaUnit,
        bedrooms: property.details.bedrooms,
        bathrooms: property.details.bathrooms,
        furnished: property.amenities.furnished,
        amenities: property.amenities.amenities || []
      },
      status: property.status === 'active' ? 'available' : property.status,
      listingType: property.listingType,
      media: property.media.map(m => ({
        type: m.type,
        url: m.url,
        caption: m.caption
      })),
      metadata: {
        listingId: property.listingId,
        ownerId: property.ownership.ownerName,
        tags: property.tags,
        views: property.analytics.views,
        inquiries: property.analytics.inquiries
      },
      source: 'risnaestate',
      sourceId: property.id
    };
  }

  // ==================== Customer Twin Operations ====================

  /**
   * Create or update customer in Customer Twin
   */
  async createOrUpdateCustomer(customer: CustomerProfile): Promise<{ success: boolean; twinId?: string }> {
    try {
      const response = await this.customerTwinClient.post('/api/customers', {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        type: customer.type,
        interests: customer.interests,
        stage: customer.stage || 'prospect',
        source: customer.source,
        metadata: customer.metadata
      });

      this.logger.info(`Customer ${customer.id} synced to Customer Twin`);

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      this.logger.error(`Failed to sync customer to Customer Twin:`, error.message);
      return { success: false };
    }
  }

  /**
   * Update customer stage in Customer Twin
   */
  async updateCustomerStage(customerId: string, stage: string): Promise<boolean> {
    try {
      await this.customerTwinClient.patch(`/api/customers/${customerId}`, {
        stage
      });

      this.logger.info(`Customer ${customerId} stage updated to ${stage}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update customer stage:`, error.message);
      return false;
    }
  }

  /**
   * Sync booking to Customer Twin
   */
  async syncBookingToCustomer(booking: BookingData): Promise<boolean> {
    try {
      await this.customerTwinClient.post('/api/activities', {
        type: 'site_visit',
        customerId: booking.customerId,
        relatedEntity: {
          type: 'property',
          id: booking.propertyId
        },
        date: booking.bookingDate,
        time: booking.bookingTime,
        status: booking.status,
        notes: booking.notes,
        metadata: {
          bookingId: booking.id,
          purpose: booking.purpose
        }
      });

      this.logger.info(`Booking ${booking.id} synced to Customer Twin`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to sync booking to Customer Twin:`, error.message);
      return false;
    }
  }

  /**
   * Sync feedback to Customer Twin
   */
  async syncFeedbackToCustomer(booking: any): Promise<boolean> {
    try {
      await this.customerTwinClient.post('/api/feedback', {
        customerId: booking.customerId,
        type: 'site_visit',
        relatedEntity: {
          type: 'property',
          id: booking.propertyId
        },
        rating: booking.feedback?.rating,
        comments: booking.feedback?.comments,
        metadata: {
          bookingId: booking.id
        }
      });

      this.logger.info(`Feedback for booking ${booking.id} synced to Customer Twin`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to sync feedback:`, error.message);
      return false;
    }
  }

  /**
   * Create customer from property inquiry
   */
  async createCustomerFromInquiry(property: PropertyProfile, inquiry: any): Promise<boolean> {
    try {
      await this.customerTwinClient.post('/api/customers', {
        name: inquiry.customerName,
        email: inquiry.customerEmail,
        phone: inquiry.customerPhone,
        type: 'prospect',
        interests: [property.id],
        stage: 'inquiry',
        metadata: {
          source: 'property_inquiry',
          propertyId: property.id,
          inquiryId: inquiry.id,
          inquiryType: inquiry.interestType
        }
      });

      this.logger.info(`Customer created from inquiry ${inquiry.id}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to create customer from inquiry:`, error.message);
      return false;
    }
  }

  /**
   * Update inquiry in Customer Twin
   */
  async updateInquiryInCustomer(inquiry: InquiryData): Promise<boolean> {
    try {
      await this.customerTwinClient.patch(`/api/customers/${inquiry.customerId}/inquiries/${inquiry.id}`, {
        status: inquiry.status,
        priority: inquiry.priority,
        notes: inquiry.notes
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update inquiry in Customer Twin:`, error.message);
      return false;
    }
  }

  /**
   * Notify customer via Customer Twin
   */
  async notifyCustomer(customerId: string | undefined, notification: NotificationPayload): Promise<boolean> {
    if (!customerId) return false;

    try {
      await this.customerTwinClient.post('/api/notifications', {
        customerId,
        ...notification
      });

      this.logger.info(`Notification sent to customer ${customerId}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send notification:`, error.message);
      return false;
    }
  }

  // ==================== Lead Twin Operations ====================

  /**
   * Create lead from inquiry
   */
  async createLeadFromInquiry(inquiry: InquiryData): Promise<{ success: boolean; leadId?: string }> {
    try {
      const response = await this.leadTwinClient.post('/api/leads', {
        customerId: inquiry.customerId,
        customerName: inquiry.customerName,
        customerEmail: inquiry.customerEmail,
        customerPhone: inquiry.customerPhone,
        source: inquiry.source || 'inquiry',
        interest: inquiry.propertyId || 'general',
        propertyId: inquiry.propertyId,
        status: 'new',
        priority: inquiry.priority,
        notes: inquiry.message,
        createdAt: inquiry.createdAt
      });

      this.logger.info(`Lead created from inquiry ${inquiry.id}`);
      return {
        success: true,
        leadId: response.data.id
      };
    } catch (error: any) {
      this.logger.error(`Failed to create lead from inquiry:`, error.message);
      return { success: false };
    }
  }

  /**
   * Create lead from property
   */
  async createLeadFromProperty(property: PropertyProfile): Promise<{ success: boolean; leadId?: string }> {
    if (!property.customerId) return { success: false };

    try {
      const response = await this.leadTwinClient.post('/api/leads', {
        customerId: property.customerId,
        customerName: property.ownership.ownerName,
        customerEmail: property.ownership.ownerEmail,
        customerPhone: property.ownership.ownerContact,
        source: 'property_listing',
        interest: property.id,
        propertyId: property.id,
        status: 'new',
        priority: 'medium',
        notes: `Property listing: ${property.title}`,
        createdAt: property.createdAt
      });

      this.logger.info(`Lead created for property ${property.id}`);
      return {
        success: true,
        leadId: response.data.id
      };
    } catch (error: any) {
      this.logger.error(`Failed to create lead from property:`, error.message);
      return { success: false };
    }
  }

  // ==================== Area Twin Operations ====================

  /**
   * Get area insights from Area Twin
   */
  async getAreaInsights(city: string, locality?: string): Promise<any> {
    try {
      const params: any = { city };
      if (locality) params.locality = locality;

      const response = await this.areaTwinClient.get('/api/areas/insights', { params });

      return response.data;
    } catch (error: any) {
      this.logger.error(`Failed to get area insights:`, error.message);
      return null;
    }
  }

  /**
   * Get comparable properties from Area Twin
   */
  async getComparableProperties(propertyId: string): Promise<any[]> {
    try {
      const response = await this.areaTwinClient.get(`/api/areas/comparables/${propertyId}`);

      return response.data || [];
    } catch (error: any) {
      this.logger.error(`Failed to get comparable properties:`, error.message);
      return [];
    }
  }

  // ==================== Event Bus Operations ====================

  /**
   * Publish inquiry event to Event Bus
   */
  async publishInquiryEvent(inquiry: InquiryData): Promise<boolean> {
    try {
      await this.eventBusClient.post('/api/events', {
        eventType: 'realestate.inquiry.created',
        payload: {
          inquiryId: inquiry.id,
          customerId: inquiry.customerId,
          propertyId: inquiry.propertyId,
          inquiryType: inquiry.inquiryType,
          priority: inquiry.priority,
          source: inquiry.source
        },
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Inquiry event published: ${inquiry.id}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to publish inquiry event:`, error.message);
      return false;
    }
  }

  /**
   * Publish property event to Event Bus
   */
  async publishPropertyEvent(property: PropertyProfile, eventType: string): Promise<boolean> {
    try {
      await this.eventBusClient.post('/api/events', {
        eventType: `realestate.property.${eventType}`,
        payload: {
          propertyId: property.id,
          listingId: property.listingId,
          status: property.status,
          price: property.pricing.price,
          city: property.location.city
        },
        timestamp: new Date().toISOString()
      });

      this.logger.info(`Property event published: ${property.id} - ${eventType}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to publish property event:`, error.message);
      return false;
    }
  }

  /**
   * Subscribe to twin updates
   */
  async subscribeToTwinUpdates(callback: (event: any) => void): Promise<void> {
    // This would connect to Event Bus WebSocket in production
    this.logger.info('Subscribed to twin updates (stub - implement WebSocket in production)');
  }
}
