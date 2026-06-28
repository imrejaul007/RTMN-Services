/**
 * Environment Configuration for Fine-tuning Platform
 */

export const config = {
  // Server settings
  port: parseInt(process.env.PORT || '4610', 10),
  host: process.env.HOST || '0.0.0.0',
  env: process.env.NODE_ENV || 'development',

  // Storage paths
  dataDir: process.env.DATA_DIR || './data',
  datasetsDir: process.env.DATA_DIR
    ? `${process.env.DATA_DIR}/datasets`
    : './data/datasets',
  metricsDir: process.env.DATA_DIR
    ? `${process.env.DATA_DIR}/metrics`
    : './data/metrics',
  modelsDir: process.env.MODELS_DIR || './data/models',

  // File upload limits
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '1073741824', 10), // 1GB default
  maxDatasets: parseInt(process.env.MAX_DATASETS || '100', 10),

  // Training defaults
  supportedBaseModels: [
    'llama-3-8b',
    'llama-3-70b',
    'llama-3.1-8b',
    'llama-3.1-70b',
    'mistral-7b',
    'mistral-8x7b',
    'mixtral-8x22b',
    'phi-3-mini',
    'phi-3-medium',
    'gemma-2b',
    'gemma-7b'
  ],

  supportedFormats: ['jsonl', 'csv', 'parquet', 'sft', 'rlhf'],

  quantizationOptions: ['4bit', '8bit', 'none'],

  defaultTrainingConfig: {
    epochs: 3,
    batchSize: 4,
    learningRate: 2e-4,
    maxSeqLength: 2048,
    loraRank: 16,
    quantization: '4bit',
    warmupSteps: 100,
    saveSteps: 500,
    evalSteps: 500,
    gradientAccumulationSteps: 4
  },

  // Cost estimation (mock values per 1B tokens)
  costPerBillionTokens: {
    'llama-3-8b': 0.20,
    'llama-3-70b': 0.90,
    'llama-3.1-8b': 0.20,
    'llama-3.1-70b': 0.90,
    'mistral-7b': 0.24,
    'mistral-8x7b': 0.65,
    'mixtral-8x22b': 1.20,
    'phi-3-mini': 0.10,
    'phi-3-medium': 0.35,
    'gemma-2b': 0.08,
    'gemma-7b': 0.40
  },

  // External GPU service URL (where actual training happens)
  gpuServiceUrl: process.env.GPU_SERVICE_URL || 'http://localhost:4611',

  // Inference endpoint (LLM Gateway)
  inferenceServiceUrl: process.env.INFERENCE_SERVICE_URL || 'http://localhost:4500',

  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10)
};

// Validate configuration
export function validateConfig() {
  const errors = [];

  if (!config.port || config.port < 1024 || config.port > 65535) {
    errors.push('Port must be between 1024 and 65535');
  }

  if (!config.supportedBaseModels.includes('llama-3-8b')) {
    errors.push('At least one base model must be supported');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export default config;