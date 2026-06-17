/**
 * Service Registry - Registers and discovers hotel ecosystem services
 */

import axios from 'axios';

export class ServiceRegistry {
  constructor(registryUrl, logger) {
    this.registryUrl = registryUrl;
    this.logger = logger;
    this.registered = false;
  }

  async register(serviceName, port, metadata = {}) {
    try {
      const serviceInfo = {
        name: serviceName,
        port,
        url: `http://localhost:${port}`,
        healthUrl: `http://localhost:${port}/health`,
        metadata: {
          type: 'hotel-ecosystem',
          version: '1.0.0',
          ...metadata
        },
        registeredAt: new Date().toISOString()
      };

      const response = await axios.post(`${this.registryUrl}/api/services/register`, serviceInfo, {
        timeout: 5000
      });

      this.registered = true;
      this.logger.info(`Registered ${serviceName} at port ${port}`);

      return { success: true, serviceId: response.data?.id };
    } catch (err) {
      this.logger.warn(`Failed to register ${serviceName}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  async discover(serviceName) {
    try {
      const response = await axios.get(`${this.registryUrl}/api/services/${serviceName}`, {
        timeout: 5000
      });

      return {
        found: true,
        service: response.data
      };
    } catch (err) {
      this.logger.warn(`Service ${serviceName} not found in registry`);
      return { found: false };
    }
  }

  async getAllServices(filter = {}) {
    try {
      const response = await axios.get(`${this.registryUrl}/api/services`, {
        params: filter,
        timeout: 5000
      });

      return {
        success: true,
        services: response.data
      };
    } catch (err) {
      this.logger.error('Failed to get services:', err.message);
      return { success: false, error: err.message };
    }
  }

  async heartbeat(serviceName) {
    try {
      await axios.post(`${this.registryUrl}/api/services/${serviceName}/heartbeat`, {
        timestamp: new Date().toISOString()
      });
      return true;
    } catch (err) {
      return false;
    }
  }
}

// Hotel Ecosystem Service Map
export const HOTEL_ECOSYSTEM_SERVICES = {
  // RTMN-OS Services
  'hotel-os': {
    name: 'Hotel OS',
    description: 'RTMN Hotel Property Management System',
    port: 5025,
    type: 'pms',
    capabilities: ['rooms', 'housekeeping', 'bookings', 'invoices', 'analytics']
  },

  // REZ-Merchant Services
  'rez-merchant': {
    name: 'REZ Merchant',
    description: 'REZ Merchant Platform',
    port: 4800,
    type: 'merchant'
  },
  'rez-booking': {
    name: 'REZ Booking',
    description: 'REZ Booking Engine',
    port: 4015,
    type: 'booking'
  },
  'rez-mind-hotel': {
    name: 'REZ Mind Hotel',
    description: 'AI Intelligence for Hotels',
    port: 4017,
    type: 'ai'
  },

  // StayOwn Services
  'stayown-api': {
    name: 'StayOwn API',
    description: 'StayOwn Hospitality Backend API',
    port: 3000,
    type: 'ota-backend'
  },
  'stayown-ota-web': {
    name: 'StayOwn OTA Web',
    description: 'Guest Booking Website',
    port: 3003,
    type: 'ota-frontend'
  },
  'stayown-hotel-panel': {
    name: 'StayOwn Hotel Panel',
    description: 'Hotel Staff Dashboard',
    port: 3001,
    type: 'staff-dashboard'
  },
  'stayown-admin': {
    name: 'StayOwn Admin',
    description: 'Platform Admin Panel',
    port: 3002,
    type: 'admin-panel'
  },

  // Integration Services
  'event-bus': {
    name: 'Event Bus',
    description: 'RTMN Event Bus',
    port: 4510,
    type: 'messaging'
  },
  'service-registry': {
    name: 'Service Registry',
    description: 'RTMN Service Discovery',
    port: 4399,
    type: 'discovery'
  },
  'cross-ecosystem-bridge': {
    name: 'Cross-Ecosystem Bridge',
    description: 'Unified Customer View',
    port: 4898,
    type: 'integration'
  },

  // Foundation Services
  'corp-id': {
    name: 'CorpID',
    description: 'Universal Identity',
    port: 4702,
    type: 'identity'
  },
  'memory-os': {
    name: 'Memory OS',
    description: 'Personal AI Memory',
    port: 4703,
    type: 'memory'
  },
  'twinos-hub': {
    name: 'TwinOS Hub',
    description: 'Digital Twins Registry',
    port: 4705,
    type: 'twins'
  },

  // This Gateway
  'hotel-ecosystem-gateway': {
    name: 'Hotel Ecosystem Gateway',
    description: 'Unified Hotel API Gateway',
    port: 4950,
    type: 'gateway'
  }
};
