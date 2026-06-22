/**
 * REZ Integration Hub - Central Context Layer
 *
 * Shared state that all agents can access
 * Every agent should access: merchant, customer, campaign, goals, memory
 */

import { BaseEvent } from '../events/schema';

// Context Types
export interface MerchantContext {
  merchantId: string;
  businessName: string;
  businessType: string;
  location: { lat: number; lng: number; city: string; state: string };
  industry: string;
  tier: 'free' | 'starter' | 'pro' | 'enterprise';
  goals: BusinessGoals;
  constraints: MerchantConstraints;
  preferences: MerchantPreferences;
  health: MerchantHealth;
  lastUpdated: Date;
}

export interface BusinessGoals {
  primary: Goal[];
  secondary: Goal[];
  progress: Record<string, number>; // goalId -> progress 0-100
}

export interface Goal {
  id: string;
  type: 'revenue' | 'customers' | 'retention' | 'orders';
  target: number;
  current: number;
  timeline: 'daily' | 'weekly' | 'monthly';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface MerchantConstraints {
  maxDiscount: number;
  maxAdBudget: number;
  minMargin: number;
  requireApprovalAbove: number;
  restrictedDays: string[];
  operatingHours: Record<string, { open: string; close: string }>;
}

export interface MerchantPreferences {
  tone: 'professional' | 'friendly' | 'luxury';
  language: 'en' | 'hi' | 'regional';
  channels: ('whatsapp' | 'sms' | 'push' | 'email')[];
  avoidOffers: string[];
}

export interface MerchantHealth {
  score: number; // 0-100
  revenue: number;
  expenses: number;
  profitMargin: number;
  cashFlow: number;
  orders: number;
  customers: number;
  avgOrderValue: number;
  retentionRate: number;
}

export interface CustomerContext {
  customerId: string;
  unifiedId?: string;
  merchantId?: string;
  profile: CustomerProfile;
  behavior: CustomerBehavior;
  value: CustomerValue;
  risk: CustomerRisk;
  journey: JourneySummary;
}

export interface CustomerProfile {
  name?: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  location?: { lat: number; lng: number; city: string };
  segments: string[];
  tags: string[];
  preferences: string[];
  since: Date;
  lastSeen: Date;
}

export interface CustomerBehavior {
  avgOrderValue: number;
  orderFrequency: number; // orders per month
  lastOrderDate?: Date;
  preferredPayment: string;
  preferredTime: string; // 'lunch' | 'dinner' | 'evening'
  preferredChannel: string;
  engagementScore: number; // 0-100
  interactionCount: number;
}

export interface CustomerValue {
  lifetimeValue: number;
  potentialValue: number;
  orders: number;
  refunds: number;
  netValue: number;
  rank: 'top' | 'high' | 'medium' | 'low';
}

export interface CustomerRisk {
  churnRisk: number; // 0-100
  fraudRisk: number;
  reasons: string[];
  lastRiskUpdate: Date;
}

export interface JourneySummary {
  touchpoints: number;
  firstInteraction: Date;
  lastInteraction: Date;
  channels: string[];
  campaigns: string[];
  totalSpend: number;
}

export interface CampaignContext {
  campaignId: string;
  merchantId: string;
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed';
  config: CampaignConfig;
  target: CampaignTarget;
  performance: CampaignPerformance;
  optimization: CampaignOptimization;
}

export interface CampaignConfig {
  name: string;
  type: 'push' | 'sms' | 'whatsapp' | 'email' | 'qr' | 'ad';
  objective: 'awareness' | 'traffic' | 'conversion' | 'retention';
  offer?: {
    type: 'discount' | 'cashback' | 'loyalty';
    value: number;
    minOrder?: number;
  };
  budget: number;
  startDate: Date;
  endDate: Date;
}

export interface CampaignTarget {
  audience: string;
  size: number;
  segments: string[];
  filters: Record<string, unknown>;
}

export interface CampaignPerformance {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  cost: number;
  roi: number;
  conversionRate: number;
}

export interface CampaignOptimization {
  recommendations: string[];
  autoAdjust: boolean;
  lastOptimization: Date;
}

// Context Store
export class CentralContext {
  private merchants: Map<string, MerchantContext> = new Map();
  private customers: Map<string, CustomerContext> = new Map();
  private campaigns: Map<string, CampaignContext> = new Map();
  private eventHistory: Map<string, BaseEvent[]> = new Map();
  private sessionContext: Map<string, unknown> = new Map();

  // Merchant Context

  setMerchantContext(merchantId: string, context: MerchantContext): void {
    this.merchants.set(merchantId, context);
  }

