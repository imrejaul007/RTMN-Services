/**
 * HOJAI RAG Service - Search Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { searchRequestSchema, type SearchRequestInput } from '../validators';
import { getSearchResultsWithContent } from '../services/documentService';
import type { APIResponse, SearchResult } from '../types';
import config from '../config';

const router = Router();

// POST /api/search - Search documents
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = searchRequestSchema.parse(req.body) as SearchRequestInput;

    const limit = input.limit || config.defaultSearchLimit;
    const namespace = input.namespace;
    const minScore = input.min_score || config.defaultMinScore;

    const results = getSearchResultsWithContent(
      input.query,
      limit,
      namespace,
      minScore,
      config.embeddingDimension
    );

    const response: APIResponse<SearchResult[]> = {
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
