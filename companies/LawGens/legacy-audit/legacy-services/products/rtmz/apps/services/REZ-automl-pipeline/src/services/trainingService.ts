/**
 * Training Service
 * Manages training jobs, queue execution, and model training workflows
 */

import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as fs from 'fs/promises';
import { TrainingJobModel, TrainingJob, CreateTrainingJobRequest, TrainingJobUpdate, TrainingResult } from '../models/TrainingJob';
import { ModelRegistry, CreateModelRequest, ModelUpdate } from '../models/Model';
import { ExperimentModel } from '../models/Experiment';
import { PythonRunner, pythonRunner } from './pythonRunner';
import { ExperimentTracker, experimentTracker } from './experimentTracker';

export interface TrainingOptions {
  maxConcurrentJobs: number;
  jobTimeout: number;
  autoCleanupCompleted: boolean;
  cleanupAfterHours: number;
}

export interface TrainingStatistics {
  totalJobs: number;
  queuedJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageDuration: number;
  successRate: number;
}

export class TrainingService {
  private jobModel: TrainingJobModel;
  private modelRegistry: ModelRegistry;
  private experimentModel: ExperimentModel;
  private pythonRunner: PythonRunner;
  private experimentTracker: ExperimentTracker;
  private options: TrainingOptions;
  private isProcessing: boolean = false;
  private modelStoragePath: string;

  constructor(options?: Partial<TrainingOptions>) {
    this.jobModel = new TrainingJobModel();
    this.modelRegistry = new ModelRegistry();
    this.experimentModel = new ExperimentModel();
    this.pythonRunner = pythonRunner;
    this.experimentTracker = experimentTracker;
    this.modelStoragePath = process.env.MODEL_STORAGE_PATH || './models';

    this.options = {
      maxConcurrentJobs: options?.maxConcurrentJobs || 4,
      jobTimeout: options?.jobTimeout || 3600000,
      autoCleanupCompleted: options?.autoCleanupCompleted ?? true,
      cleanupAfterHours: options?.cleanupAfterHours || 24
    };
  }

  async initialize(): Promise<void> {
    await this.jobModel.loadFromDisk();
    await this.modelRegistry.loadFromDisk();
    await this.experimentModel.loadFromDisk();
    await this.experimentTracker.initialize();

    // Ensure directories exist
    await fs.mkdir(this.modelStoragePath, { recursive: true });
    await fs.mkdir('./jobs', { recursive: true });

    console.log('TrainingService initialized');
  }

  async createJob(request: CreateTrainingJobRequest): Promise<TrainingJob> {
    const job = await this.jobModel.create(request);
    this.scheduleProcessing();
    return job;
  }

  async getJob(jobId: string): Promise<TrainingJob | null> {
    return this.jobModel.findById(jobId);
  }

  async getJobs(query: Parameters<typeof this.jobModel.findAll>[0] = {}): Promise<TrainingJob[]> {
    return this.jobModel.findAll(query);
  }

  async cancelJob(jobId: string): Promise<TrainingJob | null> {
    const job = await this.jobModel.findById(jobId);
    if (!job) {
      return null;
    }

    if (job.status === 'running') {
      // Kill the Python process
      this.pythonRunner.kill(jobId);
    }

    return this.jobModel.update(jobId, { status: 'cancelled' });
  }

  async retryJob(jobId: string): Promise<TrainingJob | null> {
    const job = await this.jobModel.findById(jobId);
    if (!job) {
      return null;
    }

    if (job.status !== 'failed' && job.status !== 'cancelled') {
      throw new Error('Can only retry failed or cancelled jobs');
    }

    const retryCount = job.retryCount + 1;
    if (retryCount > job.maxRetries) {
      throw new Error(`Maximum retry attempts (${job.maxRetries}) exceeded`);
    }

    await this.jobModel.update(jobId, {
      status: 'queued',
      progress: 0,
      error: undefined,
      retryCount
    });

    this.scheduleProcessing();
    return this.jobModel.findById(jobId);
  }

