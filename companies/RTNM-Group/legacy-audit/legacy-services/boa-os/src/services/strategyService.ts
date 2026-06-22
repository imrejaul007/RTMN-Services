import { v4 as uuidv4 } from 'uuid';
import { StrategicGoal, Opportunity, Portfolio, IStrategicGoal } from '../models/Strategy';
import { publishEvent } from './eventBus';
import axios from 'axios';

const SUTAR_GOAL_OS_URL = process.env.SUTAR_GOAL_OS_URL || 'http://localhost:4242';

export interface CreateGoalDto {
  title: string;
  description?: string;
  type: IStrategicGoal['type'];
  planning: {
    quarter: string;
    fiscalYear: string;
    horizon: 'short' | 'medium' | 'long';
    department: string;
    owner: string;
  };
  targets: {
    primary: {
      metric: string;
      currentValue: number;
      targetValue: number;
      unit: string;
      deadline: Date;
    };
    secondary?: Array<{
      metric: string;
      currentValue: number;
      targetValue: number;
      unit: string;
    }>;
  };
  budget: {
    allocated: number;
    breakdown?: Record<string, number>;
  };
  risks?: Array<{
    description: string;
    probability: 'low' | 'medium' | 'high';
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  createdBy: string;
  tenantId: string;
}

export interface GoalQuery {
  tenantId: string;
  status?: string;
  type?: string;
  quarter?: string;
  department?: string;
  page?: number;
  limit?: number;
}

export class StrategyService {

  /**
   * Create a new strategic goal
   */
  async createGoal(dto: CreateGoalDto): Promise<IStrategicGoal> {
    const goalId = `BOA-${dto.planning.quarter}-${uuidv4().substring(0, 4).toUpperCase()}`;

    const goal = new StrategicGoal({
      goalId,
      title: dto.title,
      description: dto.description,
      type: dto.type,
      status: 'draft',
      planning: dto.planning,
      targets: {
        primary: dto.targets.primary,
        secondary: dto.targets.secondary || []
      },
      budget: {
        allocated: dto.budget.allocated,
        spent: 0,
        currency: 'INR',
        breakdown: dto.budget.breakdown || {}
      },
      risks: (dto.risks || []).map(r => ({
        id: uuidv4(),
        ...r
      })),
      dependencies: {
        blockedBy: [],
        blocks: []
      },
      execution: {
        status: 'not_started'
      },
      metrics: {
        progress: 0,
        lastUpdated: new Date(),
        healthScore: 100
      },
      createdBy: dto.createdBy,
      tenantId: dto.tenantId,
      metadata: {
        version: 1
      }
    });

    await goal.save();

    // Publish event
    await publishEvent('boa.goal.created', {
      goalId,
      title: dto.title,
      type: dto.type,
      tenantId: dto.tenantId
    });

    return goal;
  }

  /**
   * Get goal by ID
   */
  async getGoal(goalId: string, tenantId: string): Promise<IStrategicGoal | null> {
    return StrategicGoal.findOne({ goalId, tenantId });
  }

  /**
   * List goals with filters
   */
  async listGoals(query: GoalQuery): Promise<{ goals: IStrategicGoal[]; total: number }> {
    const filter: Record<string, unknown> = { tenantId: query.tenantId };

    if (query.status) filter.status = query.status;
    if (query.type) filter.type = query.type;
    if (query.quarter) filter['planning.quarter'] = query.quarter;
    if (query.department) filter['planning.department'] = query.department;

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [goals, total] = await Promise.all([
      StrategicGoal.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StrategicGoal.countDocuments(filter)
    ]);

    return { goals, total };
  }

  /**
   * Approve goal
   */
  async approveGoal(goalId: string, tenantId: string, approverId: string): Promise<IStrategicGoal | null> {
    const goal = await StrategicGoal.findOne({ goalId, tenantId });
    if (!goal) return null;

    goal.status = 'approved';
    goal.metadata.approvedBy = approverId;
    goal.metadata.approvedAt = new Date();
    goal.metadata.version += 1;

    await goal.save();

    await publishEvent('boa.goal.approved', { goalId, approverId, tenantId });

    return goal;
  }

  /**
   * Start execution - decompose to SUTAR
   */
  async startExecution(goalId: string, tenantId: string): Promise<IStrategicGoal | null> {
    const goal = await StrategicGoal.findOne({ goalId, tenantId });
    if (!goal || goal.status !== 'approved') return null;

    try {
      // Create goal in SUTAR GoalOS
      const sutarResponse = await axios.post(`${SUTAR_GOAL_OS_URL}/goals`, {
        title: goal.title,
        description: `Strategic goal from BOA: ${goal.description}`,
        type: 'strategic',
        targets: goal.targets,
        deadline: goal.targets.primary.deadline,
        tenantId: goal.tenantId,
        createdBy: goal.createdBy
      }, { timeout: 10000 });

      const sutArGoalId = sutarResponse.data?.data?.goalId;

      if (sutArGoalId) {
        goal.execution.sutArGoalId = sutArGoalId;
        goal.execution.status = 'decomposed';
        goal.execution.lastSync = new Date();
        goal.status = 'in_progress';
        goal.metadata.version += 1;

        await goal.save();

        await publishEvent('boa.goal.execution_started', {
          goalId,
          sutArGoalId,
          tenantId
        });
      }
    } catch (error) {
      console.error('Failed to sync with SUTAR:', error);
      // Still mark as in progress, just without SUTAR sync
      goal.status = 'in_progress';
      goal.execution.status = 'decomposed';
      goal.execution.lastSync = new Date();
      await goal.save();
    }

    return goal;
  }

