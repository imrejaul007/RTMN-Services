/**
 * Unified tracking registry.
 *
 * Aggregates status across multi-leg shipments. Each leg has its own
 * tracking number (from the carrier) plus a unified shipment ID for
 * cross-carrier queries.
 */
import type { BookingLegResult, ShipmentStatus, Address } from '../types.js';
interface ShipmentRecord {
    shipmentId: string;
    bookings: BookingLegResult[];
    createdAt: string;
    /** Plan id this shipment was created from */
    planId: string;
    /** Company / user that owns it */
    ownerCorpId?: string;
    /** Cached status (recomputed on demand) */
    cachedStatus?: ShipmentStatus;
}
export declare function registerShipment(params: {
    shipmentId: string;
    bookings: BookingLegResult[];
    planId: string;
    ownerCorpId?: string;
}): void;
export declare function getShipment(shipmentId: string): ShipmentRecord | undefined;
export declare function cancelShipment(shipmentId: string): boolean;
/**
 * Simulate progress events for a shipment.
 * In production, this would aggregate status from each carrier's tracking API.
 */
export declare function simulateEvents(shipmentId: string, booking: BookingLegResult, currentLocation?: Address): ShipmentStatus;
/**
 * Get the full status of a shipment (aggregates all legs).
 */
export declare function getStatus(shipmentId: string): ShipmentStatus | null;
export {};
