/**
 * CorpPerks Hotel Booking API Service
 *
 * Corporate hotel booking and management endpoints
 */

import { apiClient } from './apiClient';

// Types
export interface HotelProperty {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  starRating: number;
  images: string[];
  amenities: string[];
  roomTypes: RoomType[];
  corporatePricing: {
    discountedRate: number;
    markup: number;
    gstRate: number;
  };
  isActive: boolean;
}

export type BedType = 'single' | 'double' | 'twin' | 'queen' | 'king' | 'suite';

export interface RoomType {
  id: string;
  name: string;
  description: string;
  baseRate: number;
  corporateRate: number;
  maxOccupancy: number;
  bedType: BedType;
  amenities: string[];
  images: string[];
}

export interface HotelBooking {
  _id: string;
  bookingId: string;
  employee: {
    employeeId: string;
    name: string;
    email: string;
    department: string;
  };
  company: {
    companyId: string;
    name: string;
    gstIn: string;
  };
  property: {
    propertyId: string;
    name: string;
    city: string;
  };
  room: {
    roomTypeId: string;
    name: string;
    maxOccupancy: number;
  };
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  guestDetails: Array<{
    name: string;
    age: number;
  }>;
  pricing: {
    roomRate: number;
    numberOfRooms: number;
    subtotal: number;
    corporateDiscount: number;
    gstAmount: number;
    totalAmount: number;
    currency: string;
  };
  billing: {
    invoiceNumber: string;
    billedTo: string;
    gstIn: string;
    paymentStatus: 'pending' | 'paid' | 'cancelled';
    paymentMethod:
      | 'credit_card'
      | 'debit_card'
      | 'net_banking'
      | 'upi'
      | 'wallet'
      | 'corporate_billing';
  };
  status: 'pending' | 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  approval: {
    required: boolean;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    notes?: string;
  };
  specialRequests?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingRequest {
  employeeId: string;
  companyId: string;
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  guestDetails: Array<{ name: string; age: number }>;
  numberOfRooms?: number;
  specialRequests?: string;
  approvalRequired?: boolean;
}

export interface HotelSearchParams {
  city?: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  minRating?: number;
  maxPrice?: number;
  amenities?: string[];
}

// Helper to get company ID
function getCompanyId(): string {
  return 'demo-company';
}

// Hotel Booking API Service
export const corpHotelsApi = {
  // ========== Properties ==========

  /**
   * Search available hotel properties
   */
  async searchProperties(params: HotelSearchParams): Promise<HotelProperty[]> {
    const queryParams = new URLSearchParams();
    if (params.city) queryParams.set('city', params.city);
    if (params.checkIn) queryParams.set('checkIn', params.checkIn);
    if (params.checkOut) queryParams.set('checkOut', params.checkOut);
    if (params.guests) queryParams.set('guests', String(params.guests));
    if (params.minRating) queryParams.set('minRating', String(params.minRating));
    if (params.maxPrice) queryParams.set('maxPrice', String(params.maxPrice));

    const response = await apiClient.get<{ data: HotelProperty[] }>(
      `/api/corp/hotels/search?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get all hotel properties
   */
  async getProperties(params?: { city?: string; isActive?: boolean }): Promise<HotelProperty[]> {
    const queryParams = new URLSearchParams();
    if (params?.city) queryParams.set('city', params.city);
    if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));

    const response = await apiClient.get<{ data: HotelProperty[] }>(
      `/api/corp/hotels/properties?${queryParams}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || [];
  },

  /**
   * Get a single property by ID
   */
  async getProperty(id: string): Promise<HotelProperty | null> {
    const response = await apiClient.get<{ data: HotelProperty }>(
      `/api/corp/hotels/properties/${id}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  // ========== Bookings ==========

  /**
   * Get all bookings
   */
  async getBookings(params?: {
    status?: HotelBooking['status'];
    companyId?: string;
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: HotelBooking[];
    pagination: { total: number; page: number; limit: number };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set('status', params.status);
    if (params?.companyId) queryParams.set('companyId', params.companyId);
    if (params?.employeeId) queryParams.set('employeeId', params.employeeId);
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.page) queryParams.set('page', String(params.page));
    if (params?.limit) queryParams.set('limit', String(params.limit || 20));

    const response = await apiClient.get<{
      data: HotelBooking[];
      pagination: { total: number; page: number; limit: number };
    }>(`/api/corp/hotels/bookings?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });

    return {
      data: response.data?.data || [],
      pagination: response.data?.pagination || { total: 0, page: 1, limit: 20 },
    };
  },

  /**
   * Get a single booking by ID
   */
  async getBooking(id: string): Promise<HotelBooking | null> {
    const response = await apiClient.get<{ data: HotelBooking }>(
      `/api/corp/hotels/bookings/${id}`,
      { headers: { 'x-company-id': getCompanyId() } }
    );
    return response.data?.data || null;
  },

  /**
   * Create a new hotel booking
   */
  async createBooking(data: CreateBookingRequest): Promise<{
    bookingId: string;
    bookingRef: string;
    status: HotelBooking['status'];
    totalAmount: number;
  }> {
    const response = await apiClient.post<{
      data: {
        bookingId: string;
        bookingRef: string;
        status: HotelBooking['status'];
        totalAmount: number;
      };
    }>('/api/corp/hotels/bookings', data as unknown as Record<string, unknown>, {
      headers: { 'x-company-id': getCompanyId() },
    });
    if (!response.success) {
      throw new Error(response.message || 'Failed to create booking');
    }
    return response.data!.data;
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(id: string, reason?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/hotels/bookings/${id}/cancel`,
      {
        reason,
      },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to cancel booking');
    }
  },

  /**
   * Approve a booking (for approval workflows)
   */
  async approveBooking(id: string, notes?: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/hotels/bookings/${id}/approve`,
      {
        notes,
      },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to approve booking');
    }
  },

  /**
   * Reject a booking (for approval workflows)
   */
  async rejectBooking(id: string, reason: string): Promise<void> {
    const response = await apiClient.post(
      `/api/corp/hotels/bookings/${id}/reject`,
      {
        reason,
      },
      {
        headers: { 'x-company-id': getCompanyId() },
      }
    );
    if (!response.success) {
      throw new Error(response.message || 'Failed to reject booking');
    }
  },

  // ========== GST Invoice ==========

  /**
   * Get GST invoice for a booking
   */
  async getBookingInvoice(bookingId: string): Promise<{
    invoiceNumber: string;
    invoiceDate: string;
    taxableAmount: number;
    gstAmount: number;
    totalAmount: number;
    itcEligible: boolean;
  } | null> {
    const response = await apiClient.get<{
      data: {
        invoiceNumber: string;
        invoiceDate: string;
        taxableAmount: number;
        gstAmount: number;
        totalAmount: number;
        itcEligible: boolean;
      };
    }>(`/api/corp/hotels/bookings/${bookingId}/invoice`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return response.data?.data || null;
  },

  // ========== Analytics ==========

  /**
   * Get hotel booking analytics
   */
  async getAnalytics(params?: {
    startDate?: string;
    endDate?: string;
    companyId?: string;
  }): Promise<{
    totalBookings: number;
    totalRevenue: number;
    totalNights: number;
    avgBookingValue: number;
    topCities: Array<{ city: string; count: number; revenue: number }>;
    occupancyRate: number;
  }> {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.set('startDate', params.startDate);
    if (params?.endDate) queryParams.set('endDate', params.endDate);
    if (params?.companyId) queryParams.set('companyId', params.companyId);

    const response = await apiClient.get<{
      data: {
        totalBookings: number;
        totalRevenue: number;
        totalNights: number;
        avgBookingValue: number;
        topCities: Array<{ city: string; count: number; revenue: number }>;
        occupancyRate: number;
      };
    }>(`/api/corp/hotels/analytics?${queryParams}`, {
      headers: { 'x-company-id': getCompanyId() },
    });
    return (
      response.data?.data ?? {
        totalBookings: 0,
        totalRevenue: 0,
        totalNights: 0,
        avgBookingValue: 0,
        topCities: [],
        occupancyRate: 0,
      }
    );
  },
};

export default corpHotelsApi;
