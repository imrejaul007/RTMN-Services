/**
 * REZ Booking Client
 *
 * Wraps rez-booking-service: availability search, bookings,
 * confirmations, calendar sync.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';

export interface Booking {
  id: string;
  userId: string;
  itemId: string;
  itemType: string;
  startsAt: string;
  endsAt: string;
  status: BookingStatus;
  totalPrice: { amount: number; currency: string };
  metadata?: Record<string, unknown>;
  confirmationCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingInput {
  userId: string;
  itemId: string;
  itemType: string;
  startsAt: string;
  endsAt: string;
  metadata?: Record<string, unknown>;
}

export interface AvailabilityResult {
  itemId: string;
  slots: Array<{ startsAt: string; endsAt: string; available: boolean; price?: { amount: number; currency: string } }>;
}

export interface AvailabilityQuery {
  itemType: string;
  startDate: string;
  endDate: string;
  filters?: Record<string, unknown>;
}

export class BookingClient {
  constructor(private config: HojaiConfig) {}

  async searchAvailability(query: AvailabilityQuery): Promise<AvailabilityResult[]> {
    return request<AvailabilityResult[]>(this.config, 'POST', '/api/availability/search', query);
  }

  async checkAvailability(id: string): Promise<AvailabilityResult> {
    return request<AvailabilityResult>(this.config, 'GET', `/api/availability/${encodeURIComponent(id)}`);
  }

  async createBooking(input: BookingInput): Promise<Booking> {
    return request<Booking>(this.config, 'POST', '/api/bookings', input);
  }

  async getBooking(id: string): Promise<Booking> {
    return request<Booking>(this.config, 'GET', `/api/bookings/${encodeURIComponent(id)}`);
  }

  async updateBooking(id: string, patch: Partial<BookingInput>): Promise<Booking> {
    return request<Booking>(this.config, 'PUT', `/api/bookings/${encodeURIComponent(id)}`, patch);
  }

  async cancelBooking(id: string, reason?: string): Promise<Booking> {
    return request<Booking>(this.config, 'DELETE', `/api/bookings/${encodeURIComponent(id)}`, { reason });
  }

  async confirmBooking(id: string): Promise<Booking> {
    return request<Booking>(this.config, 'POST', `/api/bookings/${encodeURIComponent(id)}/confirm`);
  }

  async resendConfirmation(id: string): Promise<{ sent: boolean; channel: string }> {
    return request(this.config, 'POST', `/api/bookings/${encodeURIComponent(id)}/resend`);
  }

  async getBookingCalendar(id: string): Promise<{ bookingId: string; ical: string; googleCalendarUrl: string; outlookUrl: string }> {
    return request(this.config, 'GET', `/api/bookings/${encodeURIComponent(id)}/calendar`);
  }

  async syncCalendar(input: { source: 'google' | 'outlook' | 'apple'; userId: string }): Promise<{ synced: number; errors: Array<{ bookingId: string; error: string }> }> {
    return request(this.config, 'POST', '/api/calendar/sync', input);
  }
}