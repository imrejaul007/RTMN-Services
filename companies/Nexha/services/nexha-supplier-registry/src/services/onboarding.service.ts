/**
 * Nexha Supplier Registry — Onboarding Service
 * Handles supplier registration, onboarding checklist, and KYB initiation.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SupplierRegistry,
  RegistryStatus,
  SupplierTier,
  OnboardingItem,
  SupplierKYC,
  RegistrySearchQuery,
  RegistryStats,
  VerificationLevel,
} from '../types/index.js';

const STORE = new Map<string, SupplierRegistry>();

// ── Tier configuration ─────────────────────────────────────────────────────────

const TIER_CONFIG: Record<SupplierTier, { maxOrderValue: number; commissionPct: number; paymentTermsDays: number; verificationLevel: VerificationLevel; features: string[] }> = {
  bronze:   { maxOrderValue: 50_000,    commissionPct: 5,   paymentTermsDays: 30,  verificationLevel: 'basic',     features: ['rfq', 'quote', 'po'] },
  silver:   { maxOrderValue: 5_00_000, commissionPct: 4,   paymentTermsDays: 30,  verificationLevel: 'standard',  features: ['rfq', 'quote', 'po', 'negotiation'] },
  gold:     { maxOrderValue: 50_00_000,commissionPct: 3,   paymentTermsDays: 15,  verificationLevel: 'enhanced',  features: ['rfq', 'quote', 'po', 'negotiation', 'partial_shipment'] },
  platinum: { maxOrderValue: 5_00_00_000,commissionPct: 2, paymentTermsDays: 7,   verificationLevel: 'enhanced',  features: ['rfq', 'quote', 'po', 'negotiation', 'partial_shipment', 'contract_pricing'] },
  diamond:  { maxOrderValue: Infinity, commissionPct: 1,   paymentTermsDays: 0,   verificationLevel: 'certified',features: ['rfq', 'quote', 'po', 'negotiation', 'partial_shipment', 'contract_pricing', 'api_access', 'dedicated_support'] },
};

// ── Onboarding checklist templates ─────────────────────────────────────────────

function buildChecklist(tier: SupplierTier): OnboardingItem[] {
  const items: OnboardingItem[] = [
    { id: 'item-1',  category: 'account',    label: 'Create CorpID account',         required: true,  completed: false },
    { id: 'item-2',  category: 'account',    label: 'Verify business email',          required: true,  completed: false },
    { id: 'item-3',  category: 'account',    label: 'Add team members',                required: false, completed: false },
    { id: 'item-4',  category: 'kyc',         label: 'Submit GSTIN certificate',        required: true,  completed: false },
    { id: 'item-5',  category: 'kyc',         label: 'Submit PAN card / company PAN',  required: true,  completed: false },
    { id: 'item-6',  category: 'kyc',         label: 'Upload address proof',           required: true,  completed: false },
    { id: 'item-7',  category: 'kyc',         label: 'Submit bank account details',   required: true,  completed: false },
    { id: 'item-8',  category: 'contract',    label: 'Review & accept terms of trade',required: true,  completed: false },
    { id: 'item-9',  category: 'banking',     label: 'Connect payment account (RABTUL)', required: false, completed: false },
    { id: 'item-10', category: 'training',    label: 'Complete supplier onboarding tour', required: false, completed: false },
  ];
  return items;
}

// ── Tier assignment ────────────────────────────────────────────────────────────

function assignTier(kyc: SupplierKYC): SupplierTier {
  const level = kyc.verificationLevel;
  const turnover = kyc.annualTurnover ?? 0;
  if (turnover >= 10_00_00_000 || level === 'certified') return 'diamond';
  if (turnover >= 1_00_00_000  || level === 'enhanced')   return 'platinum';
  if (turnover >= 10_00_000    || level === 'standard')   return 'gold';
  if (turnover >= 1_00_000    || level === 'basic')       return 'silver';
  return 'bronze';
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function registerSupplier(input: {
  corpId: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
  nexhaId?: string;
}): SupplierRegistry {
  const now = new Date().toISOString();
  const kyc: SupplierKYC = {
    documents: [],
    verificationLevel: 'basic',
    kybStatus: 'not_started',
  };
  const registry: SupplierRegistry = {
    id: `reg-${uuidv4()}`,
    corpId: input.corpId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    description: input.description,
    status: 'applicant',
    tier: 'bronze',
    kyc,
    nexhaId: input.nexhaId,
    onboardingChecklist: buildChecklist('bronze'),
    createdAt: now,
    updatedAt: now,
  };
  STORE.set(registry.id, registry);
  return registry;
}

export function getSupplier(id: string): SupplierRegistry | null {
  return STORE.get(id) || null;
}

export function getByCorpId(corpId: string): SupplierRegistry | null {
  for (const r of STORE.values()) {
    if (r.corpId === corpId) return r;
  }
  return null;
}

export function listSuppliers(query: RegistrySearchQuery = {}): SupplierRegistry[] {
  let list = Array.from(STORE.values());
  if (query.status) {
    const statuses = Array.isArray(query.status) ? query.status : [query.status];
    list = list.filter(r => statuses.includes(r.status));
  }
  if (query.tier) {
    const tiers = Array.isArray(query.tier) ? query.tier : [query.tier];
    list = list.filter(r => tiers.includes(r.tier));
  }
  if (query.verified) {
    list = list.filter(r => r.kyc.kybStatus === 'verified');
  }
  if (query.category) {
    // category filter applies to trade flow, not registry listing
  }
  if (query.search) {
    const s = query.search.toLowerCase();
    list = list.filter(r =>
      r.name.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.id.toLowerCase().includes(s)
    );
  }
  const offset = query.offset ?? 0;
  const limit = query.limit ?? 50;
  return list.slice(offset, offset + limit);
}

export function updateSupplier(id: string, updates: Partial<SupplierRegistry>): SupplierRegistry | null {
  const r = STORE.get(id);
  if (!r) return null;
  const updated = { ...r, ...updates, id: r.id, updatedAt: new Date().toISOString() };
  STORE.set(id, updated);
  return updated;
}

export function updateStatus(id: string, status: RegistryStatus): SupplierRegistry | null {
  return updateSupplier(id, { status });
}

export function updateChecklistItem(supplierId: string, itemId: string, completed: boolean, proofUrl?: string): OnboardingItem | null {
  const r = STORE.get(supplierId);
  if (!r) return null;
  const item = r.onboardingChecklist.find(i => i.id === itemId);
  if (!item) return null;
  item.completed = completed;
  if (completed) {
    item.completedAt = new Date().toISOString();
    item.proofUrl = proofUrl;
  }
  r.updatedAt = new Date().toISOString();
  // Auto-advance status when checklist progresses
  _recomputeStatus(r);
  return item;
}

function _recomputeStatus(r: SupplierRegistry): void {
  const allRequired = r.onboardingChecklist.filter(i => i.required).every(i => i.completed);
  const kycDone = r.kyc.kybStatus === 'verified';
  const hasContract = r.contract?.status === 'active';

  if (allRequired && kycDone && hasContract) {
    r.status = 'approved';
    r.tier = assignTier(r.kyc);
  } else if (allRequired && kycDone) {
    r.status = 'pending_contract';
  } else if (allRequired) {
    r.status = 'pending_kyb';
  } else {
    r.status = 'applicant';
  }
}

export function getStats(): RegistryStats {
  const all = Array.from(STORE.values());
  const byStatus: Record<RegistryStatus, number> = { applicant: 0, pending_kyb: 0, pending_contract: 0, approved: 0, suspended: 0 };
  const byTier: Record<SupplierTier, number> = { bronze: 0, silver: 0, gold: 0, platinum: 0, diamond: 0 };

  for (const r of all) {
    byStatus[r.status]++;
    byTier[r.tier]++;
  }
  return {
    total: all.length,
    byStatus,
    byTier,
    verified: all.filter(r => r.kyc.kybStatus === 'verified').length,
    pendingKYB: all.filter(r => r.kyc.kybStatus === 'pending_review').length,
    activeContracts: all.filter(r => r.contract?.status === 'active').length,
    totalTradeValue: 0, // wired from trade service
  };
}

export function seedDemoSuppliers(): number {
  if (STORE.size > 0) return 0;
  const seeds = [
    registerSupplier({ corpId: 'corp-freshkart',   name: 'FreshKart Grocers',       email: 'ops@freshkart.in',    phone: '+91-22-12345678', nexhaId: 'nx-mumbai-001' }),
    registerSupplier({ corpId: 'corp-medexpress',  name: 'MedExpress Pharmacy',      email: 'ops@medexpress.in',   phone: '+91-11-23456789', nexhaId: 'nx-delhi-001' }),
    registerSupplier({ corpId: 'corp-techbazaar',  name: 'TechBazaar Electronics',  email: 'sales@techbazaar.in', phone: '+91-80-98765432' }),
    registerSupplier({ corpId: 'corp-spiceroute',  name: 'Spice Route Restaurant',  email: 'orders@spiceroute.in',phone: '+91-22-55551234', nexhaId: 'nx-mumbai-002' }),
    registerSupplier({ corpId: 'corp-greenleaf',   name: 'GreenLeaf Produce',        email: 'orders@greenleaf.in', phone: '+91-20-67890123' }),
    registerSupplier({ corpId: 'corp-hotelpro',    name: 'HotelPro Hospitality',      email: 'sales@hotelpro.in',   phone: '+91-124-4567890' }),
  ];
  // Mark first two as approved with verified KYC
  for (const s of seeds.slice(0, 2)) {
    s.kyc.kybStatus = 'verified';
    s.kyc.kybCompletedAt = new Date().toISOString();
    s.status = 'approved';
    s.tier = 'gold';
    s.onboardingChecklist.forEach(i => { i.completed = true; i.completedAt = new Date().toISOString(); });
  }
  // Mark third as pending KYB
  seeds[2].kyc.kybStatus = 'pending_review';
  seeds[2].status = 'pending_kyb';
  return STORE.size;
}

export const _internal = { STORE };
export default {
  registerSupplier, getSupplier, getByCorpId, listSuppliers,
  updateSupplier, updateStatus, updateChecklistItem, getStats, seedDemoSuppliers, TIER_CONFIG,
};
