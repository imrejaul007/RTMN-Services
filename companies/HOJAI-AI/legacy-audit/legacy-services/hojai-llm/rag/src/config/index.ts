/**
 * HOJAI RAG Service Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: parseInt(process.env.PORT || '4731', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  serviceName: 'hojai-rag',
  version: '1.0.0',

  // Vector service URL (for embedding generation)
  vectorServiceUrl: process.env.VECTOR_SERVICE_URL || 'http://localhost:4721',

  // LLM provider settings
  llmProvider: process.env.LLM_PROVIDER || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',

  // Default embedding settings
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002',
  embeddingDimension: parseInt(process.env.EMBEDDING_DIMENSION || '1536', 10),

  // RAG settings
  defaultSearchLimit: parseInt(process.env.DEFAULT_SEARCH_LIMIT || '10', 10),
  defaultMinScore: parseFloat(process.env.DEFAULT_MIN_SCORE || '0.0'),
  defaultMaxTokens: parseInt(process.env.DEFAULT_MAX_TOKENS || '1000', 10),
  defaultTemperature: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.7'),

  // Internal service auth
  internalServiceToken: process.env.INTERNAL_SERVICE_TOKEN,
};

export default config;
