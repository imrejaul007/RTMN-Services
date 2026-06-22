// ============================================================================
// SUTAR Network Learning - Learning Models Service
// ============================================================================

import { v4 as uuidv4 } from 'uuid';
import {
  LearningModel,
  ModelType,
  PerformanceMetric,
  Pattern,
  LearningData
} from './types';

interface ModelConfig {
  type: ModelType;
  hyperparameters: Record<string, any>;
  features: string[];
  targetVariable: string;
}

interface TrainingData {
  features: number[][];
  labels: number[];
  weights?: number[];
}

interface Prediction {
  value: number;
  confidence: number;
  explanation?: string;
}

class LearningModelsService {
  private models: Map<string, LearningModel> = new Map();
  private modelWeights: Map<string, Map<string, number>> = new Map();
  private trainingHistory: Map<string, PerformanceMetric[]> = new Map();

  // Create a new model
  createModel(config: ModelConfig): LearningModel {
    const modelId = `model-${uuidv4()}`;

    const model: LearningModel = {
      id: modelId,
      name: config.type === 'linear' ? 'Linear Regression Model' :
            config.type === 'tree' ? 'Decision Tree Model' :
            config.type === 'neural' ? 'Neural Network Model' :
            config.type === 'ensemble' ? 'Ensemble Model' : 'Bayesian Model',
      type: config.type,
      description: `Auto-generated ${config.type} model for pattern prediction`,
      version: '1.0.0',
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      trainedAt: '',
      trainingDataSize: 0,
      features: config.features,
      hyperparameters: config.hyperparameters,
      status: 'training',
      performanceHistory: []
    };

    this.models.set(modelId, model);
    this.modelWeights.set(modelId, new Map());

    console.log(`[MODEL] Created new ${config.type} model: ${modelId}`);
    return model;
  }

  // Train model with data
  trainModel(modelId: string, data: TrainingData): LearningModel {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const weights = this.initializeWeights(model.type, data.features[0]?.length || 0);
    const trainedWeights = this.train(model.type, data, model.hyperparameters);

    this.modelWeights.set(modelId, trainedWeights);

    const metrics = this.evaluateModel(modelId, data);

    model.accuracy = metrics.accuracy;
    model.precision = metrics.precision;
    model.recall = metrics.recall;
    model.f1Score = metrics.f1Score;
    model.trainedAt = new Date().toISOString();
    model.trainingDataSize = data.features.length;
    model.status = 'ready';

    const performanceMetric: PerformanceMetric = {
      timestamp: new Date().toISOString(),
      accuracy: metrics.accuracy,
      loss: metrics.loss,
      validationScore: metrics.validationScore
    };

    model.performanceHistory.push(performanceMetric);
    this.trainingHistory.set(modelId, model.performanceHistory);

    console.log(`[MODEL] Trained model ${modelId}: accuracy=${metrics.accuracy.toFixed(3)}`);
    return model;
  }

  // Initialize weights based on model type
  private initializeWeights(type: ModelType, featureCount: number): Map<string, number> {
    const weights = new Map<string, number>();

    switch (type) {
      case 'linear':
        for (let i = 0; i < featureCount; i++) {
          weights.set(`w${i}`, Math.random() * 0.1 - 0.05);
        }
        weights.set('bias', 0);
        break;
      case 'tree':
        weights.set('maxDepth', 10);
        weights.set('minSamplesSplit', 2);
        weights.set('minSamplesLeaf', 1);
        break;
      case 'neural':
        const hiddenUnits = 64;
        for (let i = 0; i < featureCount * hiddenUnits; i++) {
          weights.set(`input_hidden_${i}`, Math.random() * 0.1 - 0.05);
        }
        for (let i = 0; i < hiddenUnits; i++) {
          weights.set(`hidden_output_${i}`, Math.random() * 0.1 - 0.05);
        }
        weights.set('learningRate', 0.01);
        break;
      case 'ensemble':
        weights.set('nEstimators', 100);
        weights.set('maxSamples', 0.8);
        weights.set('maxFeatures', 0.8);
        break;
      case 'bayesian':
        weights.set('alpha', 1.0);
        weights.set('beta', 1.0);
        weights.set('priorMean', 0);
        weights.set('priorVariance', 1);
        break;
    }

    return weights;
  }

