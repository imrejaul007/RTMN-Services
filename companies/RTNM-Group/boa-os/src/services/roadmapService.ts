// ============================================================================
// Roadmap Service - Roadmap creation with milestones
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import { Roadmap, Milestone } from '../types';
import { logger } from '../utils/logger';
import { NotFoundError, ValidationError } from '../utils/errors';

export interface CreateRoadmapInput {
  strategyId: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  milestones: Array<{
    title: string;
    description: string;
    targetDate: Date;
    owner: string;
    deliverables?: string[];
    dependencies?: string[];
  }>;
}

export class RoadmapService {
  private roadmaps: Map<string, Roadmap> = new Map();
  private milestones: Map<string, Milestone> = new Map();

  create(input: CreateRoadmapInput): Roadmap {
    if (input.endDate <= input.startDate) {
      throw new ValidationError('endDate must be after startDate');
    }

    const roadmapId = uuidv4();
    const now = new Date();
    const milestones: Milestone[] = input.milestones.map(m => {
      const milestone: Milestone = {
        id: uuidv4(),
        roadmapId,
        title: m.title,
        description: m.description,
        targetDate: m.targetDate,
        status: 'pending',
        dependencies: m.dependencies || [],
        deliverables: m.deliverables || [],
        owner: m.owner,
      };
      this.milestones.set(milestone.id, milestone);
      return milestone;
    });

    const roadmap: Roadmap = {
      id: roadmapId,
      strategyId: input.strategyId,
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
      milestones,
      status: 'planning',
      createdAt: now,
      updatedAt: now,
    };

    this.roadmaps.set(roadmap.id, roadmap);
    logger.info(`[RoadmapService] Created roadmap ${roadmap.id} with ${milestones.length} milestones`);
    return roadmap;
  }

  getById(id: string): Roadmap {
    const r = this.roadmaps.get(id);
    if (!r) throw new NotFoundError(`Roadmap ${id}`);
    return r;
  }

  getAll(filters?: { strategyId?: string; status?: Roadmap['status'] }): Roadmap[] {
    let results = Array.from(this.roadmaps.values());
    if (filters?.strategyId) results = results.filter(r => r.strategyId === filters.strategyId);
    if (filters?.status) results = results.filter(r => r.status === filters.status);
    return results;
  }

  updateMilestone(roadmapId: string, milestoneId: string, updates: { status?: Milestone['status']; completedDate?: Date; description?: string; targetDate?: Date }): Milestone {
    const roadmap = this.getById(roadmapId);
    const milestone = roadmap.milestones.find(m => m.id === milestoneId);
    if (!milestone) throw new NotFoundError(`Milestone ${milestoneId}`);

    if (updates.status) milestone.status = updates.status;
    if (updates.completedDate) milestone.completedDate = updates.completedDate;
    if (updates.description) milestone.description = updates.description;
    if (updates.targetDate) milestone.targetDate = updates.targetDate;

    if (milestone.status === 'completed' && !milestone.completedDate) {
      milestone.completedDate = new Date();
    }

    this.recalculateRoadmapStatus(roadmap);
    roadmap.updatedAt = new Date();
    return milestone;
  }

  private recalculateRoadmapStatus(roadmap: Roadmap): void {
    const completed = roadmap.milestones.filter(m => m.status === 'completed').length;
    const blocked = roadmap.milestones.filter(m => m.status === 'blocked').length;
    const total = roadmap.milestones.length;

    if (total === 0) {
      roadmap.status = 'planning';
    } else if (completed === total) {
      roadmap.status = 'completed';
    } else if (blocked > 0) {
      roadmap.status = 'on-hold';
    } else if (completed > 0) {
      roadmap.status = 'executing';
    } else {
      roadmap.status = 'executing';
    }
  }

  delete(id: string): boolean {
    const roadmap = this.roadmaps.get(id);
    if (!roadmap) return false;
    roadmap.milestones.forEach(m => this.milestones.delete(m.id));
    return this.roadmaps.delete(id);
  }

  /**
   * Get timeline view with milestones
   */
  getTimeline(roadmapId: string): Array<{ id: string; title: string; targetDate: Date; status: Milestone['status']; dependencies: string[] }> {
    const roadmap = this.getById(roadmapId);
    return roadmap.milestones
      .map(m => ({ id: m.id, title: m.title, targetDate: m.targetDate, status: m.status, dependencies: m.dependencies }))
      .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime());
  }
}

export const roadmapService = new RoadmapService();
export default roadmapService;
