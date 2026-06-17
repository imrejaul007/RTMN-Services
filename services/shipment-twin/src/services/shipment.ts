import { v4 as uuidv4 } from 'uuid';
import { Shipment, IShipment, IProofOfDelivery } from '../models';
import { CreateShipmentRequest, UpdateShipmentRequest } from '../types';
import { NotFoundError } from '../utils/errors';
import { trackingService } from './tracking';
import logger from '../utils/logger';

export class ShipmentService {
  /**
   * Create a new shipment
   */
  async createShipment(data: CreateShipmentRequest): Promise<IShipment> {
    const shipmentId = `SHP-${uuidv4().substring(0, 8).toUpperCase()}`;

    const shipment = new Shipment({
      shipmentId,
      tenantId: data.tenantId,
      orderId: data.orderId,
      carrier: {
        code: data.carrier.code,
        name: data.carrier.name,
        trackingUrl: data.carrier.trackingUrl,
        trackingNumber: trackingService.generateTrackingNumber(data.carrier.code)
      },
      status: 'label_created',
      origin: data.origin,
      destination: data.destination,
      location: {
        current: data.origin,
        history: [
          {
            location: data.origin,
            timestamp: new Date(),
            description: 'Shipment created'
          }
        ]
      },
      weight: data.weight,
      dimensions: data.dimensions,
      estimatedDelivery: data.estimatedDelivery ? new Date(data.estimatedDelivery) : undefined,
      proof: {},
      metadata: data.metadata || {}
    });

    await shipment.save();
    logger.info(`Shipment created: ${shipmentId}`);

    return shipment;
  }

  /**
   * Get shipment by ID
   */
  async getShipment(shipmentId: string, tenantId: string): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }
    return shipment;
  }

  /**
   * List shipments for a tenant
   */
  async listShipments(
    tenantId: string,
    options: {
      status?: string;
      orderId?: string;
      skip?: number;
      limit?: number;
    } = {}
  ): Promise<{ shipments: IShipment[]; total: number }> {
    const query: any = { tenantId };
    if (options.status) {
      query.status = options.status;
    }
    if (options.orderId) {
      query.orderId = options.orderId;
    }

    const [shipments, total] = await Promise.all([
      Shipment.find(query)
        .sort({ createdAt: -1 })
        .skip(options.skip || 0)
        .limit(options.limit || 50),
      Shipment.countDocuments(query)
    ]);

    return { shipments, total };
  }

  /**
   * Update shipment
   */
  async updateShipment(
    shipmentId: string,
    tenantId: string,
    updates: UpdateShipmentRequest
  ): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    // Handle status update with tracking event
    if (updates.status && updates.status !== shipment.status) {
      await trackingService.createTrackingEvent(shipmentId, tenantId, {
        status: updates.status,
        location: updates.location || shipment.location.current,
        description: `Status updated to ${updates.status}`
      });
    }

    // Update other fields
    if (updates.location) {
      shipment.location.current = updates.location;
    }
    if (updates.estimatedDelivery) {
      shipment.estimatedDelivery = new Date(updates.estimatedDelivery);
    }
    if (updates.actualDelivery) {
      shipment.actualDelivery = new Date(updates.actualDelivery);
    }
    if (updates.proof) {
      shipment.proof = { ...shipment.proof, ...updates.proof };
    }
    if (updates.metadata) {
      shipment.metadata = { ...shipment.metadata, ...updates.metadata };
    }

    await shipment.save();
    logger.info(`Shipment updated: ${shipmentId}`);

    return shipment;
  }

  /**
   * Cancel shipment
   */
  async cancelShipment(shipmentId: string, tenantId: string): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    if (!['label_created', 'picked_up'].includes(shipment.status)) {
      throw new Error('Cannot cancel shipment in current status');
    }

    await trackingService.createTrackingEvent(shipmentId, tenantId, {
      status: 'cancelled',
      location: shipment.location.current,
      description: 'Shipment cancelled'
    });

    return this.getShipment(shipmentId, tenantId);
  }

  /**
   * Get shipment statistics
   */
  async getStats(tenantId: string): Promise<Record<string, number>> {
    return Shipment.getStats(tenantId);
  }

  /**
   * Add proof of delivery
   */
  async addProofOfDelivery(
    shipmentId: string,
    tenantId: string,
    proof: Partial<IProofOfDelivery>
  ): Promise<IShipment> {
    const shipment = await Shipment.findOne({ shipmentId, tenantId });
    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    if (shipment.status !== 'out_for_delivery') {
      throw new Error('Shipment must be out for delivery to add proof');
    }

    await shipment.setProofOfDelivery(proof);
    logger.info(`Proof of delivery added: ${shipmentId}`);

    return shipment;
  }

  /**
   * Track shipment by tracking number
   */
  async trackByTrackingNumber(
    trackingNumber: string,
    tenantId: string
  ): Promise<IShipment | null> {
    return Shipment.findOne({
      'carrier.trackingNumber': trackingNumber,
      tenantId
    });
  }

  /**
   * Get active shipments
   */
  async getActiveShipments(tenantId: string): Promise<IShipment[]> {
    return Shipment.find({
      tenantId,
      status: { $nin: ['delivered', 'returned', 'failed', 'cancelled'] }
    }).sort({ createdAt: -1 });
  }

  /**
   * Get shipments by carrier
   */
  async getByCarrier(tenantId: string, carrierCode: string): Promise<IShipment[]> {
    return Shipment.find({
      tenantId,
      'carrier.code': carrierCode.toUpperCase()
    }).sort({ createdAt: -1 });
  }
}

export const shipmentService = new ShipmentService();
