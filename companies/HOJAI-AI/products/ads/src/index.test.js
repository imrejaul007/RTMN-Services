/**
 * Unit tests for AdOS (Pixel + CAPI)
 */
import { describe, it, expect } from 'vitest';

function normalizeEvent(event) {
  return {
    eventName: event.event?.toLowerCase().replace(/\s+/g, '_'),
    eventId: event.event_id || event.id || `evt_${Date.now()}`,
    value: event.value || event.revenue || 0,
    currency: event.currency || 'INR'
  };
}

function mapToMetaEvent(event) {
  const mapping = {
    page_view: 'PageView',
    view_content: 'ViewContent',
    add_to_cart: 'AddToCart',
    initiate_checkout: 'InitiateCheckout',
    purchase: 'Purchase',
    lead: 'Lead'
  };
  return mapping[event.eventName] || 'CustomEvent';
}

function calculateROAS(spend, revenue) {
  if (!spend) return 0;
  return Math.round((revenue / spend) * 100) / 100;
}

describe('AdOS', () => {
  it('should normalize Meta events', () => {
    const event = { event: 'Purchase Complete', revenue: 1000, id: '123' };
    const normalized = normalizeEvent(event);
    expect(normalized.eventName).toBe('purchase_complete');
    expect(normalized.value).toBe(1000);
  });

  it('should map to Meta event names', () => {
    expect(mapToMetaEvent({ eventName: 'add_to_cart' })).toBe('AddToCart');
    expect(mapToMetaEvent({ eventName: 'purchase' })).toBe('Purchase');
    expect(mapToMetaEvent({ eventName: 'unknown' })).toBe('CustomEvent');
  });

  it('should calculate ROAS', () => {
    expect(calculateROAS(10000, 40000)).toBe(4);
    expect(calculateROAS(0, 1000)).toBe(0);
    expect(calculateROAS(10000, 0)).toBe(0);
  });

  it('should handle missing revenue', () => {
    const event = { event: 'page_view' };
    const normalized = normalizeEvent(event);
    expect(normalized.value).toBe(0);
    expect(normalized.currency).toBe('INR');
  });
});
