/**
 * Unit tests for Event Taxonomy Service
 */
import { describe, it, expect } from 'vitest';

describe('Event Taxonomy', () => {
  const TAXONOMY = {
    website: {
      page_view: { name: 'Page View' },
      product_view: { name: 'Product View' },
      add_to_cart: { name: 'Add to Cart' },
      checkout_start: { name: 'Checkout Started' },
      payment_complete: { name: 'Payment Complete' }
    },
    commerce: {
      cart_abandon: { name: 'Cart Abandoned' },
      purchase_complete: { name: 'Purchase Complete' },
      refund_complete: { name: 'Refund Complete' }
    }
  };

  it('should validate known events', () => {
    expect(validateEvent('page_view', TAXONOMY)).toBe(true);
    expect(validateEvent('product_view', TAXONOMY)).toBe(true);
    expect(validateEvent('add_to_cart', TAXONOMY)).toBe(true);
  });

  it('should reject unknown events', () => {
    expect(validateEvent('unknown_event', TAXONOMY)).toBe(false);
    expect(validateEvent('invalid', TAXONOMY)).toBe(false);
  });

  it('should categorize events correctly', () => {
    expect(getEventCategory('page_view', TAXONOMY)).toBe('website');
    expect(getEventCategory('purchase_complete', TAXONOMY)).toBe('commerce');
    expect(getEventCategory('add_to_cart', TAXONOMY)).toBe('website');
  });

  it('should count events by category', () => {
    const events = ['page_view', 'product_view', 'add_to_cart', 'purchase_complete', 'page_view'];
    const counts = countByCategory(events, TAXONOMY);
    expect(counts.website).toBe(4);
    expect(counts.commerce).toBe(1);
  });

  it('should suggest similar events for typos', () => {
    const suggestion = suggestEvent('product_veiw', TAXONOMY);
    expect(suggestion).toBe('product_view');
  });
});

function validateEvent(event, taxonomy) {
  for (const cat of Object.values(taxonomy)) {
    if (cat[event]) return true;
  }
  return false;
}

function getEventCategory(event, taxonomy) {
  for (const [catName, cat] of Object.entries(taxonomy)) {
    if (cat[event]) return catName;
  }
  return null;
}

function countByCategory(events, taxonomy) {
  const counts = {};
  for (const event of events) {
    const cat = getEventCategory(event, taxonomy);
    if (cat) {
      counts[cat] = (counts[cat] || 0) + 1;
    }
  }
  return counts;
}

function suggestEvent(event, taxonomy) {
  for (const cat of Object.values(taxonomy)) {
    for (const [id] of Object.entries(cat)) {
      if (id.includes(event) || event.includes(id)) return id;
    }
  }
  return null;
}