import axios, { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { createServiceLogger } from '../config/logger';

const logger = createServiceLogger('rez-mind-client');

export interface REZMindEvent {
  eventType: string;
  source: 'hotel_pms';
  data: Record<string, unknown>;
  timestamp: Date;
}

export class REZMindClient {
  private client: AxiosInstance;
  private static instance: REZMindClient;

  private constructor() {
    this.client = axios.create({
      baseURL: env.REZ_MIND_API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(env.REZ_MIND_API_KEY && { 'Authorization': `Bearer ${env.REZ_MIND_API_KEY}` }),
      },
    });
  }

  static getInstance(): REZMindClient {
    if (!REZMindClient.instance) {
      REZMindClient.instance = new REZMindClient();
    }
    return REZMindClient.instance;
  }

  /**
   * Send an event to REZ Mind.
   * Fire-and-forget — errors are logged but don't block the caller.
   */
  async sendEvent(event: REZMindEvent): Promise<void> {
    if (!env.REZ_MIND_API_URL || !env.REZ_MIND_API_KEY) {
      logger.debug('[REZMindClient] Event skipped (no config):', {
        eventType: event.eventType,
        source: event.source,
      });
      return;
    }

    try {
      await this.client.post('/api/events', {
        event_type: event.eventType,
        source: event.source,
        data: event.data,
        timestamp: event.timestamp.toISOString(),
      });
      logger.info('[REZMindClient] Event sent:', { eventType: event.eventType });
    } catch (error) {
      logger.error('[REZMindClient] Failed to send event:', {
        eventType: event.eventType,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw — event sending is fire-and-forget
    }
  }

  /**
   * Emit a booking.confirmed event to REZ Mind.
   */
  async emitBookingConfirmed(params: {
    bookingId: string;
    bookingRef: string;
    hotelId: string;
    userId: string;
    checkinDate: Date;
    checkoutDate: Date;
    numRooms: number;
    numGuests: number;
    guestName: string | null;
    guestPhone: string | null;
    totalValuePaise: number;
  }): Promise<void> {
    await this.sendEvent({
      eventType: 'booking.confirmed',
      source: 'hotel_pms',
      data: params,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a checkin event to REZ Mind.
   */
  async emitCheckIn(params: {
    bookingId: string;
    hotelId: string;
    roomNumber: string;
    checkinDate: Date;
  }): Promise<void> {
    await this.sendEvent({
      eventType: 'checkin',
      source: 'hotel_pms',
      data: params,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a checkout event to REZ Mind.
   */
  async emitCheckOut(params: {
    bookingId: string;
    hotelId: string;
    checkoutDate: Date;
  }): Promise<void> {
    await this.sendEvent({
      eventType: 'checkout',
      source: 'hotel_pms',
      data: params,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a room_status_change event to REZ Mind.
   */
  async emitRoomStatusChange(params: {
    hotelId: string;
    roomId: string;
    roomNumber: string;
    previousStatus: string;
    newStatus: string;
  }): Promise<void> {
    await this.sendEvent({
      eventType: 'room_status_change',
      source: 'hotel_pms',
      data: params,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a housekeeping_completed event to REZ Mind.
   */
  async emitHousekeepingCompleted(params: {
    hotelId: string;
    roomId: string;
    roomNumber: string;
    taskId: string;
    completedAt: Date;
  }): Promise<void> {
    await this.sendEvent({
      eventType: 'housekeeping_completed',
      source: 'hotel_pms',
      data: params,
      timestamp: new Date(),
    });
  }

  /**
   * Get dynamic pricing from REZ Mind.
   */
  async getDynamicPricing(hotelId: string, checkIn: Date): Promise<number | null> {
    if (!env.REZ_MIND_API_URL || !env.REZ_MIND_API_KEY) {
      logger.debug('[REZMindClient] getDynamicPricing skipped (no config)');
      return null;
    }

    try {
      const response = await this.client.get<{ price: number }>('/api/dynamic-pricing', {
        params: {
          hotel_id: hotelId,
          check_in: checkIn.toISOString().split('T')[0],
        },
      });
      return response.data.price;
    } catch (error) {
      logger.error('[REZMindClient] getDynamicPricing failed:', {
        hotelId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get recommendations from REZ Mind.
   */
  async getRecommendations(userId: string): Promise<unknown[]> {
    if (!env.REZ_MIND_API_URL || !env.REZ_MIND_API_KEY) {
      logger.debug('[REZMindClient] getRecommendations skipped (no config)');
      return [];
    }

    try {
      const response = await this.client.get<{ recommendations: unknown[] }>('/api/recommendations', {
        params: { user_id: userId },
      });
      return response.data.recommendations || [];
    } catch (error) {
      logger.error('[REZMindClient] getRecommendations failed:', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }
}

// Singleton instance for easy import
export const rezMindClient = REZMindClient.getInstance();
