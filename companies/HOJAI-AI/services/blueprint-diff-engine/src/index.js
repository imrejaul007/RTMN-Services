/**
 * Blueprint Diff Engine — Surgical updates for AI-native companies
 *
 * Instead of regenerating the entire project from scratch, the diff engine
 * computes the minimal set of changes needed to update an existing company.
 *
 * Key concepts:
 * - Deep comparison of old vs new blueprint
 * - Generate targeted patches, not full regeneration
 * - Track what's added, removed, or changed
 * - Preserve user customizations where possible
 */

import { deepEqual, deepDiff, changedKeys } from './diff.js';
import { generatePatch, generateFullRegeneration } from './patcher.js';
import { validateBlueprint } from './validator.js';
import { applyPatch } from './apply.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} DiffResult
 * @property {string} id - Unique diff ID
 * @property {string} blueprintId - Source blueprint ID
 * @property {Object} oldBlueprint - Previous blueprint state
 * @property {Object} newBlueprint - Target blueprint state
 * @property {Change[]} changes - List of changes
 * @property {Patch[]} patches - Computed patches
 * @property {string} mode - 'patch' or 'regenerate'
 * @property {number} changeCount - Number of changes
 * @property {string} generatedAt - ISO timestamp
 */

/**
 * @typedef {Object} Change
 * @property {string} path - JSON path to changed field
 * @property {'added'|'removed'|'changed'} type
 * @property {any} oldValue - Previous value
 * @property {any} newValue - New value
 */

/**
 * @typedef {Object} Patch
 * @property {string} path - File path to patch
 * @property {'add'|'remove'|'replace'|'merge'} operation
 * @property {string} description - Human-readable description
 * @property {Object} content - Patch content
 */

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Compute diff between two blueprints
 * @param {Object} oldBlueprint
 * @param {Object} newBlueprint
 * @returns {DiffResult}
 */
export function computeDiff(oldBlueprint, newBlueprint) {
  const id = generateId();
  const now = new Date().toISOString();

  // Validate both blueprints
  const oldErrors = validateBlueprint(oldBlueprint);
  const newErrors = validateBlueprint(newBlueprint);

  if (oldErrors.length > 0) {
    throw new Error(`Invalid old blueprint: ${oldErrors.join(', ')}`);
  }
  if (newErrors.length > 0) {
    throw new Error(`Invalid new blueprint: ${newErrors.join(', ')}`);
  }

  // Compute deep diff
  const changes = deepDiff(oldBlueprint, newBlueprint);

  // Determine if we need full regeneration or can use patches
  const mode = shouldRegenerate(changes) ? 'regenerate' : 'patch';

  // Generate patches
  const patches = mode === 'patch'
    ? generatePatch(oldBlueprint, newBlueprint, changes)
    : generateFullRegeneration(newBlueprint);

  return {
    id,
    blueprintId: newBlueprint.id || newBlueprint.config?.name || 'unknown',
    oldBlueprint: sanitizeForStorage(oldBlueprint),
    newBlueprint: sanitizeForStorage(newBlueprint),
    changes,
    patches,
    mode,
    changeCount: changes.length,
    generatedAt: now,
    summary: generateSummary(changes, mode)
  };
}

/**
 * Apply a diff to update a blueprint
 * @param {Object} currentBlueprint
 * @param {DiffResult} diff
 * @returns {Object} Updated blueprint
 */
export function applyDiff(currentBlueprint, diff) {
  if (!diff || !diff.patches) {
    throw new Error('Invalid diff: missing patches');
  }

  return applyPatch(currentBlueprint, diff.patches);
}

/**
 * Check if two blueprints are equal
 * @param {Object} a
 * @param {Object} b
 * @returns {boolean}
 */
export function areBlueprintsEqual(a, b) {
  return deepEqual(a, b);
}

/**
 * Get summary of changes
 * @param {DiffResult} diff
 * @returns {Object}
 */
export function getDiffSummary(diff) {
  return {
    id: diff.id,
    mode: diff.mode,
    changeCount: diff.changeCount,
    added: diff.changes.filter(c => c.type === 'added').length,
    removed: diff.changes.filter(c => c.type === 'removed').length,
    changed: diff.changes.filter(c => c.type === 'changed').length,
    summary: diff.summary
  };
}

// ---------------------------------------------------------------------------
// Internal Functions
// ---------------------------------------------------------------------------

/**
 * Determine if we need full regeneration vs patches
 */
