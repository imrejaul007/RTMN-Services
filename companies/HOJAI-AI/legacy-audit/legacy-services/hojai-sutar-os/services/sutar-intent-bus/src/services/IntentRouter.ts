// ============================================================================
// Intent Routing Service - Smart routing to services
// ============================================================================

import { Intent, IntentCategory } from '../index';

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  conditions: RoutingCondition[];
  actions: RoutingAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  matchCount: number;
  lastMatchedAt?: string;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'regex';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

export interface RoutingAction {
  type: 'route_to' | 'set_priority' | 'add_tag' | 'set_context' | 'transform';
  value: any;
}

export interface RoutingDecision {
  targetService: string;
  confidence: number;
  matchedRules: RoutingRule[];
  reasoning: string;
  fallback: boolean;
  queue?: string;
  metadata?: Record<string, any>;
}

export interface RoutingAnalytics {
  totalRoutes: number;
  routesByService: Record<string, number>;
  routesByCategory: Record<string, number>;
  averageConfidence: number;
  topRules: Array<{ ruleId: string; name: string; matchCount: number }>;
  failedRoutes: number;
  fallbackRoutes: number;
}

interface ServiceEndpoint {
  name: string;
  url: string;
  capabilities: string[];
  capacity: number;
  currentLoad: number;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
  priority: number;
  metadata?: Record<string, any>;
}

const DEFAULT_SERVICES: ServiceEndpoint[] = [
  {
    name: 'product-service',
    url: 'http://localhost:4101',
    capabilities: ['browse', 'search', 'compare'],
    capacity: 100,
    currentLoad: 0,
    healthStatus: 'healthy',
    priority: 1
  },
  {
    name: 'cart-service',
    url: 'http://localhost:4102',
    capabilities: ['cart', 'wishlist'],
    capacity: 100,
    currentLoad: 0,
    healthStatus: 'healthy',
    priority: 1
  },
  {
    name: 'checkout-service',
    url: 'http://localhost:4103',
    capabilities: ['purchase', 'negotiation'],
    capacity: 50,
    currentLoad: 0,
    healthStatus: 'healthy',
    priority: 1
  },
  {
    name: 'support-service',
    url: 'http://localhost:4104',
    capabilities: ['support'],
    capacity: 50,
    currentLoad: 0,
    healthStatus: 'healthy',
    priority: 2
  },
  {
    name: 'agent-network',
    url: 'http://localhost:4155',
    capabilities: ['negotiation', 'contract', 'support', 'general'],
    capacity: 200,
    currentLoad: 0,
    healthStatus: 'healthy',
    priority: 1
  }
];

const CATEGORY_TO_SERVICE: Record<IntentCategory, string> = {
  browse: 'product-service',
  search: 'product-service',
  compare: 'product-service',
  cart: 'cart-service',
  purchase: 'checkout-service',
  support: 'support-service',
  negotiation: 'agent-network',
  contract: 'agent-network'
};

export class IntentRouter {
  private rules: Map<string, RoutingRule>;
  private services: Map<string, ServiceEndpoint>;
  private analytics: RoutingAnalytics;
  private defaultFallback: string;

  constructor() {
    this.rules = new Map();
    this.services = new Map();
    this.analytics = this.initAnalytics();
    this.defaultFallback = 'agent-network';

    // Initialize default services
    DEFAULT_SERVICES.forEach(s => this.services.set(s.name, s));

    // Initialize default rules
    this.initializeDefaultRules();
  }

  private initAnalytics(): RoutingAnalytics {
    return {
      totalRoutes: 0,
      routesByService: {},
      routesByCategory: {},
      averageConfidence: 0,
      topRules: [],
      failedRoutes: 0,
      fallbackRoutes: 0
    };
  }

