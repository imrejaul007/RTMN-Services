/**
 * Hojai Data Platform - Tenant Scoping Utilities
 * Version: 1.0 | Date: May 29, 2026
 * Purpose: Database query helpers with automatic tenant scoping
 */

import { Collection, Filter, UpdateFilter, WithId } from 'mongodb';

// ============================================
// TENANT SCOPING
// ============================================

/**
 * Add tenant_id to any filter
 */
export function scopeFilter<T extends { tenant_id?: string }>(
  filter: Filter<T>,
  tenantId: string
): Filter<T> {
  return {
    ...filter,
    tenant_id: tenantId
  } as Filter<T>;
}

/**
 * Add tenant_id to any update
 */
export function scopeUpdate<T extends { tenant_id?: string }>(
  update: UpdateFilter<T> | Partial<T>,
  tenantId: string
): UpdateFilter<T> | Partial<T> {
  if ('$set' in update) {
    return {
      ...update,
      $set: {
        ...update.$set,
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      }
    };
  }

  if ('$push' in update || '$addToSet' in update) {
    return {
      ...update,
      $set: {
        tenant_id: tenantId,
        updated_at: new Date().toISOString()
      }
    };
  }

  return {
    ...update as Partial<T>,
    tenant_id: tenantId,
    updated_at: new Date().toISOString()
  };
}

// ============================================
// QUERY BUILDERS
// ============================================

/**
 * Tenant-scoped query builder
 */
export class TenantQueryBuilder<T extends { tenant_id: string }> {
  private collection: Collection<T>;
  private tenantId: string;
  private filter: Filter<T> = {};
  private sortOptions?: Record<string, 1 | -1>;
  private limitValue?: number;
  private skipValue?: number;

  constructor(collection: Collection<T>, tenantId: string) {
    this.collection = collection;
    this.tenantId = tenantId;
    this.filter = { tenant_id: tenantId } as Filter<T>;
  }

  /**
   * Add filter conditions
   */
  where<K extends keyof T>(field: K, value: T[K]): this {
    this.filter = { ...this.filter, [field]: value } as Filter<T>;
    return this;
  }

  /**
   * Add filter with operator
   */
  whereGt<K extends keyof T>(field: K, value: number): this {
    this.filter = {
      ...this.filter,
      [field]: { $gt: value }
    } as Filter<T>;
    return this;
  }

  whereLt<K extends keyof T>(field: K, value: number): this {
    this.filter = {
      ...this.filter,
      [field]: { $lt: value }
    } as Filter<T>;
    return this;
  }

  whereIn<K extends keyof T>(field: K, values: T[K][]): this {
    this.filter = {
      ...this.filter,
      [field]: { $in: values }
    } as Filter<T>;
    return this;
  }

  whereExists<K extends keyof T>(field: K, exists: boolean): this {
    this.filter = {
      ...this.filter,
      [field]: { $exists: exists }
    } as Filter<T>;
    return this;
  }

  whereRegex<K extends keyof T>(field: K, pattern: string): this {
    this.filter = {
      ...this.filter,
      [field]: { $regex: pattern, $options: 'i' }
    } as Filter<T>;
    return this;
  }

  /**
   * Sort results
   */
  sort(field: keyof T, order: 'asc' | 'desc' = 'asc'): this {
    this.sortOptions = { [field]: order === 'asc' ? 1 : -1 } as Record<string, 1 | -1>;
    return this;
  }

  /**
   * Limit results
   */
  limit(count: number): this {
    this.limitValue = count;
    return this;
  }

  /**
   * Skip results
   */
  skip(count: number): this {
    this.skipValue = count;
    return this;
  }

  /**
   * Execute query - find one
   */
  async findOne(): Promise<T | null> {
    return this.collection.findOne(this.filter);
  }

  /**
   * Execute query - find many
   */
  async find(): Promise<T[]> {
    let cursor = this.collection.find(this.filter);

    if (this.sortOptions) {
      cursor = cursor.sort(this.sortOptions);
    }

    if (this.skipValue) {
      cursor = cursor.skip(this.skipValue);
    }

    if (this.limitValue) {
      cursor = cursor.limit(this.limitValue);
    }

    return cursor.toArray();
  }

