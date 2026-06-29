# Migration Guide - Specification

> **Version:** 1.0
> **Phase:** 4-5 (Weeks 19-52)
> **Location:** `platform/company-os/migration/`

---

## Overview

Migration transforms legacy IndustryOS services into Industry Extensions while maintaining backward compatibility and zero downtime.

```
Migration Doctrine:
1. DO NOT rewrite everything at once
2. DO NOT duplicate systems
3. DO build compatibility adapters
4. DO migrate progressively
5. DO maintain backward compatibility
```

---

## Migration Stages

```
v1.0 (Current State)
+------------------+
|   IndustryOS     |
|  (Full Monolith) |
+------------------+

v1.5 (Migration Phase 1)
+---------------------------+---------------------------+
|       Legacy Layer        |     Extension Layer       |
|  (Compatibility Adapter)  |   (Vertical-Only Code)    |
|                           |                           |
|  /api/customers --------> | --------> DepartmentOS    |
|  /api/employees --------> | --------> DepartmentOS    |
|  /api/finance -----------> | --------> DepartmentOS    |
|                           |                           |
|  /api/menus ------------> | --------> MenuService     |
|  /api/kitchen -----------> | --------> KitchenService |
+---------------------------+---------------------------+

v2.0 (Target State)
+------------------+
|  Industry        |
|  Extension       |
| (Vertical Only)  |
+------------------+
         |
         v
+------------------+
|  DepartmentOS    |
|  (Universal)     |
+------------------+
```

---

## Migration Toolkit

```
migration/
|
|-- toolkit/
|   |-- migrate.ts           # Main migration orchestrator
|   |-- validate.ts          # Pre/post migration validation
|   |-- data-mapper.ts       # Data transformation
|   |-- route-analyzer.ts    # Analyze legacy routes
|   |-- dependency-analyzer.ts
|   |-- compatibility-checker.ts
|
|-- scripts/
|   |-- migrate-restaurant.sh
|   |-- migrate-beauty.sh
|   |-- migrate-healthcare.sh
|   |-- migrate-retail.sh
|   |-- migrate-hotel.sh
|   |-- [20 more...]
|
|-- adapters/
|   |-- restaurant/
|   |   |-- compatibility.ts  # Legacy route wrappers
|   |   |-- data-mapper.ts    # Data format conversion
|   |   |-- test-data.json    # Test fixtures
|   |   |-- __tests__/
|   |
|   |-- beauty/
|   |-- healthcare/
|   |-- [20 more...]
|
|-- templates/
|   |-- extension-template/  # New extension boilerplate
|
|-- __tests__/
    |-- migration.test.ts
```

---

## Migration Orchestrator

```typescript
// migration/toolkit/migrate.ts

export interface MigrationConfig {
  companyId: string;
  fromService: string;      // e.g., 'restaurant-os'
  toExtension: string;      // e.g., 'restaurant-extension'
  strategy: 'blue-green' | 'canary' | 'big-bang';
  validateBeforeMigrate: boolean;
  rollbackOnFailure: boolean;
  keepLegacyRoutes: number; // Days to keep legacy routes
}

export interface MigrationResult {
  success: boolean;
  duration: number;
  steps: MigrationStep[];
  dataMigrated: {
    records: number;
    size: number;
  };
  errors: MigrationError[];
  rollbackId?: string;
}

export interface MigrationStep {
  order: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  duration?: number;
  details?: string;
}

export class MigrationOrchestrator {
  
  /**
   * Execute complete migration
   */
  async migrate(config: MigrationConfig): Promise<MigrationResult>;
  
  /**
   * Plan migration (without executing)
   */
  async plan(config: MigrationConfig): Promise<MigrationPlan>;
  
  /**
   * Validate pre-migration state
   */
  async validatePreMigration(config: MigrationConfig): Promise<ValidationResult>;
  
  /**
   * Validate post-migration state
   */
  async validatePostMigration(config: MigrationConfig): Promise<ValidationResult>;
  
  /**
   * Rollback to pre-migration state
   */
  async rollback(rollbackId: string): Promise<RollbackResult>;
}
```

---

## Migration Plan

```typescript
// migration/toolkit/migrate.ts (continued)

export interface MigrationPlan {
  companyId: string;
  fromService: string;
  toExtension: string;
  estimatedDuration: number;  // minutes
  steps: PlannedStep[];
  risks: IdentifiedRisk[];
  dataMapping: DataMapping[];
  routeMapping: RouteMapping[];
  rollbackPlan: RollbackPlan;
}

export interface PlannedStep {
  order: number;
  name: string;
  action: string;
  estimatedDuration: number;
  canParallelize: boolean;
  dependencies: number[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface DataMapping {
  fromCollection: string;
  toCollection: string;
  transformations: Transformation[];
  validation: ValidationRule[];
  sampleData: SampleMapping[];
}

export interface RouteMapping {
  legacyRoute: string;
  newRoute: string;
  type: 'proxy' | 'redirect' | 'deprecated';
  adapterRequired: boolean;
  testStatus: 'pending' | 'passed' | 'failed';
}
```

