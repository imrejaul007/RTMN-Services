/**
 * CXO OS - Test Suite
 *
 * Tests: KPIs, Executive Dashboard, Strategic Planning, War Room
 */

import { describe, it, expect, beforeEach } from 'vitest';

// Data stores
const mockKPIs = new Map();
const mockMetrics = new Map();
const mockDecisions = new Map();

let idCounter = 1;
const generateId = () => `cxo_${String(idCounter++).padStart(6, '0')}`;

interface KPI {
  id: string;
  name: string;
  category: 'financial' | 'operational' | 'customer' | 'people' | 'growth';
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface Metric {
  id: string;
  name: string;
  department: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly';
}

interface Decision {
  id: string;
  title: string;
  description: string;
  status: 'proposed' | 'approved' | 'rejected' | 'implemented';
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  decidedAt?: string;
  implementedAt?: string;
  impact?: { revenue?: number; cost?: number; time?: number };
}

const cxoService = {
  // KPIs
  createKPI(data: Partial<KPI>): KPI {
    const kpi: KPI = {
      id: generateId(),
      name: data.name || '',
      category: data.category || 'financial',
      value: data.value || 0,
      target: data.target || 100,
      unit: data.unit || '%',
      trend: data.trend || 'stable',
      lastUpdated: new Date().toISOString(),
    };
    mockKPIs.set(kpi.id, kpi);
    return kpi;
  },

  getKPI(id: string): KPI | undefined {
    return mockKPIs.get(id);
  },

  listKPIs(filters?: { category?: KPI['category'] }): KPI[] {
    let kpis = Array.from(mockKPIs.values());
    if (filters?.category) kpis = kpis.filter(k => k.category === filters.category);
    return kpis;
  },

  updateKPIValue(id: string, value: number): KPI | undefined {
    const kpi = mockKPIs.get(id);
    if (!kpi) return undefined;

    const prevValue = kpi.value;
    kpi.value = value;
    kpi.lastUpdated = new Date().toISOString();

    // Calculate trend
    if (value > prevValue) kpi.trend = 'up';
    else if (value < prevValue) kpi.trend = 'down';
    else kpi.trend = 'stable';

    mockKPIs.set(id, kpi);
    return kpi;
  },

  // Metrics
  createMetric(data: Partial<Metric>): Metric {
    const changePercent = data.previousValue
      ? ((data.currentValue - data.previousValue) / data.previousValue) * 100
      : 0;

    const metric: Metric = {
      id: generateId(),
      name: data.name || '',
      department: data.department || '',
      currentValue: data.currentValue || 0,
      previousValue: data.previousValue || 0,
      changePercent,
      period: data.period || 'monthly',
    };
    mockMetrics.set(metric.id, metric);
    return metric;
  },

  listMetrics(filters?: { department?: string; period?: Metric['period'] }): Metric[] {
    let metrics = Array.from(mockMetrics.values());
    if (filters?.department) metrics = metrics.filter(m => m.department === filters.department);
    if (filters?.period) metrics = metrics.filter(m => m.period === filters.period);
    return metrics;
  },

  // Decisions
  createDecision(data: Partial<Decision>): Decision {
    const decision: Decision = {
      id: generateId(),
      title: data.title || '',
      description: data.description || '',
      status: data.status || 'proposed',
      priority: data.priority || 'medium',
      requestedBy: data.requestedBy || '',
      decidedAt: data.decidedAt,
      implementedAt: data.implementedAt,
      impact: data.impact,
    };
    mockDecisions.set(decision.id, decision);
    return decision;
  },

  updateDecisionStatus(id: string, status: Decision['status']): Decision | undefined {
    const decision = mockDecisions.get(id);
    if (!decision) return undefined;

    decision.status = status;
    if (status === 'approved' || status === 'rejected') {
      decision.decidedAt = new Date().toISOString();
    }
    if (status === 'implemented') {
      decision.implementedAt = new Date().toISOString();
    }

    mockDecisions.set(id, decision);
    return decision;
  },

  // Executive Dashboard
  getExecutiveDashboard(): any {
    const kpis = Array.from(mockKPIs.values());
    const metrics = Array.from(mockMetrics.values());
    const decisions = Array.from(mockDecisions.values());

    const categoryKPIs: Record<string, { count: number; avgPerformance: number }> = {};
    kpis.forEach(kpi => {
      if (!categoryKPIs[kpi.category]) {
        categoryKPIs[kpi.category] = { count: 0, avgPerformance: 0 };
      }
      const perf = kpi.target > 0 ? (kpi.value / kpi.target) * 100 : 0;
      categoryKPIs[kpi.category].count++;
      categoryKPIs[kpi.category].avgPerformance += perf;
    });

    Object.keys(categoryKPIs).forEach(cat => {
      categoryKPIs[cat].avgPerformance /= categoryKPIs[cat].count;
    });

    const pendingDecisions = decisions.filter(d => d.status === 'proposed');
    const avgImpact = decisions
      .filter(d => d.impact)
      .reduce((sum, d) => {
        const rev = d.impact?.revenue || 0;
        const cost = d.impact?.cost || 0;
        return sum + rev - cost;
      }, 0);

    return {
      kpis: {
        total: kpis.length,
        byCategory: categoryKPIs,
        overallHealth: kpis.length > 0
          ? kpis.reduce((sum, k) => sum + (k.target > 0 ? (k.value / k.target) * 100 : 0), 0) / kpis.length
          : 0,
      },
      metrics: {
        total: metrics.length,
        positiveChange: metrics.filter(m => m.changePercent > 0).length,
        avgChange: metrics.length > 0
          ? metrics.reduce((sum, m) => sum + m.changePercent, 0) / metrics.length
          : 0,
      },
      decisions: {
        pending: pendingDecisions.length,
        critical: pendingDecisions.filter(d => d.priority === 'critical').length,
        totalImpact: avgImpact,
      },
    };
  },

  reset() {
    mockKPIs.clear();
    mockMetrics.clear();
    mockDecisions.clear();
    idCounter = 1;
  },
};

describe('CXO OS - KPIs', () => {
  beforeEach(() => cxoService.reset());

  describe('createKPI', () => {
    it('should create KPI with all fields', () => {
      const kpi = cxoService.createKPI({
        name: 'Monthly Revenue',
        category: 'financial',
        value: 15000000,
        target: 20000000,
        unit: 'INR',
      });

      expect(kpi.id).toBeDefined();
      expect(kpi.name).toBe('Monthly Revenue');
      expect(kpi.category).toBe('financial');
      expect(kpi.value).toBe(15000000);
      expect(kpi.target).toBe(20000000);
      expect(kpi.trend).toBe('stable');
    });

    it('should create KPIs for all categories', () => {
      const categories: KPI['category'][] = ['financial', 'operational', 'customer', 'people', 'growth'];
      categories.forEach(cat => {
        const kpi = cxoService.createKPI({ name: cat, category: cat, value: 50, target: 100 });
        expect(kpi.category).toBe(cat);
      });
    });
  });

  describe('updateKPIValue', () => {
    it('should update value and trend', () => {
      const kpi = cxoService.createKPI({ name: 'Test', value: 50, target: 100, trend: 'stable' });
      const updated = cxoService.updateKPIValue(kpi.id, 75);

      expect(updated?.value).toBe(75);
      expect(updated?.trend).toBe('up');
    });

    it('should detect downward trend', () => {
      const kpi = cxoService.createKPI({ name: 'Test', value: 80, target: 100, trend: 'stable' });
      const updated = cxoService.updateKPIValue(kpi.id, 60);

      expect(updated?.value).toBe(60);
      expect(updated?.trend).toBe('down');
    });
  });

  describe('listKPIs', () => {
    it('should filter by category', () => {
      cxoService.createKPI({ name: 'Revenue', category: 'financial', value: 100, target: 100 });
      cxoService.createKPI({ name: 'NPS', category: 'customer', value: 70, target: 100 });

      const financial = cxoService.listKPIs({ category: 'financial' });
      expect(financial).toHaveLength(1);
      expect(financial[0].category).toBe('financial');
    });
  });
});

describe('CXO OS - Metrics', () => {
  beforeEach(() => cxoService.reset());

  describe('createMetric', () => {
    it('should calculate change percent', () => {
      const metric = cxoService.createMetric({
        name: 'Customer Satisfaction',
        department: 'CS',
        currentValue: 85,
        previousValue: 80,
        period: 'monthly',
      });

      expect(metric.changePercent).toBe(6.25); // (85-80)/80 * 100
    });

    it('should handle negative change', () => {
      const metric = cxoService.createMetric({
        name: 'Churn Rate',
        department: 'CS',
        currentValue: 5,
        previousValue: 8,
        period: 'monthly',
      });

      expect(metric.changePercent).toBe(-37.5); // (5-8)/8 * 100
    });
  });

  describe('listMetrics', () => {
    it('should filter by department', () => {
      cxoService.createMetric({ name: 'M1', department: 'Sales', currentValue: 100, previousValue: 80 });
      cxoService.createMetric({ name: 'M2', department: 'Marketing', currentValue: 50, previousValue: 40 });

      const sales = cxoService.listMetrics({ department: 'Sales' });
      expect(sales).toHaveLength(1);
      expect(sales[0].department).toBe('Sales');
    });
  });
});

describe('CXO OS - Decisions', () => {
  beforeEach(() => cxoService.reset());

  describe('createDecision', () => {
    it('should create with impact', () => {
      const decision = cxoService.createDecision({
        title: 'Expand to New Market',
        description: 'Enter Southeast Asia market',
        priority: 'high',
        impact: { revenue: 50000000, cost: 10000000, time: 12 },
      });

      expect(decision.id).toBeDefined();
      expect(decision.priority).toBe('high');
      expect(decision.impact?.revenue).toBe(50000000);
    });
  });

  describe('updateDecisionStatus', () => {
    it('should update decision status', () => {
      const decision = cxoService.createDecision({ title: 'Test', requestedBy: 'CEO' });
      const updated = cxoService.updateDecisionStatus(decision.id, 'approved');

      expect(updated?.status).toBe('approved');
      expect(updated?.decidedAt).toBeDefined();
    });

    it('should track implementation timestamp', () => {
      const decision = cxoService.createDecision({ title: 'Test' });
      const updated = cxoService.updateDecisionStatus(decision.id, 'implemented');

      expect(updated?.implementedAt).toBeDefined();
    });
  });
});

describe('CXO OS - Executive Dashboard', () => {
  beforeEach(() => cxoService.reset());

  it('should aggregate all data', () => {
    // KPIs
    cxoService.createKPI({ name: 'Revenue', category: 'financial', value: 180, target: 200 });
    cxoService.createKPI({ name: 'NPS', category: 'customer', value: 75, target: 80 });

    // Metrics
    cxoService.createMetric({ name: 'M1', department: 'Sales', currentValue: 110, previousValue: 100 });
    cxoService.createMetric({ name: 'M2', department: 'Marketing', currentValue: 45, previousValue: 50 });

    // Decisions
    cxoService.createDecision({ title: 'D1', priority: 'critical', impact: { revenue: 1000000 } });
    cxoService.createDecision({ title: 'D2', priority: 'low', status: 'implemented', impact: { cost: 50000 } });

    const dashboard = cxoService.getExecutiveDashboard();

    expect(dashboard.kpis.total).toBe(2);
    // KPI health: (180/200 + 75/80) / 2 * 100 = (90 + 93.75) / 2 = 91.875
    expect(dashboard.kpis.overallHealth).toBeCloseTo(91.88, 1);

    expect(dashboard.metrics.total).toBe(2);
    expect(dashboard.metrics.positiveChange).toBe(1);

    expect(dashboard.decisions.pending).toBe(1);
    expect(dashboard.decisions.critical).toBe(1);
  });
});
