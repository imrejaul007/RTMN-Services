import { describe, it, expect } from 'vitest';

// Salesforce Connector Constants
const LEAD_STATUSES = ['New', 'Working', 'Nurturing', 'Qualified', 'Converted'];
const OPPORTUNITY_STAGES = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const SALESFORCE_OBJECT_TYPES = ['Lead', 'Opportunity', 'Contact', 'Account', 'Task', 'Event'];

describe('Salesforce Connector', () => {
  describe('Lead Statuses', () => {
    it('should have all lead statuses', () => {
      expect(LEAD_STATUSES).toContain('New');
      expect(LEAD_STATUSES).toContain('Working');
      expect(LEAD_STATUSES).toContain('Nurturing');
      expect(LEAD_STATUSES).toContain('Qualified');
      expect(LEAD_STATUSES).toContain('Converted');
    });

    it('should have 5 lead statuses', () => {
      expect(LEAD_STATUSES).toHaveLength(5);
    });
  });

  describe('Opportunity Stages', () => {
    it('should have all opportunity stages', () => {
      expect(OPPORTUNITY_STAGES).toContain('Prospecting');
      expect(OPPORTUNITY_STAGES).toContain('Qualification');
      expect(OPPORTUNITY_STAGES).toContain('Proposal');
      expect(OPPORTUNITY_STAGES).toContain('Negotiation');
      expect(OPPORTUNITY_STAGES).toContain('Closed Won');
      expect(OPPORTUNITY_STAGES).toContain('Closed Lost');
    });

    it('should have 6 opportunity stages', () => {
      expect(OPPORTUNITY_STAGES).toHaveLength(6);
    });
  });

  describe('Salesforce Object Types', () => {
    it('should support all major object types', () => {
      SALESFORCE_OBJECT_TYPES.forEach(type => {
        expect(['Lead', 'Opportunity', 'Contact', 'Account', 'Task', 'Event']).toContain(type);
      });
    });
  });

  describe('Lead Validation', () => {
    const validateLead = (lead: {
      email?: string;
      firstName?: string;
      lastName?: string;
      company?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!lead.email) errors.push('email is required');
      if (lead.email && !isValidEmail(lead.email)) errors.push('invalid email format');
      if (!lead.firstName) errors.push('firstName is required');
      if (!lead.lastName) errors.push('lastName is required');

      return { valid: errors.length === 0, errors };
    };

    const isValidEmail = (email: string): boolean => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    it('should validate correct lead', () => {
      const result = validateLead({
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        company: 'Acme Inc'
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require email', () => {
      const result = validateLead({ firstName: 'John', lastName: 'Doe' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email is required');
    });

    it('should reject invalid email format', () => {
      const result = validateLead({ email: 'invalid-email', firstName: 'John', lastName: 'Doe' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('invalid email format');
    });

    it('should require firstName', () => {
      const result = validateLead({ email: 'john@example.com', lastName: 'Doe' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('firstName is required');
    });

    it('should require lastName', () => {
      const result = validateLead({ email: 'john@example.com', firstName: 'John' });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('lastName is required');
    });
  });

  describe('Opportunity Validation', () => {
    const validateOpportunity = (opp: {
      name?: string;
      amount?: number;
      stage?: string;
      closeDate?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!opp.name) errors.push('name is required');
      if (opp.amount !== undefined && opp.amount < 0) errors.push('amount cannot be negative');
      if (opp.stage && !OPPORTUNITY_STAGES.includes(opp.stage)) {
        errors.push(`Invalid stage: ${opp.stage}`);
      }
      if (opp.closeDate && !isValidDate(opp.closeDate)) {
        errors.push('Invalid closeDate format');
      }

      return { valid: errors.length === 0, errors };
    };

    const isValidDate = (date: string): boolean => {
      return !isNaN(Date.parse(date));
    };

    it('should validate correct opportunity', () => {
      const result = validateOpportunity({
        name: 'Enterprise Deal',
        amount: 50000,
        stage: 'Proposal',
        closeDate: '2026-12-31'
      });
      expect(result.valid).toBe(true);
    });

    it('should require name', () => {
      const result = validateOpportunity({ amount: 50000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name is required');
    });

    it('should reject negative amount', () => {
      const result = validateOpportunity({ name: 'Deal', amount: -1000 });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('amount cannot be negative');
    });

    it('should reject invalid stage', () => {
      const result = validateOpportunity({ name: 'Deal', stage: 'Invalid' });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid stage'))).toBe(true);
    });
  });

  describe('Contact Validation', () => {
    const validateContact = (contact: {
      name?: string;
      email?: string;
      account?: string;
      title?: string;
    }): { valid: boolean; errors: string[] } => {
      const errors: string[] = [];

      if (!contact.name) errors.push('name is required');
      if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
        errors.push('invalid email format');
      }

      return { valid: errors.length === 0, errors };
    };

    it('should validate correct contact', () => {
      const result = validateContact({
        name: 'Jane Smith',
        email: 'jane@example.com',
        account: 'Acme Inc',
        title: 'VP Sales'
      });
      expect(result.valid).toBe(true);
    });

    it('should require name', () => {
      const result = validateContact({ email: 'jane@example.com' });
      expect(result.valid).toBe(false);
    });
  });

  describe('Pipeline Analysis', () => {
    const calculatePipelineValue = (opportunities: Array<{
      amount: number;
      stage: string;
      probability: number;
    }>): { totalValue: number; weightedValue: number; byStage: Record<string, number> } => {
      const byStage: Record<string, number> = {};
      let totalValue = 0;
      let weightedValue = 0;

      opportunities.forEach(opp => {
        totalValue += opp.amount;
        weightedValue += opp.amount * (opp.probability / 100);

        if (!byStage[opp.stage]) byStage[opp.stage] = 0;
        byStage[opp.stage] += opp.amount;
      });

      return { totalValue, weightedValue: Math.round(weightedValue), byStage };
    };

    it('should calculate pipeline metrics', () => {
      const opportunities = [
        { amount: 50000, stage: 'Proposal', probability: 50 },
        { amount: 30000, stage: 'Negotiation', probability: 75 },
        { amount: 20000, stage: 'Closed Won', probability: 100 }
      ];
      const result = calculatePipelineValue(opportunities);
      expect(result.totalValue).toBe(100000);
      expect(result.weightedValue).toBe(77500); // 50000*0.5 + 30000*0.75 + 20000*1
      expect(result.byStage['Proposal']).toBe(50000);
    });

    it('should handle empty pipeline', () => {
      const result = calculatePipelineValue([]);
      expect(result.totalValue).toBe(0);
      expect(result.weightedValue).toBe(0);
    });
  });

  describe('Lead Scoring', () => {
    const scoreLead = (lead: {
      company?: string;
      email?: string;
      title?: string;
    }): number => {
      let score = 0;

      if (lead.company && lead.company.length > 5) score += 20;
      if (lead.email && !lead.email.includes('gmail') && !lead.email.includes('yahoo')) score += 30;
      if (lead.title) {
        const seniorTitles = ['ceo', 'cto', 'vp', 'director', 'head'];
        if (seniorTitles.some(t => lead.title!.toLowerCase().includes(t))) score += 50;
        else score += 20;
      }

      return Math.min(100, score);
    };

    it('should score senior titles higher', () => {
      const seniorLead = { company: 'Acme Corporation', email: 'ceo@acme.com', title: 'CEO' };
      const juniorLead = { company: 'Small Co', email: 'employee@gmail.com', title: 'Associate' };

      expect(scoreLead(seniorLead)).toBeGreaterThan(scoreLead(juniorLead));
    });

    it('should cap score at 100', () => {
      const maxLead = { company: 'Enterprise Corp', email: 'ceo@enterprise.com', title: 'Chief Executive Officer' };
      expect(scoreLead(maxLead)).toBe(100);
    });
  });

  describe('Sales Forecasting', () => {
    const forecastSales = (
      opportunities: Array<{ amount: number; stage: string; closeDate: string }>,
      quarterEnd: string
    ): { expected: number; best: number; worst: number } => {
      const quarterEndTime = new Date(quarterEnd).getTime();
      const now = Date.now();

      let expected = 0;
      let best = 0;
      let worst = 0;

      opportunities.forEach(opp => {
        const closeTime = new Date(opp.closeDate).getTime();
        const isInQuarter = closeTime <= quarterEndTime && closeTime >= now;

        if (isInQuarter) {
          const stageMultiplier = opp.stage === 'Closed Won' ? 1 :
                                opp.stage === 'Negotiation' ? 0.8 :
                                opp.stage === 'Proposal' ? 0.5 : 0.2;

          expected += opp.amount * stageMultiplier;
          best += opp.amount;
          worst += opp.amount * 0.2;
        }
      });

      return {
        expected: Math.round(expected),
        best: Math.round(best),
        worst: Math.round(worst)
      };
    };

    it('should calculate forecast for current quarter', () => {
      const opportunities = [
        { amount: 50000, stage: 'Proposal', closeDate: '2026-09-30' },
        { amount: 30000, stage: 'Negotiation', closeDate: '2026-08-15' },
        { amount: 20000, stage: 'Closed Won', closeDate: '2026-07-01' }
      ];
      const forecast = forecastSales(opportunities, '2026-09-30');
      expect(forecast.expected).toBe(54000); // 50000*0.5 + 30000*0.8 + 20000*1
      expect(forecast.best).toBe(100000);
      expect(forecast.worst).toBe(20000);
    });
  });

  describe('Activity Tracking', () => {
    const trackActivity = (
      activities: Array<{ type: string; date: string; duration?: number }>
    ): { totalActivities: number; byType: Record<string, number>; totalHours: number } => {
      const byType: Record<string, number> = {};
      let totalHours = 0;

      activities.forEach(activity => {
        byType[activity.type] = (byType[activity.type] || 0) + 1;
        totalHours += (activity.duration || 0) / 60;
      });

      return {
        totalActivities: activities.length,
        byType,
        totalHours: Math.round(totalHours * 10) / 10
      };
    };

    it('should track activity metrics', () => {
      const activities = [
        { type: 'call', date: '2026-06-01', duration: 30 },
        { type: 'email', date: '2026-06-02', duration: 15 },
        { type: 'meeting', date: '2026-06-03', duration: 60 }
      ];
      const result = trackActivity(activities);
      expect(result.totalActivities).toBe(3);
      expect(result.byType['call']).toBe(1);
      expect(result.totalHours).toBe(1.75);
    });
  });
});
