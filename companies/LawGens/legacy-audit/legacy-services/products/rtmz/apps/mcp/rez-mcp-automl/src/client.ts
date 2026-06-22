// REST Client for AutoML Pipeline Service
const AUTOML_SERVICE_URL = process.env.AUTOML_SERVICE_URL || 'http://localhost:5001';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';

export interface ExperimentConfig {
  name: string;
  datasetId: string;
  targetColumn: string;
  algorithm?: string;
  maxTrials?: number;
  metric?: string;
}

export interface TrainingConfig {
  experimentId: string;
  modelType?: string;
  hyperparameters?: Record<string, unknown>;
  validationSplit?: number;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  loss?: number;
}

export interface Experiment {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  datasetId: string;
  bestModelId?: string;
  metrics?: ModelMetrics;
}

export interface TrainingStatus {
  experimentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentTrial: number;
  totalTrials: number;
  bestMetrics?: ModelMetrics;
  estimatedTimeRemaining?: number;
}

export async function fetchFromAutoML<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const response = await fetch(`${AUTOML_SERVICE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Token': INTERNAL_SERVICE_TOKEN,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json() as T;
  } catch (error) {
    console.error(`AutoML API error (${endpoint}):`, error);
    return null;
  }
}

// Create a new experiment
export async function createExperiment(config: ExperimentConfig): Promise<Experiment | null> {
  return fetchFromAutoML<Experiment>('/api/experiments', {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

// Start training for an experiment
export async function startTraining(config: TrainingConfig): Promise<TrainingStatus | null> {
  return fetchFromAutoML<TrainingStatus>(`/api/experiments/${config.experimentId}/train`, {
    method: 'POST',
    body: JSON.stringify(config)
  });
}

// Get training status
export async function getTrainingStatus(experimentId: string): Promise<TrainingStatus | null> {
  return fetchFromAutoML<TrainingStatus>(`/api/experiments/${experimentId}/status`);
}

// Get experiment results
export async function getExperimentResults(experimentId: string): Promise<Experiment | null> {
  return fetchFromAutoML<Experiment>(`/api/experiments/${experimentId}/results`);
}

// Compare models
export async function compareModels(experimentIds: string[]): Promise<Experiment[] | null> {
  return fetchFromAutoML<Experiment[]>(`/api/models/compare?ids=${experimentIds.join(',')}`);
}
