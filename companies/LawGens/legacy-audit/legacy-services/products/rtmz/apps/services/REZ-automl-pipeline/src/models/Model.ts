/**
 * Model Model
 * Represents a registered ML model in the AutoML pipeline
 */

export type ModelType = 'classifier' | 'regressor' | 'clusterer' | 'transformer';
export type ModelStatus = 'training' | 'ready' | 'deployed' | 'archived' | 'failed';

export interface ModelMetadata {
  framework: string;
  frameworkVersion: string;
  algorithm: string;
  taskType: ModelType;
  inputShape?: number[];
  outputShape?: number[];
  classes?: string[];
  trainingDate: Date;
  trainingDuration?: number;
  datasetSize?: number;
  featureCount?: number;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  rocAuc?: number;
  rmse?: number;
  mae?: number;
  r2Score?: number;
  crossValidationScore?: number;
  crossValidationStd?: number;
  testScore?: number;
}

export interface ModelComparison {
  modelId1: string;
  modelId2: string;
  metricsCompared: string[];
  winner: string;
  scoreDifferences: Record<string, number>;
  recommendations: string[];
}

export interface Model {
  id: string;
  name: string;
  version: string;
  description?: string;
  type: ModelType;
  status: ModelStatus;
  filePath: string;
  metadata: ModelMetadata;
  metrics: ModelMetrics;
  experimentId?: string;
  trainingJobId?: string;
  parentModelId?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  deployedAt?: Date;
  archivedAt?: Date;
  userId?: string;
  environment?: string;
}

export interface CreateModelRequest {
  name: string;
  version: string;
  description?: string;
  type: ModelType;
  filePath: string;
  metadata: Partial<ModelMetadata>;
  metrics: ModelMetrics;
  experimentId?: string;
  trainingJobId?: string;
  parentModelId?: string;
  tags?: string[];
  userId?: string;
  environment?: string;
}

export interface ModelUpdate {
  status?: ModelStatus;
  metrics?: ModelMetrics;
  description?: string;
  tags?: string[];
  deployedAt?: Date;
  archivedAt?: Date;
}

export interface ModelListQuery {
  status?: ModelStatus;
  type?: ModelType;
  name?: string;
  experimentId?: string;
  trainingJobId?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'name' | 'metrics.accuracy' | 'metrics.f1Score';
  sortOrder?: 'asc' | 'desc';
}

export interface ModelCompareRequest {
  modelIds: string[];
  metrics?: string[];
}

export class ModelRegistry {
  private models: Map<string, Model> = new Map();
  private storagePath: string;

  constructor(storagePath: string = './models') {
    this.storagePath = storagePath;
  }

  async create(data: CreateModelRequest): Promise<Model> {
    const id = this.generateId();
    const now = new Date();

    const model: Model = {
      id,
      name: data.name,
      version: data.version,
      description: data.description,
      type: data.type,
      status: 'training',
      filePath: data.filePath,
      metadata: {
        framework: data.metadata.framework || 'sklearn',
        frameworkVersion: data.metadata.frameworkVersion || '1.0.0',
        algorithm: data.metadata.algorithm || 'unknown',
        taskType: data.type,
        inputShape: data.metadata.inputShape,
        outputShape: data.metadata.outputShape,
        classes: data.metadata.classes,
        trainingDate: data.metadata.trainingDate || now,
        trainingDuration: data.metadata.trainingDuration,
        datasetSize: data.metadata.datasetSize,
        featureCount: data.metadata.featureCount
      },
      metrics: data.metrics,
      experimentId: data.experimentId,
      trainingJobId: data.trainingJobId,
      parentModelId: data.parentModelId,
      tags: data.tags,
      createdAt: now,
      updatedAt: now,
      userId: data.userId,
      environment: data.environment
    };

    this.models.set(id, model);
    await this.persist(model);

    return model;
  }

  async findById(id: string): Promise<Model | null> {
    return this.models.get(id) || null;
  }

  async findByName(name: string): Promise<Model[]> {
    const models = Array.from(this.models.values())
      .filter(m => m.name === name)
      .sort((a, b) => b.version.localeCompare(a.version));
    return models;
  }

  async findAll(query: ModelListQuery = {}): Promise<Model[]> {
    let results = Array.from(this.models.values());

    if (query.status) {
      results = results.filter(m => m.status === query.status);
    }

    if (query.type) {
      results = results.filter(m => m.type === query.type);
    }

    if (query.name) {
      results = results.filter(m => m.name.toLowerCase().includes(query.name!.toLowerCase()));
    }

    if (query.experimentId) {
      results = results.filter(m => m.experimentId === query.experimentId);
    }

    if (query.trainingJobId) {
      results = results.filter(m => m.trainingJobId === query.trainingJobId);
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter(m =>
        query.tags!.some(tag => m.tags?.includes(tag))
      );
    }

    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    results.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }

