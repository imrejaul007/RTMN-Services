// shared/types/index.ts - Common types for CompanyOS

// ============================================
// Company Types
// ============================================

export interface Company {
  id: string;
  name: string;
  industry: IndustryType;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'suspended' | 'decomposed';
}

export interface CompanyComposition {
  companyId: string;
  name: string;
  industry: IndustryType;
  departments: DepartmentType[];
  extensions: ExtensionType[];
  aiDepartments: Record<DepartmentType, AIConfig>;
  metadata?: Record<string, unknown>;
}

export type IndustryType =
  | 'restaurant' | 'beauty' | 'healthcare' | 'retail' | 'hotel'
  | 'education' | 'realestate' | 'fitness' | 'legal' | 'construction'
  | 'manufacturing' | 'logistics' | 'automotive' | 'fashion' | 'sports'
  | 'entertainment' | 'travel' | 'government' | 'agriculture' | 'nonprofit'
  | 'professional' | 'home_services' | 'gaming' | 'media';

// ============================================
// Department Types
// ============================================

export type DepartmentType =
  | 'finance' | 'hr' | 'marketing' | 'sales' | 'operations' | 'legal';

export interface DepartmentPack {
  id: DepartmentType;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  aiWorkers: AIWorker[];
  dependencies: {
    required: string[];
    optional: string[];
  };
  endpoints: Endpoint[];
}

export interface InstalledDepartment {
  id: DepartmentType;
  packVersion: string;
  endpoint: string;
  installedAt: string;
  config: Record<string, unknown>;
}

// ============================================
// Extension Types
// ============================================

export type ExtensionType =
  | 'pos' | 'kitchen' | 'reservations' | 'delivery' | 'recipes'
  | 'services' | 'stylists' | 'appointments' | 'memberships'
  | 'patients' | 'doctors' | 'emr' | 'prescriptions'
  | 'catalog' | 'inventory' | 'stores' | 'promotions'
  | 'rooms' | 'housekeeping' | 'concierge' | 'billing'
  | 'courses' | 'students' | 'assessments' | 'certificates'
  | string; // Custom extensions

export interface IndustryExtension {
  id: string;
  industry: IndustryType;
  name: string;
  version: string;
  description: string;
  modules: ExtensionModule[];
  dependencies: {
    required: string[];
    optional: string[];
  };
  specificity: {
    totalLOC: number;
    verticalLOC: number;
    ratio: number;
  };
}

export interface ExtensionModule {
  id: string;
  name: string;
  description: string;
  endpoints: Endpoint[];
  twin?: TwinRef;
}

export interface InstalledExtension {
  id: string;
  industry: IndustryType;
  version: string;
  endpoints: string[];
  installedAt: string;
  config: Record<string, unknown>;
  migratedFrom?: string;
}

// ============================================
// AI Workforce Types
// ============================================

export interface AIConfig {
  enabled: boolean;
  head: string;
  level?: 'junior' | 'senior' | 'lead';
  policies?: string[];
}

export interface AIWorker {
  id: string;
  name: string;
  department: DepartmentType;
  level: 'junior' | 'senior' | 'lead';
  description: string;
  capabilities: string[];
  skills: string[];
  authority: {
    maxTransactionValue: number;
    requireApprovalAbove: number;
    canApproveBudgets: boolean;
  };
  policies: string[];
  memory: {
    shortTerm: boolean;
    longTerm: boolean;
    retention?: string;
  };
  twin: TwinRef;
}

export interface InstalledWorker {
  id: string;
  type: string;
  department: DepartmentType;
  version: string;
  status: 'active' | 'paused' | 'failed';
  deployedAt: string;
  policies: string[];
}

// ============================================
// Twin Types
// ============================================

export interface TwinRef {
  id: string;
  type: string;
  service: string;
  endpoint: string;
}

export interface TwinGraph {
  companyTwin: TwinRef;
  departmentTwins: TwinRef[];
  extensionTwins: TwinRef[];
  workerTwins: TwinRef[];
}

// ============================================
// Common Types
// ============================================

export interface Endpoint {
  path: string;
  methods: string[];
  description?: string;
}

export interface CompositionResult {
  success: boolean;
  companyId: string;
  manifest?: CompanyManifest;
  installed: {
    departments: string[];
    extensions: string[];
    workers: string[];
    twins: string[];
  };
  errors?: CompositionError[];
  duration: number;
}

export interface CompositionError {
  phase: 'dependency' | 'install' | 'twin' | 'rollback';
  component: string;
  message: string;
  recoverable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
}
