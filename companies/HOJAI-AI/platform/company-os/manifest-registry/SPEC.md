# Manifest Registry - Specification

> **Version:** 1.0
> **Phase:** 1 (Weeks 1-6)
> **Location:** `platform/company-os/manifest-registry/`

---

## Overview

The Manifest Registry stores, versions, and manages Company Manifests. It is the source of truth for what components are installed in each company.

```
Manifest Registry
|
|-- manifests/
|   |-- {company_id}/
|       |-- current.yaml      # Current active manifest
|       |-- v1.0.yaml         # Version history
|       |-- v1.1.yaml
|       |-- snapshots/        # Point-in-time snapshots
|           |-- snapshot_20260629_120000.yaml
|
|-- snapshots/                # Global rollback snapshots
|
|-- registry.yaml             # Index of all manifests
```

---

## Core Types

```typescript
// manifest-registry/src/types.ts

export interface CompanyManifest {
  version: string;           // Semantic version
  companyId: string;
  name: string;
  industry: IndustryType;
  createdAt: string;         // ISO 8601
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
    createdBy: string;       // User or system
    environment: 'dev' | 'staging' | 'production';
    region: string;
    tags?: string[];
  };
  
  checksum: string;          // SHA-256 of manifest content
}

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
  migratedFrom?: string;     // Legacy service name if migrated
}

export interface InstalledWorker {
  id: string;
  type: string;              // e.g., 'ai_cfo'
  department: DepartmentType;
  version: string;
  status: 'active' | 'paused' | 'failed';
  deployedAt: string;
  policies: string[];
}

export interface TwinRef {
  id: string;
  type: string;
  service: string;
  endpoint: string;
}

export interface ManifestSnapshot {
  id: string;
  manifestId: string;
  createdAt: string;
  reason: 'pre_update' | 'pre_migration' | 'manual' | 'scheduled';
  content: CompanyManifest;
  size: number;              // bytes
}

export interface ManifestVersion {
  version: string;
  createdAt: string;
  changelog: string;
  parentVersion?: string;
}
```

---

## API

```typescript
// manifest-registry/src/registry.ts

export class ManifestRegistry {
  
  /**
   * Create a new manifest
   */
  async create(manifest: CompanyManifest): Promise<void>;
  
  /**
   * Get current manifest for a company
   */
  async get(companyId: string): Promise<CompanyManifest>;
  
  /**
   * Update manifest (creates new version)
   */
  async update(companyId: string, updates: Partial<CompanyManifest>): Promise<CompanyManifest>;
  
  /**
   * Delete manifest and all versions
   */
  async delete(companyId: string): Promise<void>;
  
  /**
   * List all manifests
   */
  async list(options?: ListOptions): Promise<ManifestSummary[]>;
  
  /**
   * Get specific version
   */
  async getVersion(companyId: string, version: string): Promise<CompanyManifest>;
  
  /**
   * List version history
   */
  async getVersionHistory(companyId: string): Promise<ManifestVersion[]>;
  
  /**
   * Create a point-in-time snapshot
   */
  async snapshot(companyId: string, reason: SnapshotReason): Promise<ManifestSnapshot>;
  
  /**
   * Restore from snapshot
   */
  async restore(companyId: string, snapshotId: string): Promise<CompanyManifest>;
  
  /**
   * Validate manifest integrity
   */
  async validate(companyId: string): Promise<ValidationResult>;
}
```

---

## Storage Format

