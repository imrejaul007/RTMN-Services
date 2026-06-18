/**
 * Conflict Resolver Service - Resolves data conflicts during synchronization
 */

import {
  ConflictStrategy,
  ConflictRecord,
  ConflictResolution,
  generateChecksum
} from '../models/Sync';

interface ConflictContext {
  source: string;
  target: string;
  entityType: string;
  entityId: string;
}

interface FieldMetadata {
  name: string;
  priority: number;
  mergeStrategy: 'source' | 'target' | 'latest' | 'merge' | 'array-merge';
}

const FIELD_METADATA: Map<string, FieldMetadata[]> = new Map([
  ['lead', [
    { name: 'name', priority: 1, mergeStrategy: 'merge' },
    { name: 'email', priority: 1, mergeStrategy: 'source' },
    { name: 'phone', priority: 1, mergeStrategy: 'merge' },
    { name: 'company', priority: 2, mergeStrategy: 'latest' },
    { name: 'status', priority: 1, mergeStrategy: 'source' },
    { name: 'assignedTo', priority: 2, mergeStrategy: 'latest' },
    { name: 'value', priority: 1, mergeStrategy: 'latest' }
  ]],
  ['opportunity', [
    { name: 'name', priority: 1, mergeStrategy: 'merge' },
    { name: 'stage', priority: 1, mergeStrategy: 'source' },
    { name: 'value', priority: 1, mergeStrategy: 'latest' },
    { name: 'probability', priority: 2, mergeStrategy: 'latest' },
    { name: 'expectedCloseDate', priority: 2, mergeStrategy: 'latest' }
  ]],
  ['customer', [
    { name: 'name', priority: 1, mergeStrategy: 'merge' },
    { name: 'email', priority: 1, mergeStrategy: 'source' },
    { name: 'phone', priority: 1, mergeStrategy: 'merge' },
    { name: 'company', priority: 2, mergeStrategy: 'latest' },
    { name: 'address', priority: 2, mergeStrategy: 'latest' }
  ]],
  ['sale', [
    { name: 'items', priority: 1, mergeStrategy: 'array-merge' },
    { name: 'total', priority: 1, mergeStrategy: 'latest' },
    { name: 'status', priority: 1, mergeStrategy: 'source' },
    { name: 'paymentStatus', priority: 2, mergeStrategy: 'latest' }
  ]]
]);

export class ConflictResolver {
  private logger: any;
  private conflicts: Map<string, ConflictRecord>;
  private strategy: ConflictStrategy;
  private manualResolutionQueue: ConflictRecord[];

  constructor(logger: any) {
    this.logger = logger;
    this.conflicts = new Map();
    this.strategy = (process.env.CONFLICT_STRATEGY as ConflictStrategy) || 'last-write-wins';
    this.manualResolutionQueue = [];
  }

  /**
   * Set the default conflict resolution strategy
   */
  setStrategy(strategy: ConflictStrategy): void {
    this.strategy = strategy;
    this.logger.info(`Conflict resolution strategy set to: ${strategy}`);
  }

  /**
   * Resolve a conflict between two data sets
   */
  async resolve(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
    context: ConflictContext
  ): Promise<ConflictResolution> {
    const conflictId = this.generateConflictId(context);

    // Detect conflicting fields
    const conflictFields = this.detectConflicts(sourceData, targetData);

    this.logger.info('Conflict detected', {
      conflictId,
      context,
      conflictFields
    });

    // Create conflict record
    const conflictRecord: ConflictRecord = {
      id: conflictId,
      syncRecordId: context.entityId,
      sourceData,
      targetData,
      conflictFields,
      detectedAt: new Date(),
      resolvedAt: null,
      resolution: null,
      resolvedData: null,
      resolvedBy: null
    };

    this.conflicts.set(conflictId, conflictRecord);

    // Auto-resolve based on strategy
    if (this.strategy === 'manual') {
      this.manualResolutionQueue.push(conflictRecord);
      return {
        resolved: false,
        strategy: 'manual',
        conflictId,
        requiresManualResolution: true,
        conflictRecord
      };
    }

    // Perform automatic resolution
    const resolvedData = await this.performResolution(
      sourceData,
      targetData,
      context.entityType,
      this.strategy
    );

    // Update conflict record
    conflictRecord.resolvedAt = new Date();
    conflictRecord.resolution = this.strategy;
    conflictRecord.resolvedData = resolvedData;
    conflictRecord.resolvedBy = 'system';

    this.logger.info('Conflict resolved', {
      conflictId,
      strategy: this.strategy,
      resolvedFields: Object.keys(resolvedData)
    });

    return {
      resolved: true,
      strategy: this.strategy,
      conflictId,
      resolvedData
    };
  }

