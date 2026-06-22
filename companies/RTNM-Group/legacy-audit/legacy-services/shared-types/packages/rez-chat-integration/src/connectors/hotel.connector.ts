// ── Hotel OTA Connector ────────────────────────────────────────────────────────────
// Connects to Hotel OTA services

import axios, { AxiosInstance } from 'axios';

export interface HotelSearchParams {
  city: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  category?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}

export interface HotelSearchResult {
  hotels: Array<{
    id: string;
    name: string;
    city: string;
    category: string;
    rating: number;
    reviewCount: number;
    baseRate: number;
    images: string[];
    amenities: string[];
    location: string;
  }>;
  total: number;
  page: number;
  perPage: number;
}

export interface HotelDetails {
  id: string;
  name: string;
  slug: string;
  description: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  category: string;
  rating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  policies: Array<{
    title: string;
    description: string;
  }>;
  checkInTime: string;
  checkOutTime: string;
  roomTypes: Array<{
    id: string;
    name: string;
    description: string;
    maxOccupancy: number;
    bedType: string;
    baseRate: number;
    images: string[];
    amenities: string[];
  }>;
}

export interface RoomAvailability {
  roomTypeId: string;
  roomTypeName: string;
  available: boolean;
  availableRooms: number;
  ratePerNight: number;
  totalRate: number;
  numNights: number;
}

export interface BookingHold {
  holdId: string;
  bookingRef: string;
  hotelId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  numRooms: number;
  numGuests: number;
  roomRate: number;
  totalValue: number;
  coinDiscount: number;
  finalAmount: number;
  holdExpiresAt: string;
  expiresIn: number; // seconds
}

export interface BookingConfirmation {
  bookingId: string;
  bookingRef: string;
  status: string;
  hotelName: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  numNights: number;
  guestName: string;
  guestPhone: string;
  totalPaid: number;
  coinsEarned: number;
  confirmationEmail: string;
}

export interface BookingDetails {
  bookingId: string;
  bookingRef: string;
  status: string;
  paymentStatus: string;
  hotel: {
    id: string;
    name: string;
    address: string;
    phone: string;
  };
  roomType: {
    id: string;
    name: string;
    images: string[];
  };
  checkIn: string;
  checkOut: string;
  numNights: number;
  numRooms: number;
  guestName: string;
  guestPhone: string;
  specialRequests?: string;
  timeline: Array<{
    status: string;
    timestamp: string;
    message: string;
  }>;
  cancellation?: {
    cancelledAt: string;
    reason: string;
    refundAmount: number;
    refundStatus: string;
  };
}

export class HotelOTAConnector {
  private client: AxiosInstance;