  getMerchantContext(merchantId: string): MerchantContext | undefined {
    return this.merchants.get(merchantId);
  }

  updateMerchantGoals(merchantId: string, goalId: string, progress: number): void {
    const merchant = this.merchants.get(merchantId);
    if (merchant) {
      merchant.goals.progress[goalId] = progress;
      merchant.lastUpdated = new Date();
      this.merchants.set(merchantId, merchant);
    }
  }

  // Customer Context

  setCustomerContext(customerId: string, context: CustomerContext): void {
    this.customers.set(customerId, context);
  }

  getCustomerContext(customerId: string): CustomerContext | undefined {
    return this.customers.get(customerId);
  }

  getCustomerContextByMerchant(customerId: string, merchantId: string): CustomerContext | undefined {
    const context = this.customers.get(customerId);
    if (context && context.merchantId === merchantId) {
      return context;
    }
    return undefined;
  }

  // Campaign Context

  setCampaignContext(campaignId: string, context: CampaignContext): void {
    this.campaigns.set(campaignId, context);
  }

  getCampaignContext(campaignId: string): CampaignContext | undefined {
    return this.campaigns.get(campaignId);
  }

  updateCampaignPerformance(campaignId: string, performance: Partial<CampaignPerformance>): void {
    const campaign = this.campaigns.get(campaignId);
    if (campaign) {
      campaign.performance = { ...campaign.performance, ...performance };
      this.campaigns.set(campaignId, campaign);
    }
  }

  // Event History

  recordEvent(event: BaseEvent): void {
    const key = event.payload ? JSON.stringify(event.payload) : 'unknown';

    if (!this.eventHistory.has(key)) {
      this.eventHistory.set(key, []);
    }
    this.eventHistory.get(key)!.push(event);
  }

  getRecentEvents(limit = 100): BaseEvent[] {
    const all: BaseEvent[] = [];
    for (const events of this.eventHistory.values()) {
      all.push(...events);
    }
    return all.sort((a, b) =>
      b.timestamp.getTime() - a.timestamp.getTime()
    ).slice(0, limit);
  }

  // Session Context

  setSessionContext(sessionId: string, context: unknown): void {
    this.sessionContext.set(sessionId, context);
  }

  getSessionContext<T>(sessionId: string): T | undefined {
    return this.sessionContext.get(sessionId) as T | undefined;
  }

  clearSession(sessionId: string): void {
    this.sessionContext.delete(sessionId);
  }

  // Utility

  getMerchantHealth(merchantId: string): MerchantHealth | undefined {
    return this.merchants.get(merchantId)?.health;
  }

  getCustomerRisk(customerId: string): CustomerRisk | undefined {
    return this.customers.get(customerId)?.risk;
  }

  getTopCustomers(merchantId: string, limit = 10): CustomerContext[] {
    return Array.from(this.customers.values())
      .filter(c => c.merchantId === merchantId)
      .sort((a, b) => b.value.lifetimeValue - a.value.lifetimeValue)
      .slice(0, limit);
  }

  getHighRiskCustomers(merchantId: string): CustomerContext[] {
    return Array.from(this.customers.values())
      .filter(c =>
        c.merchantId === merchantId &&
        c.risk.churnRisk > 70
      )
      .sort((a, b) => b.risk.churnRisk - a.risk.churnRisk);
  }

  // Snapshot

  getSnapshot(): {
    merchants: number;
    customers: number;
    campaigns: number;
    events: number;
  } {
    let eventCount = 0;
    for (const events of this.eventHistory.values()) {
      eventCount += events.length;
    }

    return {
      merchants: this.merchants.size,
      customers: this.customers.size,
      campaigns: this.campaigns.size,
      events: eventCount,
    };
  }
}

export const centralContext = new CentralContext();

// Context helper functions
export function getMerchantContext(merchantId: string): MerchantContext | undefined {
  return centralContext.getMerchantContext(merchantId);
}

export function getCustomerContext(customerId: string): CustomerContext | undefined {
  return centralContext.getCustomerContext(customerId);
}

export function getCustomerJourney(customerId: string): JourneySummary | undefined {
  return centralContext.getCustomerContext(customerId)?.journey;
}

export function getMerchantHealth(merchantId: string): MerchantHealth | undefined {
  return centralContext.getMerchantHealth(merchantId);
}

export function getActiveGoals(merchantId: string): Goal[] {
  const merchant = centralContext.getMerchantContext(merchantId);
  if (!merchant) return [];
  return merchant.goals.primary;
}

export function getBudgetRemaining(merchantId: string): number {
  const merchant = centralContext.getMerchantContext(merchantId);
  if (!merchant) return 0;
  return merchant.constraints.maxAdBudget;
}
