/**
 * Nexha Supplier Registry — Contract Service
 * Manages digital trade contracts: generation, signing, versioning.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SupplierRegistry,
  SupplierContract,
  ContractStatus,
} from '../types/index.js';
import { getSupplier, _internal } from './onboarding.service.js';

const STORE = _internal.STORE;

// ── Contract Templates ──────────────────────────────────────────────────────────

const CONTRACT_TEMPLATES: Record<string, { title: string; defaultTerms: SupplierContract['terms'] }> = {
  standard: {
    title: 'Nexha Supplier Trade Agreement',
    defaultTerms: {
      paymentTermsDays: 30,
      minOrderValue: 1000,
      deliveryDaysMin: 3,
      deliveryDaysMax: 14,
      qualityGuarantee: 'Supplier guarantees products meet specifications. Buyer may raise disputes within 48 hours of delivery.',
      returnPolicy: 'Returns accepted for damaged/incorrect items only. RTO costs borne by supplier.',
    },
  },
  expedited: {
    title: 'Nexha Supplier Trade Agreement — Expedited Delivery',
    defaultTerms: {
      paymentTermsDays: 7,
      minOrderValue: 5000,
      deliveryDaysMin: 1,
      deliveryDaysMax: 3,
      qualityGuarantee: 'Expedited orders receive priority quality checks. 100% replacement for defects.',
      returnPolicy: 'Full return/refund for any quality issue. 48-hour resolution SLA.',
    },
  },
  wholesale: {
    title: 'Nexha Wholesale Supply Agreement',
    defaultTerms: {
      paymentTermsDays: 60,
      minOrderValue: 50_000,
      deliveryDaysMin: 7,
      deliveryDaysMax: 30,
      qualityGuarantee: 'Bulk supply with QC certification. Defect rate must be <0.5%.',
      returnPolicy: 'Wholesale returns by prior agreement only. 15% restocking fee applies.',
      bulkDiscountPct: 10,
    },
  },
};

// ── Contract CRUD ──────────────────────────────────────────────────────────────

export function createContract(
  supplierId: string,
  template = 'standard',
  overrides?: Partial<SupplierContract['terms']>
): SupplierContract | null {
  const r = STORE.get(supplierId);
  if (!r) return null;

  const tmpl = CONTRACT_TEMPLATES[template] ?? CONTRACT_TEMPLATES.standard;
  const now = new Date().toISOString();
  const contract: SupplierContract = {
    id: `contract-${uuidv4()}`,
    supplierId,
    version: 1,
    status: 'draft',
    template,
    terms: { ...tmpl.defaultTerms, ...overrides },
    createdAt: now,
    updatedAt: now,
  };
  r.contract = contract;
  r.status = 'pending_contract';
  r.updatedAt = now;
  return contract;
}

export function getContract(supplierId: string): SupplierContract | null {
  return STORE.get(supplierId)?.contract ?? null;
}

export function updateContract(supplierId: string, updates: Partial<SupplierContract>): SupplierContract | null {
  const r = STORE.get(supplierId);
  if (!r?.contract) return null;
  // Only allow updates in draft status
  if (r.contract.status !== 'draft') throw new Error('Can only update contracts in draft status');
  Object.assign(r.contract, updates, { updatedAt: new Date().toISOString() });
  r.updatedAt = new Date().toISOString();
  return r.contract;
}

export function signContract(
  supplierId: string,
  signedBy: string,
  signedName: string,
  signedTitle: string,
): SupplierContract | null {
  const r = STORE.get(supplierId);
  if (!r?.contract) return null;
  if (r.contract.status !== 'draft' && r.contract.status !== 'pending_signature') {
    throw new Error(`Cannot sign contract in "${r.contract.status}" status`);
  }
  const now = new Date().toISOString();
  r.contract.status = 'active';
  r.contract.signedAt = now;
  r.contract.signedBy = signedBy;
  r.contract.signedName = signedName;
  r.contract.signedTitle = signedTitle;
  r.contract.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year
  r.contract.updatedAt = now;
  r.updatedAt = now;

  // Auto-advance supplier status to approved
  if (r.status === 'pending_contract') {
    r.status = 'approved';
  }
  return r.contract;
}

export function terminateContract(supplierId: string, reason?: string): SupplierContract | null {
  const r = STORE.get(supplierId);
  if (!r?.contract) return null;
  r.contract.status = 'terminated';
  r.contract.updatedAt = new Date().toISOString();
  r.status = 'suspended';
  r.updatedAt = new Date().toISOString();
  return r.contract;
}

export function renewContract(supplierId: string): SupplierContract | null {
  const r = STORE.get(supplierId);
  if (!r?.contract) return null;
  if (r.contract.status !== 'active') throw new Error('Can only renew active contracts');
  // Version up
  r.contract.version++;
  r.contract.status = 'active';
  // Preserve original signing date — only set signedAt on first signature
  if (!r.contract.signedAt) r.contract.signedAt = new Date().toISOString();
  r.contract.expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  r.contract.updatedAt = new Date().toISOString();
  r.updatedAt = new Date().toISOString();
  return r.contract;
}

export function listContracts(status?: ContractStatus): SupplierContract[] {
  const contracts: SupplierContract[] = [];
  for (const r of STORE.values()) {
    if (r.contract && (!status || r.contract.status === status)) {
      contracts.push(r.contract);
    }
  }
  return contracts;
}

export function getTemplates(): Array<{ id: string; title: string }> {
  return Object.entries(CONTRACT_TEMPLATES).map(([id, t]) => ({ id, title: t.title }));
}

export default {
  createContract, getContract, updateContract, signContract,
  terminateContract, renewContract, listContracts, getTemplates,
};
