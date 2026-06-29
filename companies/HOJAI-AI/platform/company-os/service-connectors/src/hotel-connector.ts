/**
 * Hotel Service Connector
 *
 * Connects to REZ-Merchant hotel services.
 */

import { BaseConnector, ServiceResponse } from './base-connector';
import { TenantContext } from './shared/types';

// ============================================
// Service URLs
// ============================================

const REZ_HOTEL_SERVICES = {
  pms: process.env.REZ_PMS_SERVICE_URL || 'http://localhost:3020', // Property Management
  booking: process.env.REZ_BOOKING_SERVICE_URL || 'http://localhost:3021',
  channel: process.env.REZ_HOTEL_CHANNEL_URL || 'http://localhost:3022',
  housekeeping: process.env.REZ_HOUSEKEEPING_URL || 'http://localhost:3023',
  billing: process.env.REZ_HOTEL_BILLING_URL || 'http://localhost:3024',
};

// ============================================
// Types
// ============================================

export interface Room {
  id: string;
  number: string;
  type: 'standard' | 'deluxe' | 'suite' | 'presidential';
  floor: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  basePrice: number;
  amenities: string[];
  capacity: number;
}

export interface Guest {
  id: string;
  name: string;
  email?: string;
  phone: string;
  address?: string;
  idProof?: string;
  preferences?: string[];
}

export interface Booking {
  id: string;
  guestId: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  totalAmount: number;
  source: 'direct' | 'walkin' | 'ota' | 'corporate';
  specialRequests?: string;
}

export interface HousekeepingTask {
  id: string;
  roomId: string;
  type: 'cleaning' | 'maintenance' | 'turndown';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed';
  assignedTo?: string;
  scheduledFor: string;
}

export interface Invoice {
  id: string;
  guestId: string;
  bookingId: string;
  items: {
    description: string;
    amount: number;
    type: 'room' | 'food' | 'laundry' | 'minibar' | 'other';
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'refunded';
  paidAt?: string;
}

// ============================================
// Hotel Connector
// ============================================

export class HotelConnector {
  private pmsService: BaseConnector;
  private bookingService: BaseConnector;
  private channelService: BaseConnector;
  private housekeepingService: BaseConnector;
  private billingService: BaseConnector;
  private tenant?: TenantContext;

  constructor(tenant?: TenantContext) {
    this.pmsService = new BaseConnector({ baseUrl: REZ_HOTEL_SERVICES.pms });
    this.bookingService = new BaseConnector({ baseUrl: REZ_HOTEL_SERVICES.booking });
    this.channelService = new BaseConnector({ baseUrl: REZ_HOTEL_SERVICES.channel });
    this.housekeepingService = new BaseConnector({ baseUrl: REZ_HOTEL_SERVICES.housekeeping });
    this.billingService = new BaseConnector({ baseUrl: REZ_HOTEL_SERVICES.billing });

    if (tenant) {
      this.setTenant(tenant);
    }
  }

  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
    this.pmsService.setTenant(tenant);
    this.bookingService.setTenant(tenant);
    this.channelService.setTenant(tenant);
    this.housekeepingService.setTenant(tenant);
    this.billingService.setTenant(tenant);
  }

  // ========================================
  // ROOM OPERATIONS
  // ========================================

  async getRooms(filters?: { status?: string; type?: string }): Promise<ServiceResponse<Room[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.pmsService.get<Room[]>(`/api/rooms${query ? `?${query}` : ''}`);
  }

  async getRoom(id: string): Promise<ServiceResponse<Room>> {
    return this.pmsService.get<Room>(`/api/rooms/${id}`);
  }

  async updateRoomStatus(id: string, status: Room['status']): Promise<ServiceResponse<Room>> {
    return this.pmsService.patch<Room>(`/api/rooms/${id}/status`, { status });
  }

  async checkAvailability(checkIn: string, checkOut: string, roomType?: string): Promise<ServiceResponse<Room[]>> {
    const params = new URLSearchParams({ checkIn, checkOut, ...(roomType && { type: roomType }) });
    return this.pmsService.get<Room[]>(`/api/rooms/availability?${params}`);
  }

  // ========================================
  // GUEST OPERATIONS
  // ========================================

  async createGuest(guest: Omit<Guest, 'id'>): Promise<ServiceResponse<Guest>> {
    return this.pmsService.post<Guest>('/api/guests', guest);
  }

  async getGuest(id: string): Promise<ServiceResponse<Guest>> {
    return this.pmsService.get<Guest>(`/api/guests/${id}`);
  }

