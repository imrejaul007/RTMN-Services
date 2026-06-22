/**
 * Supplier Service — Phase C.1
 *
 * Capability matching + ranking for supplier discovery.
 * The algorithm: score each supplier 0..100 across 6 dimensions
 * (category match, item match, location distance, rating, trust, price)
 * and return a sorted, weighted result.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Supplier,
  SupplierSearchQuery,
  SupplierMatch,
  SupplierSearchResult,
  CapabilityCategory,
} from '../types/index.js';

const STORE = new Map<string, Supplier>();

// ─────────────────────────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────────────────────────

/** Haversine distance between two coords in km. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

/**
 * Approximate lat/lng from a city/pincode (very rough — for demo only).
 * Returns null if we don't know the city.
 */
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  pune: { lat: 18.5204, lng: 73.8567 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  gurugram: { lat: 28.4595, lng: 77.0266 },
  noida: { lat: 28.5355, lng: 77.391 },
};

export function geocode(location: string): { lat: number; lng: number } | null {
  if (!location) return null;
  const key = location.trim().toLowerCase();
  if (CITY_COORDS[key]) return CITY_COORDS[key];
  // Try to extract a city from "City, State" format
  const first = key.split(',')[0].trim();
  if (CITY_COORDS[first]) return CITY_COORDS[first];
  return null;
}

// ─────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────

