/**
 * NeXha ProcurementOS - Deal State Machine
 *
 * Manages the complete lifecycle of a procurement deal:
 * RFQ → Invitations Sent → Quotes Received → Negotiation → Award → Order → Fulfillment → Payment → Completed
 *
 * State Transitions:
 *   rfq_created → invitations_sent → quotes_received → negotiating → awarded → order_created → fulfilled → payment_settled → completed
 *                                                                                           ↘ partial → returned → refund_processed → completed
 */

import { z } from 'zod';
import { randomUUID } from 'crypto';
import { policyClient, PolicyDecision } from './policy-client';

// ============================================================================
// Types
// ============================================================================

export type DealState =
  | 'rfq_created'
  | 'invitations_sent'
  | 'quotes_received'
  | 'negotiating'
  | 'awarded'
  | 'order_created'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'fulfilled'
  | 'payment_settled'
  | 'completed'
  | 'cancelled'
  | 'partial'
  | 'returned'
  | 'refund_processed';

export type DealTrigger =
  | 'rfq_created'
  | 'invitations_sent'
  | 'quote_received'
  | 'counter_offer'
  | 'deal_accepted'
  | 'deal_rejected'
  | 'rfq_expired'
  | 'order_created'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'payment_received'
  | 'payment_overdue'
  | 'cancellation_requested'
  | 'return_requested'
  | 'return_received'
  | 'refund_processed';

