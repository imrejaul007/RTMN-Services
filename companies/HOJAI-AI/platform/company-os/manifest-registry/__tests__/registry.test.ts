/**
 * Manifest Registry Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { ManifestRegistry } from '../src/registry';
import { CompanyManifest } from '../src/types';

// ============================================
// Test Utilities
// ============================================

const TEST_DIR = '/tmp/company-os-test-manifests';

function createTestManifest(overrides = {}): CompanyManifest {
  return {
    version: '1.0.0',
    companyId: 'test_company_001',
    name: 'Test Company',
    industry: 'restaurant',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    composition: {
      departments: [{ id: 'finance', packVersion: '1.0.0', endpoint: 'http://localhost:4801', installedAt: new Date().toISOString(), config: {} }],
      extensions: [{ id: 'pos', industry: 'restaurant', version: '1.0.0', endpoints: [], installedAt: new Date().toISOString(), config: {} }],
      aiWorkers: [{ id: 'ai-cfo', type: 'ai-cfo', department: 'finance', version: '1.0.0', status: 'active', deployedAt: new Date().toISOString(), policies: [] }],
    },
    twins: {
      companyTwin: { id: 'twin_company_test', type: 'company', service: 'twinos-hub', endpoint: 'http://localhost:4705' },
      departmentTwins: [],
      extensionTwins: [],
      workerTwins: [],
    },
    metadata: {
      createdBy: 'test',
      environment: 'test',
      region: 'ap-south-1',
      tags: ['test'],
    },
    checksum: '',
    ...overrides,
  } as CompanyManifest;
}

// ============================================
// Manifest Registry Tests
// ============================================

describe('ManifestRegistry', () => {
  let registry: ManifestRegistry;

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
    registry = new ManifestRegistry(TEST_DIR);
  });

  afterEach(() => {
    // Clean up after tests
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true });
    }
  });

  describe('create()', () => {
    it('should create a manifest file', async () => {
      const manifest = createTestManifest();

      await registry.create(manifest);

      const companyDir = path.join(TEST_DIR, 'test_company_001');
      const currentPath = path.join(companyDir, 'current.yaml');
      expect(fs.existsSync(currentPath)).toBe(true);
    });

    it('should create versioned manifest', async () => {
      const manifest = createTestManifest();

      await registry.create(manifest);

      const versionedPath = path.join(TEST_DIR, 'test_company_001', 'v1.0.0.yaml');
      expect(fs.existsSync(versionedPath)).toBe(true);
    });

    it('should update registry index', async () => {
      const manifest = createTestManifest();

      await registry.create(manifest);

      const indexPath = path.join(TEST_DIR, 'registry.yaml');
      expect(fs.existsSync(indexPath)).toBe(true);

      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('test_company_001');
    });

    it('should calculate checksum on create', async () => {
      const manifest = createTestManifest();
      manifest.checksum = 'temp'; // Will be recalculated

      await registry.create(manifest);

      const saved = await registry.get('test_company_001');
      expect(saved?.checksum).toBeDefined();
      expect(saved?.checksum).not.toBe('temp');
    });
  });

  describe('get()', () => {
    it('should retrieve created manifest', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);

      const retrieved = await registry.get('test_company_001');

      expect(retrieved).toBeDefined();
      expect(retrieved?.companyId).toBe('test_company_001');
      expect(retrieved?.name).toBe('Test Company');
      expect(retrieved?.industry).toBe('restaurant');
    });

    it('should return null for non-existent manifest', async () => {
      const retrieved = await registry.get('non_existent');

      expect(retrieved).toBeNull();
    });
  });

  describe('update()', () => {
    it('should create new version on update', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);

      const updated = await registry.update('test_company_001', { name: 'Updated Company' });

      expect(updated.name).toBe('Updated Company');
      expect(updated.version).toBe('1.0.1'); // Version bumped

      // Both versions should exist
      const v1 = await registry.getVersion('test_company_001', '1.0.0');
      const v2 = await registry.getVersion('test_company_001', '1.0.1');
      expect(v1?.name).toBe('Test Company');
      expect(v2?.name).toBe('Updated Company');
    });

    it('should throw for non-existent manifest', async () => {
      await expect(registry.update('non_existent', { name: 'Test' })).rejects.toThrow('Manifest not found');
    });
  });

  describe('delete()', () => {
    it('should delete manifest and all versions', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);
      await registry.update('test_company_001', { name: 'Updated' });

      await registry.delete('test_company_001');

      const retrieved = await registry.get('test_company_001');
      expect(retrieved).toBeNull();
    });
  });

  describe('getVersion()', () => {
    it('should retrieve specific version', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);
      await registry.update('test_company_001', { name: 'Updated' });

      const v1 = await registry.getVersion('test_company_001', '1.0.0');
      expect(v1?.name).toBe('Test Company');

      const v2 = await registry.getVersion('test_company_001', '1.0.1');
      expect(v2?.name).toBe('Updated');
    });

    it('should return null for non-existent version', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);

      const v99 = await registry.getVersion('test_company_001', '99.0.0');
      expect(v99).toBeNull();
    });
  });

  describe('getVersionHistory()', () => {
    it('should return version history', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);
      await registry.update('test_company_001', { name: 'V2' });
      await registry.update('test_company_001', { name: 'V3' });

      const history = await registry.getVersionHistory('test_company_001');

      expect(history.length).toBe(3);
      expect(history[0].version).toBe('1.0.2');
      expect(history[1].version).toBe('1.0.1');
      expect(history[2].version).toBe('1.0.0');
    });
  });

  describe('snapshot()', () => {
    it('should create snapshot', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);

      const snapshot = await registry.snapshot('test_company_001', 'manual');

      expect(snapshot.id).toContain('snapshot_');
      expect(snapshot.manifestId).toBe('test_company_001');
      expect(snapshot.reason).toBe('manual');
      expect(snapshot.content).toBeDefined();
    });

    it('should throw for non-existent manifest', async () => {
      await expect(registry.snapshot('non_existent', 'manual')).rejects.toThrow('Manifest not found');
    });
  });

  describe('restore()', () => {
    it('should restore from snapshot', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);
      await registry.update('test_company_001', { name: 'Updated Name' });

      // Snapshot captures current state (v1.0.1 with 'Updated Name')
      const snapshot = await registry.snapshot('test_company_001', 'manual');

      // Restore should create a new version (v1.0.2) from snapshot content
      const restored = await registry.restore('test_company_001', snapshot.id.split('_')[1]);

      // The restored manifest should have the snapshot content with a new version
      expect(restored.name).toBe('Updated Name'); // Snapshot content
      expect(restored.version).toBe('1.0.2'); // New version from restore
    });
  });

  describe('validate()', () => {
    it('should validate valid manifest', async () => {
      const manifest = createTestManifest();
      manifest.checksum = ''; // Will be recalculated
      await registry.create(manifest);

      const result = await registry.validate('test_company_001');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect checksum mismatch', async () => {
      const manifest = createTestManifest();
      await registry.create(manifest);

      // Tamper with manifest
      const manifestPath = path.join(TEST_DIR, 'test_company_001', 'current.yaml');
      let content = fs.readFileSync(manifestPath, 'utf-8');
      content = content.replace('Test Company', 'Tampered Company');
      fs.writeFileSync(manifestPath, content);

      const result = await registry.validate('test_company_001');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CHECKSUM_MISMATCH')).toBe(true);
    });

    it('should warn about empty composition', async () => {
      const manifest = createTestManifest({
        composition: {
          departments: [],
          extensions: [],
          aiWorkers: [],
        },
      });
      await registry.create(manifest);

      const result = await registry.validate('test_company_001');

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('list()', () => {
    it('should list all manifests', async () => {
      await registry.create(createTestManifest({ companyId: 'company_1', name: 'Company 1' }));
      await registry.create(createTestManifest({ companyId: 'company_2', name: 'Company 2' }));

      const list = await registry.list();

      expect(list.length).toBe(2);
    });

    it('should filter by industry', async () => {
      await registry.create(createTestManifest({ companyId: 'company_1', industry: 'restaurant' }));
      await registry.create(createTestManifest({ companyId: 'company_2', industry: 'beauty' }));

      const restaurantList = await registry.list({ industry: 'restaurant' });

      expect(restaurantList.length).toBe(1);
      expect(restaurantList[0].industry).toBe('restaurant');
    });

    it('should apply limit', async () => {
      await registry.create(createTestManifest({ companyId: 'company_1' }));
      await registry.create(createTestManifest({ companyId: 'company_2' }));

      const list = await registry.list({ limit: 1 });

      expect(list.length).toBe(1);
    });
  });

  describe('exists()', () => {
    it('should return true for existing manifest', async () => {
      await registry.create(createTestManifest());

      const exists = await registry.exists('test_company_001');

      expect(exists).toBe(true);
    });

    it('should return false for non-existent manifest', async () => {
      const exists = await registry.exists('non_existent');

      expect(exists).toBe(false);
    });
  });

  describe('stats()', () => {
    it('should return registry statistics', async () => {
      await registry.create(createTestManifest({ companyId: 'company_1', industry: 'restaurant' }));
      await registry.create(createTestManifest({ companyId: 'company_2', industry: 'restaurant' }));
      await registry.create(createTestManifest({ companyId: 'company_3', industry: 'beauty' }));

      const stats = await registry.stats();

      expect(stats.totalCompanies).toBe(3);
      expect(stats.byIndustry.restaurant).toBe(2);
      expect(stats.byIndustry.beauty).toBe(1);
    });
  });
});