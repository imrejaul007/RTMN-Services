/**
 * Beauty Extension Service
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Appointment,
  Stylist,
  Service,
  Membership,
} from './types';

interface TenantStore {
  appointments: Map<string, Appointment>;
  stylists: Map<string, Stylist>;
  services: Map<string, Service>;
  memberships: Map<string, Membership>;
}

const stores = new Map<string, TenantStore>();

function getStore(tenantId: string): TenantStore {
  if (!stores.has(tenantId)) {
    stores.set(tenantId, {
      appointments: new Map(),
      stylists: new Map(),
      services: new Map(),
      memberships: new Map(),
    });
  }
  return stores.get(tenantId)!;
}

// ========================================
// APPOINTMENTS
// ========================================

export class AppointmentService {
  create(tenantId: string, data: Omit<Appointment, 'id' | 'tenantId'>): Appointment {
    const store = getStore(tenantId);
    const appt: Appointment = {
      id: `apt_${uuidv4().slice(0, 8)}`,
      tenantId,
      ...data,
    };
    store.appointments.set(appt.id, appt);
    return appt;
  }

  get(tenantId: string, id: string): Appointment | null {
    const store = getStore(tenantId);
    const appt = store.appointments.get(id);
    return appt?.tenantId === tenantId ? appt : null;
  }

  list(tenantId: string, filters?: { date?: string; stylistId?: string }): Appointment[] {
    const store = getStore(tenantId);
    let list = Array.from(store.appointments.values())
      .filter(a => a.tenantId === tenantId);

    if (filters?.date) list = list.filter(a => a.date === filters.date);
    if (filters?.stylistId) list = list.filter(a => a.stylistId === filters.stylistId);

    return list.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  }

  updateStatus(tenantId: string, id: string, status: Appointment['status']): Appointment | null {
    const store = getStore(tenantId);
    const appt = store.appointments.get(id);
    if (!appt || appt.tenantId !== tenantId) return null;
    appt.status = status;
    return appt;
  }
}

// ========================================
// STYLISTS
// ========================================

export class StylistService {
  create(tenantId: string, data: Omit<Stylist, 'id' | 'tenantId'>): Stylist {
    const store = getStore(tenantId);
    const stylist: Stylist = {
      id: `stylist_${uuidv4().slice(0, 8)}`,
      tenantId,
      ...data,
    };
    store.stylists.set(stylist.id, stylist);
    return stylist;
  }

  list(tenantId: string): Stylist[] {
    const store = getStore(tenantId);
    return Array.from(store.stylists.values())
      .filter(s => s.tenantId === tenantId && s.isActive);
  }
}

// ========================================
// SERVICES
// ========================================

export class ServiceCatalog {
  create(tenantId: string, data: Omit<Service, 'id' | 'tenantId'>): Service {
    const store = getStore(tenantId);
    const service: Service = {
      id: `svc_${uuidv4().slice(0, 8)}`,
      tenantId,
      ...data,
    };
    store.services.set(service.id, service);
    return service;
  }

  list(tenantId: string, category?: string): Service[] {
    const store = getStore(tenantId);
    let list = Array.from(store.services.values())
      .filter(s => s.tenantId === tenantId && s.isActive);
    if (category) list = list.filter(s => s.category === category);
    return list;
  }
}

// ========================================
// MEMBERSHIPS
// ========================================

export class MembershipService {
  create(tenantId: string, data: Omit<Membership, 'id' | 'tenantId'>): Membership {
    const store = getStore(tenantId);
    const membership: Membership = {
      id: `mem_${uuidv4().slice(0, 8)}`,
      tenantId,
      ...data,
    };
    store.memberships.set(membership.id, membership);
    return membership;
  }

  useVisit(tenantId: string, id: string): Membership | null {
    const store = getStore(tenantId);
    const mem = store.memberships.get(id);
    if (!mem || mem.tenantId !== tenantId) return null;
    if (mem.visitsRemaining > 0) mem.visitsRemaining--;
    return mem;
  }
}

export const appointmentService = new AppointmentService();
export const stylistService = new StylistService();
export const serviceCatalog = new ServiceCatalog();
export const membershipService = new MembershipService();
