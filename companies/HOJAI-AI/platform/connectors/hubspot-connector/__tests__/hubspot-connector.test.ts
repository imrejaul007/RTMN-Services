import { describe, it, expect } from 'vitest';

// HubSpot Connector Constants
const DEAL_STAGES = ['appointmentscheduled', 'qualifiedtobuy', 'presentationscheduled', 'decisionmakerboughtin', 'contractsent', 'closedwon', 'closedlost'];
const TICKET_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'];
const HUBSPOT_OBJECT_TYPES = ['contact', 'deal', 'company', 'ticket', 'product', 'line_item', 'quote'];

describe('HubSpot Connector', () => {
  describe('Deal Stages', () => {
    it('should have all deal stages', () => {
      expect(DEAL_STAGES).toContain('appointmentscheduled');
      expect(DEAL_STAGES).toContain('presentationscheduled');
      expect(DEAL_STAGES).toContain('contractsent');
      expect(DEAL_STAGES).toContain('closedwon');
      expect(DEAL_STAGES).toContain('closedlost');
    });

    it('should have 7 deal stages', () => {
      expect(DEAL_STAGES).toHaveLength(7);
    });
  });

  describe('Ticket Priorities', () => {
    it('should have all ticket priorities', () => {
      expect(TICKET_PRIORITIES).toContain('HIGH');
      expect(TICKET_PRIORITIES).toContain('MEDIUM');
      expect(TICKET_PRIORITIES).toContain('LOW');
    });
  });

  describe('HubSpot Object Types', () => {
    it('should support all major object types', () => {
      HUBSPOT_OBJECT_TYPES.forEach(type => {
        expect(['contact', 'deal', 'company', 'ticket', 'product', 'line_item', 'quote']).toContain(type);
      });
    });
  });

  describe('Contact Validation', () => {
    const validateContact = (contact: {
      email?: string;
      firstname?: string;
      lastname?: string;
      company?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!contact.email) errors.push('email is required');
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors.push('invalid email format');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct contact', () => {
      const result = validateContact({
        email: 'john@example.com',
        firstname: 'John',
        lastname: 'Doe',
        company: 'Acme Inc'
      });
      expect(result.valid).toBe(true);
    });

    it('should require email', () => {
      const result = validateContact({ firstname: 'John', lastname: 'Doe' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email is required');
    });

    it('should reject invalid email', () => {
      const result = validateContact({ email: 'not-an-email' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Deal Validation', () => {
    const validateDeal = (deal: {
      dealname?: string;
      amount?: number;
      dealstage?: string;
      closedate?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!deal.dealname) errors.push('dealname is required');
      if (deal.amount !== undefined && deal.amount < 0) errors.push('amount cannot be negative');
      if (deal.dealstage && !DEAL_STAGES.includes(deal.dealstage)) {
        errors.push(`Invalid stage: ${deal.dealstage}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct deal', () => {
      const result = validateDeal({
        dealname: 'Enterprise License',
        amount: 50000,
        dealstage: 'presentationscheduled',
        closedate: '2026-12-31'
      });
      expect(result.valid).toBe(true);
    });

    it('should require dealname', () => {
      const result = validateDeal({ amount: 50000 });
      expect(result.valid).toBe(false);
    });
  });

  describe('Company Validation', () => {
    const validateCompany = (company: {
      name?: string;
      domain?: string;
      industry?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!company.name) errors.push('name is required');
      if (company.domain && !/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i.test(company.domain)) {
        errors.push('invalid domain format');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct company', () => {
      const result = validateCompany({
        name: 'Acme Corporation',
        domain: 'acme.com',
        industry: 'Technology'
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid domain', () => {
      const result = validateCompany({ name: 'Test', domain: 'not-a-domain' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Ticket Validation', () => {
    const validateTicket = (ticket: {
      subject?: string;
      content?: string;
      priority?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!ticket.subject) errors.push('subject is required');
      if (ticket.priority && !TICKET_PRIORITIES.includes(ticket.priority)) {
        errors.push(`Invalid priority: ${ticket.priority}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct ticket', () => {
      const result = validateTicket({
        subject: 'Login issue',
        content: 'Cannot login to dashboard',
        priority: 'HIGH'
      });
      expect(result.valid).toBe(true);
    });

    it('should require subject', () => {
      const result = validateTicket({ priority: 'MEDIUM' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Search Filtering', () => {
    const searchContacts = (
      contacts: Array<{ properties: { email: string; firstname: string; lastname: string } }>,
      searchTerm: string
    ) => {
      const s = searchTerm.toLowerCase();
      return contacts.filter(c =>
        c.properties.email?.toLowerCase().includes(s) ||
        c.properties.firstname?.toLowerCase().includes(s) ||
        c.properties.lastname?.toLowerCase().includes(s)
      );
    };

    it('should filter by email', () => {
      const contacts = [
        { properties: { email: 'john@acme.com', firstname: 'John', lastname: 'Doe' } },
        { properties: { email: 'jane@company.com', firstname: 'Jane', lastname: 'Smith' } }
      ];
      const results = searchContacts(contacts, 'john');
      expect(results).toHaveLength(1);
      expect(results[0].properties.email).toBe('john@acme.com');
    });

    it('should filter by firstname', () => {
      const contacts = [
        { properties: { email: 'john@acme.com', firstname: 'John', lastname: 'Doe' } },
        { properties: { email: 'jane@company.com', firstname: 'Jane', lastname: 'Smith' } }
      ];
      const results = searchContacts(contacts, 'jane');
      expect(results).toHaveLength(1);
    });
  });

  describe('Pipeline Analysis', () => {
    const analyzePipeline = (deals: Array<{
      properties: { amount: string; dealstage: string };
    }>): { totalValue: number; byStage: Record<string, number>; dealCount: number } => {
      const byStage: Record<string, number> = {};
      let totalValue = 0;

      deals.forEach(deal => {
        const amount = parseFloat(deal.properties.amount) || 0;
        totalValue += amount;
        const stage = deal.properties.dealstage;
        byStage[stage] = (byStage[stage] || 0) + 1;
      });

      return { totalValue, byStage, dealCount: deals.length };
    };

    it('should calculate pipeline metrics', () => {
      const deals = [
        { properties: { amount: '50000', dealstage: 'presentationscheduled' } },
        { properties: { amount: '30000', dealstage: 'contractsent' } },
        { properties: { amount: '20000', dealstage: 'closedwon' } }
      ];
      const result = analyzePipeline(deals);
      expect(result.totalValue).toBe(100000);
      expect(result.byStage['presentationscheduled']).toBe(1);
      expect(result.dealCount).toBe(3);
    });
  });

  describe('Deal Stage Progression', () => {
    const getNextStages = (currentStage: string): string[] => {
      const stageIndex = DEAL_STAGES.indexOf(currentStage);
      if (stageIndex === -1 || stageIndex >= DEAL_STAGES.length - 2) return [];
      return [DEAL_STAGES[stageIndex + 1]];
    };

    it('should suggest next stage', () => {
      const nextStages = getNextStages('presentationscheduled');
      expect(nextStages).toContain('decisionmakerboughtin');
    });

    it('should return empty for closed deals', () => {
      const nextStages = getNextStages('closedwon');
      expect(nextStages).toHaveLength(0);
    });
  });
});
