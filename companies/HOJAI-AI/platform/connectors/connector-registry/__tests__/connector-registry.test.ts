import { describe, it, expect } from 'vitest';

// Freshworks Connector Constants
const LEAD_STATUSES = ['New', 'Contacted', 'Qualified', 'Unqualified', 'Converted'];
const DEAL_STAGES = ['Open', 'Won', 'Lost'];

describe('Freshworks Connector', () => {
  describe('Lead Statuses', () => {
    it('should have all lead statuses', () => {
      expect(LEAD_STATUSES).toContain('New');
      expect(LEAD_STATUSES).toContain('Qualified');
      expect(LEAD_STATUSES).toContain('Converted');
    });
  });

  describe('Deal Stages', () => {
    it('should have all deal stages', () => {
      expect(DEAL_STAGES).toContain('Open');
      expect(DEAL_STAGES).toContain('Won');
      expect(DEAL_STAGES).toContain('Lost');
    });
  });

  describe('Lead Validation', () => {
    const validateLead = (lead: { email?: string; first_name?: string; last_name?: string; lead_status?: string }) => {
      const errors: string[] = [];
      if (!lead.email) errors.push('email required');
      if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) errors.push('invalid email');
      if (lead.lead_status && !LEAD_STATUSES.includes(lead.lead_status)) errors.push('invalid status');
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct lead', () => {
      expect(validateLead({ email: 'test@example.com', first_name: 'John', lead_status: 'New' }).valid).toBe(true);
    });

    it('should require email', () => {
      expect(validateLead({ first_name: 'John' }).valid).toBe(false);
    });
  });

  describe('Contact Validation', () => {
    const validateContact = (contact: { email?: string; first_name?: string; last_name?: string }) => {
      const errors: string[] = [];
      if (!contact.email) errors.push('email required');
      return { valid: errors.length === 0, errors };
    };

    it('should validate contact', () => {
      expect(validateContact({ email: 'test@example.com', first_name: 'John' }).valid).toBe(true);
    });
  });

  describe('Deal Validation', () => {
    const validateDeal = (deal: { name?: string; amount?: number; stage?: string; probability?: number }) => {
      const errors: string[] = [];
      if (!deal.name) errors.push('name required');
      if (deal.amount !== undefined && deal.amount < 0) errors.push('negative amount');
      if (deal.stage && !DEAL_STAGES.includes(deal.stage)) errors.push('invalid stage');
      if (deal.probability !== undefined && (deal.probability < 0 || deal.probability > 100)) errors.push('invalid probability');
      return { valid: errors.length === 0, errors };
    };

    it('should validate correct deal', () => {
      expect(validateDeal({ name: 'Enterprise Deal', amount: 50000, stage: 'Open', probability: 75 }).valid).toBe(true);
    });
  });

  describe('Account Validation', () => {
    const validateAccount = (account: { name?: string; website?: string; industry?: string }) => {
      const errors: string[] = [];
      if (!account.name) errors.push('name required');
      return { valid: errors.length === 0, errors };
    };

    it('should validate account', () => {
      expect(validateAccount({ name: 'Acme Corp', industry: 'Technology' }).valid).toBe(true);
    });
  });

  describe('Pipeline Value Calculation', () => {
    const calculatePipelineValue = (deals: Array<{ amount: number; stage: string; probability: number }>) => {
      const total = deals.reduce((sum, d) => sum + d.amount, 0);
      const weighted = deals.reduce((sum, d) => sum + d.amount * (d.probability / 100), 0);
      const won = deals.filter(d => d.stage === 'Won').reduce((sum, d) => sum + d.amount, 0);
      return { total, weighted, won };
    };

    it('should calculate pipeline metrics', () => {
      const deals = [
        { amount: 10000, stage: 'Open', probability: 50 },
        { amount: 20000, stage: 'Open', probability: 75 },
        { amount: 5000, stage: 'Won', probability: 100 }
      ];
      const result = calculatePipelineValue(deals);
      expect(result.total).toBe(35000);
      expect(result.won).toBe(5000);
    });
  });
});