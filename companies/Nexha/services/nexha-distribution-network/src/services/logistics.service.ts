/**
 * Logistics Service — Phase C.2
 *
 * Generates shipping quotes across multiple carriers (3PL stubs + in-house),
 * books shipments, and tracks them through a status machine.
 *
 * The 3PL integrations (Delhivery, Shiprocket, etc.) are stubbed — they
 * return deterministic mock quotes. Real integrations can be slotted in
 * by replacing the quote generation function.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Address,
  CarrierType,
  PackageDimensions,
  QuoteRequest,
  ServiceLevel,
  Shipment,
  ShipmentStatus,
  ShippingQuote,
  TrackingEvent,
} from '../types/index.js';

const SHIPMENT_STORE = new Map<string, Shipment>();

// Quote cache: keyed by a deterministic signature of the QuoteRequest.
// Without this, every call to getQuotes() generates fresh uuid IDs and the
// subsequent bookShipment(quoteId, ...) can't find the quote anymore. The
// cache also makes the API idempotent under retries.
const QUOTE_CACHE = new Map<string, ShippingQuote[]>();

function requestSignature(req: QuoteRequest): string {
  return JSON.stringify({
    o: req.origin,
    d: req.destination,
    p: req.package,
    s: req.serviceLevel ?? null,
    m: req.maxTransitHours ?? null,
    c: req.maxCost ?? null,
    h: (req.package.specialHandling ?? []).slice().sort(),
    cur: req.preferredCurrency ?? null,
  });
}

// ─────────────────────────────────────────────────────────────
// Geo helpers
// ─────────────────────────────────────────────────────────────

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

export function coordsOf(addr: Address): { lat: number; lng: number } | null {
  if (addr.lat != null && addr.lng != null) return { lat: addr.lat, lng: addr.lng };
  const k = addr.city.toLowerCase().trim();
  if (CITY_COORDS[k]) return CITY_COORDS[k];
  return null;
}

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

// ─────────────────────────────────────────────────────────────
// Carrier profiles
// ─────────────────────────────────────────────────────────────

interface CarrierProfile {
  name: string;
  type: CarrierType;
  /** Base cost in INR regardless of distance (e.g., pickup fee). */
  baseCost: number;
  /** Cost per km in INR. */
  perKm: number;
  /** Cost per kg in INR. */
  perKg: number;
  /** Speed: average km/hour (affects transit time). */
  avgSpeedKmh: number;
  /** Multiplier per service level. */
  serviceMultiplier: Record<ServiceLevel, number>;
  /** Special handling surcharges. */
  specialSurcharge: Record<string, number>;
  trackable: boolean;
  /** Coverage: list of states the carrier serves (or 'ALL'). */
  coverage: 'ALL' | string[];
}

const CARRIERS: CarrierProfile[] = [
  {
    name: 'QuickShip Express',
    type: 'in_house',
    baseCost: 30,
    perKm: 1.5,
    perKg: 8,
    avgSpeedKmh: 35,
    serviceMultiplier: { economy: 1.0, standard: 1.3, express: 1.7, same_day: 2.4, scheduled: 1.1 },
    specialSurcharge: { cold_chain: 1.4, fragile: 1.2, hazmat: 1.6, oversized: 1.3 },
    trackable: true,
    coverage: 'ALL',
  },
  {
    name: 'BharatPost Standard',
    type: 'postal',
    baseCost: 25,
    perKm: 0.8,
    perKg: 5,
    avgSpeedKmh: 25,
    serviceMultiplier: { economy: 0.7, standard: 1.0, express: 1.4, same_day: 0, scheduled: 1.0 },
    specialSurcharge: { cold_chain: 0, fragile: 1.1, hazmat: 1.5, oversized: 1.2 },
    trackable: true,
    coverage: 'ALL',
  },
  {
    name: 'Delhivery 3PL',
    type: '3pl',
    baseCost: 40,
    perKm: 1.2,
    perKg: 6,
    avgSpeedKmh: 40,
    serviceMultiplier: { economy: 0.9, standard: 1.2, express: 1.6, same_day: 0, scheduled: 1.1 },
    specialSurcharge: { cold_chain: 1.5, fragile: 1.2, hazmat: 1.8, oversized: 1.4 },
    trackable: true,
    coverage: 'ALL',
  },
  {
    name: 'CrowdDash',
    type: 'crowdsourced',
    baseCost: 20,
    perKm: 2.0,
    perKg: 4,
    avgSpeedKmh: 30,
    serviceMultiplier: { economy: 1.0, standard: 1.2, express: 1.5, same_day: 1.9, scheduled: 0 },
    specialSurcharge: { cold_chain: 0, fragile: 1.0, hazmat: 0, oversized: 0 },
    trackable: true,
    coverage: ['MH', 'DL', 'KA', 'TN', 'TG', 'HR', 'UP', 'GJ', 'RJ', 'WB'],
  },
];

