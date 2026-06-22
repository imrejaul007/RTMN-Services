/**
 * Hotel OTA (Online Travel Agency) API Service
 *
 * Integration with Makcorps and other hotel booking APIs
 * for corporate hotel booking through CorpPerks.
 */

import { apiClient } from './apiClient';

// Types
export interface OTARoom {
  roomId: string;
  roomType: string;
  description: string;
  maxOccupancy: number;
  bedType: string;
  baseRate: number;
  corporateRate: number;
  discount: number;
  amenities: string[];
  images: string[];
  cancellationPolicy: {
    freeCancellationUntil: string;
    cancellationFee: number;
  };
  available: boolean;
  availableRooms: number;
}

export interface OTAProperty {
  propertyId: string;
  name: string;
  description: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  starRating: number;
  userRating: number;
  reviewCount: number;
  images: string[];
  amenities: string[];
  policies: {
    checkIn: string;
    checkOut: string;
    childrenAllowed: boolean;
    petsAllowed: boolean;
  };
  rooms: OTARoom[];
  gstInfo: {
    gstIn?: string;
    hsnCode: string;
    taxRate: number;
  };
  corporatePricing: {
    enabled: boolean;
    discountPercent: number;
    markupPercent: number;
  };
}

export interface OTASearchParams {
  city?: string;
  location?: {
    lat: number;
    lng: number;
    radius?: number; // km
  };
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
  minRating?: number;
  maxPrice?: number;
  amenities?: string[];
  propertyType?: 'hotel' | 'resort' | 'homestay' | 'all';
}

export interface OTABookingRequest {
  propertyId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestDetails: Array<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }>;
  specialRequests?: string;
  corporateCode?: string;
}

export interface OTABooking {
  bookingId: string;
  confirmationNumber: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  property: {
    propertyId: string;
    name: string;
    address: string;
    phone: string;
  };
  room: {
    roomId: string;
    name: string;
    bedType: string;
  };
  guest: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  dates: {
    checkIn: string;
    checkOut: string;
    nights: number;
  };
  pricing: {
    roomRate: number;
    numberOfRooms: number;
    subtotal: number;
    discount: number;
    gstAmount: number;
    totalAmount: number;
    currency: string;
  };
  cancellationPolicy: {
    freeCancellationUntil: string;
    cancellationFee: number;
  };
  invoice?: {
    invoiceNumber: string;
    gstIn: string;
  };
  createdAt: string;
}

export interface OTAInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  bookingRef: string;
  hotel: {
    name: string;
    address: string;
    gstIn: string;
  };
  guest: {
    name: string;
    email: string;
    phone: string;
  };
  stay: {
    checkIn: string;
    checkOut: string;
    nights: number;
    roomType: string;
  };
  charges: {
    roomCharges: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    totalTax: number;
    totalAmount: number;
  };
  payment: {
    status: 'paid' | 'pending' | 'refunded';
    method: string;
    transactionId?: string;
  };
}

// Helper
function getCompanyId(): string {
  return 'demo-company';
}

