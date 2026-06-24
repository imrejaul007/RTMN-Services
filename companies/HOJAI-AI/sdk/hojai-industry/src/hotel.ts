/**
 * Hotel OS SDK client (port 5025)
 *
 * Extends the base template surface with hotel-specific entities:
 * rooms (status), bookings (lifecycle: create/check-in/check-out/cancel),
 * and guests.
 *
 * Note: the hotel service does NOT expose the /api/menu, /api/tables
 * endpoints that the template provides. We override those to throw so
 * misuse is caught at runtime instead of producing confusing 404s.
 */

import type { HojaiConfig } from './foundation-config.js';
import { request } from './utils.js';
import { IndustryBaseClient } from './base.js';

export interface Room {
  id: string;
  number: string;
  type: 'single' | 'double' | 'suite' | 'deluxe' | 'penthouse';
  capacity: number;
  pricePerNight: { amount: number; currency: string };
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  amenities?: string[];
}

export interface Booking {
  id: string;
  roomId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  status: 'pending' | 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  totalPrice: { amount: number; currency: string };
  createdAt: string;
}

export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  /** Loyalty points */
  points: number;
}

export class HotelClient extends IndustryBaseClient {
  constructor(config: HojaiConfig) {
    super(config, 5025);
  }

  // ─── Rooms ───

  async listRooms(input: { type?: Room['type']; status?: Room['status'] } = {}): Promise<Room[]> {
    const qs = new URLSearchParams();
    if (input.type) qs.set('type', input.type);
    if (input.status) qs.set('status', input.status);
    return request<Room[]>(this.config, 'GET', `/api/rooms${qs.toString() ? '?' + qs.toString() : ''}`);
  }

  async getRoom(roomId: string): Promise<Room> {
    return request<Room>(this.config, 'GET', `/api/rooms/${encodeURIComponent(roomId)}`);
  }

  async updateRoomStatus(roomId: string, status: Room['status']): Promise<Room> {
    return request<Room>(this.config, 'POST', `/api/rooms/${encodeURIComponent(roomId)}/status`, { status });
  }

  // ─── Bookings ───

  async listBookings(input: { status?: Booking['status']; guestId?: string } = {}): Promise<Booking[]> {
    const qs = new URLSearchParams();
    if (input.status) qs.set('status', input.status);
    if (input.guestId) qs.set('guestId', input.guestId);
    return request<Booking[]>(this.config, 'GET', `/api/bookings${qs.toString() ? '?' + qs.toString() : ''}`);
  }

  async getBooking(bookingId: string): Promise<Booking> {
    return request<Booking>(this.config, 'GET', `/api/bookings/${encodeURIComponent(bookingId)}`);
  }

  async createBooking(input: { roomId: string; guestId: string; checkIn: string; checkOut: string; notes?: string }): Promise<Booking> {
    return request<Booking>(this.config, 'POST', '/api/bookings', input);
  }

  async checkIn(bookingId: string): Promise<Booking> {
    return request<Booking>(this.config, 'POST', `/api/bookings/${encodeURIComponent(bookingId)}/check-in`);
  }

  async checkOut(bookingId: string): Promise<Booking> {
    return request<Booking>(this.config, 'POST', `/api/bookings/${encodeURIComponent(bookingId)}/check-out`);
  }

  async cancelBooking(bookingId: string, reason?: string): Promise<Booking> {
    return request<Booking>(this.config, 'POST', `/api/bookings/${encodeURIComponent(bookingId)}/cancel`, { reason });
  }

  // ─── Guests ───

  async listGuests(input: { limit?: number } = {}): Promise<Guest[]> {
    const qs = input.limit ? `?limit=${input.limit}` : '';
    return request<Guest[]>(this.config, 'GET', `/api/guests${qs}`);
  }

  async addGuest(input: { name: string; email?: string; phone?: string }): Promise<Guest> {
    return request<Guest>(this.config, 'POST', '/api/guests', input);
  }

  async addGuestPoints(guestId: string, points: number, reason?: string): Promise<Guest> {
    return request<Guest>(this.config, 'POST', `/api/guests/${encodeURIComponent(guestId)}/points`, { points, reason });
  }
}
