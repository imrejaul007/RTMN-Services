import { v4 as uuidv4 } from 'uuid';
import { flags, Flag, TargetingRule } from '../index';

export class FlagModel {
  /**
   * Create a new feature flag
   */
  static create(data: Partial<Flag>): Flag {
    const now = new Date().toISOString();

    const flag: Flag = {
      id: uuidv4(),
      key: data.key || '',
      name: data.name || '',
      description: data.description || '',
      enabled: data.enabled ?? true,
      defaultValue: data.defaultValue ?? false,
      variantType: data.variantType || 'boolean',
      variants: data.variants,
      targetingRules: data.targetingRules || [],
      rollouts: data.rollouts || {
        percentage: 100
      },
      tags: data.tags || [],
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy || 'system',
      environment: data.environment || 'development'
    };

    // Validate required fields
    if (!flag.key || flag.key.trim() === '') {
      throw new Error('Flag key is required');
    }

    // Check for duplicate key
    if (this.exists(flag.key, flag.environment)) {
      throw new Error(`Flag with key "${flag.key}" already exists in ${flag.environment}`);
    }

    // Validate key format (kebab-case)
    if (!/^[a-z0-9-]+$/.test(flag.key)) {
      throw new Error('Flag key must be lowercase alphanumeric with hyphens only');
    }

    flags.set(flag.id, flag);
    return flag;
  }

  /**
   * Find flag by ID
   */
  static findById(id: string): Flag | undefined {
    return flags.get(id);
  }

  /**
   * Find flag by key
   */
  static findByKey(key: string, environment?: string): Flag | undefined {
    for (const flag of flags.values()) {
      if (flag.key === key) {
        if (!environment || flag.environment === environment) {
          return flag;
        }
      }
    }
    return undefined;
  }

  /**
   * Check if flag exists
   */
  static exists(key: string, environment: string): boolean {
    return this.findByKey(key, environment) !== undefined;
  }

  /**
   * Get all flags
   */
  static findAll(filters?: {
    enabled?: boolean;
    environment?: string;
    tags?: string[];
  }): Flag[] {
    let result = Array.from(flags.values());

    if (filters) {
      if (filters.enabled !== undefined) {
        result = result.filter(f => f.enabled === filters.enabled);
      }
      if (filters.environment) {
        result = result.filter(f => f.environment === filters.environment);
      }
      if (filters.tags && filters.tags.length > 0) {
        result = result.filter(f =>
          filters.tags!.some(tag => f.tags.includes(tag))
        );
      }
    }

    return result.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Update a flag
   */
  static update(id: string, data: Partial<Flag>): Flag | null {
    const flag = flags.get(id);
    if (!flag) {
      return null;
    }

    // Check for key uniqueness if key is being changed
    if (data.key && data.key !== flag.key) {
      if (this.exists(data.key, flag.environment)) {
        throw new Error(`Flag with key "${data.key}" already exists in ${flag.environment}`);
      }
    }

    // Validate key format if being changed
    if (data.key && !/^[a-z0-9-]+$/.test(data.key)) {
      throw new Error('Flag key must be lowercase alphanumeric with hyphens only');
    }

    const updatedFlag: Flag = {
      ...flag,
      ...data,
      id: flag.id, // Prevent ID change
      createdAt: flag.createdAt, // Prevent createdAt change
      updatedAt: new Date().toISOString()
    };

    flags.set(id, updatedFlag);
    return updatedFlag;
  }

  /**
   * Delete a flag
   */
  static delete(id: string): boolean {
    return flags.delete(id);
  }

  /**
   * Toggle flag enabled status
   */
  static toggle(id: string): Flag | null {
    const flag = flags.get(id);
    if (!flag) {
      return null;
    }

    flag.enabled = !flag.enabled;
    flag.updatedAt = new Date().toISOString();
    flags.set(id, flag);

    return flag;
  }

  /**
   * Add targeting rule to flag
   */
  static addRule(id: string, rule: Omit<TargetingRule, 'id'>): Flag | null {
    const flag = flags.get(id);
    if (!flag) {
      return null;
    }

    const newRule: TargetingRule = {
      ...rule,
      id: uuidv4()
    };

    flag.targetingRules.push(newRule);
    flag.updatedAt = new Date().toISOString();
    flags.set(id, flag);

    return flag;
  }

  /**
   * Remove targeting rule from flag
   */
  static removeRule(flagId: string, ruleId: string): Flag | null {
    const flag = flags.get(flagId);
    if (!flag) {
      return null;
    }

    flag.targetingRules = flag.targetingRules.filter(r => r.id !== ruleId);
    flag.updatedAt = new Date().toISOString();
    flags.set(flagId, flag);

    return flag;
  }

  /**
   * Update rollout percentage
   */
  static updateRollout(id: string, percentage: number, startDate?: string, endDate?: string): Flag | null {
    const flag = flags.get(id);
    if (!flag) {
      return null;
    }

    if (percentage < 0 || percentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }

    flag.rollouts = {
      percentage,
      startDate: startDate || flag.rollouts.startDate,
      endDate: endDate || flag.rollouts.endDate
    };
    flag.updatedAt = new Date().toISOString();
    flags.set(id, flag);

    return flag;
  }

  /**
   * Clone a flag to another environment
   */
  static clone(id: string, targetEnvironment: 'development' | 'staging' | 'production'): Flag | null {
    const sourceFlag = flags.get(id);
    if (!sourceFlag) {
      return null;
    }

    // Deep clone targeting rules with new IDs
    const clonedRules = sourceFlag.targetingRules.map(rule => ({
      ...rule,
      id: uuidv4()
    }));

    return this.create({
      key: sourceFlag.key,
      name: sourceFlag.name,
      description: sourceFlag.description,
      enabled: false, // Start disabled in new environment
      defaultValue: sourceFlag.defaultValue,
      variantType: sourceFlag.variantType,
      variants: sourceFlag.variants ? { ...sourceFlag.variants } : undefined,
      targetingRules: clonedRules,
      rollouts: { ...sourceFlag.rollouts },
      tags: [...sourceFlag.tags],
      createdBy: sourceFlag.createdBy,
      environment: targetEnvironment
    });
  }

  /**
   * Get flag statistics
   */
  static getStats(): {
    total: number;
    enabled: number;
    disabled: number;
    byEnvironment: Record<string, number>;
    byTag: Record<string, number>;
  } {
    const allFlags = Array.from(flags.values());

    const stats = {
      total: allFlags.length,
      enabled: allFlags.filter(f => f.enabled).length,
      disabled: allFlags.filter(f => !f.enabled).length,
      byEnvironment: {} as Record<string, number>,
      byTag: {} as Record<string, number>
    };

    for (const flag of allFlags) {
      stats.byEnvironment[flag.environment] = (stats.byEnvironment[flag.environment] || 0) + 1;

      for (const tag of flag.tags) {
        stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;
      }
    }

    return stats;
  }
}