  async listGuests(): Promise<ServiceResponse<Guest[]>> {
    return this.pmsService.get<Guest[]>('/api/guests');
  }

  // ========================================
  // BOOKING OPERATIONS
  // ========================================

  async createBooking(booking: {
    guestId: string;
    roomId: string;
    checkIn: string;
    checkOut: string;
    source?: 'direct' | 'walkin' | 'ota' | 'corporate';
    specialRequests?: string;
  }): Promise<ServiceResponse<Booking>> {
    return this.bookingService.post<Booking>('/api/bookings', booking);
  }

  async getBooking(id: string): Promise<ServiceResponse<Booking>> {
    return this.bookingService.get<Booking>(`/api/bookings/${id}`);
  }

  async listBookings(filters?: { status?: string; date?: string }): Promise<ServiceResponse<Booking[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.bookingService.get<Booking[]>(`/api/bookings${query ? `?${query}` : ''}`);
  }

  async checkIn(bookingId: string): Promise<ServiceResponse<Booking>> {
    return this.bookingService.post<Booking>(`/api/bookings/${bookingId}/checkin`, {});
  }

  async checkOut(bookingId: string): Promise<ServiceResponse<Booking>> {
    return this.bookingService.post<Booking>(`/api/bookings/${bookingId}/checkout`, {});
  }

  async cancelBooking(id: string): Promise<ServiceResponse<Booking>> {
    return this.bookingService.delete<Booking>(`/api/bookings/${id}`);
  }

  // ========================================
  // CHANNEL MANAGER
  // ========================================

  async syncChannels(): Promise<ServiceResponse<{ synced: number; failed: number }>> {
    return this.channelService.post<{ synced: number; failed: number }>('/api/channels/sync', {});
  }

  async getChannelBookings(): Promise<ServiceResponse<Booking[]>> {
    return this.channelService.get<Booking[]>('/api/channels/bookings');
  }

  // ========================================
  // HOUSEKEEPING
  // ========================================

  async createTask(task: Omit<HousekeepingTask, 'id'>): Promise<ServiceResponse<HousekeepingTask>> {
    return this.housekeepingService.post<HousekeepingTask>('/api/tasks', task);
  }

  async listTasks(filters?: { status?: string; roomId?: string }): Promise<ServiceResponse<HousekeepingTask[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.housekeepingService.get<HousekeepingTask[]>(`/api/tasks${query ? `?${query}` : ''}`);
  }

  async updateTaskStatus(id: string, status: HousekeepingTask['status']): Promise<ServiceResponse<HousekeepingTask>> {
    return this.housekeepingService.patch<HousekeepingTask>(`/api/tasks/${id}/status`, { status });
  }

  async assignTask(id: string, staffId: string): Promise<ServiceResponse<HousekeepingTask>> {
    return this.housekeepingService.patch<HousekeepingTask>(`/api/tasks/${id}/assign`, { staffId });
  }

  // ========================================
  // BILLING
  // ========================================

  async createInvoice(invoice: {
    guestId: string;
    bookingId: string;
    items: Invoice['items'];
  }): Promise<ServiceResponse<Invoice>> {
    return this.billingService.post<Invoice>('/api/invoices', invoice);
  }

  async getInvoice(id: string): Promise<ServiceResponse<Invoice>> {
    return this.billingService.get<Invoice>(`/api/invoices/${id}`);
  }

  async processPayment(invoiceId: string, method: 'cash' | 'card' | 'upi' | 'transfer'): Promise<ServiceResponse<Invoice>> {
    return this.billingService.post<Invoice>(`/api/invoices/${invoiceId}/pay`, { method });
  }

  async getGuestBalance(guestId: string): Promise<ServiceResponse<{ pending: number; paid: number }>> {
    return this.billingService.get<{ pending: number; paid: number }>(`/api/guests/${guestId}/balance`);
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<Record<string, string>> {
    const checks = await Promise.all([
      this.pmsService.healthCheck(),
      this.bookingService.healthCheck(),
      this.channelService.healthCheck(),
      this.housekeepingService.healthCheck(),
      this.billingService.healthCheck(),
    ]);

    return {
      pms: checks[0].status,
      booking: checks[1].status,
      channel: checks[2].status,
      housekeeping: checks[3].status,
      billing: checks[4].status,
    };
  }
}

export function createHotelConnector(tenant?: TenantContext): HotelConnector {
  return new HotelConnector(tenant);
}
