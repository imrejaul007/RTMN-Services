/**
 * ICS (Industry Compliance Schema) v0.1.0 — minimal validator.
 *
 * Reference: ../../specs/INDUSTRY-COMPLIANCE-SCHEMA.md
 *
 * No external dependencies. Pure JS structural validation.
 * For strict JSON Schema validation, use Ajv with specs/ics.schema.json.
 */

const ALLOWED_SUBJECT_TYPES = ['industry_tenant_instance'];
const ALLOWED_COUNTRIES = /^[A-Z]{2}$/;
const ALLOWED_FRAMEWORK_STATUS = ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_ASSESSED'];
const ALLOWED_CONTROL_STATUS = ['COMPLIANT', 'PARTIAL', 'NON_COMPLIANT', 'NOT_APPLICABLE'];
const ALLOWED_ISOLATION_LEVELS = ['SHARED', 'DEDICATED', 'ISOLATED'];
const ALLOWED_KMS_PROVIDERS = ['aws-kms', 'gcp-kms', 'azure-kv', 'hashicorp-vault', 'customer-managed'];

/**
 * Validate an ICS document structurally.
 *
 * @param {object} doc
 * @returns {{ ok: true, value: object } | { ok: false, errors: string[] }}
 */
export function validate(doc) {
  const errors = [];

  if (!doc || typeof doc !== 'object') {
    return { ok: false, errors: ['doc must be an object'] };
  }

  // Required top-level fields
  for (const f of [
    'schemaVersion', 'subjectType', 'subjectId', 'tenantId', 'industry',
    'jurisdiction', 'frameworks', 'dataResidency',
    'isolationRequirements', 'auditTrail', 'updatedAt', 'updatedBy',
  ]) {
    if (doc[f] === undefined) errors.push(`missing required field: ${f}`);
  }

  // schemaVersion
  if (doc.schemaVersion && !/^0\.1\.[0-9]+$/.test(doc.schemaVersion)) {
    errors.push(`schemaVersion must match ^0\\.1\\.[0-9]+$ (got "${doc.schemaVersion}")`);
  }

  // subjectType
  if (doc.subjectType && !ALLOWED_SUBJECT_TYPES.includes(doc.subjectType)) {
    errors.push(`subjectType must be one of ${ALLOWED_SUBJECT_TYPES.join(', ')} (got "${doc.subjectType}")`);
  }

  // jurisdiction
  if (doc.jurisdiction) {
    if (!doc.jurisdiction.country || !ALLOWED_COUNTRIES.test(doc.jurisdiction.country)) {
      errors.push(`jurisdiction.country must be ISO-3166-1 alpha-2 (got "${doc.jurisdiction.country}")`);
    }
  }

  // frameworks
  if (Array.isArray(doc.frameworks)) {
    doc.frameworks.forEach((fw, i) => {
      if (!fw.id) errors.push(`frameworks[${i}].id required`);
      if (!fw.version) errors.push(`frameworks[${i}].version required`);
      if (!ALLOWED_FRAMEWORK_STATUS.includes(fw.status)) {
        errors.push(`frameworks[${i}].status must be one of ${ALLOWED_FRAMEWORK_STATUS.join(', ')} (got "${fw.status}")`);
      }
      if (!fw.lastAssessedAt || isNaN(Date.parse(fw.lastAssessedAt))) {
        errors.push(`frameworks[${i}].lastAssessedAt must be ISO-8601`);
      }
      if (!fw.nextAssessmentDue || isNaN(Date.parse(fw.nextAssessmentDue))) {
        errors.push(`frameworks[${i}].nextAssessmentDue must be ISO-8601`);
      }
      if (Array.isArray(fw.controls)) {
        fw.controls.forEach((c, j) => {
          if (!c.controlId) errors.push(`frameworks[${i}].controls[${j}].controlId required`);
          if (!c.name) errors.push(`frameworks[${i}].controls[${j}].name required`);
          if (!ALLOWED_CONTROL_STATUS.includes(c.status)) {
            errors.push(`frameworks[${i}].controls[${j}].status must be one of ${ALLOWED_CONTROL_STATUS.join(', ')} (got "${c.status}")`);
          }
        });
      }
    });
  }

  // isolationRequirements
  if (doc.isolationRequirements) {
    const ir = doc.isolationRequirements;
    if (!ALLOWED_ISOLATION_LEVELS.includes(ir.minimumLevel)) {
      errors.push(`isolationRequirements.minimumLevel must be one of ${ALLOWED_ISOLATION_LEVELS.join(', ')} (got "${ir.minimumLevel}")`);
    }
    if (!ALLOWED_KMS_PROVIDERS.includes(ir.kmsProvider)) {
      errors.push(`isolationRequirements.kmsProvider must be one of ${ALLOWED_KMS_PROVIDERS.join(', ')} (got "${ir.kmsProvider}")`);
    }
  }

  // auditTrail
  if (doc.auditTrail) {
    const at = doc.auditTrail;
    if (typeof at.enabled !== 'boolean') errors.push('auditTrail.enabled must be boolean');
    if (typeof at.retentionDays !== 'number' || at.retentionDays < 0) errors.push('auditTrail.retentionDays must be non-negative number');
    if (typeof at.immutable !== 'boolean') errors.push('auditTrail.immutable must be boolean');
    if (!at.sinkUrl || !/^https?:\/\//.test(at.sinkUrl)) errors.push('auditTrail.sinkUrl must be a URL');
  }

  // updatedAt
  if (doc.updatedAt && isNaN(Date.parse(doc.updatedAt))) {
    errors.push(`updatedAt must be ISO-8601 (got "${doc.updatedAt}")`);
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, value: doc };
}

/**
 * Compute the rollup framework status from its controls.
 * Helper for auditors who want to derive the framework status automatically.
 *
 * Rules:
 *   - All controls COMPLIANT or NOT_APPLICABLE → COMPLIANT
 *   - Any control NON_COMPLIANT → NON_COMPLIANT
 *   - Otherwise (some PARTIAL) → PARTIAL
 *   - No controls → NOT_ASSESSED
 */
export function rollupFrameworkStatus(framework) {
  if (!framework?.controls?.length) return 'NOT_ASSESSED';
  const statuses = framework.controls.map((c) => c.status);
  if (statuses.some((s) => s === 'NON_COMPLIANT')) return 'NON_COMPLIANT';
  if (statuses.some((s) => s === 'PARTIAL')) return 'PARTIAL';
  return 'COMPLIANT';
}
