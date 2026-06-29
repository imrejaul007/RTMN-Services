/**
 * Recommendation Engine - Tests
 */

import { describe, it, expect } from 'vitest';

function getNextBestAction(context) {
  if (context === 'checkout') {
    return { action: 'offer_membership', confidence: 0.85 };
  }
  if (context === 'cart') {
    return { action: 'cart_reminder', confidence: 0.8 };
  }
  return { action: 'personalized_offer', confidence: 0.75 };
}

describe('Recommendation Engine', () => {
  it('should recommend membership at checkout', () => {
    const result = getNextBestAction('checkout');
    expect(result.action).toBe('offer_membership');
    expect(result.confidence).toBe(0.85);
  });

  it('should recommend cart reminder for cart context', () => {
    const result = getNextBestAction('cart');
    expect(result.action).toBe('cart_reminder');
  });

  it('should default to personalized offer', () => {
    const result = getNextBestAction('unknown');
    expect(result.action).toBe('personalized_offer');
  });
});
