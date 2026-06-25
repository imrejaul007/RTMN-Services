/**
 * BAM Marketplace API Client
 */

import {
  Listing,
  Review,
  Category,
  CategoryWithCount,
  SearchFilters,
  SearchResult,
  CheckoutSession,
  PaymentIntent,
  PublisherRevenue,
  Stats,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4255';
const TENANT_ID = process.env.NEXT_PUBLIC_TENANT_ID || 'bam-platform';

// ============================================================================
// Listings API
// ============================================================================

export async function getListings(filters: SearchFilters = {}): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.category) params.set('category', filters.category);
  if (filters.tag) params.set('tag', filters.tag);
  if (filters.pricingModel) params.set('pricingModel', filters.pricingModel);
  if (filters.minRating) params.set('minRating', String(filters.minRating));
  if (filters.publisherName) params.set('publisherName', filters.publisherName);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.offset) params.set('offset', String(filters.offset));

  const res = await fetch(`${API_BASE}/api/listings?${params}`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch listings');
  return res.json();
}

export async function getListing(id: string): Promise<Listing> {
  const res = await fetch(`${API_BASE}/api/listings/${id}`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch listing');
  return res.json();
}

export async function getListingReviews(id: string, limit = 10, offset = 0) {
  const res = await fetch(`${API_BASE}/api/listings/${id}/reviews?limit=${limit}&offset=${offset}`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch reviews');
  return res.json();
}

export async function recordView(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/listings/${id}/view`, {
    method: 'POST',
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
}

export async function recordInstall(id: string): Promise<void> {
  await fetch(`${API_BASE}/api/listings/${id}/install`, {
    method: 'POST',
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
}

// ============================================================================
// Categories API
// ============================================================================

export async function getCategories(featuredOnly = false): Promise<{ count: number; categories: CategoryWithCount[] }> {
  const url = featuredOnly
    ? `${API_BASE}/api/categories?featured=true`
    : `${API_BASE}/api/categories`;
  const res = await fetch(url, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch categories');
  return res.json();
}

export async function getCategory(id: string): Promise<Category> {
  const res = await fetch(`${API_BASE}/api/categories/${id}`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch category');
  return res.json();
}

// ============================================================================
// Payments API
// ============================================================================

export async function createCheckoutSession(
  listingId: string,
  customerEmail?: string,
  successUrl?: string,
  cancelUrl?: string
): Promise<CheckoutSession> {
  const res = await fetch(`${API_BASE}/api/payments/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
    },
    body: JSON.stringify({
      listingId,
      customerEmail,
      successUrl,
      cancelUrl,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create checkout session');
  }
  return res.json();
}

export async function getCheckoutSession(sessionId: string) {
  const res = await fetch(`${API_BASE}/api/payments/session/${sessionId}`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch session');
  return res.json();
}

export async function createPaymentIntent(listingId: string, paymentMethodId: string) {
  const res = await fetch(`${API_BASE}/api/payments/intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
    },
    body: JSON.stringify({ listingId, paymentMethodId }),
  });
  if (!res.ok) throw new Error('Failed to create payment intent');
  return res.json();
}

export async function getPublisherRevenue(): Promise<PublisherRevenue> {
  const res = await fetch(`${API_BASE}/api/payments/revenue`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch revenue');
  return res.json();
}

export async function createCustomerPortal(customerId: string, returnUrl: string) {
  const res = await fetch(`${API_BASE}/api/payments/portal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
    },
    body: JSON.stringify({ customerId, returnUrl }),
  });
  if (!res.ok) throw new Error('Failed to create portal session');
  return res.json();
}

// ============================================================================
// Reviews API
// ============================================================================

export async function submitReview(
  listingId: string,
  rating: number,
  body?: string,
  title?: string,
  dimensions?: { easeOfUse?: number; documentation?: number; support?: number; valueForMoney?: number }
) {
  const res = await fetch(`${API_BASE}/api/listings/${listingId}/reviews`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': TENANT_ID,
    },
    body: JSON.stringify({ rating, body, title, dimensions }),
  });
  if (!res.ok) throw new Error('Failed to submit review');
  return res.json();
}

// ============================================================================
// Stats API
// ============================================================================

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/api/stats`, {
    headers: { 'X-Tenant-Id': TENANT_ID },
  });
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}

// ============================================================================
// Health Check
// ============================================================================

export async function healthCheck() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Service unavailable');
  return res.json();
}
