import { describe, it, expect } from 'vitest';

describe('Agent Marketplace — Categories', () => {
  const DEFAULT_CATEGORIES = [
    { id: 'restaurant', name: 'Restaurants' },
    { id: 'hotel', name: 'Hotels & Stays' },
    { id: 'retail', name: 'Retail & Shopping' },
    { id: 'healthcare', name: 'Healthcare' },
    { id: 'travel', name: 'Travel' },
    { id: 'fashion', name: 'Fashion', parent: 'retail' },
    { id: 'beauty', name: 'Beauty & Spa' },
    { id: 'fitness', name: 'Fitness' },
    { id: 'education', name: 'Education' },
    { id: 'automotive', name: 'Automotive' },
    { id: 'home-services', name: 'Home Services' },
    { id: 'professional', name: 'Professional Services' },
    { id: 'legal', name: 'Legal', parent: 'professional' },
    { id: 'financial', name: 'Financial', parent: 'professional' },
  ];

  it('should have 14 categories', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(14);
  });

  it('should have parent categories', () => {
    const parents = DEFAULT_CATEGORIES.filter(c => !c.parent);
    expect(parents).toHaveLength(10);
  });

  it('should have subcategories', () => {
    const subcategories = DEFAULT_CATEGORIES.filter(c => c.parent);
    expect(subcategories).toHaveLength(4);
    expect(subcategories.find(c => c.id === 'fashion')?.parent).toBe('retail');
    expect(subcategories.find(c => c.id === 'legal')?.parent).toBe('professional');
  });
});

describe('Agent Marketplace — Listings', () => {
  const listings = new Map();
  const categories = new Map([
    ['restaurant', { id: 'restaurant', name: 'Restaurants', agentCount: 0 }],
    ['hotel', { id: 'hotel', name: 'Hotels', agentCount: 0 }],
    ['retail', { id: 'retail', name: 'Retail', agentCount: 0 }],
  ]);

  function createListing(data: { name: string; category: string; agentId?: string; businessId?: string; verified?: boolean; featured?: boolean; premium?: boolean; status?: string; priceRange?: string; location?: { city?: string; country?: string }; tags?: string[]; specialties?: string[] }) {
    const listing = {
      id: `LST-${Date.now()}`,
      agentId: data.agentId || `agent-${Date.now()}`,
      businessId: data.businessId,
      name: data.name,
      category: data.category,
      status: data.status || 'active',
      verified: data.verified || false,
      featured: data.featured || false,
      premium: data.premium || false,
      priceRange: data.priceRange || '$$',
      location: data.location || { city: '', country: '' },
      tags: data.tags || [],
      specialties: data.specialties || [],
      views: 0,
      inquiries: 0,
      bookings: 0,
      createdAt: new Date().toISOString(),
    };
    listings.set(listing.id, listing);
    if (categories.has(listing.category)) {
      const cat = categories.get(listing.category)!;
      cat.agentCount++;
      categories.set(listing.category, cat);
    }
    return listing;
  }

  it('should create listing with defaults', () => {
    const listing = createListing({ name: 'Test Restaurant', category: 'restaurant' });
    expect(listing.status).toBe('active');
    expect(listing.verified).toBe(false);
    expect(listing.featured).toBe(false);
  });

  it('should create listing with custom flags', () => {
    const listing = createListing({
      name: 'Premium Restaurant',
      category: 'restaurant',
      verified: true,
      featured: true,
      premium: true,
    });
    expect(listing.verified).toBe(true);
    expect(listing.featured).toBe(true);
    expect(listing.premium).toBe(true);
  });

  it('should increment category agent count', () => {
    const before = categories.get('restaurant')!.agentCount;
    createListing({ name: 'R1', category: 'restaurant' });
    createListing({ name: 'R2', category: 'restaurant' });
    expect(categories.get('restaurant')!.agentCount).toBe(before + 2);
  });

  it('should track views', () => {
    const listing = createListing({ name: 'Popular Place', category: 'restaurant' });
    listing.views++;
    listing.views++;
    expect(listing.views).toBe(2);
  });

  it('should track inquiries', () => {
    const listing = createListing({ name: 'Popular Place', category: 'restaurant' });
    listing.inquiries++;
    expect(listing.inquiries).toBe(1);
  });
});