// ─────────────────────────────────────────────────────────────
// Quote calculation
// ─────────────────────────────────────────────────────────────

function coversState(carrier: CarrierProfile, state: string): boolean {
  if (carrier.coverage === 'ALL') return true;
  return carrier.coverage.includes(state);
}

function calcTransitHours(distanceKm: number, speedKmh: number, serviceLevel: ServiceLevel): number {
  const base = distanceKm / Math.max(speedKmh, 1);
  // Service level adjustment
  const speedup: Record<ServiceLevel, number> = {
    economy: 1.3,
    standard: 1.0,
    express: 0.6,
    same_day: 0.3,
    scheduled: 1.0,
  };
  return Math.max(2, Math.round(base * speedup[serviceLevel] * 10) / 10);
}

function calcCO2(distanceKm: number, weightKg: number, type: CarrierType): number {
  // g CO2 per ton-km by transport type
  const factors: Record<CarrierType, number> = {
    in_house: 80,
    postal: 60,
    '3pl': 50,
    crowdsourced: 120,
  };
  return Math.round((distanceKm * weightKg * factors[type]) / 1000 * 100) / 100;
}

export function generateQuote(
  request: QuoteRequest,
  carrier: CarrierProfile,
  rank: number,
): ShippingQuote | null {
  const originCoords = coordsOf(request.origin);
  const destCoords = coordsOf(request.destination);
  if (!originCoords || !destCoords) return null;

  // Check coverage
  if (!coversState(carrier, request.origin.state) || !coversState(carrier, request.destination.state)) {
    return null;
  }

  const serviceLevel: ServiceLevel = request.serviceLevel ?? 'standard';

  // Service not available for this carrier
  if (carrier.serviceMultiplier[serviceLevel] === 0) return null;

  // Check that the carrier supports all required special handling.
  // A 0 multiplier means "not supported" → return null (not a free upgrade).
  const handling = request.package.specialHandling ?? [];
  for (const h of handling) {
    if ((carrier.specialSurcharge[h] ?? 0) === 0) return null;
  }

  const distanceKm = haversineKm(originCoords, destCoords);
  const transitHours = calcTransitHours(distanceKm, carrier.avgSpeedKmh, serviceLevel);

  // Filter on maxTransitHours
  if (request.maxTransitHours != null && transitHours > request.maxTransitHours) return null;

  // Cost
  let cost = carrier.baseCost + distanceKm * carrier.perKm + request.package.weightKg * carrier.perKg;
  cost *= carrier.serviceMultiplier[serviceLevel];

  // Special handling surcharges
  for (const h of handling) {
    const mult = carrier.specialSurcharge[h] ?? 1;
    cost *= mult;
  }

  cost = Math.round(cost * 100) / 100; // round to 2dp

  // Filter on maxCost
  if (request.maxCost != null && cost > request.maxCost) return null;

  const currency = request.preferredCurrency ?? 'INR';
  const now = new Date();
  const pickupBy = new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(); // 4h from now
  const eta = new Date(now.getTime() + transitHours * 60 * 60 * 1000).toISOString();

  const co2Kg = calcCO2(distanceKm, request.package.weightKg, carrier.type);

  const reasons: string[] = [];
  if (carrier.type === 'crowdsourced') reasons.push('Lowest cost option');
  else if (carrier.type === 'in_house') reasons.push('In-house fleet — fastest pickup');
  else if (carrier.type === 'postal') reasons.push('Cheapest for non-urgent');
  else reasons.push('Reliable 3PL');
  if (serviceLevel === 'express') reasons.push('Express delivery');
  if (handling.includes('cold_chain')) reasons.push('Cold chain capable');

  return {
    id: `qt-${uuidv4()}`,
    carrier: carrier.name,
    carrierType: carrier.type,
    serviceLevel,
    origin: request.origin,
    destination: request.destination,
    package: request.package,
    rank,
    cost,
    currency,
    transitHours,
    pickupBy,
    eta,
    co2Kg,
    trackable: carrier.trackable,
    reason: reasons.join('; '),
  };
}

