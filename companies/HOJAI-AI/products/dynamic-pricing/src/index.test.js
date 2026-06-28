/**
 * Unit tests for Dynamic Pricing Service
 */
import { describe, it, expect } from 'vitest';

describe('Dynamic Pricing', () => {
  it('should increase price for high demand', () => {
    const price = 1000;
    const recommended = calculatePrice(price, 'high', null);
    expect(recommended).toBe(1150); // 15% increase
  });

  it('should decrease price for low demand', () => {
    const price = 1000;
    const recommended = calculatePrice(price, 'low', null);
    expect(recommended).toBe(850); // 15% decrease
  });

  it('should match competitor price when lower', () => {
    const price = 1000;
    const recommended = calculatePrice(price, 'medium', 800);
    expect(recommended).toBeLessThan(1000);
  });

  it('should increase price when competitor is higher', () => {
    const price = 1000;
    const recommended = calculatePrice(price, 'medium', 1200);
    expect(recommended).toBeGreaterThan(1000);
  });

  it('should calculate savings correctly', () => {
    const price = 1000;
    const recommended = calculatePrice(price, 'low', null);
    const savings = price - recommended;
    expect(savings).toBe(150);
  });
});

function calculatePrice(basePrice, demand, competitorPrice) {
  let multiplier = 1.0;
  if (demand === 'high') multiplier = 1.15;
  else if (demand === 'low') multiplier = 0.85;

  if (competitorPrice) {
    const comp = parseFloat(competitorPrice);
    if (comp < basePrice * 0.9) multiplier *= 0.95;
    else if (comp > basePrice * 1.1) multiplier *= 1.05;
  }

  return Math.round(basePrice * multiplier);
}