/**
 * Beauty OS SDK client (port 5090)
 *
 * The beauty industry has a different surface from the menu/orders/tables
 * template — it's organized around services + stylists + appointments.
 * This client implements that surface directly (no base class).
 *
 * Endpoints:
 *   GET    /api/services                  list services (haircut, color, etc.)
 *   GET    /api/services/:id              get one service
 *   POST   /api/services                  add a service
 *   GET    /api/stylists                  list stylists
 *   GET    /api/stylists/:id              get one stylist
 *   GET    /api/stylists/:id/availability get stylist availability
 *   POST   /api/appointments              book an appointment
 *   GET    /api/appointments              list appointments
 *   PATCH  /api/appointments/:id          update appointment (cancel, complete)
 */

import type { HojaiConfig } from './foundation-config.js';
import { request, buildQueryString } from './utils.js';

export interface Service {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  price: { amount: number; currency: string };
  category?: 'hair' | 'nails' | 'skin' | 'spa' | 'makeup' | 'other';
  available: boolean;
}

export interface Stylist {
  id: string;
  name: string;
  specialties: string[];
  rating?: number;
  /** Whether the stylist is currently taking bookings */
  acceptingBookings: boolean;
}

export interface StylistAvailability {
  stylistId: string;
  /** ISO-8601 time slots of free periods (e.g. '2026-07-01T10:00:00Z') */
  slots: string[];
}

export interface Appointment {
  id: string;
  serviceId: string;
  stylistId: string;
  customerId: string;
  startAt: string;
  endAt: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'no-show';
  totalPrice: { amount: number; currency: string };
  notes?: string;
  createdAt: string;
}

export class BeautyClient {
  public readonly config: HojaiConfig;

  constructor(config: HojaiConfig) {
    this.config = { ...config, baseUrl: `http://localhost:5090` };
  }

  // ─── Services ───

  async listServices(input: { category?: Service['category']; available?: boolean } = {}): Promise<Service[]> {
    return request<Service[]>(this.config, 'GET', `/api/services${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getService(serviceId: string): Promise<Service> {
    return request<Service>(this.config, 'GET', `/api/services/${encodeURIComponent(serviceId)}`);
  }

  async addService(input: Omit<Service, 'id' | 'available'> & { available?: boolean }): Promise<Service> {
    return request<Service>(this.config, 'POST', '/api/services', input);
  }

  // ─── Stylists ───

  async listStylists(input: { specialty?: string; acceptingBookings?: boolean } = {}): Promise<Stylist[]> {
    return request<Stylist[]>(this.config, 'GET', `/api/stylists${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async getStylist(stylistId: string): Promise<Stylist> {
    return request<Stylist>(this.config, 'GET', `/api/stylists/${encodeURIComponent(stylistId)}`);
  }

  async getStylistAvailability(stylistId: string, input: { from?: string; to?: string } = {}): Promise<StylistAvailability> {
    return request<StylistAvailability>(this.config, 'GET', `/api/stylists/${encodeURIComponent(stylistId)}/availability${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  // ─── Appointments ───

  async listAppointments(input: { customerId?: string; stylistId?: string; status?: Appointment['status']; from?: string; to?: string } = {}): Promise<Appointment[]> {
    return request<Appointment[]>(this.config, 'GET', `/api/appointments${buildQueryString(input as unknown as Record<string, unknown>)}`);
  }

  async createAppointment(input: { serviceId: string; stylistId: string; customerId: string; startAt: string; notes?: string }): Promise<Appointment> {
    return request<Appointment>(this.config, 'POST', '/api/appointments', input);
  }

  async updateAppointment(appointmentId: string, patch: { status?: Appointment['status']; startAt?: string; notes?: string }): Promise<Appointment> {
    return request<Appointment>(this.config, 'PATCH', `/api/appointments/${encodeURIComponent(appointmentId)}`, patch);
  }

  async cancelAppointment(appointmentId: string, reason?: string): Promise<Appointment> {
    return request<Appointment>(this.config, 'PATCH', `/api/appointments/${encodeURIComponent(appointmentId)}`, { status: 'cancelled', notes: reason });
  }
}
