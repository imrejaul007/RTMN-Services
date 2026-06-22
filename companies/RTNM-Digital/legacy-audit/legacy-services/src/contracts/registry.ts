/**
 * REZ Integration Hub - Service Contracts
 *
 * Standardized contracts for all services
 * Every service exposes: actions, events, state, capabilities
 */

import { ServiceIdentity, BaseEvent } from '../events/schema';

// Service Types
export type ServiceType =
  | 'merchant'
  | 'consumer'
  | 'marketing'
  | 'intelligence'
  | 'commerce'
  | 'infrastructure';

// Service Capability
export interface ServiceCapability {
  action: string;
  params: Record<string, unknown>;
  returns: unknown;
  latency: number; // expected latency in ms
  cost?: number;
}

// Service Contract
export interface ServiceContract {
  identity: ServiceIdentity;
  type: ServiceType;
  version: string;
  capabilities: ServiceCapability[];
  subscriptions: string[]; // events this service subscribes to
  permissions: string[]; // what this service can do
  limits: {
    rateLimit: number; // requests per minute
    burst: number;
  };
  health: {
    endpoint: string;
    interval: number; // seconds
  };
}

// Service Registry
export class ServiceRegistry {
  private services: Map<string, ServiceContract> = new Map();

  constructor() {
    this.registerDefaultServices();
  }

  /**
   * Register a service
   */
  register(contract: ServiceContract): void {
    this.services.set(contract.identity.serviceId, contract);
  }

  /**
   * Get service contract
   */
  get(serviceId: string): ServiceContract | undefined {
    return this.services.get(serviceId);
  }

  /**
   * Get all services
   */
  getAll(): ServiceContract[] {
    return Array.from(this.services.values());
  }

  /**
   * Get services by type
   */
  getByType(type: ServiceType): ServiceContract[] {
    return this.getAll().filter(s => s.type === type);
  }

  /**
   * Check if service can perform action
   */
  canPerform(serviceId: string, action: string): boolean {
    const service = this.get(serviceId);
    if (!service) return false;
    return service.capabilities.some(c => c.action === action);
  }

  /**
   * Get service capabilities
   */
  getCapabilities(serviceId: string): ServiceCapability[] {
    return this.get(serviceId)?.capabilities || [];
  }

