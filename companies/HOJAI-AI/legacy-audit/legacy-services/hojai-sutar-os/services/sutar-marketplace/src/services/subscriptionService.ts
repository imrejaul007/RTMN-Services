// ============================================================================
// SUTAR Marketplace - Subscription Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { storage, COLLECTIONS } from './storage';
import { economyOS } from './economyOS';
import { serviceCatalog } from './serviceCatalog';
import { pricingPlans } from './pricingService';
import {
  Subscription,
  SubscriptionStatus,
  SubscriptionUsage,
  BillingCycle,
  PaymentMethodInfo,
} from './types';

export interface CreateSubscriptionInput {
  userId: string;
  userEmail: string;
  serviceId: string;
  planId: string;
  billingCycle?: BillingCycle;
  trialEnd?: string;
  paymentMethodId?: string;
  metadata?: Record<string, unknown>;
}

export class SubscriptionService {
  // Create a new subscription
  public async createSubscription(input: CreateSubscriptionInput): Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }> {
    const service = serviceCatalog.getService(input.serviceId);
    if (!service) {
      return { success: false, error: 'Service not found' };
    }

    const plan = pricingPlans.getPlan(input.planId);
    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    // Check for existing active subscription
    const existing = this.getActiveSubscription(input.userId, input.serviceId);
    if (existing) {
      return { success: false, error: 'User already has an active subscription for this service' };
    }

    const now = new Date();
    const billingCycle = input.billingCycle || plan.billingCycle;
    const periodEnd = this.calculatePeriodEnd(now, billingCycle, plan.billingPeriod);

    const subscription: Subscription = {
      id: `sub-${uuidv4()}`,
      userId: input.userId,
      userEmail: input.userEmail,
      serviceId: service.id,
      serviceName: service.name,
      planId: plan.id,
      planName: plan.name,
      status: plan.trialDays > 0 ? 'trial' : 'active',
      billingCycle,
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      trialEnd: plan.trialDays > 0
        ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      cancelAtPeriodEnd: false,
      metadata: input.metadata || {},
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    storage.create(COLLECTIONS.SUBSCRIPTIONS, subscription);
    console.log(`[SUBSCRIPTION] Created subscription: ${subscription.id}`);

    // If not a trial, process initial payment
    if (plan.trialDays === 0 && plan.price > 0) {
      const paymentResult = await economyOS.processPayment(
        input.userId,
        plan.price,
        subscription.id,
        `Subscription to ${service.name} - ${plan.name}`
      );

      if (!paymentResult.success) {
        // Rollback subscription creation
        this.deleteSubscription(subscription.id);
        return { success: false, error: paymentResult.error || 'Payment failed' };
      }
    }

    return { success: true, subscription };
  }

  // Get subscription by ID
  public getSubscription(id: string): Subscription | undefined {
    return storage.get<Subscription>(COLLECTIONS.SUBSCRIPTIONS, id);
  }

  // Get active subscription for user and service
  public getActiveSubscription(userId: string, serviceId: string): Subscription | undefined {
    return storage.findOne<Subscription>(
      COLLECTIONS.SUBSCRIPTIONS,
      s => s.userId === userId && s.serviceId === serviceId &&
        (s.status === 'active' || s.status === 'trial')
    );
  }

  // Get subscriptions by user
  public getSubscriptionsByUser(userId: string, params: {
    status?: SubscriptionStatus;
    limit?: number;
    offset?: number;
  } = {}): { subscriptions: Subscription[]; total: number } {
    const { status, limit = 50, offset = 0 } = params;
    let subscriptions = storage.find<Subscription>(
      COLLECTIONS.SUBSCRIPTIONS,
      s => s.userId === userId
    );

    if (status) {
      subscriptions = subscriptions.filter(s => s.status === status);
    }

    subscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      subscriptions: subscriptions.slice(offset, offset + limit),
      total: subscriptions.length,
    };
  }

  // Get subscriptions by service
  public getSubscriptionsByService(serviceId: string, params: {
    status?: SubscriptionStatus;
    limit?: number;
    offset?: number;
  } = {}): { subscriptions: Subscription[]; total: number } {
    const { status, limit = 50, offset = 0 } = params;
    let subscriptions = storage.find<Subscription>(
      COLLECTIONS.SUBSCRIPTIONS,
      s => s.serviceId === serviceId
    );

    if (status) {
      subscriptions = subscriptions.filter(s => s.status === status);
    }

    subscriptions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      subscriptions: subscriptions.slice(offset, offset + limit),
      total: subscriptions.length,
    };
  }

  // Update subscription
  public updateSubscription(id: string, updates: Partial<Subscription>): Subscription | undefined {
    const subscription = this.getSubscription(id);
    if (!subscription) return undefined;

    const updated: Subscription = {
      ...subscription,
      ...updates,
      id: subscription.id,
      userId: subscription.userId,
      createdAt: subscription.createdAt,
      updatedAt: new Date().toISOString(),
    };

    storage.update(COLLECTIONS.SUBSCRIPTIONS, id, updated);
    return updated;
  }

  // Cancel subscription
  public async cancelSubscription(id: string, immediate = false): Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }> {
    const subscription = this.getSubscription(id);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    if (subscription.status === 'cancelled') {
      return { success: false, error: 'Subscription is already cancelled' };
    }

    if (immediate) {
      const updated = this.updateSubscription(id, {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
      });
      return { success: true, subscription: updated };
    } else {
      const updated = this.updateSubscription(id, {
        cancelAtPeriodEnd: true,
      });
      return { success: true, subscription: updated };
    }
  }

  // Pause subscription
  public pauseSubscription(id: string, pauseUntil?: string): Subscription | undefined {
    return this.updateSubscription(id, {
      status: 'paused',
      pauseAt: pauseUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Resume subscription
  public async resumeSubscription(id: string): Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }> {
    const subscription = this.getSubscription(id);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    if (subscription.status !== 'paused') {
      return { success: false, error: 'Subscription is not paused' };
    }

    const updated = this.updateSubscription(id, {
      status: 'active',
      pauseAt: undefined,
    });

    return { success: true, subscription: updated };
  }

  // Renew subscription
  public async renewSubscription(id: string): Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }> {
    const subscription = this.getSubscription(id);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    if (subscription.status !== 'active' && subscription.status !== 'trial') {
      return { success: false, error: 'Subscription cannot be renewed' };
    }

    const plan = pricingPlans.getPlan(subscription.planId);
    if (!plan) {
      return { success: false, error: 'Plan not found' };
    }

    // Process renewal payment
    if (plan.price > 0) {
      const paymentResult = await economyOS.processPayment(
        subscription.userId,
        plan.price,
        subscription.id,
        `Subscription renewal for ${subscription.serviceName} - ${plan.name}`
      );

      if (!paymentResult.success) {
        // Mark as expired
        this.updateSubscription(id, { status: 'expired' });
        return { success: false, error: paymentResult.error || 'Payment failed' };
      }
    }

    // Update period
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, subscription.billingCycle, plan.billingPeriod);

    const updated = this.updateSubscription(id, {
      status: 'active',
      currentPeriodStart: now.toISOString(),
      currentPeriodEnd: periodEnd.toISOString(),
      cancelAtPeriodEnd: false,
    });

    console.log(`[SUBSCRIPTION] Renewed subscription: ${id}`);
    return { success: true, subscription: updated };
  }

  // Change plan
  public async changePlan(subscriptionId: string, newPlanId: string): Promise<{
    success: boolean;
    subscription?: Subscription;
    error?: string;
  }> {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) {
      return { success: false, error: 'Subscription not found' };
    }

    const newPlan = pricingPlans.getPlan(newPlanId);
    if (!newPlan) {
      return { success: false, error: 'New plan not found' };
    }

    if (newPlan.serviceId !== subscription.serviceId) {
      return { success: false, error: 'Plan does not belong to the same service' };
    }

    const updated = this.updateSubscription(subscriptionId, {
      planId: newPlan.id,
      planName: newPlan.name,
    });

    console.log(`[SUBSCRIPTION] Changed plan: ${subscriptionId} to ${newPlanId}`);
    return { success: true, subscription: updated };
  }

  // Delete subscription
  public deleteSubscription(id: string): boolean {
    return storage.delete(COLLECTIONS.SUBSCRIPTIONS, id);
  }

  // Track usage
  public trackUsage(subscriptionId: string, metric: string, value: number): SubscriptionUsage {
    const subscription = this.getSubscription(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = pricingPlans.getPlan(subscription.planId);
    const limit = plan?.limits[`max${metric.charAt(0).toUpperCase() + metric.slice(1)}` as keyof typeof plan.limits] as number || -1;

    const usage: SubscriptionUsage = {
      id: `usage-${uuidv4()}`,
      subscriptionId,
      metric,
      value,
      limit,
      period: subscription.billingCycle,
      resetAt: subscription.currentPeriodEnd,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.create(`${COLLECTIONS.SUBSCRIPTIONS}_usage`, usage);
    return usage;
  }

  // Get usage for subscription
  public getUsage(subscriptionId: string): SubscriptionUsage[] {
    return storage.find<SubscriptionUsage>(
      `${COLLECTIONS.SUBSCRIPTIONS}_usage`,
      u => u.subscriptionId === subscriptionId
    );
  }

  // Check if user has access
  public hasAccess(userId: string, serviceId: string): boolean {
    const subscription = this.getActiveSubscription(userId, serviceId);
    if (!subscription) return false;

    // Check if trial has expired
    if (subscription.status === 'trial' && subscription.trialEnd) {
      if (new Date(subscription.trialEnd) < new Date()) {
        return false;
      }
    }

    return true;
  }

  // Get subscription statistics
  public getSubscriptionStatistics(params: {
    startDate?: string;
    endDate?: string;
  } = {}): {
    totalSubscriptions: number;
    activeSubscriptions: number;
    trialSubscriptions: number;
    cancelledSubscriptions: number;
    expiredSubscriptions: number;
    mrr: number;
    arr: number;
  } {
    let subscriptions = storage.getAll<Subscription>(COLLECTIONS.SUBSCRIPTIONS);

    if (params.startDate) {
      subscriptions = subscriptions.filter(s => new Date(s.createdAt) >= new Date(params.startDate!));
    }

    if (params.endDate) {
      subscriptions = subscriptions.filter(s => new Date(s.createdAt) <= new Date(params.endDate!));
    }

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const trialSubscriptions = subscriptions.filter(s => s.status === 'trial');
    const cancelledSubscriptions = subscriptions.filter(s => s.status === 'cancelled');
    const expiredSubscriptions = subscriptions.filter(s => s.status === 'expired');

    // Calculate MRR (Monthly Recurring Revenue)
    let mrr = 0;
    activeSubscriptions.forEach(sub => {
      const plan = pricingPlans.getPlan(sub.planId);
      if (plan) {
        switch (sub.billingCycle) {
          case 'monthly':
            mrr += plan.price;
            break;
          case 'quarterly':
            mrr += plan.price / 3;
            break;
          case 'yearly':
            mrr += plan.price / 12;
            break;
          case 'lifetime':
            mrr += plan.price / 24; // Amortize over 2 years
            break;
        }
      }
    });

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      trialSubscriptions: trialSubscriptions.length,
      cancelledSubscriptions: cancelledSubscriptions.length,
      expiredSubscriptions: expiredSubscriptions.length,
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
    };
  }

  // Process expired subscriptions (should be run periodically)
  public processExpiredSubscriptions(): number {
    const now = new Date();
    let processed = 0;

    const subscriptions = storage.find<Subscription>(
      COLLECTIONS.SUBSCRIPTIONS,
      s => (s.status === 'active' || s.status === 'trial') &&
        new Date(s.currentPeriodEnd) < now
    );

    subscriptions.forEach(async (subscription) => {
      if (subscription.status === 'trial' && subscription.trialEnd) {
        if (new Date(subscription.trialEnd) < now) {
          this.updateSubscription(subscription.id, { status: 'expired' });
          processed++;
        }
      } else if (new Date(subscription.currentPeriodEnd) < now) {
        if (subscription.cancelAtPeriodEnd) {
          this.updateSubscription(subscription.id, { status: 'cancelled', cancelledAt: now.toISOString() });
        } else {
          // Try to renew
          await this.renewSubscription(subscription.id);
        }
        processed++;
      }
    });

    return processed;
  }

  // Calculate period end date
  private calculatePeriodEnd(start: Date, billingCycle: BillingCycle, billingPeriod: number): Date {
    const msPerDay = 24 * 60 * 60 * 1000;

    switch (billingCycle) {
      case 'monthly':
        return new Date(start.getTime() + 30 * msPerDay * billingPeriod);
      case 'quarterly':
        return new Date(start.getTime() + 90 * msPerDay * billingPeriod);
      case 'yearly':
        return new Date(start.getTime() + 365 * msPerDay * billingPeriod);
      case 'lifetime':
        return new Date(start.getTime() + 365 * 10 * msPerDay); // 10 years
      default:
        return new Date(start.getTime() + 30 * msPerDay * billingPeriod);
    }
  }

  // Validate subscription
  public validateSubscription(data: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.userId) {
      errors.push('User ID is required');
    }

    if (!data.serviceId) {
      errors.push('Service ID is required');
    }

    if (!data.planId) {
      errors.push('Plan ID is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Singleton instance
export const subscriptionService = new SubscriptionService();