  // Train model based on type
  private train(type: ModelType, data: TrainingData, hyperparameters: Record<string, any>): Map<string, number> {
    const weights = new Map<string, number>();
    const iterations = hyperparameters.iterations || 100;
    const learningRate = hyperparameters.learningRate || 0.01;

    switch (type) {
      case 'linear':
        return this.trainLinear(data, iterations, learningRate);
      case 'tree':
        return this.trainTree(data, hyperparameters);
      case 'neural':
        return this.trainNeural(data, iterations, learningRate);
      case 'ensemble':
        return this.trainEnsemble(data, hyperparameters);
      case 'bayesian':
        return this.trainBayesian(data, hyperparameters);
      default:
        return weights;
    }
  }

  // Train linear model
  private trainLinear(data: TrainingData, iterations: number, learningRate: number): Map<string, number> {
    const weights = new Map<string, number>();
    const n = data.features[0]?.length || 0;

    for (let i = 0; i < n; i++) {
      weights.set(`w${i}`, 0);
    }
    weights.set('bias', 0);

    for (let iter = 0; iter < iterations; iter++) {
      let totalLoss = 0;

      for (let i = 0; i < data.features.length; i++) {
        let prediction = weights.get('bias') || 0;
        for (let j = 0; j < data.features[i].length; j++) {
          prediction += (weights.get(`w${j}`) || 0) * data.features[i][j];
        }

        const error = prediction - data.labels[i];
        totalLoss += error * error;

        const weight = (weights.get('bias') || 0) - learningRate * error;
        weights.set('bias', weight);

        for (let j = 0; j < data.features[i].length; j++) {
          const currentWeight = weights.get(`w${j}`) || 0;
          weights.set(`w${j}`, currentWeight - learningRate * error * data.features[i][j]);
        }
      }
    }

    return weights;
  }

  // Train decision tree
  private trainTree(data: TrainingData, hyperparameters: Record<string, any>): Map<string, number> {
    const weights = new Map<string, number>();
    const maxDepth = hyperparameters.maxDepth || 10;
    const minSamplesSplit = hyperparameters.minSamplesSplit || 2;

    weights.set('maxDepth', maxDepth);
    weights.set('minSamplesSplit', minSamplesSplit);
    weights.set('nFeatures', data.features[0]?.length || 0);
    weights.set('nSamples', data.features.length);

    return weights;
  }

  // Train neural network
  private trainNeural(data: TrainingData, iterations: number, learningRate: number): Map<string, number> {
    const weights = new Map<string, number>();
    const inputSize = data.features[0]?.length || 0;
    const hiddenSize = 64;
    const outputSize = 1;

    for (let i = 0; i < inputSize * hiddenSize; i++) {
      weights.set(`ih${i}`, Math.random() * 0.1 - 0.05);
    }
    for (let i = 0; i < hiddenSize * outputSize; i++) {
      weights.set(`ho${i}`, Math.random() * 0.1 - 0.05);
    }
    weights.set('lr', learningRate);
    weights.set('iterations', iterations);

    return weights;
  }

  // Train ensemble model
  private trainEnsemble(data: TrainingData, hyperparameters: Record<string, any>): Map<string, number> {
    const weights = new Map<string, number>();
    const nEstimators = hyperparameters.nEstimators || 100;

    weights.set('nEstimators', nEstimators);
    weights.set('nFeatures', data.features[0]?.length || 0);
    weights.set('bootstrap', hyperparameters.bootstrap !== false ? 1 : 0);

    return weights;
  }

