import { Router, Request, Response } from 'express';
import { BuyerService } from '../services/buyer.service';
import { ReputationService } from '../services/reputation.service';
import { SutarBridgeService } from '../services/sutar-bridge.service';
import { requireAuth, AuthedRequest } from '../middleware/auth.middleware';
import { asyncHandler, HttpError } from '../middleware/error.middleware';

const router = Router();

// POST /api/buyers - register
router.post(
  '/',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const buyer = await BuyerService.register(req.body);
    const trustScoreId = await SutarBridgeService.linkTrustScore(buyer.corpId, 'buyer');
    if (trustScoreId) {
      buyer.sutarTrustScoreId = trustScoreId;
      await buyer.save();
    }
    await SutarBridgeService.emitEvent('commerce.buyer.registered', {
      corpId: buyer.corpId,
      businessName: buyer.businessName,
      buyerType: buyer.buyerType,
    });
    res.status(201).json({ success: true, data: buyer });
  })
);

// GET /api/buyers/:corpId
router.get(
  '/:corpId',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const buyer = await BuyerService.getByCorpId(req.params.corpId);
    if (!buyer) throw new HttpError(404, 'Buyer not found');
    res.json({ success: true, data: buyer });
  })
);

// GET /api/buyers
router.get(
  '/',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const { buyerType, city, state, status, category, minTotalSpent, limit, skip } = req.query;
    const result = await BuyerService.search({
      buyerType: buyerType as any,
      city: city as string | undefined,
      state: state as string | undefined,
      status: status as any,
      category: category as string | undefined,
      minTotalSpent: minTotalSpent ? Number(minTotalSpent) : undefined,
      limit: limit ? Number(limit) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
    res.json({ success: true, data: result.buyers, total: result.total });
  })
);

// PATCH /api/buyers/:corpId/status
router.patch(
  '/:corpId/status',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const buyer = await BuyerService.updateStatus(req.params.corpId, req.body.status);
    res.json({ success: true, data: buyer });
  })
);

// POST /api/buyers/:corpId/orders - record a completed order
router.post(
  '/:corpId/orders',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const buyer = await BuyerService.recordOrder(req.params.corpId, Number(req.body.orderValue));
    res.json({ success: true, data: buyer });
  })
);

// POST /api/buyers/:corpId/credit - adjust credit usage
router.post(
  '/:corpId/credit',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const buyer = await BuyerService.updateCreditUsage(req.params.corpId, Number(req.body.delta));
    res.json({ success: true, data: buyer });
  })
);

// PATCH /api/buyers/:corpId/credit-limit
router.patch(
  '/:corpId/credit-limit',
  requireAuth('strict'),
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const authz = await SutarBridgeService.authorize({
      action: 'buyer.credit_limit.change',
      corpId: req.params.corpId,
      context: { newLimit: req.body.limit },
    });
    if (!authz.allowed) {
      throw new HttpError(403, `Credit limit change denied: ${authz.reason || 'policy'}`);
    }
    const buyer = await BuyerService.setCreditLimit(req.params.corpId, Number(req.body.limit));
    res.json({ success: true, data: buyer });
  })
);

// GET /api/buyers/:corpId/reputation
router.get(
  '/:corpId/reputation',
  requireAuth('public'),
  asyncHandler(async (req: Request, res: Response) => {
    const summary = await ReputationService.getSummary(req.params.corpId);
    res.json({ success: true, data: summary });
  })
);

export { router as buyerRouter };