  /**
   * Update progress from SUTAR
   */
  async syncProgress(goalId: string, tenantId: string): Promise<IStrategicGoal | null> {
    const goal = await StrategicGoal.findOne({ goalId, tenantId });
    if (!goal || !goal.execution.sutArGoalId) return goal;

    try {
      // Get progress from SUTAR
      const response = await axios.get(
        `${SUTAR_GOAL_OS_URL}/goals/${goal.execution.sutArGoalId}/progress`,
        { timeout: 5000 }
      );

      const sutArProgress = response.data?.data;

      if (sutArProgress) {
        goal.metrics.progress = sutArProgress.progress || 0;
        goal.metrics.healthScore = sutArProgress.healthScore || 100;
        goal.metrics.lastUpdated = new Date();

        // Check if achieved
        if (goal.metrics.progress >= 100) {
          goal.status = 'achieved';
          goal.execution.status = 'completed';
        }

        goal.execution.lastSync = new Date();
        goal.metadata.version += 1;

        await goal.save();

        await publishEvent('boa.goal.progress_synced', {
          goalId,
          progress: goal.metrics.progress,
          tenantId
        });
      }
    } catch (error) {
      console.error('Failed to sync progress from SUTAR:', error);
    }

    return goal;
  }

  /**
   * Update goal
   */
  async updateGoal(
    goalId: string,
    tenantId: string,
    updates: Partial<CreateGoalDto>
  ): Promise<IStrategicGoal | null> {
    const goal = await StrategicGoal.findOne({ goalId, tenantId });
    if (!goal) return null;

    if (updates.title) goal.title = updates.title;
    if (updates.description) goal.description = updates.description;
    if (updates.targets) {
      goal.targets.primary = updates.targets.primary;
      goal.targets.secondary = updates.targets.secondary || [];
    }
    if (updates.budget) {
      goal.budget.allocated = updates.budget.allocated;
      if (updates.budget.breakdown) {
        goal.budget.breakdown = updates.budget.breakdown;
      }
    }
    if (updates.risks) {
      goal.risks = updates.risks.map(r => ({
        id: r.id || uuidv4(),
        ...r
      }));
    }

    goal.metadata.version += 1;
    await goal.save();

    return goal;
  }

  /**
   * Cancel goal
   */
  async cancelGoal(goalId: string, tenantId: string, reason: string): Promise<IStrategicGoal | null> {
    const goal = await StrategicGoal.findOne({ goalId, tenantId });
    if (!goal) return null;

    goal.status = 'cancelled';
    goal.metadata.version += 1;

    await goal.save();

    await publishEvent('boa.goal.cancelled', { goalId, reason, tenantId });

    return goal;
  }

  /**
   * Get dashboard stats
   */
  async getDashboard(tenantId: string): Promise<Record<string, unknown>> {
    const [
      totalGoals,
      byStatus,
      byType,
      avgProgress,
      budgetUtilization
    ] = await Promise.all([
      StrategicGoal.countDocuments({ tenantId }),
      StrategicGoal.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      StrategicGoal.aggregate([
        { $match: { tenantId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      StrategicGoal.aggregate([
        { $match: { tenantId, status: 'in_progress' } },
        { $group: { _id: null, avgProgress: { $avg: '$metrics.progress' } } }
      ]),
      StrategicGoal.aggregate([
        { $match: { tenantId } },
        { $group: {
          _id: null,
          totalAllocated: { $sum: '$budget.allocated' },
          totalSpent: { $sum: '$budget.spent' }
        }}
      ])
    ]);

    const statusMap = byStatus.reduce((acc, s) => {
      acc[s._id] = s.count;
      return acc;
    }, {} as Record<string, number>);

    const typeMap = byType.reduce((acc, t) => {
      acc[t._id] = t.count;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalGoals,
      byStatus: statusMap,
      byType: typeMap,
      avgProgress: avgProgress[0]?.avgProgress || 0,
      budget: {
        allocated: budgetUtilization[0]?.totalAllocated || 0,
        spent: budgetUtilization[0]?.totalSpent || 0,
        utilization: budgetUtilization[0]?.totalAllocated > 0
          ? ((budgetUtilization[0].totalSpent / budgetUtilization[0].totalAllocated) * 100).toFixed(2)
          : 0
      }
    };
  }
}

export const strategyService = new StrategyService();