describe('Agent Marketplace — Search', () => {
  const listings = [
    { id: 'l1', name: 'Pizza Palace', category: 'restaurant', city: 'NYC', country: 'USA', verified: true, premium: false, featured: true, priceRange: '$$', status: 'active', views: 100, tags: ['pizza', 'italian'] },
    { id: 'l2', name: 'Burger Joint', category: 'restaurant', city: 'LA', country: 'USA', verified: true, premium: false, featured: false, priceRange: '$', status: 'active', views: 50, tags: ['burger', 'fast-food'] },
    { id: 'l3', name: 'Hotel Grand', category: 'hotel', city: 'NYC', country: 'USA', verified: false, premium: true, featured: true, priceRange: '$$$', status: 'active', views: 200, tags: ['luxury', '5-star'] },
    { id: 'l4', name: 'Budget Inn', category: 'hotel', city: 'NYC', country: 'USA', verified: true, premium: false, featured: false, priceRange: '$', status: 'active', views: 30, tags: ['budget', 'budget'] },
  ];

  function searchListings(criteria: { category?: string; city?: string; country?: string; verified?: boolean; premium?: boolean; featured?: boolean; priceRange?: string; query?: string; sortBy?: string; limit?: number }) {
    let results = listings.filter(l => l.status === 'active');
    if (criteria.category) results = results.filter(l => l.category === criteria.category);
    if (criteria.city) results = results.filter(l => l.location?.city === criteria.city || l.city === criteria.city);
    if (criteria.country) results = results.filter(l => l.country === criteria.country);
    if (criteria.verified) results = results.filter(l => l.verified);
    if (criteria.premium) results = results.filter(l => l.premium);
    if (criteria.featured) results = results.filter(l => l.featured);
    if (criteria.priceRange) results = results.filter(l => l.priceRange === criteria.priceRange);
    if (criteria.query) {
      const q = criteria.query.toLowerCase();
      results = results.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    if (criteria.sortBy === 'featured') {
      results.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    } else if (criteria.sortBy === 'popular') {
      results.sort((a, b) => b.views - a.views);
    }
    if (criteria.limit) results = results.slice(0, criteria.limit);
    return results;
  }

  it('should filter by category', () => {
    const results = searchListings({ category: 'restaurant' });
    expect(results).toHaveLength(2);
  });

  it('should filter by city', () => {
    const results = searchListings({ city: 'NYC' });
    expect(results).toHaveLength(3);
  });

  it('should filter by verified', () => {
    const results = searchListings({ verified: true });
    expect(results).toHaveLength(3);
  });

  it('should filter by featured', () => {
    const results = searchListings({ featured: true });
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id)).toContain('l1');
    expect(results.map(r => r.id)).toContain('l3');
  });

  it('should filter by query', () => {
    const results = searchListings({ query: 'pizza' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('l1');
  });

  it('should filter by query in tags', () => {
    const results = searchListings({ query: 'budget' });
    expect(results).toHaveLength(2); // Budget Inn (hotel) + Burger Joint (tags)
  });

  it('should sort by featured', () => {
    const results = searchListings({ sortBy: 'featured' });
    expect(results[0].featured).toBe(true);
  });

  it('should sort by popular', () => {
    const results = searchListings({ sortBy: 'popular' });
    expect(results[0].id).toBe('l3'); // 200 views
  });

  it('should limit results', () => {
    const results = searchListings({ limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('should combine filters', () => {
    const results = searchListings({ category: 'hotel', city: 'NYC', verified: true });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('l4');
  });
});

describe('Agent Marketplace — Reviews', () => {
  const reviews = new Map();

  function createReview(agentId: string, data: { rating: number; title?: string; comment?: string }) {
    const review = {
      id: `RVW-${Date.now()}`,
      agentId,
      rating: data.rating,
      title: data.title,
      comment: data.comment,
      verified: false,
      helpful: 0,
      createdAt: new Date().toISOString(),
    };
    const agentReviews = reviews.get(agentId) || [];
    agentReviews.push(review);
    reviews.set(agentId, agentReviews);
    return review;
  }

  function getAverageRating(agentId: string) {
    const agentReviews = reviews.get(agentId) || [];
    if (agentReviews.length === 0) return { average: 0, total: 0 };
    const total = agentReviews.reduce((sum, r) => sum + r.rating, 0);
    return {
      average: (total / agentReviews.length).toFixed(2),
      total: agentReviews.length,
    };
  }

  it('should create review', () => {
    const review = createReview('agent-1', { rating: 5, title: 'Great!', comment: 'Fast delivery' });
    expect(review.rating).toBe(5);
    expect(review.agentId).toBe('agent-1');
  });

  it('should calculate average rating', () => {
    createReview('agent-2', { rating: 5 });
    createReview('agent-2', { rating: 4 });
    createReview('agent-2', { rating: 3 });
    const { average, total } = getAverageRating('agent-2');
    expect(total).toBe(3);
    expect(parseFloat(average)).toBe(4);
  });

  it('should return 0 for agent with no reviews', () => {
    const { average, total } = getAverageRating('nonexistent');
    expect(total).toBe(0);
    expect(parseFloat(average)).toBe(0);
  });
});