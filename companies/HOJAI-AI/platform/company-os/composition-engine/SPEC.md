# Composition Engine - Specification

> **Version:** 1.0
> **Phase:** 1 (Weeks 1-6)
> **Location:** `platform/company-os/composition-engine/`

---

## Overview

The Composition Engine is the brain of CompanyOS. It takes a company composition request and orchestrates the installation of Department Packs, Industry Extensions, AI Workers, and Twin Graph generation.

```
Composition Request
        |
        v
Dependency Resolver
        |
        v
Installation Planner
        |
        v
Sequential Installer
        |
        v
State Manager
        |
        v
Manifest Generator
        |
        v
Success/Failure
```

---

## Core Types

```typescript
// composition-engine/src/types.ts

export interface CompanyComposition {
  companyId: string;
  name: string;
  industry: IndustryType;
  departments: DepartmentType[];
  extensions: ExtensionType[];
  aiDepartments: Record<DepartmentType, AIConfig>;
  metadata?: Record<string, unknown>;
}

export interface CompositionResult {
  success: boolean;
  companyId: string;
  manifest: CompanyManifest;
  installed: {
    departments: string[];
    extensions: string[];
    workers: string[];
    twins: string[];
  };
  errors?: CompositionError[];
  duration: number; // ms
}

export interface CompositionError {
  phase: 'dependency' | 'install' | 'twin' | 'rollback';
  component: string;
  message: string;
  recoverable: boolean;
}

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
  | [string]; // Custom extensions

export interface AIConfig {
  enabled: boolean;
  head: string; // e.g., 'ai_cfo', 'ai_cmo'
  level?: 'junior' | 'senior' | 'lead';
  policies?: string[];
}
```

---

## API

```typescript
// composition-engine/src/engine.ts

export class CompositionEngine {
  
  /**
   * Compose a complete company
   */
  async compose(request: CompanyComposition): Promise<CompositionResult>;
  
  /**
   * Decompose (teardown) a company
   */
  async decompose(companyId: string): Promise<DecomposeResult>;
  
  /**
   * Get current composition state
   */
  async getState(companyId: string): Promise<CompositionState>;
  
  /**
   * Validate a composition request before execution
   */
  async validate(request: CompanyComposition): Promise<ValidationResult>;
}
```

---

## Dependency Resolver

```typescript
// composition-engine/src/dependency-resolver.ts

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;           // e.g., 'restaurant', 'finance'
  type: 'industry' | 'department' | 'extension';
  requires: string[];   // IDs this node depends on
  optional: string[];   // Optional dependencies
  conflicts: string[];  // IDs this node cannot coexist with
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'required' | 'optional';
}

// Resolution rules:
// 1. Always install required dependencies first
// 2. Install optional dependencies if not explicitly excluded
// 3. Never install conflicting nodes
// 4. Circular dependencies = error
```

### Industry Extension Dependencies

```yaml
# industry-extensions/registry.yaml

restaurant:
  requires:
    - finance
    - operations
  optional:
    - marketing
  conflicts: []

beauty:
  requires:
    - finance
  optional:
    - marketing
    - hr
  conflicts: []

healthcare:
  requires:
    - finance
    - legal
  optional:
    - hr
  conflicts: []
```

---

## Installation Planner

```typescript
// composition-engine/src/installer.ts

export interface InstallationPlan {
  steps: InstallationStep[];
  estimatedDuration: number; // ms
  rollbackPlan: RollbackPlan;
}

export interface InstallationStep {
  order: number;
  component: string;
  type: 'department' | 'extension' | 'worker' | 'twin';
  action: 'install' | 'configure' | 'verify';
  dependencies: string[];  // Steps that must complete first
  timeout: number; // ms
}

// Default installation order:
// 1. Identity (CorpID)
// 2. Finance Department
// 3. HR Department
// 4. Other Departments
// 5. Industry Extension
// 6. AI Workers
// 7. Twin Graph
```

---

## State Manager

```typescript
// composition-engine/src/state-manager.ts

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
```

---

## Rollback Engine

```typescript
// composition-engine/src/rollback.ts

export interface RollbackPlan {
  steps: RollbackStep[];
  snapshotId: string;
}

export interface RollbackStep {
  order: number;
  component: string;
  action: 'uninstall' | 'restore' | 'cleanup';
  snapshotKey?: string;  // For state restoration
}

// Rollback triggers:
// 1. Installation failure
// 2. Timeout exceeded
// 3. Health check failure
// 4. Manual trigger

// Rollback strategy:
// 1. Stop accepting new requests
// 2. Execute rollback steps in reverse order
// 3. Restore snapshots
// 4. Clean up partial state
// 5. Mark composition as failed
```

---

## Example Usage

```typescript
// Example: Create a restaurant company

import { CompositionEngine } from './engine';
import { CompanyComposition } from './types';

const engine = new CompositionEngine();

const request: CompanyComposition = {
  companyId: 'rez_restaurant_001',
  name: 'My Restaurant',
  industry: 'restaurant',
  departments: ['finance', 'marketing', 'operations'],
  extensions: ['pos', 'kitchen', 'delivery', 'reservations'],
  aiDepartments: {
    marketing: { enabled: true, head: 'ai_cmo' },
    finance: { enabled: true, head: 'ai_cfo' },
    operations: { enabled: true, head: 'ai_ops_manager' }
  }
};

const result = await engine.compose(request);

// Result:
// {
//   success: true,
//   companyId: 'rez_restaurant_001',
//   manifest: { ... },
//   installed: {
//     departments: ['finance', 'marketing', 'operations'],
//     extensions: ['pos', 'kitchen', 'delivery', 'reservations'],
//     workers: ['ai_cfo', 'ai_cmo', 'ai_ops_manager'],
//     twins: ['company', 'department:finance', 'department:marketing', ...]
//   },
//   duration: 12500
// }
```

---

## Dependencies

```json
{
  "@hojai/manifest-registry": "workspace:*",
  "@hojai/twin-os": "workspace:*",
  "@hojai/memory-os": "workspace:*",
  "@hojai/sutar-os": "workspace:*"
}
```

---

## Port

- **Control Plane Port:** 4010
- **Composition Engine:** Internal module (not a separate service)

---

## Test Cases

```typescript
// __tests__/composition-engine.test.ts

describe('CompositionEngine', () => {
  
  it('should compose a restaurant company with all departments', async () => {
    const engine = new CompositionEngine();
    const result = await engine.compose({
      companyId: 'test_restaurant',
      name: 'Test Restaurant',
      industry: 'restaurant',
      departments: ['finance', 'marketing', 'operations'],
      extensions: ['pos', 'kitchen'],
      aiDepartments: {}
    });
    
    expect(result.success).toBe(true);
    expect(result.installed.departments).toContain('finance');
    expect(result.installed.extensions).toContain('pos');
  });
  
  it('should auto-install required dependencies', async () => {
    // Restaurant requires finance + operations
    const result = await engine.compose({
      companyId: 'test',
      industry: 'restaurant',
      departments: ['marketing'],  // Explicit
      extensions: [],
      aiDepartments: {}
    });
    
    // Should auto-add: finance, operations
    expect(result.installed.departments).toContain('finance');
    expect(result.installed.departments).toContain('operations');
  });
  
  it('should rollback on installation failure', async () => {
    // Simulate failure in kitchen extension
    const result = await engine.compose({ ... });
    
    expect(result.success).toBe(false);
    expect(result.errors?.[0].phase).toBe('install');
    expect(result.errors?.[0].component).toBe('kitchen');
    
    // Verify rollback happened
    const state = await engine.getState('test');
    expect(state.status).toBe('failed');
  });
});
```