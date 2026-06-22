// Tool definitions for AutoML Pipeline MCP Server
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface CreateExperimentParams {
  name: string;
  datasetId: string;
  targetColumn: string;
  algorithm?: string;
  maxTrials?: number;
  metric?: string;
}

export interface StartTrainingParams {
  experimentId: string;
  modelType?: string;
  hyperparameters?: Record<string, unknown>;
  validationSplit?: number;
}

export interface CompareModelsParams {
  experimentIds: string[];
}

// Mock data generators
function generateExperimentId(): string {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateModelId(): string {
  return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function generateMockExperiment(params: CreateExperimentParams): {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  datasetId: string;
  bestModelId?: string;
  metrics?: Record<string, number>;
} {
  return {
    id: generateExperimentId(),
    name: params.name,
    status: 'pending',
    createdAt: new Date().toISOString(),
    datasetId: params.datasetId,
    bestModelId: undefined,
    metrics: undefined
  };
}

function generateMockTrainingStatus(experimentId: string): {
  experimentId: string;
  status: string;
  currentTrial: number;
  totalTrials: number;
  bestMetrics?: Record<string, number>;
  estimatedTimeRemaining?: number;
} {
  const trials = Math.floor(Math.random() * 10) + 1;
  const currentTrial = Math.floor(Math.random() * trials);
  return {
    experimentId,
    status: currentTrial >= trials ? 'completed' : 'running',
    currentTrial,
    totalTrials: trials,
    bestMetrics: {
      accuracy: 0.85 + Math.random() * 0.1,
      precision: 0.82 + Math.random() * 0.1,
      recall: 0.80 + Math.random() * 0.12,
      f1Score: 0.81 + Math.random() * 0.11
    },
    estimatedTimeRemaining: currentTrial >= trials ? 0 : Math.floor(Math.random() * 300) + 60
  };
}

function generateMockResults(experimentId: string): {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  datasetId: string;
  bestModelId?: string;
  metrics: Record<string, number>;
  featureImportance?: Record<string, number>;
  trainingHistory?: Array<{ epoch: number; loss: number; accuracy: number }>;
} {
  const modelId = generateModelId();
  return {
    id: experimentId,
    name: `Experiment ${experimentId}`,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    datasetId: 'ds_default',
    bestModelId: modelId,
    metrics: {
      accuracy: 0.89 + Math.random() * 0.08,
      precision: 0.87 + Math.random() * 0.08,
      recall: 0.86 + Math.random() * 0.1,
      f1Score: 0.86 + Math.random() * 0.09,
      auc: 0.92 + Math.random() * 0.05
    },
    featureImportance: {
      feature_1: 0.32,
      feature_2: 0.24,
      feature_3: 0.18,
      feature_4: 0.14,
      feature_5: 0.12
    },
    trainingHistory: Array.from({ length: 50 }, (_, i) => ({
      epoch: i + 1,
      loss: 1.0 - (i / 50) * 0.8 + Math.random() * 0.05,
      accuracy: 0.5 + (i / 50) * 0.45 + Math.random() * 0.05
    }))
  };
}

function generateMockComparison(experimentIds: string[]): Array<{
  id: string;
  name: string;
  status: string;
  createdAt: string;
  datasetId: string;
  bestModelId?: string;
  metrics: Record<string, number>;
}> {
  return experimentIds.map((id, index) => ({
    id,
    name: `Experiment ${index + 1}`,
    status: 'completed',
    createdAt: new Date(Date.now() - 86400000 * (index + 1)).toISOString(),
    datasetId: 'ds_default',
    bestModelId: generateModelId(),
    metrics: {
      accuracy: 0.85 + Math.random() * 0.12,
      precision: 0.83 + Math.random() * 0.12,
      recall: 0.82 + Math.random() * 0.13,
      f1Score: 0.82 + Math.random() * 0.12,
      auc: 0.88 + Math.random() * 0.1
    }
  }));
}

export const tools: Tool[] = [
  {
    name: "create_experiment",
    description: "Create a new AutoML experiment with specified configuration",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name for the experiment"
        },
        datasetId: {
          type: "string",
          description: "ID of the dataset to use for training"
        },
        targetColumn: {
          type: "string",
          description: "Target column name for prediction"
        },
        algorithm: {
          type: "string",
          enum: ["auto", "random_forest", "xgboost", "lightgbm", "neural_network", "logistic_regression"],
          description: "Algorithm to use (auto for automatic selection)"
        },
        maxTrials: {
          type: "number",
          minimum: 1,
          maximum: 100,
          description: "Maximum number of trials to run"
        },
        metric: {
          type: "string",
          enum: ["accuracy", "precision", "recall", "f1", "auc", "loss"],
          description: "Optimization metric"
        }
      },
      required: ["name", "datasetId", "targetColumn"]
    }
  },
  {
    name: "start_training",
    description: "Start training for an existing experiment",
    inputSchema: {
      type: "object",
      properties: {
        experimentId: {
          type: "string",
          description: "ID of the experiment to train"
        },
        modelType: {
          type: "string",
          enum: ["classification", "regression", "clustering"],
          description: "Type of model to train"
        },
        hyperparameters: {
          type: "object",
          description: "Custom hyperparameters for the model"
        },
        validationSplit: {
          type: "number",
          minimum: 0.1,
          maximum: 0.5,
          description: "Fraction of data to use for validation"
        }
      },
      required: ["experimentId"]
    }
  },
  {
    name: "get_training_status",
    description: "Get the current status of an experiment's training",
    inputSchema: {
      type: "object",
      properties: {
        experimentId: {
          type: "string",
          description: "ID of the experiment"
        }
      },
      required: ["experimentId"]
    }
  },
  {
    name: "get_experiment_results",
    description: "Get the results of a completed experiment including metrics and models",
    inputSchema: {
      type: "object",
      properties: {
        experimentId: {
          type: "string",
          description: "ID of the experiment"
        }
      },
      required: ["experimentId"]
    }
  },
  {
    name: "compare_models",
    description: "Compare metrics across multiple experiments or models",
    inputSchema: {
      type: "object",
      properties: {
        experimentIds: {
          type: "array",
          items: { type: "string" },
          minItems: 2,
          maxItems: 10,
          description: "Array of experiment IDs to compare"
        }
      },
      required: ["experimentIds"]
    }
  }
];