  /**
   * Execute query - count
   */
  async count(): Promise<number> {
    return this.collection.countDocuments(this.filter);
  }

  /**
   * Execute query - delete
   */
  async delete(): Promise<number> {
    const result = await this.collection.deleteMany(this.filter);
    return result.deletedCount;
  }
}

// ============================================
// AGGREGATION HELPERS
// ============================================

/**
 * Add tenant scope to aggregation pipeline
 */
export function scopeAggregation<T extends { tenant_id: string }>(
  tenantId: string,
  pipeline: any[]
): any[] {
  return [
    { $match: { tenant_id: tenantId } },
    ...pipeline
  ];
}

/**
 * Common aggregation stages
 */
export const aggregationStages = {
  /**
   * Group by field
   */
  groupBy(field: string, operations: Record<string, any>) {
    return { $group: { _id: `$${field}`, ...operations } };
  },

  /**
   * Sort stage
   */
  sort(sort: Record<string, 1 | -1>) {
    return { $sort: sort };
  },

  /**
   * Limit stage
   */
  limit(count: number) {
    return { $limit: count };
  },

  /**
   * Skip stage
   */
  skip(count: number) {
    return { $skip: count };
  },

  /**
   * Lookup (join) with tenant scope
   */
  lookup(
    from: string,
    localField: string,
    foreignField: string,
    as: string,
    tenantId: string
  ) {
    return {
      $lookup: {
        from,
        let: { localField: `$${localField}` },
        pipeline: [
          {
            $match: {
              $expr: { $eq: [`$${foreignField}`, '$$localField'] },
              tenant_id: tenantId
            }
          }
        ],
        as
      }
    };
  },

  /**
   * Facet for multiple aggregations
   */
  facet(facets: Record<string, any[]>) {
    return { $facet: facets };
  }
};

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Validate tenant ID
 */
export function isValidTenantId(tenantId: string): boolean {
  // Alphanumeric, dashes, underscores
  // Length 3-50
  return /^[a-zA-Z0-9_-]{3,50}$/.test(tenantId);
}

/**
 * Validate tenant ID and throw if invalid
 */
export function validateTenantId(tenantId: string | undefined): string {
  if (!tenantId) {
    throw new Error('Tenant ID is required');
  }

  if (!isValidTenantId(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }

  return tenantId;
}

/**
 * Sanitize tenant ID (prevent injection)
 */
export function sanitizeTenantId(tenantId: string): string {
  // Remove any characters that aren't alphanumeric, dash, underscore
  return tenantId.replace(/[^a-zA-Z0-9_-]/g, '');
}

// ============================================
// AUDIT HELPERS
// ============================================

/**
 * Create audit log entry
 */
export interface AuditEntry {
  tenant_id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
}

/**
 * Create audit entry for data access
 */
export function auditAccess(
  tenantId: string,
  resourceType: string,
  resourceId: string,
  userId?: string
): AuditEntry {
  return {
    tenant_id: tenantId,
    user_id: userId,
    action: 'access',
    resource_type: resourceType,
    resource_id: resourceId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Create audit entry for data modification
 */
export function auditModify(
  tenantId: string,
  action: 'create' | 'update' | 'delete',
  resourceType: string,
  resourceId: string,
  changes: { before?: any; after?: any },
  userId?: string
): AuditEntry {
  return {
    tenant_id: tenantId,
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    changes,
    timestamp: new Date().toISOString()
  };
}

// ============================================
// EXPORTS
// ============================================

export {
  scopeFilter,
  scopeUpdate,
  TenantQueryBuilder
};

export default {
  scopeFilter,
  scopeUpdate,
  TenantQueryBuilder,
  scopeAggregation,
  aggregationStages,
  isValidTenantId,
  validateTenantId,
  sanitizeTenantId,
  auditAccess,
  auditModify
};
