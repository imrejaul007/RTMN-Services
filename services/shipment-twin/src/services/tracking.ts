import { v4 as uuidv4 } from 'uuid';
import { Shipment, TrackingEvent, ITrackingEvent } from '../models';
import { ShipmentStatus } from '../types';
import logger from '../utils/logger';
import { NotFoundError } from '../utils/errors';

// Status transition map - defines valid transitions
const STATUS_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  label_created: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'returned', 'failed'],
  in_transit: ['out_for_delivery', 'returned', 'failed'],
  out_for_delivery: ['delivered', 'returned', 'failed'],
  delivered: [],
  returned: [],
  failed: [],
  cancelled: []
};

export class TrackingService {
  /**
   * Create a new tracking event and update shipment status
   */
  async createTrackingEvent(
    shipmentId: string,
    tenantId: string,
    event: {
      status: ShipmentStatus;
      location: any;
      description: string;
      timestamp?: Date;
      rawData?: Record<string, any>;
    }
  ): Promise<ITrackingEvent> {
    // Get current shipment
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    // Validate status transition
    const currentStatus = shipment.status;
    const newStatus = event.status;

    if (!this.isValidTransition(currentStatus, newStatus)) {
      logger.warn(`Invalid status transition: ${currentStatus} -> ${newStatus}`, {
        shipmentId
      });
    }

    // Create tracking event
    const trackingEvent = new TrackingEvent({
      shipmentId,
      tenantId,
      carrier: shipment.carrier.code,
      trackingNumber: shipment.carrier.trackingNumber,
      status: newStatus,
      previousStatus: currentStatus,
      location: event.location,
      timestamp: event.timestamp || new Date(),
      description: event.description,
      isDelivered: newStatus === 'delivered',
      rawData: event.rawData || {}
    });

    await trackingEvent.save();

    // Update shipment status and location
    shipment.status = newStatus;
    await shipment.addLocationUpdate(event.location, event.description);

    // Handle delivery proof
    if (newStatus === 'delivered') {
      shipment.actualDelivery = new Date();
    }

    await shipment.save();

    logger.info(`Tracking event created: ${shipmentId}`, {
      status: newStatus,
      previousStatus: currentStatus
    });

    return trackingEvent;
  }

  /**
   * Validate status transition
   */
  private isValidTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
    const allowed = STATUS_TRANSITIONS[from];
    return allowed.includes(to);
  }

  /**
   * Get tracking timeline for a shipment
   */
  async getTrackingTimeline(shipmentId: string, tenantId: string) {
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    const events = await TrackingEvent.getStatusTimeline(shipmentId);

    return {
      shipmentId,
      currentStatus: shipment.status,
      carrier: shipment.carrier,
      origin: shipment.origin,
      destination: shipment.destination,
      estimatedDelivery: shipment.estimatedDelivery,
      timeline: events.map((e) => ({
        status: e.status,
        timestamp: e.timestamp,
        description: e.description,
        location: e.location
      }))
    };
  }

  /**
   * Get current location of a shipment
   */
  async getCurrentLocation(shipmentId: string, tenantId: string) {
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    return {
      shipmentId,
      currentLocation: shipment.location.current,
      lastUpdate: shipment.location.history.length > 0
        ? shipment.location.history[shipment.location.history.length - 1].timestamp
        : null,
      status: shipment.status
    };
  }

  /**
   * Subscribe to shipment updates (webhook simulation)
   */
  async subscribeToUpdates(
    shipmentId: string,
    tenantId: string,
    callback: (event: ITrackingEvent) => void
  ): Promise<() => void> {
    // In production, this would use EventBus or WebSocket
    // For now, return a mock unsubscribe function
    logger.info(`Subscribed to updates for shipment: ${shipmentId}`);

    return () => {
      logger.info(`Unsubscribed from updates for shipment: ${shipmentId}`);
    };
  }

  /**
   * Bulk update tracking events from carrier API
   */
  async bulkUpdateTracking(
    events: Array<{
      trackingNumber: string;
      status: ShipmentStatus;
      location: any;
      timestamp: Date;
      description: string;
    }>
  ) {
    const results = {
      updated: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const event of events) {
      try {
        const shipment = await Shipment.findOne({
          'carrier.trackingNumber': event.trackingNumber
        });

        if (!shipment) {
          results.failed++;
          results.errors.push(`Shipment not found: ${event.trackingNumber}`);
          continue;
        }

        await this.createTrackingEvent(
          shipment.shipmentId,
          shipment.tenantId,
          {
            status: event.status,
            location: event.location,
            description: event.description,
            timestamp: event.timestamp
          }
        );

        results.updated++;
      } catch (error) {
        results.failed++;
        results.errors.push(`${event.trackingNumber}: ${(error as Error).message}`);
      }
    }

    return results;
  }

  /**
   * Generate tracking number for a carrier
   */
  generateTrackingNumber(carrierCode: string): string {
    const prefix = carrierCode.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = uuidv4().substring(0, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

export const trackingService = new TrackingService();
