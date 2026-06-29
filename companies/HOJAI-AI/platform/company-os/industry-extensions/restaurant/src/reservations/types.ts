/**
 * Reservations Types
 */

export interface Reservation {
  id: string;
  tenantId: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  partySize: number;
  tableId?: string;
  status: ReservationStatus;
  specialRequests?: string;
  depositAmount?: number;
  depositPaid: boolean;
  seatedAt?: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export type ReservationStatus = 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  customerName: string;
  customerPhone: string;
  partySize: number;
  quotedWaitTime?: number; // minutes
  status: 'waiting' | 'notified' | 'seated' | 'left';
  addedAt: string;
  notifiedAt?: string;
}

export interface BookingPolicy {
  id: string;
  tenantId: string;
  name: string;
  rules: BookingRule[];
  isActive: boolean;
}

export interface BookingRule {
  type: 'max_party_size' | 'advance_booking_hours' | 'deposit_required' | 'block_dates';
  value: string | number | boolean;
}

export interface CreateReservationInput {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  date: string;
  time: string;
  partySize: number;
  specialRequests?: string;
  depositAmount?: number;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  tablesAvailable: number;
}
