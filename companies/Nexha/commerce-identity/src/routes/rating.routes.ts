import { Router, Request, Response } from 'express';
import { ReputationService } from '../services/reputation.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';

const router = Router();

// POST /api/ratings - submit a rating
// The raterCorpId and raterRole are taken EXCLUSIVELY from the JWT (req.corpId / req.role).
// Body values are ignored to prevent impersonation — closes B-AUTH-3.
router.post(
  '/',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    if (!req.corpId || !req.role) {
      throw new Error('Internal: requireAuth did not populate corpId/role on a strict route');
    }
    // Map JWT role to ReputationService's narrower union.
    // admin/system → 'system'; supplier → 'supplier'; buyer/guest → 'buyer'.
    const raterRole: 'buyer' | 'supplier' | 'system' =
      req.role === 'supplier'
        ? 'supplier'
        : req.role === 'admin' || req.role === 'system'
          ? 'system'
          : 'buyer';
    const rating = await ReputationService.submit({
      type: req.body.type,
      subjectCorpId: req.body.subjectCorpId,
      raterCorpId: req.corpId,
      raterRole,
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
