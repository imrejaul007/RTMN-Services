/**
 * Multi-carrier registry.
 *
 * 12 built-in carriers covering global + regional routes (per spec §C).
 * Real carrier API integration is stubbed — production deployments would
 * wire these to DHL, FedEx, etc. via their respective SDKs.
 *
 * Each carrier has:
 * - id, name, modes, regions, reliability
 * - baseRatePerKg (USD), averageTransitHours, carbonGramsPerKgKm
 *
 * The carrier adapter interface is uniform so the orchestrator and
 * routing engine don't care which carrier is selected.
 */

import type { Carrier, CarrierId, TransportMode } from '../types.js';

/**
 * Built-in carrier catalog.
 * Sources: industry average rates (USD/kg), transit times, carbon intensity.
 */
export const CARRIERS: Carrier[] = [
  // ─── Global express ───────────────────────────────────────────────
  {
    id: 'dhl-express',
    name: 'DHL Express',
    modes: ['air', 'courier'],
    regions: [],
    reliability: 0.96,
    baseRatePerKg: 8.5,
    averageTransitHours: 48,
    carbonGramsPerKgKm: 0.85
  },
  {
    id: 'fedex-international',
    name: 'FedEx International',
    modes: ['air', 'courier'],
    regions: [],
    reliability: 0.95,
    baseRatePerKg: 8.2,
    averageTransitHours: 52,
    carbonGramsPerKgKm: 0.88
  },
  {
    id: 'ups-worldwide',
    name: 'UPS Worldwide',
    modes: ['air', 'courier', 'road'],
    regions: [],
    reliability: 0.94,
    baseRatePerKg: 7.9,
    averageTransitHours: 56,
    carbonGramsPerKgKm: 0.86
  },
  // ─── Sea freight ──────────────────────────────────────────────────
  {
    id: 'maersk',
    name: 'Maersk',
    modes: ['sea'],
    regions: [],
    reliability: 0.92,
    baseRatePerKg: 0.45,
    averageTransitHours: 720, // ~30 days
    carbonGramsPerKgKm: 0.012
  },
  {
    id: 'msc',
    name: 'MSC',
    modes: ['sea'],
    regions: [],
    reliability: 0.91,
    baseRatePerKg: 0.42,
    averageTransitHours: 740,
    carbonGramsPerKgKm: 0.013
  },
  {
    id: 'cma-cgm',
    name: 'CMA CGM',
    modes: ['sea'],
    regions: [],
    reliability: 0.90,
    baseRatePerKg: 0.48,
    averageTransitHours: 700,
    carbonGramsPerKgKm: 0.012
  },
  // ─── Air freight ──────────────────────────────────────────────────
  {
    id: 'emirates-skycargo',
    name: 'Emirates SkyCargo',
    modes: ['air'],
    regions: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH', 'IN', 'PK', 'BD', 'LK', 'CN', 'JP', 'KR', 'SG', 'TH', 'MY', 'ID', 'PH', 'VN', 'AU'],
    reliability: 0.93,
    baseRatePerKg: 5.5,
    averageTransitHours: 36,
    carbonGramsPerKgKm: 0.82
  },
  // ─── India domestic + regional ──────────────────────────────────
  {
    id: 'bluedart',
    name: 'BlueDart',
    modes: ['air', 'courier', 'road'],
    regions: ['IN', 'BD', 'NP', 'LK', 'BT'],
    reliability: 0.94,
    baseRatePerKg: 1.8,
    averageTransitHours: 36,
    carbonGramsPerKgKm: 0.78
  },
  {
    id: 'delhivery',
    name: 'Delhivery',
    modes: ['road', 'courier', 'rail'],
    regions: ['IN'],
    reliability: 0.91,
    baseRatePerKg: 0.85,
    averageTransitHours: 72,
    carbonGramsPerKgKm: 0.21
  },
  // ─── Middle East ─────────────────────────────────────────────────
  {
    id: 'aramex',
    name: 'Aramex',
    modes: ['road', 'courier'],
    regions: ['AE', 'SA', 'QA', 'KW', 'OM', 'BH', 'JO', 'EG', 'LB', 'IQ'],
    reliability: 0.92,
    baseRatePerKg: 1.4,
    averageTransitHours: 48,
    carbonGramsPerKgKm: 0.34
  },
  // ─── China / Japan ───────────────────────────────────────────────
  {
    id: 'sf-express',
    name: 'SF Express',
    modes: ['air', 'road', 'courier', 'rail'],
    regions: ['CN', 'HK', 'TW', 'MO', 'SG', 'MY', 'TH', 'JP', 'KR'],
    reliability: 0.93,
    baseRatePerKg: 2.1,
    averageTransitHours: 42,
    carbonGramsPerKgKm: 0.45
  },
  {
    id: 'yamato',
    name: 'Yamato Transport',
    modes: ['road', 'courier', 'rail'],
    regions: ['JP', 'TW', 'HK'],
    reliability: 0.95,
    baseRatePerKg: 2.4,
    averageTransitHours: 30,
    carbonGramsPerKgKm: 0.31
  }
];

/**
 * Look up a carrier by id.
 */
export function getCarrier(id: CarrierId): Carrier | undefined {
  return CARRIERS.find((c) => c.id === id);
}

/**
 * Filter carriers by service criteria.
 *
 * @param filter.country  - destination country (or origin) the carrier must serve
 * @param filter.modes    - acceptable modes (empty = any mode)
 */
export function findCarriers(filter: {
  country?: string;
  modes?: TransportMode[];
}): Carrier[] {
  return CARRIERS.filter((c) => {
    if (filter.modes && filter.modes.length > 0) {
      const supported = filter.modes.some((m) => c.modes.includes(m));
      if (!supported) return false;
    }
    if (filter.country && c.regions.length > 0) {
      if (!c.regions.includes(filter.country)) return false;
    }
    return true;
  });
}

/**
 * Generate a tracking number for a carrier (used by booking).
 * Format: <CARRIER_PREFIX>-<TIMESTAMP>-<RANDOM>
 */
export function generateTrackingNumber(carrierId: CarrierId): string {
  const prefix = carrierId.toUpperCase().split('-')[0].slice(0, 4);
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).toUpperCase().slice(2, 7);
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Simulate a booking against a carrier. In production, this would call the
 * carrier's API (DHL Express API, FedEx Ship API, Maersk Spot API, etc).
 */
export async function bookWithCarrier(
  carrier: Carrier,
  booking: {
    origin: string;
    destination: string;
    cargoType: string;
    weightKg: number;
    pieces: number;
    pickupTime: string;
  }
): Promise<{
  shipmentId: string;
  trackingNumber: string;
  pickupTime: string;
  deliveryTime: string;
  costUsd: number;
  status: 'confirmed';
}> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 50));

  const trackingNumber = generateTrackingNumber(carrier.id);
  const shipmentId = `SHP-${trackingNumber}`;

  // Cost = baseRate × weight × distance factor (1.0 for direct, 1.5 for multi-hop)
  const costUsd = Math.round(carrier.baseRatePerKg * booking.weightKg * 100) / 100;

  // Delivery = pickup + transit time
  const deliveryTime = new Date(
    new Date(booking.pickupTime).getTime() + carrier.averageTransitHours * 3600 * 1000
  ).toISOString();

  return {
    shipmentId,
    trackingNumber,
    pickupTime: booking.pickupTime,
    deliveryTime,
    costUsd,
    status: 'confirmed'
  };
}