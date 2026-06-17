/**
 * Channel Manager Service
 *
 * Syncs inventory and rates with OTAs:
 * - Booking.com
 * - Expedia
 * - MakeMyTrip
 * - Goibibo
 * - Agoda
 *
 * MVP Implementation: Uses in-memory storage. Database models can be added later.
 */

import axios from 'axios';
import { createServiceLogger } from '../config/logger';
import { Errors } from '../utils/errors';

const logger = createServiceLogger('channel-manager');

export interface ChannelConfig {
  channelId: string;
  channelName: string;
  apiKey?: string;
  apiSecret?: string;
  propertyId: string;
  status: 'active' | 'inactive' | 'error';
  lastSync?: Date;
  errorMessage?: string;
}

export interface InventoryUpdate {
  roomTypeId: string;
  date: string;
  available: number;
  rate: number;
  currency?: string;
  restrictions?: {
    minLOS?: number;
    maxLOS?: number;
    closedToArrival?: boolean;
    closedToDeparture?: boolean;
  };
}

export interface RatePlan {
  id: string;
  name: string;
  roomTypeId: string;
  baseRate: number;
  channels: string[];
}

export interface BookingFromChannel {
  channelBookingId: string;
  channelName: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkIn: Date;
  checkOut: Date;
  roomTypeId: string;
  roomCount: number;
  totalAmount: number;
  currency: string;
  status: 'confirmed' | 'cancelled' | 'modified';
  bookingDate: Date;
  specialRequests?: string;
}

export interface SyncResult {
  channelId: string;
  channelName: string;
  success: boolean;
  inventoryUpdated?: number;
  bookingsReceived?: number;
  error?: string;
}

export interface SyncLog {
  id: string;
  hotelId: string;
  channelId: string;
  channelName: string;
  direction: 'inbound' | 'outbound';
  eventType: string;
  status: 'success' | 'failed';
  recordCount?: number;
  errorMessage?: string;
  createdAt: Date;
}

interface ChannelAdapter {
  channelId: string;
  channelName: string;
  pushInventory(updates: InventoryUpdate[], config: ChannelConfig): Promise<void>;
  pullBookings(since: Date, config: ChannelConfig): Promise<BookingFromChannel[]>;
  testConnection(config: ChannelConfig): Promise<boolean>;
}

class BookingComAdapter implements ChannelAdapter {
  channelId = 'booking-com';
  channelName = 'Booking.com';

