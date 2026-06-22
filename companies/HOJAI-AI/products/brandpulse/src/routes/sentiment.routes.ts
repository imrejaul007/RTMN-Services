import { Router, Response } from 'express';
import { sentimentService } from '../services/sentiment.service.js';
import { apiKeyAuth, internalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * Analyze text sentiment (public endpoint with API key)
 */
router.post('/analyze', apiKeyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { text, useAI = false } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = useAI
      ? await sentimentService.analyzeWithAI(text)
      : await sentimentService.analyze(text);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Sentiment Routes] Error analyzing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiment'
    });
  }
});

/**
 * Batch analyze multiple texts
 */
router.post('/analyze/batch', apiKeyAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({
        success: false,
        error: 'texts array is required'
      });
    }

    if (texts.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 texts per batch'
      });
    }

    const results = await Promise.all(
      texts.map(text => sentimentService.analyze(text))
    );

    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    console.error('[Sentiment Routes] Error batch analyzing:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze sentiments'
    });
  }
});

/**
 * Detect sentiment trend from scores
 */
router.post('/trend', internalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { scores } = req.body;

    if (!scores || !Array.isArray(scores)) {
      return res.status(400).json({
        success: false,
        error: 'scores array is required'
      });
    }

    const trend = sentimentService.detectTrend(scores);

    res.json({
      success: true,
      data: trend
    });
  } catch (error) {
    console.error('[Sentiment Routes] Error detecting trend:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect trend'
    });
  }
});

export default router;