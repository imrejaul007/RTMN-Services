import axios from 'axios';
import NodeCache from 'node-cache';
import { logger } from '../utils/logger';

const ECOSYSTEM_CONNECTOR_URL = process.env.ECOSYSTEM_CONNECTOR_URL || 'http://localhost:4399';
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300');

interface ServiceInfo {
  name: string;
  port: number;
  type: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface DiscoveredService {
  name: string;
  url: string;
  type: string;
  metadata?: Record<string, unknown>;
}

class ServiceRegistry {
  private cache: NodeCache;
  private registeredServices: Map<string, ServiceInfo> = new Map();

  constructor() {
    this.cache = new NodeCache({ stdTTL: CACHE_TTL });
  }

  /**
   * Register this service with the ecosystem connector
   */
  async registerService(service: ServiceInfo): Promise<boolean> {
    try {
      await axios.post(`${ECOSYSTEM_CONNECTOR_URL}/api/services/register`, {
        name: service.name,
        port: service.port,
        type: service.type,
        url: `http://localhost:${service.port}`,
        metadata: service.metadata,
        healthCheck: `http://localhost:${service.port}/health`
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.registeredServices.set(service.name, service);
      this.cache.set(`service:${service.name}`, service);

      logger.info(`Registered service: ${service.name}`);
      return true;
    } catch (error) {
      logger.error(`Failed to register service: ${service.name}`, error);
      return false;
    }
  }

  /**
   * Discover available services
   */
  async discoverServices(): Promise<DiscoveredService[]> {
    try {
      const response = await axios.get(`${ECOSYSTEM_CONNECTOR_URL}/api/services`, {
        timeout: 5000
      });

      const services: DiscoveredService[] = response.data.services || [];

      // Cache discovered services
      services.forEach(service => {
        this.cache.set(`discovered:${service.name}`, service);
      });

      logger.info(`Discovered ${services.length} services`);
      return services;
    } catch (error) {
      logger.error('Failed to discover services:', error);
      return [];
    }
  }

  /**
   * Get service URL by name
   */
  async getServiceUrl(serviceName: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get<ServiceInfo>(`service:${serviceName}`);
    if (cached) {
      return cached.url || `http://localhost:${cached.port}`;
    }

    try {
      const response = await axios.get(
        `${ECOSYSTEM_CONNECTOR_URL}/api/services/${serviceName}`,
        { timeout: 3000 }
      );

      const service = response.data;
      this.cache.set(`service:${serviceName}`, service);

      return service.url || `http://localhost:${service.port}`;
    } catch {
      // Service not found
      return null;
    }
  }

  /**
   * Get all services of a specific type
   */
  async getServicesByType(type: string): Promise<DiscoveredService[]> {
    try {
      const response = await axios.get(
        `${ECOSYSTEM_CONNECTOR_URL}/api/services?type=${type}`,
        { timeout: 3000 }
      );

      return response.data.services || [];
    } catch {
      return [];
    }
  }

  /**
   * Deregister service
   */
  async deregisterService(serviceName: string): Promise<boolean> {
    try {
      await axios.delete(`${ECOSYSTEM_CONNECTOR_URL}/api/services/${serviceName}`, {
        timeout: 5000
      });

      this.registeredServices.delete(serviceName);
      this.cache.del(`service:${serviceName}`);

      logger.info(`Deregistered service: ${serviceName}`);
      return true;
    } catch (error) {
      logger.error(`Failed to deregister service: ${serviceName}`, error);
      return false;
    }
  }

  /**
   * Update service heartbeat
   */
  async heartbeat(serviceName: string): Promise<boolean> {
    try {
      await axios.post(
        `${ECOSYSTEM_CONNECTOR_URL}/api/services/${serviceName}/heartbeat`,
        { timestamp: new Date().toISOString() },
        { timeout: 3000 }
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get local registered services
   */
  getRegisteredServices(): ServiceInfo[] {
    return Array.from(this.registeredServices.values());
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }
}

export const serviceRegistry = new ServiceRegistry();

// Convenience functions
export async function registerService(service: ServiceInfo): Promise<boolean> {
  return serviceRegistry.registerService(service);
}

export async function discoverServices(): Promise<DiscoveredService[]> {
  return serviceRegistry.discoverServices();
}

export async function getServiceUrl(serviceName: string): Promise<string | null> {
  return serviceRegistry.getServiceUrl(serviceName);
}

export async function getServicesByType(type: string): Promise<DiscoveredService[]> {
  return serviceRegistry.getServicesByType(type);
}
