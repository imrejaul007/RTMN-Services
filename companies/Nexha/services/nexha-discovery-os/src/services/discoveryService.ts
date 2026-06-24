/**
 * DiscoveryOS — Discovery + ranking engine
 *
 * Discovers capabilities across the federation by:
 *  1. Pulling capabilities from CapabilityOS (cached)
 *  2. Pulling trust scores from ReputationOS (cached)
 *  3. Combining: finalScore = matchScore × (1 + trustBoost × aci/1000)
 *
 * The trust-boost multiplier rewards high-trust Nexhas in results — so a
 * bronze-score match from a platinum Nexha can outrank a 100% match from
 * a restricted Nexha (configurable).
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Capability,
  DiscoveryQuery,
  DiscoveryResult,
  DiscoveryResponse,
  IndexedCapability,
  TrustScore
} from '../types/index.js';

/** Band → minimum ACI value. */
const BAND_MIN_ACI: Record<string, number> = {
  platinum: 900,
  gold: 800,
  silver: 700,
  bronze: 500,
  iron: 300,
  restricted: 0,
  any: 0
};

class DiscoveryService {
  /** Indexed capabilities: capabilityId → IndexedCapability */
  private index = new Map<string, IndexedCapability>();
  /** Per-Nexha capability lists for fast lookup. */
  private byNexha = new Map<string, Set<string>>();
  /** TTL for cache entries (ms). */
  private readonly TTL_MS = 60_000;