  /**
   * Register default services
   */
  private registerDefaultServices(): void {
    // REZ Business AI
    this.register({
      identity: { serviceId: 'business-ai', serviceName: 'REZ Business AI' },
      type: 'intelligence',
      version: '1.0',
      capabilities: [
        { action: 'analyze_goals', params: {}, returns: {}, latency: 100 },
        { action: 'generate_suggestions', params: {}, returns: {}, latency: 500 },
        { action: 'execute_campaign', params: {}, returns: {}, latency: 1000 },
        { action: 'adjust_pricing', params: {}, returns: {}, latency: 200 },
        { action: 'send_notification', params: {}, returns: {}, latency: 100 },
        { action: 'generate_report', params: {}, returns: {}, latency: 2000 },
      ],
      subscriptions: [
        'market.weather.changed',
        'market.event.detected',
        'commerce.order.created',
        'customer.churn_risk',
        'intelligence.demand.spike',
      ],
      permissions: [
        'merchant:read',
        'merchant:write',
        'campaign:create',
        'notification:send',
        'pricing:adjust',
      ],
      limits: { rateLimit: 1000, burst: 50 },
      health: { endpoint: '/health', interval: 30 },
    });

    // Agent Orchestrator
    this.register({
      identity: { serviceId: 'agent-orchestrator', serviceName: 'Agent Orchestrator' },
      type: 'intelligence',
      version: '1.0',
      capabilities: [
        { action: 'create_task', params: {}, returns: {}, latency: 10 },
        { action: 'assign_task', params: {}, returns: {}, latency: 10 },
        { action: 'execute_task', params: {}, returns: {}, latency: 500 },
        { action: 'resolve_conflict', params: {}, returns: {}, latency: 50 },
        { action: 'get_agent_health', params: {}, returns: {}, latency: 5 },
      ],
      subscriptions: [
        'intelligence.anomaly.detected',
        'system.execution.failed',
        'customer.churn_risk',
        'market.competitor.discount_detected',
      ],
      permissions: [
        'task:create',
        'task:execute',
        'agent:read',
      ],
      limits: { rateLimit: 5000, burst: 100 },
      health: { endpoint: '/health', interval: 15 },
    });

    // Event Bus
    this.register({
      identity: { serviceId: 'event-bus', serviceName: 'Event Bus' },
      type: 'infrastructure',
      version: '1.0',
      capabilities: [
        { action: 'publish', params: {}, returns: {}, latency: 5 },
        { action: 'subscribe', params: {}, returns: {}, latency: 5 },
        { action: 'query', params: {}, returns: {}, latency: 50 },
        { action: 'get_history', params: {}, returns: {}, latency: 100 },
      ],
      subscriptions: ['*'], // subscribes to all
      permissions: ['event:publish', 'event:subscribe', 'event:read'],
      limits: { rateLimit: 10000, burst: 500 },
      health: { endpoint: '/health', interval: 10 },
    });

    // REZ Merchant Service
    this.register({
      identity: { serviceId: 'merchant-service', serviceName: 'Merchant Service' },
      type: 'merchant',
      version: '1.0',
      capabilities: [
        { action: 'get_merchant', params: {}, returns: {}, latency: 20 },
        { action: 'get_orders', params: {}, returns: {}, latency: 30 },
        { action: 'get_products', params: {}, returns: {}, latency: 30 },
        { action: 'get_customers', params: {}, returns: {}, latency: 30 },
        { action: 'update_order', params: {}, returns: {}, latency: 50 },
        { action: 'update_product', params: {}, returns: {}, latency: 50 },
        { action: 'get_inventory', params: {}, returns: {}, latency: 20 },
        { action: 'update_inventory', params: {}, returns: {}, latency: 50 },
      ],
      subscriptions: [
        'commerce.order.created',
        'engagement.loyalty.points_earned',
      ],
      permissions: [
        'merchant:read',
        'merchant:write',
        'order:read',
        'order:write',
        'product:read',
        'product:write',
      ],
      limits: { rateLimit: 500, burst: 50 },
      health: { endpoint: '/health', interval: 30 },
    });

    // REZ Engagement Platform
    this.register({
      identity: { serviceId: 'engagement-platform', serviceName: 'Engagement Platform' },
      type: 'marketing',
      version: '1.0',
      capabilities: [
        { action: 'create_campaign', params: {}, returns: {}, latency: 200 },
        { action: 'launch_campaign', params: {}, returns: {}, latency: 500 },
        { action: 'get_campaign_performance', params: {}, returns: {}, latency: 100 },
        { action: 'create_offer', params: {}, returns: {}, latency: 50 },
        { action: 'redeem_offer', params: {}, returns: {}, latency: 50 },
        { action: 'get_loyalty_points', params: {}, returns: {}, latency: 20 },
        { action: 'add_loyalty_points', params: {}, returns: {}, latency: 50 },
      ],
      subscriptions: [
        'customer.registered',
        'commerce.order.completed',
        'marketing.campaign.performed_poorly',
      ],
      permissions: [
        'campaign:create',
        'campaign:read',
        'offer:create',
        'loyalty:read',
        'loyalty:write',
      ],
      limits: { rateLimit: 1000, burst: 100 },
      health: { endpoint: '/health', interval: 30 },
    });

    // REZ Ad AI
    this.register({
      identity: { serviceId: 'ad-ai', serviceName: 'Ad AI' },
      type: 'marketing',
      version: '1.0',
      capabilities: [
        { action: 'create_ad_campaign', params: {}, returns: {}, latency: 500 },
        { action: 'optimize_ad', params: {}, returns: {}, latency: 200 },
        { action: 'pause_campaign', params: {}, returns: {}, latency: 100 },
        { action: 'get_ad_performance', params: {}, returns: {}, latency: 50 },
        { action: 'generate_creative', params: {}, returns: {}, latency: 1000 },
      ],
      subscriptions: [
        'market.event.detected',
        'intelligence.demand.spike',
        'customer.segment_changed',
      ],
      permissions: [
        'campaign:create',
        'campaign:optimize',
        'creative:generate',
      ],
      limits: { rateLimit: 500, burst: 20 },
      health: { endpoint: '/health', interval: 60 },
    });

    // RABTUL Notifications
    this.register({
      identity: { serviceId: 'notifications-service', serviceName: 'RABTUL Notifications' },
      type: 'infrastructure',
      version: '1.0',
      capabilities: [
        { action: 'send_push', params: {}, returns: {}, latency: 100 },
        { action: 'send_sms', params: {}, returns: {}, latency: 500 },
        { action: 'send_whatsapp', params: {}, returns: {}, latency: 300 },
        { action: 'send_email', params: {}, returns: {}, latency: 1000 },
        { action: 'get_delivery_status', params: {}, returns: {}, latency: 20 },
      ],
      subscriptions: [
        'marketing.campaign.launched',
        'customer.churn_risk',
        'engagement.qr.scanned',
      ],
      permissions: [
        'notification:send',
        'notification:read',
      ],
      limits: { rateLimit: 5000, burst: 200 },
      health: { endpoint: '/health', interval: 30 },
    });

    // RABTUL Wallet
    this.register({
      identity: { serviceId: 'wallet-service', serviceName: 'RABTUL Wallet' },
      type: 'infrastructure',
      version: '1.0',
      capabilities: [
        { action: 'get_balance', params: {}, returns: {}, latency: 20 },
        { action: 'topup', params: {}, returns: {}, latency: 100 },
        { action: 'transfer', params: {}, returns: {}, latency: 100 },
        { action: 'get_transactions', params: {}, returns: {}, latency: 30 },
      ],
      subscriptions: [
        'commerce.payment.received',
        'engagement.wallet.topup',
        'engagement.loyalty.points_redeemed',
      ],
      permissions: [
        'wallet:read',
        'wallet:write',
      ],
      limits: { rateLimit: 2000, burst: 100 },
      health: { endpoint: '/health', interval: 30 },
    });

    // Industry Mind Services
    this.register({
      identity: { serviceId: 'mind-restaurant', serviceName: 'Restaurant Mind' },
      type: 'intelligence',
      version: '1.0',
      capabilities: [
        { action: 'analyze_demand', params: {}, returns: {}, latency: 200 },
        { action: 'get_recommendations', params: {}, returns: {}, latency: 100 },
        { action: 'predict_footfall', params: {}, returns: {}, latency: 300 },
      ],
      subscriptions: [
        'commerce.order.created',
        'market.weather.changed',
        'market.event.detected',
      ],
      permissions: [
        'merchant:read',
        'recommendation:generate',
      ],
      limits: { rateLimit: 500, burst: 50 },
      health: { endpoint: '/health', interval: 60 },
    });

    // Consumer Identity Graph
    this.register({
      identity: { serviceId: 'identity-graph', serviceName: 'Consumer Identity Graph' },
      type: 'intelligence',
      version: '1.0',
      capabilities: [
        { action: 'create_profile', params: {}, returns: {}, latency: 20 },
        { action: 'get_profile', params: {}, returns: {}, latency: 10 },
        { action: 'get_journey', params: {}, returns: {}, latency: 50 },
        { action: 'record_interaction', params: {}, returns: {}, latency: 20 },
        { action: 'get_segment', params: {}, returns: {}, latency: 30 },
      ],
      subscriptions: [
        'customer.registered',
        'commerce.order.created',
        'engagement.notification.opened',
      ],
      permissions: [
        'customer:read',
        'customer:write',
        'segment:read',
      ],
      limits: { rateLimit: 5000, burst: 200 },
      health: { endpoint: '/health', interval: 60 },
    });
  }
}

export const serviceRegistry = new ServiceRegistry();
