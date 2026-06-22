// ============================================================================
// SUTAR Marketplace - Pricing Plans Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import {
  PricingPlan,
  PlanFeature,
  PlanLimits,
  PlanType,
  BillingCycle,
} from './types';

export interface CreatePlanInput {
  serviceId: string;
  name: string;
  description?: string;
  type?: PlanType;
  price: number;
  currency?: string;
  billingCycle?: BillingCycle;
  billingPeriod?: number;
  trialDays?: number;
  features?: Omit<PlanFeature, 'id'>[];
  limits?: Partial<PlanLimits>;
  isActive?: boolean;
  isRecommended?: boolean;
  sortOrder?: number;
  metadata?: Record<string, unknown>;
}

export class PricingPlansService {
  // Create a new pricing plan
  public createPlan(input: CreatePlanInput): PricingPlan {
    const plan: PricingPlan = {
      id: `plan-${uuidv4()}`,
      serviceId: input.serviceId,
      name: input.name,
      description: input.description || '',
      type: input.type || 'standard',
      price: input.price,
      currency: input.currency || 'INR',
      billingCycle: input.billingCycle || 'monthly',
      billingPeriod: input.billingPeriod || 1,
      trialDays: input.trialDays || 0,
      features: (input.features || []).map(f => ({
        id: `pf-${uuidv4()}`,
        ...f,
      })),
      limits: {
        maxUsers: input.limits?.maxUsers,
        maxStorage: input.limits?.maxStorage,
        maxApiCalls: input.limits?.maxApiCalls,
        maxProjects: input.limits?.maxProjects,
        rateLimit: input.limits?.rateLimit,
        customLimits: input.limits?.customLimits || {},
      },
      isActive: input.isActive !== false,
      isRecommended: input.isRecommended || false,
      sortOrder: input.sortOrder || 0,
      metadata: input.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.create(COLLECTIONS.PLANS, plan);
    console.log(`[PRICING] Created plan: ${plan.id} - ${plan.name}`);

    return plan;
  }

  // Get plan by ID
  public getPlan(id: string): PricingPlan | undefined {
    return storage.get<PricingPlan>(COLLECTIONS.PLANS, id);
  }

  // Update plan
  public updatePlan(id: string, updates: Partial<PricingPlan>): PricingPlan | undefined {
    const plan = this.getPlan(id);
    if (!plan) return undefined;

    const updated: PricingPlan = {
      ...plan,
      ...updates,
      id: plan.id,
      serviceId: plan.serviceId,
      createdAt: plan.createdAt,
      updatedAt: new Date().toISOString(),
    };

    storage.update(COLLECTIONS.PLANS, id, updated);
    console.log(`[PRICING] Updated plan: ${id}`);

    return updated;
  }

  // Delete plan
  public deletePlan(id: string): boolean {
    return storage.delete(COLLECTIONS.PLANS, id);
  }

  // Get plans for a service
  public getPlansForService(serviceId: string, activeOnly = true): PricingPlan[] {
    let plans = storage.find<PricingPlan>(
      COLLECTIONS.PLANS,
      p => p.serviceId === serviceId
    );

    if (activeOnly) {
      plans = plans.filter(p => p.isActive);
    }

    return plans.sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // Get plan by service and type
  public getPlanByType(serviceId: string, type: PlanType): PricingPlan | undefined {
    return storage.findOne<PricingPlan>(
      COLLECTIONS.PLANS,
      p => p.serviceId === serviceId && p.type === type
    );
  }

  // Get recommended plan for service
  public getRecommendedPlan(serviceId: string): PricingPlan | undefined {
    return storage.findOne<PricingPlan>(
      COLLECTIONS.PLANS,
      p => p.serviceId === serviceId && p.isRecommended && p.isActive
    );
  }

  // Get free plan for service
  public getFreePlan(serviceId: string): PricingPlan | undefined {
    return storage.findOne<PricingPlan>(
      COLLECTIONS.PLANS,
      p => p.serviceId === serviceId && p.type === 'free' && p.isActive
    );
  }

  // Get all plans
  public getAllPlans(params: {
    activeOnly?: boolean;
    limit?: number;
    offset?: number;
  } = {}): { plans: PricingPlan[]; total: number } {
    const { activeOnly = false, limit = 100, offset = 0 } = params;
    let plans = storage.getAll<PricingPlan>(COLLECTIONS.PLANS);

    if (activeOnly) {
      plans = plans.filter(p => p.isActive);
    }

    return {
      plans: plans.slice(offset, offset + limit),
      total: plans.length,
    };
  }

  // Add feature to plan
  public addFeature(planId: string, feature: Omit<PlanFeature, 'id'>): PlanFeature | undefined {
    const plan = this.getPlan(planId);
    if (!plan) return undefined;

    const newFeature: PlanFeature = {
      id: `pf-${uuidv4()}`,
      ...feature,
    };

    this.updatePlan(planId, {
      features: [...plan.features, newFeature],
    });

    return newFeature;
  }

  // Remove feature from plan
  public removeFeature(planId: string, featureId: string): boolean {
    const plan = this.getPlan(planId);
    if (!plan) return false;

    const newFeatures = plan.features.filter(f => f.id !== featureId);
    this.updatePlan(planId, { features: newFeatures });

    return true;
  }

  // Update feature
  public updateFeature(planId: string, featureId: string, updates: Partial<PlanFeature>): boolean {
    const plan = this.getPlan(planId);
    if (!plan) return false;

    const newFeatures = plan.features.map(f =>
      f.id === featureId ? { ...f, ...updates } : f
    );
    this.updatePlan(planId, { features: newFeatures });

    return true;
  }

  // Update limits
  public updateLimits(planId: string, limits: Partial<PlanLimits>): boolean {
    const plan = this.getPlan(planId);
    if (!plan) return false;

    this.updatePlan(planId, {
      limits: {
        ...plan.limits,
        ...limits,
        customLimits: {
          ...plan.limits.customLimits,
          ...(limits.customLimits || {}),
        },
      },
    });

    return true;
  }

  // Toggle plan active status
  public toggleActive(id: string): PricingPlan | undefined {
    const plan = this.getPlan(id);
    if (!plan) return undefined;

    return this.updatePlan(id, { isActive: !plan.isActive });
  }

  // Toggle recommended status
  public toggleRecommended(id: string): PricingPlan | undefined {
    const plan = this.getPlan(id);
    if (!plan) return undefined;

    return this.updatePlan(id, { isRecommended: !plan.isRecommended });
  }

  // Update pricing
  public updatePricing(
    id: string,
    updates: {
      price?: number;
      billingCycle?: BillingCycle;
      billingPeriod?: number;
    }
  ): PricingPlan | undefined {
    return this.updatePlan(id, updates);
  }

  // Calculate price with discount
  public calculatePrice(planId: string, discountPercent: number): number {
    const plan = this.getPlan(planId);
    if (!plan) return 0;

    const discount = (plan.price * discountPercent) / 100;
    return Math.round((plan.price - discount) * 100) / 100;
  }

  // Calculate annual price
  public calculateAnnualPrice(planId: string): number {
    const plan = this.getPlan(planId);
    if (!plan) return 0;

    switch (plan.billingCycle) {
      case 'monthly':
        return plan.price * 12 * 0.8; // 20% discount for annual
      case 'quarterly':
        return plan.price * 4 * 0.85; // 15% discount
      case 'yearly':
        return plan.price * 0.9; // 10% discount
      case 'lifetime':
        return plan.price;
      default:
        return plan.price * 12;
    }
  }

  // Compare plans
  public comparePlans(planIds: string[]): {
    plan: PricingPlan;
    features: { name: string; included: boolean; values: Record<string, string | number | boolean> }[];
  }[] {
    const plans = planIds.map(id => this.getPlan(id)).filter(Boolean) as PricingPlan[];

    // Get all unique features
    const featureMap = new Map<string, Set<string>>();
    plans.forEach(plan => {
      plan.features.forEach(f => {
        if (!featureMap.has(f.name)) {
          featureMap.set(f.name, new Set());
        }
        featureMap.get(f.name)!.add(f.name);
      });
    });

    return plans.map(plan => ({
      plan,
      features: Array.from(featureMap.entries()).map(([name]) => {
        const feature = plan.features.find(f => f.name === name);
        const values: Record<string, string | number | boolean> = {};
        plans.forEach(p => {
          const f = p.features.find(pf => pf.name === name);
          values[p.id] = f?.included ?? false;
        });
        return {
          name,
          included: feature?.included ?? false,
          values,
        };
      }),
    }));
  }

  // Validate plan
  public validatePlan(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.serviceId) {
      errors.push('Service ID is required');
    }

    if (!data.name || data.name.trim().length < 2) {
      errors.push('Plan name must be at least 2 characters');
    }

    if (data.price === undefined || data.price < 0) {
      errors.push('Price must be a non-negative number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // Initialize default plans for a service
  public initializeDefaultPlans(serviceId: string, basePrice: number): PricingPlan[] {
    const plans: CreatePlanInput[] = [
      {
        serviceId,
        name: 'Free',
        description: 'Basic features with limitations',
        type: 'free',
        price: 0,
        billingCycle: 'monthly',
        trialDays: 0,
        features: [
          { name: 'Basic Access', description: 'Access to basic features', included: true },
          { name: 'Community Support', description: 'Get help from community', included: true },
          { name: 'Limited Storage', description: '1GB storage', included: true, limit: '1GB' },
          { name: 'Advanced Features', description: 'Access to advanced features', included: false },
          { name: 'Priority Support', description: '24/7 priority support', included: false },
          { name: 'API Access', description: 'Full API access', included: false },
        ],
        limits: {
          maxUsers: 1,
          maxStorage: 1024 * 1024 * 1024,
          maxApiCalls: 100,
          maxProjects: 1,
        },
        isActive: true,
        sortOrder: 0,
      },
      {
        serviceId,
        name: 'Basic',
        description: 'For individuals and small teams',
        type: 'basic',
        price: basePrice,
        billingCycle: 'monthly',
        trialDays: 14,
        features: [
          { name: 'Basic Access', description: 'Access to basic features', included: true },
          { name: 'Community Support', description: 'Get help from community', included: true },
          { name: 'Extended Storage', description: '10GB storage', included: true, limit: '10GB' },
          { name: 'Advanced Features', description: 'Access to advanced features', included: true },
          { name: 'Email Support', description: 'Email support during business hours', included: true },
          { name: 'API Access', description: 'Basic API access', included: true, limit: '1000 calls/day' },
        ],
        limits: {
          maxUsers: 5,
          maxStorage: 10 * 1024 * 1024 * 1024,
          maxApiCalls: 1000,
          maxProjects: 5,
        },
        isActive: true,
        isRecommended: false,
        sortOrder: 1,
      },
      {
        serviceId,
        name: 'Pro',
        description: 'For growing businesses',
        type: 'standard',
        price: basePrice * 2.5,
        billingCycle: 'monthly',
        trialDays: 14,
        features: [
          { name: 'Basic Access', description: 'Access to basic features', included: true },
          { name: 'Community Support', description: 'Get help from community', included: true },
          { name: 'Extended Storage', description: '100GB storage', included: true, limit: '100GB' },
          { name: 'Advanced Features', description: 'Access to advanced features', included: true },
          { name: 'Priority Support', description: '24/7 priority support', included: true },
          { name: 'API Access', description: 'Full API access', included: true, limit: '10000 calls/day' },
          { name: 'Custom Integrations', description: 'Custom third-party integrations', included: true },
          { name: 'Analytics Dashboard', description: 'Advanced analytics and reporting', included: true },
        ],
        limits: {
          maxUsers: 25,
          maxStorage: 100 * 1024 * 1024 * 1024,
          maxApiCalls: 10000,
          maxProjects: 25,
        },
        isActive: true,
        isRecommended: true,
        sortOrder: 2,
      },
      {
        serviceId,
        name: 'Enterprise',
        description: 'For large organizations',
        type: 'enterprise',
        price: basePrice * 5,
        billingCycle: 'monthly',
        trialDays: 30,
        features: [
          { name: 'Basic Access', description: 'Access to basic features', included: true },
          { name: 'Community Support', description: 'Get help from community', included: true },
          { name: 'Unlimited Storage', description: 'Unlimited storage', included: true },
          { name: 'Advanced Features', description: 'Access to advanced features', included: true },
          { name: 'Dedicated Support', description: 'Dedicated support manager', included: true },
          { name: 'Unlimited API Access', description: 'Unlimited API access', included: true },
          { name: 'Custom Integrations', description: 'Custom third-party integrations', included: true },
          { name: 'Advanced Analytics', description: 'Advanced analytics and reporting', included: true },
          { name: 'SSO/SAML', description: 'Enterprise SSO/SAML support', included: true },
          { name: 'Custom Contracts', description: 'Custom SLA and contracts', included: true },
          { name: 'White-label', description: 'White-label options', included: true },
        ],
        limits: {
          maxUsers: -1, // Unlimited
          maxStorage: -1,
          maxApiCalls: -1,
          maxProjects: -1,
        },
        isActive: true,
        isRecommended: false,
        sortOrder: 3,
      },
    ];

    return plans.map(p => this.createPlan(p));
  }

  // Copy plan to another service
  public copyPlan(planId: string, targetServiceId: string): PricingPlan | undefined {
    const original = this.getPlan(planId);
    if (!original) return undefined;

    return this.createPlan({
      serviceId: targetServiceId,
      name: original.name,
      description: original.description,
      type: original.type,
      price: original.price,
      currency: original.currency,
      billingCycle: original.billingCycle,
      billingPeriod: original.billingPeriod,
      trialDays: original.trialDays,
      features: original.features.map(f => ({
        name: f.name,
        description: f.description,
        included: f.included,
        limit: f.limit,
      })),
      limits: { ...original.limits, customLimits: { ...original.limits.customLimits } },
      isActive: original.isActive,
      isRecommended: false,
      sortOrder: original.sortOrder,
      metadata: { copiedFrom: original.id },
    });
  }
}

// Singleton instance
export const pricingPlans = new PricingPlansService();