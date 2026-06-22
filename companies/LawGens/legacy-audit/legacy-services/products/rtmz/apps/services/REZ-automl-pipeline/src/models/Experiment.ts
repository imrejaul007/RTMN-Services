/**
 * Experiment Model
 * Represents an AutoML experiment for tracking model selection and hyperparameter tuning
 */

export interface ExperimentConfig {
  taskType: 'classification' | 'regression' | 'clustering';
  targetColumn: string;
  featureColumns?: string[];
  testSize?: number;
  cvFolds?: number;
  hyperparamIterations?: number;
  modelTypes?: string[];
  metric?: string;
  featureStoreId?: string;
  datasetPath?: string;
}

export interface ExperimentResult {
  bestModel: string;
  bestScore: number;
  bestParams: Record<string, unknown>;
  allScores: Record<string, number>;
  allParams: Record<string, Record<string, unknown>>;
  trainingTime: number;
  crossValidationScores: number[];
  featureImportance?: Record<string, number>;
}

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  config: ExperimentConfig;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  result?: ExperimentResult;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  tags?: string[];
  userId?: string;
}

export interface CreateExperimentRequest {
  name: string;
  description?: string;
  config: ExperimentConfig;
  tags?: string[];
  userId?: string;
}

export interface ExperimentListQuery {
  status?: Experiment['status'];
  taskType?: ExperimentConfig['taskType'];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface ExperimentUpdate {
  status?: Experiment['status'];
  result?: ExperimentResult;
  error?: string;
}

export class ExperimentModel {
  private experiments: Map<string, Experiment> = new Map();
  private storagePath: string;

  constructor(storagePath: string = './experiments') {
    this.storagePath = storagePath;
  }

  async create(data: CreateExperimentRequest): Promise<Experiment> {
    const id = this.generateId();
    const now = new Date();

    const experiment: Experiment = {
      id,
      name: data.name,
      description: data.description,
      config: data.config,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      tags: data.tags,
      userId: data.userId
    };

    this.experiments.set(id, experiment);
    await this.persist(experiment);

    return experiment;
  }

  async findById(id: string): Promise<Experiment | null> {
    const experiment = this.experiments.get(id);
    if (experiment) {
      return experiment;
    }
    return null;
  }

  async findAll(query: ExperimentListQuery = {}): Promise<Experiment[]> {
    let results = Array.from(this.experiments.values());

    if (query.status) {
      results = results.filter(e => e.status === query.status);
    }

    if (query.taskType) {
      results = results.filter(e => e.config.taskType === query.taskType);
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    results.sort((a, b) => {
      let aVal: string | number | Date;
      let bVal: string | number | Date;

      if (sortBy === 'name') {
        aVal = a.name;
        bVal = b.name;
      } else if (sortBy === 'updatedAt') {
        aVal = a.updatedAt.getTime();
        bVal = b.updatedAt.getTime();
      } else {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      }

      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return results.slice(offset, offset + limit);
  }

  async update(id: string, data: ExperimentUpdate): Promise<Experiment | null> {
    const experiment = this.experiments.get(id);
    if (!experiment) {
      return null;
    }

    const updated: Experiment = {
      ...experiment,
      ...data,
      updatedAt: new Date()
    };

    if (data.status === 'running' && !experiment.startedAt) {
      updated.startedAt = new Date();
    }

    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
      updated.completedAt = new Date();
    }

    this.experiments.set(id, updated);
    await this.persist(updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.experiments.delete(id);
    if (deleted) {
      await this.deleteFromDisk(id);
    }
    return deleted;
  }

  async count(query: ExperimentListQuery = {}): Promise<number> {
    const experiments = await this.findAll({ ...query, limit: undefined, offset: undefined });
    return experiments.length;
  }

  private generateId(): string {
    return `exp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async persist(experiment: Experiment): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      await fs.mkdir(this.storagePath, { recursive: true });
      const filePath = path.join(this.storagePath, `${experiment.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(experiment, null, 2));
    } catch (error) {
      console.error(`Failed to persist experiment ${experiment.id}:`, error);
    }
  }

  private async deleteFromDisk(id: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(this.storagePath, `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete experiment ${id} from disk:`, error);
    }
  }

  async loadFromDisk(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      await fs.mkdir(this.storagePath, { recursive: true });
      const files = await fs.readdir(this.storagePath);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(this.storagePath, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const experiment = JSON.parse(content) as Experiment;
          experiment.createdAt = new Date(experiment.createdAt);
          experiment.updatedAt = new Date(experiment.updatedAt);
          if (experiment.startedAt) {
            experiment.startedAt = new Date(experiment.startedAt);
          }
          if (experiment.completedAt) {
            experiment.completedAt = new Date(experiment.completedAt);
          }
          this.experiments.set(experiment.id, experiment);
        }
      }
    } catch (error) {
      console.error('Failed to load experiments from disk:', error);
    }
  }
}
