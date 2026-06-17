import axios from 'axios';
import { GuestProfile, RestaurantOrder, Review } from '../models/HospitalityProfile';

interface TwinSyncResult {
  success: boolean;
  twinId?: string;
  error?: string;
}

interface IntegrationStatus {
  name: string;
  url: string;
  connected: boolean;
  lastCheck?: string;
  error?: string;
}

export class CustomerOpsBridge {
  private assetTwinUrl: string;
  private customerTwinUrl: string;
  private orderTwinUrl: string;
  private feedbackTwinUrl: string;
  private serviceRegistryUrl: string;
  private eventBusUrl: string;

  private guestCache: Map<string, GuestProfile> = new Map();

  constructor() {
    this.assetTwinUrl = process.env.ASSET_TWIN_URL || 'http://localhost:3015';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    this.orderTwinUrl = process.env.ORDER_TWIN_URL || 'http://localhost:3018';
    this.feedbackTwinUrl = process.env.FEEDBACK_TWIN_URL || 'http://localhost:3019';
    this.serviceRegistryUrl = process.env.SERVICE_REGISTRY_URL || 'http://localhost:4399';
    this.eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';
  }

  // Register service with service registry
  async registerService(): Promise<void> {
    try {
      await axios.post(`${this.serviceRegistryUrl}/api/services`, {
        name: 'hospitality-integration',
        port: 4964,
        url: `http://localhost:4964`,
        healthEndpoint: '/health',
        capabilities: [
          'hotel-bookings',
          'restaurant-orders',
          'guest-profiles',
          'asset-sync',
          'customer-sync',
          'feedback-sync'
        ],
        dependencies: [
          'hotel-os',
          'restaurant-os',
          'stayown-hospitality',
          'asset-twin',
          'customer-twin',
          'order-twin',
          'feedback-twin'
        ]
      });
      console.log('[CustomerOpsBridge] Registered with service registry');
    } catch (error) {
      console.log('[CustomerOpsBridge] Service registry not available, running standalone');
    }
  }