function shouldRegenerate(changes) {
  // Full regeneration needed for:
  // - Changes to config.name (fundamentally changes the company)
  // - Structural changes to agents array
  // - Changes to foundation services

  const criticalPaths = [
    'config.name',
    'foundation',
    'agents[].role',
    'agents[].type'
  ];

  for (const change of changes) {
    for (const critical of criticalPaths) {
      if (matchesPath(change.path, critical)) {
        return true;
      }
    }
  }

  // If more than 50% of paths changed, regenerate
  const totalPaths = countPaths(changes[0]?.oldValue || {});
  return changes.length > totalPaths * 0.5;
}

function matchesPath(path, pattern) {
  // Simple pattern matching for paths like "agents[0].name"
  if (pattern.includes('[].')) {
    const basePattern = pattern.replace('[].', '.');
    return path.startsWith(basePattern.split('.')[0]);
  }
  return path === pattern || path.startsWith(pattern + '.');
}

function countPaths(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return 1;

  let count = 1;
  for (const key of Object.keys(obj)) {
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    count += countPaths(obj[key], newPrefix);
  }
  return count;
}

function generateSummary(changes, mode) {
  const added = changes.filter(c => c.type === 'added').length;
  const removed = changes.filter(c => c.type === 'removed').length;
  const changed = changes.filter(c => c.type === 'changed').length;

  if (mode === 'regenerate') {
    return `Full regeneration required (${changes.length} changes)`;
  }

  return [
    added > 0 && `${added} addition${added > 1 ? 's' : ''}`,
    changed > 0 && `${changed} change${changed > 1 ? 's' : ''}`,
    removed > 0 && `${removed} removal${removed > 1 ? 's' : ''}`
  ].filter(Boolean).join(', ');
}

function sanitizeForStorage(blueprint) {
  // Remove any sensitive or large fields before storing
  const sanitized = { ...blueprint };
  delete sanitized._internal;
  delete sanitized._raw;
  return sanitized;
}

function generateId() {
  return 'diff_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ---------------------------------------------------------------------------
// HTTP Server
// ---------------------------------------------------------------------------

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = parseInt(process.env.PORT || '4147', 10);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Health
app.get('/health', (_req, res) => {
  res.json({
    service: 'blueprint-diff-engine',
    version: '1.0.0',
    port: PORT,
    status: 'ok'
  });
});

app.get('/ready', (_req, res) => res.json({ ready: true }));

// Info
app.get('/api/v1/info', (_req, res) => {
  res.json({
    service: 'blueprint-diff-engine',
    version: '1.0.0',
    description: 'Surgical blueprint updates - computes minimal patches',
    endpoints: [
      'POST /api/v1/diff - Compute diff between two blueprints',
      'POST /api/v1/apply - Apply diff to update blueprint',
      'GET /api/v1/diff/:id - Get stored diff',
      'GET /api/v1/equal - Check if two blueprints are equal'
    ]
  });
});

// Compute diff
app.post('/api/v1/diff', (req, res) => {
  try {
    const { oldBlueprint, newBlueprint } = req.body;

    if (!oldBlueprint || !newBlueprint) {
      return res.status(400).json({
        error: 'validation',
        details: ['oldBlueprint and newBlueprint are required']
      });
    }

    const diff = computeDiff(oldBlueprint, newBlueprint);
    res.json(diff);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Apply diff
app.post('/api/v1/apply', (req, res) => {
  try {
    const { blueprint, diff } = req.body;

    if (!blueprint || !diff) {
      return res.status(400).json({
        error: 'validation',
        details: ['blueprint and diff are required']
      });
    }

    const updated = applyDiff(blueprint, diff);
    res.json({ success: true, blueprint: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Check equality
app.post('/api/v1/equal', (req, res) => {
  try {
    const { blueprintA, blueprintB } = req.body;

    if (!blueprintA || !blueprintB) {
      return res.status(400).json({
        error: 'validation',
        details: ['blueprintA and blueprintB are required']
      });
    }

    const equal = areBlueprintsEqual(blueprintA, blueprintB);
    res.json({ equal });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Stats
app.get('/api/v1/stats', (_req, res) => {
  res.json({
    service: 'blueprint-diff-engine',
    version: '1.0.0',
    capabilities: [
      'Deep blueprint comparison',
      'Surgical patch generation',
      'Full regeneration when needed',
      'Change tracking and summaries'
    ]
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`blueprint-diff-engine listening on :${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => process.exit(0));
});

export { app };
