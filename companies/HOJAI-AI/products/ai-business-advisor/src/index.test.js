/**
 * Unit tests for AI Business Advisor
 */
import { describe, it, expect } from 'vitest';

function classifyQuestion(q) {
  const s = q.toLowerCase();
  if (s.includes('revenue') || s.includes('sales') || s.includes('income')) return 'revenue';
  if (s.includes('customer') || s.includes('churn') || s.includes('ltv')) return 'customer';
  if (s.includes('cart') || s.includes('conversion') || s.includes('abandon')) return 'conversion';
  if (s.includes('marketing') || s.includes('campaign')) return 'marketing';
  return 'general';
}

function estimateImpact(area, data) {
  const multipliers = {
    conversion: 50000,
    customer: 30000,
    marketing: 25000,
    revenue: 40000,
    general: 10000
  };
  return multipliers[area] || 10000;
}

function prioritize(recommendations) {
  return recommendations.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (b.impact || 0) - (a.impact || 0);
  });
}

describe('AI Business Advisor', () => {
  it('should classify revenue questions', () => {
    expect(classifyQuestion('What is my revenue?')).toBe('revenue');
    expect(classifyQuestion('Sales performance this month')).toBe('revenue');
  });

  it('should classify customer questions', () => {
    expect(classifyQuestion('How many customers?')).toBe('customer');
    expect(classifyQuestion('Churn rate analysis')).toBe('customer');
  });

  it('should classify conversion questions', () => {
    expect(classifyQuestion('Cart abandonment rate?')).toBe('conversion');
    expect(classifyQuestion('Conversion optimization')).toBe('conversion');
  });

  it('should estimate impact by area', () => {
    expect(estimateImpact('conversion', {})).toBe(50000);
    expect(estimateImpact('customer', {})).toBe(30000);
  });

  it('should prioritize recommendations', () => {
    const recs = [
      { action: 'A', priority: 3, impact: 50000 },
      { action: 'B', priority: 1, impact: 30000 },
      { action: 'C', priority: 1, impact: 40000 }
    ];
    const prioritized = prioritize(recs);
    expect(prioritized[0].action).toBe('C'); // priority 1, higher impact
    expect(prioritized[1].action).toBe('B'); // priority 1, lower impact
    expect(prioritized[2].action).toBe('A'); // priority 3
  });
});
