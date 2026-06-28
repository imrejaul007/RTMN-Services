/**
 * HOJAI Intelligence SDK
 * Unified SDK for all RTMN intelligence services
 */

import axios, { AxiosInstance } from 'axios';

export interface SDKOptions {
  gatewayUrl?: string;
  apiKey?: string;
  services?: {
    aiIntelligence?: string;
    intentEngine?: string;
    reasoningEngine?: string;
    predictiveIntelligence?: string;
    riskIntelligence?: string;
    decisionIntelligence?: string;
    personalization?: string;
    knowledgeRegistry?: string;
    eventPlatform?: string;
    agentOS?: string;
    planningEngine?: string;
  };
  timeout?: number;
  retries?: number;
}

export class IntelligenceSDK {
  private gateway: AxiosInstance | null = null;
  private services: Map<string, AxiosInstance> = new Map();
  private useGateway: boolean;

  constructor(options: SDKOptions = {}) {
    this.useGateway = !!options.gatewayUrl;

    if (this.useGateway) {
      this.gateway = axios.create({
        baseURL: options.gatewayUrl,
        timeout: options.timeout || 30000,
        headers: {
          'Content-Type': 'application/json',
          ...(options.apiKey && { 'Authorization': `Bearer ${options.apiKey}` })
        }
      });
    } else if (options.services) {
      for (const [name, url] of Object.entries(options.services)) {
        if (url) {
          this.services.set(name, axios.create({
            baseURL: url,
            timeout: options.timeout || 30000,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
      }
    }
  }

  // Helper method to make requests
  private async request(service: string, action: string, data: any): Promise<any> {
    if (this.useGateway && this.gateway) {
      const response = await this.gateway.post(`/api/intelligence/${service}/${action}`, data);
      return response.data;
    }

    const serviceInstance = this.services.get(service);
    if (serviceInstance) {
      const response = await serviceInstance.post(`/api/${action}`, data);
      return response.data;
    }

    throw new Error(`Service ${service} not configured`);
  }

  // AI Intelligence
  ai = {
    analyze: (data: { text: string; userId?: string }) => this.request('ai-intelligence', 'analyze', data),
    intent: (data: { text: string }) => this.request('ai-intelligence', 'intent', data),
    sentiment: (data: { text: string }) => this.request('ai-intelligence', 'sentiment', data),
    fraud: (data: any) => this.request('ai-intelligence', 'fraud', data),
    classify: (data: any) => this.request('ai-intelligence', 'classify', data),
    entities: (data: any) => this.request('ai-intelligence', 'entities', data)
  };

  // Intent Engine
  intent = {
    detect: (data: { text: string; actor?: string }) => this.request('intent-engine', 'intent', data),
    batch: (data: { texts: string[] }) => this.request('intent-engine', 'batch', data)
  };

  // Reasoning Engine
  reasoning = {
    analyze: (data: { query: string; strategy?: string }) => this.request('reasoning-engine', 'reason', data),
    compare: (data: any) => this.request('reasoning-engine', 'compare', data)
  };

  // Predictive Intelligence
  predictive = {
    forecast: (data: { metric: string; history: number[] }) => this.request('predictive-intelligence', 'forecast', data),
    anomaly: (data: { value: number; baseline: number }) => this.request('predictive-intelligence', 'anomaly', data),
    trend: (data: any) => this.request('predictive-intelligence', 'trend', data)
  };

  // Risk Intelligence
  risk = {
    fraudScore: (data: { userId: string; transaction: any }) => this.request('risk-intelligence', 'fraud-score', data),
    churnScore: (data: { userId: string; metrics: any }) => this.request('risk-intelligence', 'churn-score', data),
    creditScore: (data: any) => this.request('risk-intelligence', 'credit-score', data)
  };

  // Decision Intelligence
  decision = {
    recommend: (data: { userId: string; category?: string; limit?: number }) =>
      this.request('decision-intelligence', 'recommend', data),
    nba: (data: { userId: string; context?: any }) => this.request('decision-intelligence', 'nba', data),
    decide: (data: any) => this.request('decision-intelligence', 'decide', data)
  };

  // Personalization
  personalization = {
    getProfile: (userId: string) => this.request('personalization', 'profiles', { userId }),
    createProfile: (data: any) => this.request('personalization', 'profiles', data),
    track: (data: { userId: string; action: string; itemId?: string; itemType?: string }) =>
      this.request('personalization', 'track', data),
    recommend: (userId: string, options?: any) =>
      this.request('personalization', 'recommendations/' + userId, options)
  };

  // Knowledge
  knowledge = {
    search: (data: { query: string; type?: string }) => this.request('knowledge-registry', 'search', data),
    getAsset: (assetId: string) => this.request('knowledge-registry', 'assets/' + assetId, {}),
    createAsset: (data: any) => this.request('knowledge-registry', 'assets', data),
    listAssets: (filter?: any) => this.request('knowledge-registry', 'assets', filter || {})
  };

  // Events
  events = {
    publish: (data: { type: string; source: string; data: any }) =>
      this.request('event-platform', 'events', data),
    subscribe: (data: any) => this.request('event-platform', 'subscriptions', data),
    getEvents: (filter?: any) => this.request('event-platform', 'events', filter || {})
  };

  // Planning
  planning = {
    createFromGoal: (data: { name: string; goal: string }) => this.request('planning-engine', 'plans', data),
    getPlan: (planId: string) => this.request('planning-engine', 'plans/' + planId, {}),
    execute: (planId: string, context: any) =>
      this.request('planning-engine', `plans/${planId}/execute`, context),
    decompose: (data: { goal: string }) => this.request('planning-engine', 'decompose', data)
  };

  // Agents
  agents = {
    create: (data: { name: string; type: string }) => this.request('agent-os', 'agents', data),
    get: (agentId: string) => this.request('agent-os', 'agents/' + agentId, {}),
    start: (agentId: string) => this.request('agent-os', 'agents/' + agentId + '/start', {}),
    stop: (agentId: string) => this.request('agent-os', 'agents/' + agentId + '/stop', {}),
    execute: (agentId: string, task: any) =>
      this.request('agent-os', 'agents/' + agentId + '/execute', task)
  };

  // Reflection
  reflection = {
    score: (data: { text: string }) => this.request('reflection-engine', 'reflect', data),
    compare: (data: { items: any[] }) => this.request('reflection-engine', 'compare', data)
  };

  // Proactive
  proactive = {
    suggest: (data: { userId: string; context: any }) =>
      this.request('proactive-engine', 'suggest', data),
    createRule: (data: any) => this.request('proactive-engine', 'rule', data)
  };

  // Batch processing
  async batch(requests: Promise<any>[]): Promise<any[]> {
    return Promise.all(requests);
  }

  // Health check
  async health(): Promise<any> {
    if (this.useGateway && this.gateway) {
      const response = await this.gateway.get('/health');
      return response.data;
    }
    throw new Error('Health check requires gateway mode');
  }
}

// Named exports
export const createSDK = (options?: SDKOptions) => new IntelligenceSDK(options);

export default IntelligenceSDK;