export interface Deal {
  id: string;
  dealNumber: string;
  rfqId: string;
  rfqNumber: string;
  buyerId: string;
  buyerName: string;
  state: DealState;
  stateHistory: StateTransition[];
  suppliers: DealSupplier[];
  quotes: DealQuote[];
  awardedSupplierId?: string;
  awardedQuoteId?: string;
  orderId?: string;
  orderNumber?: string;
  totalValue: number;
  awardedValue?: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded';
  fulfillmentStatus: 'pending' | 'processing' | 'shipped' | 'delivered' | 'partial' | 'returned';
  expiresAt: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealSupplier {
  supplierId: string;
  supplierName: string;
  email: string;
  invitedAt: Date;
  responseStatus: 'pending' | 'viewed' | 'responded' | 'declined' | 'expired';
  bestQuoteAmount?: number;
  bestQuoteAt?: Date;
}

export interface DealQuote {
  id: string;
  supplierId: string;
  supplierName: string;
  round: number;
  quotedAmount: number;
  deliveryDays: number;
  paymentTerms: string;
  validUntil: Date;
  notes?: string;
  status: 'pending' | 'best' | 'accepted' | 'rejected' | 'expired';
  receivedAt: Date;
}

export interface StateTransition {
  from: DealState;
  to: DealState;
  trigger: DealTrigger;
  timestamp: Date;
  actor?: string;
  notes?: string;
}

// Valid state transitions
const STATE_TRANSITIONS: Record<DealState, DealTrigger[]> = {
  rfq_created: ['invitations_sent', 'rfq_expired', 'cancellation_requested'],
  invitations_sent: ['quotes_received', 'rfq_expired', 'cancellation_requested'],
  quotes_received: ['negotiating', 'deal_accepted', 'deal_rejected', 'rfq_expired', 'cancellation_requested'],
  negotiating: ['deal_accepted', 'deal_rejected', 'counter_offer', 'cancellation_requested'],
  awarded: ['order_created', 'cancellation_requested'],
  order_created: ['order_confirmed', 'cancellation_requested'],
  processing: ['order_shipped', 'cancellation_requested'],
  shipped: ['order_delivered', 'return_requested'],
  delivered: ['payment_received', 'payment_overdue', 'return_requested'],
  fulfilled: ['payment_settled', 'payment_overdue'],
  payment_settled: ['completed'],
  completed: [],
  cancelled: [],
  partial: ['returned', 'refund_processed'],
  returned: ['refund_processed'],
  refund_processed: ['completed'],
};

// ============================================================================
// Schemas
// ============================================================================

export const CreateDealSchema = z.object({
  rfqId: z.string().uuid(),
  rfqNumber: z.string(),
  buyerId: z.string().uuid(),
  buyerName: z.string(),
  totalValue: z.number().positive(),
  suppliers: z.array(z.object({
    supplierId: z.string().uuid(),
    supplierName: z.string(),
    email: z.string().email(),
  })),
  expiresAt: z.string().datetime(),
});

export const RecordQuoteSchema = z.object({
  dealId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierName: z.string(),
  quotedAmount: z.number().positive(),
  deliveryDays: z.number().int().positive(),
  paymentTerms: z.string(),
  validUntil: z.string().datetime(),
  notes: z.string().optional(),
});

export const AwardDealSchema = z.object({
  dealId: z.string().uuid(),
  supplierId: z.string().uuid(),
  quoteId: z.string().uuid(),
  finalAmount: z.number().positive(),
});

export const UpdateFulfillmentSchema = z.object({
  dealId: z.string().uuid(),
  status: z.enum(['processing', 'shipped', 'delivered', 'partial', 'returned']),
  trackingNumber: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateDealInput = z.infer<typeof CreateDealSchema>;
export type RecordQuoteInput = z.infer<typeof RecordQuoteSchema>;
export type AwardDealInput = z.infer<typeof AwardDealSchema>;
export type UpdateFulfillmentInput = z.infer<typeof UpdateFulfillmentSchema>;

// ============================================================================
// Deal State Machine
// ============================================================================

export class DealStateMachine {
  private deals = new Map<string, Deal>();

  /**
   * Create a new deal
   */
  createDeal(input: CreateDealInput): Deal {
    const deal: Deal = {
      id: randomUUID(),
      dealNumber: `DEAL-${Date.now().toString(36).toUpperCase()}`,
      rfqId: input.rfqId,
      rfqNumber: input.rfqNumber,
      buyerId: input.buyerId,
      buyerName: input.buyerName,
      state: 'rfq_created',
      stateHistory: [{
        from: 'rfq_created' as DealState,
        to: 'rfq_created' as DealState,
        trigger: 'rfq_created',
        timestamp: new Date(),
      }],
      suppliers: input.suppliers.map(s => ({
        ...s,
        invitedAt: new Date(),
        responseStatus: 'pending' as const,
      })),
      quotes: [],
      totalValue: input.totalValue,
      paymentStatus: 'pending',
      fulfillmentStatus: 'pending',
      expiresAt: new Date(input.expiresAt),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.deals.set(deal.id, deal);
    return deal;
  }

  /**
   * Get deal by ID
   */
  getDeal(id: string): Deal | null {
    return this.deals.get(id) || null;
  }

  /**
   * Get deal by RFQ ID
   */
  getDealByRFQ(rfqId: string): Deal | null {
    for (const deal of this.deals.values()) {
      if (deal.rfqId === rfqId) return deal;
    }
    return null;
  }

  /**
   * Get all deals for a buyer
   */
  getDealsByBuyer(buyerId: string, filters?: { state?: DealState; status?: string }): Deal[] {
    let results = Array.from(this.deals.values()).filter(d => d.buyerId === buyerId);
    if (filters?.state) results = results.filter(d => d.state === filters.state);
    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Transition deal to a new state
   */
  transition(dealId: string, trigger: DealTrigger, actor?: string, notes?: string): Deal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    const validTriggers = STATE_TRANSITIONS[deal.state];
    if (!validTriggers.includes(trigger)) {
      console.warn(`[DealStateMachine] Invalid transition: ${deal.state} + ${trigger}`);
      return null;
    }

    const previousState = deal.state;
    deal.state = this.resolveNextState(deal.state, trigger);
    deal.updatedAt = new Date();

    deal.stateHistory.push({
      from: previousState,
      to: deal.state,
      trigger,
      timestamp: new Date(),
      actor,
      notes,
    });

    this.deals.set(dealId, deal);
    return deal;
  }

  /**
   * Record a quote from a supplier
   */
  recordQuote(input: RecordQuoteInput): Deal | null {
    const deal = this.deals.get(input.dealId);
    if (!deal) return null;

    // Determine round number
    const supplierQuotes = deal.quotes.filter(q => q.supplierId === input.supplierId);
    const round = supplierQuotes.length + 1;

    const quote: DealQuote = {
      id: randomUUID(),
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      round,
      quotedAmount: input.quotedAmount,
      deliveryDays: input.deliveryDays,
      paymentTerms: input.paymentTerms,
      validUntil: new Date(input.validUntil),
      notes: input.notes,
      status: 'pending',
      receivedAt: new Date(),
    };

    deal.quotes.push(quote);

    // Update supplier's best quote
    const supplier = deal.suppliers.find(s => s.supplierId === input.supplierId);
    if (supplier) {
      supplier.responseStatus = 'responded';
      if (!supplier.bestQuoteAmount || input.quotedAmount < supplier.bestQuoteAmount) {
        supplier.bestQuoteAmount = input.quotedAmount;
        supplier.bestQuoteAt = new Date();
      }
    }

    // Transition state
    this.transition(deal.id, 'quote_received');

    this.deals.set(deal.id, deal);
    return deal;
  }

  /**
   * Award deal to a supplier.
   *
   * Calls policy-os BEFORE transitioning to `awarded` to enforce
   * procurement governance. Possible outcomes:
   *   - effect=allow           → proceed with award
   *   - effect=require_approval → set pending_approval flag, do not award yet
   *   - effect=deny             → throw, no state change
   *   - source=fail-open        → log + proceed (fail-safe)
   *
   * Returns:
   *   - { deal, decision } if the deal was awarded
   *   - { deal, decision, pending: true } if approval is required
   *   - null if the dealId is unknown
   *   - throws PolicyDeniedError if policy explicitly denies
   */
  async awardDeal(input: AwardDealInput): Promise<{ deal: Deal; decision: PolicyDecision; pending?: boolean } | null> {
    const deal = this.deals.get(input.dealId);
    if (!deal) return null;

    const decision = await policyClient.evaluateAward({
      dealId: deal.id,
      buyerId: deal.buyerId,
      sellerId: input.supplierId,
      total: input.finalAmount,
      currency: deal.currency || 'INR',
      items: (deal.items || []).map((it: any) => ({
        sku: it.sku || it.productId || 'unknown',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
      })),
      supplier: {
        id: input.supplierId,
        knownToBuyer: true, // TODO: source from buyer-supplier history
      },
      buyerIndustry: 'restaurant',
    });

    // Persist the decision on the deal for audit + UI
    (deal as any).policyDecision = decision;

    if (!decision.allowed && decision.effect === 'deny') {
      // Policy explicitly denied — do not change state, surface to caller.
      this.deals.set(deal.id, deal);
      const err: any = new Error(`Policy denied: ${decision.reason}`);
      err.code = 'POLICY_DENIED';
      err.decision = decision;
      throw err;
    }

    if (decision.effect === 'require_approval') {
      // Mark deal as pending approval; orchestrator UI will show banner.
      (deal as any).pendingApproval = true;
      (deal as any).pendingApprover = decision.approver || 'manager';
      this.deals.set(deal.id, deal);
      // Best-effort audit (no await — don't block the response)
      policyClient.recordDecision(deal.id, decision).catch(() => {});
      return { deal, decision, pending: true };
    }

    // Allowed (or fail-open) — proceed with the award.
    const quote = deal.quotes.find(q => q.id === input.quoteId);
    if (quote) {
      quote.status = 'accepted';
    }
    deal.quotes.forEach(q => {
      if (q.id !== input.quoteId) {
        q.status = 'rejected';
      }
    });

    deal.awardedSupplierId = input.supplierId;
    deal.awardedQuoteId = input.quoteId;
    deal.awardedValue = input.finalAmount;

    this.transition(deal.id, 'deal_accepted');

    this.deals.set(deal.id, deal);
    policyClient.recordDecision(deal.id, decision).catch(() => {});
    return { deal, decision };
  }

  /**
   * Approve a deal that is in `pending_approval` state. Called when
   * a human manager clicks "Approve" in the dashboard.
   */
  approvePendingApproval(dealId: string, approver: string): Deal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;
    if (!(deal as any).pendingApproval) return deal;
    (deal as any).pendingApproval = false;
    (deal as any).approvedBy = approver;
    (deal as any).approvedAt = new Date().toISOString();
    this.deals.set(deal.id, deal);
    return deal;
  }

  /**
   * Update fulfillment status
   */
  updateFulfillment(input: UpdateFulfillmentInput): Deal | null {
    const deal = this.deals.get(input.dealId);
    if (!deal) return null;

    deal.fulfillmentStatus = input.status as Deal['fulfillmentStatus'];

    // State transitions based on fulfillment
    switch (input.status) {
      case 'processing':
        this.transition(deal.id, 'order_confirmed');
        break;
      case 'shipped':
        this.transition(deal.id, 'order_shipped');
        break;
      case 'delivered':
        this.transition(deal.id, 'order_delivered');
        break;
      case 'partial':
        this.transition(deal.id, 'return_requested');
        break;
      case 'returned':
        this.transition(deal.id, 'return_received');
        break;
    }

    this.deals.set(deal.id, deal);
    return deal;
  }

  /**
   * Mark payment as received
   */
  settlePayment(dealId: string, amount: number): Deal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    const totalAwarded = deal.awardedValue || deal.totalValue;
    if (amount >= totalAwarded) {
      deal.paymentStatus = 'paid';
      this.transition(deal.id, 'payment_received');
    } else {
      deal.paymentStatus = 'partial';
    }

    this.deals.set(dealId, deal);
    return deal;
  }

  /**
   * Cancel a deal
   */
  cancelDeal(dealId: string, reason: string, actor?: string): Deal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    deal.state = 'cancelled';
    deal.updatedAt = new Date();
    deal.stateHistory.push({
      from: deal.state,
      to: 'cancelled',
      trigger: 'cancellation_requested',
      timestamp: new Date(),
      actor,
      notes: reason,
    });

    this.deals.set(dealId, deal);
    return deal;
  }

  /**
   * Complete a deal (final state)
   */
  completeDeal(dealId: string): Deal | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    deal.state = 'completed';
    deal.completedAt = new Date();
    deal.updatedAt = new Date();
    deal.stateHistory.push({
      from: deal.state,
      to: 'completed',
      trigger: 'payment_settled',
      timestamp: new Date(),
    });

    this.deals.set(dealId, deal);
    return deal;
  }