  async startTraining(experimentId?: string): Promise<TrainingJob | null> {
    const job = await this.jobModel.getNextJob();
    if (!job) {
      return null;
    }

    // If experimentId provided, verify it exists
    if (experimentId) {
      const exp = await this.experimentModel.findById(experimentId);
      if (!exp) {
        throw new Error(`Experiment ${experimentId} not found`);
      }
      await this.experimentModel.update(experimentId, { status: 'running' });
    }

    return this.executeJob(job);
  }

  async executeJob(job: TrainingJob): Promise<TrainingJob> {
    await this.jobModel.update(job.id, {
      status: 'running',
      progress: 5,
      progressMessage: 'Initializing training environment'
    });

    try {
      // Prepare training data
      const modelPath = path.join(this.modelStoragePath, `${job.id}_model.pkl`);

      // Prepare script arguments
      const scriptArgs: Record<string, unknown> = {
        job_id: job.id,
        model_path: modelPath,
        target_column: job.config.targetColumn,
        test_size: job.config.testSize || 0.2,
        cv_folds: job.config.cvFolds || 5,
        random_seed: job.config.randomSeed || 42
      };

      if (job.config.modelType) {
        scriptArgs.model_type = job.config.modelType;
      }

      if (job.config.algorithm) {
        scriptArgs.algorithm = job.config.algorithm;
      }

      if (job.config.hyperparameters) {
        scriptArgs.hyperparameters = job.config.hyperparameters;
      }

      if (job.config.featureStoreId) {
        scriptArgs.feature_store_id = job.config.featureStoreId;
      }

      if (job.config.datasetPath) {
        scriptArgs.dataset_path = job.config.datasetPath;
      }

      await this.jobModel.update(job.id, {
        progress: 10,
        progressMessage: 'Executing training script'
      });

      // Execute training
      const result = await this.pythonRunner.executeWithInput(
        { scriptName: 'trainer.py', args: scriptArgs, timeout: this.options.jobTimeout },
        { features: [], labels: [] } // Data would be loaded from feature store or file
      );

      if (!result.success) {
        throw new Error(`Training failed: ${result.stderr}`);
      }

      await this.jobModel.update(job.id, {
        progress: 90,
        progressMessage: 'Processing results'
      });

      // Parse results
      const trainingResult = this.parseTrainingResult(result.output, job.id, modelPath);

      // Create model in registry
      const modelRequest: CreateModelRequest = {
        name: job.name,
        version: '1.0.0',
        type: this.inferModelType(job.config),
        filePath: modelPath,
        metadata: {
          framework: 'sklearn',
          algorithm: job.config.algorithm || job.config.modelType || 'unknown',
          trainingDuration: trainingResult.metrics.trainingTime
        },
        metrics: trainingResult.metrics,
        experimentId: job.experimentId,
        trainingJobId: job.id
      };

      const registeredModel = await this.modelRegistry.create(modelRequest);

      // Update training result with model ID
      trainingResult.modelId = registeredModel.id;

      // Update job as completed
      await this.jobModel.update(job.id, {
        status: 'completed',
        progress: 100,
        progressMessage: 'Training completed successfully',
        result: trainingResult
      });

      // Update model as ready
      await this.modelRegistry.update(registeredModel.id, { status: 'ready' });

      // Update experiment if linked
      if (job.experimentId) {
        await this.experimentModel.update(job.experimentId, {
          status: 'completed',
          result: {
            bestModel: registeredModel.id,
            bestScore: trainingResult.metrics.accuracy || trainingResult.metrics.testScore || 0,
            bestParams: trainingResult.hyperparameters,
            allScores: { [registeredModel.name]: trainingResult.metrics.accuracy || 0 },
            allParams: { [registeredModel.name]: trainingResult.hyperparameters },
            trainingTime: trainingResult.metrics.trainingTime,
            crossValidationScores: [trainingResult.metrics.crossValidationScore || 0]
          }
        });
      }

      // Record metrics in experiment tracker
      await this.experimentTracker.recordMetrics(
        job.experimentId || job.id,
        job.id,
        {
          accuracy: trainingResult.metrics.accuracy || 0,
          f1_score: trainingResult.metrics.f1Score || 0,
          training_time: trainingResult.metrics.trainingTime
        },
        1,
        'test'
      );

      return (await this.jobModel.findById(job.id))!;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.jobModel.update(job.id, {
        status: 'failed',
        error: errorMessage
      });

      if (job.experimentId) {
        await this.experimentModel.update(job.experimentId, {
          status: 'failed',
          error: errorMessage
        });
      }

      throw error;
    }
  }

