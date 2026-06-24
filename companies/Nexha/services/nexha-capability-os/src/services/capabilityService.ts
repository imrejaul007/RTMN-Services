/**
 * CapabilityOS — Capability service
 *
 * In-memory store + matching engine. Replaces a DB for the MVP.
 * Stores capabilities indexed by id + secondary indexes for fast lookup.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Capability,
  CapabilityCategory,
  CapabilityMatch,
  CapabilityQuery,
  CapabilitySearchResult,
  NexhaCapabilityStats
} from '../types/index.js';

class CapabilityService {
  /** Primary store: capabilityId -> Capability */
  private store = new Map<string, Capability>();

  /** Seed catalog on boot — gives the demo something to query */
  seedDemoCapabilities(): number {
    if (this.store.size > 0) return 0; // already seeded

    const now = new Date().toISOString();
    const seeds: Omit<Capability, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        nexhaId: 'nexha-maya-collective',
        ownerId: 'agent-maya-merchant',
        name: 'AI Fashion Negotiation',
        description: 'AI agent that negotiates fashion SKU procurement with suppliers',
        longDescription: 'Trained on 100K+ fashion procurement negotiations. Handles RFQ, quote, counter, and settle.',
        category: 'agent',
        tags: ['fashion', 'negotiation', 'procurement', 'rfq', 'b2b'],
        pricing: { model: 'per-call', amount: 0.5, currency: 'USD' },
        trust: { verified: true, kycLevel: 'full', insurance: 100000 },
        regions: ['IN', 'US', 'GB', 'AE'],
        languages: ['en', 'hi'],
        slaMs: 3000,
        status: 'active'
      },
      {
        nexhaId: 'nexha-maya-collective',
        ownerId: 'service-maya-photo',
        name: 'AI Product Photography',
        description: 'Generate professional product photos from a single smartphone snap',
        category: 'service',
        tags: ['photography', 'product', 'fashion', 'ai', 'creative'],
        pricing: { model: 'per-call', amount: 2.0, currency: 'USD' },
        trust: { verified: true, kycLevel: 'full' },
        regions: ['IN', 'US', 'GB'],
        languages: ['en'],
        slaMs: 60000,
        status: 'active'
      },
      {
        nexhaId: 'nexha-logistics-mumbai',
        ownerId: 'service-last-mile',
        name: 'Mumbai Same-Day Delivery',
        description: 'Last-mile delivery within Mumbai Metropolitan Region',
        category: 'service',
        tags: ['logistics', 'delivery', 'mumbai', 'same-day', 'b2c'],
        pricing: { model: 'per-transaction', amount: 80, currency: 'INR' },
        trust: { verified: true, kycLevel: 'full', insurance: 50000 },
        regions: ['IN'],
        languages: ['en', 'hi', 'mr'],
        slaMs: 14400000, // 4 hours
        status: 'active'
      },
      {
        nexhaId: 'nexha-finance-singapore',
        ownerId: 'agent-tax-advisor',
        name: 'AI Tax Advisor (SG/IN)',
        description: 'Cross-border tax advisory for Singapore + India small businesses',
        category: 'agent',
        tags: ['tax', 'finance', 'singapore', 'india', 'compliance'],
        pricing: { model: 'subscription', amount: 499, currency: 'USD', unit: 'month' },
        trust: { verified: true, kycLevel: 'full', insurance: 250000 },
        regions: ['SG', 'IN'],
        languages: ['en'],
        slaMs: 3600000, // 1 hour
        status: 'active'
      },
      {
        nexhaId: 'nexha-legal-london',
        ownerId: 'service-contract-review',
        name: 'AI Contract Review (Common Law)',
        description: 'Review commercial contracts against 50K+ precedents',
        category: 'service',
        tags: ['legal', 'contracts', 'common-law', 'review', 'compliance'],
        pricing: { model: 'per-call', amount: 50, currency: 'GBP' },
        trust: { verified: true, kycLevel: 'full', insurance: 1000000 },
        regions: ['GB', 'US', 'SG', 'AE'],
        languages: ['en'],
        slaMs: 600000, // 10 min
        status: 'active'
      },
      {
        nexhaId: 'nexha-data-jakarta',
        ownerId: 'feed-indonesia-prices',
        name: 'Indonesia Retail Price Index',
        description: 'Real-time commodity prices across 200+ Indonesian markets',
        category: 'data',
        tags: ['prices', 'indonesia', 'retail', 'commodities', 'real-time'],
        pricing: { model: 'subscription', amount: 99, currency: 'USD', unit: 'month' },
        trust: { verified: true, kycLevel: 'basic' },
        regions: ['ID', 'SG', 'MY'],
        languages: ['id', 'en'],
        slaMs: 3600000,
        status: 'active'
      }
    ];

    let count = 0;
    for (const seed of seeds) {
      const cap: Capability = {
        ...seed,
        id: `cap-${uuidv4()}`,
        createdAt: now,
        updatedAt: now
      };
      this.store.set(cap.id, cap);
      count++;
    }
    return count;
  }

  /** Register a new capability. */
  register(input: Omit<Capability, 'id' | 'createdAt' | 'updatedAt'>): Capability {
    if (!input.nexhaId) throw new Error('nexhaId is required');
    if (!input.name) throw new Error('name is required');
    if (!input.category) throw new Error('category is required');

    const now = new Date().toISOString();
    const cap: Capability = {
      ...input,
      id: `cap-${uuidv4()}`,
      createdAt: now,
      updatedAt: now
    };
    this.store.set(cap.id, cap);
    return cap;
  }

  /** Update an existing capability. */
  update(id: string, patch: Partial<Omit<Capability, 'id' | 'createdAt'>>): Capability | null {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Capability = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString()
    };
    this.store.set(id, updated);
    return updated;
  }

  /** Get a capability by id. */
  get(id: string): Capability | null {
    return this.store.get(id) ?? null;
  }

  /** Delete a capability. */
  delete(id: string): boolean {
    return this.store.delete(id);
  }

  /**
   * Match capabilities against a query.
   * Scoring algorithm:
   * - Category match: 0.4
   * - Tag overlap (Jaccard): up to 0.3
   * - Free-text overlap: up to 0.15
   * - Region match: 0.05
   * - Language match: 0.05
   * - Verified: 0.05
   * Total capped at 1.0
   */
  match(query: CapabilityQuery): CapabilitySearchResult {
    const start = Date.now();
    const limit = Math.min(query.limit ?? 50, 200);
    const offset = query.offset ?? 0;

    // Filter by hard criteria first
    let candidates = Array.from(this.store.values()).filter((c) => {
      if (c.status !== 'active' && c.status !== 'draft') return false;
      if (query.category && c.category !== query.category) return false;
      if (query.nexhaId && c.nexhaId !== query.nexhaId) return false;
      if (query.region && !c.regions.includes(query.region)) return false;
      if (query.language && !c.languages.includes(query.language)) return false;
      if (query.verifiedOnly && !c.trust.verified) return false;
      if (query.tags && query.tags.length > 0) {
        const hasAll = query.tags.every((t) => c.tags.includes(t));
        if (!hasAll) return false;
      }
      if (query.maxPrice !== undefined && c.pricing.amount !== undefined) {
        if (query.currency && c.pricing.currency !== query.currency) {
          // currency mismatch — skip rather than compare apples to oranges
          return false;
        }
        if (c.pricing.amount > query.maxPrice) return false;
      }
      return true;
    });

    // Score
    const qTags = new Set((query.tags ?? []).map((t) => t.toLowerCase()));
    const qWords = (query.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);

    const matches: CapabilityMatch[] = candidates.map((cap) => {
      const reasons: string[] = [];
      let score = 0;

      // Category match (0.4)
      if (query.category && cap.category === query.category) {
        score += 0.4;
        reasons.push(`category:${cap.category}`);
      } else if (!query.category) {
        // No category filter — neutral, no bonus
      } else {
        // Category mismatch — already filtered out, but be safe
        return null as never;
      }

      // Tag overlap — Jaccard (up to 0.3)
      if (qTags.size > 0) {
        const capTags = new Set(cap.tags.map((t) => t.toLowerCase()));
        const intersection = new Set([...qTags].filter((t) => capTags.has(t)));
        const union = new Set([...qTags, ...capTags]);
        const jaccard = union.size > 0 ? intersection.size / union.size : 0;
        score += Math.min(0.3, jaccard * 0.6);
        if (intersection.size > 0) {
          reasons.push(`tags:${[...intersection].slice(0, 3).join(',')}`);
        }
      }

      // Free-text overlap (up to 0.15)
      if (qWords.length > 0) {
        const haystack = `${cap.name} ${cap.description} ${cap.tags.join(' ')}`.toLowerCase();
        const hits = qWords.filter((w) => haystack.includes(w));
        const textScore = hits.length / qWords.length;
        score += textScore * 0.15;
        if (hits.length > 0) {
          reasons.push(`text:${hits.length}/${qWords.length}`);
        }
      }

      // Region match (0.05)
      if (query.region && cap.regions.includes(query.region)) {
        score += 0.05;
        reasons.push(`region:${query.region}`);
      }

      // Language match (0.05)
      if (query.language && cap.languages.includes(query.language)) {
        score += 0.05;
        reasons.push(`lang:${query.language}`);
      }

      // Verified bonus (0.05)
      if (cap.trust.verified) {
        score += 0.05;
        reasons.push('verified');
      }

      // Cap at 1.0
      score = Math.min(1.0, score);

      return { capability: cap, score, reasons };
    }).filter((m): m is CapabilityMatch => m !== null);

    // Sort by score desc, then by name
    matches.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.capability.name.localeCompare(b.capability.name);
    });

    const total = matches.length;
    const paged = matches.slice(offset, offset + limit);

    return {
      matches: paged,
      total,
      query,
      took_ms: Date.now() - start
    };
  }

  /** Get stats for a Nexha. */
  getNexhaStats(nexhaId: string): NexhaCapabilityStats {
    const caps = Array.from(this.store.values()).filter((c) => c.nexhaId === nexhaId);
    const byCategory: Record<CapabilityCategory, number> = {
      skill: 0, service: 0, product: 0, agent: 0,
      data: 0, workflow: 0, integration: 0, content: 0
    };
    const byStatus: Record<Capability['status'], number> = {
      active: 0, draft: 0, deprecated: 0
    };
    let verifiedCount = 0;
    let lastUpdated: string | undefined;

    for (const cap of caps) {
      byCategory[cap.category]++;
      byStatus[cap.status]++;
      if (cap.trust.verified) verifiedCount++;
      if (!lastUpdated || cap.updatedAt > lastUpdated) {
        lastUpdated = cap.updatedAt;
      }
    }

    return {
      nexhaId,
      totalCapabilities: caps.length,
      byCategory,
      byStatus,
      verifiedCount,
      lastUpdated
    };
  }

  /** Aggregate stats across the entire federation. */
  getFederationStats(): { nexhas: number; totalCapabilities: number; byCategory: Record<CapabilityCategory, number>; byNexha: Array<{ nexhaId: string; count: number }> } {
    const caps = Array.from(this.store.values());
    const byCategory: Record<CapabilityCategory, number> = {
      skill: 0, service: 0, product: 0, agent: 0,
      data: 0, workflow: 0, integration: 0, content: 0
    };
    const nexhaCounts = new Map<string, number>();

    for (const cap of caps) {
      byCategory[cap.category]++;
      nexhaCounts.set(cap.nexhaId, (nexhaCounts.get(cap.nexhaId) ?? 0) + 1);
    }

    return {
      nexhas: nexhaCounts.size,
      totalCapabilities: caps.length,
      byCategory,
      byNexha: Array.from(nexhaCounts.entries()).map(([nexhaId, count]) => ({ nexhaId, count }))
    };
  }

  /** Total capabilities in store. */
  total(): number {
    return this.store.size;
  }

  /** List all capabilities (admin). */
  listAll(): Capability[] {
    return Array.from(this.store.values());
  }

  /** Clear store (testing only). */
  clear(): void {
    this.store.clear();
  }
}

// Singleton
const capabilityService = new CapabilityService();
export default capabilityService;