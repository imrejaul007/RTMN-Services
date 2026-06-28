/**
 * Unit tests for Vertical Templates
 */
import { describe, it, expect } from 'vitest';

function getTemplate(industry, pageType) {
  const templates = {
    retail: {
      home: { sections: ['hero', 'featured', 'categories', 'deals'] },
      product: { sections: ['gallery', 'details', 'reviews', 'related'] },
      cart: { sections: ['items', 'summary', 'coupon', 'checkout'] }
    },
    restaurant: {
      home: { sections: ['hero', 'menu', 'reviews', 'location'] },
      product: { sections: ['gallery', 'menu-item', 'nutrition'] }
    },
    hotel: {
      home: { sections: ['hero', 'rooms', 'amenities', 'reviews'] },
      product: { sections: ['gallery', 'room-details', 'amenities', 'booking'] }
    }
  };
  return templates[industry]?.[pageType] || templates.retail.home;
}

function renderTemplate(template, data) {
  return {
    template: template.sections,
    data: { ...data, rendered: true }
  };
}

describe('Vertical Templates', () => {
  it('should get retail template', () => {
    const t = getTemplate('retail', 'home');
    expect(t.sections).toContain('hero');
    expect(t.sections).toContain('deals');
  });

  it('should get restaurant template', () => {
    const t = getTemplate('restaurant', 'home');
    expect(t.sections).toContain('menu');
    expect(t.sections).toContain('reviews');
  });

  it('should get hotel template', () => {
    const t = getTemplate('hotel', 'product');
    expect(t.sections).toContain('gallery');
    expect(t.sections).toContain('booking');
  });

  it('should default to retail for unknown industry', () => {
    const t = getTemplate('unknown', 'home');
    expect(t.sections).toContain('hero');
  });

  it('should render template with data', () => {
    const t = getTemplate('retail', 'product');
    const rendered = renderTemplate(t, { productId: '123' });
    expect(rendered.template).toEqual(t.sections);
    expect(rendered.data.productId).toBe('123');
    expect(rendered.data.rendered).toBe(true);
  });
});
