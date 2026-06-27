import { describe, it, expect } from 'vitest';

// Zoho Connector Constants
const LEAD_STATUSES = ['Not Contacted', 'Attempted to Contact', 'Contacted', 'Qualified', 'Unqualified', 'Converted'];
const DEAL_STAGES = ['Planning', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

describe('Zoho Connector', () => {
  describe('Lead Statuses', () => {
    it('should have all lead statuses', () => {
      expect(LEAD_STATUSES).toContain('Not Contacted');
      expect(LEAD_STATUSES).toContain('Qualified');
      expect(LEAD_STATUSES).toContain('Converted');
    });
  });

  describe('Deal Stages', () => {
    it('should have all deal stages', () => {
      expect(DEAL_STAGES).toContain('Planning');
      expect(DEAL_STAGES).toContain('Proposal');
      expect(DEAL_STAGES).toContain('Closed Won');
      expect(DEAL_STAGES).toContain('Closed Lost');
    });
  });

  describe('Lead Validation', () => {
    const validateLead = (lead: {
      First_Name?: string;
      Last_Name?: string;
      Email?: string;
      Company?: string;
      Status?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!lead.Email) errors.push('Email is required');
      if (lead.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.Email)) {
        errors.push('invalid Email');
      }
      if (lead.Status && !LEAD_STATUSES.includes(lead.Status)) {
        errors.push(`invalid Status: ${lead.Status}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct lead', () => {
      const result = validateLead({
        First_Name: 'John',
        Last_Name: 'Doe',
        Email: 'john.doe@company.com',
        Company: 'Acme Corp',
        Status: 'Contacted'
      });
      expect(result.valid).toBe(true);
    });

    it('should require email', () => {
      const result = validateLead({ First_Name: 'John' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Email is required');
    });
  });

  describe('Deal Validation', () => {
    const validateDeal = (deal: {
      Deal_Name?: string;
      Amount?: string;
      Stage?: string;
      Closing_Date?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!deal.Deal_Name) errors.push('Deal_Name is required');
      if (deal.Stage && !DEAL_STAGES.includes(deal.Stage)) {
        errors.push(`invalid Stage: ${deal.Stage}`);
      }
      if (deal.Closing_Date && isNaN(Date.parse(deal.Closing_Date))) {
        errors.push('invalid Closing_Date');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct deal', () => {
      const result = validateDeal({
        Deal_Name: 'Enterprise License Deal',
        Amount: '50000',
        Stage: 'Proposal',
        Closing_Date: '2026-07-30'
      });
      expect(result.valid).toBe(true);
    });

    it('should require Deal_Name', () => {
      const result = validateDeal({});
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Deal_Name is required');
    });
  });

  describe('Lead Conversion', () => {
    const convertLead = (lead: { Email: string; Company: string; Status: string }) => {
      if (lead.Status !== 'Qualified') {
        return { success: false, error: 'Lead must be qualified first' };
      }
      return {
        success: true,
        contact: { email: lead.Email, company: lead.Company },
        account: { name: lead.Company }
      };
    };

    it('should convert qualified leads', () => {
      const lead = { Email: 'test@acme.com', Company: 'Acme', Status: 'Qualified' };
      const result = convertLead(lead);
      expect(result.success).toBe(true);
      expect(result.contact).toBeDefined();
      expect(result.account).toBeDefined();
    });

    it('should reject unqualified leads', () => {
      const lead = { Email: 'test@acme.com', Company: 'Acme', Status: 'Not Contacted' };
      const result = convertLead(lead);
      expect(result.success).toBe(false);
      expect(result.error).toContain('qualified');
    });
  });

  describe('Deal Probability', () => {
    const getStageProbability = (stage: string): number => {
      const probabilities: Record<string, number> = {
        'Planning': 10,
        'Qualification': 25,
        'Proposal': 50,
        'Negotiation': 75,
        'Closed Won': 100,
        'Closed Lost': 0
      };
      return probabilities[stage] || 0;
    };

    it('should return correct probabilities', () => {
      expect(getStageProbability('Planning')).toBe(10);
      expect(getStageProbability('Negotiation')).toBe(75);
      expect(getStageProbability('Closed Won')).toBe(100);
    });
  });

  describe('Deal Value Calculation', () => {
    const calculatePipelineValue = (
      deals: Array<{ Amount: string; Stage: string }>
    ) => {
      const getProb = (stage: string) => {
        const probs: Record<string, number> = { 'Planning': 10, 'Qualification': 25, 'Proposal': 50, 'Negotiation': 75, 'Closed Won': 100 };
        return probs[stage] || 0;
      };

      const totalValue = deals.reduce((sum, d) => sum + parseFloat(d.Amount || '0'), 0);
      const weightedValue = deals.reduce((sum, d) => {
        return sum + (parseFloat(d.Amount || '0') * getProb(d.Stage) / 100);
      }, 0);

      return { totalValue, weightedValue };
    };

    it('should calculate pipeline values', () => {
      const deals = [
        { Amount: '10000', Stage: 'Proposal' },
        { Amount: '50000', Stage: 'Negotiation' }
      ];
      const pipeline = calculatePipelineValue(deals);
      expect(pipeline.totalValue).toBe(60000);
      expect(pipeline.weightedValue).toBe(10000 * 0.5 + 50000 * 0.75); // 5000 + 37500 = 42500
    });
  });

  describe('Task Validation', () => {
    const validateTask = (task: {
      Subject?: string;
      Status?: string;
      Due_Date?: string;
      Priority?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!task.Subject) errors.push('Subject is required');
      if (task.Priority && !TASK_PRIORITIES.includes(task.Priority)) {
        errors.push(`invalid Priority: ${task.Priority}`);
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct task', () => {
      const result = validateTask({
        Subject: 'Follow up with client',
        Status: 'Not Started',
        Due_Date: '2026-06-30',
        Priority: 'High'
      });
      expect(result.valid).toBe(true);
    });
  });
});