  /**
   * Get the best quote across all suppliers
   */
  getBestQuote(dealId: string): DealQuote | null {
    const deal = this.deals.get(dealId);
    if (!deal) return null;

    const activeQuotes = deal.quotes.filter(q => q.status !== 'rejected' && q.status !== 'expired');
    if (activeQuotes.length === 0) return null;

    return activeQuotes.reduce((best, q) =>
      q.quotedAmount < best.quotedAmount ? q : best
    );
  }

  /**
   * Get deal statistics
   */
  getStats(): {
    total: number;
    byState: Record<DealState, number>;
    avgDealValue: number;
    activeDeals: number;
    completedDeals: number;
  } {
    const deals = Array.from(this.deals.values());
    const byState: Record<string, number> = {};
    let totalValue = 0;

    for (const deal of deals) {
      byState[deal.state] = (byState[deal.state] || 0) + 1;
      if (deal.awardedValue) totalValue += deal.awardedValue;
    }

    return {
      total: deals.length,
      byState: byState as Record<DealState, number>,
      avgDealValue: deals.length > 0 ? totalValue / deals.length : 0,
      activeDeals: deals.filter(d => !['completed', 'cancelled'].includes(d.state)).length,
      completedDeals: deals.filter(d => d.state === 'completed').length,
    };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private resolveNextState(current: DealState, trigger: DealTrigger): DealState {
    switch (trigger) {
      case 'invitations_sent': return 'invitations_sent';
      case 'quote_received': return 'quotes_received';
      case 'counter_offer': return 'negotiating';
      case 'deal_accepted': return 'awarded';
      case 'deal_rejected': return 'cancelled';
      case 'rfq_expired': return 'cancelled';
      case 'order_created': return 'order_created';
      case 'order_confirmed': return 'processing';
      case 'order_shipped': return 'shipped';
      case 'order_delivered': return 'delivered';
      case 'payment_received': return 'fulfilled';
      case 'payment_overdue': return 'fulfilled';
      case 'cancellation_requested': return 'cancelled';
      case 'return_requested': return 'partial';
      case 'return_received': return 'returned';
      case 'refund_processed': return 'refund_processed';
      default: return current;
    }
  }
}

// ============================================================================
// Exports
// ============================================================================

export const dealStateMachine = new DealStateMachine();
