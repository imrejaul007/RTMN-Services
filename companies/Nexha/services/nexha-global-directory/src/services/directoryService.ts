/**
 * Global Directory — Directory service
 *
 * Maintains a unified index of all entities across the federation:
 *   - Nexhas (from FederationOS)
 *   - Capabilities (from CapabilityOS)
 *   - Opportunities (from OpportunityOS)
 *   - Data feeds (from MarketOS)
 *   - Services (from CapabilityOS)
 *
 * Each entity is normalized to a `Listing` with the same shape.
 * Search supports text + filters + trust-aware ranking.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Listing,
  ListingKind,
  DirectoryQuery,
  DirectoryMatch,
  DirectoryResponse,
  DirectoryStats,
  TrustBand
} from '../types/index.js';

class DirectoryService {
  /** All listings by ID */
  private listings = new Map<string, Listing>();

  // ───────────────────────────────────────────────────────────────
  // Seed demo directory
  // ───────────────────────────────────────────────────────────────
  seedDemo(): { listings: number; nexhas: number } {
    if (this.listings.size > 0) {
      // Count unique nexhas
      const nexhas = new Set(Array.from(this.listings.values()).map((l) => l.nexhaId));
      return { listings: this.listings.size, nexhas: nexhas.size };
    }

    const now = new Date().toISOString();
    const baseDate = new Date(Date.now() - 90 * 24 * 3600 * 1000);

    // 20 demo listings across 6 Nexhas
    const seedListings: Array<Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>> = [
      // ---- Maya Collective (founding, IN, platinum) ----
      {
        kind: 'nexha', name: 'Maya Collective', description: 'Fashion, AI agents, and creative services federation. Founding member of the Nexha network.',
        nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective', nexhaTier: 'founding',
        tags: ['fashion', 'ai', 'agent', 'creative', 'founding-member'],
        category: 'nexha', region: 'IN', languages: ['en', 'hi'],
        aci: 990, band: 'platinum', status: 'active',
        price: undefined, budget: undefined,
        href: 'https://maya-collective.example', classification: undefined
      },
      {
        kind: 'capability', name: 'AI Fashion Negotiation Agent', description: 'AI agent that negotiates fashion SKU procurement with suppliers',
        nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective', nexhaTier: 'founding',
        tags: ['fashion', 'negotiation', 'procurement', 'rfq', 'b2b'],
        category: 'agent', region: 'IN', languages: ['en', 'hi'],
        aci: 990, band: 'platinum', status: 'active',
        price: { amount: 0.5, currency: 'USD', model: 'per-call' }, budget: undefined,
        href: 'https://maya-collective.example/agents/negotiation'
      },
      {
        kind: 'capability', name: 'AI Product Photography', description: 'Generate professional product photos from a single smartphone snap',
        nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective', nexhaTier: 'founding',
        tags: ['photography', 'product', 'fashion', 'ai', 'creative'],
        category: 'service', region: 'IN', languages: ['en'],
        aci: 990, band: 'platinum', status: 'active',
        price: { amount: 2, currency: 'USD', model: 'per-call' }, budget: undefined
      },
      {
        kind: 'opportunity', name: 'Bulk T-Shirt Procurement (50K units)', description: 'Looking for a fashion supplier for our spring collection. Need 50K cotton t-shirts with custom embroidery.',
        nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective', nexhaTier: 'founding',
        tags: ['fashion', 'procurement', 'negotiation', 'sourcing', 'b2b'],
        category: 'agent', region: 'IN', languages: ['en'],
        aci: 990, band: 'platinum', status: 'active',
        price: undefined, budget: { amount: 250000, currency: 'USD', type: 'fixed' }
      },

      // ---- Mumbai Logistics (strategic, IN, silver) ----
      {
        kind: 'nexha', name: 'Mumbai Logistics Network', description: 'Same-day delivery + warehousing across Mumbai Metro. Strategic member.',
        nexhaId: 'nexha-logistics-mumbai', nexhaName: 'Mumbai Logistics Network', nexhaTier: 'strategic',
        tags: ['logistics', 'delivery', 'mumbai', 'warehousing', 'b2c'],
        category: 'nexha', region: 'IN', languages: ['en', 'hi', 'mr'],
        aci: 767, band: 'silver', status: 'active'
      },
      {
        kind: 'service', name: 'Mumbai Same-Day Delivery', description: 'Last-mile delivery within Mumbai Metropolitan Region',
        nexhaId: 'nexha-logistics-mumbai', nexhaName: 'Mumbai Logistics Network', nexhaTier: 'strategic',
        tags: ['logistics', 'delivery', 'mumbai', 'same-day', 'b2c'],
        category: 'service', region: 'IN', languages: ['en', 'hi', 'mr'],
        aci: 767, band: 'silver', status: 'active',
        price: { amount: 80, currency: 'INR', model: 'per-transaction' }
      },

      // ---- Singapore Finance (strategic, SG, silver) ----
      {
        kind: 'nexha', name: 'Singapore Finance Hub', description: 'Cross-border finance, tax, treasury for SMEs',
        nexhaId: 'nexha-finance-singapore', nexhaName: 'Singapore Finance Hub', nexhaTier: 'strategic',
        tags: ['finance', 'tax', 'cross-border', 'sme'],
        category: 'nexha', region: 'SG', languages: ['en'],
        aci: 720, band: 'silver', status: 'active'
      },
      {
        kind: 'capability', name: 'AI Tax Advisor (SG/IN)', description: 'Cross-border tax advisory for Singapore + India small businesses',
        nexhaId: 'nexha-finance-singapore', nexhaName: 'Singapore Finance Hub', nexhaTier: 'strategic',
        tags: ['tax', 'finance', 'singapore', 'india', 'compliance'],
        category: 'agent', region: 'SG', languages: ['en'],
        aci: 720, band: 'silver', status: 'active',
        price: { amount: 499, currency: 'USD', model: 'subscription' }
      },

      // ---- London Legal (strategic, GB, silver) ----
      {
        kind: 'nexha', name: 'London Legal Consortium', description: 'Common-law contract review, compliance, M&A support',
        nexhaId: 'nexha-legal-london', nexhaName: 'London Legal Consortium', nexhaTier: 'strategic',
        tags: ['legal', 'contracts', 'common-law', 'm&a'],
        category: 'nexha', region: 'GB', languages: ['en'],
        aci: 780, band: 'silver', status: 'active'
      },
      {
        kind: 'service', name: 'AI Contract Review (Common Law)', description: 'Review commercial contracts against 50K+ precedents',
        nexhaId: 'nexha-legal-london', nexhaName: 'London Legal Consortium', nexhaTier: 'strategic',
        tags: ['legal', 'contracts', 'common-law', 'review', 'compliance'],
        category: 'service', region: 'GB', languages: ['en'],
        aci: 780, band: 'silver', status: 'active',
        price: { amount: 50, currency: 'GBP', model: 'per-call' }
      },

      // ---- Jakarta Data (standard, ID, bronze) ----
      {
        kind: 'nexha', name: 'Jakarta Data Cooperative', description: 'Commodity prices, retail intelligence, market data',
        nexhaId: 'nexha-data-jakarta', nexhaName: 'Jakarta Data Cooperative', nexhaTier: 'standard',
        tags: ['data', 'commodities', 'retail', 'market'],
        category: 'nexha', region: 'ID', languages: ['id', 'en'],
        aci: 580, band: 'bronze', status: 'active'
      },
      {
        kind: 'data-feed', name: 'Indonesia Retail Price Index', description: 'Real-time commodity prices across 200+ Indonesian markets',
        nexhaId: 'nexha-data-jakarta', nexhaName: 'Jakarta Data Cooperative', nexhaTier: 'standard',
        tags: ['prices', 'indonesia', 'retail', 'commodities', 'real-time'],
        category: 'data', region: 'ID', languages: ['id', 'en'],
        aci: 580, band: 'bronze', status: 'active',
        price: { amount: 99, currency: 'USD', model: 'subscription' }
      },

      // ---- Cross-Nexha opportunities (active on multiple Nexhas) ----
      {
        kind: 'opportunity', name: 'B2C Same-Day Delivery for Mumbai Pilot', description: 'E-commerce company launching in Mumbai, need same-day delivery partner for first 30 days',
        nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective', nexhaTier: 'founding',
        tags: ['logistics', 'delivery', 'mumbai', 'same-day', 'b2c'],
        category: 'service', region: 'IN', languages: ['en'],
        aci: 990, band: 'platinum', status: 'active',
        budget: { amount: 80, currency: 'INR', type: 'per-transaction' }
      },
      {
        kind: 'opportunity', name: 'Cross-Border Tax Advisory Subscription', description: 'SG/IN small business needs ongoing tax advisory',
        nexhaId: 'nexha-finance-singapore', nexhaName: 'Singapore Finance Hub', nexhaTier: 'strategic',
        tags: ['tax', 'finance', 'singapore', 'india', 'compliance'],
        category: 'agent', region: 'SG', languages: ['en'],
        aci: 720, band: 'silver', status: 'active',
        budget: { amount: 499, currency: 'USD', type: 'subscription' }
      },
      {
        kind: 'opportunity', name: 'M&A Contract Review (50 documents)', description: 'Need rapid review of 50 commercial contracts for upcoming M&A',
        nexhaId: 'nexha-maya-collective', nexhaName: 'Maya Collective', nexhaTier: 'founding',
        tags: ['legal', 'contracts', 'common-law', 'review', 'm&a'],
        category: 'service', region: 'GB', languages: ['en'],
        aci: 990, band: 'platinum', status: 'active',
        budget: { amount: 50, currency: 'GBP', type: 'per-unit' }
      },
      {
        kind: 'opportunity', name: 'Real-Time Commodity Price Feed for Q3', description: 'Daily commodity prices across Indonesia + SEA markets for trading desk',
        nexhaId: 'nexha-data-jakarta', nexhaName: 'Jakarta Data Cooperative', nexhaTier: 'standard',
        tags: ['prices', 'commodities', 'real-time', 'trading'],
        category: 'data', region: 'ID', languages: ['id', 'en'],
        aci: 580, band: 'bronze', status: 'active',
        budget: { amount: 99, currency: 'USD', type: 'subscription' }
      },

      // ---- Newer Nexha (AI Marketplace Asia) — pending ----
      {
        kind: 'nexha', name: 'AI Marketplace Asia (Application Pending)', description: 'New applicant: AI agents marketplace for SEA',
        nexhaId: 'nexha-pending-ai', nexhaName: 'AI Marketplace Asia', nexhaTier: 'observer',
        tags: ['ai', 'agent', 'marketplace', 'sea'],
        category: 'nexha', region: 'SG', languages: ['en'],
        aci: 500, band: 'bronze', status: 'pending'
      },
      {
        kind: 'capability', name: 'Multi-lingual AI Translation Agent', description: 'Translate text across 50+ languages with cultural context',
        nexhaId: 'nexha-pending-ai', nexhaName: 'AI Marketplace Asia', nexhaTier: 'observer',
        tags: ['translation', 'ai', 'multilingual'],
        category: 'agent', region: 'SG', languages: ['en', 'id', 'th', 'vi'],
        aci: 500, band: 'bronze', status: 'pending',
        price: { amount: 0.1, currency: 'USD', model: 'per-call' }
      },

      // ---- Rogue Nexha (suspended) ----
      {
        kind: 'nexha', name: 'Anomaly Goods (Under Review)', description: 'Suspicious low-cost supplier, multiple violations',
        nexhaId: 'nexha-rogue-supplier', nexhaName: 'Anomaly Goods', nexhaTier: 'associate',
        tags: ['suspicious', 'under-review'],
        category: 'nexha', region: 'XX', languages: ['en'],
        aci: 80, band: 'restricted', status: 'pending'
      },
      {
        kind: 'service', name: 'Ultra-Cheap AI Service (Suspicious)', description: 'AI service at 90% below market rate — too good to be true',
        nexhaId: 'nexha-rogue-supplier', nexhaName: 'Anomaly Goods', nexhaTier: 'associate',
        tags: ['cheap', 'suspicious'],
        category: 'service', region: 'XX', languages: ['en'],
        aci: 80, band: 'restricted', status: 'pending',
        price: { amount: 0.001, currency: 'USD', model: 'per-call' }
      }
    ];

    for (const seed of seedListings) {
      const id = `${seed.kind}-${uuidv4().slice(0, 8)}`;
      const listing: Listing = {
        ...seed,
        id,
        createdAt: baseDate.toISOString(),
        updatedAt: now
      };
      this.listings.set(id, listing);
    }

    const nexhas = new Set(seedListings.map((l) => l.nexhaId));
    return { listings: this.listings.size, nexhas: nexhas.size };
  }

  // ───────────────────────────────────────────────────────────────
  // Listing management
  // ───────────────────────────────────────────────────────────────
  upsertListing(input: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>): Listing {
    // If a listing for this (kind, sourceId) already exists, update; else create
    const existing = Array.from(this.listings.values()).find(
      (l) => l.nexhaId === input.nexhaId && l.name === input.name && l.kind === input.kind
    );
    const now = new Date().toISOString();
    if (existing) {
      const updated: Listing = { ...existing, ...input, id: existing.id, createdAt: existing.createdAt, updatedAt: now };
      this.listings.set(existing.id, updated);
      return updated;
    }
    const id = `${input.kind}-${uuidv4().slice(0, 8)}`;
    const created: Listing = { ...input, id, createdAt: now, updatedAt: now };
    this.listings.set(id, created);
    return created;
  }

  get(id: string): Listing | null {
    return this.listings.get(id) ?? null;
  }

  remove(id: string): boolean {
    return this.listings.delete(id);
  }

  // ───────────────────────────────────────────────────────────────
  // Match algorithm
  // ───────────────────────────────────────────────────────────────
  private computeMatchScore(query: DirectoryQuery, listing: Listing): { score: number; reasons: string[] } {
    const reasons: string[] = [];
    let score = 0;

    // Kind match (0.20)
    if (query.kind && listing.kind === query.kind) {
      score += 0.20;
      reasons.push(`kind:${listing.kind}`);
    } else if (!query.kind) {
      // Neutral
    } else {
      return { score: 0, reasons: [] }; // Hard mismatch
    }

    // Category match (0.20)
    if (query.category && listing.category === query.category) {
      score += 0.20;
      reasons.push(`category:${listing.category}`);
    }

    // Tag overlap (0.30)
    if (query.tags && query.tags.length > 0) {
      const qTags = new Set(query.tags.map((t) => t.toLowerCase()));
      const lTags = new Set(listing.tags.map((t) => t.toLowerCase()));
      const intersection = new Set([...qTags].filter((t) => lTags.has(t)));
      const union = new Set([...qTags, ...lTags]);
      const jaccard = union.size > 0 ? intersection.size / union.size : 0;
      score += Math.min(0.30, jaccard * 0.5);
      if (intersection.size > 0) {
        reasons.push(`tags:${[...intersection].slice(0, 3).join(',')}`);
      }
    }

    // Free-text (0.20)
    if (query.q) {
      const qWords = query.q.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      const haystack = `${listing.name} ${listing.description} ${listing.tags.join(' ')}`.toLowerCase();
      const hits = qWords.filter((w) => haystack.includes(w));
      if (hits.length > 0) {
        const textScore = Math.min(1, hits.length / 2); // saturate at 2 hits
        score += textScore * 0.20;
        reasons.push(`text:${hits.length}`);
      }
    }

    // Region match (0.05)
    if (query.region && listing.region === query.region) {
      score += 0.05;
      reasons.push(`region:${query.region}`);
    }

    // Language match (0.05)
    if (query.language && listing.languages.includes(query.language)) {
      score += 0.05;
      reasons.push(`lang:${query.language}`);
    }

    // Baseline: every listing gets a small score so empty queries still return everything
    if (score === 0 && !query.q && !query.tags && !query.kind && !query.category) {
      score = 0.1; // baseline visibility
    }

    score = Math.min(1.0, score);
    return { score, reasons };
  }

  /** Trust boost multiplier. */
  private applyTrustBoost(score: number, aci: number | null, boost: number): number {
    if (!aci) return score;
    return score * (1 + boost * (aci / 1000));
  }

  // ───────────────────────────────────────────────────────────────
  // Search
  // ───────────────────────────────────────────────────────────────
  search(query: DirectoryQuery, trustBoost: number = 0.3): DirectoryResponse {
    const start = Date.now();
    const limit = Math.min(query.limit ?? 50, 200);
    const offset = query.offset ?? 0;
    const sort = query.sort ?? 'relevance';
    // Map of trust-band → minimum ACI (0-1000). 'any'/'unknown' = no minimum.
    const BAND_MIN_ACI: Record<string, number> = {
      platinum: 900, gold: 800, silver: 700, bronze: 500, iron: 300, restricted: 0, any: 0, unknown: 0
    };
    const minAciThreshold = BAND_MIN_ACI[query.minAciBand ?? 'any'] ?? 0;

    // Hard filters
    let candidates = Array.from(this.listings.values()).filter((l) => {
      // Always exclude closed/cancelled
      if (l.status === 'closed' || l.status === 'deprecated') return false;
      if (query.kind && l.kind !== query.kind) return false;
      if (query.category && l.category !== query.category) return false;
      if (query.nexhaId && l.nexhaId !== query.nexhaId) return false;
      if (query.region && l.region !== query.region) return false;
      if (query.language && !l.languages.includes(query.language)) return false;
      if (query.verifiedOnly && l.aci !== null && l.aci < 700) return false;
      if (query.activeOnly && l.status !== 'active') return false;
      // Tags ALL must match
      if (query.tags && query.tags.length > 0) {
        const hasAll = query.tags.every((t) => l.tags.includes(t));
        if (!hasAll) return false;
      }
      // Trust band
      if (l.aci !== null && l.aci < minAciThreshold) return false;
      return true;
    });

    // Score
    const matches: DirectoryMatch[] = [];
    for (const listing of candidates) {
      const match = this.computeMatchScore(query, listing);
      if (match.score === 0) continue;
      const finalScore = this.applyTrustBoost(match.score, listing.aci, trustBoost);
      matches.push({
        listing,
        score: Math.round(match.score * 1000) / 1000,
        reasons: match.reasons
      });
      // Attach finalScore to listing for sorting
      (matches[matches.length - 1] as any)._finalScore = finalScore;
    }

    // Sort
    if (sort === 'relevance') {
      matches.sort((a, b) => ((b as any)._finalScore - (a as any)._finalScore));
    } else if (sort === 'trust') {
      matches.sort((a, b) => (b.listing.aci ?? 0) - (a.listing.aci ?? 0));
    } else if (sort === 'recent') {
      matches.sort((a, b) => b.listing.updatedAt.localeCompare(a.listing.updatedAt));
    }

    // Cleanup internal field
    for (const m of matches) delete (m as any)._finalScore;

    // Breakdown
    const byKind: Record<ListingKind, number> = {
      nexha: 0, capability: 0, opportunity: 0, 'data-feed': 0, service: 0
    };
    const byNexha: Record<string, number> = {};
    let totalAci = 0;
    let aciCount = 0;
    for (const l of candidates) {
      byKind[l.kind]++;
      byNexha[l.nexhaId] = (byNexha[l.nexhaId] ?? 0) + 1;
      if (l.aci !== null) {
        totalAci += l.aci;
        aciCount++;
      }
    }

    const total = matches.length;
    const paged = matches.slice(offset, offset + limit);

    return {
      matches: paged,
      total,
      query,
      tookMs: Date.now() - start,
      breakdown: {
        byKind,
        byNexha,
        averageAci: aciCount > 0 ? Math.round(totalAci / aciCount) : 0
      }
    };
  }

  // ───────────────────────────────────────────────────────────────
  // Stats
  // ───────────────────────────────────────────────────────────────
  getStats(): DirectoryStats {
    const all = Array.from(this.listings.values());
    const byKind: Record<ListingKind, number> = {
      nexha: 0, capability: 0, opportunity: 0, 'data-feed': 0, service: 0
    };
    const byStatus: Record<Listing['status'], number> = {
      active: 0, pending: 0, deprecated: 0, closed: 0
    };
    const byNexhaMap = new Map<string, { nexhaId: string; nexhaName: string; count: number; tier: string }>();
    const byRegionMap = new Map<string, number>();
    const byCategoryMap = new Map<string, number>();
    const nexhas = new Set<string>();
    let totalAci = 0;
    let aciCount = 0;
    let verifiedCount = 0;

    for (const l of all) {
      byKind[l.kind]++;
      byStatus[l.status]++;
      const ex = byNexhaMap.get(l.nexhaId);
      if (ex) ex.count++;
      else byNexhaMap.set(l.nexhaId, { nexhaId: l.nexhaId, nexhaName: l.nexhaName, count: 1, tier: l.nexhaTier });
      nexhas.add(l.nexhaId);
      byRegionMap.set(l.region, (byRegionMap.get(l.region) ?? 0) + 1);
      byCategoryMap.set(l.category, (byCategoryMap.get(l.category) ?? 0) + 1);
      if (l.aci !== null) { totalAci += l.aci; aciCount++; }
      if (l.aci !== null && l.aci >= 700) verifiedCount++;
    }

    return {
      totalListings: all.length,
      byKind,
      byStatus,
      byNexha: Array.from(byNexhaMap.values()).sort((a, b) => b.count - a.count),
      byRegion: Array.from(byRegionMap.entries()).map(([region, count]) => ({ region, count })).sort((a, b) => b.count - a.count),
      byCategory: Array.from(byCategoryMap.entries()).map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      totalNexhas: nexhas.size,
      averageAci: aciCount > 0 ? Math.round(totalAci / aciCount) : 0,
      verifiedPercentage: all.length > 0 ? Math.round((verifiedCount / all.length) * 100) : 0,
      generatedAt: new Date().toISOString()
    };
  }

  reset(): void {
    this.listings.clear();
  }
}

const directoryService = new DirectoryService();
export default directoryService;