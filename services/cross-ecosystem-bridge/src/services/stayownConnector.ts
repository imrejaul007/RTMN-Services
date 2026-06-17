/**
 * StayOwn Hospitality Connector
 * Connects to StayOwn services (Hotel OS, Booking, Property Management)
 */

import axios, { AxiosInstance } from 'axios';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export interface StayownGuest {
  guestId: string;
  email?: string;
  phone?: string;
  name?: {
    first?: string;
    last?: string;
    full?: string;
  };
  nationality?: string;
  preferences?: {
    roomType?: string;
    bedType?: string;
    smoking?: boolean;
    floorPreference?: string;
  };
  loyaltyTier?: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints?: number;
}

export interface StayownBooking {
  bookingId: string;
  guestId: string;
  propertyId: string;
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'no_show';
  totalAmount: number;
  paidAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  source: 'direct' | 'ota' | 'corporate' | 'loyalty';
  specialRequests?: string[];
}

export interface StayownStay {
  stayId: string;
  guestId: string;
  propertyId: string;
  checkIn: Date;
  checkOut: Date;
  roomNumber: string;
  services: string[];
  totalSpend: number;
  feedback?: {
    rating: number;
    comments?: string;
  };
}

export interface StayownProperty {
  propertyId: string;
  name: string;
  type: 'hotel' | 'resort' | 'hostel' | 'apartment';
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  rating?: number;
  amenities: string[];
}

class StayownConnector {
  private apiClient: AxiosInstance;
  private hotelOsClient: AxiosInstance;
  private bookingClient: AxiosInstance;

