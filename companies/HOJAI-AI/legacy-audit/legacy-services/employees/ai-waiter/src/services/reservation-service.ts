/**
 * Reservation Service Client
 * Connects AI Waiter to REZ Table Booking Service (Port 4070)
 */

import axios, { AxiosInstance } from 'axios';

export interface Reservation {
  id?: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  guestCount: number;
  dateTime: Date;
  occasion?: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  tableId?: string;
  specialRequests?: string;
  createdAt?: string;
}

export interface CreateReservationRequest {
  customerId: string;
  customerName: string;
  guestCount: number;
  dateTime: Date;
  occasion?: string;
  phone?: string;
  status?: string;
  tableId?: string;
  specialRequests?: string;
}

export interface AvailabilityResponse {
  success: boolean;
  data?: {
    available: boolean;
    tables?: any[];
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ReservationService {
  private client: AxiosInstance;

  constructor(
    bookingUrl: string = process.env.TABLE_BOOKING_URL || 'http://localhost:4070'
  ) {
    this.client = axios.create({
      baseURL: bookingUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': process.env.INTERNAL_SERVICE_TOKEN || 'dev-token',
      },
    });
  }

  /**
   * Create a new reservation
   */
  async create(request: CreateReservationRequest): Promise<Reservation> {
    try {
      const response = await this.client.post<ApiResponse<Reservation>>('/api/reservations', {
        merchantId: process.env.MERCHANT_ID || 'default-merchant',
        customerId: request.customerId,
        customerName: request.customerName,
        customerPhone: request.phone,
        date: request.dateTime,
        time: this.formatTime(request.dateTime),
        partySize: request.guestCount,
        tableId: request.tableId,
        occasion: request.occasion,
        specialRequests: request.specialRequests,
        status: 'confirmed',
      });

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('ReservationService.create error:', this.getErrorMessage(error));
    }

    // Return demo reservation if service unavailable
    return this.createDemoReservation(request);
  }

  /**
   * Check table availability
   */
  async checkAvailability(
    date: Date,
    guestCount: number,
    time?: string
  ): Promise<{ available: boolean; tables?: any[] }> {
    try {
      const response = await this.client.get<AvailabilityResponse>('/api/availability', {
        params: {
          merchantId: process.env.MERCHANT_ID || 'default-merchant',
          date: date.toISOString(),
          time: time || this.formatTime(date),
          partySize: guestCount,
        },
      });

      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('ReservationService.checkAvailability error:', this.getErrorMessage(error));
    }

    // Demo availability
    return { available: true, tables: [] };
  }

  /**
   * Get reservation by ID
   */
  async getReservation(reservationId: string): Promise<Reservation | null> {
    try {
      const response = await this.client.get<ApiResponse<Reservation>>(
        `/api/reservations/${reservationId}`
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('ReservationService.getReservation error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Get reservations for a customer
   */
  async getCustomerReservations(customerId: string): Promise<Reservation[]> {
    try {
      const response = await this.client.get<ApiResponse<Reservation[]>>(
        '/api/reservations',
        {
          params: {
            merchantId: process.env.MERCHANT_ID || 'default-merchant',
          },
        }
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data.filter(r => r.customerId === customerId);
      }
    } catch (error) {
      console.error('ReservationService.getCustomerReservations error:', this.getErrorMessage(error));
    }
    return [];
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId: string): Promise<boolean> {
    try {
      const response = await this.client.delete<ApiResponse<any>>(
        `/api/reservations/${reservationId}`
      );
      return response.data?.success || false;
    } catch (error) {
      console.error('ReservationService.cancelReservation error:', this.getErrorMessage(error));
      return false;
    }
  }

  /**
   * Update reservation
   */
  async updateReservation(
    reservationId: string,
    updates: Partial<Reservation>
  ): Promise<Reservation | null> {
    try {
      const response = await this.client.put<ApiResponse<Reservation>>(
        `/api/reservations/${reservationId}`,
        updates
      );
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
    } catch (error) {
      console.error('ReservationService.updateReservation error:', this.getErrorMessage(error));
    }
    return null;
  }

  /**
   * Get upcoming reservations
   */
  async getUpcomingReservations(): Promise<Reservation[]> {
    try {
      const response = await this.client.get<ApiResponse<Reservation[]>>(
        '/api/reservations',
        {
          params: {
            merchantId: process.env.MERCHANT_ID || 'default-merchant',
            status: 'confirmed',
          },
        }
      );
      if (response.data?.success && response.data?.data) {
        const now = new Date();
        return response.data.data.filter(r => new Date(r.dateTime) > now);
      }
    } catch (error) {
      console.error('ReservationService.getUpcomingReservations error:', this.getErrorMessage(error));
    }
    return [];
  }

  /**
   * Format time for API
   */
  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Create demo reservation for fallback
   */
  private createDemoReservation(request: CreateReservationRequest): Reservation {
    return {
      id: `demo-res-${Date.now()}`,
      customerId: request.customerId,
      customerName: request.customerName,
      customerPhone: request.phone,
      guestCount: request.guestCount,
      dateTime: request.dateTime,
      occasion: request.occasion,
      status: 'confirmed',
      tableId: `T${Math.floor(Math.random() * 20) + 1}`,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Get error message from axios error
   */
  private getErrorMessage(error: any): string {
    if (axios.isAxiosError(error)) {
      return error.response?.data?.message || error.message;
    }
    return error.message || 'Unknown error';
  }
}

export default ReservationService;