  /**
   * Detect which fields are in conflict
   */
  private detectConflicts(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>
  ): string[] {
    const conflicts: string[] = [];
    const allKeys = new Set([...Object.keys(sourceData), ...Object.keys(targetData)]);

    for (const key of allKeys) {
      const sourceValue = sourceData[key];
      const targetValue = targetData[key];

      if (JSON.stringify(sourceValue) !== JSON.stringify(targetValue)) {
        conflicts.push(key);
      }
    }

    return conflicts;
  }

  /**
   * Perform automatic resolution based on strategy
   */
  private async performResolution(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
    entityType: string,
    strategy: ConflictStrategy
  ): Promise<Record<string, unknown>> {
    switch (strategy) {
      case 'last-write-wins':
        return this.lastWriteWins(sourceData, targetData);

      case 'source-wins':
        return { ...targetData, ...sourceData };

      case 'target-wins':
        return { ...sourceData, ...targetData };

      case 'smart-merge':
        return this.smartMerge(sourceData, targetData, entityType);

      default:
        return this.lastWriteWins(sourceData, targetData);
    }
  }

  /**
   * Last write wins resolution
   */
  private lastWriteWins(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>
  ): Record<string, unknown> {
    const sourceTimestamp = (sourceData.updatedAt as Date) || new Date(0);
    const targetTimestamp = (targetData.updatedAt as Date) || new Date(0);

    return sourceTimestamp > targetTimestamp
      ? { ...targetData, ...sourceData }
      : { ...sourceData, ...targetData };
  }

  /**
   * Smart merge using field metadata
   */
  private smartMerge(
    sourceData: Record<string, unknown>,
    targetData: Record<string, unknown>,
    entityType: string
  ): Record<string, unknown> {
    const merged: Record<string, unknown> = { ...targetData };
    const fields = FIELD_METADATA.get(entityType) || [];

    for (const field of fields) {
      const sourceValue = sourceData[field.name];
      const targetValue = targetData[field.name];

      switch (field.mergeStrategy) {
        case 'source':
          merged[field.name] = sourceValue ?? targetValue;
          break;

        case 'target':
          merged[field.name] = targetValue ?? sourceValue;
          break;

        case 'latest':
          merged[field.name] = this.resolveLatest(sourceValue, targetValue);
          break;

        case 'merge':
          merged[field.name] = this.mergeStrings(sourceValue, targetValue);
          break;

        case 'array-merge':
          merged[field.name] = this.mergeArrays(sourceValue, targetValue);
          break;

        default:
          merged[field.name] = sourceValue ?? targetValue;
      }
    }

    // Copy any fields not in metadata
    for (const key of Object.keys(sourceData)) {
      if (!(key in merged)) {
        merged[key] = sourceData[key];
      }
    }

    return merged;
  }

  /**
   * Resolve latest value (for dates, numbers, etc.)
   */
  private resolveLatest(a: unknown, b: unknown): unknown {
    if (a === null || a === undefined) return b;
    if (b === null || b === undefined) return a;

    // Compare timestamps
    const aDate = new Date(a as string).getTime();
    const bDate = new Date(b as string).getTime();

    if (!isNaN(aDate) && !isNaN(bDate)) {
      return aDate > bDate ? a : b;
    }

    // Compare numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return Math.max(a, b);
    }

