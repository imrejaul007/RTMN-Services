import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

/**
 * ShipmentSync - Syncs KHAIRMOVE operations with Shipment Twin
 * Tracks ride and delivery shipments across the RTMN ecosystem
 */
export class ShipmentSync {
  private shipmentTwinUrl: string;
  private http: AxiosInstance;

  // In-memory shipment tracking (replace with database in production)
  private shipments: Map<string, ShipmentRecord> = new Map();

  constructor() {
    this.shipmentTwinUrl = process.env.SHIPMENT_TWIN_URL || 'http://localhost:3013';
    this.http = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Create shipment record for a ride
   */
  async createShipmentForRide(tripId: string, data: RideShipmentData): Promise<{ shipmentTwinId: string } | null> {
    try {
      const shipmentId = `SHIP-RIDE-${tripId}`;

      const shipment: ShipmentRecord = {
        shipmentId,
        tripId,
        type: 'ride',
        status: 'created',
        origin: data.origin,
        destination: data.destination,
        customerId: data.customerId,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline: [{
          status: 'created',
          timestamp: new Date(),
          description: 'Ride shipment created'
        }]
      };

      this.shipments.set(shipmentId, shipment);

      // Try to sync with Shipment Twin
      try {
        const response = await this.http.post(`${this.shipmentTwinUrl}/api/shipment`, {
          shipmentId,
          source: 'KHAIRMOVE',
          type: 'ride',
          origin: data.origin,
          destination: data.destination,
          customerId: data.customerId,
          metadata: {
            tripId,
            platform: 'KHAIRMOVE'
          }
        });

        const twinId = response.data?.shipmentId || response.data?.twinId;
        if (twinId) {
          logger.info(`Created shipment twin: ${twinId} for ride ${tripId}`);
          return { shipmentTwinId: twinId };
        }
      } catch (twinError) {
        logger.warn(`Shipment Twin not available, using local record: ${twinError}`);
      }

      return { shipmentTwinId: shipmentId };
    } catch (error) {
      logger.error(`Failed to create shipment for ride: ${error}`);
      return null;
    }
  }

  /**
   * Create shipment record for a delivery
   */
  async createShipmentForDelivery(tripId: string, data: DeliveryShipmentData): Promise<{ shipmentTwinId: string } | null> {
    try {
      const shipmentId = `SHIP-DEL-${tripId}`;

      const shipment: ShipmentRecord = {
        shipmentId,
        tripId,
        type: 'delivery',
        status: 'created',
        origin: data.origin,
        destination: data.destination,
        customerId: data.customerId,
        package: data.package,
        orderId: data.orderId,
        createdAt: new Date(),
        updatedAt: new Date(),
        timeline: [{
          status: 'created',
          timestamp: new Date(),
          description: 'Delivery shipment created'
        }]
      };

      this.shipments.set(shipmentId, shipment);

      // Try to sync with Shipment Twin
      try {
        const response = await this.http.post(`${this.shipmentTwinUrl}/api/shipment`, {
          shipmentId,
          source: 'KHAIRMOVE',
          type: 'delivery',
          origin: data.origin,
          destination: data.destination,
          customerId: data.customerId,
          package: data.package,
          orderId: data.orderId,
          metadata: {
            tripId,
            platform: 'KHAIRMOVE'
          }
        });

        const twinId = response.data?.shipmentId || response.data?.twinId;
        if (twinId) {
          logger.info(`Created shipment twin: ${twinId} for delivery ${tripId}`);
          return { shipmentTwinId: twinId };
        }
      } catch (twinError) {
        logger.warn(`Shipment Twin not available, using local record: ${twinError}`);
      }

      return { shipmentTwinId: shipmentId };
    } catch (error) {
      logger.error(`Failed to create shipment for delivery: ${error}`);
      return null;
    }
  }

  /**
   * Update shipment status
   */
  async updateShipment(tripId: string, update: ShipmentUpdate): Promise<boolean> {
    try {
      // Find shipment by tripId
      const shipment = this.findByTripId(tripId);
      if (!shipment) {
        logger.warn(`Shipment not found for trip: ${tripId}`);
        return false;
      }

      // Update fields
      if (update.status) {
        shipment.status = update.status;
      }
      if (update.driverId) {
        shipment.driverId = update.driverId;
      }
      if (update.vehicleId) {
        shipment.vehicleId = update.vehicleId;
      }
      if (update.currentLocation) {
        shipment.currentLocation = update.currentLocation;
      }
      if (update.estimatedDelivery) {
        shipment.estimatedDelivery = update.estimatedDelivery;
      }
      if (update.actualDelivery) {
        shipment.actualDelivery = update.actualDelivery;
      }
      if (update.completedAt) {
        shipment.completedAt = update.completedAt;
      }
      if (update.cancelledAt) {
        shipment.cancelledAt = update.cancelledAt;
      }
      if (update.cancellationReason) {
        shipment.cancellationReason = update.cancellationReason;
      }
      if (update.rating) {
        shipment.rating = update.rating;
      }
      if (update.feedback) {
        shipment.feedback = update.feedback;
      }
      if (update.agentTwinId) {
        shipment.agentTwinId = update.agentTwinId;
      }

      shipment.updatedAt = new Date();

      // Add timeline event
      shipment.timeline.push({
        status: update.status || 'updated',
        timestamp: new Date(),
        description: this.getStatusDescription(update.status || 'updated'),
        location: update.currentLocation
      });

      this.shipments.set(shipment.shipmentId, shipment);

      // Sync with Shipment Twin
      try {
        await this.http.put(`${this.shipmentTwinUrl}/api/shipment/${shipment.shipmentId}`, {
          status: shipment.status,
          driverId: shipment.driverId,
          vehicleId: shipment.vehicleId,
          currentLocation: shipment.currentLocation,
          updatedAt: shipment.updatedAt,
          timeline: shipment.timeline
        });
      } catch (twinError) {
        logger.debug(`Shipment Twin sync skipped: ${twinError}`);
      }

      logger.info(`Updated shipment ${shipment.shipmentId}: ${shipment.status}`);
      return true;
    } catch (error) {
      logger.error(`Failed to update shipment: ${error}`);
      return false;
    }
  }

  /**
   * Get shipment by tripId
   */
  async getShipment(tripId: string): Promise<ShipmentRecord | null> {
    return this.findByTripId(tripId) || null;
  }

  /**
   * Get shipment by shipmentId
   */
  async getShipmentById(shipmentId: string): Promise<ShipmentRecord | null> {
    return this.shipments.get(shipmentId) || null;
  }

  /**
   * Get shipments by customer
   */
  async getShipmentsByCustomer(customerId: string): Promise<ShipmentRecord[]> {
    return Array.from(this.shipments.values())
      .filter(s => s.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get active shipments
   */
  async getActiveShipments(): Promise<ShipmentRecord[]> {
    const activeStatuses = ['created', 'assigned', 'picked_up', 'in_transit'];
    return Array.from(this.shipments.values())
      .filter(s => activeStatuses.includes(s.status))
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  /**
   * Track shipment location
   */
  async trackShipment(tripId: string, location: Location): Promise<LocationHistory | null> {
    const shipment = this.findByTripId(tripId);
    if (!shipment) {
      return null;
    }

    const history: LocationHistory = {
      shipmentId: shipment.shipmentId,
      tripId,
      locations: [{
        ...location,
        timestamp: new Date()
      }]
    };

    // Update shipment current location
    shipment.currentLocation = location;
    shipment.updatedAt = new Date();
    this.shipments.set(shipment.shipmentId, shipment);

    return history;
  }

  /**
   * Link shipment to Order Twin
   */
  async linkToOrder(orderId: string, tripId: string): Promise<boolean> {
    const shipment = this.findByTripId(tripId);
    if (!shipment) {
      return false;
    }

    shipment.orderId = orderId;
    shipment.updatedAt = new Date();
    this.shipments.set(shipment.shipmentId, shipment);

    logger.info(`Linked shipment ${shipment.shipmentId} to order ${orderId}`);
    return true;
  }

  // Helper: Find shipment by tripId
  private findByTripId(tripId: string): ShipmentRecord | undefined {
    return Array.from(this.shipments.values()).find(s => s.tripId === tripId);
  }

  // Helper: Get status description
  private getStatusDescription(status: string): string {
    const descriptions: Record<string, string> = {
      'created': 'Shipment created',
      'assigned': 'Driver assigned',
      'picked_up': 'Package picked up',
      'in_transit': 'In transit',
      'delivered': 'Delivered successfully',
      'cancelled': 'Shipment cancelled',
      'failed': 'Delivery failed'
    };
    return descriptions[status] || `Status: ${status}`;
  }
}

// Type definitions
export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
}

export interface PackageInfo {
  packageId: string;
  description: string;
  weight: number;
  category: string;
  fragile?: boolean;
  value?: number;
}

export interface ShipmentRecord {
  shipmentId: string;
  tripId: string;
  type: 'ride' | 'delivery';
  status: string;
  origin: Location;
  destination: Location;
  customerId: string;
  driverId?: string;
  vehicleId?: string;
  package?: PackageInfo;
  orderId?: string;
  currentLocation?: Location;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  rating?: number;
  feedback?: string;
  agentTwinId?: string;
  createdAt: Date;
  updatedAt: Date;
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  status: string;
  timestamp: Date;
  description: string;
  location?: Location;
}

export interface RideShipmentData {
  origin: Location;
  destination: Location;
  type: 'ride';
  customerId: string;
}

export interface DeliveryShipmentData {
  origin: Location;
  destination: Location;
  type: 'delivery';
  customerId: string;
  package?: PackageInfo;
  orderId?: string;
}

export interface ShipmentUpdate {
  status?: string;
  driverId?: string;
  vehicleId?: string;
  currentLocation?: Location;
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  rating?: number;
  feedback?: string;
  agentTwinId?: string;
}

export interface LocationHistory {
  shipmentId: string;
  tripId: string;
  locations: Array<Location & { timestamp: Date }>;
}
