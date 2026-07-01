/**
 * Customer Success Department Pack - Runtime Connector
 *
 * Connects Company OS to Customer Success OS (:4050) for
 * customer lifecycle management, NPS, health scores, and retention.
 *
 * Department: CustomerSuccess
 * Target Service: Customer Success OS (:4050)
 */

import axios, { AxiosInstance } from 'axios';
import { BaseConnector, ConnectorConfig } from '../../../../service-connectors/src/base-connector.js';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company: string;
  plan: 'starter' | 'growth' | 'enterprise';
  status: 'active' | 'at-risk' | 'churned';
  healthScore: number;
  npsScore?: number;
  lastInteraction?: string;
  createdAt: string;
}

export interface HealthScore {
  id: string;
  customerId: string;
  score: number;
  factors: { name: string; contribution: number }[];
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: string;
}

export interface NPSResponse {
  id: string;
  customerId: string;
  score: number;
  promoter: boolean;
  detractor: boolean;
  feedback?: string;
  submittedAt: string;
}

export interface ChurnRisk {
  customerId: string;
  risk: 'low' | 'medium' | 'high';
  score: number;
  factors: string[];
  recommendedActions: string[];
}

export interface OnboardingProgress {
  customerId: string;
  stage: 'invite' | 'profile' | 'onboarding' | 'training' | 'active';
  completedSteps: string[];
  pendingSteps: string[];
  completionPercent: number;
  startedAt: string;
}

export interface Renewal {
  id: string;
  customerId: string;
  plan: string;
  currentEndDate: string;
  renewalDate: string;
  status: 'upcoming' | 'in_progress' | 'renewed' | 'churned';
  predictedRenewal: 'likely' | 'neutral' | 'unlikely';
  confidence: number;
}

export interface Touchpoint {
  id: string;
  customerId: string;
  type: 'call' | 'email' | 'meeting' | 'support';
  subject: string;
  notes?: string;
  outcome?: string;
  scheduledAt?: string;
  completedAt?: string;
  createdBy: string;
}

export class CustomerSuccessRuntimeConnector extends BaseConnector {
  private client: AxiosInstance;

  constructor(config: ConnectorConfig) {
    super(config);
    this.client = axios.create({
      baseURL: config.baseUrl || process.env.CUSTOMER_SUCCESS_OS_URL || 'http://localhost:4050',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
        ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
      },
    });
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  async listCustomers(filters?: {
    status?: Customer['status'];
    plan?: Customer['plan'];
    healthScoreMin?: number;
  }): Promise<Customer[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.plan) params.append('plan', filters.plan);
    if (filters?.healthScoreMin) params.append('healthScoreMin', String(filters.healthScoreMin));