### Manifest File (current.yaml)
```yaml
# Company Manifest v1.0
version: "1.0.0"
companyId: "rez_restaurant_001"
name: "My Restaurant"
industry: "restaurant"
createdAt: "2026-06-29T10:00:00Z"
updatedAt: "2026-06-29T10:00:00Z"

composition:
  departments:
    - id: "finance"
      packVersion: "1.0.0"
      endpoint: "http://localhost:4801"
      installedAt: "2026-06-29T10:00:05Z"
      config:
        currency: "INR"
        timezone: "Asia/Kolkata"
    
    - id: "marketing"
      packVersion: "1.0.0"
      endpoint: "http://localhost:5500"
      installedAt: "2026-06-29T10:00:08Z"
      config:
        channels: ["whatsapp", "email", "sms"]
    
    - id: "operations"
      packVersion: "1.0.0"
      endpoint: "http://localhost:5250"
      installedAt: "2026-06-29T10:00:10Z"
      config: {}

  extensions:
    - id: "pos"
      industry: "restaurant"
      version: "1.0.0"
      endpoints:
        - "http://localhost:5010/api/pos"
      installedAt: "2026-06-29T10:00:15Z"
      config:
        currency: "INR"
    
    - id: "kitchen"
      industry: "restaurant"
      version: "1.0.0"
      endpoints:
        - "http://localhost:5010/api/kitchen"
      installedAt: "2026-06-29T10:00:15Z"
      config: {}

    - id: "reservations"
      industry: "restaurant"
      version: "1.0.0"
      endpoints:
        - "http://localhost:5010/api/reservations"
      installedAt: "2026-06-29T10:00:15Z"
      config:
        maxAdvanceDays: 30

  aiWorkers:
    - id: "ai_cfo"
      type: "ai_cfo"
      department: "finance"
      version: "1.0.0"
      status: "active"
      deployedAt: "2026-06-29T10:00:20Z"
      policies:
        - "max_transaction_amount: 100000"
        - "require_approval_above: 500000"
    
    - id: "ai_cmo"
      type: "ai_cmo"
      department: "marketing"
      version: "1.0.0"
      status: "active"
      deployedAt: "2026-06-29T10:00:20Z"
      policies:
        - "max_campaign_budget: 50000"

twins:
  companyTwin:
    id: "twin_company_rez_restaurant_001"
    type: "company"
    service: "twinos-hub"
    endpoint: "http://localhost:4705"
  
  departmentTwins:
    - id: "twin_dept_finance_rez_restaurant_001"
      type: "department:finance"
      service: "twinos-hub"
      endpoint: "http://localhost:4705"
    
    - id: "twin_dept_marketing_rez_restaurant_001"
      type: "department:marketing"
      service: "twinos-hub"
      endpoint: "http://localhost:4705"
  
  extensionTwins:
    - id: "twin_ext_pos_rez_restaurant_001"
      type: "extension:pos"
      service: "twinos-hub"
      endpoint: "http://localhost:4705"
  
  workerTwins:
    - id: "twin_worker_ai_cfo_rez_restaurant_001"
      type: "worker:ai_cfo"
      service: "twinos-hub"
      endpoint: "http://localhost:4705"

metadata:
  createdBy: "composition-engine"
  environment: "production"
  region: "ap-south-1"
  tags:
    - "restaurant"
    - "india"
    - "pilot"

checksum: "sha256:a1b2c3d4e5f6..."
```

### Registry Index (registry.yaml)
```yaml
# Manifest Registry Index
updatedAt: "2026-06-29T12:00:00Z"
total: 247

companies:
  - companyId: "rez_restaurant_001"
    version: "1.0.0"
    industry: "restaurant"
    updatedAt: "2026-06-29T10:00:00Z"
    size: 4521
    checksum: "sha256:a1b2c3d4e5f6..."
  
  - companyId: "rez_beauty_001"
    version: "1.0.0"
    industry: "beauty"
    updatedAt: "2026-06-28T15:30:00Z"
    size: 3892
    checksum: "sha256:b2c3d4e5f6..."
  
  # ... more companies
```

---

## Versioning Strategy

### Version Format
```
{major}.{minor}.{patch}

- Major: Breaking changes (e.g., removed components)
- Minor: New components added
- Patch: Config updates only
```

### Version History Rules
1. **Never modify old versions** - they are immutable
2. **Always create new version** on update
3. **Keep last 10 versions** per company
4. **Prune versions older than 90 days** (unless snapshot exists)

