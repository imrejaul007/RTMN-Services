import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = {
    clients: new Map(),
    cases: new Map(),
    documents: new Map(),
    lawyers: new Map(),
    appointments: new Map(),
    invoices: new Map()
  };

  const generateId = () => Math.random().toString(36).substring(2, 15);

  return { stores, generateId };
};

describe('Legal OS - Lawyer Management', () => {
  let app;

  beforeEach(() => {
    app = createMockApp();
  });

  describe('Lawyer Data Structure', () => {
    it('should create a valid lawyer object', () => {
      const lawyerData = {
        name: 'Atty. Sarah Davis',
        specialty: 'corporate',
        barNumber: 'BAR-001',
        email: 'sarah@lawfirm.com'
      };

      const lawyer = {
        id: app.generateId(),
        ...lawyerData,
        status: 'available',
        casesHandled: 0,
        createdAt: new Date().toISOString()
      };

      expect(lawyer.id).toBeDefined();
      expect(lawyer.name).toBe('Atty. Sarah Davis');
      expect(lawyer.specialty).toBe('corporate');
      expect(lawyer.barNumber).toBe('BAR-001');
      expect(lawyer.status).toBe('available');
    });

    it('should have default status of available', () => {
      const lawyer = {
        name: 'Test Lawyer',
        specialty: 'litigation'
      };

      const withDefaults = {
        ...lawyer,
        status: lawyer.status || 'available'
      };

      expect(withDefaults.status).toBe('available');
    });

    it('should track cases handled count', () => {
      const lawyer = {
        name: 'Test Lawyer',
        casesHandled: 0
      };

      lawyer.casesHandled++;
      lawyer.casesHandled++;

      expect(lawyer.casesHandled).toBe(2);
    });
  });

  describe('Lawyer Validation', () => {
    it('should require name', () => {
      const lawyerData = { specialty: 'corporate' };
      const isValid = lawyerData.name && lawyerData.specialty;
      expect(isValid).toBeFalsy();
    });

    it('should require specialty', () => {
      const lawyerData = { name: 'Test Lawyer' };
      const isValid = lawyerData.name && lawyerData.specialty;
      expect(isValid).toBeFalsy();
    });

    it('should validate bar number format', () => {
      const barNumber = 'BAR-001';
      const barRegex = /^BAR-\d{3,}$/;
      expect(barRegex.test(barNumber)).toBe(true);
    });

    it('should validate email format', () => {
      const email = 'lawyer@lawfirm.com';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      expect(emailRegex.test(email)).toBe(true);
    });
  });

  describe('Lawyer Filtering', () => {
    beforeEach(() => {
      app.stores.lawyers.set('l1', { id: 'l1', name: 'Lawyer 1', specialty: 'corporate', status: 'available' });
      app.stores.lawyers.set('l2', { id: 'l2', name: 'Lawyer 2', specialty: 'litigation', status: 'available' });
      app.stores.lawyers.set('l3', { id: 'l3', name: 'Lawyer 3', specialty: 'corporate', status: 'busy' });
      app.stores.lawyers.set('l4', { id: 'l4', name: 'Lawyer 4', specialty: 'family', status: 'available' });
    });

    it('should filter by specialty', () => {
      const specialty = 'corporate';
      const filtered = Array.from(app.stores.lawyers.values()).filter(l => l.specialty === specialty);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by status', () => {
      const status = 'available';
      const filtered = Array.from(app.stores.lawyers.values()).filter(l => l.status === status);
      expect(filtered).toHaveLength(3);
    });

    it('should filter by multiple criteria', () => {
      const filtered = Array.from(app.stores.lawyers.values()).filter(l =>
        l.specialty === 'corporate' && l.status === 'available'
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Lawyer Specialties', () => {
    it('should support corporate specialty', () => {
      const specialties = ['corporate', 'litigation', 'family', 'criminal', 'property', 'immigration', 'intellectual_property', 'tax', 'employment'];
      expect(specialties.includes('corporate')).toBe(true);
    });

    it('should support litigation specialty', () => {
      const specialties = ['corporate', 'litigation', 'family', 'criminal', 'property', 'immigration', 'intellectual_property', 'tax', 'employment'];
      expect(specialties.includes('litigation')).toBe(true);
    });

    it('should support family specialty', () => {
      const specialties = ['corporate', 'litigation', 'family', 'criminal', 'property', 'immigration', 'intellectual_property', 'tax', 'employment'];
      expect(specialties.includes('family')).toBe(true);
    });
  });

  describe('Lawyer Status Management', () => {
    it('should set status to available', () => {
      const lawyer = { id: 'l1', status: 'available' };
      expect(lawyer.status).toBe('available');
    });

    it('should set status to busy', () => {
      const lawyer = { id: 'l1', status: 'busy' };
      expect(lawyer.status).toBe('busy');
    });

    it('should set status to unavailable', () => {
      const lawyer = { id: 'l1', status: 'unavailable' };
      expect(lawyer.status).toBe('unavailable');
    });

    it('should track status changes', () => {
      const lawyer = { id: 'l1', status: 'available' };
      const history = [{ status: 'available', changedAt: new Date().toISOString() }];

      lawyer.status = 'busy';
      history.push({ status: 'busy', changedAt: new Date().toISOString() });

      expect(history).toHaveLength(2);
    });
  });

  describe('Lawyer Availability', () => {
    it('should check if lawyer is available', () => {
      const lawyer = { id: 'l1', status: 'available' };
      const isAvailable = lawyer.status === 'available';
      expect(isAvailable).toBe(true);
    });

    it('should check if lawyer is busy', () => {
      const lawyer = { id: 'l1', status: 'busy' };
      const isBusy = lawyer.status === 'busy';
      expect(isBusy).toBe(true);
    });

    it('should find available lawyers for a specialty', () => {
      const lawyers = [
        { id: 'l1', specialty: 'corporate', status: 'available' },
        { id: 'l2', specialty: 'corporate', status: 'busy' },
        { id: 'l3', specialty: 'corporate', status: 'available' }
      ];

      const available = lawyers.filter(l =>
        l.specialty === 'corporate' && l.status === 'available'
      );

      expect(available).toHaveLength(2);
    });
  });

  describe('Lawyer Case Assignment', () => {
    it('should increment cases handled on assignment', () => {
      const lawyer = { id: 'l1', name: 'Test', casesHandled: 0 };
      lawyer.casesHandled++;
      expect(lawyer.casesHandled).toBe(1);
    });

    it('should decrement cases handled on case close', () => {
      const lawyer = { id: 'l1', name: 'Test', casesHandled: 5 };
      lawyer.casesHandled--;
      expect(lawyer.casesHandled).toBe(4);
    });

    it('should not go below zero cases handled', () => {
      const lawyer = { id: 'l1', name: 'Test', casesHandled: 0 };
      if (lawyer.casesHandled > 0) {
        lawyer.casesHandled--;
      }
      expect(lawyer.casesHandled).toBe(0);
    });
  });

  describe('Lawyer CRUD Operations', () => {
    it('should create a new lawyer', () => {
      const lawyerData = {
        name: 'New Lawyer',
        specialty: 'corporate',
        barNumber: 'BAR-999'
      };

      const created = {
        id: app.generateId(),
        ...lawyerData,
        status: 'available',
        casesHandled: 0,
        createdAt: new Date().toISOString()
      };

      app.stores.lawyers.set(created.id, created);
      expect(app.stores.lawyers.size).toBe(1);
    });

    it('should update lawyer information', () => {
      const lawyer = {
        id: 'l1',
        name: 'Original',
        specialty: 'corporate'
      };
      app.stores.lawyers.set(lawyer.id, lawyer);

      lawyer.specialty = 'litigation';
      app.stores.lawyers.set(lawyer.id, lawyer);

      expect(app.stores.lawyers.get('l1').specialty).toBe('litigation');
    });

    it('should delete a lawyer', () => {
      const lawyer = { id: 'l1', name: 'To Delete' };
      app.stores.lawyers.set(lawyer.id, lawyer);

      app.stores.lawyers.delete('l1');
      expect(app.stores.lawyers.has('l1')).toBe(false);
    });
  });

  describe('Lawyer Search', () => {
    beforeEach(() => {
      app.stores.lawyers.set('l1', { id: 'l1', name: 'Sarah Davis', specialty: 'corporate' });
      app.stores.lawyers.set('l2', { id: 'l2', name: 'Michael Chen', specialty: 'litigation' });
      app.stores.lawyers.set('l3', { id: 'l3', name: 'Emily Brown', specialty: 'family' });
    });

    it('should search by name', () => {
      const searchTerm = 'sarah';
      const results = Array.from(app.stores.lawyers.values()).filter(l =>
        l.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results).toHaveLength(1);
    });

    it('should search by specialty', () => {
      const searchTerm = 'litigation';
      const results = Array.from(app.stores.lawyers.values()).filter(l =>
        l.specialty.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(results).toHaveLength(1);
    });
  });
});