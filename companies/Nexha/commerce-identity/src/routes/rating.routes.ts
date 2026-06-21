import { Router, Request, Response } from 'express';
import { ReputationService } from '../services/reputation.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/ratings - submit a rating
router.post(
  '/',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const rating = await ReputationService.submit({
      type: req.body.type,
      subjectCorpId: req.body.subjectCorpId,
      raterCorpId: req.corpId || req.body.raterCorpId,
      raterRole: req.role || req.body.raterRole || 'buyer',
      dealId: req.body.dealId,
      score: Number(req.body.score),
      feedback: req.body.feedback,
      source: req.body.source,
      weight: req.body.weight,
      metadata: req.body.metadata,
    });
    res.status(201).json({ success: true, data: rating });
  })
);

// GET /api/ratings/:corpId - list ratings for a subject
router.get(
  '/:corpId',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, limit, skip } = req.query;
    const result = await ReputationService.listRatings(req.params.corpId, {
      type: type as any,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    res.json({ success: true, data: result.ratings, total: result.total });
  })
);

export { router as ratingRouter };
