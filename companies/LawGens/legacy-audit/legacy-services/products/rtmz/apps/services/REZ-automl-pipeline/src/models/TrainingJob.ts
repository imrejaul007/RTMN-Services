/**
 * TrainingJob Model
 * Represents a training job in the AutoML pipeline
 */

export type JobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface TrainingConfig {
  modelType?: string;
  algorithm?: string;
  hyperparameters?: Record<string, unknown>;
  featureColumns?: string[];
  targetColumn: string;
  testSize?: number;
  cvFolds?: number;
  randomSeed?: number;
  featureStoreId?: string;
  datasetPath?: string;
}

export interface TrainingMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  rocAuc?: number;
  rmse?: number;
  mae?: number;
  r2Score?: number;
  trainingTime: number;
  inferenceTime?: number;
  loss?: number;
  learningCurve?: number[];
  validationScore?: number;
  testScore?: number;
  crossValidationScore?: number;
  crossValidationStd?: number;
}

export interface TrainingResult {
  modelId: string;
  modelPath: string;
  metrics: TrainingMetrics;
  hyperparameters: Record<string, unknown>;
  featureImportance?: Record<string, number>;
  confusionMatrix?: number[][];
  classificationReport?: Record<string, Record<string, number>>;
  predictionsPath?: string;
  artifacts?: Record<string, string>;
}

export interface TrainingJob {
  id: string;
  experimentId?: string;
  name: string;
  config: TrainingConfig;
  status: JobStatus;
  priority: JobPriority;
  result?: TrainingResult;
  progress: number;
  progressMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration?: number;
  actualDuration?: number;
  error?: string;
  retryCount: number;
  maxRetries: number;
  userId?: string;
  tags?: string[];
}

export interface CreateTrainingJobRequest {
  name: string;
  config: TrainingConfig;
  experimentId?: string;
  priority?: JobPriority;
  maxRetries?: number;
  userId?: string;
  tags?: string[];
}

export interface TrainingJobUpdate {
  status?: JobStatus;
  progress?: number;
  progressMessage?: string;
  result?: TrainingResult;
  error?: string;
  retryCount?: number;
}

export interface TrainingJobListQuery {
  status?: JobStatus;
  experimentId?: string;
  priority?: JobPriority;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'priority' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export class TrainingJobModel {
  private jobs: Map<string, TrainingJob> = new Map();
  private storagePath: string;
  private jobQueue: string[] = [];

  constructor(storagePath: string = './jobs') {
    this.storagePath = storagePath;
  }

  async create(data: CreateTrainingJobRequest): Promise<TrainingJob> {
    const id = this.generateId();
    const now = new Date();

    const job: TrainingJob = {
      id,
      experimentId: data.experimentId,
      name: data.name,
      config: data.config,
      status: 'queued',
      priority: data.priority || 'normal',
      progress: 0,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: data.maxRetries || 3,
      userId: data.userId,
      tags: data.tags
    };

    this.jobs.set(id, job);
    this.addToQueue(id);
    await this.persist(job);

    return job;
  }

  async findById(id: string): Promise<TrainingJob | null> {
    return this.jobs.get(id) || null;
  }

  async findAll(query: TrainingJobListQuery = {}): Promise<TrainingJob[]> {
    let results = Array.from(this.jobs.values());

    if (query.status) {
      results = results.filter(j => j.status === query.status);
    }

    if (query.experimentId) {
      results = results.filter(j => j.experimentId === query.experimentId);
    }

    if (query.priority) {
      results = results.filter(j => j.priority === query.priority);
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    results.sort((a, b) => {
      if (sortBy === 'priority') {
        const aVal = priorityOrder[a.priority];
        const bVal = priorityOrder[b.priority];
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      if (sortBy === 'status') {
        const statusOrder = ['queued', 'running', 'completed', 'failed', 'cancelled'];
        const aVal = statusOrder.indexOf(a.status);
        const bVal = statusOrder.indexOf(b.status);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aTime = a.createdAt.getTime();
      const bTime = b.createdAt.getTime();
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });

    const offset = query.offset || 0;
    const limit = query.limit || 100;

    return results.slice(offset, offset + limit);
  }

  async update(id: string, data: TrainingJobUpdate): Promise<TrainingJob | null> {
    const job = this.jobs.get(id);
    if (!job) {
      return null;
    }

    const updated: TrainingJob = {
      ...job,
      ...data,
      updatedAt: new Date()
    };

    if (data.status === 'running' && job.status !== 'running') {
      updated.startedAt = new Date();
    }

    if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
      updated.completedAt = new Date();
      if (updated.startedAt) {
        updated.actualDuration = updated.completedAt.getTime() - updated.startedAt.getTime();
      }
      this.removeFromQueue(id);
    }

    this.jobs.set(id, updated);
    await this.persist(updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    this.removeFromQueue(id);
    const deleted = this.jobs.delete(id);
    if (deleted) {
      await this.deleteFromDisk(id);
    }
    return deleted;
  }

  async getNextJob(): Promise<TrainingJob | null> {
    const priorityOrder: JobPriority[] = ['urgent', 'high', 'normal', 'low'];

    for (const priority of priorityOrder) {
      for (const jobId of this.jobQueue) {
        const job = this.jobs.get(jobId);
        if (job && job.status === 'queued' && job.priority === priority) {
          return job;
        }
      }
    }

    return null;
  }

  async getRunningJobs(): Promise<TrainingJob[]> {
    return Array.from(this.jobs.values()).filter(j => j.status === 'running');
  }

  async getQueuedJobsCount(): Promise<number> {
    return Array.from(this.jobs.values()).filter(j => j.status === 'queued').length;
  }

  async count(query: TrainingJobListQuery = {}): Promise<number> {
    const jobs = await this.findAll({ ...query, limit: undefined, offset: undefined });
    return jobs.length;
  }

  private addToQueue(jobId: string): void {
    const priorityOrder: JobPriority[] = ['urgent', 'high', 'normal', 'low'];
    const job = this.jobs.get(jobId);
    if (!job) return;

    const insertIndex = this.jobQueue.findIndex(id => {
      const queuedJob = this.jobs.get(id);
      if (!queuedJob) return false;
      return priorityOrder.indexOf(job.priority) > priorityOrder.indexOf(queuedJob.priority);
    });

    if (insertIndex === -1) {
      this.jobQueue.push(jobId);
    } else {
      this.jobQueue.splice(insertIndex, 0, jobId);
    }
  }

  private removeFromQueue(jobId: string): void {
    const index = this.jobQueue.indexOf(jobId);
    if (index !== -1) {
      this.jobQueue.splice(index, 1);
    }
  }

  private generateId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async persist(job: TrainingJob): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      await fs.mkdir(this.storagePath, { recursive: true });
      const filePath = path.join(this.storagePath, `${job.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(job, null, 2));
    } catch (error) {
      console.error(`Failed to persist job ${job.id}:`, error);
    }
  }

  private async deleteFromDisk(id: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(this.storagePath, `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete job ${id} from disk:`, error);
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
          const job = JSON.parse(content) as TrainingJob;
          job.createdAt = new Date(job.createdAt);
          job.updatedAt = new Date(job.updatedAt);
          if (job.startedAt) {
            job.startedAt = new Date(job.startedAt);
          }
          if (job.completedAt) {
            job.completedAt = new Date(job.completedAt);
          }
          this.jobs.set(job.id, job);
          if (job.status === 'queued') {
            this.addToQueue(job.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load jobs from disk:', error);
    }
  }
}
