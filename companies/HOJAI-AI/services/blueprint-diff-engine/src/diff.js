/**
 * diff.js — Deep comparison utilities for blueprint diffs
 */

/**
 * Deep equality check
 */
export function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length) return false;

    return keysA.every(key => deepEqual(a[key], b[key]));
  }

  return false;
}

/**
 * Deep diff - returns list of changes between two objects
 */
export function deepDiff(oldObj, newObj, path = '') {
  const changes = [];

  // Handle null/undefined
  if (oldObj === newObj) return changes;
  if (oldObj == null) {
    changes.push({ path: path || 'root', type: 'added', oldValue: undefined, newValue: newObj });
    return changes;
  }
  if (newObj == null) {
    changes.push({ path: path || 'root', type: 'removed', oldValue: oldObj, newValue: undefined });
    return changes;
  }

  // Handle arrays
  if (Array.isArray(oldObj) && Array.isArray(newObj)) {
    // Compare array items
    const maxLen = Math.max(oldObj.length, newObj.length);
    for (let i = 0; i < maxLen; i++) {
      const itemPath = `${path}[${i}]`;
      if (i >= oldObj.length) {
        changes.push({ path: itemPath, type: 'added', oldValue: undefined, newValue: newObj[i] });
      } else if (i >= newObj.length) {
        changes.push({ path: itemPath, type: 'removed', oldValue: oldObj[i], newValue: undefined });
      } else {
        changes.push(...deepDiff(oldObj[i], newObj[i], itemPath));
      }
    }
    return changes;
  }

  // Handle objects
  if (typeof oldObj === 'object' && typeof newObj === 'object') {
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

    for (const key of allKeys) {
      const keyPath = path ? `${path}.${key}` : key;

      if (!(key in oldObj)) {
        changes.push({ path: keyPath, type: 'added', oldValue: undefined, newValue: newObj[key] });
      } else if (!(key in newObj)) {
        changes.push({ path: keyPath, type: 'removed', oldValue: oldObj[key], newValue: undefined });
      } else if (!deepEqual(oldObj[key], newObj[key])) {
        // Check if it's a primitive or nested object
        const isPrimitive = (v) => v === null || typeof v !== 'object' || Array.isArray(v);
        if (isPrimitive(oldObj[key]) && isPrimitive(newObj[key])) {
          changes.push({ path: keyPath, type: 'changed', oldValue: oldObj[key], newValue: newObj[key] });
        } else {
          changes.push(...deepDiff(oldObj[key], newObj[key], keyPath));
        }
      }
    }
    return changes;
  }

  // Primitive comparison
  if (oldObj !== newObj) {
    changes.push({ path: path || 'root', type: 'changed', oldValue: oldObj, newValue: newObj });
  }

  return changes;
}

/**
 * Get all changed keys from a diff
 */
export function changedKeys(diff) {
  return diff.map(change => change.path);
}

/**
 * Get changes at a specific path
 */
export function getChangesAtPath(diff, targetPath) {
  return diff.filter(change =>
    change.path === targetPath ||
    change.path.startsWith(targetPath + '.') ||
    change.path.startsWith(targetPath + '[')
  );
}

/**
 * Categorize changes by prefix
 */
export function categorizeChanges(diff) {
  const categories = {
    config: [],
    agents: [],
    integrations: [],
    workflows: [],
    ui: [],
    other: []
  };

  for (const change of diff) {
    if (change.path.startsWith('config')) {
      categories.config.push(change);
    } else if (change.path.startsWith('agents')) {
      categories.agents.push(change);
    } else if (change.path.startsWith('integrations')) {
      categories.integrations.push(change);
    } else if (change.path.startsWith('workflows')) {
      categories.workflows.push(change);
    } else if (change.path.startsWith('ui')) {
      categories.ui.push(change);
    } else {
      categories.other.push(change);
    }
  }

  return categories;
}

/**
 * Count changes by type
 */
export function countChanges(diff) {
  return {
    added: diff.filter(c => c.type === 'added').length,
    removed: diff.filter(c => c.type === 'removed').length,
    changed: diff.filter(c => c.type === 'changed').length,
    total: diff.length
  };
}