---

## Pre-Migration Validation

```typescript
// migration/toolkit/validate.ts

export interface PreMigrationValidation {
  companyId: string;
  sourceService: string;
  validations: ValidationCheck[];
  passed: boolean;
  canProceed: boolean;
  blockers: Blocker[];
  warnings: Warning[];
}

export interface ValidationCheck {
  name: string;
  status: 'pending' | 'passed' | 'failed';
  details?: string;
}

export const preMigrationChecks = [
  {
    name: 'source_service_health',
    check: async (companyId: string) => {
      const health = await checkServiceHealth('restaurant-os', companyId);
      return health.status === 'healthy';
    },
    blocker: true
  },
  
  {
    name: 'no_active_migrations',
    check: async (companyId: string) => {
      const active = await getActiveMigrations(companyId);
      return active.length === 0;
    },
    blocker: true
  },
  
  {
    name: 'data_size_check',
    check: async (companyId: string) => {
      const size = await getDataSize(companyId, 'restaurant-os');
      return size < 100 * 1024 * 1024; // 100MB
    },
    blocker: false,
    warning: 'Large data may cause migration timeout'
  },
  
  {
    name: 'no_critical_operations',
    check: async (companyId: string) => {
      const ops = await getActiveOperations(companyId);
      return ops.filter(o => o.critical).length === 0;
    },
    blocker: false,
    warning: 'Critical operations in progress may fail'
  },
  
  {
    name: 'extension_exists',
    check: async (companyId: string) => {
      return await extensionExists('restaurant-extension');
    },
    blocker: true
  },
  
  {
    name: 'department_packs_installed',
    check: async (companyId: string) => {
      const manifest = await getManifest(companyId);
      return manifest.composition.departments.length >= 2;
    },
    blocker: true,
    warning: 'Department packs should be installed first'
  }
];
```

---

## Data Migration

```typescript
// migration/toolkit/data-mapper.ts

export interface DataMigration {
  fromService: string;
  toExtension: string;
  collections: CollectionMigration[];
}

export interface CollectionMigration {
  fromCollection: string;
  toCollection: string;
  count: number;
  status: 'pending' | 'migrating' | 'completed' | 'failed';
  transformations: Transformation[];
}

export interface Transformation {
  field: string;
  type: 'rename' | 'delete' | 'transform' | 'split' | 'merge';
  from: string;
  to: string;
  transform?: (value: any) => any;
}

// Example: Restaurant data migration
const restaurantDataMigration: DataMigration = {
  fromService: 'restaurant-os',
  toExtension: 'restaurant-extension',
  collections: [
    {
      fromCollection: 'menus',
      toCollection: 'extension_restaurant_menus',
      transformations: [
        { field: 'restaurantId', type: 'rename', to: 'companyId' },
        { field: 'items', type: 'transform', transform: normalizeMenuItems },
        { field: 'internalNotes', type: 'delete' }
      ]
    },
    {
      fromCollection: 'orders',
      toCollection: 'extension_restaurant_orders',
      transformations: [
        { field: 'customerData', type: 'split', to: ['customerRef', 'customerSnapshot'] },
        { field: 'customerId', type: 'rename', to: 'customerRef.id' },
        { field: 'paymentInfo', type: 'delete' }  // Now in Finance
      ]
    },
    {
      fromCollection: 'tables',
      toCollection: 'extension_restaurant_tables',
      transformations: [
        { field: 'restaurantId', type: 'rename', to: 'companyId' }
      ]
    },
    {
      fromCollection: 'customers',  // MIGRATE TO DEPARTMENTOS
      toCollection: 'department_crm_customers',
      targetService: 'sales-os',
      transformations: [
        { field: 'name', type: 'keep' },
        { field: 'phone', type: 'keep' },
        { field: 'email', type: 'keep' },
        { field: 'diningPreferences', type: 'rename', to: 'customFields.dining' }
      ]
    }
  ]
};
```

---

## Compatibility Adapter