    const response = await this.client.get(`/api/customers?${params.toString()}`);
    return response.data.customers || [];
  }

  async getCustomer(id: string): Promise<Customer | null> {
    try {
      const response = await this.client.get(`/api/customers/${id}`);
      return response.data.customer || null;
    } catch {
      return null;
    }
  }

  async createCustomer(data: Partial<Customer>): Promise<Customer> {
    const response = await this.client.post('/api/customers', data);
    return response.data.customer;
  }

  async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
    const response = await this.client.put(`/api/customers/${id}`, data);
    return response.data.customer;
  }

  async updateHealthScore(customerId: string, score: number): Promise<Customer> {
    const response = await this.client.put(`/api/customers/${customerId}/health`, { score });
    return response.data.customer;
  }

  // ============================================
  // HEALTH SCORES
  // ============================================

  async getHealthScore(customerId: string): Promise<HealthScore | null> {
    try {
      const response = await this.client.get(`/api/customers/${customerId}/health`);
      return response.data.healthScore || null;
    } catch {
      return null;
    }
  }

  async calculateHealthScore(customerId: string): Promise<HealthScore> {
    const response = await this.client.post(`/api/customers/${customerId}/health/calculate`);
    return response.data.healthScore;
  }

  async getAtRiskCustomers(threshold = 50): Promise<Customer[]> {
    const response = await this.client.get(`/api/customers/at-risk?threshold=${threshold}`);
    return response.data.customers || [];
  }

  // ============================================
  // NPS
  // ============================================

  async submitNPS(customerId: string, score: number, feedback?: string): Promise<NPSResponse> {
    const response = await this.client.post(`/api/customers/${customerId}/nps`, { score, feedback });
    return response.data.nps;
  }

  async getNPSStats(): Promise<{
    promoterCount: number;
    detractorCount: number;
    promoterPercent: number;
    npsScore: number;
  }> {
    const response = await this.client.get('/api/nps/stats');
    return response.data;
  }

  // ============================================
  // CHURN RISK
  // ============================================

  async getChurnRisk(customerId: string): Promise<ChurnRisk> {
    const response = await this.client.get(`/api/customers/${customerId}/churn-risk`);
    return response.data;
  }

  async getHighChurnRiskCustomers(): Promise<ChurnRisk[]> {
    const response = await this.client.get('/api/churn-risk/high');
    return response.data.customers || [];
  }

  async triggerChurnPrevention(customerId: string): Promise<void> {
    await this.client.post(`/api/customers/${customerId}/churn-prevention`);
  }

  // ============================================
  // ONBOARDING
  // ============================================

  async getOnboardingProgress(customerId: string): Promise<OnboardingProgress | null> {
    try {
      const response = await this.client.get(`/api/customers/${customerId}/onboarding`);
      return response.data.progress || null;
    } catch {
      return null;
    }
  }

  async startOnboarding(customerId: string): Promise<OnboardingProgress> {
    const response = await this.client.post(`/api/customers/${customerId}/onboarding/start`);
    return response.data.progress;
  }

  async completeOnboardingStep(customerId: string, step: string): Promise<OnboardingProgress> {
    const response = await this.client.post(`/api/customers/${customerId}/onboarding/step/${step}/complete`);
    return response.data.progress;
  }

  // ============================================
  // RENEWALS
  // ============================================

  async getUpcomingRenewals(daysAhead = 90): Promise<Renewal[]> {
    const response = await this.client.get(`/api/renewals/upcoming?days=${daysAhead}`);
    return response.data.renewals || [];
  }

  async getRenewal(customerId: string): Promise<Renewal | null> {
    try {
      const response = await this.client.get(`/api/customers/${customerId}/renewal`);
      return response.data.renewal || null;
    } catch {
      return null;
    }
  }

  async predictRenewal(customerId: string): Promise<{ prediction: 'likely' | 'neutral' | 'unlikely'; confidence: number }> {
    const response = await this.client.post(`/api/customers/${customerId}/renewal/predict`);
    return response.data;
  }

  // ============================================
  // TOUCHPOINTS
  // ============================================

  async listTouchpoints(customerId: string): Promise<Touchpoint[]> {
    const response = await this.client.get(`/api/customers/${customerId}/touchpoints`);
    return response.data.touchpoints || [];
  }

  async scheduleTouchpoint(data: Partial<Touchpoint>): Promise<Touchpoint> {
    const response = await this.client.post('/api/touchpoints', data);
    return response.data.touchpoint;
  }

  async completeTouchpoint(id: string, outcome: string): Promise<Touchpoint> {
    const response = await this.client.post(`/api/touchpoints/${id}/complete`, { outcome });
    return response.data.touchpoint;
  }

  // ============================================
  // DASHBOARD
  // ============================================

  async getDashboard(): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    atRiskCustomers: number;
    churnedCustomers: number;
    avgHealthScore: number;
    npsScore: number;
    upcomingRenewals: number;
    pendingOnboardings: number;
  }> {
    const response = await this.client.get('/api/dashboard');
    return response.data;
  }

  async getRetentionMetrics(period: 'monthly' | 'quarterly' | 'yearly'): Promise<{
    startingCustomers: number;
    endingCustomers: number;
    newCustomers: number;
    churned: number;
    expansionRevenue: number;
    netRevenueRetention: number;
  }> {
    const response = await this.client.get(`/api/metrics/retention?period=${period}`);
    return response.data;
  }

  // ============================================
  // CAMPAIGNS
  // ============================================

  async listCSCampaigns(): Promise<any[]> {
    const response = await this.client.get('/api/campaigns');
    return response.data.campaigns || [];
  }

  async createCSCampaign(data: {
    name: string;
    type: 'win-back' | 'upsell' | 'health-check' | 'nps-survey';
    targetCriteria: any;
  }): Promise<any> {
    const response = await this.client.post('/api/campaigns', data);
    return response.data.campaign;
  }

  async triggerCampaign(campaignId: string): Promise<void> {
    await this.client.post(`/api/campaigns/${campaignId}/trigger`);
  }

  // ============================================
  // AI COPILOT
  // ============================================

  async askCopilot(question: string, customerId?: string): Promise<{
    answer: string;
    suggestions: string[];
    confidence: number;
  }> {
    const response = await this.client.post('/api/copilot/query', {
      question,
      context: customerId ? { customerId } : undefined,
    });
    return response.data;
  }

  async getNextBestAction(customerId: string): Promise<{
    action: string;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  }> {
    const response = await this.client.get(`/api/customers/${customerId}/next-best-action`);
    return response.data;
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy';
    } catch {
      return false;
    }
  }
}

// Factory function
export function createCustomerSuccessConnector(tenantId: string): CustomerSuccessRuntimeConnector {
  return new CustomerSuccessRuntimeConnector({
    tenantId,
    apiKey: process.env.INTERNAL_SERVICE_TOKEN,
    baseUrl: process.env.CUSTOMER_SUCCESS_OS_URL,
  });
}

export default CustomerSuccessRuntimeConnector;
