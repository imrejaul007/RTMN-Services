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

const shipments = new Map<string, ShipmentRecord>();

export function registerShipment(params: {
  shipmentId: string;
  bookings: BookingLegResult[];
  planId: string;
  ownerCorpId?: string;
}): void {
  shipments.set(params.shipmentId, {
    shipmentId: params.shipmentId,
    bookings: params.bookings,
    planId: params.planId,
    ownerCorpId: params.ownerCorpId,
    createdAt: new Date().toISOString()
  });
}

export function getShipment(shipmentId: string): ShipmentRecord | undefined {
  return shipments.get(shipmentId);
}

export function cancelShipment(shipmentId: string): boolean {
  return shipments.delete(shipmentId);
}

/**
 * Simulate progress events for a shipment.
 * In production, this would aggregate status from each carrier's tracking API.
 */
export function simulateEvents(
  shipmentId: string,
  booking: BookingLegResult,
  currentLocation?: Address
): ShipmentStatus {
  const age = Math.floor((Date.now() - new Date(booking.pickupTime).getTime()) / 1000);
  const progress = Math.min(1, age / (booking.deliveryTime ? new Date(booking.deliveryTime).getTime() / 1000 - new Date(booking.pickupTime).getTime() / 1000 : 86400));

  let status: ShipmentStatus['status'];
  if (progress < 0.05) status = 'picked-up';
  else if (progress < 0.8) status = 'in-transit';
  else if (progress < 1) status = 'out-for-delivery';
  else status = 'delivered';
  // 'exception' is reserved for real carrier webhooks (production)

  const events = [
    { timestamp: booking.pickupTime, status: 'picked-up', description: 'Picked up from origin' },
    { timestamp: new Date(new Date(booking.pickupTime).getTime() + age / 2 * 1000).toISOString(), status: 'in-transit', description: 'In transit', location: currentLocation },
    { timestamp: new Date().toISOString(), status, description: `Current: ${status}` }
  ];

  return {
    shipmentId,
    status,
    currentLocation,
    legs: [
      {
        carrierId: booking.carrierId,
        carrierName: booking.carrierId.split('-').map((s) => s[0].toUpperCase() + s.slice(1)).join(' '),
        mode: 'courier' as const,
        status: (status === 'delivered' ? 'delivered' : 'in-transit') as 'delivered' | 'in-transit' | 'pending' | 'exception',
        trackingNumber: booking.trackingNumber,
        lastUpdate: new Date().toISOString(),
        events
      }
    ],
    estimatedDelivery: booking.deliveryTime
  };
}

/**
 * Get the full status of a shipment (aggregates all legs).
 */
export function getStatus(shipmentId: string): ShipmentStatus | null {
  const shipment = shipments.get(shipmentId);
  if (!shipment) return null;

  // Simulate each leg
  const legs = shipment.bookings.map((b) => {
    const legStatus = simulateEvents(shipmentId, b);
    return legStatus.legs[0];
  });

  // Aggregate status: take the latest non-delivered status across legs
  const overall = shipment.bookings.every((b) => new Date(b.deliveryTime) < new Date())
    ? 'delivered' as const
    : 'in-transit' as const;

  return {
    shipmentId,
    status: overall,
    legs,
    estimatedDelivery: shipment.bookings[shipment.bookings.length - 1].deliveryTime
  };
}