```typescript
// migration/adapters/restaurant/compatibility.ts

import { Router, Request, Response, NextFunction } from 'express';
import { proxyRequest } from '@hojai/shared';

export function createRestaurantCompatAdapter(
  extensionBaseUrl: string,
  departmentBaseUrl: string
): Router {
  const router = Router();
  
  // ============================================
  // LEGACY ROUTES -> DEPARTMENTOS (CRM/HR/Finance)
  // ============================================
  
  router.all('/api/customers*', (req: Request, res: Response) => {
    // These now live in SalesOS (CRM)
    const newPath = req.path.replace('/api/customers', '/api/crm/customers');
    proxyRequest(req, `${departmentBaseUrl}${newPath}`, res);
  });
  
  router.all('/api/employees*', (req: Request, res: Response) => {
    // These now live in WorkforceOS (HR)
    const newPath = req.path.replace('/api/employees', '/api/hr/employees');
    proxyRequest(req, `${departmentBaseUrl}${newPath}`, res);
  });
  
  router.all('/api/invoices*', (req: Request, res: Response) => {
    // These now live in FinanceOS
    const newPath = req.path.replace('/api/invoices', '/api/finance/invoices');
    proxyRequest(req, `${departmentBaseUrl}${newPath}`, res);
  });
  
  router.all('/api/payments*', (req: Request, res: Response) => {
    const newPath = req.path.replace('/api/payments', '/api/finance/payments');
    proxyRequest(req, `${departmentBaseUrl}${newPath}`, res);
  });
  
  // ============================================
  // LEGACY ROUTES -> EXTENSION (Vertical)
  // ============================================
  
  router.all('/api/menus*', (req: Request, res: Response) => {
    proxyRequest(req, `${extensionBaseUrl}${req.path}`, res);
  });
  
  router.all('/api/kitchen*', (req: Request, res: Response) => {
    proxyRequest(req, `${extensionBaseUrl}${req.path}`, res);
  });
  
  router.all('/api/pos*', (req: Request, res: Response) => {
    proxyRequest(req, `${extensionBaseUrl}${req.path}`, res);
  });
  
  router.all('/api/tables*', (req: Request, res: Response) => {
    proxyRequest(req, `${extensionBaseUrl}${req.path}`, res);
  });
  
  router.all('/api/reservations*', (req: Request, res: Response) => {
    proxyRequest(req, `${extensionBaseUrl}${req.path}`, res);
  });
  
  router.all('/api/recipes*', (req: Request, res: Response) => {
    proxyRequest(req, `${extensionBaseUrl}${req.path}`, res);
  });
  
  // ============================================
  // DEPRECATION WARNINGS
  // ============================================
  
  router.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Migration-Warning', 
      'This endpoint has moved. See /api/migration/status for details.');
    res.setHeader('X-Migration-Date', '2026-07-01');
    next();
  });
  
  return router;
}
```

---

## Migration Script

```bash
#!/bin/bash
# migration/scripts/migrate-restaurant.sh

set -e

COMPANY_ID=${1:-}
FROM_SERVICE="restaurant-os"
TO_EXTENSION="restaurant-extension"
STRATEGY="${2:-blue-green}"

if [ -z "$COMPANY_ID" ]; then
    echo "Usage: ./migrate-restaurant.sh <company_id> [strategy]"
    echo "Strategies: blue-green, canary, big-bang"
    exit 1
fi

echo "=========================================="
echo "RestaurantOS Migration"
echo "=========================================="
echo "Company: $COMPANY_ID"
echo "From: $FROM_SERVICE"
echo "To: $TO_EXTENSION"
echo "Strategy: $STRATEGY"
echo "=========================================="

# Step 1: Pre-migration validation
echo "[1/7] Running pre-migration validation..."
npx ts-node migration/toolkit/validate.ts pre \
    --company-id "$COMPANY_ID" \
    --source-service "$FROM_SERVICE"

# Step 2: Create rollback snapshot
echo "[2/7] Creating rollback snapshot..."
SNAPSHOT_ID=$(npx ts-node migration/toolkit/snapshot.ts create \
    --company-id "$COMPANY_ID" \
    --reason "pre-migration-restaurant")
echo "Snapshot ID: $SNAPSHOT_ID"

# Step 3: Deploy compatibility adapter
echo "[3/7] Deploying compatibility adapter..."
npx ts-node migration/toolkit/deploy-adapter.ts \
    --company-id "$COMPANY_ID" \
    --adapter restaurant \
    --port 5011

# Step 4: Migrate data
echo "[4/7] Migrating data..."
npx ts-node migration/toolkit/migrate-data.ts \
    --company-id "$COMPANY_ID" \
    --mapping restaurant-data-mapping.json \
    --batch-size 1000

# Step 5: Deploy extension
echo "[5/7] Deploying restaurant-extension..."
npx ts-node migration/toolkit/deploy-extension.ts \
    --company-id "$COMPANY_ID" \
    --extension "$TO_EXTENSION"

# Step 6: Run smoke tests
echo "[6/7] Running smoke tests..."
npx ts-node migration/toolkit/smoke-test.ts \
    --company-id "$COMPANY_ID" \
    --endpoints "/api/menus,/api/kitchen,/api/pos"

# Step 7: Switch traffic
echo "[7/7] Switching traffic to extension..."
npx ts-node migration/toolkit/switch-traffic.ts \
    --company-id "$COMPANY_ID" \
    --from "$FROM_SERVICE" \
    --to "$TO_EXTENSION"

echo "=========================================="
echo "Migration complete!"
echo "Legacy routes will be deprecated after 90 days"
echo "=========================================="
```

