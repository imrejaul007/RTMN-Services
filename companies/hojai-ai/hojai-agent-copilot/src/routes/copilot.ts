import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  DraftReplySchema,
  SummarizeSchema,
  PredictCSATSchema,
  SuggestMacrosSchema,
  type HealthStatus
} from '../types.js';
import {
  draftReply,
  summarize,
  predictCSAT,
  suggestMacros
} from '../services/copilot.js';

const router = Router();

// Request logging middleware
router.use((req, _res, next) => {
  const start = Date.now();
  const requestId = uuidv4();
  (req as any).requestId = requestId;
  console.log(`[${requestId}] ${req.method} ${req.path}`, {
    query: req.query,
    body: req.body ? Object.keys(req.body) : undefined
  });
  next();
});

// POST /api/copilot/draft-reply
router.post('/draft-reply', async (req: Request, res: Response) => {
  try {
    const validation = DraftReplySchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.issues
      });
    }

    const result = await draftReply(validation.data);

    res.json({
      success: true,
      requestId: (req as any).requestId,
      data: result
    });
  } catch (error) {
    console.error('Draft reply error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate draft reply',
      requestId: (req as any).requestId
    });
  }
});

// POST /api/copilot/summarize
router.post('/summarize', async (req: Request, res: Response) => {
  try {
    const validation = SummarizeSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.issues
      });
    }

    const result = await summarize(validation.data);

    res.json({
      success: true,
      requestId: (req as any).requestId,
      data: result
    });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to summarize conversation',
      requestId: (req as any).requestId
    });
  }
});

// POST /api/copilot/predict-csat
router.post('/predict-csat', async (req: Request, res: Response) => {
  try {
    const validation = PredictCSATSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.issues
      });
    }

    const result = await predictCSAT(validation.data);

    res.json({
      success: true,
      requestId: (req as any).requestId,
      data: result
    });
  } catch (error) {
    console.error('Predict CSAT error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to predict CSAT',
      requestId: (req as any).requestId
    });
  }
});

// POST /api/copilot/suggest-macros
router.post('/suggest-macros', async (req: Request, res: Response) => {
  try {
    const validation = SuggestMacrosSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: validation.error.issues
      });
    }

    const result = await suggestMacros(validation.data);

    res.json({
      success: true,
      requestId: (req as any).requestId,
      data: result
    });
  } catch (error) {
    console.error('Suggest macros error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suggest macros',
      requestId: (req as any).requestId
    });
  }
});

export default router;