export function getQuotes(request: QuoteRequest): ShippingQuote[] {
  const sig = requestSignature(request);
  const cached = QUOTE_CACHE.get(sig);
  if (cached) return cached;

  const quotes: ShippingQuote[] = [];
  let rank = 1;
  for (const c of CARRIERS) {
    const q = generateQuote(request, c, rank);
    if (q) {
      quotes.push(q);
      rank++;
    }
  }
  // Default sort: cheapest first
  quotes.sort((a, b) => a.cost - b.cost);
  // Re-rank after sort
  quotes.forEach((q, i) => (q.rank = i + 1));
  QUOTE_CACHE.set(sig, quotes);
  return quotes;
}

// ─────────────────────────────────────────────────────────────
// Shipment lifecycle
// ─────────────────────────────────────────────────────────────

function nowIso(): string {
  return new Date().toISOString();
}

function addEvent(shipment: Shipment, status: ShipmentStatus, description: string, location?: string): TrackingEvent {
  const ev: TrackingEvent = {
    eventId: `ev-${uuidv4()}`,
    shipmentId: shipment.id,
    status,
    description,
    location,
    timestamp: nowIso(),
  };
  shipment.events.push(ev);
  return ev;
}

export function bookShipment(quoteId: string, carrier: string, request: QuoteRequest): Shipment | null {
  const quote = getQuotes(request).find(q => q.id === quoteId && q.carrier === carrier);
  if (!quote) return null;

  const shipment: Shipment = {
    id: `shp-${uuidv4()}`,
    quoteId: quote.id,
    status: 'booked',
    carrier: quote.carrier,
    serviceLevel: quote.serviceLevel,
    origin: quote.origin,
    destination: quote.destination,
    package: quote.package,
    cost: quote.cost,
    currency: quote.currency,
    bookedAt: nowIso(),
    eta: quote.eta,
    events: [],
    trackingNumber: `${quote.carrierType.toUpperCase().slice(0, 3)}${Date.now()}${Math.floor(Math.random() * 1000)}`,
  };
  addEvent(shipment, 'booked', `Shipment booked with ${quote.carrier}`);
  SHIPMENT_STORE.set(shipment.id, shipment);
  return shipment;
}

export function getShipment(id: string): Shipment | null {
  return SHIPMENT_STORE.get(id) || null;
}

export function listShipments(filter: { status?: ShipmentStatus } = {}): Shipment[] {
  let list = Array.from(SHIPMENT_STORE.values());
  if (filter.status) list = list.filter(s => s.status === filter.status);
  return list;
}

/** Advance a shipment to a new status with a tracking event. */
export function updateShipmentStatus(
  id: string,
  newStatus: ShipmentStatus,
  description?: string,
  location?: string,
): Shipment | null {
  const s = SHIPMENT_STORE.get(id);
  if (!s) return null;
  s.status = newStatus;
  if (newStatus === 'picked_up' && !s.pickedUpAt) s.pickedUpAt = nowIso();
  if (newStatus === 'delivered' && !s.deliveredAt) s.deliveredAt = nowIso();
  addEvent(s, newStatus, description ?? `Status changed to ${newStatus}`, location);
  return s;
}

export function cancelShipment(id: string, reason: string): Shipment | null {
  const s = SHIPMENT_STORE.get(id);
  if (!s) return null;
  if (s.status === 'delivered' || s.status === 'cancelled') return s;
  s.status = 'cancelled';
  addEvent(s, 'cancelled', `Cancelled: ${reason}`);
  return s;
}

/** Simulate the next tracking event for a shipment (for testing/demo). */
export function simulateNextEvent(id: string): Shipment | null {
  const s = SHIPMENT_STORE.get(id);
  if (!s) return null;
  const transitions: Record<ShipmentStatus, ShipmentStatus | null> = {
    pending: 'booked',
    quoted: 'booked',
    booked: 'picked_up',
    picked_up: 'in_transit',
    in_transit: 'out_for_delivery',
    out_for_delivery: 'delivered',
    delivered: null,
    cancelled: null,
    failed: null,
    returned: null,
  };
  const next = transitions[s.status];
  if (!next) return s;
  return updateShipmentStatus(id, next, `Auto-simulated: ${next}`, 'Hub');
}

export const _internal = { SHIPMENT_STORE, CARRIERS };
export default {
  generateQuote,
  getQuotes,
  bookShipment,
  getShipment,
  listShipments,
  updateShipmentStatus,
  cancelShipment,
  simulateNextEvent,
  haversineKm,
  coordsOf,
};
