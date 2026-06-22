/**
 * Voice Booking Service
 *
 * Handles voice-initiated bookings
 */

import { v4 as uuidv4 } from 'uuid';
import { VoiceBooking } from '../types.js';

// In-memory storage (replace with MongoDB)
const bookings = new Map<string, VoiceBooking>();

export class BookingService {

  /**
   * Create booking
   */
  async createBooking(data: {
    customerId: string;
    customerPhone: string;
    service: VoiceBooking['service'];
    details: Record<string, any>;
    datetime?: Date;
    channel: 'voice' | 'whatsapp' | 'chat';
  }): Promise<VoiceBooking> {
    const bookingId = uuidv4();

    const booking: VoiceBooking = {
      bookingId,
      customerId: data.customerId,
      customerPhone: data.customerPhone,
      service: data.service,
      details: data.details,
      datetime: data.datetime,
      status: 'pending',
      channel: data.channel,
      createdAt: new Date()
    };

    bookings.set(bookingId, booking);
    return booking;
  }

  /**
   * Confirm booking
   */
  async confirm(bookingId: string): Promise<boolean> {
    const booking = bookings.get(bookingId);
    if (!booking) return false;

    booking.status = 'confirmed';
    bookings.set(bookingId, booking);
    return true;
  }

  /**
   * Cancel booking
   */
  async cancel(bookingId: string): Promise<boolean> {
    const booking = bookings.get(bookingId);
    if (!booking) return false;

    booking.status = 'cancelled';
    bookings.set(bookingId, booking);
    return true;
  }

  /**
   * Complete booking
   */
  async complete(bookingId: string): Promise<boolean> {
    const booking = bookings.get(bookingId);
    if (!booking) return false;

    booking.status = 'completed';
    bookings.set(bookingId, booking);
    return true;
  }

  /**
   * Get booking
   */
  async getBooking(bookingId: string): Promise<VoiceBooking | null> {
    return bookings.get(bookingId) || null;
  }

  /**
   * Get customer bookings
   */
  async getCustomerBookings(customerId: string): Promise<VoiceBooking[]> {
    return Array.from(bookings.values()).filter(b => b.customerId === customerId);
  }

  /**
   * Get service availability (simplified)
   */
  async checkAvailability(
    service: VoiceBooking['service'],
    datetime: Date
  ): Promise<{ available: boolean; slots?: string[] }> {
    // Simplified - check if any bookings at this time
    const existingBookings = Array.from(bookings.values()).filter(b =>
      b.service === service &&
      b.datetime?.toISOString().split('T')[0] === datetime.toISOString().split('T')[0]
    );

    // For demo, always available
    return {
      available: true,
      slots: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']
    };
  }

  /**
   * Get analytics
   */
  async getAnalytics(): Promise<{
    totalBookings: number;
    byService: Record<string, number>;
    pending: number;
    confirmed: number;
    completed: number;
  }> {
    const all = Array.from(bookings.values());

    const byService: Record<string, number> = {};
    all.forEach(b => {
      byService[b.service] = (byService[b.service] || 0) + 1;
    });

    return {
      totalBookings: all.length,
      byService,
      pending: all.filter(b => b.status === 'pending').length,
      confirmed: all.filter(b => b.status === 'confirmed').length,
      completed: all.filter(b => b.status === 'completed').length
    };
  }
}

export const bookingService = new BookingService();
