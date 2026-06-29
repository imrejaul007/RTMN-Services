/**
 * Reservations Service
 *
 * Tenant-aware restaurant reservation management.
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Reservation,
  WaitlistEntry,
  BookingPolicy,
  CreateReservationInput,
  ReservationStatus,
  TimeSlot,
} from './types';

// ============================================
// Store
// ============================================

const tenantStores: Map<string, {
  reservations: Map<string, Reservation>;
  waitlist: Map<string, WaitlistEntry>;
  policies: Map<string, BookingPolicy>;
}> = new Map();

function getStore(tenantId: string) {
  if (!tenantStores.has(tenantId)) {
    tenantStores.set(tenantId, {
      reservations: new Map(),
      waitlist: new Map(),
      policies: new Map(),
    });
  }
  return tenantStores.get(tenantId)!;
}

// ============================================
// Reservations Service
// ============================================

export class ReservationsService {
  /**
   * Create a reservation
   */
  createReservation(tenantId: string, input: CreateReservationInput): Reservation {
    const store = getStore(tenantId);
    const id = `res_${uuidv4().slice(0, 8)}`;

    const reservation: Reservation = {
      id,
      tenantId,
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      customerEmail: input.customerEmail,
      date: input.date,
      time: input.time,
      partySize: input.partySize,
      status: 'confirmed',
      specialRequests: input.specialRequests,
      depositAmount: input.depositAmount,
      depositPaid: false,
      createdAt: new Date().toISOString(),
    };

    store.reservations.set(id, reservation);
    return reservation;
  }

  /**
   * Get reservation by ID
   */
  getReservation(tenantId: string, reservationId: string): Reservation | null {
    const store = getStore(tenantId);
    const reservation = store.reservations.get(reservationId);

    if (!reservation || reservation.tenantId !== tenantId) {
      return null;
    }

    return reservation;
  }

  /**
   * List reservations
   */
  listReservations(
    tenantId: string,
    filters?: { date?: string; status?: ReservationStatus }
  ): Reservation[] {
    const store = getStore(tenantId);
    let reservations = Array.from(store.reservations.values())
      .filter(r => r.tenantId === tenantId);

    if (filters?.date) {
      reservations = reservations.filter(r => r.date === filters.date);
    }

    if (filters?.status) {
      reservations = reservations.filter(r => r.status === filters.status);
    }

    return reservations.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  }

  /**
   * Update reservation
   */
  updateReservation(
    tenantId: string,
    reservationId: string,
    updates: Partial<Reservation>
  ): Reservation | null {
    const store = getStore(tenantId);
    const reservation = store.reservations.get(reservationId);

    if (!reservation || reservation.tenantId !== tenantId) {
      return null;
    }

    Object.assign(reservation, updates);
    return reservation;
  }

  /**
   * Cancel reservation
   */
  cancelReservation(
    tenantId: string,
    reservationId: string,
    reason?: string
  ): Reservation | null {
    const store = getStore(tenantId);
    const reservation = store.reservations.get(reservationId);

    if (!reservation || reservation.tenantId !== tenantId) {
      return null;
    }

    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date().toISOString();
    reservation.cancellationReason = reason;

    return reservation;
  }

  /**
   * Seat reservation
   */
  seatReservation(tenantId: string, reservationId: string, tableId?: string): Reservation | null {
    const store = getStore(tenantId);
    const reservation = store.reservations.get(reservationId);

    if (!reservation || reservation.tenantId !== tenantId) {
      return null;
    }

    reservation.status = 'seated';
    reservation.seatedAt = new Date().toISOString();
    if (tableId) {
      reservation.tableId = tableId;
    }

    return reservation;
  }

  /**
   * Mark as no-show
   */
  markNoShow(tenantId: string, reservationId: string): Reservation | null {
    const store = getStore(tenantId);
    const reservation = store.reservations.get(reservationId);

    if (!reservation || reservation.tenantId !== tenantId) {
      return null;
    }

    reservation.status = 'no_show';
    return reservation;
  }

  /**
   * Check availability for a time slot
   */
  checkAvailability(
    tenantId: string,
    date: string,
    partySize: number,
    duration: number = 90
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const openTime = 11; // 11 AM
    const closeTime = 22; // 10 PM

    for (let hour = openTime; hour < closeTime; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

        // Check existing reservations
        const conflicting = Array.from(getStore(tenantId).reservations.values())
          .filter(r =>
            r.tenantId === tenantId &&
            r.date === date &&
            r.time === time &&
            ['confirmed', 'seated'].includes(r.status)
          );

        const tablesAvailable = Math.max(0, 20 - conflicting.length); // Assume 20 tables

        slots.push({
          time,
          available: tablesAvailable >= Math.ceil(partySize / 4),
          tablesAvailable,
        });
      }
    }

    return slots;
  }

  // ========================================
  // Waitlist
  // ========================================

  addToWaitlist(
    tenantId: string,
    customerName: string,
    customerPhone: string,
    partySize: number
  ): WaitlistEntry {
    const store = getStore(tenantId);
    const id = `wait_${uuidv4().slice(0, 8)}`;

    const entry: WaitlistEntry = {
      id,
      tenantId,
      customerName,
      customerPhone,
      partySize,
      status: 'waiting',
      addedAt: new Date().toISOString(),
    };

    store.waitlist.set(id, entry);
    return entry;
  }

  getWaitlist(tenantId: string): WaitlistEntry[] {
    const store = getStore(tenantId);
    return Array.from(store.waitlist.values())
      .filter(w => w.tenantId === tenantId && w.status === 'waiting')
      .sort((a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime());
  }

  removeFromWaitlist(tenantId: string, entryId: string): boolean {
    const store = getStore(tenantId);
    const entry = store.waitlist.get(entryId);

    if (!entry || entry.tenantId !== tenantId) {
      return false;
    }

    entry.status = 'left';
    return true;
  }

  /**
   * Delete tenant data
   */
  deleteTenantData(tenantId: string): void {
    tenantStores.delete(tenantId);
  }
}

export const reservationsService = new ReservationsService();
