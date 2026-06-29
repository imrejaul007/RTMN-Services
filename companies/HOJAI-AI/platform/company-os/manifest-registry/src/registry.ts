/**
 * Manifest Registry
 *
 * Persists and manages Company Manifests as YAML files.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import yaml from 'js-yaml';
import {
  CompanyManifest,
  CompanyComposition,
  ManifestSnapshot,
  ManifestVersion,
} from './types';

// ============================================
// Configuration
// ============================================

const MANIFESTS_DIR = process.env.MANIFESTS_DIR || './manifests';
const MAX_VERSIONS = 10;
const SNAPSHOT_RETENTION_DAYS = 90;

// ============================================
// Manifest Registry
// ============================================

export class ManifestRegistry {
  private manifestsDir: string;
  private indexPath: string;

  constructor(manifestsDir?: string) {
    this.manifestsDir = manifestsDir || MANIFESTS_DIR;
    this.indexPath = path.join(this.manifestsDir, 'registry.yaml');
    this.ensureDirectories();
  }

  /**
   * Ensure manifest directories exist
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.manifestsDir)) {
      fs.mkdirSync(this.manifestsDir, { recursive: true });
    }
  }

  /**
   * Get company manifest directory
   */
  private getCompanyDir(companyId: string): string {
    return path.join(this.manifestsDir, companyId);
  }

  /**
   * Get snapshots directory
   */
  private getSnapshotsDir(companyId: string): string {
    return path.join(this.getCompanyDir(companyId), 'snapshots');
  }

  /**
   * Create a new manifest
   */
  async create(manifest: CompanyManifest): Promise<void> {
    const companyDir = this.getCompanyDir(manifest.companyId);
    const snapshotsDir = this.getSnapshotsDir(manifest.companyId);

    // Ensure directories
    if (!fs.existsSync(companyDir)) {
      fs.mkdirSync(companyDir, { recursive: true });
    }
    if (!fs.existsSync(snapshotsDir)) {
      fs.mkdirSync(snapshotsDir, { recursive: true });
    }

    // Write current manifest
    const currentPath = path.join(companyDir, 'current.yaml');
    const manifestYaml = yaml.dump(manifest, { indent: 2 });
    fs.writeFileSync(currentPath, manifestYaml);

    // Write versioned manifest
    const versionedPath = path.join(companyDir, `v${manifest.version}.yaml`);
    fs.writeFileSync(versionedPath, manifestYaml);

    // Update index
    await this.updateIndex(manifest);

    console.log(`[ManifestRegistry] Created manifest for ${manifest.companyId}`);
  }

  /**
   * Get current manifest for a company
   */
  async get(companyId: string): Promise<CompanyManifest | null> {
    const currentPath = path.join(this.getCompanyDir(companyId), 'current.yaml');

    if (!fs.existsSync(currentPath)) {
      return null;
    }

    const content = fs.readFileSync(currentPath, 'utf-8');
    return yaml.load(content) as CompanyManifest;
  }

  /**
   * Update manifest (creates new version)
   */
  async update(companyId: string, updates: Partial<CompanyManifest>): Promise<CompanyManifest> {
    const current = await this.get(companyId);
    if (!current) {
      throw new Error(`Manifest not found: ${companyId}`);
    }

    // Create new version
    const newVersion = this.bumpVersion(current.version);
    const updated: CompanyManifest = {
      ...current,
      ...updates,
      version: newVersion,
      updatedAt: new Date().toISOString(),
      checksum: '', // Will be recalculated
    };

    // Recalculate checksum
    updated.checksum = this.calculateChecksum(updated);

    // Save
    await this.create(updated);

    return updated;
  }

  /**
   * Delete manifest and all versions
   */
  async delete(companyId: string): Promise<void> {
    const companyDir = this.getCompanyDir(companyId);

    if (fs.existsSync(companyDir)) {
      fs.rmSync(companyDir, { recursive: true, force: true });
    }

    // Update index
    await this.removeFromIndex(companyId);

    console.log(`[ManifestRegistry] Deleted manifest for ${companyId}`);
  }

  /**
   * Get specific version
   */
  async getVersion(companyId: string, version: string): Promise<CompanyManifest | null> {
    const versionedPath = path.join(this.getCompanyDir(companyId), `v${version}.yaml`);

    if (!fs.existsSync(versionedPath)) {
      return null;
    }

    const content = fs.readFileSync(versionedPath, 'utf-8');
    return yaml.load(content) as CompanyManifest;
  }

  /**
   * List version history
   */
  async getVersionHistory(companyId: string): Promise<ManifestVersion[]> {
    const companyDir = this.getCompanyDir(companyId);

    if (!fs.existsSync(companyDir)) {
      return [];
    }

    const files = fs.readdirSync(companyDir)
      .filter(f => f.startsWith('v') && f.endsWith('.yaml'))
      .sort()
      .reverse();

    return files.map(f => {
      const version = f.replace('v', '').replace('.yaml', '');
      const manifest = yaml.load(
        fs.readFileSync(path.join(companyDir, f), 'utf-8')
      ) as CompanyManifest;

      return {
        version,
        createdAt: manifest.updatedAt,
        changelog: `Updated to v${version}`,
      };
    });
  }

  /**
   * Create a point-in-time snapshot
   */
  async snapshot(companyId: string, reason: 'pre_update' | 'pre_migration' | 'manual' | 'scheduled'): Promise<ManifestSnapshot> {
    const manifest = await this.get(companyId);
    if (!manifest) {
      throw new Error(`Manifest not found: ${companyId}`);
    }

    const snapshotId = `snapshot_${Date.now()}`;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFilename = `${snapshotId}_${timestamp}.yaml`;
    const snapshotPath = path.join(this.getSnapshotsDir(companyId), snapshotFilename);

    const snapshot: ManifestSnapshot = {
      id: snapshotId,
      manifestId: companyId,
      createdAt: timestamp,
      reason,
      content: manifest,
      size: JSON.stringify(manifest).length,
    };

    fs.writeFileSync(snapshotPath, yaml.dump(snapshot, { indent: 2 }));

    console.log(`[ManifestRegistry] Created snapshot ${snapshotId} for ${companyId}`);

    return snapshot;
  }

  /**
   * Restore from snapshot
   */
  async restore(companyId: string, snapshotId: string): Promise<CompanyManifest> {
    const snapshotsDir = this.getSnapshotsDir(companyId);
    const snapshotFiles = fs.readdirSync(snapshotsDir)
      .filter(f => f.startsWith(`snapshot_${snapshotId}`))
      .filter(f => f.endsWith('.yaml'));

    if (snapshotFiles.length === 0) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }

    const snapshotPath = path.join(snapshotsDir, snapshotFiles[0]);
    const content = fs.readFileSync(snapshotPath, 'utf-8');
    const snapshot = yaml.load(content) as ManifestSnapshot;

    // Create new version from snapshot
    const restored = await this.create({
      ...snapshot.content,
      version: this.bumpVersion(snapshot.content.version),
      updatedAt: new Date().toISOString(),
    });

    console.log(`[ManifestRegistry] Restored ${companyId} from snapshot ${snapshotId}`);

    return restored;
  }

  /**
   * Validate manifest integrity
   */
  async validate(companyId: string): Promise<ValidationResult> {
    const manifest = await this.get(companyId);
    if (!manifest) {
      return {
        valid: false,
        errors: [{ field: 'manifest', message: 'Manifest not found', code: 'NOT_FOUND' }],
        warnings: [],
      };
    }

    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate checksum
    const calculatedChecksum = this.calculateChecksum(manifest);
    if (calculatedChecksum !== manifest.checksum) {
      errors.push({
        field: 'checksum',
        message: 'Checksum mismatch - manifest may have been tampered with',
        code: 'CHECKSUM_MISMATCH',
      });
    }

    // Validate required fields
    if (!manifest.companyId) {
      errors.push({ field: 'companyId', message: 'Missing company ID', code: 'MISSING_FIELD' });
    }
    if (!manifest.industry) {
      errors.push({ field: 'industry', message: 'Missing industry', code: 'MISSING_FIELD' });
    }

    // Validate composition
    if (!manifest.composition) {
      errors.push({ field: 'composition', message: 'Missing composition', code: 'MISSING_FIELD' });
    }

    // Warnings for potential issues
    if (manifest.composition.departments.length === 0) {
      warnings.push({ field: 'departments', message: 'No departments installed' });
    }
    if (manifest.composition.extensions.length === 0) {
      warnings.push({ field: 'extensions', message: 'No extensions installed' });
    }
    if (manifest.composition.aiWorkers.length === 0) {
      warnings.push({ field: 'aiWorkers', message: 'No AI workers deployed' });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * List all manifests (summary)
   */
  async list(options?: { industry?: string; limit?: number }): Promise<ManifestSummary[]> {
    const index = this.getIndex();

    let manifests = Object.values(index.companies) as ManifestSummary[];

    // Filter by industry
    if (options?.industry) {
      manifests = manifests.filter(m => m.industry === options.industry);
    }

    // Sort by updatedAt descending
    manifests.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // Apply limit
    if (options?.limit) {
      manifests = manifests.slice(0, options.limit);
    }

    return manifests;
  }

  /**
   * Check if manifest exists
   */
  async exists(companyId: string): Promise<boolean> {
    const currentPath = path.join(this.getCompanyDir(companyId), 'current.yaml');
    return fs.existsSync(currentPath);
  }

  /**
   * Get manifest statistics
   */
  async stats(): Promise<RegistryStats> {
    const index = this.getIndex();

    const industries: Record<string, number> = {};
    for (const manifest of Object.values(index.companies)) {
      const m = manifest as ManifestSummary;
      industries[m.industry] = (industries[m.industry] || 0) + 1;
    }

    return {
      totalCompanies: index.total,
      byIndustry: industries,
      totalSize: Object.values(index.companies).reduce((sum, m) => sum + (m as ManifestSummary).size, 0),
      updatedAt: index.updatedAt,
    };
  }

  // ============================================
  // Private Methods
  // ============================================

  private getIndex(): RegistryIndex {
    if (!fs.existsSync(this.indexPath)) {
      return { updatedAt: new Date().toISOString(), total: 0, companies: {} };
    }

    const content = fs.readFileSync(this.indexPath, 'utf-8');
    return yaml.load(content) as RegistryIndex;
  }

  private async updateIndex(manifest: CompanyManifest): Promise<void> {
    const index = this.getIndex();

    index.companies[manifest.companyId] = {
      companyId: manifest.companyId,
      name: manifest.name,
      industry: manifest.industry,
      version: manifest.version,
      updatedAt: manifest.updatedAt,
      size: JSON.stringify(manifest).length,
      checksum: manifest.checksum,
    };
    index.total = Object.keys(index.companies).length;
    index.updatedAt = new Date().toISOString();

    fs.writeFileSync(this.indexPath, yaml.dump(index, { indent: 2 }));
  }

  private async removeFromIndex(companyId: string): Promise<void> {
    const index = this.getIndex();
    delete index.companies[companyId];
    index.total = Object.keys(index.companies).length;
    index.updatedAt = new Date().toISOString();

    fs.writeFileSync(this.indexPath, yaml.dump(index, { indent: 2 }));
  }

  private bumpVersion(current: string): string {
    const [major, minor, patch] = current.split('.').map(Number);
    return `${major}.${minor}.${patch + 1}`;
  }

  private calculateChecksum(manifest: CompanyManifest): string {
    const { checksum: _, ...manifestWithoutChecksum } = manifest;
    const content = JSON.stringify(manifestWithoutChecksum);
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// ============================================
// Types for Registry
// ============================================

interface RegistryIndex {
  updatedAt: string;
  total: number;
  companies: Record<string, ManifestSummary>;
}

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
// Factory Function
// ============================================

export function createManifestRegistry(manifestsDir?: string): ManifestRegistry {
  return new ManifestRegistry(manifestsDir);
}