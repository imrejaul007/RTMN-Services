/**
 * Playbook Service - Core business logic
 */

import { PlaybookModel, IPlaybook } from '../models/playbook';
import { TriggerModel } from '../models/trigger';
import { logger } from '../utils/logger';

export class PlaybookService {
  /**
   * Create a new playbook
   */
  async createPlaybook(data: {
    name: string;
    description: string;
    category: 'onboarding' | 'engagement' | 'retention' | 'expansion' | 'winback';
    triggers: {
      type: string;
      conditions: { field: string; operator: string; value: any }[];
      logic?: 'and' | 'or';
    }[];
    actions: {
      order: number;
      type: string;
      config: any;
      conditions?: any[];
    }[];
    conditions?: any;
  }): Promise<IPlaybook> {
    logger.info(`Creating playbook: ${data.name}`);

    const playbook = await PlaybookModel.create({
      ...data,
      status: 'draft',
      version: '1.0.0',
    });

    logger.info(`Playbook created: ${playbook._id}`);
    return playbook;
  }

  /**
   * Get playbook by ID
   */
  async getPlaybook(playbookId: string): Promise<IPlaybook | null> {
    return PlaybookModel.findById(playbookId).lean();
  }

  /**
   * Update playbook
   */
  async updatePlaybook(
    playbookId: string,
    updates: Partial<IPlaybook>
  ): Promise<IPlaybook | null> {
    const playbook = await PlaybookModel.findByIdAndUpdate(
      playbookId,
      { ...updates, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (playbook) {
      logger.info(`Playbook ${playbookId} updated`);
    }

    return playbook;
  }

  /**
   * Activate playbook
   */
  async activatePlaybook(playbookId: string): Promise<IPlaybook | null> {
    return this.updatePlaybook(playbookId, { status: 'active' });
  }

  /**
   * Pause playbook
   */
  async pausePlaybook(playbookId: string): Promise<IPlaybook | null> {
    return this.updatePlaybook(playbookId, { status: 'paused' });
  }

  /**
   * Archive playbook
   */
  async archivePlaybook(playbookId: string): Promise<IPlaybook | null> {
    return this.updatePlaybook(playbookId, { status: 'archived' });
  }

  /**
   * Get all playbooks
   */
  async getAllPlaybooks(filters?: {
    category?: string;
    status?: string;
  }): Promise<IPlaybook[]> {
    const query: Record<string, unknown> = {};
    if (filters?.category) query.category = filters.category;
    if (filters?.status) query.status = filters.status;

    return PlaybookModel.find(query).sort({ name: 1 }).lean();
  }

  /**
   * Get active playbooks by trigger type
   */
  async getActivePlaybooksByTrigger(triggerType: string): Promise<IPlaybook[]> {
    return PlaybookModel.find({
      status: 'active',
      'triggers.type': triggerType,
    }).lean();
  }

  /**
   * Trigger a playbook for a customer
   */
  async triggerPlaybook(
    playbookId: string,
    customerId: string,
    triggerData: any,
    triggeredBy: 'automated' | 'manual' | 'api' = 'api'
  ): Promise<any> {
    const playbook = await PlaybookModel.findById(playbookId);
    if (!playbook) {
      throw new Error('Playbook not found');
    }

    // Check if conditions match
    const conditionsMatch = await this.evaluateConditions(playbook, customerId, triggerData);
    if (!conditionsMatch) {
      logger.info(`Conditions not met for playbook ${playbookId}, customer ${customerId}`);
      return null;
    }

    // Create trigger record
    const trigger = await TriggerModel.create({
      playbookId,
      customerId,
      type: triggerData.type,
      triggeredBy,
      triggerData,
      matchedConditions: conditionsMatch.matchedConditions,
      status: 'pending',
      triggeredAt: new Date(),
    });

    logger.info(`Trigger created: ${trigger._id} for playbook ${playbookId}`);
    return trigger;
  }

  /**
   * Evaluate if playbook conditions match
   */
  private async evaluateConditions(
    playbook: IPlaybook,
    customerId: string,
    triggerData: any
  ): Promise<{ matched: boolean; matchedConditions: any[] }> {
    const matchedConditions: any[] = [];
    let allMatch = true;

    for (const trigger of playbook.triggers) {
      for (const condition of trigger.conditions) {
        let passed = false;
        let actual = '';

        // Get the actual value from trigger data
        const value = (triggerData as any)[condition.field];

        switch (condition.operator) {
          case 'lt':
            passed = value < condition.value;
            actual = String(value);
            break;
          case 'gt':
            passed = value > condition.value;
            actual = String(value);
            break;
          case 'eq':
            passed = value === condition.value;
            actual = String(value);
            break;
          case 'lte':
            passed = value <= condition.value;
            actual = String(value);
            break;
          case 'gte':
            passed = value >= condition.value;
            actual = String(value);
            break;
          case 'ne':
            passed = value !== condition.value;
            actual = String(value);
            break;
          case 'contains':
            passed = String(value).includes(String(condition.value));
            actual = String(value);
            break;
        }

        matchedConditions.push({
          condition: `${condition.field} ${condition.operator} ${condition.value}`,
          expected: String(condition.value),
          actual,
          passed,
        });

        if (trigger.logic === 'or') {
          allMatch = allMatch || passed;
        } else {
          allMatch = allMatch && passed;
        }
      }
    }

    return { matched: allMatch, matchedConditions };
  }

  /**
   * Get executions for a playbook
   */
  async getExecutions(playbookId: string, limit: number = 50): Promise<any[]> {
    const { ExecutionModel } = await import('../models/execution');
    return ExecutionModel.find({ playbookId })
      .sort({ startedAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Duplicate a playbook
   */
  async duplicatePlaybook(sourceId: string, newName: string): Promise<IPlaybook> {
    const source = await PlaybookModel.findById(sourceId);
    if (!source) {
      throw new Error('Source playbook not found');
    }

    return this.createPlaybook({
      name: newName,
      description: source.description,
      category: source.category as any,
      triggers: source.triggers.map(t => ({
        type: t.type,
        conditions: t.conditions,
        logic: t.logic,
      })),
      actions: source.actions.map(a => ({
        order: a.order,
        type: a.type,
        config: a.config,
        conditions: a.conditions,
      })),
      conditions: source.conditions,
    });
  }
}

export const playbookService = new PlaybookService();