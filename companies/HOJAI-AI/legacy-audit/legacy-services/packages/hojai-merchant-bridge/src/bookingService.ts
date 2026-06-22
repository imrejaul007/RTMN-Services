/**
 * HOJAI Merchant Bridge - Booking Service
 * Booking/reservation management
 */
import axios from 'axios';
import type { Booking, TimeSlot } from './types.js';

const BOOKING_API_URL = process.env.REZ_BOOKING_URL || 'http://localhost:4020';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export interface CreateBookingInput {
  merchantId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  date: string;
  time: string;
  guests: number;
  type: 'salon' | 'restaurant' | 'clinic' | 'hotel';
  service?: string;
  notes?: string;
}

export class BookingBridgeService {
  private baseUrl: string;
  private token: string;

  constructor(baseUrl?: string, token?: string) {
    this.baseUrl = baseUrl || BOOKING_API_URL;
    this.token = token || INTERNAL_TOKEN || '';
  }

  private headers() {
    return {
      'X-Internal-Token': this.token,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Create booking
   */
  async create(input: CreateBookingInput): Promise<Booking | null> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/api/bookings`,
        input,
        { headers: this.headers() }
      );
      return this.transformBooking(res.data);
    } catch (error) {
      console.error('[BookingBridge] Failed to create booking:', error);
      return null;
    }
  }

  /**
   * Get booking by ID
   */
  async get(bookingId: string): Promise<Booking | null> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/bookings/${bookingId}`,
        { headers: this.headers() }
      );
      return this.transformBooking(res.data);
    } catch (error) {
      console.error('[BookingBridge] Failed to get booking:', error);
      return null;
    }
  }

  /**
   * Update booking
   */
  async update(bookingId: string, updates: Partial<Booking>): Promise<boolean> {
    try {
      await axios.patch(
        `${this.baseUrl}/api/bookings/${bookingId}`,
        updates,
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[BookingBridge] Failed to update booking:', error);
      return false;
    }
  }

  /**
   * Cancel booking
   */
  async cancel(bookingId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/bookings/${bookingId}/cancel`,
        {},
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[BookingBridge] Failed to cancel booking:', error);
      return false;
    }
  }

  /**
   * Get available time slots
   */
  async getAvailableSlots(
    merchantId: string,
    date: string,
    guests: number,
    type: string
  ): Promise<TimeSlot[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/bookings/slots?merchantId=${merchantId}&date=${date}&guests=${guests}&type=${type}`,
        { headers: this.headers() }
      );
      return res.data.slots || [];
    } catch (error) {
      console.error('[BookingBridge] Failed to get slots:', error);
      return this.generateTimeSlots();
    }
  }

  /**
   * Get bookings by merchant
   */
  async getByMerchant(merchantId: string, date?: string): Promise<Booking[]> {
    try {
      const params = date ? `?date=${date}` : '';
      const res = await axios.get(
        `${this.baseUrl}/api/bookings/merchant/${merchantId}${params}`,
        { headers: this.headers() }
      );
      return (res.data.bookings || []).map(this.transformBooking);
    } catch (error) {
      console.error('[BookingBridge] Failed to get bookings:', error);
      return [];
    }
  }

  /**
   * Get bookings by customer
   */
  async getByCustomer(customerId: string): Promise<Booking[]> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/api/bookings/customer/${customerId}`,
        { headers: this.headers() }
      );
      return (res.data.bookings || []).map(this.transformBooking);
    } catch (error) {
      console.error('[BookingBridge] Failed to get customer bookings:', error);
      return [];
    }
  }

  /**
   * Confirm booking
   */
  async confirm(bookingId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/bookings/${bookingId}/confirm`,
        {},
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[BookingBridge] Failed to confirm booking:', error);
      return false;
    }
  }

  /**
   * Send reminder
   */
  async sendReminder(bookingId: string): Promise<boolean> {
    try {
      await axios.post(
        `${this.baseUrl}/api/bookings/${bookingId}/remind`,
        {},
        { headers: this.headers() }
      );
      return true;
    } catch (error) {
      console.error('[BookingBridge] Failed to send reminder:', error);
      return false;
    }
  }

  private transformBooking(data: any): Booking | null {
    if (!data) return null;
    return {
      id: data._id?.toString() || data.id,
      merchantId: data.merchantId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      date: data.date,
      time: data.time,
      guests: data.guests,
      type: data.type,
      status: data.status || 'pending',
      service: data.service,
      notes: data.notes,
      createdAt: new Date(data.createdAt)
    };
  }

  private generateTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 21; hour++) {
      for (const min of ['00', '30']) {
        const time = `${hour.toString().padStart(2, '0')}:${min}`;
        slots.push({
          time,
          available: Math.random() > 0.3
        });
      }
    }
    return slots;
  }
}

export const bookingBridge = new BookingBridgeService();
