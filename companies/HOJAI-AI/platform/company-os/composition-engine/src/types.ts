/**
 * Composition Engine Types
 *
 * Core types for company composition in CompanyOS.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Industry & Department Types
// ============================================

export type IndustryType =
  | 'restaurant' | 'beauty' | 'healthcare' | 'retail' | 'hotel'
  | 'education' | 'realestate' | 'fitness' | 'legal' | 'construction'
  | 'manufacturing' | 'logistics' | 'automotive' | 'fashion' | 'sports'
  | 'entertainment' | 'travel' | 'government' | 'agriculture' | 'nonprofit'
  | 'professional' | 'home_services' | 'gaming' | 'media';

export type DepartmentType =
  | 'finance' | 'hr' | 'marketing' | 'sales' | 'operations' | 'legal';

export type ExtensionType =
  | 'pos' | 'kitchen' | 'reservations' | 'delivery' | 'recipes'
  | 'services' | 'stylists' | 'appointments' | 'memberships'
  | 'patients' | 'doctors' | 'emr' | 'prescriptions'
  | 'catalog' | 'inventory' | 'stores' | 'promotions'
  | 'rooms' | 'housekeeping' | 'concierge' | 'billing'
  | 'courses' | 'students' | 'assessments' | 'certificates'
  | string;

// ============================================
// Composition Request
// ============================================

export interface CompanyComposition {
  companyId: string;
  name: string;
  industry: IndustryType;
  departments: DepartmentType[];
  extensions: ExtensionType[];
  aiDepartments: Record<DepartmentType, AIConfig>;
  metadata?: Record<string, unknown>;
}

export interface AIConfig {
  enabled: boolean;
  head: string;
  level?: 'junior' | 'senior' | 'lead';
  policies?: string[];
}

// ============================================
// Composition Result
// ============================================

export interface CompositionResult {
  success: boolean;
  companyId: string;
  manifest?: CompanyManifest;
  installed: {
    departments: InstalledDepartment[];
    extensions: InstalledExtension[];
    workers: InstalledWorker[];
    twins: TwinRef[];
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

// ============================================
// Decompose Result
// ============================================

export interface DecomposeResult {
  success: boolean;
  companyId: string;
  removed: {
    departments: string[];
    extensions: string[];
    workers: string[];
    twins: string[];
  };
  duration: number;
}

// ============================================
// Installed Components
// ============================================

export interface InstalledDepartment {
  id: DepartmentType;
  packVersion: string;
  endpoint: string;
  installedAt: string;
  config: Record<string, unknown>;
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
// Twin References
// ============================================

export interface TwinRef {
  id: string;
  type: string;
  service: string;
  endpoint: string;
}

// ============================================
// Company Manifest
// ============================================

export interface CompanyManifest {
  version: string;
  companyId: string;
  name: string;
  industry: IndustryType;
  createdAt: string;
  updatedAt: string;

  composition: {
    departments: InstalledDepartment[];
    extensions: InstalledExtension[];
    aiWorkers: InstalledWorker[];
  };

  twins: {
    companyTwin: TwinRef;
    departmentTwins: TwinRef[];
    extensionTwins: TwinRef[];
    workerTwins: TwinRef[];
  };

  metadata: {
    createdBy: string;
    environment: 'dev' | 'staging' | 'production';
    region: string;
    tags?: string[];
  };

  checksum: string;
}

// ============================================
// Dependency Resolution
// ============================================

export interface DependencyNode {
  id: string;
  type: 'industry' | 'department' | 'extension';
  requires: string[];
  optional: string[];
  conflicts: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'required' | 'optional';
}

export interface DependencyResolution {
  resolved: string[];
  autoAdded: { id: string; reason: string }[];
  conflicts: { id: string; conflictsWith: string }[];
  cycles: string[][];
}

// ============================================
// Installation Planning
// ============================================

export interface InstallationPlan {
  steps: InstallationStep[];
  estimatedDuration: number;
  rollbackPlan: RollbackPlan;
}

export interface InstallationStep {
  order: number;
  component: string;
  type: 'department' | 'extension' | 'worker' | 'twin';
  action: 'install' | 'configure' | 'verify';
  dependencies: number[];
  timeout: number;
}

export interface RollbackPlan {
  steps: RollbackStep[];
  snapshotId: string;
}

export interface RollbackStep {
  order: number;
  component: string;
  action: 'uninstall' | 'restore' | 'cleanup';
  snapshotKey?: string;
}

// ============================================
// State Management
// ============================================

export interface CompositionState {
  companyId: string;
  status: 'pending' | 'composing' | 'composed' | 'failed' | 'decomposing';
  currentStep?: number;
  totalSteps?: number;
  installed: {
    departments: Map<string, DepartmentState>;
    extensions: Map<string, ExtensionState>;
    workers: Map<string, WorkerState>;
    twins: Map<string, TwinState>;
  };
  lastUpdate: Date;
}

export interface DepartmentState {
  id: string;
  status: 'pending' | 'installing' | 'installed' | 'failed';
  version: string;
  endpoint?: string;
  error?: string;
}

export interface ExtensionState {
  id: string;
  industry: IndustryType;
  status: 'pending' | 'installing' | 'installed' | 'migrating' | 'failed';
  version: string;
  endpoints: string[];
  error?: string;
}

export interface WorkerState {
  id: string;
  type: string;
  status: 'pending' | 'deploying' | 'active' | 'paused' | 'failed';
  error?: string;
}

export interface TwinState {
  id: string;
  type: string;
  status: 'pending' | 'creating' | 'active' | 'failed';
  error?: string;
}

// ============================================
// Validation
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

export interface DepartmentPackManifest {
  id: DepartmentType;
  name: string;
  version: string;
  description: string;
  capabilities: string[];
  aiWorkers: AIWorkerDefinition[];
  dependencies: {
    required: string[];
    optional: string[];
  };
  conflicts: string[];
  endpoints: string[];
  port: number;
}

export interface IndustryExtensionManifest {
  id: string;
  industry: IndustryType;
  name: string;
  version: string;
  description: string;
  modules: ExtensionModuleDefinition[];
  dependencies: {
    required: DepartmentType[];
    optional: DepartmentType[];
  };
  specificity: {
    totalLOC: number;
    verticalLOC: number;
    ratio: number;
  };
  port: number;
}

export interface ExtensionModuleDefinition {
  id: string;
  name: string;
  endpoints: string[];
}

export interface AIWorkerDefinition {
  id: string;
  name: string;
  department: DepartmentType;
  level: 'junior' | 'senior' | 'lead';
  skills: string[];
  policies: string[];
  authority: {
    maxTransactionValue: number;
    requireApprovalAbove: number;
  };
}

// ============================================
// Factory Functions
// ============================================

export function createCompanyId(prefix: string = 'company'): string {
  return `${prefix}_${uuidv4().slice(0, 8)}`;
}

export function createTwinId(companyId: string, type: string): string {
  return `twin_${type}_${companyId}`;
}

export function createWorkerId(department: DepartmentType, workerType: string): string {
  return `worker_${workerType}_${department}`;
}