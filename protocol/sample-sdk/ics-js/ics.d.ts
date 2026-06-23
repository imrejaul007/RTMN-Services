// TypeScript declarations for @rtmn/ics v0.1.0

export interface Jurisdiction {
  country: string;     // ISO-3166-1 alpha-2 (e.g. "US", "DE", "IN")
  region?: string;
}

export type FrameworkStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_ASSESSED';
export type ControlStatus   = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NOT_APPLICABLE';
export type IsolationLevel  = 'SHARED' | 'DEDICATED' | 'ISOLATED';
export type KmsProvider     = 'aws-kms' | 'gcp-kms' | 'azure-kv' | 'hashicorp-vault' | 'customer-managed';
export type SubjectType     = 'industry_tenant_instance';

export interface Control {
  controlId: string;
  name: string;
  status: ControlStatus;
  evidenceRef?: string;
  notes?: string;
}

export interface Framework {
  id: string;                      // e.g. "HIPAA", "PCI-DSS", "GDPR"
  version: string;                 // free-form (e.g. "4.0", "2013-01-25")
  status: FrameworkStatus;
  lastAssessedAt: string;          // ISO-8601
  nextAssessmentDue: string;       // ISO-8601
  controls: Control[];
  assessor?: string;
  notes?: string;
}

export interface IsolationRequirements {
  minimumLevel: IsolationLevel;
  kmsProvider: KmsProvider;
  regionPin?: boolean;
  notes?: string;
}

export interface AuditTrail {
  enabled: boolean;
  retentionDays: number;
  immutable: boolean;
  sinkUrl: string;                 // https://...
}

export interface IcsDocument {
  schemaVersion: string;           // "0.1.x"
  subjectType: SubjectType;
  subjectId: string;               // e.g. "ti_abc123"
  tenantId: string;
  industry: string;                // "healthcare" | "retail" | ...
  jurisdiction: Jurisdiction;
  frameworks: Framework[];
  dataResidency: string[];         // ISO-3166-1 alpha-2 codes
  isolationRequirements: IsolationRequirements;
  auditTrail: AuditTrail;
  updatedAt: string;               // ISO-8601
  updatedBy: string;
}

export type ValidationResult =
  | { ok: true; value: IcsDocument }
  | { ok: false; errors: string[] };

export function validate(doc: unknown): ValidationResult;
export function rollupFrameworkStatus(framework: { controls?: { status: ControlStatus }[] } | null | undefined): FrameworkStatus;
