/**
 * FederationOS — Federation manager
 *
 * Manages the registry of federation members (Nexhas), bilateral
 * handshakes between them, and federation-wide governance policies.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  Nexha,
  MembershipTier,
  MembershipStatus,
  Handshake,
  HandshakeStatus,
  GovernancePolicy,
  PolicyCategory,
  PolicyEnforcement,
  JoinRequest,
  FederationStats
} from '../types/index.js';

class FederationService {
  /** Primary registry: nexhaId → Nexha */
  private nexhas = new Map<string, Nexha>();
  /** Handshakes: handshakeId → Handshake */
  private handshakes = new Map<string, Handshake>();
  /** Policies: policyId → GovernancePolicy */
  private policies = new Map<string, GovernancePolicy>();

  // ─────────────────────────────────────────────────────────────────
  // Seed demo federation
  // ─────────────────────────────────────────────────────────────────

  seedDemo(): { nexhas: number; handshakes: number; policies: number } {
    if (this.nexhas.size > 0) {
      return {
        nexhas: this.nexhas.size,
        handshakes: this.handshakes.size,
        policies: this.policies.size
      };
    }

    const now = new Date().toISOString();

    // Seed Nexhas (the federation members)
    const seedNexhas: Omit<Nexha, 'lastSyncAt'>[] = [
      {
        id: 'nexha-maya-collective',
        name: 'Maya Collective',
        description: 'Fashion, AI agents, and creative services federation',
        tier: 'founding',
        status: 'active',
        region: 'IN',
        contactEmail: 'ops@maya-collective.example',
        publicKey: 'fp:abc123def456',
        categories: ['agent', 'service', 'skill'],
        osVersion: 'nexha-os-1.4.0',
        joinedAt: '2025-01-15T10:00:00Z',
        metadata: { capabilities_count: 2, primary_market: 'IN+US' }
      },
      {
        id: 'nexha-logistics-mumbai',
        name: 'Mumbai Logistics Network',
        description: 'Same-day delivery + warehousing across Mumbai Metro',
        tier: 'strategic',
        status: 'active',
        region: 'IN',
        contactEmail: 'connect@mumbai-logistics.example',
        publicKey: 'fp:xyz789uvw012',
        categories: ['service'],
        osVersion: 'nexha-os-1.4.0',
        joinedAt: '2025-02-01T10:00:00Z',
        metadata: { fleet_size: 1200, daily_parcels: 15000 }
      },
      {
        id: 'nexha-finance-singapore',
        name: 'Singapore Finance Hub',
        description: 'Cross-border finance, tax, treasury for SMEs',
        tier: 'strategic',
        status: 'active',
        region: 'SG',
        contactEmail: 'admin@sg-finance.example',
        publicKey: 'fp:fin345abc678',
        categories: ['agent', 'service'],
        osVersion: 'nexha-os-1.4.0',
        joinedAt: '2025-03-01T10:00:00Z',
        metadata: { licenses: ['MAS-PI', 'GST-registered'] }
      },
      {
        id: 'nexha-legal-london',
        name: 'London Legal Consortium',
        description: 'Common-law contract review, compliance, M&A support',
        tier: 'strategic',
        status: 'active',
        region: 'GB',
        contactEmail: 'admin@legal-london.example',
        publicKey: 'fp:leg901xyz234',
        categories: ['service', 'agent'],
        osVersion: 'nexha-os-1.3.5',
        joinedAt: '2025-03-15T10:00:00Z',
        metadata: { jurisdictions: ['GB', 'US', 'SG'] }
      },
      {
        id: 'nexha-data-jakarta',
        name: 'Jakarta Data Cooperative',
        description: 'Commodity prices, retail intelligence, market data',
        tier: 'standard',
        status: 'active',
        region: 'ID',
        contactEmail: 'team@data-jakarta.example',
        publicKey: 'fp:dat567qrs890',
        categories: ['data'],
        osVersion: 'nexha-os-1.3.5',
        joinedAt: '2025-04-01T10:00:00Z'
      },
      {
        id: 'nexha-rogue-supplier',
        name: 'Anomaly Goods (Under Review)',
        description: 'Suspicious low-cost supplier, multiple violations',
        tier: 'associate',
        status: 'suspended',
        region: 'XX',
        contactEmail: 'unknown@rogue.example',
        publicKey: 'fp:rog000rog000',
        categories: ['service'],
        osVersion: 'nexha-os-1.2.0',
        joinedAt: '2025-08-01T10:00:00Z',
        metadata: { violations: 3, last_violation: '2025-10-15' }
      },
      {
        id: 'nexha-pending-ai',
        name: 'AI Marketplace Asia (Application Pending)',
        description: 'New applicant: AI agents marketplace for SEA',
        tier: 'observer',
        status: 'pending',
        region: 'SG',
        contactEmail: 'apply@ai-marketplace-asia.example',
        publicKey: 'fp:pend123abc456',
        categories: ['agent', 'skill', 'workflow'],
        osVersion: 'nexha-os-1.4.0',
        joinedAt: now
      }
    ];

    for (const n of seedNexhas) {
      this.nexhas.set(n.id, { ...n, lastSyncAt: now });
    }

    // Seed handshakes (bilateral agreements)
    const seedHandshakes: Handshake[] = [
      {
        id: 'hs-maya-logistics',
        initiatorId: 'nexha-maya-collective',
        targetId: 'nexha-logistics-mumbai',
        status: 'accepted',
        terms: {
          mutualCapabilities: ['agent', 'service'],
          dataSharing: 'aggregated',
          paymentTerms: 'preferred'
        },
        initiatorSignature: 'sig-maya-2025',
        targetSignature: 'sig-logi-2025',
        initiatedAt: '2025-02-15T10:00:00Z',
        respondedAt: '2025-02-16T10:00:00Z',
        expiresAt: '2026-02-15T10:00:00Z'
      },
      {
        id: 'hs-maya-finance',
        initiatorId: 'nexha-finance-singapore',
        targetId: 'nexha-maya-collective',
        status: 'accepted',
        terms: {
          mutualCapabilities: ['agent', 'service'],
          dataSharing: 'public',
          paymentTerms: 'standard',
          liabilityCap: 100000
        },
        initiatorSignature: 'sig-fin-2025',
        targetSignature: 'sig-maya-2025',
        initiatedAt: '2025-03-05T10:00:00Z',
        respondedAt: '2025-03-06T10:00:00Z'
      },
      {
        id: 'hs-pending-data',
        initiatorId: 'nexha-data-jakarta',
        targetId: 'nexha-pending-ai',
        status: 'pending',
        terms: {
          mutualCapabilities: ['data', 'agent'],
          dataSharing: 'aggregated',
          paymentTerms: 'standard'
        },
        initiatorSignature: 'sig-data-pending',
        initiatedAt: now
      },
      {
        id: 'hs-rejected-rogue',
        initiatorId: 'nexha-rogue-supplier',
        targetId: 'nexha-maya-collective',
        status: 'rejected',
        terms: {
          mutualCapabilities: ['service'],
          dataSharing: 'full',
          paymentTerms: 'custom'
        },
        initiatorSignature: 'sig-rogue-rejected',
        initiatedAt: '2025-09-01T10:00:00Z',
        respondedAt: '2025-09-02T10:00:00Z'
      }
    ];

    for (const h of seedHandshakes) this.handshakes.set(h.id, h);

    // Seed governance policies
    const seedPolicies: GovernancePolicy[] = [
      {
        id: 'pol-data-privacy',
        title: 'Data Privacy Baseline',
        description: 'Minimum data handling standards for all federation members',
        category: 'data-privacy',
        enforcement: 'mandatory',
        rules: [
          {
            when: 'handling personal data',
            then: 'encrypt at rest and in transit; obtain explicit consent',
            appliesTo: ['all']
          },
          {
            when: 'cross-Nexha data sharing',
            then: 'strip PII before sharing; log all transfers'
          }
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-06-01T00:00:00Z',
        version: 2
      },
      {
        id: 'pol-payment-settlement',
        title: 'Payment Settlement T+2',
        description: 'Standard settlement timeline across federation',
        category: 'payment',
        enforcement: 'mandatory',
        rules: [
          {
            when: 'settlement initiated',
            then: 'funds available within 2 business days',
            appliesTo: ['all']
          },
          {
            when: 'cross-border payment',
            then: 'use REZ multi-currency rail with FX lock at T+0'
          }
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        version: 1
      },
      {
        id: 'pol-conduct-anti-fraud',
        title: 'Anti-Fraud Conduct',
        description: 'Zero-tolerance for fraud, identity theft, money laundering',
        category: 'conduct',
        enforcement: 'mandatory',
        rules: [
          {
            when: 'fraud detected',
            then: 'suspend member within 24 hours; refer to SADA audit',
            appliesTo: ['all']
          }
        ],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-03-01T00:00:00Z',
        version: 3
      }
    ];

    for (const p of seedPolicies) this.policies.set(p.id, p);

    return {
      nexhas: this.nexhas.size,
      handshakes: this.handshakes.size,
      policies: this.policies.size
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Nexha registry
  // ─────────────────────────────────────────────────────────────────

  register(req: JoinRequest): Nexha {
    if (!req.name) throw new Error('name is required');
    if (!req.contactEmail) throw new Error('contactEmail is required');
    if (!req.publicKey) throw new Error('publicKey is required');
    if (this.findByName(req.name)) {
      throw new Error(`Nexha with name "${req.name}" already exists`);
    }
    const id = `nexha-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const nexha: Nexha = {
      id,
      name: req.name,
      description: req.description,
      tier: 'observer',
      status: 'pending',
      region: req.region,
      contactEmail: req.contactEmail,
      publicKey: req.publicKey,
      categories: req.categories,
      osVersion: req.osVersion,
      joinedAt: now,
      lastSyncAt: now
    };
    this.nexhas.set(id, nexha);
    return nexha;
  }

  get(id: string): Nexha | null {
    return this.nexhas.get(id) ?? null;
  }

  findByName(name: string): Nexha | null {
    for (const n of this.nexhas.values()) {
      if (n.name === name) return n;
    }
    return null;
  }

  list(filter: { tier?: MembershipTier; status?: MembershipStatus; region?: string; category?: string } = {}): Nexha[] {
    let results = Array.from(this.nexhas.values());
    if (filter.tier) results = results.filter((n) => n.tier === filter.tier);
    if (filter.status) results = results.filter((n) => n.status === filter.status);
    if (filter.region) results = results.filter((n) => n.region === filter.region);
    if (filter.category) results = results.filter((n) => n.categories.includes(filter.category!));
    return results.sort((a, b) => a.name.localeCompare(b.name));
  }

  update(id: string, patch: Partial<Nexha>): Nexha | null {
    const existing = this.nexhas.get(id);
    if (!existing) return null;
    const updated: Nexha = { ...existing, ...patch, id: existing.id, lastSyncAt: new Date().toISOString() };
    this.nexhas.set(id, updated);
    return updated;
  }

  suspend(id: string, reason: string): Nexha | null {
    return this.update(id, { status: 'suspended', metadata: { ...this.nexhas.get(id)?.metadata, suspension_reason: reason } });
  }

  activate(id: string): Nexha | null {
    return this.update(id, { status: 'active' });
  }

  // ─────────────────────────────────────────────────────────────────
  // Handshakes
  // ─────────────────────────────────────────────────────────────────

  initiateHandshake(initiatorId: string, targetId: string, terms: Handshake['terms']): Handshake {
    if (!this.nexhas.has(initiatorId)) throw new Error(`Initiator ${initiatorId} not registered`);
    if (!this.nexhas.has(targetId)) throw new Error(`Target ${targetId} not registered`);
    if (initiatorId === targetId) throw new Error('Cannot handshake with self');
    const id = `hs-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const handshake: Handshake = {
      id,
      initiatorId,
      targetId,
      status: 'pending',
      terms,
      initiatorSignature: `sig-${uuidv4().slice(0, 8)}`,
      initiatedAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString() // 30 days
    };
    this.handshakes.set(id, handshake);
    return handshake;
  }

  respondToHandshake(id: string, accept: boolean, targetSignature: string): Handshake | null {
    const h = this.handshakes.get(id);
    if (!h) return null;
    if (h.status !== 'pending') return null;
    const updated: Handshake = {
      ...h,
      status: accept ? 'accepted' : 'rejected',
      targetSignature: accept ? targetSignature : targetSignature,
      respondedAt: new Date().toISOString()
    };
    this.handshakes.set(id, updated);
    return updated;
  }

  revokeHandshake(id: string): Handshake | null {
    const h = this.handshakes.get(id);
    if (!h) return null;
    const updated: Handshake = { ...h, status: 'revoked', respondedAt: new Date().toISOString() };
    this.handshakes.set(id, updated);
    return updated;
  }

  getHandshake(id: string): Handshake | null {
    return this.handshakes.get(id) ?? null;
  }

  listHandshakes(filter: { initiatorId?: string; targetId?: string; status?: HandshakeStatus } = {}): Handshake[] {
    let results = Array.from(this.handshakes.values());
    if (filter.initiatorId) results = results.filter((h) => h.initiatorId === filter.initiatorId);
    if (filter.targetId) results = results.filter((h) => h.targetId === filter.targetId);
    if (filter.status) results = results.filter((h) => h.status === filter.status);
    return results.sort((a, b) => a.initiatedAt.localeCompare(b.initiatedAt));
  }

  /** Get all accepted handshakes for a Nexha. */
  getPeers(nexhaId: string): Nexha[] {
    const handshakes = Array.from(this.handshakes.values()).filter(
      (h) => (h.initiatorId === nexhaId || h.targetId === nexhaId) && h.status === 'accepted'
    );
    const peerIds = handshakes.map((h) => (h.initiatorId === nexhaId ? h.targetId : h.initiatorId));
    return peerIds.map((id) => this.nexhas.get(id)).filter((n): n is Nexha => !!n);
  }

  // ─────────────────────────────────────────────────────────────────
  // Governance policies
  // ─────────────────────────────────────────────────────────────────

  createPolicy(input: Omit<GovernancePolicy, 'id' | 'createdAt' | 'updatedAt' | 'version'>): GovernancePolicy {
    const id = `pol-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();
    const policy: GovernancePolicy = { ...input, id, createdAt: now, updatedAt: now, version: 1 };
    this.policies.set(id, policy);
    return policy;
  }

  getPolicy(id: string): GovernancePolicy | null {
    return this.policies.get(id) ?? null;
  }

  listPolicies(filter: { category?: PolicyCategory; enforcement?: PolicyEnforcement } = {}): GovernancePolicy[] {
    let results = Array.from(this.policies.values());
    if (filter.category) results = results.filter((p) => p.category === filter.category);
    if (filter.enforcement) results = results.filter((p) => p.enforcement === filter.enforcement);
    return results.sort((a, b) => a.title.localeCompare(b.title));
  }

  updatePolicy(id: string, patch: any): GovernancePolicy | null {
    const existing = this.policies.get(id);
    if (!existing) return null;
    const updated: GovernancePolicy = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
      version: existing.version + 1
    };
    this.policies.set(id, updated);
    return updated;
  }

  deletePolicy(id: string): boolean {
    return this.policies.delete(id);
  }

  // ─────────────────────────────────────────────────────────────────
  // Stats
  // ─────────────────────────────────────────────────────────────────

  getStats(): FederationStats {
    const allNexhas = Array.from(this.nexhas.values());
    const byTier: Record<MembershipTier, number> = {
      founding: 0, strategic: 0, standard: 0, associate: 0, observer: 0
    };
    const byStatus: Record<MembershipStatus, number> = {
      pending: 0, active: 0, suspended: 0, expelled: 0, churned: 0
    };
    const regions = new Set<string>();
    for (const n of allNexhas) {
      byTier[n.tier]++;
      byStatus[n.status]++;
      regions.add(n.region);
    }
    const handshakes = Array.from(this.handshakes.values());
    return {
      totalNexhas: allNexhas.length,
      byTier,
      byStatus,
      totalHandshakes: handshakes.length,
      activeHandshakes: handshakes.filter((h) => h.status === 'accepted').length,
      totalPolicies: this.policies.size,
      regions: Array.from(regions).sort()
    };
  }

  reset(): void {
    this.nexhas.clear();
    this.handshakes.clear();
    this.policies.clear();
  }
}

const federationService = new FederationService();
export default federationService;