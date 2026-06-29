/**
 * Beauty Extension Types
 */

export interface Appointment {
  id: string;
  tenantId: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  stylistId?: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  price: number;
}

export interface Stylist {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  specialties: string[];
  schedule: {
    [day: string]: { start: string; end: string };
  };
  isActive: boolean;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
}

export interface Membership {
  id: string;
  tenantId: string;
  customerId: string;
  plan: 'basic' | 'premium' | 'vip';
  services: string[];
  visitsRemaining: number;
  validUntil: string;
  status: 'active' | 'expired' | 'cancelled';
}