  async pushInventory(updates: InventoryUpdate[], config: ChannelConfig): Promise<void> {
    const payload = this.formatForBookingCom(updates, config.propertyId);

    const response = await axios.post(
      `${process.env.BOOKING_COM_API_URL}/availability`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    logger.info('[BookingCom] Inventory pushed', { updates: updates.length, propertyId: config.propertyId });
    return response.data;
  }

  async pullBookings(since: Date, config: ChannelConfig): Promise<BookingFromChannel[]> {
    const response = await axios.get(
      `${process.env.BOOKING_COM_API_URL}/reservations`,
      {
        params: {
          property_id: config.propertyId,
          created_after: since.toISOString(),
        },
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
        timeout: 30000,
      }
    );

    return this.parseBookingComBookings(response.data);
  }

  async testConnection(config: ChannelConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${process.env.BOOKING_COM_API_URL}/properties/${config.propertyId}`,
        {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private formatForBookingCom(updates: InventoryUpdate[], propertyId: string) {
    return {
      property_id: propertyId,
      rooms: updates.map((u) => ({
        room_id: u.roomTypeId,
        date: u.date,
        availability: u.available,
        price: {
          amount: u.rate,
          currency: u.currency || 'USD',
        },
        restrictions: u.restrictions || {},
      })),
    };
  }

  private parseBookingComBookings(data: any): BookingFromChannel[] {
    if (!data.reservations) return [];
    return data.reservations.map((r: any) => ({
      channelBookingId: r.id,
      channelName: this.channelName,
      guestName: r.guest_name,
      guestEmail: r.guest_email,
      guestPhone: r.guest_phone,
      checkIn: new Date(r.checkin),
      checkOut: new Date(r.checkout),
      roomTypeId: r.room_id,
      roomCount: r.rooms,
      totalAmount: r.total_amount,
      currency: r.currency || 'USD',
      status: r.status === 'booked' ? 'confirmed' : r.status,
      bookingDate: new Date(r.created_at),
      specialRequests: r.special_requests,
    }));
  }
}

class ExpediaAdapter implements ChannelAdapter {
  channelId = 'expedia';
  channelName = 'Expedia';

  async pushInventory(updates: InventoryUpdate[], config: ChannelConfig): Promise<void> {
    const payload = this.formatForExpedia(updates, config.propertyId);

    const response = await axios.post(
      `${process.env.EXPEDIA_API_URL}/properties/${config.propertyId}/availability`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      }
    );

    logger.info('[Expedia] Inventory pushed', { updates: updates.length, propertyId: config.propertyId });
    return response.data;
  }

  async pullBookings(since: Date, config: ChannelConfig): Promise<BookingFromChannel[]> {
    const response = await axios.get(
      `${process.env.EXPEDIA_API_URL}/properties/${config.propertyId}/reservations`,
      {
        params: {
          start_date: since.toISOString().split('T')[0],
        },
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
        timeout: 30000,
      }
    );

    return this.parseExpediaBookings(response.data);
  }

  async testConnection(config: ChannelConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${process.env.EXPEDIA_API_URL}/properties/${config.propertyId}`,
        {
          headers: { 'Authorization': `Bearer ${config.apiKey}` },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private formatForExpedia(updates: InventoryUpdate[], propertyId: string) {
    return {
      property_id: propertyId,
      inventory: updates.map((u) => ({
        room_type_id: u.roomTypeId,
        date: u.date,
        total_inventory_count: u.available,
        rate_amount: u.rate,
        rate_currency: u.currency || 'USD',
      })),
    };
  }

  private parseExpediaBookings(data: any): BookingFromChannel[] {
    if (!data.reservations) return [];
    return data.reservations.map((r: any) => ({
      channelBookingId: r.reservation_id,
      channelName: this.channelName,
      guestName: r.guest_name,
      guestEmail: r.guest_contact_email,
      guestPhone: r.guest_contact_phone,
      checkIn: new Date(r.checkin_date),
      checkOut: new Date(r.checkout_date),
      roomTypeId: r.room_type_id,
      roomCount: r.room_count || 1,
      totalAmount: r.total_charge_amount,
      currency: r.currency_code || 'USD',
      status: r.status === 'BOOKED' ? 'confirmed' : r.status.toLowerCase(),
      bookingDate: new Date(r.created_at),
      specialRequests: r.special_requests,
    }));
  }
}

class MakeMyTripAdapter implements ChannelAdapter {
  channelId = 'makemytrip';
  channelName = 'MakeMyTrip';

  async pushInventory(updates: InventoryUpdate[], config: ChannelConfig): Promise<void> {
    const payload = this.formatForMMT(updates, config.propertyId);

    const response = await axios.post(
      `${process.env.MAKEMYTRIP_API_URL}/inventory`,
      payload,
      {
        headers: {
          'X-API-Key': config.apiKey,
          'X-API-Secret': config.apiSecret,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    logger.info('[MakeMyTrip] Inventory pushed', { updates: updates.length, propertyId: config.propertyId });
    return response.data;
  }

  async pullBookings(since: Date, config: ChannelConfig): Promise<BookingFromChannel[]> {
    const response = await axios.get(
      `${process.env.MAKEMYTRIP_API_URL}/bookings`,
      {
        params: {
          hotel_id: config.propertyId,
          from_date: since.toISOString().split('T')[0],
        },
        headers: {
          'X-API-Key': config.apiKey,
          'X-API-Secret': config.apiSecret,
        },
        timeout: 30000,
      }
    );

    return this.parseMMTBookings(response.data);
  }

  async testConnection(config: ChannelConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${process.env.MAKEMYTRIP_API_URL}/hotel/${config.propertyId}`,
        {
          headers: {
            'X-API-Key': config.apiKey,
            'X-API-Secret': config.apiSecret,
          },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private formatForMMT(updates: InventoryUpdate[], propertyId: string) {
    return {
      hotel_id: propertyId,
      rooms: updates.map((u) => ({
        room_type_id: u.roomTypeId,
        date: u.date,
        available_count: u.available,
        price: {
          base: u.rate,
          currency: u.currency || 'INR',
        },
        restrictions: u.restrictions || {},
      })),
    };
  }

  private parseMMTBookings(data: any): BookingFromChannel[] {
    if (!data.bookings) return [];
    return data.bookings.map((r: any) => ({
      channelBookingId: r.booking_id,
      channelName: this.channelName,
      guestName: r.customer_name,
      guestEmail: r.customer_email,
      guestPhone: r.customer_phone,
      checkIn: new Date(r.check_in),
      checkOut: new Date(r.check_out),
      roomTypeId: r.room_type_id,
      roomCount: r.room_count || 1,
      totalAmount: r.total_amount,
      currency: r.currency || 'INR',
      status: r.status === 'CONFIRMED' ? 'confirmed' : r.status.toLowerCase(),
      bookingDate: new Date(r.booking_date),
      specialRequests: r.special_requests,
    }));
  }
}

class GoibiboAdapter implements ChannelAdapter {
  channelId = 'goibibo';
  channelName = 'Goibibo';

  async pushInventory(updates: InventoryUpdate[], config: ChannelConfig): Promise<void> {
    const payload = this.formatForGoibibo(updates, config.propertyId);

    const response = await axios.post(
      `${process.env.GOIBIBO_API_URL}/v1/availability`,
      payload,
      {
        headers: {
          'Authorization': `Token ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    logger.info('[Goibibo] Inventory pushed', { updates: updates.length, propertyId: config.propertyId });
    return response.data;
  }

  async pullBookings(since: Date, config: ChannelConfig): Promise<BookingFromChannel[]> {
    const response = await axios.get(
      `${process.env.GOIBIBO_API_URL}/v1/bookings`,
      {
        params: {
          hotel_id: config.propertyId,
          booking_date_after: since.toISOString(),
        },
        headers: {
          'Authorization': `Token ${config.apiKey}`,
        },
        timeout: 30000,
      }
    );

    return this.parseGoibiboBookings(response.data);
  }

  async testConnection(config: ChannelConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${process.env.GOIBIBO_API_URL}/v1/hotel/${config.propertyId}`,
        {
          headers: { 'Authorization': `Token ${config.apiKey}` },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private formatForGoibibo(updates: InventoryUpdate[], propertyId: string) {
    return {
      hotel_id: propertyId,
      room_availability: updates.map((u) => ({
        room_type_id: u.roomTypeId,
        date: u.date,
        available_rooms: u.available,
        rate: u.rate,
        currency: u.currency || 'INR',
        min_stay: u.restrictions?.minLOS,
        max_stay: u.restrictions?.maxLOS,
        closed_to_arrival: u.restrictions?.closedToArrival || false,
        closed_to_departure: u.restrictions?.closedToDeparture || false,
      })),
    };
  }

  private parseGoibiboBookings(data: any): BookingFromChannel[] {
    if (!data.bookings) return [];
    return data.bookings.map((r: any) => ({
      channelBookingId: r.booking_reference,
      channelName: this.channelName,
      guestName: r.guest_details?.name,
      guestEmail: r.guest_details?.email,
      guestPhone: r.guest_details?.mobile,
      checkIn: new Date(r.check_in_date),
      checkOut: new Date(r.check_out_date),
      roomTypeId: r.room_type_id,
      roomCount: r.number_of_rooms || 1,
      totalAmount: r.total_price,
      currency: r.currency || 'INR',
      status: r.booking_status === 'CONFIRMED' ? 'confirmed' : r.booking_status.toLowerCase(),
      bookingDate: new Date(r.booking_date),
      specialRequests: r.special_requests,
    }));
  }
}

class AgodaAdapter implements ChannelAdapter {
  channelId = 'agoda';
  channelName = 'Agoda';

  async pushInventory(updates: InventoryUpdate[], config: ChannelConfig): Promise<void> {
    const payload = this.formatForAgoda(updates, config.propertyId);

    const response = await axios.post(
      `${process.env.AGODA_API_URL}/v1/properties/${config.propertyId}/rates`,
      payload,
      {
        headers: {
          'Api-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    logger.info('[Agoda] Inventory pushed', { updates: updates.length, propertyId: config.propertyId });
    return response.data;
  }

  async pullBookings(since: Date, config: ChannelConfig): Promise<BookingFromChannel[]> {
    const response = await axios.get(
      `${process.env.AGODA_API_URL}/v1/properties/${config.propertyId}/reservations`,
      {
        params: {
          created_after: since.toISOString(),
        },
        headers: {
          'Api-Key': config.apiKey,
        },
        timeout: 30000,
      }
    );

    return this.parseAgodaBookings(response.data);
  }

  async testConnection(config: ChannelConfig): Promise<boolean> {
    try {
      const response = await axios.get(
        `${process.env.AGODA_API_URL}/v1/properties/${config.propertyId}`,
        {
          headers: { 'Api-Key': config.apiKey },
          timeout: 10000,
        }
      );
      return response.status === 200;
    } catch {
      return false;
    }
  }

  private formatForAgoda(updates: InventoryUpdate[], propertyId: string) {
    return {
      property_id: propertyId,
      rate_updates: updates.map((u) => ({
        unit_id: u.roomTypeId,
        date: u.date,
        available_count: u.available,
        rate_amount: u.rate,
        currency_code: u.currency || 'USD',
        min_los: u.restrictions?.minLOS,
        max_los: u.restrictions?.maxLOS,
        cta: u.restrictions?.closedToArrival ? 1 : 0,
        ctd: u.restrictions?.closedToDeparture ? 1 : 0,
      })),
    };
  }

  private parseAgodaBookings(data: any): BookingFromChannel[] {
    if (!data.reservations) return [];
    return data.reservations.map((r: any) => ({
      channelBookingId: r.reservation_id,
      channelName: this.channelName,
      guestName: r.guest_name,
      guestEmail: r.guest_email,
      guestPhone: r.guest_phone,
      checkIn: new Date(r.check_in),
      checkOut: new Date(r.check_out),
      roomTypeId: r.property_room_id,
      roomCount: r.number_of_rooms || 1,
      totalAmount: r.total_amount,
      currency: r.currency_code || 'USD',
      status: r.status === 1 ? 'confirmed' : r.status === 2 ? 'cancelled' : 'modified',
      bookingDate: new Date(r.created_at),
      specialRequests: r.special_requests,
    }));
  }
}

export class ChannelManagerService {
  private adapters: Map<string, ChannelAdapter> = new Map();
  private channelConfigs: Map<string, ChannelConfig> = new Map();
  private syncLogs: SyncLog[] = [];

  constructor() {
    // Register adapters
    this.adapters.set('booking-com', new BookingComAdapter());
    this.adapters.set('expedia', new ExpediaAdapter());
    this.adapters.set('makemytrip', new MakeMyTripAdapter());
    this.adapters.set('goibibo', new GoibiboAdapter());
    this.adapters.set('agoda', new AgodaAdapter());
  }

  /**
   * Get supported channels
   */
  getSupportedChannels(): Array<{ channelId: string; channelName: string }> {
    return Array.from(this.adapters.values()).map((a) => ({
      channelId: a.channelId,
      channelName: a.channelName,
    }));
  }

  /**
   * Connect a new channel for a hotel
   */
  async connectChannel(hotelId: string, config: Omit<ChannelConfig, 'status'>): Promise<{ success: boolean; channelId: string }> {
    const adapter = this.adapters.get(config.channelId);
    if (!adapter) {
      throw Errors.validation(`Unsupported channel: ${config.channelId}`);
    }

    // Test connection before saving
    const testConfig: ChannelConfig = { ...config, status: 'active' };
    const isConnected = await adapter.testConnection(testConfig);
    if (!isConnected) {
      throw Errors.validation('Failed to connect to channel API. Please verify your API credentials.');
    }

    // Store config
    const fullConfig: ChannelConfig = { ...testConfig, lastSync: new Date() };
    this.channelConfigs.set(`${hotelId}:${config.channelId}`, fullConfig);

    this.createSyncLog(hotelId, config.channelId, config.channelName, 'outbound', 'connect', 'success', 0);

    logger.info('[ChannelManager] Channel connected', { hotelId, channelId: config.channelId });

    return { success: true, channelId: config.channelId };
  }

  /**
   * Disconnect a channel
   */
  async disconnectChannel(hotelId: string, channelId: string): Promise<void> {
    const key = `${hotelId}:${channelId}`;
    const config = this.channelConfigs.get(key);

    if (config) {
      this.createSyncLog(hotelId, channelId, config.channelName, 'outbound', 'disconnect', 'success', 0);
    }

    this.channelConfigs.delete(key);

    logger.info('[ChannelManager] Channel disconnected', { hotelId, channelId });
  }

  /**
   * Get channel configurations for a hotel
   */
  getChannels(hotelId: string): ChannelConfig[] {
    const configs: ChannelConfig[] = [];
    for (const [key, config] of this.channelConfigs) {
      if (key.startsWith(`${hotelId}:`)) {
        configs.push(config);
      }
    }
    return configs;
  }

  /**
   * Push inventory update to a specific channel
   */
  async pushInventoryToChannel(hotelId: string, channelId: string, updates: InventoryUpdate[]): Promise<void> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) {
      throw Errors.validation(`Unsupported channel: ${channelId}`);
    }

    const config = this.channelConfigs.get(`${hotelId}:${channelId}`);
    if (!config) {
      throw Errors.notFound('Channel configuration');
    }

    try {
      await adapter.pushInventory(updates, config);

      // Update last sync time
      config.lastSync = new Date();
      config.status = 'active';
      config.errorMessage = undefined;
      this.channelConfigs.set(`${hotelId}:${channelId}`, config);

      this.createSyncLog(hotelId, channelId, config.channelName, 'outbound', 'inventory_push', 'success', updates.length);

      logger.info('[ChannelManager] Inventory pushed', { hotelId, channelId, updates: updates.length });
    } catch (error: any) {
      config.status = 'error';
      config.errorMessage = error.message;
      this.channelConfigs.set(`${hotelId}:${channelId}`, config);

      this.createSyncLog(hotelId, channelId, config.channelName, 'outbound', 'inventory_push', 'failed', 0, error.message);

      logger.error('[ChannelManager] Inventory push failed', { hotelId, channelId, error: error.message });
      throw error;
    }
  }

  /**
   * Push inventory update to all active channels for a hotel
   */
  async pushInventory(hotelId: string, updates: InventoryUpdate[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    const channels = this.getChannels(hotelId);
    const result = { success: 0, failed: 0, errors: [] as string[] };

    for (const channel of channels) {
      if (channel.status !== 'active') continue;

      try {
        await this.pushInventoryToChannel(hotelId, channel.channelId, updates);
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push(`${channel.channelId}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Pull bookings from a specific channel
   */
  async pullBookings(hotelId: string, channelId: string, since: Date): Promise<BookingFromChannel[]> {
    const adapter = this.adapters.get(channelId);
    if (!adapter) {
      throw Errors.validation(`Unsupported channel: ${channelId}`);
    }

    const config = this.channelConfigs.get(`${hotelId}:${channelId}`);
    if (!config) {
      throw Errors.notFound('Channel configuration');
    }

    try {
      const bookings = await adapter.pullBookings(since, config);

      this.createSyncLog(hotelId, channelId, config.channelName, 'inbound', 'booking_pull', 'success', bookings.length);

      logger.info('[ChannelManager] Bookings pulled', { hotelId, channelId, count: bookings.length });

      return bookings;
    } catch (error: any) {
      this.createSyncLog(hotelId, channelId, config.channelName, 'inbound', 'booking_pull', 'failed', 0, error.message);
      throw error;
    }
  }

  /**
   * Sync all active channels for a hotel
   */
  async syncAll(hotelId: string): Promise<{
    inventory: { success: number; failed: number };
    bookings: { success: number; failed: number; received: number };
  }> {
    const channels = this.getChannels(hotelId);

    // Push to channels (mock inventory for MVP)
    const inventoryUpdates = this.getMockInventory();
    const inventoryResult = await this.pushInventory(hotelId, inventoryUpdates);

    // Pull new bookings from channels
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

    let bookingsSuccess = 0;
    let bookingsFailed = 0;
    let totalBookings = 0;

    for (const channel of channels) {
      if (channel.status !== 'active') continue;

      try {
        const bookings = await this.pullBookings(hotelId, channel.channelId, since);
        await this.processBookings(bookings);
        bookingsSuccess++;
        totalBookings += bookings.length;
      } catch (error: any) {
        bookingsFailed++;
        logger.error('[ChannelManager] Booking pull failed', { hotelId, channelId: channel.channelId, error: error.message });
      }
    }

    logger.info('[ChannelManager] Full sync completed', {
      hotelId,
      inventorySuccess: inventoryResult.success,
      inventoryFailed: inventoryResult.failed,
      bookingsSuccess,
      bookingsFailed,
    });

    return {
      inventory: { success: inventoryResult.success, failed: inventoryResult.failed },
      bookings: { success: bookingsSuccess, failed: bookingsFailed, received: totalBookings },
    };
  }

  /**
   * Get sync logs for a hotel
   */
  getSyncLogs(hotelId: string, limit = 50): SyncLog[] {
    return this.syncLogs
      .filter((log) => log.hotelId === hotelId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Clear sync logs for a hotel
   */
  clearSyncLogs(hotelId: string): void {
    this.syncLogs = this.syncLogs.filter((log) => log.hotelId !== hotelId);
  }

  /**
   * Mock inventory for MVP
   * In production, this would fetch from Hotel-PMS
   */
  private getMockInventory(): InventoryUpdate[] {
    const today = new Date();
    const updates: InventoryUpdate[] = [];

    // Generate 30 days of mock inventory
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      updates.push({
        roomTypeId: 'standard-room',
        date: date.toISOString().split('T')[0],
        available: 5,
        rate: 100 + (i % 7) * 10, // Weekend pricing
        currency: 'USD',
      });

      updates.push({
        roomTypeId: 'deluxe-room',
        date: date.toISOString().split('T')[0],
        available: 3,
        rate: 150 + (i % 7) * 15,
        currency: 'USD',
      });
    }

    return updates;
  }

  /**
   * Process bookings received from channels
   * In production, this would create bookings in Hotel-PMS
   */
  private async processBookings(bookings: BookingFromChannel[]): Promise<void> {
    for (const booking of bookings) {
      logger.info('[ChannelManager] Processing booking', {
        channelBookingId: booking.channelBookingId,
        channel: booking.channelName,
        guestName: booking.guestName,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
      });
    }
  }

  /**
   * Create sync log entry
   */
  private createSyncLog(
    hotelId: string,
    channelId: string,
    channelName: string,
    direction: 'inbound' | 'outbound',
    eventType: string,
    status: 'success' | 'failed',
    recordCount: number,
    errorMessage?: string
  ): void {
    this.syncLogs.push({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      hotelId,
      channelId,
      channelName,
      direction,
      eventType,
      status,
      recordCount,
      errorMessage,
      createdAt: new Date(),
    });

    // Keep only last 1000 logs
    if (this.syncLogs.length > 1000) {
      this.syncLogs = this.syncLogs.slice(-1000);
    }
  }
}

export const channelManagerService = new ChannelManagerService();