  constructor(config?: { baseUrl?: string; apiKey?: string }) {
    const baseURL = config?.baseUrl || process.env.HOTEL_OTA_URL || 'https://hotel-ota-api.onrender.com';
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(config?.apiKey && { 'x-api-key': config.apiKey }),
      },
    });
  }

  /**
   * Search available hotels
   */
  async search(params: HotelSearchParams): Promise<HotelSearchResult> {
    try {
      const response = await this.client.post('/v1/hotels/search', {
        city: params.city,
        checkin: params.checkIn,
        checkout: params.checkOut,
        guests: params.guests || 2,
        rooms: params.rooms || 1,
        minRate: params.minPrice,
        maxRate: params.maxPrice,
        lat: params.latitude,
        lng: params.longitude,
        radiusKm: params.radiusKm,
        category: params.category,
        sort: params.sort || 'relevance',
        page: params.page || 1,
        perPage: params.perPage || 20,
      });

      const data = response.data;

      return {
        hotels: (data.hotels || data.results || []).map((h: any) => ({
          id: h.id,
          name: h.name,
          city: h.city,
          category: h.category,
          rating: h.rating || 0,
          reviewCount: h.reviewCount || 0,
          baseRate: h.roomTypes?.[0]?.baseRate || h.minRate || 0,
          images: h.images || [],
          amenities: h.amenities || [],
          location: h.address || h.city,
        })),
        total: data.total || 0,
        page: params.page || 1,
        perPage: params.perPage || 20,
      };
    } catch (error: any) {
      console.error('[HotelOTAConnector] Search error:', error.message);
      return {
        hotels: [],
        total: 0,
        page: 1,
        perPage: 20,
      };
    }
  }

  /**
   * Get hotel details with room types
   */
  async getHotel(hotelId: string): Promise<HotelDetails | null> {
    try {
      const response = await this.client.get(`/v1/hotels/${hotelId}`);
      const h = response.data;

      return {
        id: h.id,
        name: h.name,
        slug: h.slug,
        description: h.description || '',
        address: h.address || '',
        city: h.city,
        state: h.state || '',
        pincode: h.pincode || '',
        phone: h.phone || '',
        email: h.email || '',
        category: h.category,
        rating: h.rating || 0,
        reviewCount: h.reviewCount || 0,
        images: h.images || [],
        amenities: h.amenities || [],
        policies: h.policies || [],
        checkInTime: h.checkInTime || '14:00',
        checkOutTime: h.checkOutTime || '11:00',
        roomTypes: (h.roomTypes || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          description: r.description || '',
          maxOccupancy: r.maxOccupancy || 2,
          bedType: r.bedType || 'Standard',
          baseRate: r.baseRate || r.baseRatePaise / 100,
          images: r.images || [],
          amenities: r.amenities || [],
        })),
      };
    } catch (error: any) {
      console.error('[HotelOTAConnector] Get hotel error:', error.message);
      return null;
    }
  }

  /**
   * Check room availability for specific dates
   */
  async checkAvailability(params: {
    hotelId: string;
    roomTypeId?: string;
    checkIn: string;
    checkOut: string;
    rooms?: number;
  }): Promise<RoomAvailability[]> {
    try {
      const response = await this.client.post('/v1/availability/check', {
        hotelId: params.hotelId,
        roomTypeId: params.roomTypeId,
        checkin: params.checkIn,
        checkout: params.checkOut,
        rooms: params.rooms || 1,
      });

      const data = response.data;
      const slots = data.slots || data.availableRooms || [];

      // Calculate nights
      const checkIn = new Date(params.checkIn);
      const checkOut = new Date(params.checkOut);
      const numNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      return slots.map((s: any) => ({
        roomTypeId: s.roomTypeId || s.id,
        roomTypeName: s.roomTypeName || s.name,
        available: (s.availableRooms || 0) > 0,
        availableRooms: s.availableRooms || 0,
        ratePerNight: s.ratePerNight || s.rate || 0,
        totalRate: (s.ratePerNight || s.rate || 0) * numNights,
        numNights,
      }));
    } catch (error: any) {
      console.error('[HotelOTAConnector] Check availability error:', error.message);
      return [];
    }
  }

  /**
   * Hold a booking for 10 minutes
   */
  async holdBooking(params: {
    userId: string;
    hotelId: string;
    roomTypeId: string;
    checkIn: string;
    checkOut: string;
    rooms?: number;
    guests: number;
    guestName: string;
    guestPhone: string;
    userTier?: string;
    specialRequests?: string;
    coinBurnPaise?: number;
  }): Promise<BookingHold | null> {
    try {
      const response = await this.client.post('/v1/bookings/hold', {
        userId: params.userId,
        hotelId: params.hotelId,
        roomTypeId: params.roomTypeId,
        checkinDate: params.checkIn,
        checkoutDate: params.checkOut,
        numRooms: params.rooms || 1,
        numGuests: params.guests,
        guestName: params.guestName,
        guestPhone: params.guestPhone,
        specialRequests: params.specialRequests,
        channelSource: 'rez-chat',
        userTier: params.userTier || 'basic',
        otaCoinBurnPaise: params.coinBurnPaise || 0,
      });

      const data = response.data;
      const holdExpires = new Date(data.holdExpiresAt);
      const now = new Date();
      const expiresIn = Math.max(0, Math.floor((holdExpires.getTime() - now.getTime()) / 1000));

      return {
        holdId: data.id,
        bookingRef: data.bookingRef,
        hotelId: data.hotelId,
        roomTypeId: data.roomTypeId,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        numRooms: data.numRooms || 1,
        numGuests: params.guests,
        roomRate: data.roomRatePaise ? data.roomRatePaise / 100 : 0,
        totalValue: data.totalValuePaise ? data.totalValuePaise / 100 : 0,
        coinDiscount: data.coinDiscount || 0,
        finalAmount: data.finalAmountPaise ? data.finalAmountPaise / 100 : data.totalValuePaise / 100,
        holdExpiresAt: data.holdExpiresAt,
        expiresIn,
      };
    } catch (error: any) {
      console.error('[HotelOTAConnector] Hold booking error:', error.message);
      return null;
    }
  }

  /**
   * Confirm a held booking
   */
  async confirmBooking(params: {
    holdId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<BookingConfirmation | null> {
    try {
      const response = await this.client.post('/v1/bookings/confirm', {
        bookingId: params.holdId,
        razorpayPaymentId: params.razorpayPaymentId,
        razorpaySignature: params.razorpaySignature,
      });

      const data = response.data;

      return {
        bookingId: data.id,
        bookingRef: data.bookingRef,
        status: data.status,
        hotelName: data.hotel?.name || '',
        roomType: data.roomType?.name || '',
        checkIn: data.checkinDate,
        checkOut: data.checkoutDate,
        numNights: data.numNights,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        totalPaid: data.totalValuePaise ? data.totalValuePaise / 100 : 0,
        coinsEarned: data.coinsEarned || 0,
        confirmationEmail: data.email || '',
      };
    } catch (error: any) {
      console.error('[HotelOTAConnector] Confirm booking error:', error.message);
      return null;
    }
  }

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<BookingDetails | null> {
    try {
      const response = await this.client.get(`/v1/bookings/${bookingId}`);
      const data = response.data;

      return {
        bookingId: data.id,
        bookingRef: data.bookingRef,
        status: data.status,
        paymentStatus: data.paymentStatus,
        hotel: {
          id: data.hotel?.id,
          name: data.hotel?.name || '',
          address: data.hotel?.address || '',
          phone: data.hotel?.phone || '',
        },
        roomType: {
          id: data.roomType?.id,
          name: data.roomType?.name || '',
          images: data.roomType?.images || [],
        },
        checkIn: data.checkinDate,
        checkOut: data.checkoutDate,
        numNights: data.numNights,
        numRooms: data.numRooms,
        guestName: data.guestName,
        guestPhone: data.guestPhone,
        specialRequests: data.specialRequests,
        timeline: (data.timeline || []).map((t: any) => ({
          status: t.status,
          timestamp: t.timestamp,
          message: t.message,
        })),
        cancellation: data.cancelledAt ? {
          cancelledAt: data.cancelledAt,
          reason: data.cancellationReason || '',
          refundAmount: data.refundAmount || 0,
          refundStatus: data.refundStatus || '',
        } : undefined,
      };
    } catch (error: any) {
      console.error('[HotelOTAConnector] Get booking error:', error.message);
      return null;
    }
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(params: {
    bookingId: string;
    reason?: string;
    userId: string;
  }): Promise<{ success: boolean; refundAmount?: number; message: string }> {
    try {
      const response = await this.client.post(`/v1/bookings/${params.bookingId}/cancel`, {
        reason: params.reason,
        cancelledBy: 'user',
        userId: params.userId,
      });

      const data = response.data;

      return {
        success: true,
        refundAmount: data.refundAmount || 0,
        message: `Booking cancelled. Refund of ₹${(data.refundAmount || 0) / 100} will be processed.`,
      };
    } catch (error: any) {
      console.error('[HotelOTAConnector] Cancel booking error:', error.message);
      return {
        success: false,
        message: error.response?.data?.message || 'Unable to cancel booking',
      };
    }
  }

  /**
   * Get user's booking history
   */
  async getGuestOrders(userId: string, limit?: number): Promise<BookingDetails[]> {
    try {
      const response = await this.client.get('/v1/bookings/user', {
        params: { userId, limit: limit || 10 },
      });

      const bookings = response.data.bookings || response.data || [];

      return bookings.map((b: any) => ({
        bookingId: b.id,
        bookingRef: b.bookingRef,
        status: b.status,
        paymentStatus: b.paymentStatus,
        hotel: {
          id: b.hotel?.id,
          name: b.hotel?.name || '',
          address: b.hotel?.address || '',
          phone: b.hotel?.phone || '',
        },
        roomType: {
          id: b.roomType?.id,
          name: b.roomType?.name || '',
          images: b.roomType?.images || [],
        },
        checkIn: b.checkinDate,
        checkOut: b.checkoutDate,
        numNights: b.numNights,
        numRooms: b.numRooms,
        guestName: b.guestName,
        guestPhone: b.guestPhone,
        timeline: [],
      }));
    } catch (error: any) {
      console.error('[HotelOTAConnector] Get guest orders error:', error.message);
      return [];
    }
  }
}
