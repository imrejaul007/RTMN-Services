// ============================================================================
// Agent Network Integration Service - Integration with Agent Network (port 4155)
// ============================================================================

import { Intent } from '../index';

export interface AgentRequest {
  intent: Intent;
  context: Record<string, any>;
  userId?: string;
  sessionId?: string;
  callbackUrl?: string;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  success: boolean;
  agentId?: string;
  response?: string;
  actions?: AgentAction[];
  nextSteps?: string[];
  confidence: number;
  error?: string;
}

export interface AgentAction {
  type: 'route' | 'respond' | 'escalate' | 'transfer' | 'notify' | 'update';
  target?: string;
  payload: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface AgentCapability {
  name: string;
  description: string;
  supportedIntents: string[];
  parameters?: Record<string, any>;
}

export interface AgentStatus {
  agentId: string;
  name: string;
  status: 'available' | 'busy' | 'offline' | 'error';
  currentLoad: number;
  maxLoad: number;
  capabilities: string[];
  lastHeartbeat: string;
}

export interface AgentNetworkConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

const DEFAULT_CONFIG: AgentNetworkConfig = {
  baseUrl: 'http://localhost:4155',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 60000
};

export class AgentNetworkIntegration {
  private config: AgentNetworkConfig;
  private agents: Map<string, AgentStatus>;
  private requestQueue: AgentRequest[];
  private circuitBreakerFailures: number;
  private circuitBreakerOpenSince: number | null;
  private pendingRequests: Map<string, { request: AgentRequest; timestamp: number }>;
  private webhookCallbacks: Map<string, (response: AgentResponse) => void>;

  constructor() {
    this.config = DEFAULT_CONFIG;
    this.agents = new Map();
    this.requestQueue = [];
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenSince = null;
    this.pendingRequests = new Map();
    this.webhookCallbacks = new Map();

    // Initialize default agents
    this.initializeDefaultAgents();
  }

  private initializeDefaultAgents(): void {
    const defaultAgents: AgentStatus[] = [
      {
        agentId: 'negotiation-agent',
        name: 'Negotiation Agent',
        status: 'available',
        currentLoad: 0,
        maxLoad: 50,
        capabilities: ['negotiation', 'pricing', 'discount_handling'],
        lastHeartbeat: new Date().toISOString()
      },
      {
        agentId: 'contract-agent',
        name: 'Contract Agent',
        status: 'available',
        currentLoad: 0,
        maxLoad: 30,
        capabilities: ['contract_review', 'legal_terms', 'signature'],
        lastHeartbeat: new Date().toISOString()
      },
      {
        agentId: 'support-agent',
        name: 'Support Agent',
        status: 'available',
        currentLoad: 0,
        maxLoad: 100,
        capabilities: ['customer_support', 'troubleshooting', 'refunds'],
        lastHeartbeat: new Date().toISOString()
      },
      {
        agentId: 'sales-agent',
        name: 'Sales Agent',
        status: 'available',
        currentLoad: 0,
        maxLoad: 80,
        capabilities: ['product_recommendation', 'upselling', 'cross_selling'],
        lastHeartbeat: new Date().toISOString()
      }
    ];

    defaultAgents.forEach(agent => this.agents.set(agent.agentId, agent));
  }

  /**
   * Send intent to agent network
   */
  async sendToAgent(request: AgentRequest): Promise<AgentResponse> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      return {
        success: false,
        confidence: 0,
        error: 'Agent network is temporarily unavailable'
      };
    }