  private initializeDefaultRules(): void {
    const defaultRules: RoutingRule[] = [
      {
        id: 'rule-high-value-purchase',
        name: 'High Value Purchase Routing',
        priority: 100,
        conditions: [
          { field: 'intent.category', operator: 'equals', value: 'purchase' },
          { field: 'intent.confidence', operator: 'greater_than', value: 0.8 }
        ],
        actions: [
          { type: 'route_to', value: 'checkout-service' },
          { type: 'set_priority', value: 'high' }
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matchCount: 0
      },
      {
        id: 'rule-negotiation',
        name: 'Negotiation Intent Routing',
        priority: 90,
        conditions: [
          { field: 'intent.category', operator: 'equals', value: 'negotiation' }
        ],
        actions: [
          { type: 'route_to', value: 'agent-network' },
          { type: 'set_priority', value: 'high' }
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matchCount: 0
      },
      {
        id: 'rule-contract',
        name: 'Contract Intent Routing',
        priority: 95,
        conditions: [
          { field: 'intent.category', operator: 'equals', value: 'contract' }
        ],
        actions: [
          { type: 'route_to', value: 'agent-network' },
          { type: 'set_priority', value: 'critical' }
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matchCount: 0
      },
      {
        id: 'rule-support-vip',
        name: 'VIP Support Routing',
        priority: 110,
        conditions: [
          { field: 'context.userType', operator: 'equals', value: 'vip' },
          { field: 'intent.category', operator: 'equals', value: 'support' }
        ],
        actions: [
          { type: 'route_to', value: 'support-service' },
          { type: 'add_tag', value: 'vip-priority' }
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matchCount: 0
      },
      {
        id: 'rule-mobile-search',
        name: 'Mobile Search Optimization',
        priority: 80,
        conditions: [
          { field: 'context.deviceType', operator: 'equals', value: 'mobile' },
          { field: 'intent.category', operator: 'in', value: ['search', 'browse'] }
        ],
        actions: [
          { type: 'route_to', value: 'product-service' },
          { type: 'set_context', value: { mobileOptimized: true } }
        ],
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        matchCount: 0
      }
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  /**
   * Route an intent to the appropriate service
   */
  route(intent: Intent, context?: Record<string, any>): RoutingDecision {
    const matchedRules = this.findMatchingRules(intent, context);
    const decision = this.makeDecision(intent, matchedRules, context);

    // Update analytics
    this.updateAnalytics(decision, intent);

    return decision;
  }

  /**
   * Add a new routing rule
   */
  addRule(rule: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt' | 'matchCount'>): RoutingRule {
    const id = `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRule: RoutingRule = {
      ...rule,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      matchCount: 0
    };

    this.rules.set(id, newRule);
    return newRule;
  }

  /**
   * Update an existing rule
   */
  updateRule(id: string, updates: Partial<RoutingRule>): RoutingRule | null {
    const rule = this.rules.get(id);
    if (!rule) return null;

    const updatedRule: RoutingRule = {
      ...rule,
      ...updates,
      id: rule.id,
      createdAt: rule.createdAt,
      updatedAt: new Date().toISOString()
    };

    this.rules.set(id, updatedRule);
    return updatedRule;
  }

  /**
   * Delete a routing rule
   */
  deleteRule(id: string): boolean {
    return this.rules.delete(id);
  }

  /**
   * Get all routing rules
   */
  getRules(): RoutingRule[] {
    return Array.from(this.rules.values()).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get active rules only
   */
  getActiveRules(): RoutingRule[] {
    return this.getRules().filter(r => r.isActive);
  }

  /**
   * Register a new service endpoint
   */
  registerService(service: ServiceEndpoint): void {
    this.services.set(service.name, service);
  }

  /**
   * Update service health status
   */
  updateServiceHealth(serviceName: string, status: 'healthy' | 'degraded' | 'unhealthy'): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.healthStatus = status;
      this.services.set(serviceName, service);
    }
  }

  /**
   * Update service load
   */
  updateServiceLoad(serviceName: string, load: number): void {
    const service = this.services.get(serviceName);
    if (service) {
      service.currentLoad = Math.min(load, service.capacity);
      this.services.set(serviceName, service);
    }
  }

  /**
   * Get routing analytics
   */
  getAnalytics(): RoutingAnalytics {
    return {
      ...this.analytics,
      topRules: this.getTopRules(10)
    };
  }

  /**
   * Get available services
   */
  getServices(): ServiceEndpoint[] {
    return Array.from(this.services.values());
  }

  /**
   * Get healthy services
   */
  getHealthyServices(): ServiceEndpoint[] {
    return Array.from(this.services.values()).filter(s => s.healthStatus === 'healthy');
  }

  /**
   * Find the best service for a category
   */
  findServiceForCategory(category: IntentCategory): ServiceEndpoint | undefined {
    const serviceName = CATEGORY_TO_SERVICE[category];
    if (!serviceName) return undefined;

    return this.services.get(serviceName);
  }

  // Private helper methods

  private findMatchingRules(intent: Intent, context?: Record<string, any>): RoutingRule[] {
    const matchedRules: RoutingRule[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      if (this.evaluateRule(rule, intent, context)) {
        matchedRules.push(rule);
        rule.matchCount++;
        rule.lastMatchedAt = new Date().toISOString();
        this.rules.set(rule.id, rule);
      }
    }

    return matchedRules.sort((a, b) => b.priority - a.priority);
  }

  private evaluateRule(rule: RoutingRule, intent: Intent, context?: Record<string, any>): boolean {
    if (rule.conditions.length === 0) return false;

    let result = true;
    let currentOperator: 'AND' | 'OR' = 'AND';

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, intent, context);

      if (currentOperator === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentOperator = condition.logicalOperator || 'AND';
    }

    return result;
  }

  private evaluateCondition(condition: RoutingCondition, intent: Intent, context?: Record<string, any>): boolean {
    const fieldValue = this.getFieldValue(condition.field, intent, context);

    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;

      case 'contains':
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(String(condition.value).toLowerCase());
        }
        if (Array.isArray(fieldValue)) {
          return fieldValue.includes(condition.value);
        }
        return false;

      case 'greater_than':
        return typeof fieldValue === 'number' && fieldValue > condition.value;

      case 'less_than':
        return typeof fieldValue === 'number' && fieldValue < condition.value;

      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);

      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);

      case 'regex':
        try {
          const regex = new RegExp(condition.value);
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  private getFieldValue(field: string, intent: Intent, context?: Record<string, any>): any {
    const parts = field.split('.');

    if (parts[0] === 'intent') {
      let value: any = intent;
      for (const part of parts.slice(1)) {
        value = value?.[part];
      }
      return value;
    }

    if (parts[0] === 'context' && context) {
      let value: any = context;
      for (const part of parts.slice(1)) {
        value = value?.[part];
      }
      return value;
    }

    return undefined;
  }

  private makeDecision(intent: Intent, matchedRules: RoutingRule[], context?: Record<string, any>): RoutingDecision {
    if (matchedRules.length > 0) {
      const topRule = matchedRules[0];
      const routeAction = topRule.actions.find(a => a.type === 'route_to');

      if (routeAction) {
        const service = this.services.get(routeAction.value as string);
        if (service && service.healthStatus !== 'unhealthy') {
          return {
            targetService: routeAction.value as string,
            confidence: Math.min(0.9, 0.5 + (topRule.priority / 200)),
            matchedRules,
            reasoning: `Matched rule: ${topRule.name}`,
            fallback: false,
            queue: this.determineQueue(topRule.actions),
            metadata: this.extractMetadata(topRule.actions)
          };
        }
      }
    }

    // Fallback to category-based routing
    const categoryService = this.findServiceForCategory(intent.category);
    if (categoryService && categoryService.healthStatus !== 'unhealthy') {
      return {
        targetService: categoryService.name,
        confidence: intent.confidence,
        matchedRules: [],
        reasoning: `Fallback routing based on category: ${intent.category}`,
        fallback: true,
        queue: 'default'
      };
    }

    // Final fallback
    return {
      targetService: this.defaultFallback,
      confidence: 0.3,
      matchedRules: [],
      reasoning: 'Using default fallback service',
      fallback: true,
      queue: 'default'
    };
  }

  private determineQueue(actions: RoutingAction[]): string {
    const priorityAction = actions.find(a => a.type === 'set_priority');
    if (priorityAction) {
      const priority = priorityAction.value as string;
      switch (priority) {
        case 'critical': return 'critical';
        case 'high': return 'high-priority';
        case 'normal': return 'default';
        case 'low': return 'low-priority';
        default: return 'default';
      }
    }
    return 'default';
  }

  private extractMetadata(actions: RoutingAction[]): Record<string, any> {
    const metadata: Record<string, any> = {};

    for (const action of actions) {
      if (action.type === 'set_context') {
        Object.assign(metadata, action.value as Record<string, any>);
      }
      if (action.type === 'add_tag') {
        if (!metadata.tags) metadata.tags = [];
        metadata.tags.push(action.value);
      }
    }

    return metadata;
  }

  private updateAnalytics(decision: RoutingDecision, intent: Intent): void {
    this.analytics.totalRoutes++;
    this.analytics.routesByService[decision.targetService] =
      (this.analytics.routesByService[decision.targetService] || 0) + 1;
    this.analytics.routesByCategory[intent.category] =
      (this.analytics.routesByCategory[intent.category] || 0) + 1;

    // Update average confidence
    const totalConfidence = this.analytics.averageConfidence * (this.analytics.totalRoutes - 1) + decision.confidence;
    this.analytics.averageConfidence = totalConfidence / this.analytics.totalRoutes;

    if (decision.fallback) {
      this.analytics.fallbackRoutes++;
    }
  }

  private getTopRules(limit: number): Array<{ ruleId: string; name: string; matchCount: number }> {
    return Array.from(this.rules.values())
      .sort((a, b) => b.matchCount - a.matchCount)
      .slice(0, limit)
      .map(r => ({ ruleId: r.id, name: r.name, matchCount: r.matchCount }));
  }
}

// Export singleton instance
export const intentRouter = new IntentRouter();
