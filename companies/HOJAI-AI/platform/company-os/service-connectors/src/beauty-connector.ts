/**
 * Beauty Service Connector
 *
 * Connects to REZ-Merchant beauty services.
 */

import { BaseConnector, ServiceResponse } from './base-connector';
import { TenantContext } from '../shared/types';

// ============================================
// Service URLs
// ============================================

const REZ_BEAUTY_SERVICES = {
  appointment: process.env.REZ_APPOINTMENT_SERVICE_URL || 'http://localhost:3010',
  stylist: process.env.REZ_STYLIST_SERVICE_URL || 'http://localhost:3011',
  service: process.env.REZ_BEAUTY_SERVICE_URL || 'http://localhost:3012',
  membership: process.env.REZ_MEMBERSHIP_SERVICE_URL || 'http://localhost:3013',
  inventory: process.env.REZ_BEAUTY_INVENTORY_URL || 'http://localhost:3014',
};

// ============================================
// Types
// ============================================

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  serviceId: string;
  serviceName: string;
  stylistId?: string;
  stylistName?: string;
  date: string;
  time: string;
  duration: number; // minutes
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface Stylist {
  id: string;
  name: string;
  specialties: string[];
  availability: {
    [day: string]: { start: string; end: string }[];
  };
  isActive: boolean;
}

export interface Membership {
  id: string;
  customerId: string;
  plan: 'basic' | 'premium' | 'vip';
  services: string[];
  visitsRemaining: number;
  validUntil: string;
  status: 'active' | 'expired' | 'cancelled';
}

// ============================================
// Beauty Connector
// ============================================

export class BeautyConnector {
  private appointmentService: BaseConnector;
  private stylistService: BaseConnector;
  private serviceService: BaseConnector;
  private membershipService: BaseConnector;
  private inventoryService: BaseConnector;
  private tenant?: TenantContext;

  constructor(tenant?: TenantContext) {
    this.appointmentService = new BaseConnector({ baseUrl: REZ_BEAUTY_SERVICES.appointment });
    this.stylistService = new BaseConnector({ baseUrl: REZ_BEAUTY_SERVICES.stylist });
    this.serviceService = new BaseConnector({ baseUrl: REZ_BEAUTY_SERVICES.service });
    this.membershipService = new BaseConnector({ baseUrl: REZ_BEAUTY_SERVICES.membership });
    this.inventoryService = new BaseConnector({ baseUrl: REZ_BEAUTY_SERVICES.inventory });

    if (tenant) {
      this.setTenant(tenant);
    }
  }

  setTenant(tenant: TenantContext): void {
    this.tenant = tenant;
    this.appointmentService.setTenant(tenant);
    this.stylistService.setTenant(tenant);
    this.serviceService.setTenant(tenant);
    this.membershipService.setTenant(tenant);
    this.inventoryService.setTenant(tenant);
  }

  // ========================================
  // APPOINTMENT OPERATIONS
  // ========================================

  async createAppointment(appointment: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    stylistId?: string;
    date: string;
    time: string;
    notes?: string;
  }): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.post<Appointment>('/api/appointments', appointment);
  }

  async getAppointment(id: string): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.get<Appointment>(`/api/appointments/${id}`);
  }

  async listAppointments(filters?: { date?: string; stylistId?: string; status?: string }): Promise<ServiceResponse<Appointment[]>> {
    const query = new URLSearchParams(filters as any).toString();
    return this.appointmentService.get<Appointment[]>(`/api/appointments${query ? `?${query}` : ''}`);
  }

  async updateAppointmentStatus(id: string, status: Appointment['status']): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.patch<Appointment>(`/api/appointments/${id}/status`, { status });
  }

  async cancelAppointment(id: string, reason?: string): Promise<ServiceResponse<Appointment>> {
    return this.appointmentService.delete<Appointment>(`/api/appointments/${id}?reason=${reason || ''}`);
  }

  // ========================================
  // SERVICE OPERATIONS
  // ========================================

  async getServices(category?: string): Promise<ServiceResponse<Service[]>> {
    const query = category ? `?category=${category}` : '';
    return this.serviceService.get<Service[]>(`/api/services${query}`);
  }

  async createService(service: Omit<Service, 'id'>): Promise<ServiceResponse<Service>> {
    return this.serviceService.post<Service>('/api/services', service);
  }

  async updateService(id: string, updates: Partial<Service>): Promise<ServiceResponse<Service>> {
    return this.serviceService.put<Service>(`/api/services/${id}`, updates);
  }

  // ========================================
  // STYLIST OPERATIONS
  // ========================================

  async getStylists(): Promise<ServiceResponse<Stylist[]>> {
    return this.stylistService.get<Stylist[]>('/api/stylists');
  }

  async getStylistAvailability(stylistId: string, date: string): Promise<ServiceResponse<string[]>> {
    return this.stylistService.get<string[]>(`/api/stylists/${stylistId}/availability?date=${date}`);
  }

  async createStylist(stylist: Omit<Stylist, 'id'>): Promise<ServiceResponse<Stylist>> {
    return this.stylistService.post<Stylist>('/api/stylists', stylist);
  }

  // ========================================
  // MEMBERSHIP OPERATIONS
  // ========================================

  async getMembership(customerId: string): Promise<ServiceResponse<Membership | null>> {
    return this.membershipService.get<Membership>(`/api/memberships/${customerId}`);
  }

  async createMembership(membership: Omit<Membership, 'id'>): Promise<ServiceResponse<Membership>> {
    return this.membershipService.post<Membership>('/api/memberships', membership);
  }

  async useVisit(customerId: string): Promise<ServiceResponse<Membership>> {
    return this.membershipService.post<Membership>(`/api/memberships/${customerId}/use-visit`, {});
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  async healthCheck(): Promise<Record<string, string>> {
    const checks = await Promise.all([
      this.appointmentService.healthCheck(),
      this.stylistService.healthCheck(),
      this.serviceService.healthCheck(),
      this.membershipService.healthCheck(),
    ]);

    return {
      appointments: checks[0].status,
      stylists: checks[1].status,
      services: checks[2].status,
      memberships: checks[3].status,
    };
  }
}

export function createBeautyConnector(tenant?: TenantContext): BeautyConnector {
  return new BeautyConnector(tenant);
}
