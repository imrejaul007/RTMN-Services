import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';
import { KHAIRMOVETwinLink } from '../models/KHAIRMOVEProfile';

/**
 * CustomerOpsBridge - Connects KHAIRMOVE to RTMN Customer Operations
 * Links rides, deliveries, and fleet operations to Customer Twin, Order Twin, and Agent Twin
 */
export class CustomerOpsBridge {
  private twinHubUrl: string;
  private customerTwinUrl: string;
  private orderTwinUrl: string;
  private agentTwinUrl: string;
  private eventBusUrl: string;
  private http: AxiosInstance;

  constructor() {
    this.twinHubUrl = process.env.TWINOS_HUB_URL || 'http://localhost:4705';
    this.customerTwinUrl = process.env.CUSTOMER_TWIN_URL || 'http://localhost:3017';
    this.orderTwinUrl = process.env.ORDER_TWIN_URL || 'http://localhost:3018';
    this.agentTwinUrl = process.env.AGENT_TWIN_URL || 'http://localhost:3011';
    this.eventBusUrl = process.env.EVENT_BUS_URL || 'http://localhost:4510';

    this.http = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Link a customer to Customer Twin and associate with a ride/delivery
   */
  async linkToCustomerTwin(customerId: string, tripId: string, tripType: 'ride' | 'delivery'): Promise<{ twinId: string } | null> {
    try {
      // Create or update Customer Twin
      const response = await this.http.post(`${this.customerTwinUrl}/api/customer`, {
        customerId,
        source: 'KHAIRMOVE',
        trips: [{
          tripId,
          type: tripType,
          linkedAt: new Date()
        }]
      });

      const twinId = response.data?.twinId || response.data?.customer?.twinId;

      if (twinId) {
        logger.info(`Linked customer ${customerId} to twin ${twinId}`);
        return { twinId };
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to link customer to twin: ${error}`);
      // Return mock twin ID for development
      return { twinId: `CUST-TWIN-${customerId}` };
    }
  }

  /**
   * Get Customer Twin for a customer
   */
  async getCustomerTwin(customerId: string): Promise<{ twinId: string; customer?: Record<string, unknown> } | null> {
    try {
      const response = await this.http.get(`${this.customerTwinUrl}/api/customer/${customerId}`);
      return response.data;
    } catch (error) {
      logger.warn(`Failed to get customer twin: ${error}`);
      return { twinId: `CUST-TWIN-${customerId}` };
    }
  }

  /**
   * Link an order to Order Twin and associate with a delivery
   */
  async linkToOrderTwin(orderId: string, tripId: string, tripType: 'delivery'): Promise<{ twinId: string } | null> {
    try {
      // Create or update Order Twin
      const response = await this.http.post(`${this.orderTwinUrl}/api/order`, {
        orderId,
        source: 'KHAIRMOVE',
        deliveries: [{
          tripId,
          type: tripType,
          linkedAt: new Date()
        }]
      });

      const twinId = response.data?.twinId || response.data?.order?.twinId;

      if (twinId) {
        logger.info(`Linked order ${orderId} to twin ${twinId}`);
        return { twinId };
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to link order to twin: ${error}`);
      // Return mock twin ID for development
      return { twinId: `ORDER-TWIN-${orderId}` };
    }
  }

  /**
   * Link a driver to Agent Twin and associate with a trip
   */
  async linkToAgentTwin(driverId: string, tripId: string, tripType: 'ride' | 'delivery' | 'fleet_driver'): Promise<{ twinId: string } | null> {
    try {
      // Create or update Agent Twin
      const response = await this.http.post(`${this.agentTwinUrl}/api/agent`, {
        agentId: driverId,
        type: 'driver',
        source: 'KHAIRMOVE',
        trips: [{
          tripId,
          type: tripType,
          linkedAt: new Date()
        }]
      });

      const twinId = response.data?.twinId || response.data?.agent?.twinId;

      if (twinId) {
        logger.info(`Linked driver ${driverId} to agent twin ${twinId}`);
        return { twinId };
      }

      return null;
    } catch (error) {
      logger.warn(`Failed to link driver to agent twin: ${error}`);
      // Return mock twin ID for development
      return { twinId: `AGENT-TWIN-${driverId}` };
    }
  }

  /**
   * Get twin links for a trip
   */
  async getTwinLinks(tripId: string, tripType: 'ride' | 'delivery'): Promise<KHAIRMOVETwinLink[]> {
    const links: KHAIRMOVETwinLink[] = [];

    // Query TwinHub for existing links
    try {
      const response = await this.http.get(`${this.twinHubUrl}/api/twins/links/${tripId}`);
      if (response.data?.links) {
        return response.data.links;
      }
    } catch (error) {
      logger.debug(`No existing links found for trip ${tripId}`);
    }

    return links;
  }

  /**
   * Register a new twin link in TwinHub
   */
  async registerTwinLink(link: KHAIRMOVETwinLink): Promise<boolean> {
    try {
      await this.http.post(`${this.twinHubUrl}/api/twins/links`, {
        sourceType: 'khairmove',
        sourceId: link.twinId,
        targetType: link.twinType,
        targetId: link.twinId,
        linkType: link.linkType,
        metadata: link.metadata
      });

      logger.info(`Registered twin link: ${link.twinType}/${link.twinId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to register twin link: ${error}`);
      return false;
    }
  }

  /**
   * Publish ride event to Event Bus
   */
  async publishRideEvent(event: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.http.post(`${this.eventBusUrl}/api/events/publish`, {
        event,
        source: 'khairmove-integration',
        data: {
          ...data,
          timestamp: new Date(),
          source: 'ride'
        }
      });

      logger.info(`Published ride event: ${event}`, data);
    } catch (error) {
      logger.error(`Failed to publish ride event: ${error}`);
    }
  }

