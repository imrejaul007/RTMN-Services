/**
 * HOJAI Cloud v1.2 — Rollback Manager
 *
 * Maintains deployment history and enables one-click rollbacks.
 * Each deployment creates a snapshot that can be restored.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Rollback storage
const ROLLBACK_DIR = process.env.HOJAI_CLOUD_ROLLBACK_DIR || path.join(__dirname, '..', '.rollbacks');

/**
 * Snapshot record
 */
class SnapshotRecord {
  constructor({ deploymentId, projectId, projectName, files, manifest, status, createdAt }) {
    this.id = uuidv4();
    this.deploymentId = deploymentId;
    this.projectId = projectId;
    this.projectName = projectName;
    this.files = files || null; // Can be null for metadata-only snapshots
    this.manifest = manifest;
    this.status = status || 'live';
    this.createdAt = createdAt || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      deploymentId: this.deploymentId,
      projectId: this.projectId,
      projectName: this.projectName,
      manifest: this.manifest,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

// In-memory snapshot registry
const snapshots = new Map(); // snapshotId -> SnapshotRecord
const projectSnapshots = new Map(); // projectId -> snapshotId[]

/**
 * Initialize rollback storage
 */
function init() {
  if (!fs.existsSync(ROLLBACK_DIR)) {
    fs.mkdirSync(ROLLBACK_DIR, { recursive: true });
  }

  // Load existing snapshots
  const metaPath = path.join(ROLLBACK_DIR, 'snapshots.json');
  if (fs.existsSync(metaPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      for (const s of data) {
        snapshots.set(s.id, new SnapshotRecord(s));
        const projectId = s.projectId;
        if (!projectSnapshots.has(projectId)) {
          projectSnapshots.set(projectId, []);
        }
        projectSnapshots.get(projectId).push(s.id);
      }
      console.log(`[hojai-cloud] loaded ${snapshots.size} snapshot(s)`);
    } catch (err) {
      console.error(`[hojai-cloud] failed to load snapshots: ${err.message}`);
    }
  }
}

/**
 * Save snapshots to disk
 */
function saveSnapshots() {
  const metaPath = path.join(ROLLBACK_DIR, 'snapshots.json');
  const data = Array.from(snapshots.values()).map(s => s.toJSON());
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

/**
 * Create a snapshot before deployment
 * This is called automatically before a new deployment
 */
function createSnapshot({ deploymentId, projectId, projectName, files, manifest }) {
  const snapshot = new SnapshotRecord({
    deploymentId,
    projectId,
    projectName,
    files, // Can be null to save disk space
    manifest
  });

  snapshots.set(snapshot.id, snapshot);

  // Track by project
  if (!projectSnapshots.has(projectId)) {
    projectSnapshots.set(projectId, []);
  }
  projectSnapshots.get(projectId).push(snapshot.id);

  saveSnapshots();

  console.log(`[hojai-cloud] snapshot created: ${snapshot.id} for project ${projectId}`);

  return snapshot;
}

/**
 * Get snapshot by ID
 */
function getSnapshot(id) {
  const snapshot = snapshots.get(id);
  return snapshot ? snapshot.toJSON() : null;
}

/**
 * Get snapshots for a project (most recent first)
 */
function getSnapshotsByProject(projectId, limit = 10) {
  const ids = projectSnapshots.get(projectId) || [];
  const result = [];

  // Get in reverse order (most recent first)
  for (let i = ids.length - 1; i >= 0 && result.length < limit; i--) {
    const snapshot = snapshots.get(ids[i]);
    if (snapshot) {
      result.push(snapshot.toJSON());
    }
  }

  return result;
}

/**
 * Get the current (most recent) snapshot for a project
 */
function getCurrentSnapshot(projectId) {
  const ids = projectSnapshots.get(projectId) || [];
  if (ids.length === 0) return null;

  const latestId = ids[ids.length - 1];
  const snapshot = snapshots.get(latestId);
  return snapshot ? snapshot.toJSON() : null;
}

/**
 * Get files for a snapshot
 */
async function getSnapshotFiles(snapshotId) {
  const snapshot = snapshots.get(snapshotId);
  if (!snapshot) return null;

  // If files are stored in memory, return them
  if (snapshot.files) {
    return snapshot.files;
  }

  // Otherwise, load from disk
  const snapshotDir = path.join(ROLLBACK_DIR, snapshotId);
  const filesPath = path.join(snapshotDir, 'files.json');

  if (fs.existsSync(filesPath)) {
    try {
      return JSON.parse(fs.readFileSync(filesPath, 'utf8'));
    } catch (err) {
      console.error(`[hojai-cloud] failed to load snapshot files: ${err.message}`);
      return null;
    }
  }

  return null;
}

/**
 * Rollback to a previous snapshot
 * Returns the files needed to redeploy
 */
async function rollbackTo(snapshotId) {
  const snapshot = snapshots.get(snapshotId);
  if (!snapshot) {
    throw new Error(`Snapshot not found: ${snapshotId}`);
  }

  const files = await getSnapshotFiles(snapshotId);

  console.log(`[hojai-cloud] rollback prepared for snapshot ${snapshotId}`);

  return {
    snapshot: snapshot.toJSON(),
    files
  };
}

/**
 * Delete old snapshots, keeping only the most recent N
 */
function pruneOldSnapshots(projectId, keep = 10) {
  const ids = projectSnapshots.get(projectId) || [];
  if (ids.length <= keep) return 0;

  // Sort by creation date (oldest first)
  const toDelete = ids
    .map(id => ({ id, snapshot: snapshots.get(id) }))
    .filter(s => s.snapshot)
    .sort((a, b) => new Date(a.snapshot.createdAt) - new Date(b.snapshot.createdAt))
    .slice(0, ids.length - keep);

  for (const { id } of toDelete) {
    // Delete files from disk if they exist
    const snapshotDir = path.join(ROLLBACK_DIR, id);
    if (fs.existsSync(snapshotDir)) {
      fs.rmSync(snapshotDir, { recursive: true, force: true });
    }

    snapshots.delete(id);
  }

  // Update project index
  projectSnapshots.set(projectId, ids.filter(id => snapshots.has(id)));

  saveSnapshots();

  console.log(`[hojai-cloud] pruned ${toDelete.length} old snapshot(s) for project ${projectId}`);

  return toDelete.length;
}

/**
 * List all snapshots
 */
function listSnapshots() {
  return Array.from(snapshots.values())
    .map(s => s.toJSON())
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get rollback history for a deployment
 */
function getRollbackHistory(deploymentId) {
  const result = [];
  for (const snapshot of snapshots.values()) {
    if (snapshot.deploymentId === deploymentId) {
      result.push(snapshot.toJSON());
    }
  }
  return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

module.exports = {
  init,
  createSnapshot,
  getSnapshot,
  getSnapshotsByProject,
  getCurrentSnapshot,
  getSnapshotFiles,
  rollbackTo,
  pruneOldSnapshots,
  listSnapshots,
  getRollbackHistory
};