export const toolHandlers: Record<string, (params: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>> = {
  create_experiment: async (params) => {
    const mockExperiment = generateMockExperiment(params as CreateExperimentParams);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          experiment: mockExperiment,
          message: `Experiment '${mockExperiment.name}' created successfully`
        }, null, 2)
      }]
    };
  },

  start_training: async (params) => {
    const { experimentId } = params as StartTrainingParams;
    const mockStatus = generateMockTrainingStatus(experimentId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          status: mockStatus,
          message: `Training started for experiment ${experimentId}`
        }, null, 2)
      }]
    };
  },

  get_training_status: async (params) => {
    const { experimentId } = params as { experimentId: string };
    const mockStatus = generateMockTrainingStatus(experimentId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          status: mockStatus
        }, null, 2)
      }]
    };
  },

  get_experiment_results: async (params) => {
    const { experimentId } = params as { experimentId: string };
    const mockResults = generateMockResults(experimentId);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          results: mockResults
        }, null, 2)
      }]
    };
  },

  compare_models: async (params) => {
    const { experimentIds } = params as CompareModelsParams;
    const mockComparison = generateMockComparison(experimentIds);
    const accuracies = mockComparison.map(e => e.metrics.accuracy);
    const maxAccuracy = Math.max(...accuracies);
    const bestIndex = accuracies.indexOf(maxAccuracy);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          source: 'mock',
          experiments: mockComparison,
          bestExperiment: mockComparison[bestIndex],
          comparison: {
            metricsCompared: ['accuracy', 'precision', 'recall', 'f1Score', 'auc'],
            winner: mockComparison[bestIndex]?.id
          }
        }, null, 2)
      }]
    };
  }
};