  async getStatistics(): Promise<TrainingStatistics> {
    const allJobs = await this.jobModel.findAll({});
    const completedJobs = allJobs.filter(j => j.status === 'completed');
    const failedJobs = allJobs.filter(j => j.status === 'failed');
    const completedWithDuration = completedJobs.filter(j => j.actualDuration);
    const avgDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, j) => sum + (j.actualDuration || 0), 0) / completedWithDuration.length
      : 0;

    return {
      totalJobs: allJobs.length,
      queuedJobs: allJobs.filter(j => j.status === 'queued').length,
      runningJobs: allJobs.filter(j => j.status === 'running').length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      averageDuration: avgDuration,
      successRate: allJobs.length > 0 ? completedJobs.length / allJobs.length : 0
    };
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      const runningJobs = await this.jobModel.getRunningJobs();
      const availableSlots = this.options.maxConcurrentJobs - runningJobs.length;

      if (availableSlots <= 0) {
        return;
      }

      for (let i = 0; i < availableSlots; i++) {
        const job = await this.jobModel.getNextJob();
        if (!job) {
          break;
        }

        // Start job execution asynchronously
        this.executeJob(job).catch(error => {
          console.error(`Job ${job.id} execution failed:`, error);
        });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private scheduleProcessing(): void {
    setImmediate(() => this.processQueue());
  }

  private parseTrainingResult(output: unknown, jobId: string, modelPath: string): TrainingResult {
    if (!output || typeof output !== 'object') {
      return {
        modelId: '',
        modelPath,
        metrics: { trainingTime: 0 },
        hyperparameters: {}
      };
    }

    const result = output as Record<string, unknown>;

    const metrics: TrainingResult['metrics'] = {
      trainingTime: (result.training_time as number) || 0,
      accuracy: result.accuracy as number | undefined,
      precision: result.precision as number | undefined,
      recall: result.recall as number | undefined,
      f1Score: result.f1_score as number | undefined,
      rocAuc: result.roc_auc as number | undefined,
      rmse: result.rmse as number | undefined,
      mae: result.mae as number | undefined,
      r2Score: result.r2_score as number | undefined,
      testScore: result.test_score as number | undefined,
      crossValidationScore: result.cv_score as number | undefined,
      crossValidationStd: result.cv_std as number | undefined
    };

    return {
      modelId: (result.model_id as string) || '',
      modelPath,
      metrics,
      hyperparameters: (result.hyperparameters as Record<string, unknown>) || {},
      featureImportance: result.feature_importance as Record<string, number> | undefined,
      confusionMatrix: result.confusion_matrix as number[][] | undefined,
      classificationReport: result.classification_report as Record<string, Record<string, number>> | undefined
    };
  }

  private inferModelType(config: TrainingJob['config']): 'classifier' | 'regressor' | 'clusterer' {
    if (config.modelType) {
      const lower = config.modelType.toLowerCase();
      if (lower.includes('classif') || lower.includes('logistic') || lower.includes('tree') || lower.includes('forest') || lower.includes('svm') || lower.includes('knn')) {
        return 'classifier';
      }
      if (lower.includes('regress') || lower.includes('linear') || lower.includes('ridge') || lower.includes('lasso')) {
        return 'regressor';
      }
      if (lower.includes('cluster') || lower.includes('kmeans')) {
        return 'clusterer';
      }
    }
    return 'classifier';
  }
}

// Singleton instance
export const trainingService = new TrainingService({
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '4', 10),
  jobTimeout: parseInt(process.env.JOB_TIMEOUT_MS || '3600000', 10)
});
