/**
 * HOJAI RAG Service - Generate Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  generateRequestSchema,
  type GenerateRequestInput,
} from '../validators';
import { getSearchResultsWithContent } from '../services/documentService';
import { generateWithContext } from '../services/llmService';
import type { APIResponse, GenerateResponse, SearchResult } from '../types';
import config from '../config';

const router = Router();

// POST /api/generate - Generate with RAG context
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = generateRequestSchema.parse(req.body) as GenerateRequestInput;

    // If no context provided, search for relevant documents
    let context: SearchResult[] | undefined = input.context;

    if (!context) {
      const searchResults = getSearchResultsWithContent(
        input.query,
        config.defaultSearchLimit,
        undefined,
        config.defaultMinScore,
        config.embeddingDimension
      );
      context = searchResults;
    }

    // Generate response with context
    const result = await generateWithContext(input.query, context, {
      model: input.model,
      max_tokens: input.max_tokens,
      temperature: input.temperature,
    });

    const response: APIResponse<GenerateResponse> = {
      success: true,
      data: {
        answer: result.answer,
        sources: context,
        model: input.model || config.openaiModel,
        tokens_used: result.tokens_used,
      },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