    // Default to source value
    return a;
  }

  /**
   * Merge string values
   */
  private mergeStrings(a: unknown, b: unknown): unknown {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return a ?? b;
    }

    // Use the longer string as it likely has more information
    return a.length >= b.length ? a : b;
  }

  /**
   * Merge arrays (e.g., for sale items)
   */
  private mergeArrays(a: unknown, b: unknown): unknown {
    if (!Array.isArray(a) && !Array.isArray(b)) return a ?? b;
    if (!Array.isArray(a)) return b;
    if (!Array.isArray(b)) return a;

    // Merge and deduplicate by ID
    const map = new Map();

    for (const item of b) {
      const id = (item as any).id;
      if (id) map.set(id, item);
    }

    for (const item of a) {
      const id = (item as any).id;
      if (id) {
        // Use newer item
        const existing = map.get(id);
        if (!existing) {
          map.set(id, item);
        } else {
          const existingDate = new Date((existing as any).updatedAt || 0).getTime();
          const itemDate = new Date((item as any).updatedAt || 0).getTime();
          if (itemDate > existingDate) {
            map.set(id, item);
          }
        }
      } else {
        map.set(map.size, item);
      }
    }

    return Array.from(map.values());
  }

  /**
   * Manually resolve a conflict
   */
  async resolveManually(
    conflictId: string,
    resolution: 'source' | 'target' | 'custom',
    customData?: Record<string, unknown>,
    resolvedBy?: string
  ): Promise<ConflictResolution> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolvedData: Record<string, unknown>;

    switch (resolution) {
      case 'source':
        resolvedData = { ...conflict.targetData, ...conflict.sourceData };
        break;

      case 'target':
        resolvedData = { ...conflict.sourceData, ...conflict.targetData };
        break;

      case 'custom':
        if (!customData) {
          throw new Error('Custom data required for custom resolution');
        }
        resolvedData = customData;
        break;

      default:
        throw new Error(`Invalid resolution: ${resolution}`);
    }

    // Update conflict record
    conflict.resolvedAt = new Date();
    conflict.resolution = 'manual';
    conflict.resolvedData = resolvedData;
    conflict.resolvedBy = resolvedBy || 'manual';

    // Remove from manual queue
    const queueIndex = this.manualResolutionQueue.findIndex(c => c.id === conflictId);
    if (queueIndex > -1) {
      this.manualResolutionQueue.splice(queueIndex, 1);
    }

    this.logger.info('Conflict manually resolved', {
      conflictId,
      resolution,
      resolvedBy
    });

    return {
      resolved: true,
      strategy: 'manual',
      conflictId,
      resolvedData
    };
  }

  /**
   * Get pending manual resolutions
   */
  getPendingResolutions(): ConflictRecord[] {
    return [...this.manualResolutionQueue];
  }

  /**
   * Get conflict by ID
   */
  getConflict(conflictId: string): ConflictRecord | null {
    return this.conflicts.get(conflictId) || null;
  }

  /**
   * Get all conflicts
   */
  getAllConflicts(): ConflictRecord[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Get conflict statistics
   */
  getConflictStats(): {
    total: number;
    resolved: number;
    pending: number;
    byStrategy: Record<string, number>;
  } {
    const all = Array.from(this.conflicts.values());
    const resolved = all.filter(c => c.resolvedAt !== null);
    const pending = all.filter(c => c.resolvedAt === null);

    const byStrategy: Record<string, number> = {};
    for (const conflict of resolved) {
      const strategy = conflict.resolution || 'unknown';
      byStrategy[strategy] = (byStrategy[strategy] || 0) + 1;
    }

    return {
      total: all.length,
      resolved: resolved.length,
      pending: pending.length,
      byStrategy
    };
  }

  /**
   * Generate a conflict ID
   */
  private generateConflictId(context: ConflictContext): string {
    return `conflict-${context.source}-${context.target}-${context.entityType}-${context.entityId}-${Date.now()}`;
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  clearOldConflicts(daysOld: number = 30): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    let cleared = 0;
    for (const [id, conflict] of this.conflicts) {
      if (conflict.resolvedAt && conflict.resolvedAt < cutoff) {
        this.conflicts.delete(id);
        cleared++;
      }
    }

    this.logger.info(`Cleared ${cleared} old conflicts`);
    return cleared;
  }
}