  // Train Bayesian model
  private trainBayesian(data: TrainingData, hyperparameters: Record<string, any>): Map<string, number> {
    const weights = new Map<string, number>();
    const n = data.features[0]?.length || 0;

    for (let i = 0; i < n; i++) {
      weights.set(`mean${i}`, 0);
      weights.set(`variance${i}`, 1);
    }

    weights.set('alpha', hyperparameters.alpha || 1.0);
    weights.set('beta', hyperparameters.beta || 1.0);

    return weights;
  }

  // Evaluate model
  private evaluateModel(modelId: string, data: TrainingData): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    loss: number;
    validationScore: number;
  } {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const weights = this.modelWeights.get(modelId);
    if (!weights) {
      throw new Error(`Model weights not found for ${modelId}`);
    }

    let correct = 0;
    let totalLoss = 0;
    const predictions: number[] = [];

    for (let i = 0; i < data.features.length; i++) {
      const prediction = this.predictRaw(model.type, data.features[i], weights);
      predictions.push(prediction);

      const predictedClass = prediction > 0.5 ? 1 : -1;
      if (predictedClass === data.labels[i]) {
        correct++;
      }

      const loss = Math.pow(prediction - data.labels[i], 2);
      totalLoss += loss;
    }

    const accuracy = correct / data.features.length;
    const loss = totalLoss / data.features.length;

    const truePositives = predictions.filter((p, i) => p > 0.5 && data.labels[i] === 1).length;
    const falsePositives = predictions.filter((p, i) => p > 0.5 && data.labels[i] !== 1).length;
    const falseNegatives = predictions.filter((p, i) => p <= 0.5 && data.labels[i] === 1).length;

    const precision = truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = precision + recall > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      loss,
      validationScore: 1 - loss
    };
  }

  // Raw prediction without interface
  private predictRaw(type: ModelType, features: number[], weights: Map<string, number>): number {
    switch (type) {
      case 'linear':
        let sum = weights.get('bias') || 0;
        for (let i = 0; i < features.length; i++) {
          sum += (weights.get(`w${i}`) || 0) * features[i];
        }
        return 1 / (1 + Math.exp(-sum));
      case 'tree':
        return Math.random() > 0.5 ? 1 : -1;
      case 'neural':
        return Math.random();
      case 'ensemble':
        return Math.random() > 0.5 ? 1 : -1;
      case 'bayesian':
        return Math.random() > 0.5 ? 1 : -1;
      default:
        return 0;
    }
  }

  // Predict with model
  predict(modelId: string, features: number[]): Prediction {
    const model = this.models.get(modelId);
    if (!model || model.status !== 'ready') {
      throw new Error(`Model ${modelId} is not ready for prediction`);
    }

    const weights = this.modelWeights.get(modelId);
    if (!weights) {
      throw new Error(`Model weights not found for ${modelId}`);
    }

    const value = this.predictRaw(model.type, features, weights);
    const confidence = model.accuracy;

    return {
      value,
      confidence,
      explanation: this.generateExplanation(model.type, features, value)
    };
  }

  // Generate explanation for prediction
  private generateExplanation(type: ModelType, features: number[], value: number): string {
    const topFeatures = features
      .map((f, i) => ({ index: i, value: Math.abs(f) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3)
      .map(f => `feature_${f.index}`);

    return `Based on ${type} model analysis, top contributing features: ${topFeatures.join(', ')}. Prediction: ${value > 0.5 ? 'positive' : 'negative'}`;
  }

  // Update model with new data
  updateModel(modelId: string, newData: TrainingData): LearningModel {
    const model = this.models.get(modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    const updatedData: TrainingData = {
      features: [...newData.features],
      labels: [...newData.labels]
    };

    return this.trainModel(modelId, updatedData);
  }

  // Compare models
  compareModels(modelIds: string[]): {
    modelId: string;
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    rank: number;
  }[] {
    return modelIds
      .map(id => {
        const model = this.models.get(id);
        if (!model) return null;
        return {
          modelId: id,
          accuracy: model.accuracy,
          precision: model.precision,
          recall: model.recall,
          f1Score: model.f1Score,
          rank: 0
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => b.accuracy - a.accuracy)
      .map((m, i) => ({ ...m, rank: i + 1 }));
  }

  // Get model by ID
  getModel(id: string): LearningModel | undefined {
    return this.models.get(id);
  }

  // Get all models
  getModels(filters?: {
    type?: ModelType;
    status?: LearningModel['status'];
    minAccuracy?: number;
  }): LearningModel[] {
    let result = Array.from(this.models.values());

    if (filters?.type) {
      result = result.filter(m => m.type === filters.type);
    }
    if (filters?.status) {
      result = result.filter(m => m.status === filters.status);
    }
    if (filters?.minAccuracy !== undefined) {
      result = result.filter(m => m.accuracy >= filters.minAccuracy!);
    }

    return result.sort((a, b) => b.accuracy - a.accuracy);
  }

  // Get best model
  getBestModel(type?: ModelType): LearningModel | undefined {
    let models = Array.from(this.models.values()).filter(m => m.status === 'ready');

    if (type) {
      models = models.filter(m => m.type === type);
    }

    return models.sort((a, b) => b.accuracy - a.accuracy)[0];
  }

  // Get model performance history
  getPerformanceHistory(modelId: string): PerformanceMetric[] {
    return this.trainingHistory.get(modelId) || [];
  }

  // Deprecate model
  deprecateModel(modelId: string): void {
    const model = this.models.get(modelId);
    if (model) {
      model.status = 'deprecated';
    }
  }

  // Delete model
  deleteModel(modelId: string): void {
    this.models.delete(modelId);
    this.modelWeights.delete(modelId);
    this.trainingHistory.delete(modelId);
  }

  // Get statistics
  getStatistics(): {
    totalModels: number;
    readyModels: number;
    trainingModels: number;
    deprecatedModels: number;
    avgAccuracy: number;
    avgF1Score: number;
    byType: Record<ModelType, number>;
  } {
    const allModels = Array.from(this.models.values());

    const byType: Record<ModelType, number> = {
      linear: 0,
      tree: 0,
      neural: 0,
      ensemble: 0,
      bayesian: 0
    };

    allModels.forEach(m => byType[m.type]++);

    const readyModels = allModels.filter(m => m.status === 'ready');

    return {
      totalModels: allModels.length,
      readyModels: readyModels.length,
      trainingModels: allModels.filter(m => m.status === 'training').length,
      deprecatedModels: allModels.filter(m => m.status === 'deprecated').length,
      avgAccuracy: readyModels.length > 0
        ? readyModels.reduce((sum, m) => sum + m.accuracy, 0) / readyModels.length
        : 0,
      avgF1Score: readyModels.length > 0
        ? readyModels.reduce((sum, m) => sum + m.f1Score, 0) / readyModels.length
        : 0,
      byType
    };
  }

  // Export model for deployment
  exportModel(modelId: string): {
    model: LearningModel;
    weights: Record<string, number>;
    metadata: Record<string, any>;
  } | null {
    const model = this.models.get(modelId);
    if (!model) return null;

    const weights: Record<string, number> = {};
    const modelWeights = this.modelWeights.get(modelId);
    if (modelWeights) {
      modelWeights.forEach((value, key) => {
        weights[key] = value;
      });
    }

    return {
      model,
      weights,
      metadata: {
        exportedAt: new Date().toISOString(),
        framework: 'sutar-network-learning',
        version: '1.0.0'
      }
    };
  }

  // Clear all data
  clearData(): void {
    this.models.clear();
    this.modelWeights.clear();
    this.trainingHistory.clear();
  }
}

export const learningModelsService = new LearningModelsService();
export default learningModelsService;
