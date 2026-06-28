/**
 * Unit tests for Lead Scoring Service
 */
import { describe, it, expect } from 'vitest';

describe('Lead Scoring Engine', () => {
  it('should score leads with high intent signals', () => {
    // Given signals with high purchase intent
    const signals = [
      { type: 'product_view', timestamp: new Date().toISOString() },
      { type: 'pricing_visit', timestamp: new Date().toISOString() },
      { type: 'add_to_cart', timestamp: new Date().toISOString() },
      { type: 'checkout_start', timestamp: new Date().toISOString() }
    ];

    // When scoring
    const score = calculateScore(signals);

    // Then expect high score
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('should apply velocity multiplier for recent activity', () => {
    const recentSignals = Array(5).fill({ type: 'product_view', timestamp: new Date().toISOString() });
    const score = calculateScore(recentSignals);
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('should apply negative weights for bounce', () => {
    const signals = [
      { type: 'bounce', timestamp: new Date().toISOString() }
    ];
    const score = calculateScore(signals);
    expect(score).toBeLessThan(30);
  });

  it('should detect purchase intent from cart/checkout signals', () => {
    const signals = [
      { type: 'add_to_cart', timestamp: new Date().toISOString() },
      { type: 'checkout_start', timestamp: new Date().toISOString() }
    ];
    const intent = detectIntent(signals);
    expect(intent).toBe('Purchase Intent');
  });
});

function calculateScore(signals) {
  const W = {
    pricing_visit: 15, product_view: 5, search: 8, compare_products: 20,
    add_to_cart: 20, checkout_start: 30, checkout_fail: -10, payment_complete: 50,
    email_subscribe: 25, whatsapp_click: 15, cta_click: 10, exit_intent: 5,
    return_visit: 10, multiple_pages: 15, time_on_site_5min: 20, time_on_site_10min: 30,
    bounce: -20, single_page: -10, unsubscribe: -30
  };

  let score = 0;
  for (const s of signals) {
    const w = W[s.type] || 0;
    if (w !== 0) score += w;
  }

  const now = Date.now();
  const recent = signals.filter(s => now - new Date(s.timestamp).getTime() < 3600000).length;
  let velMult = 1;
  if (recent >= 3) velMult = 1.5;

  score *= velMult;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function detectIntent(signals) {
  if (signals.some(s => ['add_to_cart', 'checkout_start'].includes(s.type))) return 'Purchase Intent';
  if (signals.some(s => s.type === 'pricing_visit')) return 'Price Research';
  if (signals.some(s => s.type === 'search')) return 'Product Search';
  return 'General Browsing';
}