      if (sortBy === 'metrics.accuracy' || sortBy === 'metrics.f1Score') {
        const metricKey = sortBy.split('.')[1] as keyof ModelMetrics;
        const aVal = (a.metrics[metricKey] as number) || 0;
        const bVal = (b.metrics[metricKey] as number) || 0;
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

  async update(id: string, data: ModelUpdate): Promise<Model | null> {
    const model = this.models.get(id);
    if (!model) {
      return null;
    }

    const updated: Model = {
      ...model,
      ...data,
      updatedAt: new Date()
    };

    if (data.status === 'ready' && model.status === 'training') {
      // Model training completed
    }

    if (data.status === 'deployed' && !model.deployedAt) {
      updated.deployedAt = new Date();
    }

    if (data.status === 'archived' && !model.archivedAt) {
      updated.archivedAt = new Date();
    }

    this.models.set(id, updated);
    await this.persist(updated);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.models.delete(id);
    if (deleted) {
      await this.deleteFromDisk(id);
    }
    return deleted;
  }

  async compare(modelIds: string[], metrics?: string[]): Promise<ModelComparison[]> {
    const models = modelIds.map(id => this.models.get(id)).filter((m): m is Model => m !== undefined);

    if (models.length < 2) {
      throw new Error('At least two models are required for comparison');
    }

    const comparisons: ModelComparison[] = [];
    const metricsToCompare = metrics || ['accuracy', 'f1Score', 'precision', 'recall', 'rocAuc'];

    for (let i = 0; i < models.length; i++) {
      for (let j = i + 1; j < models.length; j++) {
        const model1 = models[i];
        const model2 = models[j];

        const scoreDifferences: Record<string, number> = {};
        let bestModelId = model1.id;
        let bestScore = 0;

        for (const metric of metricsToCompare) {
          const val1 = (model1.metrics[metric as keyof ModelMetrics] as number) || 0;
          const val2 = (model2.metrics[metric as keyof ModelMetrics] as number) || 0;
          scoreDifferences[metric] = val1 - val2;

          const avgScore = (val1 + val2) / 2;
          if (avgScore > bestScore) {
            bestScore = avgScore;
            bestModelId = val1 >= val2 ? model1.id : model2.id;
          }
        }

        const recommendations: string[] = [];
        for (const metric of metricsToCompare) {
          const diff = scoreDifferences[metric];
          if (Math.abs(diff) > 0.05) {
            const betterModel = diff > 0 ? model1.name : model2.name;
            recommendations.push(
              `${betterModel} significantly outperforms on ${metric} (${Math.abs(diff * 100).toFixed(2)}% difference)`
            );
          }
        }

        comparisons.push({
          modelId1: model1.id,
          modelId2: model2.id,
          metricsCompared: metricsToCompare,
          winner: bestModelId,
          scoreDifferences,
          recommendations
        });
      }
    }

    return comparisons;
  }

  async getLatestByName(name: string): Promise<Model | null> {
    const versions = await this.findByName(name);
    return versions[0] || null;
  }

  async count(query: ModelListQuery = {}): Promise<number> {
    const models = await this.findAll({ ...query, limit: undefined, offset: undefined });
    return models.length;
  }

  private generateId(): string {
    return `model_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async persist(model: Model): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      await fs.mkdir(this.storagePath, { recursive: true });
      const filePath = path.join(this.storagePath, `${model.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(model, null, 2));
    } catch (error) {
      console.error(`Failed to persist model ${model.id}:`, error);
    }
  }

  private async deleteFromDisk(id: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      const filePath = path.join(this.storagePath, `${id}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete model ${id} from disk:`, error);
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
          const model = JSON.parse(content) as Model;
          model.metadata.trainingDate = new Date(model.metadata.trainingDate);
          model.createdAt = new Date(model.createdAt);
          model.updatedAt = new Date(model.updatedAt);
          if (model.deployedAt) {
            model.deployedAt = new Date(model.deployedAt);
          }
          if (model.archivedAt) {
            model.archivedAt = new Date(model.archivedAt);
          }
          this.models.set(model.id, model);
        }
      }
    } catch (error) {
      console.error('Failed to load models from disk:', error);
    }
  }
}
