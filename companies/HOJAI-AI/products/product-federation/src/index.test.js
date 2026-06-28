/**
 * Unit tests for Product Federation
 */
import { describe, it, expect } from 'vitest';

function transformProduct(product, companyId) {
  return {
    id: product.id,
    companyId,
    name: product.name || product.title,
    category: product.category || 'general',
    price: { amount: parseFloat(product.price || 0), currency: product.currency || 'INR' },
    availability: { available: product.in_stock !== false, quantity: product.stock_quantity || 0 }
  };
}

function calculateSyncProgress(synced, total) {
  if (!total) return 0;
  return Math.round((synced / total) * 100);
}

function shouldSyncProduct(product, lastSync, settings) {
  if (!product.updatedAt) return true;
  const updated = new Date(product.updatedAt);
  const last = new Date(lastSync);
  return updated > last;
}

describe('Product Federation', () => {
  it('should transform product to Nexus format', () => {
    const product = {
      id: 'prod_123',
      name: 'Test Product',
      price: 999,
      in_stock: true
    };
    const transformed = transformProduct(product, 'company_abc');
    expect(transformed.id).toBe('prod_123');
    expect(transformed.companyId).toBe('company_abc');
    expect(transformed.price.amount).toBe(999);
    expect(transformed.availability.available).toBe(true);
  });

  it('should handle missing price', () => {
    const product = { id: '123', name: 'No Price' };
    const transformed = transformProduct(product, 'co');
    expect(transformed.price.amount).toBe(0);
  });

  it('should calculate sync progress', () => {
    expect(calculateSyncProgress(50, 100)).toBe(50);
    expect(calculateSyncProgress(0, 100)).toBe(0);
    expect(calculateSyncProgress(100, 100)).toBe(100);
  });

  it('should determine if product needs sync', () => {
    const product = { id: '1', updatedAt: new Date(Date.now() - 3600000).toISOString() };
    const lastSync = new Date(Date.now() - 7200000).toISOString();
    expect(shouldSyncProduct(product, lastSync, {})).toBe(true);
  });
});
