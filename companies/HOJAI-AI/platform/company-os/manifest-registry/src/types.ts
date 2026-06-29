/**
 * Manifest Registry Types
 */

// Re-export from composition engine
export type { CompanyManifest } from '../../composition-engine/src/types';

// ============================================
// Snapshot Types
// ============================================

export interface ManifestSnapshot {
  id: string;
  manifestId: string;
  createdAt: string;
  reason: 'pre_update' | 'pre_migration' | 'manual' | 'scheduled';
  content: any; // CompanyManifest
  size: number;
}

// ============================================
// Version Types
// ============================================

export interface ManifestVersion {
  version: string;
  createdAt: string;
  changelog: string;
  parentVersion?: string;
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// ============================================
// Registry Types
// ============================================

export interface ManifestSummary {
  companyId: string;
  name: string;
  industry: string;
  version: string;
  updatedAt: string;
  size: number;
  checksum: string;
}

export interface RegistryStats {
  totalCompanies: number;
  byIndustry: Record<string, number>;
  totalSize: number;
  updatedAt: string;
}