  constructor() {
    // Use environment variables (DEV_* or production URLs from .env.example)
    // For production: Set in .env to point to https://hotel-ota-api.onrender.com etc.
    const apiUrl = process.env.STAYOWN_API_URL || process.env.DEV_STAYOWN_API_URL || 'http://localhost:3000';
    const hotelOsUrl = process.env.STAYOWN_HOTEL_OS_URL || process.env.DEV_STAYOWN_HOTEL_OS_URL || 'http://localhost:5025';
    const bookingUrl = process.env.STAYOWN_BOOKING_URL || process.env.DEV_STAYOWN_BOOKING_URL || 'http://localhost:6010';

    this.apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.hotelOsClient = axios.create({
      baseURL: hotelOsUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });

    this.bookingClient = axios.create({
      baseURL: bookingUrl,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ==================== Guest Methods ====================

  /**
   * Get guest profile by ID
   */
  async getGuestProfile(guestId: string, token?: string): Promise<StayownGuest | null> {
    try {
      const response = await this.apiClient.get(`/api/guests/${guestId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`StayOwn getGuestProfile failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Find guest by email or phone
   */
  async findGuestByIdentifier(identifier: string, type: 'email' | 'phone'): Promise<StayownGuest | null> {
    try {
      const response = await this.apiClient.get('/api/guests/find', {
        params: { [type]: identifier },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`StayOwn findGuestByIdentifier failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Get guest loyalty info
   */
  async getGuestLoyalty(guestId: string): Promise<{
    tier: string;
    points: number;
    totalStays: number;
    totalNights: number;
    nextTierProgress?: number;
  } | null> {
    try {
      const response = await this.hotelOsClient.get(`/api/loyalty/${guestId}`);
      return response.data;
    } catch (error: any) {
      logger.warn(`StayOwn getGuestLoyalty failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Update guest preferences
   */
  async updateGuestPreferences(
    guestId: string,
    preferences: StayownGuest['preferences'],
    token?: string
  ): Promise<boolean> {
    try {
      await this.apiClient.patch(
        `/api/guests/${guestId}/preferences`,
        preferences,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`StayOwn updateGuestPreferences failed: ${error.message}`);
      return false;
    }
  }

  // ==================== Booking Methods ====================

  /**
   * Get guest bookings
   */
  async getGuestBookings(guestId: string, status?: string): Promise<StayownBooking[]> {
    try {
      const response = await this.bookingClient.get('/api/bookings', {
        params: { guestId, status },
      });
      return response.data.bookings || [];
    } catch (error: any) {
      logger.warn(`StayOwn getGuestBookings failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get upcoming bookings
   */
  async getUpcomingBookings(guestId: string): Promise<StayownBooking[]> {
    try {
      const response = await this.bookingClient.get('/api/bookings/upcoming', {
        params: { guestId },
      });
      return response.data.bookings || [];
    } catch (error: any) {
      logger.warn(`StayOwn getUpcomingBookings failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Create booking
   */
  async createBooking(bookingData: Partial<StayownBooking>, token?: string): Promise<StayownBooking | null> {
    try {
      const response = await this.bookingClient.post('/api/bookings', bookingData, {
        headers: token ? { Authorization: `Bearer ${token}` } : {} },
      );
      return response.data;
    } catch (error: any) {
      logger.warn(`StayOwn createBooking failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(bookingId: string, reason?: string, token?: string): Promise<boolean> {
    try {
      await this.bookingClient.post(
        `/api/bookings/${bookingId}/cancel`,
        { reason },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`StayOwn cancelBooking failed: ${error.message}`);
      return false;
    }
  }

  // ==================== Stay History ====================

  /**
   * Get guest stay history
   */
  async getStayHistory(guestId: string, limit: number = 10): Promise<StayownStay[]> {
    try {
      const response = await this.hotelOsClient.get('/api/stays', {
        params: { guestId, limit },
      });
      return response.data.stays || [];
    } catch (error: any) {
      logger.warn(`StayOwn getStayHistory failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Get guest stay summary
   */
  async getStaySummary(guestId: string): Promise<{
    totalStays: number;
    totalNights: number;
    totalSpend: number;
    averageRating: number;
    favoriteProperties: string[];
    favoriteRoomTypes: string[];
    lastStay?: Date;
  } | null> {
    try {
      const response = await this.hotelOsClient.get(`/api/stays/summary/${guestId}`);
      return response.data;
    } catch (error: any) {
      logger.warn(`StayOwn getStaySummary failed: ${error.message}`);
      return null;
    }
  }

  // ==================== Property Methods ====================

  /**
   * Get property details
   */
  async getProperty(propertyId: string): Promise<StayownProperty | null> {
    try {
      const response = await this.apiClient.get(`/api/properties/${propertyId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) return null;
      logger.warn(`StayOwn getProperty failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Search available rooms
   */
  async searchRooms(params: {
    propertyId?: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    roomType?: string;
  }): Promise<Array<{
    roomId: string;
    roomType: string;
    price: number;
    availability: 'available' | 'limited' | 'unavailable';
  }>> {
    try {
      const response = await this.bookingClient.get('/api/rooms/search', { params });
      return response.data.rooms || [];
    } catch (error: any) {
      logger.warn(`StayOwn searchRooms failed: ${error.message}`);
      return [];
    }
  }

  // ==================== Services ====================

  /**
   * Get hotel services
   */
  async getHotelServices(propertyId: string): Promise<Array<{
    serviceId: string;
    name: string;
    category: string;
    price: number;
  }>> {
    try {
      const response = await this.hotelOsClient.get(`/api/services/${propertyId}`);
      return response.data.services || [];
    } catch (error: any) {
      logger.warn(`StayOwn getHotelServices failed: ${error.message}`);
      return [];
    }
  }

  /**
   * Book hotel service
   */
  async bookService(
    guestId: string,
    bookingId: string,
    serviceId: string,
    quantity: number = 1,
    token?: string
  ): Promise<boolean> {
    try {
      await this.hotelOsClient.post(
        '/api/services/book',
        { guestId, bookingId, serviceId, quantity },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`StayOwn bookService failed: ${error.message}`);
      return false;
    }
  }

  // ==================== Status ====================

  /**
   * Get StayOwn services status
   */
  async getServicesStatus(): Promise<Record<string, 'up' | 'down' | 'unknown'>> {
    const status: Record<string, 'up' | 'down' | 'unknown'> = {};
    const services = [
      { name: 'stayown-api', url: '/health' },
      { name: 'stayown-hotel-os', url: '/health' },
      { name: 'stayown-booking', url: '/health' },
    ];

    const bases = [
      process.env.STAYOWN_API_URL || 'http://localhost:6000',
      process.env.STAYOWN_HOTEL_OS_URL || 'http://localhost:5025',
      process.env.STAYOWN_BOOKING_URL || 'http://localhost:6001',
    ];

    for (let i = 0; i < services.length; i++) {
      try {
        const client = axios.create({ baseURL: bases[i], timeout: 5000 });
        await client.get(services[i].url);
        status[services[i].name] = 'up';
      } catch {
        status[services[i].name] = 'down';
      }
    }

    return status;
  }

  /**
   * Link StayOwn guest to ecosystem profile
   */
  async linkToEcosystem(
    stayownGuestId: string,
    ecosystemProfileId: string,
    token?: string
  ): Promise<boolean> {
    try {
      await this.apiClient.post(
        `/api/guests/${stayownGuestId}/link`,
        { ecosystemProfileId },
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );
      return true;
    } catch (error: any) {
      logger.warn(`StayOwn linkToEcosystem failed: ${error.message}`);
      return false;
    }
  }
}

// Singleton instance
export const stayownConnector = new StayownConnector();
export default stayownConnector;
