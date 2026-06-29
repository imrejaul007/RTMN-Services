/**
 * Beauty Extension Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  appointmentService,
  stylistService,
  serviceCatalog,
  membershipService,
} from '../service';

describe('Beauty Extension', () => {
  const tenantId = 'test_beauty_001';

  describe('Appointments', () => {
    it('should create appointment', () => {
      const apt = appointmentService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Sarah',
        customerPhone: '+919876543210',
        serviceId: 'svc_haircut',
        serviceName: 'Haircut',
        date: '2026-07-01',
        time: '10:00',
        duration: 60,
        status: 'scheduled',
        price: 500,
      });

      expect(apt.id).toBeDefined();
      expect(apt.customerName).toBe('Sarah');
      expect(apt.status).toBe('scheduled');
    });

    it('should list appointments by date', () => {
      appointmentService.create(tenantId, {
        customerId: 'cust_001',
        customerName: 'Customer 1',
        customerPhone: '+919876543210',
        serviceId: 'svc_1',
        serviceName: 'Service 1',
        date: '2026-07-01',
        time: '10:00',
        duration: 60,
        status: 'scheduled',
        price: 500,
      });

      const apts = appointmentService.list(tenantId, { date: '2026-07-01' });
      expect(apts.length).toBeGreaterThan(0);
    });
  });

  describe('Stylists', () => {
    it('should create stylist', () => {
      const stylist = stylistService.create(tenantId, {
        name: 'John',
        phone: '+919876543210',
        specialties: ['haircut', 'coloring'],
        schedule: {
          monday: { start: '09:00', end: '18:00' },
        },
        isActive: true,
      });

      expect(stylist.id).toBeDefined();
      expect(stylist.name).toBe('John');
    });

    it('should list active stylists', () => {
      stylistService.create(tenantId, {
        name: 'Jane',
        phone: '+919876543211',
        specialties: ['haircut'],
        schedule: {},
        isActive: true,
      });

      const stylists = stylistService.list(tenantId);
      expect(stylists.length).toBeGreaterThan(0);
    });
  });

  describe('Services', () => {
    it('should create service', () => {
      const service = serviceCatalog.create(tenantId, {
        name: 'Haircut',
        category: 'hair',
        description: 'Professional haircut',
        price: 500,
        duration: 45,
        isActive: true,
      });

      expect(service.id).toBeDefined();
      expect(service.price).toBe(500);
    });
  });

  describe('Memberships', () => {
    it('should create membership', () => {
      const mem = membershipService.create(tenantId, {
        customerId: 'cust_001',
        plan: 'premium',
        services: ['haircut', 'coloring'],
        visitsRemaining: 10,
        validUntil: '2027-01-01',
        status: 'active',
      });

      expect(mem.id).toBeDefined();
      expect(mem.plan).toBe('premium');
      expect(mem.visitsRemaining).toBe(10);
    });

    it('should decrement visits', () => {
      const mem = membershipService.create(tenantId, {
        customerId: 'cust_002',
        plan: 'basic',
        services: ['haircut'],
        visitsRemaining: 5,
        validUntil: '2027-01-01',
        status: 'active',
      });

      const updated = membershipService.useVisit(tenantId, mem.id);
      expect(updated?.visitsRemaining).toBe(4);
    });
  });

  describe('Tenant Isolation', () => {
    it('should isolate data between tenants', () => {
      appointmentService.create('tenant_a', {
        customerId: 'cust_a',
        customerName: 'Customer A',
        customerPhone: '+919876543210',
        serviceId: 'svc_1',
        serviceName: 'Service A',
        date: '2026-07-01',
        time: '10:00',
        duration: 60,
        status: 'scheduled',
        price: 100,
      });

      const a = appointmentService.list('tenant_a');
      const b = appointmentService.list('tenant_b');

      expect(a.length).toBe(1);
      expect(b.length).toBe(0);
    });
  });
});
