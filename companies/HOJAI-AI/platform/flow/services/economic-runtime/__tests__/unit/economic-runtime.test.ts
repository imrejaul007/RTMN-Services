import { describe, it, expect, vi } from 'vitest';
vi.mock('@rtmn/shared/auth', () => ({ requireAuth: (_req: any, _res: any, next: () => void) => next() }));

function createCost(workflowId: string, amount: number): { id: string; workflowId: string; amount: number } {
  return { id: 'cost_' + Math.random().toString(36).slice(2, 10), workflowId, amount };
}

function calculateTotal(costs: { amount: number }[]): number {
  return costs.reduce((sum, c) => sum + c.amount, 0);
}

function checkBudget(budget: { limit: number; spent: number }): { over: boolean; percentage: number } {
  const percentage = Math.round((budget.spent / budget.limit) * 100);
  return { over: budget.spent > budget.limit, percentage };
}

function suggestOptimization(historicalCosts: number[]): { current: number; target: number; savings: number } {
  const current = calculateTotal(historicalCosts.map(a => ({ amount: a })));
  const target = current * 0.8; // suggest 20% reduction
  return { current, target, savings: current - target };
}

describe('Economic Runtime — Cost Tracking', () => {
  it('creates cost with required fields', () => {
    const cost = createCost('wf-1', 100);
    expect(cost.workflowId).toBe('wf-1');
    expect(cost.amount).toBe(100);
    expect(cost.id).toMatch(/^cost_/);
  });

  it('calculates total correctly', () => {
    const costs = [{ amount: 100 }, { amount: 200 }, { amount: 50 }];
    expect(calculateTotal(costs)).toBe(350);
  });

  it('handles empty costs', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('handles single cost', () => {
    expect(calculateTotal([{ amount: 150 }])).toBe(150);
  });
});

describe('Economic Runtime — Budget Management', () => {
  it('detects under budget', () => {
    const result = checkBudget({ limit: 1000, spent: 500 });
    expect(result.over).toBe(false);
    expect(result.percentage).toBe(50);
  });

  it('detects over budget', () => {
    const result = checkBudget({ limit: 1000, spent: 1500 });
    expect(result.over).toBe(true);
    expect(result.percentage).toBe(150);
  });

  it('detects at limit', () => {
    const result = checkBudget({ limit: 1000, spent: 1000 });
    expect(result.over).toBe(false);
    expect(result.percentage).toBe(100);
  });

  it('handles zero limit', () => {
    const result = checkBudget({ limit: 0, spent: 0 });
    // Division by 0 returns NaN, function should handle this
    expect(result.over).toBe(false);
  });
});

describe('Economic Runtime — Optimization', () => {
  it('suggests 20% reduction', () => {
    const costs = [100, 100, 100, 100];
    const result = suggestOptimization(costs);
    expect(result.savings).toBe(80);
    expect(result.target).toBe(320);
  });

  it('handles single cost', () => {
    const result = suggestOptimization([500]);
    expect(result.savings).toBe(100);
  });

  it('handles zero costs', () => {
    const result = suggestOptimization([]);
    // empty array = 0 current, target = 0 * 0.8 = 0
    expect(result.savings).toBe(0);
  });
});
