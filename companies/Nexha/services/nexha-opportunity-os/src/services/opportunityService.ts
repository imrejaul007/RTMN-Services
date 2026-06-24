/**
 * OpportunityOS — Opportunity + matching engine
 *
 * The federation's demand-side broker. Matches inbound opportunities
 * (buyers, projects, needs) with the best-fit capabilities.
 *
 * Match algorithm:
 *   matchScore = category (0.4) + tag-overlap (0.3) + free-text (0.15)
 *              + region (0.05) + language (0.05) + verified (0.05)
 *   finalScore = matchScore × (1 + trustBoost × aci/1000)
 *   budgetFit  = computed by comparing opportunity budget vs capability pricing
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Opportunity,
  OpportunityKind,
  OpportunityStatus,
  OpportunityPriority,
  CapabilityMatch,
  OpportunityMatch,
  OpportunityStats
} from '../types/index.js';

class OpportunityService {
  /** Opportunities: id → Opportunity */
  private opportunities = new Map<string, Opportunity>();
  /** Demo capabilities (mirror of CapabilityOS) + trust scores (ReputationOS) */
  private capabilities: Array<{
    id: string;
    nexhaId: string;
    nexhaName: string;
    name: string;
    category: string;
    tags: string[];
    pricing: { model: string; amount?: number; currency?: string };
    trust: { verified: boolean };
    regions: string[];
    languages: string[];
    aci: number;     // Trust score (0-1000)
    band: string;
  }> = [];

  // ─────────────────────────────────────────────────────────────────
  // Seed
  // ─────────────────────────────────────────────────────────────────

  seedDemo(): { opportunities: number; capabilities: number } {
    if (this.opportunities.size > 0) {
      return {
        opportunities: this.opportunities.size,
        capabilities: this.capabilities.length
      };
    }

    const now = () => new Date().toISOString();

    // Seed opportunities (the demand side)
    const seedOpps: Omit<Opportunity, 'bidsReceived' | 'updatedAt'>[] = [
      {
        id: 'opp-fashion-rfq-001',
        title: 'Bulk T-Shirt Procurement (50K units, Spring 2026)',
        description: 'Looking for a fashion supplier for our spring collection. Need 50K cotton t-shirts with custom embroidery, delivery to 5 warehouses across India + US.',
        kind: 'rfq',
        requiredCategories: ['agent', 'service'],
        requiredTags: ['fashion', 'procurement', 'negotiation', 'sourcing'],
        region: 'IN',
        language: 'en',
        budget: { amount: 250000, currency: 'USD', type: 'fixed' },
        priority: 'high',
        status: 'open',
        postedByNexhaId: 'nexha-maya-collective',
        postedByEntityId: 'agent-procurement-bot',
        closesAt: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString(),
        createdAt: now()
      },
      {
        id: 'opp-mumbai-delivery-001',
        title: 'B2C Same-Day Delivery for Mumbai Pilot',
        description: 'E-commerce company launching in Mumbai, need same-day delivery partner for first 30 days. ~500 parcels/day expected.',
        kind: 'job',
        requiredCategories: ['service'],
        requiredTags: ['logistics', 'delivery', 'mumbai', 'same-day'],
        region: 'IN',
        budget: { amount: 80, currency: 'INR', type: 'per-unit' },
        priority: 'urgent',
        status: 'open',
        postedByNexhaId: 'nexha-maya-collective',
        postedByEntityId: 'retail-ops-team',
        closesAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        createdAt: now()
      },
      {
        id: 'opp-sg-tax-001',
        title: 'Cross-Border Tax Advisory Subscription',
        description: 'SG/IN small business needs ongoing tax advisory. Looking for AI or human agent with both jurisdictions expertise.',
        kind: 'subscription',
        requiredCategories: ['agent', 'service'],
        requiredTags: ['tax', 'finance', 'singapore', 'india', 'compliance'],
        region: 'SG',
        language: 'en',
        budget: { amount: 499, currency: 'USD', type: 'hourly' },
        priority: 'normal',
        status: 'open',
        postedByNexhaId: 'nexha-finance-singapore',
        postedByEntityId: 'finance-team',
        createdAt: now()
      },
      {
        id: 'opp-contract-review-001',
        title: 'M&A Contract Review (50 documents)',
        description: 'Need rapid review of 50 commercial contracts for an upcoming M&A. Common-law jurisdiction (UK preferred).',
        kind: 'job',
        requiredCategories: ['service', 'agent'],
        requiredTags: ['legal', 'contracts', 'common-law', 'review'],
        region: 'GB',
        budget: { amount: 50, currency: 'GBP', type: 'per-unit' },
        priority: 'high',
        status: 'in-progress',
        postedByNexhaId: 'nexha-maya-collective',
        postedByEntityId: 'legal-team',
        createdAt: now()
      },
      {
        id: 'opp-data-feed-001',
        title: 'Real-Time Commodity Price Feed for Q3',
        description: 'Need daily commodity prices across Indonesia + SEA markets for our trading desk. Subscription model.',
        kind: 'data-request',
        requiredCategories: ['data'],
        requiredTags: ['prices', 'commodities', 'real-time'],
        region: 'ID',
        language: 'id',
        budget: { amount: 99, currency: 'USD', type: 'hourly' },
        priority: 'normal',
        status: 'open',
        postedByNexhaId: 'nexha-data-jakarta',
        postedByEntityId: 'analytics-team',
        createdAt: now()
      },
      {
        id: 'opp-fashion-photo-001',
        title: 'AI Product Photography Pipeline',
        description: 'Need to convert 10K smartphone snaps to professional product photos for our e-commerce site.',
        kind: 'job',
        requiredCategories: ['service'],
        requiredTags: ['photography', 'product', 'ai', 'fashion'],
        region: 'IN',
        language: 'en',
        budget: { amount: 2, currency: 'USD', type: 'per-unit' },
        priority: 'normal',
        status: 'closed',
        postedByNexhaId: 'nexha-maya-collective',
        postedByEntityId: 'creative-team',
        createdAt: now()
      }
    ];

    for (const opp of seedOpps) {
      const full: Opportunity = {
        ...opp,
        bidsReceived: 0,
        updatedAt: opp.createdAt
      };
      this.opportunities.set(full.id, full);
    }

    // Seed capabilities (mirror of CapabilityOS + ReputationOS combined)
    this.capabilities = [
      {
        id: 'cap-maya-merchant', nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective',
        name: 'AI Fashion Negotiation Agent', category: 'agent',
        tags: ['fashion', 'negotiation', 'procurement', 'rfq', 'b2b'],
        pricing: { model: 'per-call', amount: 0.5, currency: 'USD' },
        trust: { verified: true }, regions: ['IN', 'US', 'GB', 'AE'], languages: ['en', 'hi'],
        aci: 990, band: 'platinum'
      },
      {
        id: 'cap-maya-photo', nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective',
        name: 'AI Product Photography', category: 'service',
        tags: ['photography', 'product', 'fashion', 'ai', 'creative'],
        pricing: { model: 'per-call', amount: 2, currency: 'USD' },
        trust: { verified: true }, regions: ['IN', 'US', 'GB'], languages: ['en'],
        aci: 990, band: 'platinum'
      },
      {
        id: 'cap-mumbai-delivery', nexhaId: 'nexha-logistics-mumbai', nexhaName: 'Mumbai Logistics Network',
        name: 'Mumbai Same-Day Delivery', category: 'service',
        tags: ['logistics', 'delivery', 'mumbai', 'same-day', 'b2c'],
        pricing: { model: 'per-transaction', amount: 80, currency: 'INR' },
        trust: { verified: true }, regions: ['IN'], languages: ['en', 'hi', 'mr'],
        aci: 767, band: 'silver'
      },
      {
        id: 'cap-tax-advisor', nexhaId: 'nexha-finance-singapore', nexhaName: 'Singapore Finance Hub',
        name: 'AI Tax Advisor (SG/IN)', category: 'agent',
        tags: ['tax', 'finance', 'singapore', 'india', 'compliance'],
        pricing: { model: 'subscription', amount: 499, currency: 'USD' },
        trust: { verified: true }, regions: ['SG', 'IN'], languages: ['en'],
        aci: 720, band: 'silver'
      },
      {
        id: 'cap-contract-review', nexhaId: 'nexha-legal-london', nexhaName: 'London Legal Consortium',
        name: 'AI Contract Review (Common Law)', category: 'service',
        tags: ['legal', 'contracts', 'common-law', 'review', 'compliance'],
        pricing: { model: 'per-call', amount: 50, currency: 'GBP' },
        trust: { verified: true }, regions: ['GB', 'US', 'SG', 'AE'], languages: ['en'],
        aci: 780, band: 'silver'
      },
      {
        id: 'cap-indo-prices', nexhaId: 'nexha-data-jakarta', nexhaName: 'Jakarta Data Cooperative',
        name: 'Indonesia Retail Price Index', category: 'data',
        tags: ['prices', 'indonesia', 'retail', 'commodities', 'real-time'],
        pricing: { model: 'subscription', amount: 99, currency: 'USD' },
        trust: { verified: true }, regions: ['ID', 'SG', 'MY'], languages: ['id', 'en'],
        aci: 580, band: 'bronze'
      },
      {
        id: 'cap-rogue-cheap', nexhaId: 'nexha-rogue-supplier', nexhaName: 'Anomaly Goods',
        name: 'Ultra-Cheap AI Service (Suspicious)', category: 'service',
        tags: ['cheap', 'ai', 'suspicious'],
        pricing: { model: 'per-call', amount: 0.001, currency: 'USD' },
        trust: { verified: false }, regions: ['XX'], languages: ['en'],
        aci: 80, band: 'restricted'
      }
    ];

    return {
      opportunities: this.opportunities.size,
      capabilities: this.capabilities.length
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Opportunity CRUD
  // ─────────────────────────────────────────────────────────────────

  post(input: Omit<Opportunity, 'id' | 'bidsReceived' | 'createdAt' | 'updatedAt'>): Opportunity {
    if (!input.title) throw new Error('title is required');
    if (!input.postedByNexhaId) throw new Error('postedByNexhaId is required');
    if (!input.requiredCategories || input.requiredCategories.length === 0) {
      throw new Error('At least one requiredCategory is required');
    }
    const id = `opp-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const opp: Opportunity = {
      ...input,
      id,
      bidsReceived: 0,
      createdAt: now,
      updatedAt: now
    };
    this.opportunities.set(id, opp);
    return opp;
  }

  get(id: string): Opportunity | null {
    return this.opportunities.get(id) ?? null;
  }

  list(filter: { kind?: OpportunityKind; status?: OpportunityStatus; postedByNexhaId?: string; priority?: OpportunityPriority } = {}): Opportunity[] {
    let results = Array.from(this.opportunities.values());
    if (filter.kind) results = results.filter((o) => o.kind === filter.kind);
    if (filter.status) results = results.filter((o) => o.status === filter.status);
    if (filter.postedByNexhaId) results = results.filter((o) => o.postedByNexhaId === filter.postedByNexhaId);
    if (filter.priority) results = results.filter((o) => o.priority === filter.priority);
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  update(id: string, patch: Partial<Omit<Opportunity, 'id' | 'createdAt'>>): Opportunity | null {
    const existing = this.opportunities.get(id);
    if (!existing) return null;
    const updated: Opportunity = { ...existing, ...patch, id: existing.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() };
    this.opportunities.set(id, updated);
    return updated;
  }

  incrementBids(id: string): Opportunity | null {
    const existing = this.opportunities.get(id);
    if (!existing) return null;
    return this.update(id, { bidsReceived: existing.bidsReceived + 1 });
  }

  // ─────────────────────────────────────────────────────────────────
  // Matching (the killer feature)
  // ─────────────────────────────────────────────────────────────────

  private computeMatch(opp: Opportunity, cap: typeof this.capabilities[0]): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Category match (0.4)
    if (opp.requiredCategories.includes(cap.category)) {
      score += 0.4;
      reasons.push(`category:${cap.category}`);
    } else {
      return { score: 0, reasons: [] }; // Hard mismatch
    }

    // Tag overlap — Jaccard (0.3)
    if (opp.requiredTags.length > 0) {
      const qTags = new Set(opp.requiredTags.map((t) => t.toLowerCase()));
      const capTags = new Set(cap.tags.map((t) => t.toLowerCase()));
      const intersection = new Set([...qTags].filter((t) => capTags.has(t)));
      const union = new Set([...qTags, ...capTags]);
      const jaccard = union.size > 0 ? intersection.size / union.size : 0;
      score += Math.min(0.3, jaccard * 0.6);
      if (intersection.size > 0) {
        reasons.push(`tags:${[...intersection].slice(0, 3).join(',')}`);
      }
    }

    // Free-text (opp description vs cap name+tags)
    const qWords = (opp.title + ' ' + opp.description).toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const haystack = `${cap.name} ${cap.tags.join(' ')}`.toLowerCase();
    const hits = qWords.filter((w) => haystack.includes(w));
    if (hits.length > 0) {
      const textScore = Math.min(1, hits.length / 3); // saturate at 3 hits
      score += textScore * 0.15;
      reasons.push(`text:${hits.length}`);
    }

    // Region match (0.05)
    if (cap.regions.includes(opp.region)) {
      score += 0.05;
      reasons.push(`region:${opp.region}`);
    }

    // Language match (0.05)
    if (opp.language && cap.languages.includes(opp.language)) {
      score += 0.05;
      reasons.push(`lang:${opp.language}`);
    }

    // Verified (0.05)
    if (cap.trust.verified) {
      score += 0.05;
      reasons.push('verified');
    }

    score = Math.min(1.0, score);
    return { score, reasons };
  }

  private computeBudgetFit(opp: Opportunity, cap: typeof this.capabilities[0]): 'under' | 'within' | 'over' | 'unknown' {
    if (!cap.pricing.amount || !cap.pricing.currency) return 'unknown';
    if (cap.pricing.currency !== opp.budget.currency) return 'unknown';

    // For per-unit/hour pricing, compare directly
    if (cap.pricing.model === 'per-call' || cap.pricing.model === 'per-unit' || cap.pricing.model === 'per-transaction' || cap.pricing.model === 'hourly') {
      if (cap.pricing.amount < opp.budget.amount * 0.5) return 'under';
      if (cap.pricing.amount > opp.budget.amount * 2) return 'over';
      return 'within';
    }
    // For subscriptions / fixed / quote, no direct comparison
    return 'unknown';
  }

  /** Match a single opportunity against all capabilities. */
  matchOpportunity(opportunityId: string, trustBoost: number = 0.3): OpportunityMatch | null {
    const start = Date.now();
    const opp = this.opportunities.get(opportunityId);
    if (!opp) return null;

    const matches: CapabilityMatch[] = [];
    for (const cap of this.capabilities) {
      const match = this.computeMatch(opp, cap);
      if (match.score === 0) continue;
      const aciNormalized = cap.aci / 1000;
      const finalScore = match.score * (1 + trustBoost * aciNormalized);
      const budgetFit = this.computeBudgetFit(opp, cap);
      const allReasons = [...match.reasons];
      if (cap.aci >= 700) allReasons.push(`trust:${cap.band}`);
      if (cap.aci < 300) allReasons.push('trust:restricted');

      matches.push({
        capabilityId: cap.id,
        nexhaId: cap.nexhaId,
        nexhaName: cap.nexhaName,
        capabilityName: cap.name,
        capabilityCategory: cap.category,
        matchScore: Math.round(match.score * 1000) / 1000,
        aci: cap.aci,
        band: cap.band,
        finalScore: Math.round(finalScore * 1000) / 1000,
        budgetFit,
        reasons: allReasons,
        pricing: cap.pricing
      });
    }

    matches.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      return (b.aci ?? 0) - (a.aci ?? 0);
    });

    return {
      opportunity: opp,
      matches,
      totalCandidates: this.capabilities.length,
      tookMs: Date.now() - start
    };
  }

  /** Match all open opportunities. */
  matchAll(trustBoost: number = 0.3): OpportunityMatch[] {
    const openOpps = this.list({ status: 'open' });
    const results: OpportunityMatch[] = [];
    for (const opp of openOpps) {
      const match = this.matchOpportunity(opp.id, trustBoost);
      if (match) results.push(match);
    }
    return results;
  }

  /** Federation stats. */
  getStats(): OpportunityStats {
    const all = Array.from(this.opportunities.values());
    const byKind: Record<OpportunityKind, number> = {
      rfq: 0, job: 0, subscription: 0, partnership: 0,
      'data-request': 0, support: 0, integration: 0
    };
    const byStatus: Record<OpportunityStatus, number> = {
      open: 0, 'in-progress': 0, closed: 0, cancelled: 0, expired: 0
    };
    const averageBudgetByCurrency: Record<string, number> = {};
    let totalBids = 0;

    for (const o of all) {
      byKind[o.kind]++;
      byStatus[o.status]++;
      totalBids += o.bidsReceived;
      const c = o.budget.currency;
      if (!averageBudgetByCurrency[c]) {
        averageBudgetByCurrency[c] = o.budget.amount;
      } else {
        averageBudgetByCurrency[c] = (averageBudgetByCurrency[c] + o.budget.amount) / 2;
      }
    }

    return {
      totalOpportunities: all.length,
      byKind,
      byStatus,
      totalBids,
      openCount: byStatus.open,
      averageBudgetByCurrency
    };
  }

  reset(): void {
    this.opportunities.clear();
    this.capabilities = [];
  }
}

const opportunityService = new OpportunityService();
export default opportunityService;