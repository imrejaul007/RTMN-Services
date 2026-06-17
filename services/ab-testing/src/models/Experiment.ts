import { v4 as uuidv4 } from 'uuid';

export interface VariantConfig {
  id: string;
  name: string;
  weight: number; // 0-100, sum should equal 100
  config?: Record<string, unknown>;
}

export interface TargetingRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'contains' | 'in';
  value: string | number | string[] | number[];
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variants: VariantConfig[];
  trafficAllocation: number; // 0-100, percentage of users in experiment
  targetingRules?: TargetingRule[];
  startDate?: Date;
  endDate?: Date;
  ownerId?: string;
  tags?: string[];
  metrics: {
    primary: string;
    secondary?: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExperimentDTO {
  name: string;
  description?: string;
  variants: Omit<VariantConfig, 'id'>[];
  trafficAllocation: number;
  targetingRules?: TargetingRule[];
  startDate?: Date;
  endDate?: Date;
  ownerId?: string;
  tags?: string[];
  metrics: {
    primary: string;
    secondary?: string[];
  };
}

export interface UpdateExperimentDTO {
  name?: string;
  description?: string;
  status?: Experiment['status'];
  variants?: VariantConfig[];
  trafficAllocation?: number;
  targetingRules?: TargetingRule[];
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  metrics?: {
    primary: string;
    secondary?: string[];
  };
}

export class ExperimentModel {
  private experiments: Map<string, Experiment> = new Map();

  create(dto: CreateExperimentDTO): Experiment {
    const id = `exp-${uuidv4().slice(0, 8)}`;
    const now = new Date();

    const experiment: Experiment = {
      id,
      name: dto.name,
      description: dto.description,
      status: 'draft',
      variants: dto.variants.map(v => ({ ...v, id: `var-${uuidv4().slice(0, 6)}` })),
      trafficAllocation: dto.trafficAllocation,
      targetingRules: dto.targetingRules,
      startDate: dto.startDate,
      endDate: dto.endDate,
      ownerId: dto.ownerId,
      tags: dto.tags || [],
      metrics: dto.metrics,
      createdAt: now,
      updatedAt: now,
    };

    this.experiments.set(id, experiment);
    return experiment;
  }

  findById(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  findAll(filters?: {
    status?: Experiment['status'];
    tags?: string[];
    ownerId?: string;
  }): Experiment[] {
    let results = Array.from(this.experiments.values());

    if (filters?.status) {
      results = results.filter(e => e.status === filters.status);
    }
    if (filters?.tags?.length) {
      results = results.filter(e => filters.tags!.some(t => e.tags?.includes(t)));
    }
    if (filters?.ownerId) {
      results = results.filter(e => e.ownerId === filters.ownerId);
    }

    return results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  update(id: string, dto: UpdateExperimentDTO): Experiment | undefined {
    const experiment = this.experiments.get(id);
    if (!experiment) return undefined;

    const updated: Experiment = {
      ...experiment,
      ...dto,
      updatedAt: new Date(),
    };

    this.experiments.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.experiments.delete(id);
  }
}

export const experimentModel = new ExperimentModel();
