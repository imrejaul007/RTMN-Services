/**
 * Policy-OS Client
 *
 * Bridges procurement-os to HOJAI PolicyOS (port 4254). Called by
 * deal.service.ts before transitioning a deal to `awarded` so that
 * governance rules (amount thresholds, supplier verification, etc.)
 * can require approval, block, or auto-allow the transaction.
 *
 * Usage:
 *   const decision = await policyClient.evaluateAward({
 *     dealId, buyerId, sellerId, total, currency,
 *     items, supplier: { id, knownToBuyer, trustScore },
 *   });
 *   if (!decision.allowed) { ... }
 *
 * The default policy `restaurant-procurement-v1` (seeded in
 * policy-os/seed/restaurant-procurement.policy.json) covers:
 *   - Block POs > ₹500,000
 *   - Require approval for ₹50,000–₹500,000
 *   - Auto-approve ≤ ₹50,000 from known suppliers
 *   - Always require approval for new suppliers
 *
 * Fail-open: if policy-os is unreachable, the call returns
 * { allowed: true, source: 'fail-open' } so procurement doesn't
 * stall. The orchestrator emits a `policy.failopen` event for
 * reconciliation.
 */

import axios, { AxiosInstance } from 'axios';

export type PolicyDecisionEffect = 'allow' | 'deny' | 'require_approval';

export interface PolicyContext {
  dealId: string;
  buyerId: string;
  sellerId: string;
  total: number;
  currency?: string;
  items: Array<{ sku: string; quantity: number; unitPrice: number }>;
  supplier: {
    id: string;
    knownToBuyer: boolean;
    trustScore?: number;
  };
  buyerIndustry?: string;
}

export interface PolicyDecision {
  allowed: boolean;
  effect: PolicyDecisionEffect;
  reason: string;
  approver?: string;
  policyId?: string;
  source?: 'policy-os' | 'fail-open';
  evaluatedAt?: string;
  raw?: unknown;
}

const DEFAULT_POLICY_ID = process.env.PROCUREMENT_POLICY_ID || 'restaurant-procurement-v1';
const POLICY_OS_URL = process.env.POLICY_OS_URL || 'http://localhost:4254';
const REQUEST_TIMEOUT_MS = 3000;

export class PolicyClient {
  private client: AxiosInstance;
  private policyId: string;

  constructor(opts: { policyId?: string; baseUrl?: string } = {}) {
    this.policyId = opts.policyId || DEFAULT_POLICY_ID;
    this.client = axios.create({
      baseURL: opts.baseUrl || POLICY_OS_URL,
      timeout: REQUEST_TIMEOUT_MS,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Evaluate the procurement award against the active policy.
   * Returns a normalized decision. Fail-open on transport errors.
   */
  async evaluateAward(context: PolicyContext): Promise<PolicyDecision> {
    try {
      const body = {
        policyId: this.policyId,
        context: {
          action: 'procurement.award',
          industry: context.buyerIndustry || 'restaurant',
          dealId: context.dealId,
          buyerId: context.buyerId,
          sellerId: context.sellerId,
          total: context.total,
          currency: context.currency || 'INR',
          items: context.items,
          supplier: {
            id: context.supplier.id,
            knownToBuyer: context.supplier.knownToBuyer,
            trustScore: context.supplier.trustScore ?? null,
          },
        },
      };

      const resp = await this.client.post('/api/policies/evaluate', body);
      const data = resp.data || {};
      const allowed = data.allowed !== false;
      const effect = (data.effect || (allowed ? 'allow' : 'deny')) as PolicyDecisionEffect;

      return {
        allowed,
        effect,
        reason: data.reason || (allowed ? 'Policy allows' : 'Policy denies'),
        approver: data.approver,
        policyId: data.policyUsed || this.policyId,
        source: 'policy-os',
        evaluatedAt: data.evaluatedAt || new Date().toISOString(),
        raw: data,
      };
    } catch (err: any) {
      // Fail-open: log and let the orchestrator continue.
      const message = err && err.message ? err.message : String(err);
      console.warn(`[policy-client] policy-os unreachable, fail-open: ${message}`);
      return {
        allowed: true,
        effect: 'allow',
        reason: `fail-open: policy-os unreachable (${message})`,
        policyId: this.policyId,
        source: 'fail-open',
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  /** Submit a policy decision event for audit. Best-effort. */
  async recordDecision(dealId: string, decision: PolicyDecision): Promise<void> {
    try {
      await this.client.post('/api/policies/audit', {
        type: 'procurement.policy.decision',
        dealId,
        decision,
        at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn(`[policy-client] failed to record audit: ${err.message}`);
    }
  }
}

export const policyClient = new PolicyClient();