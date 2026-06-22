import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import {
  CircuitBreaker,
  CircuitBreakerConfig,
  CircuitState,
  ServiceCategory,
  FailureRecord,
  RecoveryRecord,
  WS_EVENT_TYPE,
  WSEvent
} from '../types';

/**
 * Circuit Breaker Monitor Service
 * Manages circuit breaker states, tracks failures, and handles state transitions
 */
export class CircuitBreakerMonitor {
  private redis: Redis;
  private logger: winston.Logger;
  private circuits: Map<string, CircuitBreaker> = new Map();
  private failureRecords: Map<string, FailureRecord[]> = new Map();
  private recoveryRecords: Map<string, RecoveryRecord[]> = new Map();
  private wsEmitter?: (event: WSEvent) => void;

  private readonly DEFAULT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: parseInt(process.env.CIRCUIT_FAILURE_THRESHOLD || '5', 10),
    successThreshold: parseInt(process.env.CIRCUIT_SUCCESS_THRESHOLD || '3', 10),
    timeout: parseInt(process.env.CIRCUIT_TIMEOUT_MS || '60000', 10),
    resetTimeout: parseInt(process.env.CIRCUIT_RESET_TIMEOUT_MS || '30000', 10),
    halfOpenMaxCalls: 5
  };

  private readonly KEY_PREFIX = process.env.REDIS_KEY_PREFIX || 'rez:circuit-breaker:';

  constructor(redis: Redis, logger: winston.Logger) {
    this.redis = redis;
    this.logger = logger;
    this.initializeDefaultCircuits();
  }

  /**
   * Set WebSocket emitter for real-time updates
   */
  setWsEmitter(emitter: (event: WSEvent) => void): void {
    this.wsEmitter = emitter;
  }

  /**
   * Initialize default circuit breakers for REZ ecosystem services
   */
  private initializeDefaultCircuits(): void {
    const services = [
      // RABTUL Services
      { name: 'auth-service', serviceName: 'Auth Service', category: ServiceCategory.RABTUL, port: 3000 },
      { name: 'payment-service', serviceName: 'Payment Service', category: ServiceCategory.RABTUL, port: 4001 },
      { name: 'wallet-service', serviceName: 'Wallet Service', category: ServiceCategory.RABTUL, port: 4002 },
      { name: 'order-service', serviceName: 'Order Service', category: ServiceCategory.RABTUL, port: 4003 },
      { name: 'notifications-service', serviceName: 'Notifications Service', category: ServiceCategory.RABTUL, port: 4004 },
      { name: 'search-service', serviceName: 'Search Service', category: ServiceCategory.RABTUL, port: 4005 },
      { name: 'analytics-service', serviceName: 'Analytics Service', category: ServiceCategory.RABTUL, port: 4006 },
      { name: 'referral-service', serviceName: 'Referral Service', category: ServiceCategory.RABTUL, port: 4007 },
      { name: 'rewards-service', serviceName: 'Rewards Service', category: ServiceCategory.RABTUL, port: 4008 },
      { name: 'coupon-service', serviceName: 'Coupon Service', category: ServiceCategory.RABTUL, port: 4009 },
      { name: 'inventory-service', serviceName: 'Inventory Service', category: ServiceCategory.RABTUL, port: 4010 },
      { name: 'shipping-service', serviceName: 'Shipping Service', category: ServiceCategory.RABTUL, port: 4011 },

      // RTNM-Group Services
      { name: 'dooh-service', serviceName: 'DOOH Service', category: ServiceCategory.RTNM_GROUP, port: 4018 },
      { name: 'payment-correctness', serviceName: 'Payment Correctness', category: ServiceCategory.RTNM_GROUP, port: 4020 },
      { name: 'fraud-service', serviceName: 'Fraud Service', category: ServiceCategory.RTNM_GROUP, port: 4022 },
      { name: 'feedback-service', serviceName: 'Feedback Service', category: ServiceCategory.RTNM_GROUP, port: 4010 },
      { name: 'marketing-service', serviceName: 'Marketing Service', category: ServiceCategory.RTNM_GROUP, port: 4026 },
      { name: 'webhook-service', serviceName: 'Webhook Service', category: ServiceCategory.RTNM_GROUP, port: 4034 },
      { name: 'return-service', serviceName: 'Return Service', category: ServiceCategory.RTNM_GROUP, port: 4031 },
      { name: 'cohort-service', serviceName: 'Cohort Service', category: ServiceCategory.RTNM_GROUP, port: 4027 },
      { name: 'capital-service', serviceName: 'Capital Service', category: ServiceCategory.RTNM_GROUP, port: 3005 },
      { name: 'central-permissions', serviceName: 'Central Permissions', category: ServiceCategory.RTNM_GROUP, port: 3001 },
      { name: 'identity-service', serviceName: 'Identity Service', category: ServiceCategory.RTNM_GROUP, port: 4001 },
      { name: 'support-dashboard', serviceName: 'Support Dashboard', category: ServiceCategory.RTNM_GROUP, port: 4052 },

      // REZ-Media Services
      { name: 'ad-ai', serviceName: 'Ad AI', category: ServiceCategory.REZ_MEDIA, port: 4021 },
      { name: 'ai-campaign-builder', serviceName: 'AI Campaign Builder', category: ServiceCategory.REZ_MEDIA, port: 4009 },
      { name: 'discovery-platform', serviceName: 'Discovery Platform', category: ServiceCategory.REZ_MEDIA, port: 3000 },
      { name: 'economic-engine', serviceName: 'Economic Engine', category: ServiceCategory.REZ_MEDIA, port: 4016 },
      { name: 'engagement-platform', serviceName: 'Engagement Platform', category: ServiceCategory.REZ_MEDIA, port: 4017 },
      { name: 'journey-service', serviceName: 'Journey Service', category: ServiceCategory.REZ_MEDIA, port: 4019 },
      { name: 'media-events', serviceName: 'Media Events', category: ServiceCategory.REZ_MEDIA, port: 4029 },
      { name: 'pricing-engine', serviceName: 'Pricing Engine', category: ServiceCategory.REZ_MEDIA, port: 4015 },
      { name: 'whatsapp-commerce', serviceName: 'WhatsApp Commerce', category: ServiceCategory.REZ_MEDIA, port: 4030 },
      { name: 'automation-service', serviceName: 'Automation Service', category: ServiceCategory.REZ_MEDIA, port: 4028 },
      { name: 'instagram-sales-agent', serviceName: 'Instagram Sales Agent', category: ServiceCategory.REZ_MEDIA, port: 4032 },
      { name: 'shopify-connector', serviceName: 'Shopify Connector', category: ServiceCategory.REZ_MEDIA, port: 4050 },
      { name: 'woocommerce-connector', serviceName: 'WooCommerce Connector', category: ServiceCategory.REZ_MEDIA, port: 4051 },

      // AI Marketing
      { name: 'prompt-workflow-ai', serviceName: 'Prompt Workflow AI', category: ServiceCategory.REZ_MEDIA, port: 4054 },
      { name: 'crm-hub', serviceName: 'CRM Hub', category: ServiceCategory.REZ_MEDIA, port: 4056 },
      { name: 'support-tools-hub', serviceName: 'Support Tools Hub', category: ServiceCategory.REZ_MEDIA, port: 4057 },
      { name: 'voice-cart-recovery', serviceName: 'Voice Cart Recovery', category: ServiceCategory.REZ_MEDIA, port: 4053 },

      // REZ-Intelligence Services
      { name: 'intent-graph', serviceName: 'Intent Graph', category: ServiceCategory.REZ_INTELLIGENCE, port: 3000 },
      { name: 'feedback-collector', serviceName: 'Feedback Collector', category: ServiceCategory.REZ_INTELLIGENCE, port: 3000 },
      { name: 'lead-intelligence', serviceName: 'Lead Intelligence', category: ServiceCategory.REZ_INTELLIGENCE, port: 3000 },
      { name: 'rfm-service', serviceName: 'RFM Service', category: ServiceCategory.REZ_INTELLIGENCE, port: 4055 },
      { name: 'research-opportunity-agent', serviceName: 'Research Opportunity Agent', category: ServiceCategory.REZ_INTELLIGENCE, port: 4058 },

      // StayOwn Services
      { name: 'hotel-ota', serviceName: 'Hotel OTA', category: ServiceCategory.STAY_OWN, port: 4016 },
      { name: 'room-qr', serviceName: 'Room QR', category: ServiceCategory.STAY_OWN, port: 4017 },
      { name: 'habixo', serviceName: 'Habixo', category: ServiceCategory.STAY_OWN, port: 4018 }
    ];

    for (const service of services) {
      const circuit: CircuitBreaker = {
        name: service.name,
        serviceName: service.serviceName,
        category: service.category,
        state: CircuitState.CLOSED,
        config: { ...this.DEFAULT_CONFIG },
        failureCount: 0,
        successCount: 0,
        lastFailure: null,
        lastSuccess: null,
        openedAt: null,
        closedAt: null,
        halfOpenAt: null,
        totalRequests: 0,
        failedRequests: 0,
        successfulRequests: 0,
        lastUpdated: new Date()
      };
      this.circuits.set(service.name, circuit);
    }

    this.logger.info(`Initialized ${services.length} circuit breakers`);
  }

  /**
   * Record a successful request
   */
  async recordSuccess(circuitName: string, duration: number): Promise<void> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      this.logger.warn(`Circuit not found: ${circuitName}`);
      return;
    }

    circuit.totalRequests++;
    circuit.successfulRequests++;
    circuit.successCount++;
    circuit.lastSuccess = new Date();
    circuit.lastUpdated = new Date();

    if (circuit.state === CircuitState.HALF_OPEN) {
      if (circuit.successCount >= circuit.config.successThreshold) {
        await this.transitionToClosed(circuit);
      }
    } else {
      // Reset failure count on success in closed state
      circuit.failureCount = 0;
    }

    await this.persistCircuitState(circuit);
    this.emitStateChange(circuit, 'success');
  }

  /**
   * Record a failed request
   */
  async recordFailure(
    circuitName: string,
    errorType: string,
    errorMessage: string,
    duration: number
  ): Promise<void> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) {
      this.logger.warn(`Circuit not found: ${circuitName}`);
      return;
    }

    circuit.totalRequests++;
    circuit.failedRequests++;
    circuit.failureCount++;
    circuit.lastFailure = new Date();
    circuit.lastUpdated = new Date();

    // Record failure for historical data
    this.recordFailureEvent(circuit, errorType, errorMessage, duration);

    if (circuit.state === CircuitState.CLOSED) {
      if (circuit.failureCount >= circuit.config.failureThreshold) {
        await this.transitionToOpen(circuit);
      }
    } else if (circuit.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open goes back to open
      await this.transitionToOpen(circuit);
    }

    await this.persistCircuitState(circuit);
    this.emitStateChange(circuit, 'failure');
  }

  /**
   * Transition circuit to OPEN state
   */
  private async transitionToOpen(circuit: CircuitBreaker): Promise<void> {
    const previousState = circuit.state;
    circuit.state = CircuitState.OPEN;
    circuit.openedAt = new Date();
    circuit.halfOpenAt = null;
    circuit.successCount = 0;

    this.logger.warn(`Circuit OPENED: ${circuit.name} (previous: ${previousState})`);

    // Schedule transition to half-open after timeout
    setTimeout(async () => {
      if (circuit.state === CircuitState.OPEN) {
        await this.transitionToHalfOpen(circuit);
      }
    }, circuit.config.timeout);

    await this.persistCircuitState(circuit);
    this.emitStateChange(circuit, 'open');
  }

  /**
   * Transition circuit to HALF_OPEN state
   */
  private async transitionToHalfOpen(circuit: CircuitBreaker): Promise<void> {
    const previousState = circuit.state;
    circuit.state = CircuitState.HALF_OPEN;
    circuit.halfOpenAt = new Date();
    circuit.successCount = 0;
    circuit.failureCount = 0;

    this.logger.info(`Circuit HALF_OPEN: ${circuit.name} (previous: ${previousState})`);

    await this.persistCircuitState(circuit);
    this.emitStateChange(circuit, 'half_open');
  }

  /**
   * Transition circuit to CLOSED state
   */
  private async transitionToClosed(circuit: CircuitBreaker): Promise<void> {
    const previousState = circuit.state;
    circuit.state = CircuitState.CLOSED;
    circuit.closedAt = new Date();
    circuit.halfOpenAt = null;
    circuit.failureCount = 0;
    circuit.successCount = 0;

    // Record recovery if coming from open
    if (previousState === CircuitState.OPEN && circuit.openedAt) {
      this.recordRecovery(circuit, previousState);
    }

    this.logger.info(`Circuit CLOSED: ${circuit.name} (previous: ${previousState})`);

    await this.persistCircuitState(circuit);
    this.emitStateChange(circuit, 'close');
  }

  /**
   * Record a failure event for historical tracking
   */
  private recordFailureEvent(
    circuit: CircuitBreaker,
    errorType: string,
    errorMessage: string,
    duration: number
  ): void {
    const record: FailureRecord = {
      id: uuidv4(),
      serviceName: circuit.serviceName,
      circuitName: circuit.name,
      timestamp: new Date(),
      errorType,
      errorMessage,
      duration,
      circuitState: circuit.state
    };

    const records = this.failureRecords.get(circuit.name) || [];
    records.push(record);

    // Keep only last 1000 records in memory
    if (records.length > 1000) {
      records.shift();
    }

    this.failureRecords.set(circuit.name, records);

    // Persist to Redis
    this.persistFailureRecord(record);
  }

  /**
   * Record a recovery event
   */
  private recordRecovery(circuit: CircuitBreaker, previousState: CircuitState): void {
    if (!circuit.openedAt) return;

    const record: RecoveryRecord = {
      id: uuidv4(),
      serviceName: circuit.serviceName,
      circuitName: circuit.name,
      timestamp: new Date(),
      downtimeDuration: Date.now() - circuit.openedAt.getTime(),
      failureCount: circuit.failedRequests,
      wasAutomatic: previousState === CircuitState.HALF_OPEN
    };

    const records = this.recoveryRecords.get(circuit.name) || [];
    records.push(record);

    // Keep only last 500 records
    if (records.length > 500) {
      records.shift();
    }

    this.recoveryRecords.set(circuit.name, records);

    // Persist to Redis
    this.persistRecoveryRecord(record);

    // Emit recovery event
    if (this.wsEmitter) {
      this.wsEmitter({
        type: WS_EVENT_TYPE.RECOVERY_DETECTED,
        payload: record,
        timestamp: new Date()
      });
    }
  }

  /**
   * Persist circuit state to Redis
   */
  private async persistCircuitState(circuit: CircuitBreaker): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}circuit:${circuit.name}`;
      await this.redis.hmset(key, {
        state: circuit.state,
        failureCount: circuit.failureCount.toString(),
        successCount: circuit.successCount.toString(),
        lastFailure: circuit.lastFailure?.toISOString() || '',
        lastSuccess: circuit.lastSuccess?.toISOString() || '',
        openedAt: circuit.openedAt?.toISOString() || '',
        closedAt: circuit.closedAt?.toISOString() || '',
        halfOpenAt: circuit.halfOpenAt?.toISOString() || '',
        totalRequests: circuit.totalRequests.toString(),
        failedRequests: circuit.failedRequests.toString(),
        successfulRequests: circuit.successfulRequests.toString(),
        lastUpdated: new Date().toISOString()
      });
      await this.redis.expire(key, 86400); // 24 hour TTL
    } catch (error) {
      this.logger.error(`Failed to persist circuit state for ${circuit.name}:`, error);
    }
  }

  /**
   * Persist failure record to Redis
   */
  private async persistFailureRecord(record: FailureRecord): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}failures:${record.circuitName}`;
      await this.redis.lpush(key, JSON.stringify(record));
      await this.redis.ltrim(key, 0, 999); // Keep last 1000
      await this.redis.expire(key, 86400 * 7); // 7 day TTL
    } catch (error) {
      this.logger.error(`Failed to persist failure record:`, error);
    }
  }

  /**
   * Persist recovery record to Redis
   */
  private async persistRecoveryRecord(record: RecoveryRecord): Promise<void> {
    try {
      const key = `${this.KEY_PREFIX}recoveries:${record.circuitName}`;
      await this.redis.lpush(key, JSON.stringify(record));
      await this.redis.ltrim(key, 0, 499); // Keep last 500
      await this.redis.expire(key, 86400 * 30); // 30 day TTL
    } catch (error) {
      this.logger.error(`Failed to persist recovery record:`, error);
    }
  }

  /**
   * Load circuit states from Redis
   */
  async loadFromRedis(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.KEY_PREFIX}circuit:*`);
      for (const key of keys) {
        const name = key.replace(`${this.KEY_PREFIX}circuit:`, '');
        const data = await this.redis.hgetall(key);

        const circuit = this.circuits.get(name);
        if (circuit && Object.keys(data).length > 0) {
          circuit.state = data.state as CircuitState;
          circuit.failureCount = parseInt(data.failureCount, 10) || 0;
          circuit.successCount = parseInt(data.successCount, 10) || 0;
          circuit.lastFailure = data.lastFailure ? new Date(data.lastFailure) : null;
          circuit.lastSuccess = data.lastSuccess ? new Date(data.lastSuccess) : null;
          circuit.openedAt = data.openedAt ? new Date(data.openedAt) : null;
          circuit.closedAt = data.closedAt ? new Date(data.closedAt) : null;
          circuit.halfOpenAt = data.halfOpenAt ? new Date(data.halfOpenAt) : null;
          circuit.totalRequests = parseInt(data.totalRequests, 10) || 0;
          circuit.failedRequests = parseInt(data.failedRequests, 10) || 0;
          circuit.successfulRequests = parseInt(data.successfulRequests, 10) || 0;
          circuit.lastUpdated = new Date(data.lastUpdated);

          // Check if open circuit should transition to half-open
          if (circuit.state === CircuitState.OPEN && circuit.openedAt) {
            const elapsed = Date.now() - circuit.openedAt.getTime();
            if (elapsed >= circuit.config.timeout) {
              await this.transitionToHalfOpen(circuit);
            } else {
              // Schedule transition
              setTimeout(async () => {
                if (circuit.state === CircuitState.OPEN) {
                  await this.transitionToHalfOpen(circuit);
                }
              }, circuit.config.timeout - elapsed);
            }
          }
        }
      }
      this.logger.info(`Loaded ${keys.length} circuit states from Redis`);
    } catch (error) {
      this.logger.error('Failed to load circuit states from Redis:', error);
    }
  }

  /**
   * Emit state change event via WebSocket
   */
  private emitStateChange(
    circuit: CircuitBreaker,
    eventType: 'success' | 'failure' | 'open' | 'half_open' | 'close'
  ): void {
    if (!this.wsEmitter) return;

    const eventMap: Record<string, WS_EVENT_TYPE> = {
      open: WS_EVENT_TYPE.CIRCUIT_STATE_CHANGED,
      half_open: WS_EVENT_TYPE.CIRCUIT_STATE_CHANGED,
      close: WS_EVENT_TYPE.CIRCUIT_STATE_CHANGED,
      success: WS_EVENT_TYPE.CIRCUIT_STATE_CHANGED,
      failure: WS_EVENT_TYPE.CIRCUIT_STATE_CHANGED
    };

    this.wsEmitter({
      type: eventMap[eventType],
      payload: {
        circuit: circuit.name,
        serviceName: circuit.serviceName,
        state: circuit.state,
        eventType,
        failureCount: circuit.failureCount,
        successCount: circuit.successCount,
        lastFailure: circuit.lastFailure,
        lastSuccess: circuit.lastSuccess
      },
      timestamp: new Date()
    });
  }

  /**
   * Get all circuits
   */
  getAllCircuits(): CircuitBreaker[] {
    return Array.from(this.circuits.values());
  }

  /**
   * Get circuit by name
   */
  getCircuit(name: string): CircuitBreaker | undefined {
    return this.circuits.get(name);
  }

  /**
   * Get circuits by category
   */
  getCircuitsByCategory(category: ServiceCategory): CircuitBreaker[] {
    return Array.from(this.circuits.values()).filter(c => c.category === category);
  }

  /**
   * Get circuits by state
   */
  getCircuitsByState(state: CircuitState): CircuitBreaker[] {
    return Array.from(this.circuits.values()).filter(c => c.state === state);
  }

  /**
   * Get failure records for a circuit
   */
  getFailureRecords(circuitName: string, limit: number = 100): FailureRecord[] {
    const records = this.failureRecords.get(circuitName) || [];
    return records.slice(0, limit);
  }

  /**
   * Get recovery records for a circuit
   */
  getRecoveryRecords(circuitName: string, limit: number = 50): RecoveryRecord[] {
    const records = this.recoveryRecords.get(circuitName) || [];
    return records.slice(0, limit);
  }

  /**
   * Get all recent failures across all circuits
   */
  getAllRecentFailures(limit: number = 100): FailureRecord[] {
    const allRecords: FailureRecord[] = [];
    for (const records of this.failureRecords.values()) {
      allRecords.push(...records);
    }
    return allRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get all recent recoveries across all circuits
   */
  getAllRecentRecoveries(limit: number = 50): RecoveryRecord[] {
    const allRecords: RecoveryRecord[] = [];
    for (const records of this.recoveryRecords.values()) {
      allRecords.push(...records);
    }
    return allRecords
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get circuit statistics
   */
  getStats(): {
    total: number;
    open: number;
    closed: number;
    halfOpen: number;
    totalRequests: number;
    totalFailures: number;
    totalSuccesses: number;
    failureRate: number;
  } {
    const circuits = Array.from(this.circuits.values());
    const total = circuits.length;
    const open = circuits.filter(c => c.state === CircuitState.OPEN).length;
    const closed = circuits.filter(c => c.state === CircuitState.CLOSED).length;
    const halfOpen = circuits.filter(c => c.state === CircuitState.HALF_OPEN).length;

    const totalRequests = circuits.reduce((sum, c) => sum + c.totalRequests, 0);
    const totalFailures = circuits.reduce((sum, c) => sum + c.failedRequests, 0);
    const totalSuccesses = circuits.reduce((sum, c) => sum + c.successfulRequests, 0);
    const failureRate = totalRequests > 0 ? (totalFailures / totalRequests) * 100 : 0;

    return { total, open, closed, halfOpen, totalRequests, totalFailures, totalSuccesses, failureRate };
  }

  /**
   * Update circuit configuration
   */
  updateConfig(circuitName: string, config: Partial<CircuitBreakerConfig>): boolean {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return false;

    circuit.config = { ...circuit.config, ...config };
    circuit.lastUpdated = new Date();
    return true;
  }

  /**
   * Force circuit to a specific state (for manual intervention)
   */
  async forceState(circuitName: string, state: CircuitState): Promise<boolean> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return false;

    const previousState = circuit.state;
    circuit.state = state;
    circuit.lastUpdated = new Date();

    if (state === CircuitState.OPEN) {
      circuit.openedAt = new Date();
      circuit.halfOpenAt = null;
    } else if (state === CircuitState.CLOSED) {
      circuit.closedAt = new Date();
      circuit.halfOpenAt = null;
      circuit.failureCount = 0;
      circuit.successCount = 0;
    } else if (state === CircuitState.HALF_OPEN) {
      circuit.halfOpenAt = new Date();
      circuit.successCount = 0;
      circuit.failureCount = 0;
    }

    await this.persistCircuitState(circuit);
    this.logger.warn(`Circuit ${circuitName} manually set to ${state} (previous: ${previousState})`);

    this.emitStateChange(circuit, state === CircuitState.OPEN ? 'open' : state === CircuitState.HALF_OPEN ? 'half_open' : 'close');

    return true;
  }

  /**
   * Reset circuit statistics (keep state but clear counters)
   */
  async resetCounters(circuitName: string): Promise<boolean> {
    const circuit = this.circuits.get(circuitName);
    if (!circuit) return false;

    circuit.failureCount = 0;
    circuit.successCount = 0;
    circuit.totalRequests = 0;
    circuit.failedRequests = 0;
    circuit.successfulRequests = 0;
    circuit.lastUpdated = new Date();

    await this.persistCircuitState(circuit);
    return true;
  }
}
