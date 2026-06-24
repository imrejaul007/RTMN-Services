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
export declare const CARRIERS: Carrier[];
/**
 * Look up a carrier by id.
 */
export declare function getCarrier(id: CarrierId): Carrier | undefined;
/**
 * Filter carriers by service criteria.
 *
 * @param filter.country  - destination country (or origin) the carrier must serve
 * @param filter.modes    - acceptable modes (empty = any mode)
 */
export declare function findCarriers(filter: {
    country?: string;
    modes?: TransportMode[];
}): Carrier[];
/**
 * Generate a tracking number for a carrier (used by booking).
 * Format: <CARRIER_PREFIX>-<TIMESTAMP>-<RANDOM>
 */
export declare function generateTrackingNumber(carrierId: CarrierId): string;
/**
 * Simulate a booking against a carrier. In production, this would call the
 * carrier's API (DHL Express API, FedEx Ship API, Maersk Spot API, etc).
 */
export declare function bookWithCarrier(carrier: Carrier, booking: {
    origin: string;
    destination: string;
    cargoType: string;
    weightKg: number;
    pieces: number;
    pickupTime: string;
}): Promise<{
    shipmentId: string;
    trackingNumber: string;
    pickupTime: string;
    deliveryTime: string;
    costUsd: number;
    status: 'confirmed';
}>;
