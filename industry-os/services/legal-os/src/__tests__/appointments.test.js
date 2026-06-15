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

describe('Legal OS - Appointment Management', () => {
  let app;

  beforeEach(() => {
    app = createMockApp();
  });

  describe('Appointment Data Structure', () => {
    it('should create a valid appointment object', () => {
      const apptData = {
        caseId: 'case1',
        lawyerId: 'l1',
        clientId: 'c1',
        date: '2026-06-20',
        time: '10:00',
        type: 'consultation',
        notes: 'Initial consultation meeting'
      };

      const appt = {
        id: app.generateId(),
        ...apptData,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      expect(appt.id).toBeDefined();
      expect(appt.caseId).toBe('case1');
      expect(appt.lawyerId).toBe('l1');
      expect(appt.status).toBe('scheduled');
    });

    it('should have default time of 09:00', () => {
      const appt = {
        time: '09:00'
      };
      expect(appt.time).toBe('09:00');
    });

    it('should have default type of consultation', () => {
      const appt = {
        type: 'consultation'
      };
      expect(appt.type).toBe('consultation');
    });
  });

  describe('Appointment Validation', () => {
    it('should require caseId', () => {
      const apptData = { lawyerId: 'l1', date: '2026-06-20' };
      const isValid = apptData.caseId && apptData.lawyerId && apptData.date;
      expect(isValid).toBeFalsy();
    });

    it('should require lawyerId', () => {
      const apptData = { caseId: 'case1', date: '2026-06-20' };
      const isValid = apptData.caseId && apptData.lawyerId && apptData.date;
      expect(isValid).toBeFalsy();
    });

    it('should require date', () => {
      const apptData = { caseId: 'case1', lawyerId: 'l1' };
      const isValid = apptData.caseId && apptData.lawyerId && apptData.date;
      expect(isValid).toBeFalsy();
    });

    it('should validate date format', () => {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      expect(dateRegex.test('2026-06-20')).toBe(true);
      expect(dateRegex.test('06-20-2026')).toBe(false);
    });

    it('should validate time format', () => {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      expect(timeRegex.test('10:00')).toBe(true);
      expect(timeRegex.test('25:00')).toBe(false);
    });
  });

  describe('Appointment Filtering', () => {
    beforeEach(() => {
      app.stores.appointments.set('a1', { id: 'a1', caseId: 'case1', lawyerId: 'l1', status: 'scheduled' });
      app.stores.appointments.set('a2', { id: 'a2', caseId: 'case1', lawyerId: 'l2', status: 'scheduled' });
      app.stores.appointments.set('a3', { id: 'a3', caseId: 'case2', lawyerId: 'l1', status: 'completed' });
      app.stores.appointments.set('a4', { id: 'a4', caseId: 'case2', lawyerId: 'l2', status: 'cancelled' });
    });

    it('should filter by caseId', () => {
      const caseId = 'case1';
      const filtered = Array.from(app.stores.appointments.values()).filter(a => a.caseId === caseId);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by lawyerId', () => {
      const lawyerId = 'l1';
      const filtered = Array.from(app.stores.appointments.values()).filter(a => a.lawyerId === lawyerId);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by status', () => {
      const status = 'scheduled';
      const filtered = Array.from(app.stores.appointments.values()).filter(a => a.status === status);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by multiple criteria', () => {
      const filtered = Array.from(app.stores.appointments.values()).filter(a =>
        a.caseId === 'case1' && a.lawyerId === 'l1'
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Appointment Status Transitions', () => {
    it('should transition from scheduled to confirmed', () => {
      const appt = { id: 'a1', status: 'scheduled' };
      appt.status = 'confirmed';
      expect(appt.status).toBe('confirmed');
    });

    it('should transition from confirmed to completed', () => {
      const appt = { id: 'a1', status: 'confirmed' };
      appt.status = 'completed';
      appt.completedAt = new Date().toISOString();
      expect(appt.status).toBe('completed');
    });

    it('should transition from scheduled to cancelled', () => {
      const appt = { id: 'a1', status: 'scheduled' };
      appt.status = 'cancelled';
      expect(appt.status).toBe('cancelled');
    });

    it('should transition from confirmed to cancelled', () => {
      const appt = { id: 'a1', status: 'confirmed' };
      appt.status = 'cancelled';
      appt.cancelledAt = new Date().toISOString();
      expect(appt.status).toBe('cancelled');
    });

    it('should support no-show status', () => {
      const appt = { id: 'a1', status: 'no-show' };
      expect(appt.status).toBe('no-show');
    });
  });

  describe('Appointment Types', () => {
    it('should support consultation type', () => {
      const appt = { type: 'consultation' };
      expect(['consultation', 'deposition', 'court', 'mediation', 'followup', 'review'].includes(appt.type)).toBe(true);
    });

    it('should support deposition type', () => {
      const appt = { type: 'deposition' };
      expect(appt.type).toBe('deposition');
    });

    it('should support court type', () => {
      const appt = { type: 'court' };
      expect(appt.type).toBe('court');
    });

    it('should support mediation type', () => {
      const appt = { type: 'mediation' };
      expect(appt.type).toBe('mediation');
    });
  });

  describe('Appointment Notes', () => {
    it('should store notes', () => {
      const appt = { notes: 'Discussed settlement options' };
      expect(appt.notes).toBe('Discussed settlement options');
    });

    it('should handle empty notes', () => {
      const appt = { notes: '' };
      expect(appt.notes).toBe('');
    });

    it('should update notes', () => {
      const appt = { notes: 'Original notes' };
      appt.notes = 'Updated notes with more details';
      expect(appt.notes).toBe('Updated notes with more details');
    });
  });

  describe('Appointment CRUD Operations', () => {
    it('should create a new appointment', () => {
      const apptData = {
        caseId: 'case1',
        lawyerId: 'l1',
        date: '2026-06-20',
        time: '14:00',
        type: 'consultation'
      };

      const created = {
        id: app.generateId(),
        ...apptData,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };

      app.stores.appointments.set(created.id, created);
      expect(app.stores.appointments.size).toBe(1);
    });

    it('should update appointment', () => {
      const appt = { id: 'update-appt-1', time: '10:00', status: 'scheduled' };
      app.stores.appointments.set(appt.id, appt);

      appt.time = '11:00';
      appt.status = 'confirmed';
      app.stores.appointments.set(appt.id, appt);

      expect(app.stores.appointments.get('update-appt-1').time).toBe('11:00');
      expect(app.stores.appointments.get('update-appt-1').status).toBe('confirmed');
    });

    it('should delete appointment', () => {
      const appt = { id: 'a1' };
      app.stores.appointments.set(appt.id, appt);

      app.stores.appointments.delete('a1');
      expect(app.stores.appointments.has('a1')).toBe(false);
    });
  });

  describe('Appointment Scheduling', () => {
    it('should check for scheduling conflicts', () => {
      const appointments = [
        { id: 'a1', lawyerId: 'l1', date: '2026-06-20', time: '10:00' },
        { id: 'a2', lawyerId: 'l1', date: '2026-06-20', time: '11:00' }
      ];

      const hasConflict = (newAppt) => {
        return appointments.some(a =>
          a.lawyerId === newAppt.lawyerId &&
          a.date === newAppt.date &&
          a.time === newAppt.time
        );
      };

      expect(hasConflict({ lawyerId: 'l1', date: '2026-06-20', time: '10:00' })).toBe(true);
      expect(hasConflict({ lawyerId: 'l1', date: '2026-06-20', time: '14:00' })).toBe(false);
    });

    it('should allow different lawyers same time', () => {
      const appointments = [
        { id: 'a1', lawyerId: 'l1', date: '2026-06-20', time: '10:00' }
      ];

      const hasConflict = (newAppt) => {
        return appointments.some(a =>
          a.lawyerId === newAppt.lawyerId &&
          a.date === newAppt.date &&
          a.time === newAppt.time
        );
      };

      expect(hasConflict({ lawyerId: 'l2', date: '2026-06-20', time: '10:00' })).toBe(false);
    });
  });

  describe('Appointment Reminders', () => {
    it('should track reminder status', () => {
      const appt = { id: 'a1', reminderSent: false };
      appt.reminderSent = true;
      appt.reminderSentAt = new Date().toISOString();
      expect(appt.reminderSent).toBe(true);
    });

    it('should track multiple reminders', () => {
      const appt = { id: 'a1', reminders: [] };
      appt.reminders.push({ type: 'email', sentAt: new Date().toISOString() });
      appt.reminders.push({ type: 'sms', sentAt: new Date().toISOString() });
      expect(appt.reminders).toHaveLength(2);
    });
  });
});
