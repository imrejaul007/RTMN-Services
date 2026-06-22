/**
 * RTMN TwinOS - Base Twin Service
 * Provides common functionality for all twin services
 */

import { v4 as uuidv4 } from 'uuid';
import { TWIN_STATUS, HEALTH_STATUS, PAGINATION } from '../constants/twins.js';

/**
 * Create a base twin service with common CRUD operations
 */
export function createBaseTwinService(options = {}) {
  const {
    name = 'twin',
    storage = new Map(),
    idPrefix = 'twin',
    indexes = [],
    hooks = {}
  } = options;

  // Private state
  const _storage = storage;
  const _indexes = indexes;

  /**
   * Create a new twin
   */
  async function create(data) {
    const id = data.id || `${idPrefix}-${uuidv4().slice(0, 8)}`;
    const now = new Date().toISOString();

    const twin = {
      id,
      ...data,
      status: data.status || TWIN_STATUS.ACTIVE,
      health: data.health || HEALTH_STATUS.UNKNOWN,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy || null,
      metadata: data.metadata || {}
    };

    _storage.set(id, twin);

    // Update indexes
    await _updateIndexes(twin);

    // Run hooks
    if (hooks.afterCreate) {
      await hooks.afterCreate(twin);
    }

    return twin;
  }

  /**
   * Get twin by ID
   */
  async function getById(id) {
    const twin = _storage.get(id);

    if (hooks.afterRead && twin) {
      await hooks.afterRead(twin);
    }

    return twin || null;
  }

  /**
   * Find twins by query
   */
  async function find(query = {}, options = {}) {
    const { page = PAGINATION.DEFAULT_PAGE, limit = PAGINATION.DEFAULT_LIMIT } = options;
    const { sort, fields } = options;

    let results = Array.from(_storage.values());

    // Apply filters
    if (query.status) {
      results = results.filter(t => t.status === query.status);
    }
    if (query.search) {
      const search = query.search.toLowerCase();
      results = results.filter(t =>
        t.name?.toLowerCase().includes(search) ||
        t.id?.toLowerCase().includes(search)
      );
    }

    // Apply field filters
    if (fields) {
      const fieldList = fields.split(',');
      results = results.map(t => {
        const filtered = {};
        fieldList.forEach(f => {
          if (t[f] !== undefined) filtered[f] = t[f];
        });
        return { ...filtered, id: t.id };
      });
    }

    // Sort
    if (sort) {
      const [field, order] = sort.split(':');
      results.sort((a, b) => {
        if (order === 'asc') return a[field] > b[field] ? 1 : -1;
        return a[field] < b[field] ? 1 : -1;
      });
    }

    // Pagination
    const total = results.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const paginatedResults = results.slice(start, start + limit);

    return {
      data: paginatedResults,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Update twin
   */
  async function update(id, data) {
    const twin = _storage.get(id);
    if (!twin) return null;

    const now = new Date().toISOString();
    const updated = {
      ...twin,
      ...data,
      id: twin.id, // Preserve original ID
      version: twin.version + 1,
      updatedAt: now
    };

    _storage.set(id, updated);

    // Update indexes
    await _updateIndexes(updated);

    // Run hooks
    if (hooks.afterUpdate) {
      await hooks.afterUpdate(updated, twin);
    }

    return updated;
  }

  /**
   * Delete twin (soft delete by changing status)
   */
  async function remove(id, hard = false) {
    const twin = _storage.get(id);
    if (!twin) return false;

    if (hard) {
      _storage.delete(id);
    } else {
      _storage.set(id, {
        ...twin,
        status: TWIN_STATUS.ARCHIVED,
        deletedAt: new Date().toISOString()
      });
    }

    if (hooks.afterDelete) {
      await hooks.afterDelete(twin);
    }

    return true;
  }

  /**
   * Get all twins
   */
  async function getAll() {
    return Array.from(_storage.values());
  }

  /**
   * Count twins
   */
  async function count(query = {}) {
    const twins = Array.from(_storage.values());

    if (Object.keys(query).length === 0) {
      return twins.length;
    }

    return twins.filter(t => {
      for (const [key, value] of Object.entries(query)) {
        if (t[key] !== value) return false;
      }
      return true;
    }).length;
  }

  /**
   * Check if twin exists
   */
  async function exists(id) {
    return _storage.has(id);
  }

  /**
   * Bulk create
   */
  async function bulkCreate(items) {
    const results = [];
    for (const item of items) {
      results.push(await create(item));
    }
    return results;
  }

  /**
   * Bulk update
   */
  async function bulkUpdate(updates) {
    const results = [];
    for (const { id, data } of updates) {
      results.push(await update(id, data));
    }
    return results;
  }

  /**
   * Update indexes
   */
  async function _updateIndexes(twin) {
    for (const index of _indexes) {
      const { field, map } = index;
      if (twin[field]) {
        if (!map.has(twin[field])) {
          map.set(twin[field], new Set());
        }
        map.get(twin[field]).add(twin.id);
      }
    }
  }

  /**
   * Get service statistics
   */
  async function getStats() {
    const twins = Array.from(_storage.values());
    const byStatus = {};
    const byHealth = {};

    twins.forEach(t => {
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;
      byHealth[t.health] = (byHealth[t.health] || 0) + 1;
    });

    return {
      total: twins.length,
      byStatus,
      byHealth
    };
  }

  /**
   * Clear all data (use with caution)
   */
  async function clear() {
    _storage.clear();
    _indexes.forEach(index => index.map.clear());
  }

  return {
    name,
    create,
    getById,
    find,
    update,
    remove,
    getAll,
    count,
    exists,
    bulkCreate,
    bulkUpdate,
    getStats,
    clear,
    // Expose storage for advanced operations
    _storage
  };
}

export default { createBaseTwinService };
