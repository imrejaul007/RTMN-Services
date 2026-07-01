/**
 * Customer Success OS - Test Suite
 *
 * Tests: Customers, Health Scores, NPS, Churn, Onboarding, Campaigns
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockCustomers = new Map();
const mockHealthScores = new Map();
const mockNPS = new Map();
const mockChurnRisks = new Map();
const mockOnboarding = new Map();

let idCounter = 1;
const generateId = () => `cs_${String(idCounter++).padStart(6, '0')}`;

interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'churned' | 'at-risk';
  healthScore: number;
  npsScore?: number;
  onboardingComplete: boolean;
  createdAt: string;
}

interface HealthScore {
  id: string;
  customerId: string;
  score: number;
  factors: { name: string; contribution: number }[];
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: string;
}

interface NPSResponse {
  id: string;
  customerId: string;
  score: number;
  promoter: boolean;
  detractor: boolean;
  feedback?: string;
  submittedAt: string;
}

// Service
const csService = {
  createCustomer(data: Partial<Customer>): Customer {
    const customer: Customer = {
      id: generateId(),
      name: data.name || '',
      email: data.email || '',
      company: data.company || '',
      plan: data.plan || 'starter',
      status: data.status || 'active',
      healthScore: data.healthScore ?? 75,
      npsScore: data.npsScore,
      onboardingComplete: data.onboardingComplete ?? false,
      createdAt: new Date().toISOString(),
    };
    mockCustomers.set(customer.id, customer);
    return customer;
  },

  getCustomer(id: string): Customer | undefined {
    return mockCustomers.get(id);
  },

  listCustomers(filters?: { status?: string; plan?: string }): Customer[] {
    let customers = Array.from(mockCustomers.values());
    if (filters?.status) customers = customers.filter(c => c.status === filters.status);
    if (filters?.plan) customers = customers.filter(c => c.plan === filters.plan);
    return customers;
  },

  updateHealthScore(customerId: string, score: number): Customer | undefined {
    const customer = mockCustomers.get(customerId);
    if (!customer) return undefined;
    customer.healthScore = Math.max(0, Math.min(100, score));
    mockCustomers.set(customerId, customer);

    const healthScore: HealthScore = {
      id: generateId(),
      customerId,
      score: customer.healthScore,
      factors: [
        { name: 'usage_frequency', contribution: score * 0.3 },
        { name: 'feature_adoption', contribution: score * 0.25 },
        { name: 'support_tickets', contribution: score * 0.2 },
        { name: 'engagement', contribution: score * 0.25 },
      ],
      trend: 'stable',
      calculatedAt: new Date().toISOString(),
    };
    mockHealthScores.set(healthScore.id, healthScore);
    return customer;
  },

  calculateChurnRisk(customerId: string): { risk: 'low' | 'medium' | 'high'; score: number } {
    const customer = mockCustomers.get(customerId);
    if (!customer) return { risk: 'low', score: 0 };

    let riskScore = 100 - customer.healthScore;
    if (customer.npsScore && customer.npsScore < 7) riskScore += 20;
    if (!customer.onboardingComplete) riskScore += 15;

    riskScore = Math.max(0, Math.min(100, riskScore));
    return {
      risk: riskScore > 60 ? 'high' : riskScore > 30 ? 'medium' : 'low',
      score: riskScore,
    };
  },

  submitNPS(customerId: string, score: number, feedback?: string): NPSResponse {
    const response: NPSResponse = {
      id: generateId(),
      customerId,
      score,
      promoter: score >= 9,
      detractor: score <= 6,
      feedback,
      submittedAt: new Date().toISOString(),
    };
    mockNPS.set(response.id, response);

    const customer = mockCustomers.get(customerId);
    if (customer) {
      customer.npsScore = score;
      mockCustomers.set(customerId, customer);
    }
    return response;
  },

  getNPSStats(): { promoterCount: number; detractorCount: number; npsScore: number } {
    const responses = Array.from(mockNPS.values());
    const promoters = responses.filter(r => r.promoter).length;
    const detractors = responses.filter(r => r.detractor).length;
    const total = responses.length || 1;
    const npsScore = ((promoters - detractors) / total) * 100;
    return { promoterCount: promoters, detractorCount: detractors, npsScore };
  },

  getDashboard(): any {
    const customers = Array.from(mockCustomers.values());
    const avgHealth = customers.length > 0
      ? customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length
      : 0;

    return {
      totalCustomers: customers.length,
      activeCustomers: customers.filter(c => c.status === 'active').length,
      atRiskCustomers: customers.filter(c => c.status === 'at-risk').length,
      churnedCustomers: customers.filter(c => c.status === 'churned').length,
      avgHealthScore: Math.round(avgHealth),
      nps: this.getNPSStats(),
    };
  },

  reset() {
    mockCustomers.clear();
    mockHealthScores.clear();
    mockNPS.clear();
    mockChurnRisks.clear();
    mockOnboarding.clear();
    idCounter = 1;
  },
};

describe('Customer Success OS - Customers', () => {
  beforeEach(() => csService.reset());

  describe('createCustomer', () => {
    it('should create customer with default values', () => {
      const customer = csService.createCustomer({
        name: 'John Doe',
        email: 'john@acme.com',
        company: 'Acme Corp',
      });
      expect(customer.id).toBeDefined();
      expect(customer.name).toBe('John Doe');
      expect(customer.healthScore).toBe(75);
      expect(customer.status).toBe('active');
    });

    it('should create customer with plan levels', () => {
      ['starter', 'growth', 'enterprise'].forEach(plan => {
        const customer = csService.createCustomer({ name: `Customer ${plan}`, plan: plan as any });
        expect(customer.plan).toBe(plan);
      });
    });
  });

  describe('listCustomers', () => {
    it('should filter by status', () => {
      csService.createCustomer({ name: 'Active 1', status: 'active' });
      csService.createCustomer({ name: 'At Risk', status: 'at-risk' });
      csService.createCustomer({ name: 'Active 2', status: 'active' });

      const atRisk = csService.listCustomers({ status: 'at-risk' });
      expect(atRisk).toHaveLength(1);
      expect(atRisk[0].status).toBe('at-risk');
    });
  });

  describe('updateHealthScore', () => {
    it('should update and calculate health', () => {
      const customer = csService.createCustomer({ name: 'Test' });
      const updated = csService.updateHealthScore(customer.id, 45);
      expect(updated?.healthScore).toBe(45);
    });

    it('should cap health score at 100', () => {
      const customer = csService.createCustomer({ name: 'Test' });
      const updated = csService.updateHealthScore(customer.id, 150);
      expect(updated?.healthScore).toBe(100);
    });
  });

  describe('calculateChurnRisk', () => {
    it('should calculate high risk for low health', () => {
      const customer = csService.createCustomer({ name: 'Test', healthScore: 20 });
      const risk = csService.calculateChurnRisk(customer.id);
      expect(risk.risk).toBe('high');
      expect(risk.score).toBeGreaterThan(60);
    });

    it('should calculate low risk for high health', () => {
      const customer = csService.createCustomer({ name: 'Test', healthScore: 90 });
      const risk = csService.calculateChurnRisk(customer.id);
      expect(risk.risk).toBe('low');
    });
  });
});

describe('Customer Success OS - NPS', () => {
  beforeEach(() => csService.reset());

  describe('submitNPS', () => {
    it('should classify promoters (score 9-10)', () => {
      const customer = csService.createCustomer({ name: 'Test' });
      const response = csService.submitNPS(customer.id, 9, 'Great!');
      expect(response.promoter).toBe(true);
      expect(response.detractor).toBe(false);
    });

    it('should classify detractors (score 0-6)', () => {
      const customer = csService.createCustomer({ name: 'Test' });
      const response = csService.submitNPS(customer.id, 4, 'Not happy');
      expect(response.promoter).toBe(false);
      expect(response.detractor).toBe(true);
    });
  });

  describe('getNPSStats', () => {
    it('should calculate NPS score correctly', () => {
      // NPS: promoter = score >= 9, detractor = score <= 6
      // Test with: 10 (promoter), 9 (promoter), 6 (detractor), 8 (neutral)
      csService.submitNPS('c1', 10); // promoter
      csService.submitNPS('c2', 9);  // promoter
      csService.submitNPS('c3', 6);  // detractor
      csService.submitNPS('c4', 8);  // neutral (not counted)

      const stats = csService.getNPSStats();
      expect(stats.promoterCount).toBe(2);
      expect(stats.detractorCount).toBe(1);
      // NPS = (2-1)/4 * 100 = 25
      expect(stats.npsScore).toBe(25);
    });
  });
});

describe('Customer Success OS - Dashboard', () => {
  beforeEach(() => csService.reset());

  it('should aggregate metrics', () => {
    csService.createCustomer({ name: 'A1', status: 'active', healthScore: 90 });
    csService.createCustomer({ name: 'A2', status: 'active', healthScore: 80 });
    csService.createCustomer({ name: 'Risk', status: 'at-risk', healthScore: 30 });

    const dashboard = csService.getDashboard();
    expect(dashboard.totalCustomers).toBe(3);
    expect(dashboard.activeCustomers).toBe(2);
    expect(dashboard.atRiskCustomers).toBe(1);
    expect(dashboard.avgHealthScore).toBe(67);
  });
});