// OTA API Service
export const hotelOTAApi = {
  // ========== Property Search ==========

  /**
   * Search available properties
   */
  async searchProperties(params: OTASearchParams): Promise<OTAProperty[]> {
    const queryParams = new URLSearchParams();
    if (params.city) queryParams.set('city', params.city);
    if (params.location) {
      queryParams.set('lat', String(params.location.lat));
      queryParams.set('lng', String(params.location.lng));
      if (params.location.radius) queryParams.set('radius', String(params.location.radius));
    }
    queryParams.set('checkIn', params.checkIn);
    queryParams.set('checkOut', params.checkOut);
    queryParams.set('guests', String(params.guests));
    if (params.rooms) queryParams.set('rooms', String(params.rooms));
    if (params.minRating) queryParams.set('minRating', String(params.minRating));
    if (params.maxPrice) queryParams.set('maxPrice', String(params.maxPrice));
    if (params.propertyType) queryParams.set('propertyType', params.propertyType);

    const response = await apiClient.get<{ data: OTAProperty[] }>(
      `/api/ota/hotels/search?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get property details
   */
  async getProperty(propertyId: string): Promise<OTAProperty | null> {
    const response = await apiClient.get<{ data: OTAProperty }>(`/api/ota/hotels/${propertyId}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Get room availability for specific dates
   */
  async getRoomAvailability(
    propertyId: string,
    checkIn: string,
    checkOut: string
  ): Promise<OTARoom[]> {
    const response = await apiClient.get<{ data: OTARoom[] }>(
      `/api/ota/hotels/${propertyId}/availability?checkIn=${checkIn}&checkOut=${checkOut}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  // ========== Booking ==========

  /**
   * Create a hotel booking
   */
  async createBooking(data: OTABookingRequest): Promise<OTABooking> {
    const response = await apiClient.post<{ data: OTABooking }>('/api/ota/bookings', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to create booking');
    }
    return response.data!.data;
  },

  /**
   * Get booking details
   */
  async getBooking(bookingId: string): Promise<OTABooking | null> {
    const response = await apiClient.get<{ data: OTABooking }>(`/api/ota/bookings/${bookingId}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(bookingId: string, reason?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/ota/bookings/${bookingId}/cancel`,
      { reason },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel booking');
    }
  },

  /**
   * Get booking invoice
   */
  async getBookingInvoice(bookingId: string): Promise<OTAInvoice | null> {
    const response = await apiClient.get<{ data: OTAInvoice }>(
      `/api/ota/bookings/${bookingId}/invoice`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  // ========== Corporate Rates ==========

  /**
   * Apply corporate rates to a booking
   */
  async applyCorporateRate(params: {
    propertyId: string;
    roomId: string;
    corporateCode: string;
  }): Promise<{ discountedRate: number; savings: number; discountPercent: number }> {
    const response = await apiClient.post<{
      data: { discountedRate: number; savings: number; discountPercent: number };
    }>('/api/ota/corporate/apply-rate', params, { headers: { 'x-company-id': getCompanyId() } });
    if (!response.success) {
      throw new Error(response.message || 'Failed to apply corporate rate');
    }
    return response.data!.data;
  },

  /**
   * Validate corporate booking code
   */
  async validateCorporateCode(code: string): Promise<{
    valid: boolean;
    companyName?: string;
    discountPercent?: number;
    benefits?: string[];
  }> {
    const response = await apiClient.post<{
      data: { valid: boolean; companyName?: string; discountPercent?: number; benefits?: string[] };
    }>('/api/ota/corporate/validate', { code }, { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data || { valid: false };
  },

  // ========== Pricing & GST ==========

  /**
   * Calculate final price with GST
   */
  async calculatePrice(params: {
    propertyId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    corporateCode?: string;
    applyCorpDiscount?: boolean;
  }): Promise<{
    baseRate: number;
    nights: number;
    subtotal: number;
    corporateDiscount: number;
    taxableAmount: number;
    cgstRate: number;
    cgstAmount: number;
    sgstRate: number;
    sgstAmount: number;
    totalTax: number;
    totalAmount: number;
    itcEligible: boolean;
  }> {
    const response = await apiClient.post<{
      data: {
        baseRate: number;
        nights: number;
        subtotal: number;
        corporateDiscount: number;
        taxableAmount: number;
        cgstRate: number;
        cgstAmount: number;
        sgstRate: number;
        sgstAmount: number;
        totalTax: number;
        totalAmount: number;
        itcEligible: boolean;
      };
    }>('/api/ota/pricing/calculate', params, { headers: { 'x-company-id': getCompanyId() } });
    if (!response.success) {
      throw new Error(response.message || 'Failed to calculate price');
    }
    return response.data!.data;
  },

  // ========== Favorites & History ==========

  /**
   * Save property to favorites
   */
  async saveToFavorites(propertyId: string): Promise<void> {
    const response = await apiClient.post(
      `/api/ota/favorites/${propertyId}`,
      {},
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to save to favorites');
    }
  },

  /**
   * Get booking history
   */
  async getBookingHistory(params?: {
    status?: OTABooking['status'];
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: OTABooking[]; pagination: { total: number; page: number; limit: number } }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: OTABooking[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/ota/bookings/history?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  // ========== Hotel Chains (Contracted Rates) ==========

  /**
   * Get contracted hotel chains for corporate
   */
  async getContractedChains(): Promise<
    Array<{
      chainId: string;
      name: string;
      logo: string;
      propertyCount: number;
      discountPercent: number;
      benefits: string[];
    }>
  > {
    const response = await apiClient.get<{
      data: Array<{
        chainId: string;
        name: string;
        logo: string;
        propertyCount: number;
        discountPercent: number;
        benefits: string[];
      }>;
    }>('/api/ota/corporate/chains', { headers: { 'x-company-id': getCompanyId() } });
    return response.data?.data || [];
  },

  /**
   * Search within contracted chains only
   */
  async searchContractedProperties(params: OTASearchParams): Promise<OTAProperty[]> {
    const queryParams = new URLSearchParams();
    if (params.city) queryParams.set('city', params.city);
    queryParams.set('checkIn', params.checkIn);
    queryParams.set('checkOut', params.checkOut);
    queryParams.set('guests', String(params.guests));
    if (params.minRating) queryParams.set('minRating', String(params.minRating));
    if (params.maxPrice) queryParams.set('maxPrice', String(params.maxPrice));

    const response = await apiClient.get<{ data: OTAProperty[] }>(
      `/api/ota/corporate/search?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },
};

export default hotelOTAApi;