  /** Seed a demo federation for testing. */
  seedDemo(): { nexhas: string; capabilities: number; scored: number } {
    if (this.index.size > 0) {
      return {
        nexhas: String(this.byNexha.size),
        capabilities: this.index.size,
        scored: this.countScored()
      };
    }

    const now = () => new Date().toISOString();
    const entries: Array<{
      capability: Capability;
      trust: TrustScore | null;
    }> = [
      // Maya Collective — high-trust fashion agent
      {
        capability: {
          id: 'cap-maya-merchant',
          nexhaId: 'nexha-maya-collective',
          name: 'AI Fashion Negotiation Agent',
          description: 'AI agent that negotiates fashion SKU procurement with suppliers',
          category: 'agent',
          tags: ['fashion', 'negotiation', 'procurement', 'rfq', 'b2b'],
          pricing: { model: 'per-call', amount: 0.5, currency: 'USD' },
          trust: { verified: true, kycLevel: 'full', insurance: 100000 },
          regions: ['IN', 'US', 'GB', 'AE'],
          languages: ['en', 'hi'],
          slaMs: 3000,
          status: 'active'
        },
        trust: { subjectId: 'nexha-maya-collective', aci: 990, band: 'platinum' }
      },
      {
        capability: {
          id: 'cap-maya-photo',
          nexhaId: 'nexha-maya-collective',
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
        trust: { subjectId: 'nexha-maya-collective', aci: 990, band: 'platinum' }
      },
      // Mumbai Logistics — high-trust delivery
      {
        capability: {
          id: 'cap-mumbai-delivery',
          nexhaId: 'nexha-logistics-mumbai',
          name: 'Mumbai Same-Day Delivery',
          description: 'Last-mile delivery within Mumbai Metropolitan Region',
          category: 'service',
          tags: ['logistics', 'delivery', 'mumbai', 'same-day', 'b2c'],
          pricing: { model: 'per-transaction', amount: 80, currency: 'INR' },
          trust: { verified: true, kycLevel: 'full', insurance: 50000 },
          regions: ['IN'],
          languages: ['en', 'hi', 'mr'],
          slaMs: 14400000,
          status: 'active'
        },
        trust: { subjectId: 'nexha-logistics-mumbai', aci: 767, band: 'silver' }
      },
      // Singapore Finance — silver
      {
        capability: {
          id: 'cap-tax-advisor',
          nexhaId: 'nexha-finance-singapore',
          name: 'AI Tax Advisor (SG/IN)',
          description: 'Cross-border tax advisory for Singapore + India small businesses',
          category: 'agent',
          tags: ['tax', 'finance', 'singapore', 'india', 'compliance'],
          pricing: { model: 'subscription', amount: 499, currency: 'USD' },
          trust: { verified: true, kycLevel: 'full', insurance: 250000 },
          regions: ['SG', 'IN'],
          languages: ['en'],
          slaMs: 3600000,
          status: 'active'
        },
        trust: { subjectId: 'nexha-finance-singapore', aci: 720, band: 'silver' }
      },
      // London Legal — silver
      {
        capability: {
          id: 'cap-contract-review',
          nexhaId: 'nexha-legal-london',
          name: 'AI Contract Review (Common Law)',
          description: 'Review commercial contracts against 50K+ precedents',
          category: 'service',
          tags: ['legal', 'contracts', 'common-law', 'review', 'compliance'],
          pricing: { model: 'per-call', amount: 50, currency: 'GBP' },
          trust: { verified: true, kycLevel: 'full', insurance: 1000000 },
          regions: ['GB', 'US', 'SG', 'AE'],
          languages: ['en'],
          slaMs: 600000,
          status: 'active'
        },
        trust: { subjectId: 'nexha-legal-london', aci: 780, band: 'silver' }
      },
      // Jakarta Data — bronze
      {
        capability: {
          id: 'cap-indo-prices',
          nexhaId: 'nexha-data-jakarta',
          name: 'Indonesia Retail Price Index',
          description: 'Real-time commodity prices across 200+ Indonesian markets',
          category: 'data',
          tags: ['prices', 'indonesia', 'retail', 'commodities', 'real-time'],
          pricing: { model: 'subscription', amount: 99, currency: 'USD' },
          trust: { verified: true, kycLevel: 'basic' },
          regions: ['ID', 'SG', 'MY'],
          languages: ['id', 'en'],
          slaMs: 3600000,
          status: 'active'
        },
        trust: { subjectId: 'nexha-data-jakarta', aci: 580, band: 'bronze' }
      },
      // Rogue Nexha — restricted (for testing trust boost)
      {
        capability: {
          id: 'cap-rogue-cheap',
          nexhaId: 'nexha-rogue-supplier',
          name: 'Ultra-Cheap AI Service (Suspiciously Cheap)',
          description: 'AI service at 90% below market rate — too good to be true',
          category: 'service',
          tags: ['cheap', 'ai', 'suspicious'],
          pricing: { model: 'per-call', amount: 0.001, currency: 'USD' },
          trust: { verified: false, kycLevel: 'none' },
          regions: ['XX'],
          languages: ['en'],
          slaMs: 5000,
          status: 'active'
        },
        trust: { subjectId: 'nexha-rogue-supplier', aci: 80, band: 'restricted' }
      }
    ];

    for (const e of entries) {
      this.index.set(e.capability.id, {
        capability: e.capability,
        trust: e.trust,
        indexedAt: now()
      });
      const nexhaSet = this.byNexha.get(e.capability.nexhaId) ?? new Set<string>();
      nexhaSet.add(e.capability.id);
      this.byNexha.set(e.capability.nexhaId, nexhaSet);
    }

    return {
      nexhas: String(this.byNexha.size),
      capabilities: this.index.size,
      scored: this.countScored()
    };
  }

  /** Index/refresh a single capability from CapabilityOS. */
  upsertCapability(cap: Capability, trust: TrustScore | null): void {
    this.index.set(cap.id, { capability: cap, trust, indexedAt: new Date().toISOString() });
    const nexhaSet = this.byNexha.get(cap.nexhaId) ?? new Set<string>();
    nexhaSet.add(cap.id);
    this.byNexha.set(cap.nexhaId, nexhaSet);
  }

  /** Remove a capability from index (e.g. when deleted from CapabilityOS). */
  removeCapability(capId: string): boolean {
    const idx = this.index.get(capId);
    if (!idx) return false;
    this.index.delete(capId);
    const nexhaSet = this.byNexha.get(idx.capability.nexhaId);
    if (nexhaSet) {
      nexhaSet.delete(capId);
      if (nexhaSet.size === 0) this.byNexha.delete(idx.capability.nexhaId);
    }
    return true;
  }

  /** Get a single indexed capability. */
  get(capId: string): IndexedCapability | null {
    const idx = this.index.get(capId);
    if (!idx) return null;
    // TTL check
    if (Date.now() - new Date(idx.indexedAt).getTime() > this.TTL_MS) {
      this.index.delete(capId);
      return null;
    }
    return idx;
  }

  /** Compute match score for a query against a capability. */
  private computeMatchScore(query: DiscoveryQuery, cap: Capability): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Category match (0.4)
    if (query.category && cap.category === query.category) {
      score += 0.4;
      reasons.push(`category:${cap.category}`);
    } else if (!query.category) {
      // Neutral
    } else {
      return { score: 0, reasons: [] }; // Hard mismatch
    }

    // Tag overlap — Jaccard (up to 0.3)
    if (query.tags && query.tags.length > 0) {
      const qTags = new Set(query.tags.map((t) => t.toLowerCase()));
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
    if (query.q) {
      const qWords = query.q.toLowerCase().split(/\s+/).filter(Boolean);
      const haystack = `${cap.name} ${cap.description} ${cap.tags.join(' ')}`.toLowerCase();
      const hits = qWords.filter((w) => haystack.includes(w));
      const textScore = hits.length / qWords.length;
      score += textScore * 0.15;
      if (hits.length > 0) reasons.push(`text:${hits.length}/${qWords.length}`);
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

    score = Math.min(1.0, score);
    return { score, reasons };
  }

  /** Apply trust boost to a match score. */
  private applyTrustBoost(matchScore: number, trust: TrustScore | null, boost: number): { finalScore: number; aci: number | null; band: string } {
    if (!trust) {
      return { finalScore: matchScore, aci: null, band: 'unknown' };
    }
    const aciNormalized = trust.aci / 1000; // 0-1
    const multiplier = 1 + (boost * aciNormalized);
    return {
      finalScore: Math.min(1.0, matchScore * multiplier),
      aci: trust.aci,
      band: trust.band
    };
  }

  /** Main discovery API. */
  discover(query: DiscoveryQuery): DiscoveryResponse {
    const start = Date.now();
    const limit = Math.min(query.limit ?? 50, 200);
    const offset = query.offset ?? 0;
    const trustBoost = query.trustBoost ?? 0.3;
    const minAci = BAND_MIN_ACI[query.minAciBand ?? 'any'] ?? 0;

    let candidates = Array.from(this.index.values()).filter((idx) => {
      // TTL check
      if (Date.now() - new Date(idx.indexedAt).getTime() > this.TTL_MS) {
        this.index.delete(idx.capability.id);
        return false;
      }
      const cap = idx.capability;
      // Hard filters
      if (query.nexhaId && cap.nexhaId !== query.nexhaId) return false;
      if (query.region && !cap.regions.includes(query.region)) return false;
      if (query.language && !cap.languages.includes(query.language)) return false;
      if (query.verifiedOnly && !cap.trust.verified) return false;
      // Trust band filter
      if (idx.trust && idx.trust.aci < minAci) return false;
      // Tags ALL must match
      if (query.tags && query.tags.length > 0) {
        const hasAll = query.tags.every((t) => cap.tags.includes(t));
        if (!hasAll) return false;
      }
      return true;
    });

    // Score each candidate
    const results: DiscoveryResult[] = [];
    for (const idx of candidates) {
      const match = this.computeMatchScore(query, idx.capability);
      if (match.score === 0) continue;
      const trust = this.applyTrustBoost(match.score, idx.trust, trustBoost);
      const allReasons = [...match.reasons];
      if (idx.trust && idx.trust.aci >= 700) allReasons.push(`trust:${idx.trust.band}`);
      if (idx.trust && idx.trust.aci < 300) allReasons.push('trust:restricted');

      results.push({
        capability: idx.capability,
        matchScore: Math.round(match.score * 1000) / 1000,
        aci: trust.aci,
        band: trust.band,
        finalScore: Math.round(trust.finalScore * 1000) / 1000,
        reasons: allReasons
      });
    }

    // Sort by finalScore desc
    results.sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      // Tiebreak by aci desc
      return (b.aci ?? 0) - (a.aci ?? 0);
    });

    const total = results.length;
    const paged = results.slice(offset, offset + limit);
    const searchedNexhas = Array.from(new Set(candidates.map((c) => c.capability.nexhaId)));

    return {
      results: paged,
      total,
      query,
      tookMs: Date.now() - start,
      searchedNexhas,
      cached: false // could check cache here
    };
  }

  /** Get indexed counts. */
  stats(): { capabilities: number; nexhas: number; scored: number } {
    return {
      capabilities: this.index.size,
      nexhas: this.byNexha.size,
      scored: this.countScored()
    };
  }

  /** Count entries with a non-null trust score. */
  private countScored(): number {
    return Array.from(this.index.values()).filter((idx) => idx.trust !== null).length;
  }

  /** Reset for testing. */
  reset(): void {
    this.index.clear();
    this.byNexha.clear();
  }
}

const discoveryService = new DiscoveryService();
export default discoveryService;