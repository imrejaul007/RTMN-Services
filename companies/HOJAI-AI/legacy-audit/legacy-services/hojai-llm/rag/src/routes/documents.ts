/**
 * HOJAI RAG Service - Document Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  documentCreateSchema,
  documentBatchSchema,
  type DocumentCreateInput,
  type DocumentBatchInput,
} from '../validators';
import {
  createDocument,
  getDocument,
  deleteDocument,
  getAllDocuments,
  getSearchResultsWithContent,
} from '../services/documentService';
import { NotFoundError, ValidationError } from '../middleware/error';
import type { APIResponse, Document, SearchResult } from '../types';
import config from '../config';

const router = Router();

// POST /api/documents - Create a new document
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = documentCreateSchema.parse(req.body) as DocumentCreateInput;

    const document = createDocument(
      input.title,
      input.content,
      input.metadata,
      input.namespace,
      config.embeddingDimension
    );

    const response: APIResponse<Document> = {
      success: true,
      data: document,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/documents/batch - Batch create documents
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = documentBatchSchema.parse(req.body) as DocumentBatchInput;

    const documents = input.documents.map(doc =>
      createDocument(
        doc.title,
        doc.content,
        doc.metadata,
        input.namespace,
        config.embeddingDimension
      )
    );

    const response: APIResponse<Document[]> = {
      success: true,
      data: documents,
      timestamp: new Date().toISOString(),
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents/:id - Get document by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const document = getDocument(id);
    if (!document) {
      throw new NotFoundError('Document');
    }

    const response: APIResponse<Document> = {
      success: true,
      data: document,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/documents/:id - Delete document by ID
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const deleted = deleteDocument(id);
    if (!deleted) {
      throw new NotFoundError('Document');
    }

    const response: APIResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/documents - List all documents (with optional namespace filter)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const namespace = req.query.namespace as string | undefined;
    const documents = getAllDocuments(namespace);

    const response: APIResponse<Document[]> = {
      success: true,
      data: documents,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