    try {
      const response = await this.makeRequest(request);
      this.recordSuccess();
      return response;
    } catch (error) {
      this.recordFailure();
      return {
        success: false,
        confidence: 0,
        error: String(error)
      };
    }
  }

  /**
   * Send intent with callback
   */
  sendToAgentAsync(request: AgentRequest, callback: (response: AgentResponse) => void): string {
    const requestId = `async-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.webhookCallbacks.set(requestId, callback);
    this.pendingRequests.set(requestId, { request, timestamp: Date.now() });

    // Process asynchronously
    setTimeout(() => {
      this.sendToAgent(request).then(response => {
        const cb = this.webhookCallbacks.get(requestId);
        if (cb) {
          cb(response);
          this.webhookCallbacks.delete(requestId);
        }
        this.pendingRequests.delete(requestId);
      });
    }, 0);

    return requestId;
  }

  /**
   * Route intent to specific agent
   */
  async routeToAgent(agentId: string, request: AgentRequest): Promise<AgentResponse> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return {
        success: false,
        confidence: 0,
        error: `Agent ${agentId} not found`
      };
    }

    if (agent.status !== 'available') {
      return {
        success: false,
        confidence: 0,
        error: `Agent ${agentId} is ${agent.status}`
      };
    }

    return this.sendToAgent(request);
  }

  /**
   * Get available agents
   */
  getAvailableAgents(): AgentStatus[] {
    return Array.from(this.agents.values())
      .filter(agent => agent.status === 'available')
      .sort((a, b) => (b.maxLoad - b.currentLoad) - (a.maxLoad - a.currentLoad));
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by ID
   */
  getAgent(agentId: string): AgentStatus | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Update agent status
   */
  updateAgentStatus(agentId: string, status: AgentStatus['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastHeartbeat = new Date().toISOString();
      this.agents.set(agentId, agent);
    }
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return [
      {
        name: 'negotiation',
        description: 'Handles price negotiations and discount requests',
        supportedIntents: ['negotiation', 'discount', 'price_quote']
      },
      {
        name: 'contract',
        description: 'Reviews and manages contracts and legal agreements',
        supportedIntents: ['contract', 'agreement', 'terms', 'legal']
      },
      {
        name: 'support',
        description: 'Provides customer support and troubleshooting',
        supportedIntents: ['support', 'help', 'issue', 'problem']
      },
      {
        name: 'sales',
        description: 'Assists with product recommendations and sales',
        supportedIntents: ['purchase', 'browse', 'search', 'recommend']
      }
    ];
  }

  /**
   * Find best agent for intent
   */
  findBestAgent(intent: Intent): AgentStatus | null {
    const categoryToAgent: Record<string, string[]> = {
      negotiation: ['negotiation-agent'],
      contract: ['contract-agent'],
      support: ['support-agent'],
      purchase: ['sales-agent', 'support-agent'],
      browse: ['sales-agent'],
      search: ['sales-agent'],
      compare: ['sales-agent'],
      cart: ['sales-agent']
    };

    const potentialAgents = categoryToAgent[intent.category] || ['support-agent'];
    const availableAgents = this.getAvailableAgents();

    for (const agentId of potentialAgents) {
      const agent = availableAgents.find(a => a.agentId === agentId);
      if (agent) return agent;
    }

    // Fallback to any available agent
    return availableAgents[0] || null;
  }

  /**
   * Queue request for later processing
   */
  queueRequest(request: AgentRequest): string {
    const requestId = `queued-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.requestQueue.push(request);
    return requestId;
  }

  /**
   * Get queued requests count
   */
  getQueueSize(): number {
    return this.requestQueue.length;
  }

  /**
   * Process queued requests
   */
  async processQueue(): Promise<number> {
    let processed = 0;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      const result = await this.sendToAgent(request);
      if (result.success) processed++;
    }

    return processed;
  }

  /**
   * Configure agent network
   */
  configure(config: Partial<AgentNetworkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get network health
   */
  getNetworkHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    availableAgents: number;
    totalAgents: number;
    circuitBreakerStatus: 'closed' | 'open' | 'half_open';
    averageLoad: number;
  } {
    const agents = Array.from(this.agents.values());
    const availableCount = agents.filter(a => a.status === 'available').length;
    const totalLoad = agents.reduce((sum, a) => sum + a.currentLoad, 0);
    const maxLoad = agents.reduce((sum, a) => sum + a.maxLoad, 0);

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (availableCount === 0) status = 'unhealthy';
    else if (availableCount < agents.length / 2) status = 'degraded';

    return {
      status,
      availableAgents: availableCount,
      totalAgents: agents.length,
      circuitBreakerStatus: this.getCircuitBreakerStatus(),
      averageLoad: maxLoad > 0 ? totalLoad / maxLoad : 0
    };
  }

  // Private helper methods

  private async makeRequest(request: AgentRequest): Promise<AgentResponse> {
    // In production, this would make actual HTTP requests to the agent network
    // For now, simulate the response

    const agent = this.findBestAgent(request.intent);
    if (!agent) {
      return {
        success: false,
        confidence: 0,
        error: 'No available agents'
      };
    }

    // Simulate agent processing
    return {
      success: true,
      agentId: agent.agentId,
      response: this.generateAgentResponse(request.intent),
      actions: this.generateActions(request.intent),
      nextSteps: this.generateNextSteps(request.intent),
      confidence: request.intent.confidence
    };
  }

  private generateAgentResponse(intent: Intent): string {
    const responses: Record<string, string[]> = {
      negotiation: [
        'I understand you want to negotiate. Let me check what options are available.',
        'I can offer you a special discount on this item.',
        'Let me see what the best price I can offer is for you.'
      ],
      contract: [
        'I will review the contract terms for you.',
        'Let me help you understand the agreement.',
        'I can assist with signing the contract.'
      ],
      support: [
        'I am here to help. What seems to be the issue?',
        'Let me assist you with your concern.',
        'I will do my best to resolve your issue.'
      ],
      purchase: [
        'I can help you complete this purchase.',
        'Let me show you the best options available.',
        'I am ready to assist with your order.'
      ]
    };

    const categoryResponses = responses[intent.category] || responses.support;
    return categoryResponses[Math.floor(Math.random() * categoryResponses.length)];
  }

  private generateActions(intent: Intent): AgentAction[] {
    const actions: AgentAction[] = [];

    switch (intent.category) {
      case 'negotiation':
        actions.push({
          type: 'route',
          target: 'pricing-service',
          payload: { intentId: intent.id },
          priority: 'high'
        });
        break;
      case 'contract':
        actions.push({
          type: 'route',
          target: 'legal-service',
          payload: { intentId: intent.id },
          priority: 'urgent'
        });
        break;
      case 'support':
        actions.push({
          type: 'respond',
          payload: { template: 'support_response' },
          priority: 'normal'
        });
        break;
      case 'purchase':
        actions.push({
          type: 'route',
          target: 'checkout-service',
          payload: { intentId: intent.id },
          priority: 'high'
        });
        break;
    }

    return actions;
  }

  private generateNextSteps(intent: Intent): string[] {
    const steps: Record<string, string[]> = {
      negotiation: [
        'Review pricing options',
        'Present discount offer',
        'Confirm final price'
      ],
      contract: [
        'Review contract terms',
        'Check for required signatures',
        'Process agreement'
      ],
      support: [
        'Gather issue details',
        'Identify solution',
        'Confirm resolution'
      ],
      purchase: [
        'Confirm cart items',
        'Process payment',
        'Arrange delivery'
      ]
    };

    return steps[intent.category] || ['Process request', 'Provide response', 'Confirm completion'];
  }

  private isCircuitBreakerOpen(): boolean {
    if (this.circuitBreakerOpenSince === null) return false;

    const elapsed = Date.now() - this.circuitBreakerOpenSince;
    if (elapsed > this.config.circuitBreakerTimeout) {
      // Try half-open state
      this.circuitBreakerOpenSince = null;
      return false;
    }

    return true;
  }

  private getCircuitBreakerStatus(): 'closed' | 'open' | 'half_open' {
    if (this.circuitBreakerOpenSince === null) {
      return this.circuitBreakerFailures >= this.config.circuitBreakerThreshold ? 'open' : 'closed';
    }

    const elapsed = Date.now() - this.circuitBreakerOpenSince;
    if (elapsed > this.config.circuitBreakerTimeout) {
      return 'half_open';
    }

    return 'open';
  }

  private recordSuccess(): void {
    this.circuitBreakerFailures = 0;
    this.circuitBreakerOpenSince = null;
  }

  private recordFailure(): void {
    this.circuitBreakerFailures++;

    if (this.circuitBreakerFailures >= this.config.circuitBreakerThreshold) {
      this.circuitBreakerOpenSince = Date.now();
    }
  }
}

// Export singleton instance
export const agentNetworkIntegration = new AgentNetworkIntegration();
