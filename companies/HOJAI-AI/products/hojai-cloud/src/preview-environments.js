/**
 * HOJAI Cloud v1.2 — Preview Environments
 *
 * Creates preview deployments for pull requests and branches.
 * Each preview gets a unique URL based on the PR/branch name.
 */

const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Preview storage
const PREVIEW_DIR = process.env.HOJAI_CLOUD_PREVIEW_DIR || path.join(__dirname, '..', '.previews');

/**
 * Preview environment record
 */
class PreviewRecord {
  constructor({ name, branch, prNumber, deploymentId, projectId, url, port, status, createdAt }) {
    this.id = uuidv4();
    this.name = name; // slugified name
    this.branch = branch;
    this.prNumber = prNumber;
    this.deploymentId = deploymentId;
    this.projectId = projectId;
    this.url = url;
    this.port = port;
    this.status = status || 'provisioning';
    this.createdAt = createdAt || new Date().toISOString();
    this.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      branch: this.branch,
      prNumber: this.prNumber,
      deploymentId: this.deploymentId,
      projectId: this.projectId,
      url: this.url,
      port: this.port,
      status: this.status,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt
    };
  }
}

// In-memory preview registry
const previews = new Map(); // previewId -> PreviewRecord

/**
 * Initialize preview storage
 */
function init() {
  if (!fs.existsSync(PREVIEW_DIR)) {
    fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  }

  // Load existing previews
  const metaPath = path.join(PREVIEW_DIR, 'previews.json');
  if (fs.existsSync(metaPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      for (const p of data) {
        previews.set(p.id, new PreviewRecord(p));
      }
      console.log(`[hojai-cloud] loaded ${previews.size} preview(s)`);
    } catch (err) {
      console.error(`[hojai-cloud] failed to load previews: ${err.message}`);
    }
  }
}

/**
 * Save previews to disk
 */
function savePreviews() {
  const metaPath = path.join(PREVIEW_DIR, 'previews.json');
  const data = Array.from(previews.values()).map(p => p.toJSON());
  fs.writeFileSync(metaPath, JSON.stringify(data, null, 2));
}

/**
 * Generate preview URL
 */
function generatePreviewUrl(name, publicHost = 'hojai.app') {
  const slug = slugifyPreviewName(name);
  return `https://preview-${slug}.${publicHost}`;
}

/**
 * Slugify preview name
 */
function slugifyPreviewName(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

/**
 * Create a preview environment
 */
function createPreview({ name, branch, prNumber, deploymentId, projectId, port }) {
  const publicHost = process.env.HOJAI_PUBLIC_HOST || 'hojai.app';
  const slug = slugifyPreviewName(name || branch || `preview-${prNumber}`);

  // Check for existing preview with same name
  for (const p of previews.values()) {
    if (p.name === slug) {
      // Update existing preview
      p.deploymentId = deploymentId;
      p.projectId = projectId;
      p.port = port;
      p.status = 'active';
      p.updatedAt = new Date().toISOString();
      savePreviews();
      return p;
    }
  }

  const url = generatePreviewUrl(slug, publicHost);

  const preview = new PreviewRecord({
    name: slug,
    branch,
    prNumber,
    deploymentId,
    projectId,
    url,
    port,
    status: 'active'
  });

  previews.set(preview.id, preview);
  savePreviews();

  console.log(`[hojai-cloud] preview created: ${slug} -> ${url}`);

  return preview;
}

/**
 * Get preview by ID
 */
function getPreview(id) {
  const preview = previews.get(id);
  return preview ? preview.toJSON() : null;
}

/**
 * Get preview by name
 */
function getPreviewByName(name) {
  const slug = slugifyPreviewName(name);
  for (const preview of previews.values()) {
    if (preview.name === slug) {
      return preview.toJSON();
    }
  }
  return null;
}

/**
 * Get preview by PR number
 */
function getPreviewsByPR(prNumber) {
  const result = [];
  for (const preview of previews.values()) {
    if (preview.prNumber === prNumber) {
      result.push(preview.toJSON());
    }
  }
  return result;
}

/**
 * List all previews
 */
function listPreviews() {
  return Array.from(previews.values()).map(p => p.toJSON());
}

/**
 * List previews by project
 */
function listPreviewsByProject(projectId) {
  const result = [];
  for (const preview of previews.values()) {
    if (preview.projectId === projectId) {
      result.push(preview.toJSON());
    }
  }
  return result;
}

/**
 * Delete a preview
 */
function deletePreview(id) {
  const deleted = previews.delete(id);
  if (deleted) {
    savePreviews();
    console.log(`[hojai-cloud] preview deleted: ${id}`);
  }
  return deleted;
}

/**
 * Delete previews for a PR
 */
function deletePreviewsByPR(prNumber) {
  const toDelete = [];
  for (const preview of previews.values()) {
    if (preview.prNumber === prNumber) {
      toDelete.push(preview.id);
    }
  }
  for (const id of toDelete) {
    previews.delete(id);
  }
  if (toDelete.length > 0) {
    savePreviews();
    console.log(`[hojai-cloud] deleted ${toDelete.length} preview(s) for PR #${prNumber}`);
  }
  return toDelete.length;
}

/**
 * Clean up expired previews
 */
function cleanupExpired() {
  const now = new Date();
  const toDelete = [];

  for (const preview of previews.values()) {
    if (new Date(preview.expiresAt) < now) {
      toDelete.push(preview.id);
    }
  }

  for (const id of toDelete) {
    previews.delete(id);
  }

  if (toDelete.length > 0) {
    savePreviews();
    console.log(`[hojai-cloud] cleaned up ${toDelete.length} expired preview(s)`);
  }

  return toDelete.length;
}

/**
 * Extend preview expiry
 */
function extendPreview(id, days = 7) {
  const preview = previews.get(id);
  if (!preview) return null;

  preview.expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  savePreviews();

  return preview.toJSON();
}

module.exports = {
  init,
  createPreview,
  getPreview,
  getPreviewByName,
  getPreviewsByPR,
  listPreviews,
  listPreviewsByProject,
  deletePreview,
  deletePreviewsByPR,
  cleanupExpired,
  extendPreview,
  generatePreviewUrl,
  slugifyPreviewName
};