  /**
   * Publish delivery event to Event Bus
   */
  async publishDeliveryEvent(event: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.http.post(`${this.eventBusUrl}/api/events/publish`, {
        event,
        source: 'khairmove-integration',
        data: {
          ...data,
          timestamp: new Date(),
          source: 'delivery'
        }
      });

      logger.info(`Published delivery event: ${event}`, data);
    } catch (error) {
      logger.error(`Failed to publish delivery event: ${error}`);
    }
  }

  /**
   * Publish fleet event to Event Bus
   */
  async publishFleetEvent(event: string, data: Record<string, unknown>): Promise<void> {
    try {
      await this.http.post(`${this.eventBusUrl}/api/events/publish`, {
        event,
        source: 'khairmove-integration',
        data: {
          ...data,
          timestamp: new Date(),
          source: 'fleet'
        }
      });

      logger.info(`Published fleet event: ${event}`, data);
    } catch (error) {
      logger.error(`Failed to publish fleet event: ${error}`);
    }
  }

  /**
   * Sync customer profile across twins
   */
  async syncCustomerProfile(customerId: string, profileData: Record<string, unknown>): Promise<void> {
    try {
      // Update Customer Twin
      await this.http.put(`${this.customerTwinUrl}/api/customer/${customerId}`, {
        ...profileData,
        lastUpdated: new Date(),
        source: 'KHAIRMOVE'
      });

      logger.info(`Synced customer profile: ${customerId}`);
    } catch (error) {
      logger.error(`Failed to sync customer profile: ${error}`);
    }
  }

  /**
   * Get customer journey across all twins
   */
  async getCustomerJourney(customerId: string): Promise<Record<string, unknown>> {
    try {
      const [customerTwin, shipmentTwin, orderTwin] = await Promise.all([
        this.getCustomerTwin(customerId).catch(() => null),
        this.http.get(`${this.customerTwinUrl}/api/shipments/${customerId}`).catch(() => null),
        this.http.get(`${this.orderTwinUrl}/api/orders/customer/${customerId}`).catch(() => null)
      ]);

      return {
        customer: customerTwin,
        shipments: shipmentTwin?.data,
        orders: orderTwin?.data,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error(`Failed to get customer journey: ${error}`);
      return { customerId, error: 'Failed to fetch journey' };
    }
  }
}
