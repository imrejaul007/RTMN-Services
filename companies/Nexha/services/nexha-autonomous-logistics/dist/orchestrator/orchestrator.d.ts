/**
 * Logistics Orchestrator — top-level coordinator.
 *
 * Per spec §C:
 *  1. planShipment — find carriers, generate routes, score, check customs, bind insurance
 *  2. bookShipment — book each leg, register tracking, schedule customs
 *  3. trackShipment — get unified status across legs
 *  4. reroute — find alternatives if current shipment is delayed > threshold
 *  5. cancelShipment — cancel all legs
 */
import type { ShipmentRequest, ShipmentPlan, BookingConfirmation, ShipmentStatus, RerouteResult } from '../types.js';
/**
 * Generate a shipment plan: routes + customs + insurance + carbon.
 */
export declare function planShipment(request: ShipmentRequest): Promise<ShipmentPlan>;
/**
 * Book a shipment plan with all carriers.
 */
export declare function bookShipment(plan: ShipmentPlan, options?: {
    pickupTime?: string;
}): Promise<BookingConfirmation>;
/**
 * Track a shipment.
 */
export declare function trackShipment(shipmentId: string): ShipmentStatus | null;
/**
 * Reroute a delayed shipment.
 * Auto-executes if delay > threshold, otherwise returns alternatives for user decision.
 */
export declare function reroute(shipmentId: string, _reason: string): Promise<RerouteResult>;
/**
 * Cancel a shipment (all legs).
 */
export declare function cancelShipmentFn(shipmentId: string): {
    success: boolean;
    reason?: string;
};
