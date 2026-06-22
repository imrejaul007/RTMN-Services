/**
 * HOJAI Embedding Service - OpenAI Service
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: OpenAI embeddings API integration
 */

import OpenAI from 'openai';
import { Logger } from '../utils/logger.js';
import type {
  EmbedModelId,
  OpenAIEmbeddingResult,
  OpenAIBatchResult,
} from '../types/index.js';

// ============================================================================
// Model Configuration
// ============================================================================

interface ModelConfig {
  dimensions: number;
  maxTokens: number;
  description: string;
}

const MODEL_CONFIGS: Record<EmbedModelId, ModelConfig> = {
  'text-embedding-3-small': {
    dimensions: 1536,
    maxTokens: 8191,
    description: 'Most efficient embedding model (1536 dimensions)',
  },
  'text-embedding-3-large': {
    dimensions: 3072,
    maxTokens: 8191,
    description: 'Highest quality embedding model (3072 dimensions)',
  },
};

const DEFAULT_MODEL: EmbedModelId = 'text-embedding-3-small';

// ============================================================================
// OpenAI Service
// ============================================================================

export class OpenAIService {
  private client: OpenAI;
  private logger: Logger;

  constructor(apiKey: string, logger: Logger) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.client = new OpenAI({
      apiKey,
    });
    this.logger = logger;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(
    text: string,
    model: EmbedModelId = DEFAULT_MODEL
  ): Promise<OpenAIEmbeddingResult> {
    const startTime = Date.now();

    try {
      this.logger.info('embedding_request_start', {
        model,
        textLength: text.length,
      });

      const trimmedText = text.trim();

      if (trimmedText.length === 0) {
        throw new Error('Text cannot be empty');
      }

      if (trimmedText.length > 8192) {
        throw new Error('Text exceeds maximum length of 8192 characters');
      }

      const response = await this.client.embeddings.create({
        model,
        input: trimmedText,
      });

      const embedding = response.data[0]?.embedding;
      const tokens = response.usage?.prompt_tokens || 0;
      const duration = Date.now() - startTime;

      if (!embedding) {
        throw new Error('Failed to generate embedding');
      }

      this.logger.info('embedding_request_success', {
        model,
        tokens,
        duration,
        dimensions: embedding.length,
      });

      return {
        embedding,
        tokens,
        model,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('embedding_request_failed', {
        model,
        error: errorMessage,
        duration,
      });

      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in a single request
   */
  async embedBatch(
    texts: string[],
    model: EmbedModelId = DEFAULT_MODEL
  ): Promise<OpenAIBatchResult> {
    const startTime = Date.now();

    try {
      const validTexts = texts.map((t) => t.trim()).filter((t) => t.length > 0);

      if (validTexts.length === 0) {
        throw new Error('No valid texts provided');
      }

      if (validTexts.length > 100) {
        throw new Error('Maximum 100 texts per batch');
      }

      this.logger.info('batch_embedding_request_start', {
        model,
        textCount: validTexts.length,
      });

      const response = await this.client.embeddings.create({
        model,
        input: validTexts,
      });

      const embeddings = response.data.map((d) => d.embedding);
      const totalTokens = response.usage?.prompt_tokens || 0;
      const duration = Date.now() - startTime;

      this.logger.info('batch_embedding_request_success', {
        model,
        textCount: validTexts.length,
        totalTokens,
        duration,
      });

      return {
        embeddings,
        totalTokens,
        model,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error('batch_embedding_request_failed', {
        model,
        error: errorMessage,
        duration,
      });

      throw error;
    }
  }

  /**
   * Get available embedding models
   */
  getAvailableModels(): Array<{
    id: EmbedModelId;
    name: string;
    dimensions: number;
    description: string;
    maxTokens: number;
  }> {
    return Object.entries(MODEL_CONFIGS).map(([id, config]) => ({
      id: id as EmbedModelId,
      name: this.formatModelName(id as EmbedModelId),
      dimensions: config.dimensions,
      description: config.description,
      maxTokens: config.maxTokens,
    }));
  }

  /**
   * Format model ID to human-readable name
   */
  private formatModelName(modelId: EmbedModelId): string {
    switch (modelId) {
      case 'text-embedding-3-small':
        return 'Embedding V3 Small (1536 dims)';
      case 'text-embedding-3-large':
        return 'Embedding V3 Large (3072 dims)';
      default:
        return modelId;
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

let openAIServiceInstance: OpenAIService | null = null;

export function createOpenAIService(apiKey: string, logger: Logger): OpenAIService {
  if (openAIServiceInstance) {
    return openAIServiceInstance;
  }
  openAIServiceInstance = new OpenAIService(apiKey, logger);
  return openAIServiceInstance;
}

export function getOpenAIService(): OpenAIService | null {
  return openAIServiceInstance;
}