---

## Snapshot Strategy

### Automatic Snapshots
| Trigger | Reason Code |
|---------|-------------|
| Before pack install | `pre_install` |
| Before extension install | `pre_install` |
| Before company update | `pre_update` |
| Before migration | `pre_migration` |
| Daily (at 3 AM) | `scheduled` |

### Manual Snapshots
```bash
# Create manual snapshot
curl -X POST http://localhost:4010/api/manifest/rez_restaurant_001/snapshot \
  -d '{"reason": "manual", "note": "Pre-deployment checkpoint"}'
```

### Snapshot Retention
- **Pre-*: Keep 7 days**
- **Scheduled: Keep 30 days**
- **Manual: Keep 90 days**

---

## Integrity Validation

```typescript
// manifest-registry/src/validator.ts

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: 'warning';
}

// Validation rules:
// 1. Checksum must match content
// 2. All referenced endpoints must be reachable
// 3. No circular twin references
// 4. All worker policies must be valid
// 5. All department IDs must be registered
// 6. All extension IDs must be registered
```

---

## Example Usage

```typescript
import { ManifestRegistry } from './registry';
import { CompanyManifest } from './types';

const registry = new ManifestRegistry();

// Create manifest after successful composition
const manifest: CompanyManifest = {
  version: '1.0.0',
  companyId: 'rez_restaurant_001',
  // ... full manifest
};

await registry.create(manifest);

// Get manifest
const current = await registry.get('rez_restaurant_001');

// Update manifest
await registry.update('rez_restaurant_001', {
  composition: {
    ...current.composition,
    aiWorkers: [
      ...current.composition.aiWorkers,
      { id: 'ai_hr_manager', ... }
    ]
  }
});

// Snapshot before major change
const snapshot = await registry.snapshot('rez_restaurant_001', 'pre_migration');

// Restore if something goes wrong
await registry.restore('rez_restaurant_001', snapshot.id);
```

---

## Dependencies

```json
{
  "js-yaml": "^4.1.0",
  "sha256-file": "^1.0.0"
}
```

---

## Port

- **Manifest Registry:** Internal module (not a separate service)
- **Storage:** File-based (`manifests/` directory) or PostgreSQL

---

## Test Cases

```typescript
// __tests__/registry.test.ts

describe('ManifestRegistry', () => {
  
  it('should create and retrieve a manifest', async () => {
    const registry = new ManifestRegistry();
    const manifest = createTestManifest();
    
    await registry.create(manifest);
    const retrieved = await registry.get(manifest.companyId);
    
    expect(retrieved.companyId).toBe(manifest.companyId);
    expect(retrieved.version).toBe('1.0.0');
  });
  
  it('should create new version on update', async () => {
    await registry.update('test', { name: 'Updated Name' });
    const current = await registry.get('test');
    
    expect(current.version).toBe('1.0.1'); // Minor bump
    expect(current.name).toBe('Updated Name');
    
    const history = await registry.getVersionHistory('test');
    expect(history).toHaveLength(2);
  });
  
  it('should validate checksum', async () => {
    // Tamper with manifest file
    const result = await registry.validate('test');
    expect(result.valid).toBe(true);
    
    // Tamper and re-validate
    await tamperManifestFile('test');
    const tamperedResult = await registry.validate('test');
    expect(tamperedResult.valid).toBe(false);
    expect(tamperedResult.errors).toContainEqual(
      expect.objectContaining({ field: 'checksum' })
    );
  });
  
  it('should snapshot and restore', async () => {
    const snapshot = await registry.snapshot('test', 'pre_update');
    await registry.update('test', { name: 'Changed' });
    
    const after = await registry.get('test');
    expect(after.name).toBe('Changed');
    
    await registry.restore('test', snapshot.id);
    const restored = await registry.get('test');
    expect(restored.name).toBe('Original Name');
  });
});
```