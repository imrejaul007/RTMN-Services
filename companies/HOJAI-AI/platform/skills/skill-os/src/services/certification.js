/**
 * SkillOS — Certification levels
 *
 * Five-tier trust model (per the SkillOS App Store vision):
 *
 *   community         — anyone can publish; no review
 *   verified          — publisher identity confirmed
 *   enterprise        — reviewed by HOJAI for production-readiness
 *   government        — meets regulated-industry requirements
 *   hojai-certified   — gold standard; full audit trail, SLA, support
 *
 * The metadata (level, certifiedAt, certifiedBy, auditRef) is REAL — the
 * data model is correct. The reviewer queue / approval workflow is a stub
 * for Phase 2 (needs a separate certification-queue service).
 *
 * For now, anyone with auth can call POST /api/assets/:id/certify and set
 * the level. This is marked clearly in the doc. Phase 2 will add the
 * actual review process.
 */

export const CERT_LEVELS = [
  'community',
  'verified',
  'enterprise',
  'government',
  'hojai-certified',
];

export function isValidLevel(level) {
  return CERT_LEVELS.includes(level);
}

export function defaultCertification() {
  return {
    level: 'community',
    certifiedAt: null,
    certifiedBy: null,
    auditRef: null,
    notes: '',
  };
}

/**
 * Validate and normalize a certification object.
 * Throws on invalid level; fills defaults for missing fields.
 */
export function normalizeCertification(input = {}) {
  const level = input.level || 'community';
  if (!isValidLevel(level)) {
    throw new Error(`invalid certification level: ${level}. Must be one of: ${CERT_LEVELS.join(', ')}`);
  }
  return {
    level,
    certifiedAt: input.certifiedAt || (level !== 'community' ? new Date().toISOString() : null),
    certifiedBy: input.certifiedBy || null,
    auditRef: input.auditRef || null,
    notes: input.notes || '',
  };
}