  // Sync guest profile to Customer Twin
  async syncToCustomerTwin(guest: GuestProfile): Promise<TwinSyncResult> {
    try {
      const response = await axios.post(`${this.customerTwinUrl}/api/customers`, {
        externalId: guest.id,
        customerTwinId: guest.customerTwinId,
        firstName: guest.firstName,
        lastName: guest.lastName,
        email: guest.email,
        phone: guest.phone,
        preferences: guest.preferences,
        totalStays: guest.totalStays,
        totalSpent: guest.totalSpent,
        loyaltyTier: guest.loyaltyTier,
        vipStatus: guest.vipStatus,
        source: 'hospitality-integration',
        syncedAt: new Date().toISOString()
      });

      // Cache the guest
      this.guestCache.set(guest.id, guest);

      // Publish event
      await this.publishEvent('guest.profile.updated', {
        guestId: guest.id,
        customerTwinId: response.data.id,
        action: 'upsert',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      console.error('[CustomerOpsBridge] Failed to sync to Customer Twin:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync order to Order Twin
  async syncToOrderTwin(order: RestaurantOrder): Promise<TwinSyncResult> {
    try {
      const response = await axios.post(`${this.orderTwinUrl}/api/orders`, {
        externalId: order.id,
        orderTwinId: order.orderTwinId,
        guestId: order.guestId,
        restaurantId: order.restaurantId,
        restaurantName: order.restaurantName,
        items: order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.unitPrice
        })),
        subtotal: order.subtotal,
        tax: order.tax,
        tip: order.tip,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        orderType: order.orderType,
        status: order.status,
        createdAt: order.createdAt,
        source: 'hospitality-integration',
        syncedAt: new Date().toISOString()
      });

      // Publish event
      await this.publishEvent('restaurant.order.created', {
        orderId: order.id,
        orderTwinId: response.data.id,
        guestId: order.guestId,
        restaurantId: order.restaurantId,
        totalAmount: order.totalAmount,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      console.error('[CustomerOpsBridge] Failed to sync to Order Twin:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync review to Feedback Twin
  async syncToFeedbackTwin(review: any): Promise<TwinSyncResult> {
    try {
      const response = await axios.post(`${this.feedbackTwinUrl}/api/feedback`, {
        externalId: review.id,
        feedbackTwinId: review.feedbackTwinId,
        guestId: review.guestId,
        guestName: review.guestName,
        type: review.type,
        orderId: review.orderId,
        rating: review.rating,
        title: review.title,
        content: review.content,
        pros: review.pros,
        cons: review.cons,
        wouldRecommend: review.wouldRecommend,
        status: review.status,
        createdAt: review.createdAt,
        source: 'hospitality-integration',
        syncedAt: new Date().toISOString()
      });

      // Publish event
      await this.publishEvent('feedback.review.created', {
        reviewId: review.id,
        feedbackTwinId: response.data.id,
        guestId: review.guestId,
        type: review.type,
        rating: review.rating,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      console.error('[CustomerOpsBridge] Failed to sync to Feedback Twin:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get guest from Customer Twin
  async getGuestById(guestId: string): Promise<GuestProfile | null> {
    // Check cache first
    if (this.guestCache.has(guestId)) {
      return this.guestCache.get(guestId)!;
    }

    try {
      const response = await axios.get(`${this.customerTwinUrl}/api/customers`, {
        params: { externalId: guestId }
      });

      if (response.data) {
        const guest: GuestProfile = {
          id: response.data.externalId,
          customerTwinId: response.data.id,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          email: response.data.email,
          phone: response.data.phone,
          preferences: response.data.preferences,
          stayHistory: [],
          diningHistory: [],
          totalStays: response.data.totalStays,
          totalSpent: response.data.totalSpent,
          loyaltyTier: response.data.loyaltyTier,
          vipStatus: response.data.vipStatus,
          createdAt: response.data.createdAt,
          updatedAt: response.data.updatedAt
        };

        this.guestCache.set(guestId, guest);
        return guest;
      }

      return null;
    } catch (error) {
      console.error('[CustomerOpsBridge] Failed to get guest from Customer Twin:', error);
      return null;
    }
  }

  // Get hotel stats from Customer Twin
  async getHotelStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.customerTwinUrl}/api/stats/hotel`);
      return response.data;
    } catch (error) {
      // Return mock stats
      return {
        totalBookings: 245,
        activeBookings: 18,
        totalRevenue: 156780,
        averageRating: 4.5,
        occupancyRate: 78.5
      };
    }
  }

  // Get restaurant stats
  async getRestaurantStats(): Promise<any> {
    try {
      const response = await axios.get(`${this.orderTwinUrl}/api/stats`);
      return response.data;
    } catch (error) {
      return {
        totalOrders: 1234,
        totalRevenue: 45678,
        averageOrderValue: 37.02,
        repeatCustomers: 234
      };
    }
  }

  // Get guest stats
  async getGuestStats(): Promise<any> {
    const guests = Array.from(this.guestCache.values());
    const vipGuests = guests.filter(g => g.vipStatus);

    return {
      totalGuests: guests.length,
      vipGuests: vipGuests.length,
      byTier: {
        platinum: guests.filter(g => g.loyaltyTier === 'platinum').length,
        gold: guests.filter(g => g.loyaltyTier === 'gold').length,
        silver: guests.filter(g => g.loyaltyTier === 'silver').length,
        bronze: guests.filter(g => g.loyaltyTier === 'bronze').length
      }
    };
  }

  // Check integration status
  async checkIntegrationStatus(): Promise<IntegrationStatus[]> {
    const services = [
      { name: 'Asset Twin', url: this.assetTwinUrl },
      { name: 'Customer Twin', url: this.customerTwinUrl },
      { name: 'Order Twin', url: this.orderTwinUrl },
      { name: 'Feedback Twin', url: this.feedbackTwinUrl },
      { name: 'Service Registry', url: this.serviceRegistryUrl },
      { name: 'Event Bus', url: this.eventBusUrl }
    ];

    const statuses: IntegrationStatus[] = [];

    for (const service of services) {
      try {
        await axios.get(`${service.url}/health`, { timeout: 3000 });
        statuses.push({
          name: service.name,
          url: service.url,
          connected: true,
          lastCheck: new Date().toISOString()
        });
      } catch (error) {
        statuses.push({
          name: service.name,
          url: service.url,
          connected: false,
          lastCheck: new Date().toISOString(),
          error: 'Connection failed'
        });
      }
    }

    return statuses;
  }

  // Publish event to Event Bus
  async publishEvent(eventType: string, payload: any): Promise<void> {
    try {
      await axios.post(`${this.eventBusUrl}/api/events`, {
        type: eventType,
        source: 'hospitality-integration',
        payload,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.log('[CustomerOpsBridge] Event Bus not available, event not published');
    }
  }

  // Create service request (Ticket Engine integration)
  async createServiceRequest(request: any): Promise<TwinSyncResult> {
    try {
      // In production, this would call the Ticket Engine
      const response = await axios.post(`${this.serviceRegistryUrl}/api/tickets`, request);

      await this.publishEvent('service.request.created', {
        ticketId: response.data.id,
        guestId: request.guestId,
        category: request.category,
        priority: request.priority,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      console.error('[CustomerOpsBridge] Failed to create service request:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sync booking to Asset Twin (delegated to BookingSync, but here for completeness)
  async syncBookingToAssetTwin(booking: any): Promise<TwinSyncResult> {
    try {
      const response = await axios.post(`${this.assetTwinUrl}/api/assets`, {
        externalId: booking.id,
        type: 'room',
        assetTwinId: booking.assetTwinId,
        propertyId: booking.propertyId,
        roomId: booking.roomId,
        roomType: booking.roomType,
        roomNumber: booking.roomNumber,
        guestId: booking.guestId,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        status: mapBookingStatus(booking.status),
        source: 'hospitality-integration',
        syncedAt: new Date().toISOString()
      });

      await this.publishEvent('booking.asset.updated', {
        bookingId: booking.id,
        assetTwinId: response.data.id,
        action: 'upsert',
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        twinId: response.data.id
      };
    } catch (error: any) {
      console.error('[CustomerOpsBridge] Failed to sync to Asset Twin:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Clear guest cache
  clearCache(): void {
    this.guestCache.clear();
  }
}

// Helper function to map booking status to asset status
function mapBookingStatus(bookingStatus: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'reserved',
    'confirmed': 'reserved',
    'checked-in': 'occupied',
    'checked-out': 'available',
    'cancelled': 'available'
  };
  return statusMap[bookingStatus] || 'unknown';
}
