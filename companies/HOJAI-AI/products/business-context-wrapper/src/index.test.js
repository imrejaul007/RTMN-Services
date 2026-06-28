/**
 * Unit tests for Business Context Wrapper
 */
import { describe, it, expect } from 'vitest';

// Core logic
function classifyQuery(q) {
  const s = q.toLowerCase();
  if (s.includes('revenue') || s.includes('sales') || s.includes('income')) return 'revenue';
  if (s.includes('customer') || s.includes('churn') || s.includes('ltv')) return 'customer';
  if (s.includes('cart') || s.includes('conversion') || s.includes('abandon')) return 'conversion';
  if (s.includes('marketing') || s.includes('campaign')) return 'marketing';
  return 'general';
}

function extractContext(data) {
  return {
    revenue: data.revenue || {},
    customers: data.customers || {},
    marketing: data.marketing || {}
  };
}

describe('Business Context Wrapper', () => {
  it('should classify revenue queries', () => {
    expect(classifyQuery('What is my revenue?')).toBe('revenue');
    expect(classifyQuery('How are sales this month?')).toBe('revenue');
    expect(classifyQuery('Show me income')).toBe('revenue');
  });

  it('should classify customer queries', () => {
    expect(classifyQuery('How many customers do I have?')).toBe('customer');
    expect(classifyQuery('What is churn rate?')).toBe('customer');
    expect(classifyQuery('Customer LTV analysis')).toBe('customer');
  });

  it('should classify conversion queries', () => {
    expect(classifyQuery('What is cart abandonment?')).toBe('conversion');
    expect(classifyQuery('Show conversion rate')).toBe('conversion');
  });

  it('should classify marketing queries', () => {
    expect(classifyQuery('How are my campaigns performing?')).toBe('marketing');
    expect(classifyQuery('Marketing ROI analysis')).toBe('marketing');
  });

  it('should default to general for unknown queries', () => {
    expect(classifyQuery('Hello there')).toBe('general');
  });

  it('should extract context correctly', () => {
    const data = { revenue: { total: 100000 }, customers: { count: 500 } };
    const ctx = extractContext(data);
    expect(ctx.revenue.total).toBe(100000);
    expect(ctx.customers.count).toBe(500);
  });
});
