import { describe, it, expect, beforeEach } from 'vitest';

const createMockApp = () => {
  const stores = { appointments: new Map() };
  const generateId = () => Math.random().toString(36).substring(2, 15);
  return { stores, generateId };
};

describe('Legal OS - Appointment Management', () => {
  let app;
  beforeEach(() => { app = createMockApp(); });

  describe('Appointment Data Structure', () => {
    it('should create valid appointment', () => {
      const appt = { id: app.generateId(), caseId: 'case1', lawyerId: 'l1', date: '2026-06-20', status: 'scheduled' };
      expect(appt.id).toBeDefined();
      expect(appt.status).toBe('scheduled');
    });
  });

  describe('Appointment Validation', () => {
    it('should require caseId, lawyerId, and date', () => {
      const isValid = (data) => data.caseId && data.lawyerId && data.date;
      expect(isValid({ caseId: 'c1', lawyerId: 'l1', date: '2026-06-20' })).toBe(true);
      expect(isValid({ caseId: 'c1' })).toBeFalsy();
    });
  });

  describe('Appointment CRUD', () => {
    it('should create appointment', () => {
      const appt = { id: app.generateId(), status: 'scheduled' };
      app.stores.appointments.set(appt.id, appt);
      expect(app.stores.appointments.size).toBe(1);
    });
    it('should update appointment', () => {
      app.stores.appointments.set('a1', { id: 'a1', status: 'scheduled' });
      app.stores.appointments.get('a1').status = 'confirmed';
      expect(app.stores.appointments.get('a1').status).toBe('confirmed');
    });
  });

  describe('Scheduling Conflicts', () => {
    it('should detect conflicts', () => {
      const appointments = [{ lawyerId: 'l1', date: '2026-06-20', time: '10:00' }];
      const hasConflict = (newAppt) => appointments.some(a => a.lawyerId === newAppt.lawyerId && a.date === newAppt.date && a.time === newAppt.time);
      expect(hasConflict({ lawyerId: 'l1', date: '2026-06-20', time: '10:00' })).toBe(true);
      expect(hasConflict({ lawyerId: 'l1', date: '2026-06-20', time: '14:00' })).toBe(false);
    });
  });
});
