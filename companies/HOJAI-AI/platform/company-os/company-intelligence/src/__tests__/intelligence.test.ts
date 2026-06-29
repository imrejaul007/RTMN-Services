/**
 * Company Intelligence Tests
 */

import { describe, it, expect } from 'vitest';
import { companyIntelligence } from '../company-intelligence';

describe('CompanyIntelligence', () => {
  it('should create copilot', () => {
    const copilot = companyIntelligence.createCopilot({
      companyId: 'company_test',
      name: 'AI CEO',
      role: 'ceo',
    });
    expect(copilot.companyId).toBe('company_test');
    expect(copilot.role).toBe('ceo');
  });

  it('should generate daily briefing', () => {
    const briefing = companyIntelligence.generateBriefing({
      companyId: 'company_test',
      date: '2026-06-30',
      metrics: {
        revenue: 100000,
        orders: 50,
        customers: 40,
        expenses: 60000,
      },
    });
    expect(briefing.id).toBeDefined();
    expect(briefing.keyMetrics.length).toBe(4);
  });

  it('should analyze risks', () => {
    const analysis = companyIntelligence.analyzeRisks({
      companyId: 'company_test',
      financials: {
        revenue: 100000,
        expenses: 80000,
        debt: 50000,
      },
      operations: {
        employeeCount: 5,
        locations: 2,
      },
    });
    expect(analysis.overallScore).toBeDefined();
  });

  it('should generate recommendations', () => {
    const rec = companyIntelligence.generateRecommendation({
      companyId: 'company_test',
      goal: 'grow revenue',
    });
    expect(rec.type).toBe('growth');
  });
});
