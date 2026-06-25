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
  FederationStats,
  Inquiry,
  AuditEntry,
  Referral,
  OnboardingChecklist,
  OnboardingItem,
  FoundingMemberMetrics,
  FederationHealth,
  MatchRecommendation
} from '../types/index.js';

/** Server uptime — injected from index.ts */
let __startTime = Date.now();

class FederationService {
  /** Called by index.ts to set server start time for uptime calculations. */
  setStartTime(t: number) { __startTime = t; }

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

  // ─────────────────────────────────────────────────────────────────
  // Inquiry (pre-registration interest)
  // ─────────────────────────────────────────────────────────────────
  private inquiries = new Map<string, Inquiry>();

  submitInquiry(input: Omit<Inquiry, 'id' | 'submittedAt' | 'status'>): Inquiry {
    const id = `inq-${uuidv4().slice(0, 8)}`;
    const inquiry: Inquiry = {
      ...input,
      id,
      status: 'new',
      submittedAt: new Date().toISOString()
    };
    this.inquiries.set(id, inquiry);
    return inquiry;
  }

  getInquiry(id: string): Inquiry | null {
    return this.inquiries.get(id) ?? null;
  }

  listInquiries(filter: { status?: Inquiry['status'] } = {}): Inquiry[] {
    let results = Array.from(this.inquiries.values());
    if (filter.status) results = results.filter((i) => i.status === filter.status);
    return results.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  updateInquiryStatus(id: string, status: Inquiry['status'], notes?: string): Inquiry | null {
    const existing = this.inquiries.get(id);
    if (!existing) return null;
    const updated: Inquiry = {
      ...existing,
      status,
      lastContactedAt: new Date().toISOString(),
      ...(notes ? { notes } : {})
    };
    this.inquiries.set(id, updated);
    return updated;
  }

  // ─────────────────────────────────────────────────────────────────
  // Audit trail
  // ─────────────────────────────────────────────────────────────────
  private auditTrail = new Map<string, AuditEntry[]>();

  addAuditEntry(nexhaId: string, action: string, actor: string, details: string, metadata?: Record<string, unknown>): AuditEntry {
    const entries = this.auditTrail.get(nexhaId) ?? [];
    const entry: AuditEntry = {
      id: `aud-${uuidv4().slice(0, 8)}`,
      nexhaId,
      action,
      actor,
      details,
      timestamp: new Date().toISOString(),
      metadata
    };
    entries.unshift(entry); // newest first
    this.auditTrail.set(nexhaId, entries);
    return entry;
  }

  getAuditTrail(nexhaId: string): AuditEntry[] {
    return this.auditTrail.get(nexhaId) ?? [];
  }

  // ─────────────────────────────────────────────────────────────────
  // Referral
  // ─────────────────────────────────────────────────────────────────
  private referrals = new Map<string, Referral>();

  createReferral(input: Omit<Referral, 'id' | 'createdAt' | 'status'>): Referral {
    const id = `ref-${uuidv4().slice(0, 8)}`;
    const referral: Referral = {
      ...input,
      id,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    this.referrals.set(id, referral);
    // Also log an audit entry for the referrer
    this.addAuditEntry(
      input.referrerNexhaId,
      'referral_created',
      input.referrerNexhaId,
      `Referred ${input.prospectName} (${input.prospectOrganization})`,
      { referralId: id }
    );
    return referral;
  }

  updateReferralStatus(id: string, status: Referral['status']): Referral | null {
    const existing = this.referrals.get(id);
    if (!existing) return null;
    const updated: Referral = {
      ...existing,
      status,
      ...(status === 'converted' ? { convertedAt: new Date().toISOString() } : {})
    };
    this.referrals.set(id, updated);
    return updated;
  }

  getReferral(id: string): Referral | null {
    return this.referrals.get(id) ?? null;
  }

  listReferrals(filter: { referrerNexhaId?: string; status?: Referral['status'] } = {}): Referral[] {
    let results = Array.from(this.referrals.values());
    if (filter.referrerNexhaId) results = results.filter((r) => r.referrerNexhaId === filter.referrerNexhaId);
    if (filter.status) results = results.filter((r) => r.status === filter.status);
    return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  // ─────────────────────────────────────────────────────────────────
  // Onboarding checklist
  // ─────────────────────────────────────────────────────────────────
  private checklists = new Map<string, OnboardingChecklist>();

  private buildChecklist(nexhaId: string, nexhaName: string): OnboardingChecklist {
    const defaultItems: Omit<OnboardingItem, 'id'>[] = [
      // Account
      { category: 'account', title: 'Create FederationOS account', description: 'Set up your organization profile and admin user', required: true, completed: false },
      { category: 'account', title: 'Add team members', description: 'Invite colleagues with appropriate roles', required: false, completed: false },
      { category: 'account', title: 'Configure notification preferences', description: 'Set up alerts for handshakes, policies, and announcements', required: false, completed: false },
      // Technical
      { category: 'technical', title: 'Deploy Nexha OS runtime', description: 'Install and configure the Nexha OS Docker runtime (Lite/Standard/Enterprise)', required: true, completed: false, dueDays: 7 },
      { category: 'technical', title: 'Configure federation endpoint', description: 'Set the NEXHA_FEDERATION_URL to federation.nexha.io', required: true, completed: false, dueDays: 3 },
      { category: 'technical', title: 'Run self-diagnostic', description: 'Execute health-check script and verify all services green', required: true, completed: false, dueDays: 1 },
      { category: 'technical', title: 'Set up TLS certificates', description: 'Configure SSL/TLS for secure federation communication', required: true, completed: false, dueDays: 7 },
      // Compliance
      { category: 'compliance', title: 'Accept federation policies', description: 'Review and accept all mandatory federation governance policies', required: true, completed: false, dueDays: 14 },
      { category: 'compliance', title: 'Submit compliance attestation', description: 'Provide self-attestation of data privacy and anti-fraud compliance', required: true, completed: false, dueDays: 14 },
      { category: 'compliance', title: 'KYB verification', description: 'Complete Know Your Business verification (for strategic and above)', required: false, completed: false, dueDays: 30 },
      // Partnership
      { category: 'partnership', title: 'Initiate first handshake', description: 'Reach out to at least one strategic partner and initiate a handshake', required: true, completed: false, dueDays: 30 },
      { category: 'partnership', title: 'Complete capability profile', description: 'Add detailed capability tags in CapabilityOS so other Nexhas can discover you', required: true, completed: false, dueDays: 7 },
      // Training
      { category: 'training', title: 'Watch federation orientation', description: 'Complete the 20-minute Nexha Federation onboarding video', required: false, completed: false },
      { category: 'training', title: 'Review API documentation', description: 'Study the FederationOS API reference and webhook docs', required: false, completed: false }
    ];
    const items: OnboardingItem[] = defaultItems.map((item, idx) => ({
      ...item,
      id: `item-${idx + 1}`
    }));
    const now = new Date().toISOString();
    const checklist: OnboardingChecklist = {
      nexhaId,
      nexhaName,
      progress: 0,
      totalItems: items.length,
      completedItems: 0,
      items,
      createdAt: now,
      lastUpdatedAt: now
    };
    this.checklists.set(nexhaId, checklist);
    return checklist;
  }

  getOrCreateChecklist(nexhaId: string): OnboardingChecklist {
    const existing = this.checklists.get(nexhaId);
    if (existing) return existing;
    const nexha = this.nexhas.get(nexhaId);
    return this.buildChecklist(nexhaId, nexha?.name ?? nexhaId);
  }

  getChecklist(nexhaId: string): OnboardingChecklist | null {
    return this.checklists.get(nexhaId) ?? null;
  }

  updateChecklistItem(nexhaId: string, itemId: string, completed: boolean): OnboardingChecklist | null {
    const checklist = this.checklists.get(nexhaId);
    if (!checklist) return null;
    const item = checklist.items.find((i) => i.id === itemId);
    if (!item) return null;
    item.completed = completed;
    if (completed) item.completedAt = new Date().toISOString();
    checklist.completedItems = checklist.items.filter((i) => i.completed).length;
    checklist.progress = Math.round((checklist.completedItems / checklist.totalItems) * 100);
    checklist.lastUpdatedAt = new Date().toISOString();
    return checklist;
  }

  // ─────────────────────────────────────────────────────────────────
  // Founding member metrics
  // ─────────────────────────────────────────────────────────────────
  getFoundingMetrics(): FoundingMemberMetrics {
    const foundingNexhas = this.list({ tier: 'founding' });
    const metrics = foundingNexhas.map((n) => {
      const peers = this.getPeers(n.id);
      const pending = this.listHandshakes({ initiatorId: n.id, status: 'pending' });
      const pendingTarget = this.listHandshakes({ targetId: n.id, status: 'pending' });
      // Stub ACI score (0-100)
      const aciScore = Math.round(60 + Math.random() * 30);
      return {
        id: n.id,
        name: n.name,
        region: n.region,
        category: n.categories[0] ?? 'general',
        peersCount: peers.length,
        pendingHandshakes: pending.length + pendingTarget.length,
        lastSyncAt: n.lastSyncAt,
        aciScore,
        tier: n.tier
      };
    });
    const avgPeers = foundingNexhas.length
      ? Math.round(metrics.reduce((s, m) => s + m.peersCount, 0) / foundingNexhas.length)
      : 0;
    const avgAci = foundingNexhas.length
      ? Math.round(metrics.reduce((s, m) => s + m.aciScore, 0) / foundingNexhas.length)
      : 0;
    const avgPending = foundingNexhas.length
      ? Math.round(metrics.reduce((s, m) => s + m.pendingHandshakes, 0) / foundingNexhas.length)
      : 0;
    return {
      totalFoundingMembers: foundingNexhas.length,
      foundingMembers: metrics,
      avgPeersPerFounding: avgPeers,
      avgAciScore: avgAci,
      avgPendingHandshakes: avgPending
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // Federation health check
  // ─────────────────────────────────────────────────────────────────
  getFederationHealth(): FederationHealth {
    const stats = this.getStats();
    const checks: FederationHealth['checks'] = [];

    // Check 1: Minimum founding members
    const foundingOk = stats.byTier.founding >= 3;
    checks.push({
      name: 'founding-members',
      status: foundingOk ? 'pass' : 'fail',
      message: foundingOk
        ? `${stats.byTier.founding} founding members (min 3)`
        : `Only ${stats.byTier.founding} founding members (need min 3)`
    });

    // Check 2: Active handshakes
    const handshakesHealthy = stats.activeHandshakes >= 1;
    checks.push({
      name: 'handshakes',
      status: handshakesHealthy ? 'pass' : 'warn',
      message: handshakesHealthy
        ? `${stats.activeHandshakes} active handshakes`
        : 'No active handshakes yet — federation not interconnected'
    });

    // Check 3: Suspended/expelled ratio
    const suspendedRatio = (stats.byStatus.suspended + stats.byStatus.expelled) / Math.max(stats.totalNexhas, 1);
    checks.push({
      name: 'member-health',
      status: suspendedRatio > 0.3 ? 'warn' : 'pass',
      message: suspendedRatio > 0.3
        ? `${Math.round(suspendedRatio * 100)}% of members suspended/expelled`
        : `${Math.round((1 - suspendedRatio) * 100)}% of members in good standing`
    });

    // Check 4: Policy coverage
    const policiesOk = stats.totalPolicies >= 3;
    checks.push({
      name: 'governance',
      status: policiesOk ? 'pass' : 'warn',
      message: policiesOk
        ? `${stats.totalPolicies} governance policies active`
        : `Only ${stats.totalPolicies} policies — recommend at least 3`
    });

    // Check 5: Regional diversity
    const regionDiversity = stats.regions.length >= 2;
    checks.push({
      name: 'regional-diversity',
      status: regionDiversity ? 'pass' : 'warn',
      message: regionDiversity
        ? `Federation spans ${stats.regions.length} regions (${stats.regions.join(', ')})`
        : `Only ${stats.regions.length} region(s) — consider expanding geographically`
    });

    // Check 6: Pending handshakes (should be low)
    const pendingHandshakes = stats.totalHandshakes - stats.activeHandshakes;
    const pendingRatio = stats.totalHandshakes > 0 ? pendingHandshakes / stats.totalHandshakes : 0;
    checks.push({
      name: 'handshake-staleness',
      status: pendingRatio > 0.7 ? 'warn' : 'pass',
      message: pendingRatio > 0.7
        ? `${pendingHandshakes} stale pending handshakes (>70% of total)`
        : `${pendingHandshakes} pending handshakes`
    });

    // Compute score
    const passCount = checks.filter((c) => c.status === 'pass').length;
    const warnCount = checks.filter((c) => c.status === 'warn').length;
    const score = Math.round(((passCount * 1 + warnCount * 0.5) / checks.length) * 100);
    const overallStatus: FederationHealth['status'] =
      score >= 80 ? 'healthy' : score >= 50 ? 'degraded' : 'critical';

    return { status: overallStatus, score, checks, uptime: Date.now() - __startTime, stats, timestamp: new Date().toISOString() };
  }

  // ─────────────────────────────────────────────────────────────────
  // Matching engine — Nexha-to-Nexha capability matching
  // ─────────────────────────────────────────────────────────────────

  /**
   * Find capability-complementary matches for a Nexha.
   * Scores by: category overlap, tier affinity, active status, existing handshake potential.
   */
  findMatches(nexhaId: string, limit = 10): MatchRecommendation[] {
    const self = this.nexhas.get(nexhaId);
    if (!self) throw new Error(`Nexha ${nexhaId} not found`);

    const selfCats = new Set(self.categories);
    const existingPeers = new Set(this.getPeers(nexhaId).map((p) => p.id));

    const candidates = Array.from(this.nexhas.values()).filter((n) => {
      if (n.id === nexhaId) return false;
      if (existingPeers.has(n.id)) return false;
      if (n.status === 'suspended' || n.status === 'expelled') return false;
      return true;
    });

    const scored: MatchRecommendation[] = candidates.map((candidate) => {
      const candidateCats = new Set(candidate.categories);
      // Category overlap score (max 40)
      const overlap = [...selfCats].filter((c) => candidateCats.has(c)).length;
      const union = new Set([...selfCats, ...candidateCats]).size;
      const categoryScore = union > 0 ? Math.round((overlap / union) * 40) : 0;

      // Tier affinity (max 25) — founding/strategic tiers preferred
      const tierRank: Record<MembershipTier, number> = { founding: 5, strategic: 4, standard: 3, associate: 2, observer: 1 };
      const selfRank = tierRank[self.tier] ?? 1;
      const candRank = tierRank[candidate.tier] ?? 1;
      const tierAffinity = Math.round((Math.min(selfRank, candRank) / 5) * 25);

      // Status bonus (max 20) — active preferred
      const statusBonus = candidate.status === 'active' ? 20 : candidate.status === 'pending' ? 5 : 0;

      // Handshake potential (max 15) — no existing handshake with this candidate
      const hasExisting = Array.from(this.handshakes.values()).some(
        (h) =>
          (h.initiatorId === nexhaId && h.targetId === candidate.id) ||
          (h.initiatorId === candidate.id && h.targetId === nexhaId)
      );
      const handshakePotential = hasExisting ? 0 : 15;

      const score = categoryScore + tierAffinity + statusBonus + handshakePotential;

      const matchReasons: string[] = [];
      if (overlap > 0) matchReasons.push(`${overlap} shared category(ies): ${[...selfCats].filter((c) => candidateCats.has(c)).join(', ')}`);
      if (candidate.status === 'active') matchReasons.push('Active member');
      if (candidate.tier === 'founding' || candidate.tier === 'strategic') matchReasons.push(`${candidate.tier} tier — high influence`);
      if (!hasExisting) matchReasons.push('No existing handshake — ready to connect');
      if (candidate.region !== self.region) matchReasons.push(`Different region (${candidate.region}) — geographic diversity`);

      return {
        nexha: candidate,
        score,
        matchReasons,
        categoryScore,
        tierAffinity,
        statusBonus,
        handshakePotential
      };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Auto-match: automatically initiate handshakes with the top N match recommendations.
   * Returns the handshakes that were created.
   */
  autoMatch(nexhaId: string, maxHandshakes = 3): { handshake: Handshake; match: MatchRecommendation }[] {
    const matches = this.findMatches(nexhaId, maxHandshakes);
    const results: { handshake: Handshake; match: MatchRecommendation }[] = [];
    for (const match of matches) {
      if (match.score < 20) break; // minimum score threshold
      const myNexha = this.nexhas.get(nexhaId)!;
      const handshake = this.initiateHandshake(nexhaId, match.nexha.id, {
        mutualCapabilities: [...new Set([...myNexha.categories, ...match.nexha.categories])],
        dataSharing: 'aggregated',
        paymentTerms: 'standard'
      });
      this.addAuditEntry(nexhaId, 'auto_match_initiated', 'federation-os',
        `Auto-matched with ${match.nexha.name} (score: ${match.score})`,
        { handshakeId: handshake.id, matchScore: match.score }
      );
      results.push({ handshake, match });
    }
    return results;
  }
}

const federationService = new FederationService();
export default federationService;