---

## Rollback Plan

```typescript
// migration/toolkit/rollback.ts

export interface RollbackPlan {
  snapshotId: string;
  steps: RollbackStep[];
  estimatedDuration: number;
}

export interface RollbackStep {
  order: number;
  name: string;
  action: 'stop' | 'restore' | 'cleanup' | 'switch';
  target: string;
  dataKey?: string;
}

export async function createRollbackPlan(
  migrationId: string
): Promise<RollbackPlan> {
  const migration = await getMigration(migrationId);
  
  return {
    snapshotId: migration.snapshotId,
    steps: [
      {
        order: 1,
        name: 'Stop extension traffic',
        action: 'stop',
        target: migration.toExtension
      },
      {
        order: 2,
        name: 'Restore data from snapshot',
        action: 'restore',
        target: 'all_collections',
        dataKey: migration.snapshotId
      },
      {
        order: 3,
        name: 'Restore legacy service',
        action: 'switch',
        target: migration.fromService
      },
      {
        order: 4,
        name: 'Cleanup extension resources',
        action: 'cleanup',
        target: migration.toExtension
      }
    ],
    estimatedDuration: 10 * 60 * 1000  // 10 minutes
  };
}

export async function executeRollback(
  rollbackId: string
): Promise<RollbackResult> {
  const plan = await createRollbackPlan(rollbackId);
  
  for (const step of plan.steps) {
    console.log(`[Rollback] Step ${step.order}: ${step.name}`);
    await executeRollbackStep(step);
  }
  
  return { success: true, stepsCompleted: plan.steps.length };
}
```

---

## Migration Checklist

```yaml
# migration/checklist-template.yaml

migration_id: "mig_2026_07_01_restaurant_001"
company_id: "rez_restaurant_001"
started_at: "2026-07-01T10:00:00Z"
completed_at: null

pre_migration:
  - [ ] Source service healthy
  - [ ] No active critical operations
  - [ ] Extension exists and passes tests
  - [ ] Department packs installed
  - [ ] Data size acceptable
  - [ ] Rollback snapshot created

migration_steps:
  - [ ] Compatibility adapter deployed
  - [ ] Data migration completed
  - [ ] Extension deployed
  - [ ] Smoke tests passed
  - [ ] Traffic switched
  - [ ] Post-migration validation passed

post_migration:
  - [ ] All routes responding
  - [ ] Data integrity verified
  - [ ] Twin graph updated
  - [ ] Manifest updated
  - [ ] Monitoring configured
  - [ ] Documentation updated

deprecation:
  - [ ] Legacy routes marked deprecated (Day 1)
  - [ ] Deprecation warnings added (Day 1)
  - [ ] Migration guide sent to users (Day 7)
  - [ ] Legacy routes removed (Day 90)
```

---

## Test Cases

```typescript
// migration/__tests__/migration.test.ts

describe('Migration', () => {
  
  it('should create rollback snapshot before migration', async () => {
    const snapshot = await migrationOrchestrator.snapshot(
      'test_company',
      'pre_migration'
    );
    
    expect(snapshot.id).toBeDefined();
    expect(snapshot.content).toBeDefined();
  });
  
  it('should validate pre-migration state', async () => {
    const result = await migrationOrchestrator.validatePreMigration({
      companyId: 'test_company',
      sourceService: 'restaurant-os'
    });
    
    expect(result.canProceed).toBeDefined();
    if (!result.canProceed) {
      expect(result.blockers.length).toBeGreaterThan(0);
    }
  });
  
  it('should migrate data with transformations', async () => {
    const result = await migrationOrchestrator.migrateData({
      companyId: 'test_company',
      mapping: restaurantDataMigration,
      batchSize: 100
    });
    
    expect(result.recordsMigrated).toBeGreaterThan(0);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should rollback successfully on failure', async () => {
    // Simulate migration failure
    await migrationOrchestrator.migrate({ ... });
    
    // Verify rollback happened
    const state = await getCompanyState('test_company');
    expect(state.service).toBe('restaurant-os');  // Back to original
  });
  
  it('should maintain backward compatibility', async () => {
    // Call legacy endpoint after migration
    const response = await request('/api/customers');
    
    expect(response.status).toBe(200);
    expect(response.headers['x-migration-warning']).toBeDefined();
  });
});
```

---

## Dependencies

```json
{
  "@hojai/company-os": "workspace:*",
  "@hojai/manifest-registry": "workspace:*",
  "@hojai/twin-os": "workspace:*"
}
```