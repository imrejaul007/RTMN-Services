import fetch from 'node-fetch';
import winston from 'winston';
import {
  ServiceHealth,
  ServiceCategory,
  CircuitState,
  HealthStats,
  WS_EVENT_TYPE,
  WSEvent
} from '../types';
import { CircuitBreakerMonitor } from './circuitBreakerMonitor';

/**
 * Service endpoints configuration
 */
interface ServiceEndpoint {
  name: string;
  serviceName: string;
  category: ServiceCategory;
  url: string;
  port: number;
}

/**
 * Health Aggregator Service
 * Performs health checks on all services and aggregates status
 */
export class HealthAggregator {
  private logger: winston.Logger;
  private circuitMonitor: CircuitBreakerMonitor;
  private services: Map<string, ServiceHealth> = new Map();
  private wsEmitter?: (event: WSEvent) => void;

  private checkInterval?: NodeJS.Timeout;
  private readonly CHECK_INTERVAL = parseInt(process.env.HEALTH_CHECK_INTERVAL || '15000', 10);
  private readonly HEALTH_ENDPOINT = '/health';
  private readonly TIMEOUT_MS = 5000;

  private readonly serviceEndpoints: ServiceEndpoint[] = [
    // RABTUL Services
    { name: 'auth-service', serviceName: 'Auth Service', category: ServiceCategory.RABTUL, url: process.env.AUTH_SERVICE_URL || 'http://localhost:3000', port: 3000 },
    { name: 'payment-service', serviceName: 'Payment Service', category: ServiceCategory.RABTUL, url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4001', port: 4001 },
    { name: 'wallet-service', serviceName: 'Wallet Service', category: ServiceCategory.RABTUL, url: process.env.WALLET_SERVICE_URL || 'http://localhost:4002', port: 4002 },
    { name: 'order-service', serviceName: 'Order Service', category: ServiceCategory.RABTUL, url: process.env.ORDER_SERVICE_URL || 'http://localhost:4003', port: 4003 },
    { name: 'notifications-service', serviceName: 'Notifications Service', category: ServiceCategory.RABTUL, url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4004', port: 4004 },
    { name: 'search-service', serviceName: 'Search Service', category: ServiceCategory.RABTUL, url: process.env.SEARCH_SERVICE_URL || 'http://localhost:4005', port: 4005 },
    { name: 'analytics-service', serviceName: 'Analytics Service', category: ServiceCategory.RABTUL, url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4006', port: 4006 },
    { name: 'referral-service', serviceName: 'Referral Service', category: ServiceCategory.RABTUL, url: process.env.REFERRAL_SERVICE_URL || 'http://localhost:4007', port: 4007 },
    { name: 'rewards-service', serviceName: 'Rewards Service', category: ServiceCategory.RABTUL, url: process.env.REWARDS_SERVICE_URL || 'http://localhost:4008', port: 4008 },
    { name: 'coupon-service', serviceName: 'Coupon Service', category: ServiceCategory.RABTUL, url: process.env.COUPON_SERVICE_URL || 'http://localhost:4009', port: 4009 },
    { name: 'inventory-service', serviceName: 'Inventory Service', category: ServiceCategory.RABTUL, url: process.env.INVENTORY_SERVICE_URL || 'http://localhost:4010', port: 4010 },
    { name: 'shipping-service', serviceName: 'Shipping Service', category: ServiceCategory.RABTUL, url: process.env.SHIPPING_SERVICE_URL || 'http://localhost:4011', port: 4011 },

    // RTNM-Group Services
    { name: 'dooh-service', serviceName: 'DOOH Service', category: ServiceCategory.RTNM_GROUP, url: process.env.DOOH_SERVICE_URL || 'http://localhost:4018', port: 4018 },
    { name: 'support-dashboard', serviceName: 'Support Dashboard', category: ServiceCategory.RTNM_GROUP, url: process.env.SUPPORT_DASHBOARD_URL || 'http://localhost:4052', port: 4052 },

    // REZ-Media Services
    { name: 'shopify-connector', serviceName: 'Shopify Connector', category: ServiceCategory.REZ_MEDIA, url: process.env.SHOPIFY_CONNECTOR_URL || 'http://localhost:4050', port: 4050 },
    { name: 'woocommerce-connector', serviceName: 'WooCommerce Connector', category: ServiceCategory.REZ_MEDIA, url: process.env.WOOCOMMERCE_CONNECTOR_URL || 'http://localhost:4051', port: 4051 },
    { name: 'prompt-workflow-ai', serviceName: 'Prompt Workflow AI', category: ServiceCategory.REZ_MEDIA, url: process.env.PROMPT_WORKFLOW_AI_URL || 'http://localhost:4054', port: 4054 },
    { name: 'voice-cart-recovery', serviceName: 'Voice Cart Recovery', category: ServiceCategory.REZ_MEDIA, url: process.env.VOICE_CART_RECOVERY_URL || 'http://localhost:4053', port: 4053 },
    { name: 'crm-hub', serviceName: 'CRM Hub', category: ServiceCategory.REZ_MEDIA, url: process.env.CRM_HUB_URL || 'http://localhost:4056', port: 4056 },
    { name: 'support-tools-hub', serviceName: 'Support Tools Hub', category: ServiceCategory.REZ_MEDIA, url: process.env.SUPPORT_TOOLS_HUB_URL || 'http://localhost:4057', port: 4057 },

    // REZ-Intelligence Services
    { name: 'rfm-service', serviceName: 'RFM Service', category: ServiceCategory.REZ_INTELLIGENCE, url: process.env.RFM_SERVICE_URL || 'http://localhost:4055', port: 4055 },
    { name: 'research-agent', serviceName: 'Research Opportunity Agent', category: ServiceCategory.REZ_INTELLIGENCE, url: process.env.RESEARCH_AGENT_URL || 'http://localhost:4058', port: 4058 }
  ];

  constructor(logger: winston.Logger, circuitMonitor: CircuitBreakerMonitor) {
    this.logger = logger;
    this.circuitMonitor = circuitMonitor;
    this.initializeServices();
  }

  /**
   * Set WebSocket emitter for real-time updates
   */
  setWsEmitter(emitter: (event: WSEvent) => void): void {
    this.wsEmitter = emitter;
  }

  /**
   * Initialize service health records
   */
  private initializeServices(): void {
    for (const endpoint of this.serviceEndpoints) {
      const health: ServiceHealth = {
        name: endpoint.name,
        category: endpoint.category,
        url: endpoint.url,
        port: endpoint.port,
        status: 'unknown',
        responseTime: null,
        lastCheck: new Date(0),
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        uptimePercentage: 100,
        circuitState: CircuitState.CLOSED
      };
      this.services.set(endpoint.name, health);
    }
    this.logger.info(`Initialized ${this.services.size} service health records`);
  }

  /**
   * Start health check loop
   */
  startHealthChecks(): void {
    // Run initial check
    this.runHealthChecks().catch(err => {
      this.logger.error('Initial health check failed:', err);
    });

    // Schedule periodic checks
    this.checkInterval = setInterval(() => {
      this.runHealthChecks().catch(err => {
        this.logger.error('Periodic health check failed:', err);
      });
    }, this.CHECK_INTERVAL);

    this.logger.info(`Health check loop started (interval: ${this.CHECK_INTERVAL}ms)`);
  }

  /**
   * Stop health check loop
   */
  stopHealthChecks(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    this.logger.info('Health check loop stopped');
  }

  /**
   * Run health checks on all services
   */
  async runHealthChecks(): Promise<void> {
    const checkPromises = this.serviceEndpoints.map(endpoint =>
      this.checkService(endpoint).catch(err => {
        this.logger.error(`Health check failed for ${endpoint.name}:`, err);
        return null;
      })
    );

    await Promise.all(checkPromises);

    // Emit health stats update
    if (this.wsEmitter) {
      this.wsEmitter({
        type: WS_EVENT_TYPE.HEALTH_STATS_UPDATED,
        payload: this.getHealthStats(),
        timestamp: new Date()
      });
    }
  }

  /**
   * Check health of a single service
   */
  private async checkService(endpoint: ServiceEndpoint): Promise<ServiceHealth> {
    const health = this.services.get(endpoint.name)!;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.TIMEOUT_MS);

      const response = await fetch(`${endpoint.url}${this.HEALTH_ENDPOINT}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'REZ-CircuitBreaker/1.0'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;
      health.responseTime = responseTime;
      health.lastCheck = new Date();

      if (response.ok) {
        // Try to parse response body for version info
        try {
          const data = await response.json();
          health.version = data.version || data.buildVersion || undefined;
        } catch {
          // Body parsing failed, continue without version
        }

        health.consecutiveSuccesses++;
        health.consecutiveFailures = 0;

        // Determine status based on response time and circuit state
        const circuit = this.circuitMonitor.getCircuit(endpoint.name);
        health.circuitState = circuit?.state || CircuitState.CLOSED;

        if (responseTime > 3000) {
          health.status = 'degraded';
        } else if (health.circuitState === CircuitState.OPEN) {
          health.status = 'degraded';
        } else {
          health.status = 'healthy';
        }
      } else {
        health.consecutiveFailures++;
        health.consecutiveSuccesses = 0;
        health.status = 'unhealthy';

        // Record failure in circuit breaker
        const circuit = this.circuitMonitor.getCircuit(endpoint.name);
        if (circuit) {
          await this.circuitMonitor.recordFailure(
            endpoint.name,
            'HTTP_ERROR',
            `HTTP ${response.status}: ${response.statusText}`,
            responseTime
          );
          health.circuitState = circuit.state;
        }
      }

      // Update uptime percentage
      this.updateUptime(health);

    } catch (error) {
      const responseTime = Date.now() - startTime;
      health.responseTime = responseTime;
      health.lastCheck = new Date();
      health.consecutiveFailures++;
      health.consecutiveSuccesses = 0;
      health.status = 'unhealthy';

      // Record failure in circuit breaker
      const circuit = this.circuitMonitor.getCircuit(endpoint.name);
      if (circuit) {
        await this.circuitMonitor.recordFailure(
          endpoint.name,
          error instanceof Error ? error.name : 'NETWORK_ERROR',
          error instanceof Error ? error.message : 'Service unreachable',
          responseTime
        );
        health.circuitState = circuit.state;
      }

      this.updateUptime(health);
    }

    // Emit health change if significant
    if (this.wsEmitter) {
      this.wsEmitter({
        type: WS_EVENT_TYPE.SERVICE_HEALTH_CHANGED,
        payload: health,
        timestamp: new Date()
      });
    }

    return health;
  }

  /**
   * Update uptime percentage
   */
  private updateUptime(health: ServiceHealth): void {
    const totalChecks = health.consecutiveSuccesses + health.consecutiveFailures;
    if (totalChecks > 0) {
      health.uptimePercentage = (health.consecutiveSuccesses / totalChecks) * 100;
    }
  }

  /**
   * Get health status of all services
   */
  getAllServices(): ServiceHealth[] {
    return Array.from(this.services.values());
  }

  /**
   * Get health status of a specific service
   */
  getService(name: string): ServiceHealth | undefined {
    return this.services.get(name);
  }

  /**
   * Get services by category
   */
  getServicesByCategory(category: ServiceCategory): ServiceHealth[] {
    return Array.from(this.services.values()).filter(s => s.category === category);
  }

  /**
   * Get services by status
   */
  getServicesByStatus(status: ServiceHealth['status']): ServiceHealth[] {
    return Array.from(this.services.values()).filter(s => s.status === status);
  }

  /**
   * Get aggregate health statistics
   */
  getHealthStats(): HealthStats {
    const services = Array.from(this.services.values());
    const circuits = this.circuitMonitor.getAllCircuits();

    const healthyServices = services.filter(s => s.status === 'healthy').length;
    const unhealthyServices = services.filter(s => s.status === 'unhealthy').length;
    const degradedServices = services.filter(s => s.status === 'degraded').length;
    const unknownServices = services.filter(s => s.status === 'unknown').length;

    const openCircuits = circuits.filter(c => c.state === CircuitState.OPEN).length;
    const halfOpenCircuits = circuits.filter(c => c.state === CircuitState.HALF_OPEN).length;
    const closedCircuits = circuits.filter(c => c.state === CircuitState.CLOSED).length;

    // Calculate average response time
    const responseTimes = services
      .filter(s => s.responseTime !== null)
      .map(s => s.responseTime!);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, rt) => sum + rt, 0) / responseTimes.length
      : 0;

    // Calculate 24h failure rate from circuits
    const totalRequests = circuits.reduce((sum, c) => sum + c.totalRequests, 0);
    const totalFailures = circuits.reduce((sum, c) => sum + c.failedRequests, 0);
    const failureRate24h = totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0;

    // Calculate overall uptime
    const uptimePercentages = services.map(s => s.uptimePercentage);
    const overallUptime = uptimePercentages.length > 0
      ? uptimePercentages.reduce((sum, up) => sum + up, 0) / uptimePercentages.length
      : 100;

    return {
      totalServices: services.length,
      healthyServices,
      unhealthyServices,
      degradedServices,
      unknownServices,
      overallHealthPercentage: (healthyServices / services.length) * 100,
      openCircuits,
      halfOpenCircuits,
      closedCircuits,
      averageResponseTime: Math.round(averageResponseTime),
      totalFailures24h: totalFailures,
      totalRequests24h: totalRequests,
      failureRate24h: Math.round(failureRate24h * 100) / 100,
      uptimePercentage: Math.round(overallUptime * 100) / 100
    };
  }

  /**
   * Get service categories summary
   */
  getCategorySummary(): Record<ServiceCategory, {
    total: number;
    healthy: number;
    unhealthy: number;
    degraded: number;
    healthPercentage: number;
  }> {
    const summary: Record<ServiceCategory, {
      total: number;
      healthy: number;
      unhealthy: number;
      degraded: number;
      healthPercentage: number;
    }> = {} as Record<ServiceCategory, {
      total: number;
      healthy: number;
      unhealthy: number;
      degraded: number;
      healthPercentage: number;
    }>;

    for (const category of Object.values(ServiceCategory)) {
      const categoryServices = this.getServicesByCategory(category);
      const healthy = categoryServices.filter(s => s.status === 'healthy').length;
      const unhealthy = categoryServices.filter(s => s.status === 'unhealthy').length;
      const degraded = categoryServices.filter(s => s.status === 'degraded').length;

      summary[category] = {
        total: categoryServices.length,
        healthy,
        unhealthy,
        degraded,
        healthPercentage: categoryServices.length > 0
          ? (healthy / categoryServices.length) * 100
          : 0
      };
    }

    return summary;
  }

  /**
   * Force a health check on a specific service
   */
  async forceCheck(name: string): Promise<ServiceHealth | null> {
    const endpoint = this.serviceEndpoints.find(e => e.name === name);
    if (!endpoint) {
      return null;
    }
    return this.checkService(endpoint);
  }

  /**
   * Force a health check on all services
   */
  async forceCheckAll(): Promise<ServiceHealth[]> {
    const results: ServiceHealth[] = [];
    for (const endpoint of this.serviceEndpoints) {
      const result = await this.checkService(endpoint);
      results.push(result);
    }
    return results;
  }

  /**
   * Add a custom service endpoint
   */
  addService(name: string, serviceName: string, category: ServiceCategory, url: string, port: number): void {
    const health: ServiceHealth = {
      name,
      serviceName,
      category,
      url,
      port,
      status: 'unknown',
      responseTime: null,
      lastCheck: new Date(0),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      uptimePercentage: 100,
      circuitState: CircuitState.CLOSED
    };
    this.services.set(name, health);
    this.serviceEndpoints.push({ name, serviceName, category, url, port });
    this.logger.info(`Added service endpoint: ${name} (${url})`);
  }

  /**
   * Remove a service endpoint
   */
  removeService(name: string): boolean {
    const deleted = this.services.delete(name);
    const index = this.serviceEndpoints.findIndex(e => e.name === name);
    if (index !== -1) {
      this.serviceEndpoints.splice(index, 1);
    }
    if (deleted) {
      this.logger.info(`Removed service endpoint: ${name}`);
    }
    return deleted;
  }
}
