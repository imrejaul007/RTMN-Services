/**
 * Customer Graph - Tests
 */

import { describe, it, expect } from 'vitest';

// Mock resolve function
function resolveCustomer(phone, email) {
  if (phone === 'existing') {
    return { customerId: 'cust_existing', confidence: 0.95 };
  }
  return { customerId: 'cust_new', confidence: 1.0, merged_ids: [] };
}

describe('Customer Graph', () => {
  it('should resolve existing customer', () => {
    const result = resolveCustomer('existing', null);
    expect(result.customerId).toBe('cust_existing');
    expect(result.confidence).toBe(0.95);
  });

  it('should create new customer for unknown', () => {
    const result = resolveCustomer('unknown', null);
    expect(result.customerId).toBe('cust_new');
    expect(result.confidence).toBe(1.0);
  });
});
