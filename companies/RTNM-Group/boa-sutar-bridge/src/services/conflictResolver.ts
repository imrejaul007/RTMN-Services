// Conflict Resolver - Resolves conflicts when BOA and SUTAR diverge
import { v4 as uuidv4 } from 'uuid';
import { SyncConflict } from '../types';
import { logger } from '../utils/logger';

export type ResolutionStrategy = 'boa-wins' | 'sutar-wins' | 'merged' | 'newest-wins' | 'manual' | 'business-priority';

export class ConflictResolver {
  private resolutionLog: Array<{ conflictId: string; strategy: ResolutionStrategy; result: any; at: Date }> = [];

  /**
   * Resolve a conflict using specified strategy
   */
  resolve(conflict: SyncConflict, strategy: ResolutionStrategy, mergedValue?: any): SyncConflict {
    let result: any;
    switch (strategy) {
      case 'boa-wins':
        result = conflict.boaValue;
        break;
      case 'sutar-wins':
        result = conflict.sutarValue;
        break;
      case 'newest-wins':
        // Compare timestamps if present
        const boaTime = new Date((conflict.boaValue && conflict.boaValue.updatedAt) || 0).getTime();
        const sutarTime = new Date((conflict.sutarValue && conflict.sutarValue.updatedAt) || 0).getTime();
        result = boaTime >= sutarTime ? conflict.boaValue : conflict.sutarValue;
        break;
      case 'merged':
        result = mergedValue !== undefined ? mergedValue : { ...conflict.boaValue, ...conflict.sutarValue };
        break;
      case 'business-priority':
        // Strategic fields go to BOA, execution fields go to SUTAR
        result = this.businessPriorityResolve(conflict);
        break;
      case 'manual':
        result = conflict; // Keep as conflict, awaits manual intervention
        conflict.resolution = 'manual';
        conflict.resolvedAt = new Date();
        this.resolutionLog.push({ conflictId: conflict.id, strategy, result, at: new Date() });
        return conflict;
    }

    conflict.resolution = strategy as any;
    conflict.resolvedAt = new Date();
    this.resolutionLog.push({ conflictId: conflict.id, strategy, result, at: new Date() });
    logger.info(`[ConflictResolver] Resolved ${conflict.field} using ${strategy}`);
    return conflict;
  }

  /**
   * Auto-resolve multiple conflicts
   */
  autoResolve(conflicts: SyncConflict[], defaultStrategy: ResolutionStrategy = 'business-priority'): SyncConflict[] {
    return conflicts.map(c => {
      if (c.resolution && c.resolution !== 'pending') return c;
      return this.resolve(c, defaultStrategy);
    });
  }

  /**
   * Get resolution log
   */
  getResolutionLog(): typeof this.resolutionLog { return this.resolutionLog; }

  /**
   * Business-priority resolution:
   * - Strategic fields (title, description, priority, owner, dueDate) → BOA wins
   * - Execution fields (status, progress) → SUTAR wins
   */
  private businessPriorityResolve(conflict: SyncConflict): any {
    const strategicFields = ['title', 'description', 'priority', 'owner', 'dueDate', 'tags', 'metrics'];
    if (strategicFields.includes(conflict.field)) {
      return conflict.boaValue;
    }
    return conflict.sutarValue;
  }
}

export const conflictResolver = new ConflictResolver();
export default conflictResolver;
