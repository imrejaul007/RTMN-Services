/**
 * Nexha Supplier Registry — Verification Service
 * KYB: GSTIN validation, document verification, trust scoring.
 */

import type { SupplierRegistry, SupplierKYC, KYBDocument, KYBStatus, VerificationLevel } from '../types/index.js';
import { getSupplier, updateSupplier, _internal } from './onboarding.service.js';

const STORE = _internal.STORE;

// ── GSTIN Validator ─────────────────────────────────────────────────────────────

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

function validateGSTIN(gstin: string): { valid: boolean; error?: string } {
  const clean = gstin.toUpperCase().trim();
  if (!GSTIN_REGEX.test(clean)) {
    return { valid: false, error: 'Invalid GSTIN format. Expected: 27AABCU9603R1ZM' };
  }
  // checksum validation (simplified — real implementation calls GST portal API)
  return { valid: true };
}

// ── Document Upload ─────────────────────────────────────────────────────────────

export function uploadDocument(
  supplierId: string,
  type: KYBDocument['type'],
  label: string,
  url?: string
): KYBDocument | null {
  const r = STORE.get(supplierId);
  if (!r) return null;

  const doc: KYBDocument = {
    type,
    label,
    url,
    uploadedAt: new Date().toISOString(),
    verified: false,
  };
  r.kyc.documents.push(doc);
  r.updatedAt = new Date().toISOString();

  // Auto-advance KYB status
  if (r.kyc.kybStatus === 'not_started') {
    r.kyc.kybStatus = 'in_progress';
    r.kyc.kybStartedAt = new Date().toISOString();
    r.status = 'pending_kyb';
  }
  return doc;
}

// ── KYB Initiation & Submission ───────────────────────────────────────────────

export function initiateKYB(supplierId: string): SupplierKYC | null {
  const r = STORE.get(supplierId);
  if (!r) return null;
  r.kyc.kybStatus = 'in_progress';
  r.kyc.kybStartedAt = new Date().toISOString();
  r.status = 'pending_kyb';
  r.updatedAt = new Date().toISOString();
  return r.kyc;
}

export function submitKYB(supplierId: string, data: Partial<SupplierKYC>): SupplierKYC | null {
  const r = STORE.get(supplierId);
  if (!r) return null;

  if (data.gstin) {
    const gst = validateGSTIN(data.gstin);
    if (!gst.valid) throw new Error(gst.error);
    r.kyc.gstin = data.gstin.toUpperCase();
  }
  if (data.pan) r.kyc.pan = data.pan.toUpperCase();
  if (data.businessType) r.kyc.businessType = data.businessType;
  if (data.registrationNumber) r.kyc.registrationNumber = data.registrationNumber;
  if (data.yearEstablished) r.kyc.yearEstablished = data.yearEstablished;
  if (data.employeeCount) r.kyc.employeeCount = data.employeeCount;
  if (data.annualTurnover) r.kyc.annualTurnover = data.annualTurnover;
  if (data.address) r.kyc.address = data.address;
  if (data.bankAccount) r.kyc.bankAccount = data.bankAccount;
  if (data.bankIfsc) r.kyc.bankIfsc = data.bankIfsc;

  r.kyc.kybStatus = 'pending_review';
  r.status = 'pending_kyb';
  r.updatedAt = new Date().toISOString();
  return r.kyc;
}

// ── KYB Review ────────────────────────────────────────────────────────────────

export function verifyDocument(supplierId: string, docIndex: number, verified: boolean, verifiedBy?: string): boolean {
  const r = STORE.get(supplierId);
  if (!r || !r.kyc.documents[docIndex]) return false;
  r.kyc.documents[docIndex].verified = verified;
  r.kyc.documents[docIndex].verifiedAt = new Date().toISOString();
  r.kyc.documents[docIndex].verifiedBy = verifiedBy;
  r.updatedAt = new Date().toISOString();
  return true;
}

export function approveKYB(supplierId: string, verificationLevel: VerificationLevel = 'standard'): SupplierRegistry | null {
  const r = STORE.get(supplierId);
  if (!r) return null;
  r.kyc.kybStatus = 'verified';
  r.kyc.kybCompletedAt = new Date().toISOString();
  r.kyc.verificationLevel = verificationLevel;
  r.updatedAt = new Date().toISOString();

  // Recompute status (check if contract is also needed)
  const allRequired = r.onboardingChecklist.filter(i => i.required).every(i => i.completed);
  if (allRequired) {
    r.status = 'pending_contract';
  } else {
    r.status = 'pending_kyb';
  }
  return r;
}

export function rejectKYB(supplierId: string, reason: string): SupplierRegistry | null {
  const r = STORE.get(supplierId);
  if (!r) return null;
  r.kyc.kybStatus = 'rejected';
  r.kyc.rejectionReason = reason;
  r.status = 'applicant';
  r.updatedAt = new Date().toISOString();
  return r;
}

// ── Trust Score ───────────────────────────────────────────────────────────────

export function computeTrustScore(supplierId: string): number | null {
  const r = STORE.get(supplierId);
  if (!r) return null;

  if (r.kyc.kybStatus !== 'verified') return null;

  let score = 50; // base
  const docs = r.kyc.documents;
  const verifiedCount = docs.filter(d => d.verified).length;
  const totalCount = docs.length;

  // Document coverage: +5 per verified doc (max 20)
  score += Math.min(20, verifiedCount * 5);
  // Business longevity: +5 per year of operation (max 15)
  if (r.kyc.yearEstablished) {
    const years = new Date().getFullYear() - r.kyc.yearEstablished;
    score += Math.min(15, years * 5);
  }
  // Verification level bonus
  const levelBonus: Record<VerificationLevel, number> = { basic: 0, standard: 5, enhanced: 10, certified: 20 };
  score += levelBonus[r.kyc.verificationLevel];
  // Business type credibility (corporate > partnership > proprietorship)
  const typeBonus: Record<string, number> = { public_ltd: 10, private_ltd: 8, llp: 6, partnership: 3, proprietorship: 0 };
  score += typeBonus[r.kyc.businessType ?? ''] ?? 0;

  return Math.min(100, Math.max(0, score));
}

export const _store = STORE;
export default {
  validateGSTIN, uploadDocument, initiateKYB, submitKYB,
  verifyDocument, approveKYB, rejectKYB, computeTrustScore,
};
