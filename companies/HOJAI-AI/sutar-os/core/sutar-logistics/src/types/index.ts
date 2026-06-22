/**
 * Logistics — Type Definitions
 * Phase C.2: Shipping quotes, tracking, and 3PL integration stubs
 */

export type ShipmentStatus =
  | 'pending'
  | 'quoted'
  | 'booked'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'failed'
  | 'returned';

export type ServiceLevel = 'economy' | 'standard' | 'express' | 'same_day' | 'scheduled';

export type CarrierType = 'in_house' | '3pl' | 'crowdsourced' | 'postal';

export interface Address {
  name?: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  lat?: number;
  lng?: number;
  phone?: string;
}

export interface PackageDimensions {
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Cold-chain / fragile / hazmat */
  specialHandling?: ('cold_chain' | 'fragile' | 'hazmat' | 'oversized')[];
}

export interface ShippingQuote {
  id: string;
  carrier: string;
  carrierType: CarrierType;
  serviceLevel: ServiceLevel;
  origin: Address;
  destination: Address;
  package: PackageDimensions;
  /** Cheapest is 1; higher = more expensive. */
  rank: number;
  cost: number;
  currency: string;
  /** Estimated transit time in hours. */
  transitHours: number;
  /** ISO 8601 pickup window. */
  pickupBy: string;
  /** ISO 8601 estimated delivery. */
  eta: string;
  /** CO2 estimate in kg. */
  co2Kg?: number;
  /** Whether the carrier supports tracking. */
  trackable: boolean;
  /** Why we ranked it this way. */
  reason: string;
}

export interface QuoteRequest {
  origin: Address;
  destination: Address;
  package: PackageDimensions;
  serviceLevel?: ServiceLevel;
  preferredCurrency?: string;
  /** Max acceptable cost. Quotes above are filtered out. */
  maxCost?: number;
  /** Max acceptable transit hours. */
  maxTransitHours?: number;
}

export interface TrackingEvent {
  eventId: string;
  shipmentId: string;
  status: ShipmentStatus;
  location?: string;
  description: string;
  timestamp: string;
}

export interface Shipment {
  id: string;
  quoteId: string;
  status: ShipmentStatus;
  carrier: string;
  serviceLevel: ServiceLevel;
  origin: Address;
  destination: Address;
  package: PackageDimensions;
  cost: number;
  currency: string;
  /** When the customer booked the shipment. */
  bookedAt: string;
  /** When carrier picked it up. */
  pickedUpAt?: string;
  /** When shipment was delivered. */
  deliveredAt?: string;
  /** Current ETA (recomputed on delays). */
  eta: string;
  /** Full audit trail. */
  events: TrackingEvent[];
  /** External tracking number from carrier. */
  trackingNumber: string;
  metadata?: Record<string, unknown>;
}
