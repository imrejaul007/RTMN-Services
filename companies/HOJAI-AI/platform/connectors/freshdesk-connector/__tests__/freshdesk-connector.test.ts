import { describe, it, expect } from 'vitest';

// Freshdesk Connector Constants
const TICKET_STATUSES = {
  open: 2,
  pending: 3,
  resolved: 4,
  closed: 5
};
const TICKET_PRIORITIES = { low: 1, medium: 2, high: 3, urgent: 4 };

describe('Freshdesk Connector', () => {
  describe('Ticket Statuses', () => {
    it('should have correct status codes', () => {
      expect(TICKET_STATUSES.open).toBe(2);
      expect(TICKET_STATUSES.pending).toBe(3);
      expect(TICKET_STATUSES.resolved).toBe(4);
      expect(TICKET_STATUSES.closed).toBe(5);
    });
  });

  describe('Ticket Priorities', () => {
    it('should have all priority levels', () => {
      expect(TICKET_PRIORITIES.low).toBe(1);
      expect(TICKET_PRIORITIES.medium).toBe(2);
      expect(TICKET_PRIORITIES.high).toBe(3);
      expect(TICKET_PRIORITIES.urgent).toBe(4);
    });
  });

  describe('Ticket Validation', () => {
    const validateTicket = (ticket: {
      subject?: string;
      description?: string;
      status?: number;
      priority?: number;
      requester_id?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!ticket.subject) errors.push('subject is required');
      if (ticket.subject && ticket.subject.length > 500) errors.push('subject too long');
      if (ticket.status !== undefined && !Object.values(TICKET_STATUSES).includes(ticket.status)) {
        errors.push('invalid status');
      }
      if (ticket.priority !== undefined && !Object.values(TICKET_PRIORITIES).includes(ticket.priority)) {
        errors.push('invalid priority');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct ticket', () => {
      const result = validateTicket({
        subject: 'Cannot login to account',
        description: 'Getting error when trying to login',
        status: 2,
        priority: 3,
        requester_id: 'user123'
      });
      expect(result.valid).toBe(true);
    });

    it('should require subject', () => {
      const result = validateTicket({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('subject is required');
    });
  });

  describe('Contact Validation', () => {
    const validateContact = (contact: {
      name?: string;
      email?: string;
      phone?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!contact.name) errors.push('name is required');
      if (!contact.email) errors.push('email is required');
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors.push('invalid email');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct contact', () => {
      const result = validateContact({
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      });
      expect(result.valid).toBe(true);
    });

    it('should require name and email', () => {
      const result = validateContact({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
      expect(result.errors).toContain('email is required');
    });
  });

  describe('SLA Calculation', () => {
    const calculateSLA = (ticket: { priority: number; created_at: string; status: number }): {
      breached: boolean;
      remainingMinutes: number;
    } => {
      const slaHours: Record<number, number> = { 1: 72, 2: 48, 3: 24, 4: 8 };
      const slaMinutes = slaHours[ticket.priority] * 60;
      const created = new Date(ticket.created_at).getTime();
      const now = Date.now();
      const elapsedMinutes = (now - created) / (1000 * 60);
      const remaining = slaMinutes - elapsedMinutes;

      return {
        breached: remaining < 0,
        remainingMinutes: Math.max(0, Math.floor(remaining))
      };
    };

    it('should calculate SLA remaining time', () => {
      const now = new Date();
      const created = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
      const ticket = { priority: 3, created_at: created.toISOString(), status: 2 };
      const sla = calculateSLA(ticket);
      expect(sla.breached).toBe(false);
      expect(sla.remainingMinutes).toBeGreaterThan(1300); // ~23 hours
    });
  });

  describe('Ticket Filtering', () => {
    const filterTickets = (
      tickets: Array<{ status: number; priority: number; tags: string[] }>,
      filters: { status?: number; priority?: number; tag?: string }
    ) => {
      let filtered = [...tickets];

      if (filters.status !== undefined) filtered = filtered.filter(t => t.status === filters.status);
      if (filters.priority !== undefined) filtered = filtered.filter(t => t.priority === filters.priority);
      if (filters.tag) filtered = filtered.filter(t => t.tags.includes(filters.tag));

      return filtered;
    };

    it('should filter by status', () => {
      const tickets = [
        { status: 2, priority: 3, tags: ['bug'] },
        { status: 4, priority: 2, tags: ['feature'] }
      ];
      const results = filterTickets(tickets, { status: 2 });
      expect(results).toHaveLength(1);
    });
  });

  describe('First Response Time', () => {
    const calculateFRT = (
      tickets: Array<{ created_at: string; firstResponseAt?: string }>
    ): { avgMinutes: number; breached: number; total: number } => {
      const responded = tickets.filter(t => t.firstResponseAt);
      const frtValues = responded.map(t => {
        const created = new Date(t.created_at).getTime();
        const respondedAt = new Date(t.firstResponseAt!).getTime();
        return (respondedAt - created) / (1000 * 60);
      });

      const breached = frtValues.filter(m => m > 480).length; // 8 hours

      return {
        avgMinutes: frtValues.length > 0 ? frtValues.reduce((a, b) => a + b, 0) / frtValues.length : 0,
        breached,
        total: tickets.length
      };
    };

    it('should calculate average first response time', () => {
      const now = new Date();
      const tickets = [
        { created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(), firstResponseAt: now.toISOString() },
        { created_at: new Date(now.getTime() - 120 * 60 * 1000).toISOString(), firstResponseAt: now.toISOString() }
      ];
      const frt = calculateFRT(tickets);
      expect(frt.total).toBe(2);
      expect(frt.avgMinutes).toBeLessThan(120);
    });
  });

  describe('CSAT Score', () => {
    const calculateCSAT = (ratings: number[]): { score: number; responseRate: number } => {
      const responses = ratings.filter(r => r > 0);
      const avgScore = responses.length > 0 ? responses.reduce((a, b) => a + b, 0) / responses.length : 0;

      return {
        score: (avgScore / 5) * 100,
        responseRate: ratings.length > 0 ? (responses.length / ratings.length) * 100 : 0
      };
    };

    it('should calculate CSAT percentage', () => {
      const ratings = [5, 4, 5, 3, 0, 0, 0, 0, 0, 0]; // 4 responses
      const csat = calculateCSAT(ratings);
      expect(csat.score).toBeCloseTo(85, 0); // (5+4+5+3)/4 = 4.25/5 = 85%
      expect(csat.responseRate).toBe(40);
    });
  });
});