export function registerSupplier(
  input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>,
): Supplier {
  const now = new Date().toISOString();
  const s: Supplier = {
    id: `sup-${uuidv4()}`,
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  STORE.set(s.id, s);
  return s;
}

export function getSupplier(id: string): Supplier | null {
  return STORE.get(id) || null;
}

export function listSuppliers(query: Partial<SupplierSearchQuery> = {}): Supplier[] {
  let list = Array.from(STORE.values());
  if (query.category) {
    list = list.filter(s => s.categories.includes(query.category!));
  }
  if (query.location) {
    const lc = query.location.toLowerCase();
    list = list.filter(
      s =>
        s.location.city.toLowerCase() === lc ||
        s.location.state.toLowerCase() === lc ||
        s.location.pincode === query.location,
    );
  }
  return list;
}

export function updateSupplier(id: string, updates: Partial<Supplier>): Supplier | null {
  const s = STORE.get(id);
  if (!s) return null;
  const updated = { ...s, ...updates, id: s.id, updatedAt: new Date().toISOString() };
  STORE.set(id, updated);
  return updated;
}

export function deleteSupplier(id: string): boolean {
  return STORE.delete(id);
}

// ─────────────────────────────────────────────────────────────
// Matching & ranking
// ─────────────────────────────────────────────────────────────

/** Score one supplier against the query (0..100 each dimension). */
export function scoreSupplier(
  supplier: Supplier,
  query: SupplierSearchQuery,
  queryCoords: { lat: number; lng: number } | null,
): SupplierMatch {
  const breakdown = {
    category: 0,
    item: 0,
    location: 0,
    rating: 0,
    trust: 0,
    price: 0,
  };
  let distanceKm: number | undefined;

  // Category match (25 points)
  if (query.category) {
    breakdown.category = supplier.categories.includes(query.category) ? 100 : 0;
  } else {
    breakdown.category = 50; // neutral
  }

  // Item match (20 points)
  if (query.item) {
    const needle = query.item.toLowerCase();
    const hit = supplier.capabilities.some(c =>
      c.items.some(i => i.toLowerCase().includes(needle) || needle.includes(i.toLowerCase())),
    );
    breakdown.item = hit ? 100 : 0;
  } else {
    breakdown.item = 50;
  }

  // Location (15 points)
  if (queryCoords) {
    const supCoords = supplier.location.lat != null && supplier.location.lng != null
      ? { lat: supplier.location.lat, lng: supplier.location.lng }
      : geocode(supplier.location.city);
    if (supCoords) {
      distanceKm = haversineKm(supCoords, queryCoords);
      const maxKm = query.maxDistanceKm ?? 50;
      // Linear: 0km = 100pts, maxKm = 0pts
      breakdown.location = Math.max(0, 100 - (distanceKm / maxKm) * 100);
    } else {
      breakdown.location = 50; // unknown
    }
  } else {
    breakdown.location = 50;
  }

  // Rating (15 points) — convert 0..5 to 0..100
  breakdown.rating = (supplier.rating.overall / 5) * 100;

  // Trust (15 points) — 0..100 → 0..100
  breakdown.trust = supplier.trustScore ?? 50; // default neutral

  // Price (10 points) — cheaper is better
  if (query.maxPricePerUnit != null && supplier.pricing?.avgPricePerUnit != null) {
    const ratio = supplier.pricing.avgPricePerUnit / query.maxPricePerUnit;
    breakdown.price = Math.max(0, 100 - ratio * 100);
  } else {
    breakdown.price = 50;
  }

  // Apply filters (eliminate if below thresholds)
  if (query.minRating != null && supplier.rating.overall < query.minRating) {
    return { supplier, matchScore: 0, scoreBreakdown: breakdown, distanceKm };
  }
  if (query.minTrustScore != null && (supplier.trustScore ?? 0) < query.minTrustScore) {
    return { supplier, matchScore: 0, scoreBreakdown: breakdown, distanceKm };
  }
  if (query.maxDistanceKm != null && distanceKm != null && distanceKm > query.maxDistanceKm) {
    return { supplier, matchScore: 0, scoreBreakdown: breakdown, distanceKm };
  }
  if (query.maxPricePerUnit != null && supplier.pricing?.avgPricePerUnit != null) {
    if (supplier.pricing.avgPricePerUnit > query.maxPricePerUnit) {
      return { supplier, matchScore: 0, scoreBreakdown: breakdown, distanceKm };
    }
  }

  // Weighted total
  const weights = { category: 0.25, item: 0.20, location: 0.15, rating: 0.15, trust: 0.15, price: 0.10 };
  const matchScore = Math.round(
    breakdown.category * weights.category +
      breakdown.item * weights.item +
      breakdown.location * weights.location +
      breakdown.rating * weights.rating +
      breakdown.trust * weights.trust +
      breakdown.price * weights.price,
  );

  return { supplier, matchScore, scoreBreakdown: breakdown, distanceKm };
}

/** Run a full search and return ranked matches. */
export function searchSuppliers(query: SupplierSearchQuery): SupplierSearchResult {
  const candidates = listSuppliers(query);
  const queryCoords = query.location ? geocode(query.location) : null;
  const matches = candidates
    .map(s => scoreSupplier(s, query, queryCoords))
    .filter(m => m.matchScore > 0)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      // Tiebreak
      switch (query.sortBy) {
        case 'price':
          return (a.supplier.pricing?.avgPricePerUnit ?? Infinity) - (b.supplier.pricing?.avgPricePerUnit ?? Infinity);
        case 'distance':
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        case 'rating':
          return b.supplier.rating.overall - a.supplier.rating.overall;
        case 'trustScore':
          return (b.supplier.trustScore ?? 0) - (a.supplier.trustScore ?? 0);
        case 'orders':
          return (b.supplier.totalOrders ?? 0) - (a.supplier.totalOrders ?? 0);
        default:
          return b.matchScore - a.matchScore;
      }
    })
    .slice(0, query.limit ?? 20);

  return {
    query,
    total: matches.length,
    matches,
    generatedAt: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────
// Seed data — 8 demo suppliers covering major categories & cities
// ─────────────────────────────────────────────────────────────

export function seedDemoSuppliers(force = false): number {
  if (STORE.size > 0 && !force) return 0;
  if (force) STORE.clear();
  const seeds: Array<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      name: 'FreshKart Grocers',
      description: 'Fresh fruits, vegetables, dairy delivered same-day in Mumbai',
      status: 'active',
      tier: 'gold',
      corpId: 'sup-corp-freshkart',
      categories: ['groceries'],
      capabilities: [
        { category: 'groceries', items: ['rice', 'wheat', 'flour', 'oil', 'dal', 'sugar', 'salt', 'spices'], minOrderValue: 200, deliveryRadiusKm: 25 },
      ],
      location: { city: 'Mumbai', state: 'MH', country: 'IN', lat: 19.076, lng: 72.8777, pincode: '400001' },
      rating: { overall: 4.6, totalReviews: 2840, reliability: 92, quality: 95, deliverySpeed: 88 },
      pricing: { currency: 'INR', avgPricePerUnit: 65, unit: 'kg', bulkDiscountPct: 8 },
      contact: { phone: '+91-22-12345678', email: 'orders@freshkart.in', website: 'https://freshkart.in' },
      trustScore: 88,
      totalOrders: 12450,
      verifiedAt: '2026-01-15T00:00:00Z',
    },
    {
      name: 'MedExpress Pharmacy',
      description: 'Licensed pharmacy — OTC, prescription, medical devices',
      status: 'active',
      tier: 'platinum',
      corpId: 'sup-corp-medexpress',
      categories: ['medicine'],
      capabilities: [
        { category: 'medicine', items: ['paracetamol', 'insulin', 'bandages', 'thermometer', 'vitamins', 'supplements'], minOrderValue: 100, deliveryRadiusKm: 50 },
      ],
      location: { city: 'Delhi', state: 'DL', country: 'IN', lat: 28.7041, lng: 77.1025, pincode: '110001' },
      rating: { overall: 4.8, totalReviews: 5402, reliability: 97, quality: 98, deliverySpeed: 90 },
      pricing: { currency: 'INR', avgPricePerUnit: 250, unit: 'unit', bulkDiscountPct: 5 },
      contact: { phone: '+91-11-23456789', email: 'orders@medexpress.in', website: 'https://medexpress.in' },
      trustScore: 94,
      totalOrders: 28100,
      verifiedAt: '2025-12-10T00:00:00Z',
    },
    {
      name: 'TechBazaar Electronics',
      description: 'Phones, laptops, accessories — authorized reseller',
      status: 'active',
      tier: 'silver',
      corpId: 'sup-corp-techbazaar',
      categories: ['electronics'],
      capabilities: [
        { category: 'electronics', items: ['mobile phone', 'laptop', 'tablet', 'headphones', 'charger', 'smart watch'], minOrderValue: 1000, deliveryRadiusKm: 200 },
      ],
      location: { city: 'Bangalore', state: 'KA', country: 'IN', lat: 12.9716, lng: 77.5946, pincode: '560001' },
      rating: { overall: 4.2, totalReviews: 1920, reliability: 85, quality: 88, deliverySpeed: 78 },
      pricing: { currency: 'INR', avgPricePerUnit: 15000, unit: 'unit', bulkDiscountPct: 3 },
      contact: { phone: '+91-80-98765432', email: 'sales@techbazaar.in' },
      trustScore: 79,
      totalOrders: 8200,
      verifiedAt: '2026-02-20T00:00:00Z',
    },
    {
      name: 'Spice Route Restaurant Supply',
      description: 'Bulk restaurant supplies — grains, oils, spices, disposables',
      status: 'active',
      tier: 'gold',
      corpId: 'sup-corp-spiceroute',
      categories: ['restaurant_supply', 'groceries'],
      capabilities: [
        { category: 'restaurant_supply', items: ['basmati rice', 'cooking oil', 'ghee', 'spices', 'disposables', 'cleaning supplies'], minOrderValue: 5000, deliveryRadiusKm: 80 },
        { category: 'groceries', items: ['rice', 'oil', 'dal'], minOrderValue: 1000, deliveryRadiusKm: 80 },
      ],
      location: { city: 'Mumbai', state: 'MH', country: 'IN', lat: 19.1136, lng: 72.8697, pincode: '400070' },
      rating: { overall: 4.5, totalReviews: 870, reliability: 91, quality: 89, deliverySpeed: 82 },
      pricing: { currency: 'INR', avgPricePerUnit: 120, unit: 'kg', bulkDiscountPct: 12 },
      contact: { phone: '+91-22-55551234', email: 'orders@spiceroute.in' },
      trustScore: 86,
      totalOrders: 4800,
      verifiedAt: '2025-11-05T00:00:00Z',
    },
    {
      name: 'GreenLeaf Produce',
      description: 'Farm-fresh fruits & vegetables, direct from Maharashtra farms',
      status: 'active',
      tier: 'silver',
      corpId: 'sup-corp-greenleaf',
      categories: ['groceries'],
      capabilities: [
        { category: 'groceries', items: ['tomato', 'onion', 'potato', 'ginger', 'garlic', 'green chili', 'spinach', 'coriander'], minOrderValue: 300, deliveryRadiusKm: 40 },
      ],
      location: { city: 'Pune', state: 'MH', country: 'IN', lat: 18.5204, lng: 73.8567, pincode: '411001' },
      rating: { overall: 4.4, totalReviews: 1230, reliability: 88, quality: 94, deliverySpeed: 80 },
      pricing: { currency: 'INR', avgPricePerUnit: 45, unit: 'kg', bulkDiscountPct: 10 },
      contact: { phone: '+91-20-67890123', email: 'orders@greenleaf.in' },
      trustScore: 82,
      totalOrders: 5600,
      verifiedAt: '2026-03-01T00:00:00Z',
    },
    {
      name: 'HotelPro Hospitality',
      description: 'Hotels & restaurants — linens, amenities, kitchen equipment',
      status: 'active',
      tier: 'platinum',
      corpId: 'sup-corp-hotelpro',
      categories: ['hotel_supply', 'services'],
      capabilities: [
        { category: 'hotel_supply', items: ['bed sheets', 'towels', 'toiletries', 'kitchen equipment', 'cleaning supplies'], minOrderValue: 10000, deliveryRadiusKm: 500 },
      ],
      location: { city: 'Gurgaon', state: 'HR', country: 'IN', lat: 28.4595, lng: 77.0266, pincode: '122001' },
      rating: { overall: 4.7, totalReviews: 650, reliability: 95, quality: 96, deliverySpeed: 85 },
      pricing: { currency: 'INR', avgPricePerUnit: 850, unit: 'unit', bulkDiscountPct: 15 },
      contact: { phone: '+91-124-4567890', email: 'sales@hotelpro.in', website: 'https://hotelpro.in' },
      trustScore: 91,
      totalOrders: 3200,
      verifiedAt: '2025-09-12T00:00:00Z',
    },
    {
      name: 'BuildMart Materials',
      description: 'Construction raw materials — cement, steel, bricks, sand',
      status: 'active',
      tier: 'bronze',
      corpId: 'sup-corp-buildmart',
      categories: ['raw_materials', 'manufactured_goods'],
      capabilities: [
        { category: 'raw_materials', items: ['cement', 'steel bars', 'bricks', 'sand', 'aggregate', 'tiles'], minOrderValue: 50000, deliveryRadiusKm: 200 },
      ],
      location: { city: 'Chennai', state: 'TN', country: 'IN', lat: 13.0827, lng: 80.2707, pincode: '600001' },
      rating: { overall: 4.0, totalReviews: 320, reliability: 80, quality: 85, deliverySpeed: 70 },
      pricing: { currency: 'INR', avgPricePerUnit: 500, unit: 'kg', bulkDiscountPct: 18 },
      contact: { phone: '+91-44-34567890', email: 'orders@buildmart.in' },
      trustScore: 74,
      totalOrders: 1400,
      verifiedAt: '2026-04-18T00:00:00Z',
    },
    {
      name: 'QuickShip Couriers',
      description: 'Last-mile logistics & 3PL fulfillment',
      status: 'active',
      tier: 'gold',
      corpId: 'sup-corp-quickship',
      categories: ['logistics'],
      capabilities: [
        { category: 'logistics', items: ['same-day delivery', 'next-day delivery', 'bulk transport', 'cold chain'], deliveryRadiusKm: 500 },
      ],
      location: { city: 'Bangalore', state: 'KA', country: 'IN', lat: 12.9352, lng: 77.6245, pincode: '560034' },
      rating: { overall: 4.3, totalReviews: 2100, reliability: 86, quality: 84, deliverySpeed: 92 },
      pricing: { currency: 'INR', avgPricePerUnit: 35, unit: 'km', bulkDiscountPct: 20 },
      contact: { phone: '+91-80-45678901', email: 'dispatch@quickship.in' },
      trustScore: 81,
      totalOrders: 18500,
      verifiedAt: '2025-10-25T00:00:00Z',
    },
  ];
  for (const s of seeds) registerSupplier(s);
  return STORE.size;
}

export const _internal = { STORE };
export default {
  registerSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
  deleteSupplier,
  searchSuppliers,
  scoreSupplier,
  haversineKm,
  geocode,
  seedDemoSuppliers,
};
