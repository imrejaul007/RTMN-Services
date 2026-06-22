/**
 * HOJAI FounderOS - Hiring Service
 */

import { v4 as uuid } from 'uuid';
import { HiringPlanModel } from '../models/index.js';
import { createLogger } from '../utils/logger.js';
import { HiringPriority, HiringStatus, SeniorityLevel } from '../types/index.js';

const logger = createLogger('hiring');

export class HiringService {
  /**
   * List all hiring plans for a tenant
   */
  async list(tenantId: string, limit = 50, offset = 0): Promise<any[]> {
    const plans = await HiringPlanModel.find({ tenantId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return plans.map(p => this.formatHiringPlan(p));
  }

  /**
   * Get hiring plan by ID
   */
  async getById(tenantId: string, id: string): Promise<any | null> {
    const plan = await HiringPlanModel.findOne({ tenantId, id });
    return plan ? this.formatHiringPlan(plan) : null;
  }

  /**
   * Create a new hiring plan
   */
  async create(tenantId: string, data: {
    name: string;
    description?: string;
    timeline?: {
      startDate?: Date;
      endDate?: Date;
      quarters?: string[];
    };
    roles?: Array<{
      title: string;
      department: string;
      seniority?: SeniorityLevel;
      location?: string;
      remote?: boolean;
      salary?: number;
      priority?: HiringPriority;
      status?: HiringStatus;
      targetStartDate?: Date;
      description?: string;
    }>;
    totalBudget?: number;
    createdBy?: string;
  }): Promise<any> {
    const id = uuid();

    const roles = (data.roles || []).map(role => ({
      id: uuid(),
      title: role.title,
      department: role.department,
      seniority: role.seniority || SeniorityLevel.MID,
      location: role.location,
      remote: role.remote !== undefined ? role.remote : true,
      salary: role.salary,
      priority: role.priority || HiringPriority.MEDIUM,
      status: role.status || HiringStatus.OPEN,
      targetStartDate: role.targetStartDate,
      description: role.description
    }));

    const plan = new HiringPlanModel({
      id,
      tenantId,
      name: data.name,
      description: data.description,
      timeline: {
        startDate: data.timeline?.startDate,
        endDate: data.timeline?.endDate,
        quarters: data.timeline?.quarters || []
      },
      roles,
      totalBudget: data.totalBudget || 0,
      createdBy: data.createdBy
    });

    await plan.save();
    logger.info('hiring_plan_created', { tenantId, id, name: data.name, roleCount: roles.length });

    return this.formatHiringPlan(plan);
  }

  /**
   * Update a hiring plan
   */
  async update(tenantId: string, id: string, updates: {
    name?: string;
    description?: string;
    timeline?: {
      startDate?: Date;
      endDate?: Date;
      quarters?: string[];
    };
    totalBudget?: number;
  }): Promise<any | null> {
    const plan = await HiringPlanModel.findOne({ tenantId, id });
    if (!plan) return null;

    if (updates.name !== undefined) plan.name = updates.name;
    if (updates.description !== undefined) plan.description = updates.description;
    if (updates.totalBudget !== undefined) plan.totalBudget = updates.totalBudget;
    if (updates.timeline) {
      if (updates.timeline.startDate !== undefined) plan.timeline.startDate = updates.timeline.startDate;
      if (updates.timeline.endDate !== undefined) plan.timeline.endDate = updates.timeline.endDate;
      if (updates.timeline.quarters) plan.timeline.quarters = updates.timeline.quarters;
    }

    await plan.save();
    logger.info('hiring_plan_updated', { tenantId, id });

    return this.formatHiringPlan(plan);
  }

  /**
   * Delete a hiring plan
   */
  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await HiringPlanModel.deleteOne({ tenantId, id });
    if (result.deletedCount > 0) {
      logger.info('hiring_plan_deleted', { tenantId, id });
      return true;
    }
    return false;
  }

  /**
   * Add role to hiring plan
   */
  async addRole(tenantId: string, planId: string, role: {
    title: string;
    department: string;
    seniority?: SeniorityLevel;
    location?: string;
    remote?: boolean;
    salary?: number;
    priority?: HiringPriority;
    targetStartDate?: Date;
    description?: string;
  }): Promise<any | null> {
    const plan = await HiringPlanModel.findOne({ tenantId, id: planId });
    if (!plan) return null;

    const newRole = {
      id: uuid(),
      title: role.title,
      department: role.department,
      seniority: role.seniority || SeniorityLevel.MID,
      location: role.location,
      remote: role.remote !== undefined ? role.remote : true,
      salary: role.salary,
      priority: role.priority || HiringPriority.MEDIUM,
      status: HiringStatus.OPEN,
      targetStartDate: role.targetStartDate,
      description: role.description
    };

    plan.roles.push(newRole);
    await plan.save();

    logger.info('role_added', { tenantId, planId, roleId: newRole.id, title: role.title });

    return this.formatHiringPlan(plan);
  }

  /**
   * Update role in hiring plan
   */
  async updateRole(
    tenantId: string,
    planId: string,
    roleId: string,
    updates: {
      title?: string;
      department?: string;
      seniority?: SeniorityLevel;
      location?: string;
      remote?: boolean;
      salary?: number;
      priority?: HiringPriority;
      status?: HiringStatus;
      targetStartDate?: Date;
      description?: string;
    }
  ): Promise<any | null> {
    const plan = await HiringPlanModel.findOne({ tenantId, id: planId });
    if (!plan) return null;

    const role = plan.roles.find(r => r.id === roleId);
    if (!role) return null;

    if (updates.title !== undefined) role.title = updates.title;
    if (updates.department !== undefined) role.department = updates.department;
    if (updates.seniority !== undefined) role.seniority = updates.seniority;
    if (updates.location !== undefined) role.location = updates.location;
    if (updates.remote !== undefined) role.remote = updates.remote;
    if (updates.salary !== undefined) role.salary = updates.salary;
    if (updates.priority !== undefined) role.priority = updates.priority;
    if (updates.status !== undefined) role.status = updates.status;
    if (updates.targetStartDate !== undefined) role.targetStartDate = updates.targetStartDate;
    if (updates.description !== undefined) role.description = updates.description;

    await plan.save();
    logger.info('role_updated', { tenantId, planId, roleId });

    return this.formatHiringPlan(plan);
  }

  /**
   * Remove role from hiring plan
   */
  async removeRole(tenantId: string, planId: string, roleId: string): Promise<any | null> {
    const plan = await HiringPlanModel.findOne({ tenantId, id: planId });
    if (!plan) return null;

    plan.roles = plan.roles.filter(r => r.id !== roleId);
    await plan.save();

    logger.info('role_removed', { tenantId, planId, roleId });

    return this.formatHiringPlan(plan);
  }

  /**
   * Get hiring analytics
   */
  async getAnalytics(tenantId: string): Promise<any> {
    const plans = await HiringPlanModel.find({ tenantId });

    let totalRoles = 0;
    let openRoles = 0;
    let filledRoles = 0;
    let inProgressRoles = 0;
    let totalBudget = 0;
    const departmentBreakdown: Record<string, number> = {};
    const priorityBreakdown: Record<string, number> = {};

    for (const plan of plans) {
      for (const role of plan.roles) {
        totalRoles++;
        totalBudget += role.salary || 0;

        switch (role.status) {
          case HiringStatus.OPEN:
            openRoles++;
            break;
          case HiringStatus.FILLED:
            filledRoles++;
            break;
          case HiringStatus.IN_PROGRESS:
            inProgressRoles++;
            break;
        }

        departmentBreakdown[role.department] = (departmentBreakdown[role.department] || 0) + 1;
        priorityBreakdown[role.priority] = (priorityBreakdown[role.priority] || 0) + 1;
      }
    }

    return {
      totalPlans: plans.length,
      totalRoles,
      openRoles,
      inProgressRoles,
      filledRoles,
      fillRate: totalRoles > 0 ? Math.round((filledRoles / totalRoles) * 100) : 0,
      totalBudget,
      departmentBreakdown,
      priorityBreakdown
    };
  }

  /**
   * Suggest roles based on company stage and growth
   */
  suggestRoles(stage: 'startup' | 'growth' | 'scale'): any[] {
    const roleTemplates: Record<string, { title: string; department: string; seniority: SeniorityLevel; priority: HiringPriority }[]> = {
      startup: [
        { title: 'Full Stack Developer', department: 'Engineering', seniority: SeniorityLevel.SENIOR, priority: HiringPriority.HIGH },
        { title: 'Product Manager', department: 'Product', seniority: SeniorityLevel.SENIOR, priority: HiringPriority.HIGH },
        { title: 'Sales Representative', department: 'Sales', seniority: SeniorityLevel.MID, priority: HiringPriority.MEDIUM }
      ],
      growth: [
        { title: 'Engineering Manager', department: 'Engineering', seniority: SeniorityLevel.LEAD, priority: HiringPriority.HIGH },
        { title: 'Marketing Manager', department: 'Marketing', seniority: SeniorityLevel.SENIOR, priority: HiringPriority.MEDIUM },
        { title: 'Customer Success Manager', department: 'Customer Success', seniority: SeniorityLevel.MID, priority: HiringPriority.MEDIUM },
        { title: 'DevOps Engineer', department: 'Engineering', seniority: SeniorityLevel.SENIOR, priority: HiringPriority.MEDIUM }
      ],
      scale: [
        { title: 'VP of Engineering', department: 'Engineering', seniority: SeniorityLevel.VP, priority: HiringPriority.HIGH },
        { title: 'VP of Sales', department: 'Sales', seniority: SeniorityLevel.VP, priority: HiringPriority.HIGH },
        { title: 'Head of Marketing', department: 'Marketing', seniority: SeniorityLevel.DIRECTOR, priority: HiringPriority.HIGH },
        { title: 'Head of HR', department: 'HR', seniority: SeniorityLevel.DIRECTOR, priority: HiringPriority.MEDIUM },
        { title: 'Senior Account Executive', department: 'Sales', seniority: SeniorityLevel.SENIOR, priority: HiringPriority.MEDIUM }
      ]
    };

    return (roleTemplates[stage] || roleTemplates.startup).map(role => ({
      ...role,
      id: uuid(),
      remote: true,
      status: HiringStatus.OPEN
    }));
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private formatHiringPlan(plan: any): any {
    return {
      id: plan.id,
      tenantId: plan.tenantId,
      name: plan.name,
      description: plan.description,
      timeline: plan.timeline,
      roles: plan.roles,
      totalBudget: plan.totalBudget,
      createdBy: plan.createdBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt
    };
  }
}

export const hiringService = new HiringService();
export default hiringService;
